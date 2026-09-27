/**
 * Setting an actor on fire (engine layer; docs/findings-layouts.md "OnFireSystem").
 *
 * 2024 had two out-of-line statics: OnFireSystem::setOnFire(Actor&, int seconds) -- thaw the freeze effect, then on
 * the server (and not while in water or rain with the dimension set) ticks = seconds * 20 scaled down by the Fire
 * Protection levels of a mob's armour, getOrAddComponent<OnFireComponent>() takes the larger of that and its
 * current ticks, and sets the byte at +4 -- and setOnFireNoEffects(Actor&, int), which only does the ticks = max(...)
 * part (no thaw, no client-side test, no water test, no protection, and the byte at +4 left alone).
 *
 * 1.26 keeps setOnFire out of line with the same (Actor&, int) interface -- a wrapper that computes the water test
 * and the protection levels and tail-calls a four-argument core -- but has no copy of setOnFireNoEffects: it is
 * inlined into ScriptActor::setOnFire (the script API's `Entity.setOnFire(seconds, useEffects)`), whose
 * `useEffects == false` branch is 2024's setOnFireNoEffects instruction for instruction (getOrAdd the
 * OnFireComponent, ticks = max(ticks, seconds * 20)). So the no-effects form goes through that function with
 * useEffects false: `(ScriptActor* this, Result<bool>* sret, Actor&, int seconds, bool useEffects)`. The body never
 * reads `this` (rcx) on either build and writes a 0x48-byte Result<bool> into the return slot, whose error half is
 * an empty entt::meta_any with nothing to free.
 */
import { AllocatedPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, int32_t, void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const SCRIPT_ACTOR_SET_ON_FIRE = engineSymbol("bdsx:ScriptActor::setOnFire");
/** Result<bool, ...>: the body writes +0x00..+0x47 on both builds */
const RESULT_SIZE = 0x48;

type SetOnFireCall = (self: VoidPointer | null, result: VoidPointer, actor: VoidPointer, seconds: number, useEffects: boolean) => void;
let call: SetOnFireCall | null = null;

/** OnFireSystem::setOnFireNoEffects: the useEffects == false branch of ScriptActor::setOnFire */
export function setOnFireNoEffectsOwn(actor: VoidPointer, seconds: number): void {
    if (SCRIPT_ACTOR_SET_ON_FIRE === null) throw Error("ScriptActor::setOnFire: no address in this build");
    // The script entry point returns before touching the actor for seconds <= 0; 2024's setOnFireNoEffects would
    // have added a zero-tick component there, which burns for no ticks either way.
    if (call === null) call = makefunc.js(SCRIPT_ACTOR_SET_ON_FIRE, void_t, null, VoidPointer, VoidPointer, VoidPointer, int32_t, bool_t);
    const result = new AllocatedPointer(RESULT_SIZE);
    call(null, result, actor, seconds | 0, false);
}
