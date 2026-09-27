/**
 * The ServerNetworkHandler behind a Level, as a Bedrock::NonOwnerPointer (engine layer; docs/findings-nbt.md
 * "NonOwnerPointer").
 *
 * 2024's Minecraft::getServerNetworkHandler has no address in either 1.26 table. The Level holds the same pointer at
 * +0x220 { control +0x220, its count block +0x228, object +0x230 }: ILevel's virtual +0xa48 (40 0x73f520, 51 0x7d7410,
 * identical bodies) copies those three words out and adds a use, and both GameTest callers of the SimulatedPlayer
 * wrapper move the object back 0x10 to get the ServerNetworkHandler -- its constructor (40 0xa58530, 51 0x96b9b0)
 * stores ??_7ServerNetworkHandler@@6BNetEventCallback@@@ at +0x10, so the Level's pointer is to that base.
 *
 * This fills a 24-byte NonOwnerPointer<ServerNetworkHandler> with the handler itself at +0x10 and one use of its own,
 * which the pointer's dispose() drops.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { int32_t, void_t } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

const LEVEL_SERVER_NETWORK_HANDLER = engineLayout("Level", "serverNetworkHandler", 0x220);
const SERVER_NETWORK_HANDLER_BASE = engineLayout("ServerNetworkHandler", "nonOwnerBase", 0x10);

/** copies the Level's NonOwnerPointer into `out` (an empty 24-byte NonOwnerPointer), as one to the handler itself */
export function copyLevelServerNetworkHandler(level: StaticPointer, out: StaticPointer): void {
    const control = level.getNullablePointer(LEVEL_SERVER_NETWORK_HANDLER);
    const count = level.getNullablePointer(LEVEL_SERVER_NETWORK_HANDLER + 8);
    const object = level.getNullablePointer(LEVEL_SERVER_NETWORK_HANDLER + 16);
    if (count !== null) count.interlockedIncrement32(8); // std::_Ref_count_base uses at +8, as the virtual's `lock incl`
    out.setPointer(control, 0);
    out.setPointer(count, 8);
    out.setPointer(object === null ? null : object.sub(SERVER_NETWORK_HANDLER_BASE), 16);
}

/**
 * ServerNetworkHandler::setMaxNumPlayers (docs/findings-packets.md "setMaxNumPlayers").
 *
 * 2024 (1.21.3.01 0x8976b0): count = _getActiveAndInProgressPlayerCount(UUID::EMPTY); the new maximum is
 * SharedConstants::NetworkDefaultMaxConnections when asked for more (return 1), the count when asked for fewer
 * (return -1), else what was asked (return 0); stored at max_num_players_, and when it changed,
 * updateServerAnnouncement() and IMinecraftApp::onNetworkMaxPlayersChanged(max) on the app_ reference. 1.26 keeps no
 * copy: SetMaxPlayersCommand::execute (40 0x3c646f0 / 51 0x3b43640) inlines it with the same calls, the cap as the
 * literal 40, the field at +0x3b8 / +0x3c0 and app_ at +0x288 / +0x290 (slot 5 of DedicatedServer's table is a bare
 * `ret` on both builds, as in 2024). mce::UUID::EMPTY is zero-initialised .data on every build.
 */
const SNH_MAX_NUM_PLAYERS = engineLayout("ServerNetworkHandler", "maxNumPlayers", 0x320);
const SNH_APP = engineLayout("ServerNetworkHandler", "app", 0x1c0);
const NETWORK_DEFAULT_MAX_CONNECTIONS = engineLayout("SharedConstants", "networkDefaultMaxConnections", 40);
const APP_ON_NETWORK_MAX_PLAYERS_CHANGED = engineLayout("IMinecraftApp", "onNetworkMaxPlayersChangedSlot", 5);
const PLAYER_COUNT = engineSymbol("?_getActiveAndInProgressPlayerCount@ServerNetworkHandler@@AEBAHVUUID@mce@@@Z");
const UPDATE_ANNOUNCEMENT = engineSymbol("?updateServerAnnouncement@ServerNetworkHandler@@QEAAXXZ");

let playerCount: ((snh: VoidPointer, uuid: VoidPointer) => number) | null = null;
let updateAnnouncement: ((snh: VoidPointer) => void) | null = null;

/** max_num_players_ */
export function serverMaxNumPlayers(snh: StaticPointer): number {
    return snh.getInt32(SNH_MAX_NUM_PLAYERS);
}

/** ServerNetworkHandler::setMaxNumPlayers: 1 when capped, -1 when raised to the players already in, 0 otherwise */
export function setMaxNumPlayersOwn(snh: StaticPointer, n: number): number {
    if (PLAYER_COUNT === null) throw Error("ServerNetworkHandler::_getActiveAndInProgressPlayerCount: no address in this build");
    if (UPDATE_ANNOUNCEMENT === null) throw Error("ServerNetworkHandler::updateServerAnnouncement: no address in this build");
    if (playerCount === null) playerCount = makefunc.js(PLAYER_COUNT, int32_t, null, VoidPointer, VoidPointer);
    if (updateAnnouncement === null) updateAnnouncement = makefunc.js(UPDATE_ANNOUNCEMENT, void_t, null, VoidPointer);
    const empty = new AllocatedPointer(16); // mce::UUID::EMPTY, passed by pointer (a 16-byte argument)
    for (let off = 0; off < 16; off += 4) empty.setInt32(0, off);
    const count = playerCount(snh, empty);
    let max = n | 0;
    let result = 0;
    if (max > NETWORK_DEFAULT_MAX_CONNECTIONS) {
        max = NETWORK_DEFAULT_MAX_CONNECTIONS;
        result = 1;
    } else if (max < count) {
        max = count;
        result = -1;
    }
    const old = snh.getInt32(SNH_MAX_NUM_PLAYERS);
    snh.setInt32(max, SNH_MAX_NUM_PLAYERS);
    if (old !== max) {
        updateAnnouncement(snh);
        const app = snh.getPointer(SNH_APP);
        const changed = app.getPointer(0).getPointer(APP_ON_NETWORK_MAX_PLAYERS_CHANGED * 8);
        makefunc.js(changed, void_t, null, VoidPointer, int32_t)(app, max);
    }
    return result;
}

/**
 * The NetworkIdentifier of every connection the NetworkSystem holds (docs/findings-packets.md "disconnectAll").
 *
 * 2024's ServerInstance::disconnectAllClientsWithMessage (1.21.3.01 0xc92790) walked NetworkSystem::getConnections()
 * -- a vector<unique_ptr<NetworkConnection>> -- and disconnected each connection's id with the message. 1.26 has no
 * copy on either build; the vector is NetworkSystem::connections_ (+0xa0, the inlined getPeerForUser) and the id is
 * the connection's first member. The pointers returned here point into the connections, so a caller copies them
 * before disconnecting anyone.
 */
const NETWORK_SYSTEM_CONNECTIONS = engineLayout("NetworkSystem", "connections", 0x40);
const NETWORK_CONNECTION_ID = engineLayout("NetworkConnection", "id", 0);
export function networkConnectionIds(system: StaticPointer): StaticPointer[] {
    const begin = system.getNullablePointer(NETWORK_SYSTEM_CONNECTIONS);
    const end = system.getNullablePointer(NETWORK_SYSTEM_CONNECTIONS + 8);
    if (begin === null || end === null) return [];
    const out: StaticPointer[] = [];
    const count = end.subptr(begin) / 8;
    for (let i = 0; i < count; i++) {
        const connection = begin.getNullablePointer(i * 8);
        if (connection !== null) out.push(connection.add(NETWORK_CONNECTION_ID));
    }
    return out;
}
