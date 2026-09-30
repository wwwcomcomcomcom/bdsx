/**
 * Pushing entities (engine layer; docs/findings-components.md "Pushable: the 1.26 split").
 *
 * 2024 had one PushableComponent holding `is_pushable` (+0) and `is_pushable_by_piston` (+1) as bytes. 1.26 split it
 * into two EnTT components, and "minecraft:pushable" now decides which of them an actor holds:
 *
 * - PushableByEntityComponent (fnv1a 0xe0f57b82) is present when `is_pushable` is true. It is a 0x28-byte element on
 *   both builds (the emplace at 40 0x1a416a0 / 51 0x1e519d0 strides `leaq (r,r,4); shll 3`), filled from the
 *   definition. Mob::knockback, Mob::pushActors and the push below only ask whether it is there.
 * - PushableByBlockComponent (fnv1a 0xdc5e610) is an empty tag: its get_or_emplace (40 0xf8c860 / 51 0xea93a0) has no
 *   payload, so presence is all it says. It is present when `is_pushable_by_piston` is true.
 *
 * 2024's two `push` members lost their component: the bodies are free functions over the actor, with the
 * `is_pushable` byte test replaced by the caller's presence check.
 * - push(Actor&, Vec3 const&) (40 0x2cf33d0, 51 0x2fa2f30; the same code but for one vtable slot): the boat/minecart
 *   branch, else the state vector's posDelta (+0x18) += vec behind two actor checks -- 2024 0x63ccf0 without its
 *   `cmpb $0,(%rcx)` on the component.
 * - push(Actor& owner, Actor& other, bool pushSelfOnly) (40 0x2cf1f50, 51 0x2fa1ab0, the same code but for one vtable
 *   slot): skipPush, a PushableByEntityComponent check on `owner`, setPushedBy, push(owner, v), then push(other, ...)
 *   when `other` holds one too -- 2024 0x63c770 with `this` dropped and the same callee order.
 * Neither has a knowable decoration, so both ship under bdsx: keys.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, void_t } from "../../nativetype";
import type { Actor } from "../actor";
import { Vec3 } from "../blockpos";
import { componentHash, engineLayout, engineSymbol } from "./deps";
import { enttComponent, enttHas } from "./entt";

const PUSHABLE_BY_ENTITY = componentHash("PushableByEntityComponent");
const PUSHABLE_BY_BLOCK = componentHash("PushableByBlockComponent");
const PUSHABLE_BY_ENTITY_SIZE = engineLayout("PushableByEntityComponent", "size", 0x28);

const PUSH_BY_VEC = engineSymbol("bdsx:Pushable::push(Actor&,Vec3 const&)");
const PUSH_BY_ACTOR = engineSymbol("bdsx:Pushable::push(Actor&,Actor&,bool)");

/** the actor's PushableByEntityComponent, or null when other entities cannot push it */
export function pushableByEntity(actor: Actor): StaticPointer | null {
    return enttComponent(actor, PUSHABLE_BY_ENTITY, PUSHABLE_BY_ENTITY_SIZE);
}

/** an empty type has no storage of its own: every holder gets this one address, as with PhysicsComponent */
const PUSHABLE_BY_BLOCK_STATIC = new AllocatedPointer(8);

/** a stand-in for the actor's PushableByBlockComponent (an empty tag), or null when pistons cannot push it */
export function pushableByBlock(actor: Actor): StaticPointer | null {
    return enttHas(actor, PUSHABLE_BY_BLOCK) ? PUSHABLE_BY_BLOCK_STATIC : null;
}

let pushByVec: ((actor: Actor, vec: Vec3) => void) | null = null;
let pushByActor: ((owner: Actor, other: Actor, pushSelfOnly: boolean) => void) | null = null;

export function pushActorByVec(actor: Actor, vec: Vec3): void {
    if (pushByVec === null) {
        if (PUSH_BY_VEC === null) throw Error("push(Actor&, Vec3 const&): no address in this build");
        pushByVec = makefunc.js(PUSH_BY_VEC, void_t, null, VoidPointer, Vec3) as any;
    }
    pushByVec!(actor, vec);
}

export function pushActorByActor(owner: Actor, other: Actor, pushSelfOnly: boolean): void {
    if (pushByActor === null) {
        if (PUSH_BY_ACTOR === null) throw Error("push(Actor&, Actor&, bool): no address in this build");
        pushByActor = makefunc.js(PUSH_BY_ACTOR, void_t, null, VoidPointer, VoidPointer, bool_t) as any;
    }
    pushByActor!(owner, other, pushSelfOnly);
}
