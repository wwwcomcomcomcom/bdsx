import { abstract } from "../common";
import { VoidPointer } from "../core";
import { AbstractClass, nativeClass, nativeField } from "../nativeclass";
import { float32_t, uint32_t } from "../nativetype";

// public: static class Attribute const
export enum AttributeId {
    /** @deprecated deleted */
    ZombieSpawnReinforcementsChange = -1,
    PlayerHunger = 2,
    PlayerSaturation = 3,
    PlayerExhaustion = 4,
    PlayerLevel = 5,
    PlayerExperience = 6,
    Health = 7,
    FollowRange = 8,
    KnockbackResistance = 9,
    MovementSpeed = 10,
    UnderwaterMovementSpeed = 11,
    LavaMovementSpeed = 12,
    AttackDamage = 13,
    Absorption = 14,
    Luck = 15,
    JumpStrength = 16, // for horse?
}

export class AttributeInstance extends AbstractClass {
    vftable: VoidPointer;
    u1: VoidPointer;
    u2: VoidPointer;
    currentValue: float32_t;
    minValue: float32_t;
    maxValue: float32_t;
    defaultValue: float32_t;
    /** 1.26 only: the "Default Min Value" AttributeData carries */
    defaultMinValue: float32_t;
    /** 1.26 only: the "Default Max Value" AttributeData carries */
    defaultMaxValue: float32_t;
}
export class BaseAttributeMap extends AbstractClass {
    getMutableInstance(type: AttributeId): AttributeInstance | null {
        abstract();
    }
    /**
     * The id this build gives the attribute bdsx calls `type`. The enum above is the 2024
     * numbering, which 1.26.40.8 still uses and 1.26.51.1 does not -- there the five player
     * attributes are one lower and there is no id 6 (docs/findings-layouts.md, "The attribute
     * ids are not the same in the two 1.26 builds"). Every lookup goes through this.
     */
    nativeIdOf(type: AttributeId): number {
        abstract();
    }
}
@nativeClass()
export class AttributeInstanceHandle extends AbstractClass {
    @nativeField(uint32_t)
    attributeId: AttributeId;
    @nativeField(BaseAttributeMap.ref(), 0x08)
    attributeMap: BaseAttributeMap;
}
