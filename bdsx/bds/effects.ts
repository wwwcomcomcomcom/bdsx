// import { abstract } from "../common";
// import { nativeClass, NativeClass, nativeField } from "../nativeclass";
// import { bool_t, int32_t, NativeType, uint32_t, void_t } from "../nativetype";
// import { procHacker } from "./proc";

import { abstract } from "../common";
import { nativeClass, NativeClass, nativeField } from "../nativeclass";
import { bool_t, CxxString, float32_t, int32_t, uint32_t } from "../nativetype";
import { HashedString } from "./hashedstring";
import { CompoundTag } from "./nbt";
import { engineLayout } from "./engine/deps";

export enum MobEffectIds {
    Empty,
    Speed,
    Slowness,
    Haste,
    MiningFatigue,
    Strength,
    InstantHealth,
    InstantDamage,
    JumpBoost,
    Nausea,
    Regeneration,
    Resistance,
    FireResistant,
    WaterBreathing,
    Invisibility,
    Blindness,
    NightVision,
    Hunger,
    Weakness,
    Poison,
    Wither,
    HealthBoost,
    Absorption,
    Saturation,
    Levitation,
    FatalPoison,
    ConduitPower,
    SlowFalling,
    BadOmen,
    HeroOfTheVillage,
    Darkness,
    // 31..37 are named by the resourceName each registered 1.26 MobEffect carries (read on both builds,
    // docs/findings-components.md "MobEffect's fields and getComponentName")
    TrialOmen,
    WindCharged,
    Weaving,
    Oozing,
    Infested,
    RaidOmen,
    BreathOfTheNautilus,
}

// MobEffect's fields are the constructor's stores, the same on both 1.26 builds as in 2024 (1.21.3.01 0x189e390, 40 0x2c753d0,
// 51 0x1c4d480): vftable, mId +8, harmful +0xc, the colour +0x10, two particle HashedStrings +0x20 / +0x50, the description
// id +0x80 (the fourth argument; what the hover text passes to I18n), the icon index +0xa0, the duration modifier +0xa4 (0.5
// when harmful, else 1), a zeroed byte +0xa8 (bdsx's old `disabled`, dropped: nothing in 1.26 was found reading it and no side ever read anything but false), the resource name +0xb0 (the third argument), the icon name +0xd0, the
// show-particles byte +0xf0, and the component name +0x100, the HashedString "minecraft:effect." + resourceName that the
// inlined getComponentName returns. bdsx's offsets before (0x20 / 0x50 / 0x98) were older than 2024.
// docs/findings-components.md "MobEffect's fields and getComponentName".
@nativeClass(null)
export class MobEffect extends NativeClass {
    @nativeField(uint32_t, 0x08)
    id: uint32_t;
    @nativeField(bool_t, 0x0c)
    harmful: bool_t;
    // @nativeField(mce.Color, 0x10)
    // color: mce.Color;
    @nativeField(CxxString, engineLayout("MobEffect", "descriptionId", 0x80))
    descriptionId: CxxString;
    @nativeField(int32_t, engineLayout("MobEffect", "icon", 0xa0))
    icon: int32_t;
    @nativeField(float32_t, engineLayout("MobEffect", "durationModifier", 0xa4))
    durationModifier: float32_t;
    @nativeField(CxxString, engineLayout("MobEffect", "resourceName", 0xb0))
    resourceName: CxxString;
    @nativeField(CxxString, engineLayout("MobEffect", "iconName", 0xd0))
    iconName: CxxString;
    @nativeField(bool_t, engineLayout("MobEffect", "showParticles", 0xf0))
    showParticles: bool_t;
    @nativeField(HashedString, engineLayout("MobEffect", "componentName", 0x100))
    readonly componentName: HashedString;

    /**
     * @deprecated
     */
    static constructWith(id: MobEffectIds): MobEffect {
        abstract();
    }

    /**
     * The engine's registered MobEffect for the id (MobEffect::getById), or null when the id is not one.
     * @remark DO NOT DESTRUCT
     */
    static create(id: MobEffectIds): MobEffect | null {
        abstract();
    }
    getId(): number {
        abstract();
    }
}

// 1.26 grew MobEffectInstance from 0x80 to 0x88 and moved everything after `duration`: the three
// difficulty durations are gone and two pointers sit at 0x10 and 0x18, so `amplifier` and the four
// flags are at 0x20 / 0x24 (docs/findings-layouts.md, "MobEffectInstance"). Read off a live instance
// with tools/actor-layout-probe.ts `effprobe`, which dumps the first 0x28 bytes.
// The size differs between the 1.26 builds: 0x88 on 1.26.40.8 and 0x90 on 1.26.51.1 (Endstone HEAD's unknown_40_), read
// off each build's own vector<MobEffectInstance> push in AreaEffectCloud (`addq $0x88` / `$0x90` to the end pointer).
// It matters wherever bdsx allocates one -- MobEffectInstance.load(tag) has the engine construct into it
// (docs/findings-nbt.md "MobEffectInstance"). The fallback is 2024's 0x80.
@nativeClass(engineLayout("MobEffectInstance", "size", 0x80))
export class MobEffectInstance extends NativeClass {
    @nativeField(uint32_t)
    id: uint32_t;
    @nativeField(int32_t)
    duration: int32_t;
    @nativeField(int32_t, 0x20)
    amplifier: int32_t;
    // 1.26 swapped ambient and the counter flag: the constructor the engine inlines where it builds an instance from JSON
    // (40 0x2414720, 51 0x29fc0a0, the keys "display_on_screen_animation", "ambient", "visible") stores the display flag at
    // +0x24, 0 at +0x25 (is_counter_paused_this_tick_), ambient at +0x26 and visible at +0x27 -- Endstone
    // mob_effect_instance.h's order; 2024's constructor (0x189e7d0) had display, ambient, counter, visible
    // (docs/findings-components.md "MobEffectInstance's constructor on 1.26")
    @nativeField(bool_t, 0x24)
    displayAnimation: bool_t;
    @nativeField(bool_t, 0x25)
    noCounter: bool_t;
    @nativeField(bool_t, 0x26)
    ambient: bool_t;
    @nativeField(bool_t, 0x27)
    showParticles: bool_t;

    /**
     * @param duration How many ticks will the effect last (one tick = 0.05s)
     */
    static create(
        id: MobEffectIds,
        duration: number = 600,
        amplifier: number = 0,
        ambient: boolean = false,
        showParticles: boolean = true,
        displayAnimation: boolean = false,
    ): MobEffectInstance {
        const effect = new MobEffectInstance(true);
        effect._create(id, duration, amplifier, ambient, showParticles, displayAnimation);
        return effect;
    }

    protected _create(id: MobEffectIds, duration: number, amplifier: number, ambient: boolean, showParticles: boolean, displayAnimation: boolean): void {
        abstract();
    }

    getSplashDuration(): number {
        return this.duration * 0.75;
    }
    getLingerDuration(): number {
        return this.duration * 0.25;
    }
    getAmplifier(): number {
        abstract();
    }
    protected _getComponentName(): HashedString {
        abstract();
    }
    getComponentName(): string {
        return this._getComponentName().str;
    }
    save(): Record<string, any> {
        const tag = this.allocateAndSave();
        const out = tag.value();
        tag.dispose();
        return out;
    }
    allocateAndSave(): CompoundTag {
        abstract();
    }
    load(tag: CompoundTag): void {
        abstract();
    }
    static load(tag: CompoundTag): void {
        abstract();
    }
}
