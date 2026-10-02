/**
 * Who jumped, as 1.26's JumpExhaustion system sees it (engine layer; docs/findings-slots.md "Q7 through a simulated
 * player").
 *
 * 2024's Player::handleJumpEffects ran from the PlayerActionPacket StartJump handler: skip on the client, add the
 * ExhaustionComponent's jump value (sprinting: the sprint jump's) through causeFoodExhaustion, store MobJump's start
 * position. 1.26's handler sends StartJump to its exit, and the exhaustion is an ECS system the binary registers as
 * "JumpExhaustion", over the players that hold a TriggerJumpRequestComponent (with ActorDataFlag-, ActorGameType- and
 * ExhaustionComponent). Its per-entity function, bdsx:JumpExhaustionSystem::_tickEntity, takes
 *   (EntityId const*, ActorDataFlagComponent const*, ActorGameTypeComponent const*, ExhaustionComponent const*,
 *    context*, int const* worldDefaultGameType)
 * returns for creative, and otherwise queues an AttributeRequest adding ExhaustionComponent+4 (+8 when flag bit 3,
 * sprinting, is up) to the exhaustion attribute. The context's first word is the EntityRegistry the system ticks; the
 * entt registry inside it maps the id to its Actor through ActorOwnerComponent.
 */
import type { StaticPointer } from "../../core";
import { enttActorIn } from "./entt";

/** the Actor* the JumpExhaustion system is running for, or null */
export function jumpExhaustionActor(entity: StaticPointer, context: StaticPointer): StaticPointer | null {
    const entityRegistry = context.getNullablePointer(0);
    return entityRegistry === null ? null : enttActorIn(entityRegistry, entity.getUint32(0));
}
