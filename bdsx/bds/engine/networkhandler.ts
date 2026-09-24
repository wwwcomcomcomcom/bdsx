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
import { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

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
