/**
 * Creating a SimulatedPlayer (engine layer; docs/findings-slots.md "SimulatedPlayer").
 *
 * 2024's SimulatedPlayer::create took (name, BlockPos, dimension, not_null<NonOwnerPointer<ServerNetworkHandler>>, xuid).
 * 1.26's create takes nine arguments; the GameTest code calls it through a six-argument wrapper (40 0x12d1c60, 51
 * 0x11f3d20, byte-identical but for branch targets) that the table ships as `bdsx:SimulatedPlayer::create`:
 *   (std::string const& name, Vec3 const& pos, DimensionType, NonOwnerPointer<ServerNetworkHandler> by value,
 *    std::string const& xuid, a 16-byte std::optional by value -- the GameTest caller passes it disengaged)
 * and passes create (name, pos, Vec3::ZERO, Vec2::ZERO, false, dimension, the handler, xuid, the optional).
 *
 * The handler pointer: the GameTest caller takes it from ILevel's virtual +0xa48, which on both builds copies the
 * NonOwnerPointer the Level holds at +0x220 { control +0x220, its count block +0x228, object +0x230 }, and moves the
 * object pointer back by 0x10 (the base it points at sits 0x10 into ServerNetworkHandler). The wrapper takes it by
 * value and releases it on return, so bdsx adds the reference it will drop.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { CxxString, int32_t } from "../../nativetype";
import type { Vec3 } from "../blockpos";
import { engineLayout, engineSymbol } from "./deps";

const LEVEL_SERVER_NETWORK_HANDLER = engineLayout("Level", "serverNetworkHandler", 0x220);
const SERVER_NETWORK_HANDLER_BASE = engineLayout("ServerNetworkHandler", "nonOwnerBase", 0x10);

let create: ((name: string, pos: VoidPointer, dimension: number, handler: VoidPointer, xuid: string, optional: VoidPointer) => VoidPointer) | null = null;

/** the new SimulatedPlayer, or null when the build has no wrapper address or the engine refused */
export function createSimulatedPlayer(level: StaticPointer, name: string, pos: Vec3, dimension: number): VoidPointer | null {
    if (create === null) {
        const fn = engineSymbol("bdsx:SimulatedPlayer::create");
        if (fn === null) return null;
        create = makefunc.js(fn, VoidPointer, null, CxxString, VoidPointer, int32_t, VoidPointer, CxxString, VoidPointer);
    }
    const control = level.getPointer(LEVEL_SERVER_NETWORK_HANDLER);
    const count = level.getNullablePointer(LEVEL_SERVER_NETWORK_HANDLER + 8);
    const object = level.getPointer(LEVEL_SERVER_NETWORK_HANDLER + 16);
    const handler = new AllocatedPointer(24);
    handler.setPointer(control, 0);
    handler.setPointer(count, 8);
    handler.setPointer(object.isNull() ? object : object.sub(SERVER_NETWORK_HANDLER_BASE), 16);
    if (count !== null) count.setInt32(count.getInt32(8) + 1, 8); // the reference the wrapper drops; game thread only
    const optional = new AllocatedPointer(16);
    optional.fill(0, 16);
    const result = create(name, pos as any as VoidPointer, dimension, handler, "", optional);
    return result.isNull() ? null : result;
}
