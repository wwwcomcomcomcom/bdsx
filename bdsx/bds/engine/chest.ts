/**
 * ChestBlockActor pairing (engine layer; docs/findings-blocks.md section 17).
 *
 * isLargeChest and getPairedChestPosition were one-line readers in 2024 (`largeChestPaired != null`,
 * `&largeChestPairedPosition`) with no out-of-line copy in 1.26. pairWith still writes both fields: the
 * partner pointer, then its BlockPos right after it. 1.26.40.8: +0x2f8 / +0x300; 1.26.51.1 is 8 bytes
 * further out. The fallbacks are the 2024 offsets.
 */
import { StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";
import type { Player } from "../player";
import type { ChestBlockActor } from "../block";
import { BlockPos } from "../blockpos";
import { engineLayout } from "./deps";

export const CHEST_PAIRED = engineLayout("ChestBlockActor", "paired", 0x2a0);
export const CHEST_PAIRED_POSITION = engineLayout("ChestBlockActor", "pairedPosition", 0x2a8);

export function chestIsLarge(self: ChestBlockActor): boolean {
    return !(self as any as StaticPointer).getPointer(CHEST_PAIRED).isNull();
}

export function chestPairedPosition(self: ChestBlockActor): BlockPos {
    return (self as any as StaticPointer).addAs(BlockPos, CHEST_PAIRED_POSITION);
}

/**
 * ChestBlockActor::openBy(Player&), slot 29 of the chest's own (primary) vftable on both builds: 40 0x2915f70, 51 0x1f33d00.
 * 2024 had it at slot 45 of a 51-slot table (0x20f4de0); 1.26's table is 35 slots because the custom-name, container and
 * loot-table virtuals moved to the main interface (blockactor.ts), and the tail of ChestBlockActor's own virtuals (loadItems,
 * saveItems, openBy, playOpenSound, playCloseSound, _canOpenThis, getObstructionAABB, _detectEntityObstruction) is at 27..34
 * with openBy second from the top of that run (28 saveItems, 29 openBy). The body is 2024's: send the player-gameplay event
 * (variant 0x10 with the block position; executed: the bot's +0x5a0 goes null -> pointer inside the call), then, when the player has an open container (`cmpq $0, 0x5a0(player)`), call
 * `Container::startOpen(player)` (vftable +0xb0) on the chest's container, or on the partner's when one is paired
 * (40: partner +0x2f8 / valid flag +0x2d4, container +0x110; 51: +0x300 / +0x2dc / +0x118).
 */
export const CHEST_OPEN_BY_SLOT = engineLayout("ChestBlockActor", "openBySlot", 45);
export function chestOpenBy(self: ChestBlockActor, player: Player): void {
    const fn = (self as any as StaticPointer).getPointer(0).getPointer(CHEST_OPEN_BY_SLOT * 8);
    makefunc.js(fn, void_t, null, VoidPointer, VoidPointer)(self as any, player as any);
}
