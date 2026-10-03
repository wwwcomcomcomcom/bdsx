import { Register } from "../assembler";
import { abstract } from "../common";
import { StaticPointer, VoidPointer } from "../core";
import { dll } from "../dll";
import { events } from "../event";
import { HashSet, Hashable } from "../hashset";
import { makefunc } from "../makefunc";
import { AbstractClass, NativeClass, NativeStruct, nativeClass, nativeField } from "../nativeclass";
import { NativeType, bin64_t, int32_t, void_t } from "../nativetype";
import { CxxStringWrapper } from "../pointer";
import { procHacker } from "../prochacker";
import { proc } from "./symbols";
import { remapAndPrintError } from "../source-map-support";
import { ConnectionRequest } from "./connreq";
import type { Packet } from "./packet";
import type { ServerPlayer } from "./player";
import { RakNet } from "./raknet";
import { RakNetConnector } from "./raknetinstance";
import { pdbcache } from "../pdbcache";
import { netherNetIdHash, netherNetIdKey } from "./engine/nethernetid";

// TODO: fill
enum SubClientId {}

@nativeClass()
export class NetworkSystem extends AbstractClass {
    @nativeField(VoidPointer)
    vftable: VoidPointer;
    /** @deprecated use bedrockServer.connector */
    instance: RakNetConnector;

    send(ni: NetworkIdentifier, packet: Packet, senderSubClientId: number): void;
    send(ni: NetworkIdentifier, packet: Packet, senderSubClientId: SubClientId): void;

    send(ni: NetworkIdentifier, packet: Packet, senderSubClientId: number): void {
        abstract();
    }

    sendInternal(ni: NetworkIdentifier, packet: Packet, data: CxxStringWrapper): void {
        abstract();
    }

    getConnectionFromId(ni: NetworkIdentifier): NetworkConnection | null {
        abstract();
    }
}
export import NetworkHandler = NetworkSystem;

export class NetworkConnection extends AbstractClass {
    networkIdentifier: NetworkIdentifier;

    disconnect(): void {
        abstract();
    }
}

export namespace NetworkSystem {
    /** @deprecated renamed to NetworkConnection */
    export const Connection = NetworkConnection;
    /** @deprecated renamed to NetworkConnection */
    export type Connection = NetworkConnection;
}

@nativeClass(null)
class ServerNetworkHandler$Client extends AbstractClass {}

@nativeClass(null)
export class ServerNetworkHandler extends AbstractClass {
    @nativeField(VoidPointer)
    vftable: VoidPointer;
    /** serverName, written by allowIncomingConnections (implements.ts: at the build's layouts.ServerNetworkHandler.serverName; 2024 had +0x2c8) */
    get motd(): string {
        return abstract();
    }
    /** max_num_players_ (implements.ts: at the build's layouts.ServerNetworkHandler.maxNumPlayers; 2024 had +0x320) */
    get maxPlayers(): number {
        return abstract();
    }

    disconnectClient(client: NetworkIdentifier, message: string = "disconnectionScreen.disconnected"): void {
        abstract();
    }
    /**
     * @alias allowIncomingConnections
     */
    setMotd(motd: string): void {
        this.allowIncomingConnections(motd, true);
    }
    /**
     * @deprecated use setMaxNumPlayers
     */
    setMaxPlayers(count: number): void {
        this.setMaxNumPlayers(count);
    }
    allowIncomingConnections(motd: string, shouldAnnounce: boolean): void {
        abstract();
    }
    updateServerAnnouncement(): void {
        abstract();
    }
    /** @return 1 when capped at the network's limit, -1 when raised to the players already connected, else 0 */
    setMaxNumPlayers(n: number): number {
        abstract();
    }
    /**
     * it's the same with `client.getActor()`
     */
    _getServerPlayer(client: NetworkIdentifier, clientSubId: number): ServerPlayer | null;
    _getServerPlayer(client: NetworkIdentifier, clientSubId: SubClientId): ServerPlayer | null;

    _getServerPlayer(client: NetworkIdentifier, clientSubId: number): ServerPlayer | null {
        abstract();
    }
    fetchConnectionRequest(target: NetworkIdentifier): ConnectionRequest {
        abstract();
    }
}

export namespace ServerNetworkHandler {
    export type Client = ServerNetworkHandler$Client;
}

const identifiers = new HashSet<NetworkIdentifier>();

/**
 * Where the identifier keeps its parts. The 2024 layout is the default; a
 * build whose symbols.json ships `layouts.NetworkIdentifier` (read from live
 * objects and Endstone's header, docs/findings-instances.md) overrides it:
 * on 1.26 the NetherNet id grew to 24 bytes, which pushed the RakNet GUID
 * to +24, the socket address to +40 and the type to +168, for 176 bytes.
 */
export const networkIdentifierLayout = (() => {
    const l = pdbcache.layouts.NetworkIdentifier;
    return {
        size: l?.size ?? 0xa0,
        netherNetId: l?.netherNetId ?? 0,
        guid: l?.guid ?? 8,
        sock: l?.sock ?? 0x18,
        type: l?.type ?? 0x98,
    };
})();

export enum NetworkIdentifierType {
    RakNet = 0,
    Address = 1,
    Address6 = 2,
    NetherNet = 3,
    Invalid = 4,
}

@nativeClass(0xb0)
export class NetworkIdentifier extends NativeStruct implements Hashable {
    @nativeField(bin64_t)
    unknown: bin64_t;
    /**
     * The GUID and, right after it, the socket address: RakNet's AddressOrGUID shape. At
     * networkIdentifierLayout.guid (+8 in 2024, +0x18 on 1.26, where the NetherNet id grew); the socket
     * address follows the GUID's 16 bytes on both (layout.sock). On 1.26 the tail of the embedded
     * SystemAddress (debugPort/systemIndex, +0x80) overlaps `type`: only the sockaddr part is meaningful.
     */
    @nativeField(RakNet.AddressOrGUID, networkIdentifierLayout.guid)
    address: RakNet.AddressOrGUID;

    get type(): NetworkIdentifierType {
        return this.getInt32(networkIdentifierLayout.type);
    }

    assignTo(target: VoidPointer): void {
        dll.vcruntime140.memcpy(target, this, networkIdentifierSize);
    }

    equals(other: NetworkIdentifier): boolean {
        abstract();
    }

    hash(): number {
        abstract();
    }

    /**
     * The comparison the binary makes, spelled out from the type (Endstone's
     * header does the same): only the part the type says is live counts
     * (for NetherNet, the variant's index and active alternative: bds/engine/nethernetid.ts).
     * Used when ?equalsTypeData@NetworkIdentifier@@ has no address.
     */
    equalsTypeDataByLayout(other: NetworkIdentifier): boolean {
        const L = networkIdentifierLayout;
        switch (this.type) {
            case NetworkIdentifierType.RakNet:
                return this.getBin64(L.guid) === other.getBin64(L.guid);
            case NetworkIdentifierType.Address:
                return this.getUint16(L.sock + 2) === other.getUint16(L.sock + 2) && this.getUint32(L.sock + 4) === other.getUint32(L.sock + 4);
            case NetworkIdentifierType.Address6:
                if (this.getUint16(L.sock + 2) !== other.getUint16(L.sock + 2)) return false;
                for (let i = 0; i < 16; i += 4) if (this.getUint32(L.sock + 8 + i) !== other.getUint32(L.sock + 8 + i)) return false;
                return true;
            case NetworkIdentifierType.NetherNet:
                // the variant's index and active alternative only: the rest of its 24 bytes is not cleared
                return netherNetIdKey(this as unknown as StaticPointer, L.netherNetId) === netherNetIdKey(other as unknown as StaticPointer, L.netherNetId);
            case NetworkIdentifierType.Invalid:
                return other.type === NetworkIdentifierType.Invalid;
            default:
                return false;
        }
    }

    /**
     * A hash consistent with equalsTypeDataByLayout: whatever that compares
     * is what is folded. Used when ?getHash@NetworkIdentifier@@ has no
     * address; only bdsx's own identifier set consumes it.
     */
    hashByLayout(): number {
        const L = networkIdentifierLayout;
        let h = this.type | 0;
        switch (this.type) {
            case NetworkIdentifierType.RakNet:
                return h ^ this.getInt32(L.guid) ^ this.getInt32(L.guid + 4);
            case NetworkIdentifierType.Address:
                return h ^ this.getUint16(L.sock + 2) ^ this.getInt32(L.sock + 4);
            case NetworkIdentifierType.Address6:
                h ^= this.getUint16(L.sock + 2);
                for (let i = 0; i < 16; i += 4) h ^= this.getInt32(L.sock + 8 + i);
                return h;
            case NetworkIdentifierType.NetherNet:
                return h ^ netherNetIdHash(this as unknown as StaticPointer, L.netherNetId);
            default:
                return h;
        }
    }

    getActor(): ServerPlayer | null {
        abstract();
    }

    getAddress(): string {
        abstract();
    }

    toString(): string {
        return this.getAddress();
    }

    static fromPointer(ptr: StaticPointer): NetworkIdentifier {
        return identifiers.get(ptr.as(NetworkIdentifier))!;
    }
    static all(): IterableIterator<NetworkIdentifier> {
        return identifiers.values();
    }
}
const networkIdentifierSize = networkIdentifierLayout.size;
let resolverFailed = false;
NetworkIdentifier.setResolver(ptr => {
    if (ptr === null) return null;
    // This runs while a native call is marshalling its parameters: an
    // exception here has no JavaScript frame to land in and takes the
    // process down (it did, at the first packet sent to a joining client, when
    // hash() needed a symbol this build does not have). So it cannot throw.
    try {
        let ni = identifiers.get(ptr.as(NetworkIdentifier));
        if (ni != null) return ni;
        ni = new NetworkIdentifier(true);
        (ni as any).copyFrom(ptr, networkIdentifierSize);
        identifiers.add(ni);
        return ni;
    } catch (err) {
        if (!resolverFailed) {
            resolverFailed = true;
            remapAndPrintError(err);
            console.error("[bdsx] NetworkIdentifier could not be hashed; identifiers are not shared between events on this build");
        }
        const copy = new NetworkIdentifier(true);
        (copy as any).copyFrom(ptr, networkIdentifierSize);
        return copy;
    }
});
/** @deprecated use bedrockServer.networkSystem */
export let networkSystem: NetworkSystem;

// 1.26 added two arguments (the body override and a Json::Value session summary, Endstone connector.h), so the
// decoration is unknowable and the table ships ConnectionCallbacks slot 3 under bdsx's own key. The four register
// arguments are 2024's; the hook reads only those and leaves the stack ones to the original.
const ON_CONNECTION_CLOSED_2024 =
    "?onConnectionClosed@NetworkSystem@@EEAAXAEBVNetworkIdentifier@@W4DisconnectFailReason@Connection@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@_N@Z";
procHacker.hookingRawWithCallOriginal(
    "bdsx:NetworkSystem::onConnectionClosed" in proc ? "bdsx:NetworkSystem::onConnectionClosed" : ON_CONNECTION_CLOSED_2024,
    makefunc.np(
        (handler, ni, reason, msg) => {
            try {
                events.networkDisconnected.fire(ni);
            } catch (err) {
                remapAndPrintError(err);
            }
            // ni is used after onConnectionClosed. on some message processings.
            // timeout for avoiding the re-allocation
            setTimeout(() => {
                identifiers.delete(ni);
            }, 3000);
        },
        void_t,
        { name: "hook of NetworkIdentifier dtor" },
        NetworkSystem,
        NetworkIdentifier,
        int32_t,
        CxxStringWrapper,
    ),
    [Register.rcx, Register.rdx, Register.r8, Register.r9],
    [],
);
