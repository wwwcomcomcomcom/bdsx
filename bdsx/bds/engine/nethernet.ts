/**
 * The remote address of a NetherNet (WebRTC) client (engine layer; docs/findings-nethernet.md).
 *
 * NetherNet hands the client's NetworkID and its network address to two different layers, so bdsx joins them on the
 * ICE username fragment, as Endstone's NetherNetAddressCache does (Apache-2.0, HEAD 0c7cf5e for 1.26.51):
 * - NetherNet::SimpleNetworkInterfaceImpl::ReceiveFromSignalingChannel(NetworkID from, string_view message, channel)
 *   receives the client's signals; the connect request's SDP offer carries "a=ice-ufrag:<ufrag>". Body: 51 0x112d1c0,
 *   logs "received signal from [%s]: %.*s"; rdx is the NetworkID (by reference: 24 bytes), r8 the string_view.
 * - webrtc::P2PTransportChannel::SwitchSelectedConnectionInternal(Connection* conn, IceSwitchReason) installs the
 *   connection ICE settled on (51 0xa35b610: stores rdx at this+0x528); the connection's remote candidate holds the
 *   client's address and, as its username, the same ufrag. remote_candidate() is slot 2 of the connection's table
 *   (the same body calls `[vftable+0x10]` on this+0x528 and hands the result to SignalRouteChange as a Candidate&).
 *
 * Both run on NetherNet threads, where JS cannot run. So each hook is native code that copies the bytes it needs into
 * a ring (an interlocked counter picks the slot; the slot's sequence word is written last) and then jumps to the
 * original; JS reads the rings on the node thread when an address is asked for, and once a second.
 *
 * The ping is the selected connection's smoothed RTT, cricket::Connection::rtt_ (a webrtc::TimeDelta, microseconds):
 * Connection::ReceivedPingResponse (51 0xa442230, 40 0xa323300) sets rtt_ (+0xb18) = (3 * rtt_ + rtt) / 4 once
 * rtt_samples_ (+0xb20) is above 0, and UpdateState clamps 2 * rtt_ to [100 ms, 60 s] in microseconds. The switch hook
 * also records the channel (rcx) and the connection (rdx); JS reads rtt_ only while the client is connected (bdsx
 * forgets the route when NetworkSystem::onConnectionClosed runs) and only while the channel's selected connection
 * (+0x528) is still that connection. That is a plain read of an int another thread writes, which is all a ping needs.
 */
import { asm, Register } from "../../assembler";
import { bin } from "../../bin";
import { AllocatedPointer, NativePointer, StaticPointer } from "../../core";
import { dllraw } from "../../dllraw";
import { procHacker } from "../../prochacker";
import { engineLayout, engineSymbol } from "./deps";
import { netherNetIdKey } from "./nethernetid";

const RECEIVE_SIGNAL =
    "?ReceiveFromSignalingChannel@SimpleNetworkInterfaceImpl@NetherNet@@AEAAXUNetworkID@2@V?$basic_string_view@DU?$char_traits@D@std@@@std@@W4SignalingChannelId@2@@Z";
const SWITCH_CONNECTION = "?SwitchSelectedConnectionInternal@P2PTransportChannel@webrtc@@AEAAXPEAVConnection@2@W4IceSwitchReason@2@@Z";
const receiveSignal = engineSymbol(
    "?ReceiveFromSignalingChannel@SimpleNetworkInterfaceImpl@NetherNet@@AEAAXUNetworkID@2@V?$basic_string_view@DU?$char_traits@D@std@@@std@@W4SignalingChannelId@2@@Z",
);
const switchConnection = engineSymbol("?SwitchSelectedConnectionInternal@P2PTransportChannel@webrtc@@AEAAXPEAVConnection@2@W4IceSwitchReason@2@@Z");

// webrtc::Candidate (Endstone's candidate.h, MSVC: std::string = 32 bytes): address_ at +104 is a SocketAddress
// { hostname_ std::string, ip_ IPAddress { vftable, int family_ +8, in_addr/in6_addr u_ +12 }, uint16 port_ +64 },
// username_ at +192
const CANDIDATE_IP_FAMILY = engineLayout("WebRtcCandidate", "ipFamily", 144);
const CANDIDATE_IP = engineLayout("WebRtcCandidate", "ip", 148);
const CANDIDATE_PORT = engineLayout("WebRtcCandidate", "port", 168);
const CANDIDATE_USERNAME = engineLayout("WebRtcCandidate", "username", 192);
const CONNECTION_REMOTE_CANDIDATE_SLOT = engineLayout("WebRtcConnection", "remoteCandidateSlot", 2);
// cricket::Connection: rtt_ (TimeDelta, int64 microseconds) and rtt_samples_ (int); P2PTransportChannel: selected_connection_
const CONNECTION_RTT = engineLayout("WebRtcConnection", "rtt", 0xb18);
const CONNECTION_RTT_SAMPLES = engineLayout("WebRtcConnection", "rttSamples", 0xb20);
const CHANNEL_SELECTED_CONNECTION = engineLayout("WebRtcP2PTransportChannel", "selectedConnection", 0x528);

const SLOTS = 64; // a power of two
// signal slot: u64 sequence, NetworkID (24), u64 length, the message's first SIGNAL_MAX bytes
const SIGNAL_SLOT_SHIFT = 12;
const SIGNAL_MAX = (1 << SIGNAL_SLOT_SHIFT) - 40;
// candidate slot: u64 sequence, the candidate's first CANDIDATE_COPY bytes, then the username's characters when they
// live on the heap (more than 15)
const CANDIDATE_SLOT_SHIFT = 9;
const CANDIDATE_COPY = 256;
const USERNAME_HEAP_MAX = 63;
// and, at the slot's end, the channel (the hook's rcx) and the connection it switched to (rdx)
const CANDIDATE_CHANNEL_AT = (1 << CANDIDATE_SLOT_SHIFT) - 16;
const CANDIDATE_CONNECTION_AT = (1 << CANDIDATE_SLOT_SHIFT) - 8;

const AF_INET = 2;
const AF_INET6 = 23;
const MAP_BOUND = 256; // signalling is reachable by anyone who can reach the port, so the maps are bounded

const signalCounter = new AllocatedPointer(8);
const signalRing = new AllocatedPointer(SLOTS << SIGNAL_SLOT_SHIFT);
const candidateCounter = new AllocatedPointer(8);
const candidateRing = new AllocatedPointer(SLOTS << CANDIDATE_SLOT_SHIFT);
signalCounter.fill(0, 8);
candidateCounter.fill(0, 8);
signalRing.fill(0, SLOTS << SIGNAL_SLOT_SHIFT);
candidateRing.fill(0, SLOTS << CANDIDATE_SLOT_SHIFT);

let installed = false;
let signalsRead = 0;
let candidatesRead = 0;
const idByUfrag = new Map<string, string>();
const addressByUfrag = new Map<string, string>();
const addressById = new Map<string, string>();
interface Route {
    channel: NativePointer;
    connection: NativePointer;
    connectionValue: string; // the pointer itself as a bin64, to compare with the channel's selected connection
}
const routeByUfrag = new Map<string, Route>();
const routeById = new Map<string, Route>();

function bounded<K, V>(map: Map<K, V>, key: K, value: V): void {
    map.delete(key);
    map.set(key, value);
    if (map.size > MAP_BOUND) map.delete(map.keys().next().value as K);
}

function latin1(p: StaticPointer, off: number, n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(p.getUint8(off + i));
    return s;
}

function link(ufrag: string): void {
    const id = idByUfrag.get(ufrag);
    if (id === undefined) return;
    const address = addressByUfrag.get(ufrag);
    if (address !== undefined) bounded(addressById, id, address);
    const route = routeByUfrag.get(ufrag);
    if (route !== undefined) bounded(routeById, id, route);
}

function readSignals(): void {
    const total = signalCounter.getInt32(0);
    let k = Math.max(signalsRead, total - SLOTS);
    for (; k < total; k++) {
        const off = (k & (SLOTS - 1)) << SIGNAL_SLOT_SHIFT;
        const seq = signalRing.getInt32(off);
        if (seq === 0) break; // still being written: next time
        if (seq !== k + 1) continue; // overwritten
        const id = netherNetIdKey(signalRing, off + 8);
        const message = latin1(signalRing, off + 40, Math.min(signalRing.getInt32(off + 32), SIGNAL_MAX));
        if (signalRing.getInt32(off) !== seq) continue;
        const at = message.indexOf("a=ice-ufrag:");
        if (at < 0) continue;
        const rest = message.substr(at + 12);
        const ufrag = rest.substr(0, rest.search(/[\r\n]|$/));
        if (ufrag === "") continue;
        bounded(idByUfrag, ufrag, id);
        link(ufrag);
    }
    signalsRead = k;
}

function ipText(family: number, p: StaticPointer, off: number): string | null {
    if (family === AF_INET) return `${p.getUint8(off)}.${p.getUint8(off + 1)}.${p.getUint8(off + 2)}.${p.getUint8(off + 3)}`;
    if (family === AF_INET6) {
        const groups: string[] = [];
        for (let i = 0; i < 16; i += 2) groups.push(((p.getUint8(off + i) << 8) | p.getUint8(off + i + 1)).toString(16));
        return groups.join(":");
    }
    return null;
}

function readCandidates(): void {
    const total = candidateCounter.getInt32(0);
    let k = Math.max(candidatesRead, total - SLOTS);
    for (; k < total; k++) {
        const off = (k & (SLOTS - 1)) << CANDIDATE_SLOT_SHIFT;
        const seq = candidateRing.getInt32(off);
        if (seq === 0) break;
        if (seq !== k + 1) continue;
        const c = off + 8;
        const ip = ipText(candidateRing.getInt32(c + CANDIDATE_IP_FAMILY), candidateRing, c + CANDIDATE_IP);
        const port = candidateRing.getUint16(c + CANDIDATE_PORT);
        const length = candidateRing.getInt32(c + CANDIDATE_USERNAME + 16);
        const capacity = candidateRing.getInt32(c + CANDIDATE_USERNAME + 24);
        const ufrag =
            capacity > 15
                ? latin1(candidateRing, c + CANDIDATE_COPY, Math.min(length, USERNAME_HEAP_MAX))
                : latin1(candidateRing, c + CANDIDATE_USERNAME, Math.min(length, 15));
        const channel = candidateRing.getPointer(off + CANDIDATE_CHANNEL_AT);
        const connection = candidateRing.getPointer(off + CANDIDATE_CONNECTION_AT);
        const connectionValue = candidateRing.getBin64(off + CANDIDATE_CONNECTION_AT);
        if (candidateRing.getInt32(off) !== seq) continue;
        if (ip === null || ufrag === "") continue;
        bounded(addressByUfrag, ufrag, `${ip}|${port}`);
        bounded(routeByUfrag, ufrag, { channel, connection, connectionValue });
        link(ufrag);
    }
    candidatesRead = k;
}

function poll(): void {
    readSignals();
    readCandidates();
}

/** "ip|port" of the NetherNet client whose NetworkID is at p+off, or null when it is not known */
export function netherNetAddress(p: StaticPointer, off: number): string | null {
    if (!installed) return null;
    poll();
    return addressById.get(netherNetIdKey(p, off)) ?? null;
}

/**
 * The NetherNet client's round-trip time in milliseconds, libwebrtc's smoothed estimate for the connection ICE
 * selected; -1 when the client is not known, has disconnected, its channel has moved off that connection, or no
 * ping response has come back yet.
 */
export function netherNetPing(p: StaticPointer, off: number): number {
    const raw = netherNetRtt(p, off);
    return raw === null || raw.samples <= 0 || raw.micros < 0 ? -1 : Math.round(raw.micros / 1000);
}

/** rtt_ in microseconds and rtt_samples_ as read, or null when nothing may be read; for probes */
export function netherNetRtt(p: StaticPointer, off: number): { micros: number; samples: number } | null {
    if (!installed) return null;
    poll();
    const route = routeById.get(netherNetIdKey(p, off));
    if (route === undefined) return null;
    if (route.channel.getBin64(CHANNEL_SELECTED_CONNECTION) !== route.connectionValue) return null;
    const hi = route.connection.getInt32(CONNECTION_RTT + 4);
    const lo = route.connection.getUint32(CONNECTION_RTT);
    // anything outside 0..2^31 us (TimeDelta's +-infinity included) is not a measurement
    const micros = hi === 0 && lo <= 0x7fffffff ? lo : -1;
    return { micros, samples: route.connection.getInt32(CONNECTION_RTT_SAMPLES) };
}

/**
 * The client at p+off disconnected: stop reading its connection, and drop its ufrags so that a late switch on the
 * old channel cannot bring the route back (a reconnect sends a new offer with a new ufrag).
 */
export function netherNetForget(p: StaticPointer, off: number): void {
    const id = netherNetIdKey(p, off);
    routeById.delete(id);
    for (const [ufrag, owner] of idByUfrag) {
        if (owner !== id) continue;
        idByUfrag.delete(ufrag);
        routeByUfrag.delete(ufrag);
    }
}

/** what the recorder has seen, for probes */
export function netherNetAddressStats(): { installed: boolean; signals: number; candidates: number; ufrags: number; addresses: number; routes: number } {
    if (installed) poll();
    return {
        installed,
        signals: signalCounter.getInt32(0),
        candidates: candidateCounter.getInt32(0),
        ufrags: idByUfrag.size,
        addresses: addressById.size,
        routes: routeById.size,
    };
}

/** the raw ring contents, for probes: each signal's id key and first characters, each candidate's decoded fields */
export function netherNetAddressDump(chars = 160): string[] {
    const out: string[] = [];
    const signals = signalCounter.getInt32(0);
    for (let k = Math.max(0, signals - SLOTS); k < signals; k++) {
        const off = (k & (SLOTS - 1)) << SIGNAL_SLOT_SHIFT;
        const len = signalRing.getInt32(off + 32);
        out.push(`signal ${k} seq ${signalRing.getInt32(off)} id ${netherNetIdKey(signalRing, off + 8)} len ${len}: ${JSON.stringify(latin1(signalRing, off + 40, Math.min(len, chars)))}`);
    }
    const candidates = candidateCounter.getInt32(0);
    for (let k = Math.max(0, candidates - SLOTS); k < candidates; k++) {
        const off = (k & (SLOTS - 1)) << CANDIDATE_SLOT_SHIFT;
        const c = off + 8;
        const family = candidateRing.getInt32(c + CANDIDATE_IP_FAMILY);
        const length = candidateRing.getInt32(c + CANDIDATE_USERNAME + 16);
        const capacity = candidateRing.getInt32(c + CANDIDATE_USERNAME + 24);
        const user = capacity > 15 ? latin1(candidateRing, c + CANDIDATE_COPY, Math.min(length, USERNAME_HEAP_MAX)) : latin1(candidateRing, c + CANDIDATE_USERNAME, Math.min(length, 15));
        out.push(
            `candidate ${k} seq ${candidateRing.getInt32(off)} family ${family} ip ${ipText(family, candidateRing, c + CANDIDATE_IP)} port ${candidateRing.getUint16(c + CANDIDATE_PORT)} username(len ${length} cap ${capacity}) ${JSON.stringify(user)} channel ${bin.toString(candidateRing.getBin64(off + CANDIDATE_CHANNEL_AT), 16)} connection ${bin.toString(candidateRing.getBin64(off + CANDIDATE_CONNECTION_AT), 16)}`,
        );
    }
    // the live routes: what the channel has selected now against what the hook recorded (only while connected)
    for (const [id, route] of routeById) {
        out.push(
            `route ${id} channel ${route.channel.toString(16)} selected now ${bin.toString(route.channel.getBin64(CHANNEL_SELECTED_CONNECTION), 16)} recorded ${bin.toString(route.connectionValue, 16)}`,
        );
    }
    return out;
}

// lock xadd qword [rax], r10
const LOCK_XADD_RAX_R10 = [0xf0, 0x4c, 0x0f, 0xc1, 0x10];

function install(): void {
    if (receiveSignal === null || switchConnection === null) return;
    const memcpy = dllraw.vcruntime140.memcpy;

    procHacker.hookingRaw(RECEIVE_SIGNAL, original =>
        asm()
            .push_r(Register.rcx)
            .push_r(Register.rdx)
            .push_r(Register.r8)
            .push_r(Register.r9)
            .push_r(Register.rsi)
            .push_r(Register.rdi)
            .sub_r_c(Register.rsp, 0x28) // entry rsp was 8 mod 16; six pushes and 0x28 make it 16-aligned
            .mov_r_r(Register.rsi, Register.r8) // the string_view
            .mov_r_c(Register.rax, signalCounter)
            .mov_r_c(Register.r10, 1)
            .write(...LOCK_XADD_RAX_R10)
            .mov_r_r(Register.r11, Register.r10)
            .inc_r(Register.r11) // this slot's sequence word
            .mov_rp_r(Register.rsp, 1, 0x20, Register.r11)
            .and_r_c(Register.r10, SLOTS - 1)
            .shl_r_c(Register.r10, SIGNAL_SLOT_SHIFT)
            .mov_r_c(Register.rdi, signalRing)
            .add_r_r(Register.rdi, Register.r10)
            .xor_r_r(Register.rax, Register.rax)
            .mov_rp_r(Register.rdi, 1, 0, Register.rax)
            .mov_r_rp(Register.rax, Register.rdx, 1, 0)
            .mov_rp_r(Register.rdi, 1, 8, Register.rax)
            .mov_r_rp(Register.rax, Register.rdx, 1, 8)
            .mov_rp_r(Register.rdi, 1, 16, Register.rax)
            .mov_r_rp(Register.rax, Register.rdx, 1, 16)
            .mov_rp_r(Register.rdi, 1, 24, Register.rax)
            .mov_r_rp(Register.r8, Register.rsi, 1, 8)
            .mov_r_c(Register.r10, SIGNAL_MAX)
            .cmp_r_r(Register.r8, Register.r10)
            .cmova_r_r(Register.r8, Register.r10)
            .mov_rp_r(Register.rdi, 1, 32, Register.r8)
            .mov_r_rp(Register.rdx, Register.rsi, 1, 0)
            .lea_r_rp(Register.rcx, Register.rdi, 1, 40)
            .mov_r_c(Register.rax, memcpy)
            .call_r(Register.rax)
            .mov_r_rp(Register.r11, Register.rsp, 1, 0x20)
            .mov_rp_r(Register.rdi, 1, 0, Register.r11)
            .add_r_c(Register.rsp, 0x28)
            .pop_r(Register.rdi)
            .pop_r(Register.rsi)
            .pop_r(Register.r9)
            .pop_r(Register.r8)
            .pop_r(Register.rdx)
            .pop_r(Register.rcx)
            .mov_r_c(Register.rax, original)
            .jmp_r(Register.rax)
            .alloc("hook of SimpleNetworkInterfaceImpl::ReceiveFromSignalingChannel"),
    );

    procHacker.hookingRaw(SWITCH_CONNECTION, original =>
        asm()
            .push_r(Register.rcx)
            .push_r(Register.rdx)
            .push_r(Register.r8)
            .push_r(Register.r9)
            .push_r(Register.rsi)
            .push_r(Register.rdi)
            .sub_r_c(Register.rsp, 0x28)
            .test_r_r(Register.rdx, Register.rdx)
            .jz_label("skip")
            .mov_r_r(Register.rcx, Register.rdx)
            .mov_r_rp(Register.rax, Register.rcx, 1, 0)
            .call_rp(Register.rax, 1, CONNECTION_REMOTE_CANDIDATE_SLOT * 8) // conn->remote_candidate()
            .mov_r_r(Register.rsi, Register.rax)
            .test_r_r(Register.rsi, Register.rsi)
            .jz_label("skip")
            .mov_r_c(Register.rax, candidateCounter)
            .mov_r_c(Register.r10, 1)
            .write(...LOCK_XADD_RAX_R10)
            .mov_r_r(Register.r11, Register.r10)
            .inc_r(Register.r11)
            .mov_rp_r(Register.rsp, 1, 0x20, Register.r11)
            .and_r_c(Register.r10, SLOTS - 1)
            .shl_r_c(Register.r10, CANDIDATE_SLOT_SHIFT)
            .mov_r_c(Register.rdi, candidateRing)
            .add_r_r(Register.rdi, Register.r10)
            .xor_r_r(Register.rax, Register.rax)
            .mov_rp_r(Register.rdi, 1, 0, Register.rax)
            .mov_r_rp(Register.rax, Register.rsp, 1, 0x50) // the pushed rcx: the channel
            .mov_rp_r(Register.rdi, 1, CANDIDATE_CHANNEL_AT, Register.rax)
            .mov_r_rp(Register.rax, Register.rsp, 1, 0x48) // the pushed rdx: the connection
            .mov_rp_r(Register.rdi, 1, CANDIDATE_CONNECTION_AT, Register.rax)
            .lea_r_rp(Register.rcx, Register.rdi, 1, 8)
            .mov_r_r(Register.rdx, Register.rsi)
            .mov_r_c(Register.r8, CANDIDATE_COPY)
            .mov_r_c(Register.rax, memcpy)
            .call_r(Register.rax)
            .mov_r_rp(Register.rax, Register.rsi, 1, CANDIDATE_USERNAME + 24) // the username's capacity
            .cmp_r_c(Register.rax, 15)
            .jbe_label("publish")
            .mov_r_rp(Register.r8, Register.rsi, 1, CANDIDATE_USERNAME + 16)
            .mov_r_c(Register.r10, USERNAME_HEAP_MAX)
            .cmp_r_r(Register.r8, Register.r10)
            .cmova_r_r(Register.r8, Register.r10)
            .lea_r_rp(Register.rcx, Register.rdi, 1, 8 + CANDIDATE_COPY)
            .mov_r_rp(Register.rdx, Register.rsi, 1, CANDIDATE_USERNAME)
            .mov_r_c(Register.rax, memcpy)
            .call_r(Register.rax)
            .label("publish")
            .mov_r_rp(Register.r11, Register.rsp, 1, 0x20)
            .mov_rp_r(Register.rdi, 1, 0, Register.r11)
            .label("skip")
            .add_r_c(Register.rsp, 0x28)
            .pop_r(Register.rdi)
            .pop_r(Register.rsi)
            .pop_r(Register.r9)
            .pop_r(Register.r8)
            .pop_r(Register.rdx)
            .pop_r(Register.rcx)
            .mov_r_c(Register.rax, original)
            .jmp_r(Register.rax)
            .alloc("hook of P2PTransportChannel::SwitchSelectedConnectionInternal"),
    );
    installed = true;
    // keep the maps current without anyone asking, so the rings never lap unread
    setInterval(poll, 1000).unref();
}
install();
