/**
 * The mob-effect registry (engine layer; docs/findings-components.md "MobEffect::getById: the registry array").
 *
 * 2024 kept two out-of-line leaves: MobEffect::getById(unsigned int) -- `cmpl $0x24, %ecx; ja null; leaq
 * mMobEffects(%rip), %rcx; movq (%rcx,%rax,8), %rax` -- and MobEffect::getId, `movl 8(%rcx), %eax`. 1.26 has no copy of
 * either on either build: every one of the ~70 references to the static `std::unique_ptr<MobEffect> mMobEffects[]`
 * (40 0xc981670, 51 0xccb5c78) is inside a larger function, and the inlined lookup is the same leaf one element longer:
 * an unsigned `cmpq $0x25; ja` on the id, then the 8-byte slot, then a null test. 38 slots (0..37) is also Endstone's
 * `MobEffect::NUM_EFFECTS` (mob_effect.h, Apache-2.0). Slot 0 is UNKNOWN_EFFECT.
 */
import { VoidPointer } from "../../core";
import { engineLayout, engineSymbol } from "./deps";

const MOB_EFFECTS = engineSymbol("?mMobEffects@MobEffect@@2PAV?$unique_ptr@VMobEffect@@U?$default_delete@VMobEffect@@@std@@@std@@A");
/** MobEffect::NUM_EFFECTS: the inlined bound is `cmpq $0x25; ja` on both builds */
const EFFECT_COUNT = engineLayout("MobEffect", "count", 38);
/** MobEffect::mId: 2024 getId read +8, and Actor::getEffect(const MobEffect&) indexes with the key's +8 on both 1.26 builds */
export const MOB_EFFECT_ID = engineLayout("MobEffect", "id", 8);

/** MobEffect::getById: the registry slot, or null for an id out of range or an empty slot */
export function mobEffectById(id: number): VoidPointer | null {
    if (MOB_EFFECTS === null) throw Error("MobEffect::mMobEffects: no address in this build");
    const index = id >>> 0; // the engine compares the id unsigned, so a negative id is out of range
    if (index >= EFFECT_COUNT) return null;
    const p = MOB_EFFECTS.getPointer(index * 8);
    return p.isNull() ? null : p;
}
