/**
 * PistonBlockActor (engine layer; docs/findings-blocks.md section 16).
 *
 * 1.26 keeps the piston's private members out of line (_checkAttachedBlocks, _attachedBlockWalker,
 * _spawnMovingBlocks, getFacingDir -- found from Endstone's tick address, which is reached through the
 * IVanillaTickBlockActorComponent interface rather than the primary vftable), but the two one-line
 * readers bdsx used are gone: `action` is state_ and getAttachedBlocks returned &attached_blocks_.
 * Both are fields read here at the build's offset. 1.26.40.8: state_ +0xf7, attached_blocks_ +0x100;
 * 1.26.51.1 is 8 bytes further out. The fallbacks are the 2024 offsets.
 */
import type { StaticPointer } from "../../core";
import { CxxVector } from "../../cxxvector";
import type { PistonBlockActor } from "../block";
import { BlockPos } from "../blockpos";
import { engineLayout } from "./deps";

export const PISTON_STATE = engineLayout("PistonBlockActor", "state", 0xd7);
export const PISTON_ATTACHED_BLOCKS = engineLayout("PistonBlockActor", "attachedBlocks", 0xe0);

const BlockPosVector = CxxVector.make(BlockPos);

/** a copy of attached_blocks_, the positions the last _checkAttachedBlocks walked */
export function pistonAttachedBlocks(self: PistonBlockActor): BlockPos[] {
    return (self as any as StaticPointer).addAs(BlockPosVector, PISTON_ATTACHED_BLOCKS).toArray().map(pos => BlockPos.create(pos));
}
