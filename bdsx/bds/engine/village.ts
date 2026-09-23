/**
 * Player::isInRaid (engine layer; docs/findings-slots.md "isInRaid").
 *
 * 1.26.40.8 keeps an out-of-line isInRaid (0x234b80); 1.26.51.1 inlines it into its DeathInfoPacket builder. Both do
 * 2024's steps: the dimension's VillageManager (a unique_ptr at layouts.Dimension.villageManager -- +0x5e0 on 40,
 * +0x3e0 on 51), the manager's virtual 1 with (sret weak_ptr<Village>, the player's floored BlockPos, 32, -1), and, when
 * the weak_ptr is still alive, Village::hasRaid inlined as `village+0x348 != 0`. The weak_ptr's weak reference is
 * released here as the engine's code does (the control block's +0xc count; its virtual 1 deletes it at zero).
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { int32_t, void_t } from "../../nativetype";
import { engineLayout } from "./deps";

const DIMENSION_VILLAGE_MANAGER = engineLayout("Dimension", "villageManager", 0x5e0);
const VILLAGE_MANAGER_GET_VILLAGE_SLOT = engineLayout("VillageManager", "getVillageSlot", 1);
const VILLAGE_RAID = engineLayout("Village", "raid", 0x348);

export function playerIsInRaid(dimension: StaticPointer, x: number, y: number, z: number): boolean {
    const manager = dimension.getNullablePointer(DIMENSION_VILLAGE_MANAGER);
    if (manager === null) return false;
    const getVillage = makefunc.js(manager.getPointer(0).getPointer(VILLAGE_MANAGER_GET_VILLAGE_SLOT * 8), void_t, null, VoidPointer, VoidPointer, VoidPointer, int32_t, int32_t);
    const weak = new AllocatedPointer(16);
    weak.fill(0, 16);
    const pos = new AllocatedPointer(12);
    pos.setInt32(Math.floor(x), 0);
    pos.setInt32(Math.floor(y), 4);
    pos.setInt32(Math.floor(z), 8);
    getVillage(manager, weak, pos, 32, -1);
    const control = weak.getNullablePointer(8);
    if (control === null) return false;
    let raid = false;
    const village = weak.getNullablePointer(0);
    if (village !== null && control.getInt32(8) > 0) raid = !village.getPointer(VILLAGE_RAID).isNull();
    const weaks = control.getInt32(12) - 1; // the game thread is the only one touching villages
    control.setInt32(weaks, 12);
    if (weaks === 0) makefunc.js(control.getPointer(0).getPointer(8), void_t, null, VoidPointer)(control);
    return raid;
}
