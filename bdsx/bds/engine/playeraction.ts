/**
 * The player-action bits 1.26 turns straight into actor flags (engine layer; docs/findings-bot.md section 9).
 *
 * 2024 started a player's swim from the PlayerActionPacket handler (StartSwimming -> Player::startSwimming, which sets
 * ActorFlags::Swimming through SynchedActorDataAccess::setActorFlag). 1.26's handler has no case for it, and nothing but
 * Player::startSwimming/stopSwimming and Actor::load calls setActorFlag with that flag. A client's swim is an ECS system
 * instead: for every entity with PlayerActionComponent, ActorDataFlagComponent, ActorDataDirtyFlagsComponent and
 * ActorMovementTickNeededComponent, its per-entity function, bdsx:PlayerActionFlagSystem::_tickEntity, takes
 *   (EntityId const*, PlayerActionComponent const*, ActorDataFlagComponent*, ActorDataDirtyFlagsComponent*, EntityRegistry*)
 * and writes the flag words itself: action bit 21 sets flag 57 (Swimming) when it is clear, bit 22 clears it; bits 32/33
 * do the same for flag 114 (crawling) and 11/12 for flag 1. The bit numbers are minecraft-data's Action values
 * (swimming 21, stop_swimming 22, start_crawling 32, stop_crawling 33, start_sneak 11, stop_sneak 12), and the code is
 * byte-for-byte the same on both builds (1.26.40.8 0x8333820, 1.26.51.1 0x83d74d0).
 */
import type { StaticPointer } from "../../core";
import { enttActorIn } from "./entt";

/** PlayerActionComponent+0, a 64-bit set of this tick's player actions: the swim start */
export const PLAYER_ACTION_START_SWIMMING = 21;
/** ActorDataFlagComponent+0, the actor flag words: Swimming */
export const ACTOR_FLAG_SWIMMING = 57;

/** the Actor* the system is running for, or null */
export function playerActionActor(entity: StaticPointer, entityRegistry: StaticPointer): StaticPointer | null {
    return enttActorIn(entityRegistry, entity.getUint32(0));
}

/** true when this call is about to set Swimming: the start bit is up and the flag is still clear */
export function startsSwimming(actions: StaticPointer, flags: StaticPointer): boolean {
    const start = (actions.getUint32(PLAYER_ACTION_START_SWIMMING >>> 5 << 2) >>> (PLAYER_ACTION_START_SWIMMING & 31)) & 1;
    const swimming = (flags.getUint32(ACTOR_FLAG_SWIMMING >>> 5 << 2) >>> (ACTOR_FLAG_SWIMMING & 31)) & 1;
    return start === 1 && swimming === 0;
}

/** clear the swim start bit for one call (a cancel) and give back a function that puts it back */
export function holdSwimStart(actions: StaticPointer): () => void {
    const offset = PLAYER_ACTION_START_SWIMMING >>> 5 << 2;
    const word = actions.getUint32(offset);
    actions.setUint32(word & ~(1 << (PLAYER_ACTION_START_SWIMMING & 31)), offset);
    return () => actions.setUint32(word, offset);
}
