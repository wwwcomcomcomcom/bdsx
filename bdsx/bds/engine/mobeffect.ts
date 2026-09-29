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
import { StaticPointer, VoidPointer } from "../../core";
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

/** MobEffect::mComponentName: the constructor builds "minecraft:effect." + resourceName into +0x100 on both builds, as in 2024 */
const COMPONENT_NAME = engineLayout("MobEffect", "componentName", 0x100);
/** HashedString::defaultErrorValue, a copy of the empty HashedString made by its dynamic initializer (40 0x1f0840, 51 0x28d720) */
const DEFAULT_ERROR_VALUE = engineSymbol("?defaultErrorValue@HashedString@@2V1@A");

/**
 * MobEffectInstance::getComponentName. 2024 kept it out of line (1.21.3.01 0x18aea60): mMobEffects[id] (id at the instance's
 * +0) and its HashedString at +0x100, or HashedString::defaultErrorValue for an id out of range or an empty slot. 1.26 has
 * no copy of it; Mob::hasComponent(const HashedString&) (40 0x23f79e0, 51 0x29e31d0) inlines the same body once per
 * instance of the effects vector: `cmpl $0x25; ja default; movq (mMobEffects,%rax,8); leaq 0x100(%rax); cmoveq default`.
 */
export function mobEffectInstanceComponentName(inst: StaticPointer): VoidPointer {
    const effect = mobEffectById(inst.getUint32(0));
    if (effect !== null) return effect.add(COMPONENT_NAME);
    if (DEFAULT_ERROR_VALUE === null) throw Error("HashedString::defaultErrorValue: no address in this build");
    return DEFAULT_ERROR_VALUE;
}

/** MobEffect::mEffectVisible (showParticles): the byte the constructor ANDs into the instance's visible flag, +0xf0 */
const EFFECT_VISIBLE = engineLayout("MobEffect", "showParticles", 0xf0);
/** MobEffectInstance::factor_calculation_data_: +0x28 on 1.26.40, +0x30 on 1.26.51 (a byte was added at +0x28) */
const FACTOR_DATA = engineLayout("MobEffectInstance", "factorData", 0x20);
const INSTANCE_SIZE = engineLayout("MobEffectInstance", "size", 0x80);

/**
 * MobEffectInstance(id, duration, amplifier, ambient, visible, displayAnimation). 1.26 inlines the constructor; the copy
 * where the engine builds one from JSON (40 0x2414720, 51 0x29fc0a0) writes id +0, duration +4, the three optional
 * difficulty durations' engaged flags (+0xc/+0x14/+0x1c) 0, amplifier +0x20, display +0x24, 0 at +0x25, ambient +0x26,
 * visible AND mMobEffects[id]->showParticles at +0x27, then factor_calculation_data_ with 1.0f at its +8 (40 +0x30,
 * 51 +0x38) and the rest zero, an empty std::function included. bdsx zeroes the whole instance first.
 */
export function mobEffectInstanceConstruct(inst: StaticPointer, id: number, duration: number, amplifier: number, ambient: boolean, visible: boolean, displayAnimation: boolean): void {
    inst.fill(0, INSTANCE_SIZE);
    inst.setUint32(id >>> 0, 0);
    inst.setInt32(duration, 4);
    inst.setInt32(amplifier, 0x20);
    inst.setUint8(displayAnimation ? 1 : 0, 0x24);
    inst.setUint8(ambient ? 1 : 0, 0x26);
    const effect = mobEffectById(id);
    const effectVisible = effect === null ? 1 : (effect as StaticPointer).getUint8(EFFECT_VISIBLE);
    inst.setUint8((visible ? 1 : 0) & effectVisible, 0x27);
    inst.setFloat32(1, FACTOR_DATA + 8);
}
