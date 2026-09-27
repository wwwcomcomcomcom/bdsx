/**
 * CommandOrigin virtuals bdsx calls by slot (engine layer; docs/findings-audit.md "Shared addresses").
 *
 * bdsx used to find these slots with procHacker.jsv, which scans ??_7ServerCommandOrigin@@6B@ for the FIRST slot
 * whose pointer equals the named function's address. On 1.26 ServerCommandOrigin::getBlockPosition (BlockPos) and
 * ::getWorldPosition (Vec3) both return twelve zero bytes, so identical-code folding gives them one body (40
 * 0xa10c60, 51 0x906d00) that fills slots 3 and 4, and the scan resolved getWorldPosition to slot 3. On any origin
 * with a position (a player, `execute as ... at ...`) bdsx's getWorldPosition called getBlockPosition and read the
 * BlockPos's ints as floats. 2024 kept the two apart (they copied BlockPos::ZERO and Vec3::ZERO).
 * Endstone's command_origin.h puts getWorldPosition at slot 4, as 2024's table did.
 */
import { VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { Vec3 } from "../blockpos";
import { engineLayout } from "./deps";

export const COMMAND_ORIGIN_WORLD_POSITION_SLOT = engineLayout("CommandOrigin", "getWorldPositionSlot", 4);

/** Vec3 CommandOrigin::getWorldPosition() const, through the origin's own vftable */
export const commandOriginWorldPosition = makefunc.js([COMMAND_ORIGIN_WORLD_POSITION_SLOT * 8], Vec3, { this: VoidPointer, structureReturn: true });
