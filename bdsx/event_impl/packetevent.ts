import { asmcode } from "../asm/asmcode";
import { OperationSize, Register, asm } from "../assembler";
import { Bedrock } from "../bds/bedrock";
import { NetworkConnection, NetworkIdentifier, NetworkSystem } from "../bds/networkidentifier";
import { Packet, PacketSharedPtr, createPacketRaw } from "../bds/packet";
import { MinecraftPacketIds } from "../bds/packetids";
import { PacketIdToType } from "../bds/packets";
import { proc } from "../bds/symbols";
import { CANCEL, abstract } from "../common";
import { PACKET_ID_COUNT } from "../const";
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../core";
import { decay } from "../decay";
import { events } from "../event";
import { capi } from "../capi";
import { dllraw } from "../dllraw";
import { bedrockServer } from "../launcher";
import { pdbcache } from "../pdbcache";
import { makefunc } from "../makefunc";
import { AbstractClass, nativeClass, nativeField } from "../nativeclass";
import { int32_t, int64_as_float_t, void_t } from "../nativetype";
import { nethook } from "../nethook";
import { CxxStringWrapper } from "../pointer";
import { procHacker } from "../prochacker";
import { CxxSharedPtr } from "../sharedpointer";
import { remapAndPrintError } from "../source-map-support";

@nativeClass(null)
class ReadOnlyBinaryStream extends AbstractClass {
    @nativeField(CxxStringWrapper.ref(), 0x38)
    data: CxxStringWrapper;

    read(dest: VoidPointer, size: number): Bedrock.VoidErrorCodeResult {
        abstract();
    }
}

ReadOnlyBinaryStream.prototype.read = procHacker.jsv(
    "??_7ReadOnlyBinaryStream@@6B@",
    "?read@ReadOnlyBinaryStream@@EEAA?AV?$Result@XVerror_code@std@@@Bedrock@@PEAX_K@Z",
    Bedrock.VoidErrorCodeResult,
    { this: ReadOnlyBinaryStream },
    VoidPointer,
    int64_as_float_t,
);

@nativeClass(null)
class OnPacketRBP extends AbstractClass {
    // NetworkSystem::_sortAndPacketizeEvents before MinecraftPackets::createPacket
    @nativeField(int32_t, 0x1c0)
    packetId: MinecraftPacketIds;
    // NetworkSystem::_sortAndPacketizeEvents before MinecraftPackets::createPacket
    @nativeField(CxxSharedPtr.make(Packet), 0x1c8)
    packet: CxxSharedPtr<Packet>; // NetworkSystem::_sortAndPacketizeEvents before MinecraftPackets::createPacket
    @nativeField(ReadOnlyBinaryStream, 0x280)
    stream: ReadOnlyBinaryStream; // after NetworkConnection::receivePacket
}

asmcode.createPacketRaw = proc["?createPacket@MinecraftPackets@@SA?AV?$shared_ptr@VPacket@@@std@@W4MinecraftPacketIds@@@Z"];
function onPacketRaw(rbp: OnPacketRBP, conn: NetworkConnection): PacketSharedPtr | null {
    const packetId = rbp.packetId;
    try {
        const target = events.packetRaw(packetId);
        if (target === null || target.isEmpty()) throw Error("no listener but onPacketRaw fired.");
        const ni = (nethook.lastSender = conn.networkIdentifier);
        const s = rbp.stream;
        const data = s.data;
        const rawpacketptr = data.valueptr;

        for (const listener of target.allListeners()) {
            const ptr = rawpacketptr.add();
            try {
                if (listener(ptr, data.length, ni, packetId) === CANCEL) {
                    return null;
                }
            } catch (err) {
                events.errorFire(err);
            } finally {
                decay(ptr);
            }
        }
    } catch (err) {
        remapAndPrintError(err);
    }
    return createPacketRaw(rbp.packet, packetId);
}
const packetizeSymbol =
    "?_sortAndPacketizeEvents@NetworkSystem@@AEAA_NAEAVNetworkConnection@@V?$time_point@Usteady_clock@chrono@std@@V?$duration@_JU?$ratio@$00$0DLJKMKAA@@std@@@23@@chrono@std@@@Z";
const packetBeforeSkipAddress = proc[packetizeSymbol].add(0x839); // after of packetAfter
function onPacketBefore(rbp: OnPacketRBP, returnAddressInStack: StaticPointer, packetId: MinecraftPacketIds): void {
    try {
        const target = events.packetBefore(packetId);
        if (target === null || target.isEmpty()) throw Error("no listener but onPacketBefore fired.");

        const ni = nethook.lastSender || asmcode.lastSenderNetId.as(NetworkConnection).networkIdentifier;
        const TypedPacket = (PacketIdToType as { [id: number]: typeof Packet | undefined })[packetId] || Packet;
        const packet = rbp.packet.p!;
        const typedPacket = packet.as(TypedPacket);
        try {
            for (const listener of target.allListeners()) {
                try {
                    if (listener(typedPacket, ni, packetId) === CANCEL) {
                        returnAddressInStack.setPointer(packetBeforeSkipAddress);
                    }
                } catch (err) {
                    events.errorFire(err);
                }
            }
        } finally {
            decay(typedPacket);
        }
    } catch (err) {
        remapAndPrintError(err);
    }
}
function onPacketAfter(packet: Packet, conn: NetworkConnection, packetId: MinecraftPacketIds): void {
    try {
        const target = events.packetAfter(packetId);
        if (target === null || target.isEmpty()) throw Error("no listener but onPacketAfter fired.");
        const TypedPacket = (PacketIdToType as { [id: number]: typeof Packet | undefined })[packetId] || Packet;
        const typedPacket = packet.as(TypedPacket);
        try {
            for (const listener of target.allListeners()) {
                try {
                    if (listener(typedPacket, conn.networkIdentifier, packetId) === CANCEL) {
                        break;
                    }
                } catch (err) {
                    events.errorFire(err);
                }
            }
        } finally {
            decay(typedPacket);
        }
    } catch (err) {
        remapAndPrintError(err);
    }
}
function onPacketSend(packetId: MinecraftPacketIds, ni: NetworkIdentifier, packet: Packet): number {
    // the flag table the hook consults is PACKET_ID_COUNT bytes (2024's id
    // range); an id past it read a stray byte and landed here with no listener
    if (packetId >>> 0 >= PACKET_ID_COUNT) return 0;
    try {
        const target = events.packetSend(packetId);
        if (target === null || target.isEmpty()) throw Error("no listener but onPacketSend fired.");
        const TypedPacket = (PacketIdToType as { [id: number]: typeof Packet | undefined })[packetId] || Packet;
        const typedPacket = packet.as(TypedPacket);
        try {
            for (const listener of target.allListeners()) {
                try {
                    if (listener(typedPacket, ni, packetId) === CANCEL) {
                        return 1;
                    }
                } catch (err) {
                    events.errorFire(err);
                }
            }
        } finally {
            decay(typedPacket);
        }
    } catch (err) {
        remapAndPrintError(err);
    }
    return 0;
}
function onPacketSendInternal(handler: NetworkSystem, ni: NetworkIdentifier, packet: Packet, data: CxxStringWrapper): number {
    try {
        const packetId = packet.getId();
        if (packetId >>> 0 >= PACKET_ID_COUNT) return 0;
        const target = events.packetSendRaw(packetId);
        if (target === null || target.isEmpty()) throw Error("no listener but onPacketSend fired.");
        const dataptr = data.valueptr;
        try {
            for (const listener of target.allListeners()) {
                try {
                    if (listener(dataptr, data.length, ni, packetId) === CANCEL) {
                        return 1;
                    }
                } catch (err) {
                    events.errorFire(err);
                }
            }
        } finally {
            decay(dataptr);
        }
    } catch (err) {
        remapAndPrintError(err);
    }
    return 0;
}

const packetHandleSymbol = "?handle@Packet@@QEAAXAEBVNetworkIdentifier@@AEAVNetEventCallback@@AEAV?$shared_ptr@VPacket@@@std@@@Z";

/** the 2024 receive side: three patches inside NetworkSystem::_sortAndPacketizeEvents */
function hook2024Receive(): void {
    // hook raw
    asmcode.onPacketRaw = makefunc.np(onPacketRaw, PacketSharedPtr, null, OnPacketRBP, NetworkConnection);
    procHacker.patching(
        "hook-packet-raw",
        packetizeSymbol,
        0x2f5,
        asmcode.packetRawHook, // original code depended
        Register.rax,
        true,
        // prettier-ignore
        [
            0x8B, 0x95, 0xC0, 0x01, 0x00, 0x00,        // mov edx,dword ptr ss:[rbp+1C0]
            0x48, 0x8D, 0x8D, 0xC8, 0x01, 0x00, 0x00,  // lea rcx,qword ptr ss:[rbp+1C8]
            0xE8, null, null, null, null,              // call <bedrock_server.public: static class std::shared_ptr<class Packet> __cdecl MinecraftPackets::createPacket
            0x90,                                      // nop
        ],
    );

    // hook before
    asmcode.onPacketBefore = makefunc.np(onPacketBefore, void_t, { name: "onPacketBefore" }, OnPacketRBP, StaticPointer, int32_t, NetworkConnection);

    asmcode.packetBeforeOriginal = proc["<lambda_64a71bea114986e8e17d2f982ce4525e>::operator()"];
    procHacker.patching(
        "hook-packet-before",
        packetizeSymbol,
        0x3a4,
        asmcode.packetBeforeHook, // original code depended
        Register.rax,
        true,
        // prettier-ignore
        [
            0x48, 0x8D, 0x95, 0x80, 0x00, 0x00, 0x00,  // lea rdx,qword ptr ss:[rbp+80]
            0x48, 0x8D, 0x4D, 0x30,                    // lea rcx,qword ptr ss:[rbp+30]
            0xE8, null, null, null, null,              // call <bedrock_server.<lambda_64a71bea114986e8e17d2f982ce4525e>::operator()>
        ],
    );

    // hook after
    asmcode.onPacketAfter = makefunc.np(onPacketAfter, void_t, null, Packet, NetworkConnection, int32_t);
    asmcode.handlePacket = proc[packetHandleSymbol];
    // the load-config directory gives this exactly (tools/loadconfig.mjs); if it
    // is ever missing, packet events are skipped rather than read through null
    if (!("__guard_dispatch_icall_fptr" in proc)) {
        console.error("[bdsx] __guard_dispatch_icall_fptr is not in the symbol table; packet events are unavailable");
        return;
    }
    asmcode.__guard_dispatch_icall_fptr = proc["__guard_dispatch_icall_fptr"].getPointer();

    procHacker.patching(
        "hook-packet-after",
        packetizeSymbol,
        0x7df,
        asmcode.packetAfterHook, // original code depended
        Register.rdx,
        true,
        // prettier-ignore
        [
            0x4C, 0x8B, 0xC6,                          // mov r8,rsi
            0x49, 0x8B, 0xD6,                          // mov rdx,r14
            0x48, 0x8B, 0x40, 0x08,                    // mov rax,qword ptr ds:[rax+8]
            0xFF, 0x15, null, null, null, null,        // call qword ptr ds:[<__guard_dispatch_icall_fptr>]
        ],
    );

}


/**
 * The 1.26 receive side. `_sortAndPacketizeEvents` and `Packet::handle` are
 * gone -- the loop inlined the one line `Packet::handle` was (2024 0x8205e0:
 * `handler_->vft[1](ni, callback, packet)`, handler_ at Packet+0x20) -- but the
 * dispatch itself survived: every packet carries `handler_`, an
 * `IPacketHandlerDispatcher*` to one static object per packet type in .data,
 * and slot 1 of that object's table is where a parsed packet is handed to
 * ServerNetworkHandler. Endstone wraps the same pointer from a createPacket
 * hook (runtime/bedrock_hooks/packet.cpp). Here each dispatcher's vptr is
 * pointed at a two-slot table of our own whose `handle` tests the id's
 * enabledPacket byte and goes to JS only when a before/after listener is on,
 * so a packet type nobody listens to costs four instructions. No code in the
 * binary is patched; nothing here has a per-build offset.
 */
const PACKET_HANDLER_OFFSET = 0x20;
const enabledPacket = asmcode.addressof_enabledPacket;
type DispatchFn = (self: StaticPointer, ni: StaticPointer, callback: StaticPointer, packet: StaticPointer) => void;
const dispatcherOriginals = new Map<number, DispatchFn>();
const dispatcherKeepAlive: unknown[] = [];

function onPacketDispatch(self: StaticPointer, niptr: StaticPointer, callback: StaticPointer, sharedptr: StaticPointer): void {
    const original = dispatcherOriginals.get(self.getAddressAsFloat())!;
    // BDS's own handling must happen whatever bdsx does: an exception on our side before the
    // original ran swallowed SetLocalPlayerAsInitialized once, and the player never joined
    let packetId = -1;
    let ni: NetworkIdentifier | null = null;
    let typedPacket: Packet | null = null;
    let flags = 0;
    try {
        const packet = sharedptr.getPointerAs(Packet, 0);
        packetId = packet.getId();
        // the shared instance, as the 2024 path handed out: form.ts compares identifiers by identity
        ni = NetworkIdentifier.from(niptr)!;
        nethook.lastSender = ni;
        flags = packetId >>> 0 < PACKET_ID_COUNT ? enabledPacket.getUint8(packetId) : 0;
        const TypedPacket = (PacketIdToType as { [id: number]: typeof Packet | undefined })[packetId] || Packet;
        typedPacket = packet.as(TypedPacket);
        if (flags & (1 << events.PacketEventType.Before)) {
            for (const listener of events.packetBefore(packetId).allListeners()) {
                try {
                    if (listener(typedPacket as any, ni, packetId) === CANCEL) {
                        decay(typedPacket);
                        return;
                    }
                } catch (err) {
                    events.errorFire(err);
                }
            }
        }
    } catch (err) {
        remapAndPrintError(err);
        flags = 0;
    }
    original(self, niptr, callback, sharedptr);
    if (typedPacket === null) return;
    try {
        if (flags & (1 << events.PacketEventType.After)) {
            for (const listener of events.packetAfter(packetId).allListeners()) {
                try {
                    if (listener(typedPacket as any, ni!, packetId) === CANCEL) break;
                } catch (err) {
                    events.errorFire(err);
                }
            }
        }
    } catch (err) {
        remapAndPrintError(err);
    } finally {
        decay(typedPacket);
    }
}

function installPacketDispatchers(): void {
    const dispatch = makefunc.np(onPacketDispatch, void_t, { name: "onPacketDispatch" }, StaticPointer, StaticPointer, StaticPointer, StaticPointer);
    dispatcherKeepAlive.push(dispatch);
    // one createPacket per id tells which static dispatcher each type uses
    const idsOf = new Map<number, { dispatcher: NativePointer; ids: number[] }>();
    for (let id = 0; id < PACKET_ID_COUNT; id++) {
        const sp = new PacketSharedPtr(true);
        createPacketRaw(sp, id);
        const packet = sp.p;
        if (packet !== null) {
            const dispatcher = packet.getPointer(PACKET_HANDLER_OFFSET);
            if (!dispatcher.isNull()) {
                const key = dispatcher.getAddressAsFloat();
                let entry = idsOf.get(key);
                if (entry === undefined) idsOf.set(key, (entry = { dispatcher, ids: [] }));
                entry.ids.push(id);
            }
        }
        sp.dispose();
    }
    let hooked = 0;
    for (const [key, { dispatcher, ids }] of idsOf) {
        const vftable = dispatcher.getPointer(0);
        const originalHandle = vftable.getPointer(8);
        dispatcherOriginals.set(key, makefunc.js(originalHandle, void_t, null, StaticPointer, StaticPointer, StaticPointer, StaticPointer));
        const code = asm();
        if (ids.length === 1) {
            // a type with one id: skip JS unless that id has a before/after listener
            code.mov_r_c(Register.rax, enabledPacket.add(ids[0]))
                .movzx_r_rp(Register.rax, Register.rax, 1, 0, OperationSize.dword, OperationSize.byte)
                .test_r_c(Register.rax, (1 << events.PacketEventType.Before) | (1 << events.PacketEventType.After), OperationSize.dword)
                .jz_label("original");
        }
        code.mov_r_c(Register.rax, dispatch).jmp_r(Register.rax);
        code.label("original").mov_r_c(Register.rax, originalHandle).jmp_r(Register.rax);
        const stub = code.alloc("packet dispatch " + ids[0]);
        const table = new AllocatedPointer(16);
        table.setPointer(vftable.getPointer(0), 0); // the destructor, as it was
        table.setPointer(stub, 8);
        dispatcherKeepAlive.push(stub, table);
        dispatcher.setPointer(table, 0);
        hooked++;
    }
    console.error(`[bdsx] packet dispatch: ${hooked} dispatchers for ${[...idsOf.values()].reduce((n, e) => n + e.ids.length, 0)} packet ids`);
}


/**
 * The 1.26 packetRaw: BatchedNetworkPeer::_receivePacket hands one decoded packet (header varint +
 * payload) per call to the connection above it -- the bytes 2024's patch read out of the stream in
 * _sortAndPacketizeEvents. Endstone hooks the same function for PacketReceiveEvent and, as here,
 * drops a cancelled packet by asking for the next one. The stub goes to JS only on the node thread
 * (which runs the game loop): a call from anywhere else goes straight to the original and is counted,
 * so a receive that moved off-thread costs raw events, never the process.
 */
const RECEIVE_SYMBOL =
    "?_receivePacket@BatchedNetworkPeer@@MEAA?AW4DataStatus@NetworkPeer@@AEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBV?$shared_ptr@V?$time_point@Usteady_clock@chrono@std@@V?$duration@_JU?$ratio@$00$0DLJKMKAA@@std@@@23@@chrono@std@@@5@@Z";
const NetworkSystem$layout = pdbcache.layouts.NetworkSystem ?? {};
const NetworkConnection$layout = pdbcache.layouts.NetworkConnection ?? {};
const NS_CONNECTIONS = NetworkSystem$layout.connections ?? 0xa0;
const NC_BATCHED_PEER = NetworkConnection$layout.batchedPeer ?? 0xe8;
const NC_ID = NetworkConnection$layout.id ?? 0;
const DATA_STATUS_HAS_DATA = 0;
/** receives that did not come from the node thread (read by tools/packet-probe.ts) */
export const packetRawOffThread = new AllocatedPointer(8);
packetRawOffThread.setInt32(0, 0);
packetRawOffThread.setInt32(0, 4);
let originalReceive: ((peer: StaticPointer, out: StaticPointer, timepoint: StaticPointer) => number) | null = null;

function connectionIdOfPeer(peer: StaticPointer): NetworkIdentifier | null {
    const system = bedrockServer.networkSystem as unknown as StaticPointer;
    const begin = system.getPointer(NS_CONNECTIONS);
    const count = system.getPointer(NS_CONNECTIONS + 8).subptr(begin) / 8;
    for (let i = 0; i < count; i++) {
        const connection = begin.getNullablePointer(i * 8);
        if (connection === null) continue;
        const batched = connection.getNullablePointer(NC_BATCHED_PEER);
        if (batched !== null && batched.equalsptr(peer)) return NetworkIdentifier.from(connection.add(NC_ID))!;
    }
    return null;
}

function onReceiveRaw(peer: StaticPointer, out: StaticPointer, timepoint: StaticPointer): number {
    for (;;) {
        const status = originalReceive!(peer, out, timepoint);
        if (status !== DATA_STATUS_HAS_DATA) return status;
        let cancelled = false;
        try {
            const data = out.as(CxxStringWrapper);
            const ptr = data.valueptr;
            const length = data.length;
            let header = 0;
            for (let i = 0, shift = 0; i < 5 && i < length; i++, shift += 7) {
                const b = ptr.getUint8(i);
                header |= (b & 0x7f) << shift;
                if ((b & 0x80) === 0) break;
            }
            const packetId = header & 0x3ff;
            if (packetId < PACKET_ID_COUNT && enabledPacket.getUint8(packetId) & (1 << events.PacketEventType.Raw)) {
                const ni = connectionIdOfPeer(peer);
                if (ni !== null) {
                    nethook.lastSender = ni;
                    for (const listener of events.packetRaw(packetId).allListeners()) {
                        const p = ptr.add();
                        try {
                            if (listener(p, length, ni, packetId) === CANCEL) {
                                cancelled = true;
                                break;
                            }
                        } catch (err) {
                            events.errorFire(err);
                        } finally {
                            decay(p);
                        }
                    }
                }
            }
        } catch (err) {
            remapAndPrintError(err);
        }
        if (!cancelled) return status;
    }
}

function installRawReceive(): void {
    if (!(RECEIVE_SYMBOL in proc)) return;
    const js = makefunc.np(onReceiveRaw, int32_t, { name: "onReceiveRaw" }, StaticPointer, StaticPointer, StaticPointer);
    dispatcherKeepAlive.push(js);
    procHacker.hookingRaw(RECEIVE_SYMBOL, original => {
        originalReceive = makefunc.js(original, int32_t, null, StaticPointer, StaticPointer, StaticPointer);
        return asm()
            .push_r(Register.rcx)
            .push_r(Register.rdx)
            .push_r(Register.r8) // entry rsp was 8 mod 16; three pushes make it 16-aligned
            .sub_r_c(Register.rsp, 0x20)
            .mov_r_c(Register.rax, dllraw.kernel32.GetCurrentThreadId)
            .call_r(Register.rax)
            .add_r_c(Register.rsp, 0x20)
            .pop_r(Register.r8)
            .pop_r(Register.rdx)
            .pop_r(Register.rcx)
            .cmp_r_c(Register.rax, capi.nodeThreadId, OperationSize.dword)
            .jne_label("offthread")
            .mov_r_c(Register.rax, js)
            .jmp_r(Register.rax)
            .label("offthread")
            .mov_r_c(Register.rax, packetRawOffThread)
            .inc_rp(Register.rax, 1, 0)
            .mov_r_c(Register.rax, original)
            .jmp_r(Register.rax)
            .alloc("hook of BatchedNetworkPeer::_receivePacket");
    });
}

bedrockServer.withLoading().then(() => {
    const sendToClientsSymbol =
        "?sendToClients@LoopbackPacketSender@@UEAAXAEBV?$vector@UNetworkIdentifierWithSubId@@V?$allocator@UNetworkIdentifierWithSubId@@@std@@@std@@AEBVPacket@@@Z";

    if (packetizeSymbol in proc) hook2024Receive();
    else if (process.env.BDSX_NO_PACKET_DISPATCH !== "1") {
        installPacketDispatchers();
        installRawReceive();
    }

    // hook send
    asmcode.onPacketSend = makefunc.np(onPacketSend, int32_t, null, int32_t, NetworkIdentifier, Packet);
    asmcode.sendOriginal = procHacker.hookingRaw("?send@NetworkSystem@@QEAAXAEBVNetworkIdentifier@@AEBVPacket@@W4SubClientId@@@Z", asmcode.packetSendHook);

    asmcode.packetSendAllCancelPoint = proc[sendToClientsSymbol].add(0x11e); // jump to after NetworkSystem::_sendInternal

    // hook send all
    procHacker.patching(
        "hook-packet-send-all",
        sendToClientsSymbol,
        0xb4,
        asmcode.packetSendAllHook, // original code depended
        Register.rax,
        true,
        // prettier-ignore
        [
            0x49, 0x8B, 0x04, 0x24,                     // mov rax,qword ptr ds:[r12]
            0x49, 0x8B, 0xCC,                           // mov rcx,r12
            0x0F, 0xB6, 0xBB, 0xA0, 0x00, 0x00, 0x00,   // movzx edi,byte ptr ds:[rbx+A0]
            0x41, 0x0F, 0xB6, 0x74, 0x24, 0x10,         // movzx esi,byte ptr ds:[r12+10]
            0x48, 0x8b, 0x40, 0x08,                     // mov rax, qword ptr ds:[rax+8]
            0xFF, 0x15, null, null, null, null,         // call qword ptr ds:[<__guard_dispatch_icall_fptr>]
        ],
    );

    // hook send raw
    asmcode.onPacketSendInternal = makefunc.np(onPacketSendInternal, int32_t, null, NetworkSystem, NetworkIdentifier, Packet, CxxStringWrapper);
    asmcode.sendInternalOriginal = procHacker.hookingRaw(
        "?_sendInternal@NetworkSystem@@AEAAXAEBVNetworkIdentifier@@AEBVPacket@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
        asmcode.packetSendInternalHook,
    );
});
