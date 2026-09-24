/**
 * Block::onProjectileHit / Block::onLightningHit (engine layer; docs/findings-blocks.md section 21).
 *
 * Both were two-line forwarders into a BlockLegacy virtual in 2024, and 1.26 inlines them into their callers.
 * The virtual they forward to is, for most blocks, an empty stub ICF-shared with unrelated virtuals, so bdsx
 * raises the events from the callers instead -- the same points the engine calls the block from:
 * - ProjectileComponent::onHit reads the block at the HitResult's `block_` and calls slot 15 with the
 *   projectile (both 1.26 builds and 2024: HitResult+0x20).
 * - LightningBolt::normalTick calls slot 16 on the block at its floored position on the tick its `life`
 *   counter is 2, the bolt's first (1.26.40.8 and 1.26.51.1: +0x3b4; 2024: +0x44c).
 */
import type { StaticPointer } from "../../core";
import type { Actor } from "../actor";
import { BlockPos } from "../blockpos";
import type { HitResult } from "../components";
import { engineLayout } from "./deps";

export const HITRESULT_BLOCK = engineLayout("HitResult", "block", 0x20);
export const LIGHTNING_LIFE = engineLayout("LightningBolt", "life", 0x44c);

export function hitResultBlockPos(result: HitResult): BlockPos {
    return (result as any as StaticPointer).addAs(BlockPos, HITRESULT_BLOCK);
}

/** true on the tick LightningBolt::normalTick strikes the block under the bolt */
export function lightningStrikesThisTick(bolt: StaticPointer): boolean {
    return bolt.getInt32(LIGHTNING_LIFE) === 2;
}

/** the block position LightningBolt::normalTick strikes: the bolt's position, floored per axis */
export function lightningBlockPos(bolt: Actor): BlockPos {
    return BlockPos.create(bolt.getPosition());
}
