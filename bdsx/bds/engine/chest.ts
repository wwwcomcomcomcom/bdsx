/**
 * ChestBlockActor pairing (engine layer; docs/findings-blocks.md section 17).
 *
 * isLargeChest and getPairedChestPosition were one-line readers in 2024 (`largeChestPaired != null`,
 * `&largeChestPairedPosition`) with no out-of-line copy in 1.26. pairWith still writes both fields: the
 * partner pointer, then its BlockPos right after it. 1.26.40.8: +0x2f8 / +0x300; 1.26.51.1 is 8 bytes
 * further out. The fallbacks are the 2024 offsets.
 */
import type { StaticPointer } from "../../core";
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
