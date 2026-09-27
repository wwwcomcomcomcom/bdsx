import { abstract } from "../common";
import { NativeClass, nativeClass, nativeField } from "../nativeclass";
import { bool_t, int32_t, int64_as_float_t } from "../nativetype";
import { Actor } from "./actor";
import { Block, BlockSource } from "./block";
import { Vec3 } from "./blockpos";
import { HashedString } from "./hashedstring";
import { ItemStack } from "./inventory";
import type { ItemDescriptor } from "./inventory";
import { CompoundTag } from "./nbt";
import type { Player } from "./player";

export namespace cereal {
    @nativeClass()
    export class ReflectionCtx extends NativeClass {
        @nativeField(int64_as_float_t)
        u: int64_as_float_t;
    }
}

export class ItemComponent extends NativeClass {
    static getIdentifier(): HashedString {
        abstract();
    }
    buildNetworkTag(u?: cereal.ReflectionCtx): CompoundTag {
        abstract();
    }
    initializeFromNetwork(tag: CompoundTag, u?: cereal.ReflectionCtx): bool_t {
        abstract();
    }
    isCooldown(): this is CooldownItemComponent {
        return this instanceof CooldownItemComponent;
    }
    isDurability(): this is DurabilityItemComponent {
        return this instanceof DurabilityItemComponent;
    }
    isDigger(): this is DiggerItemComponent {
        return this instanceof DiggerItemComponent;
    }
    isDisplayName(): this is DisplayNameItemComponent {
        return this instanceof DisplayNameItemComponent;
    }
    isEntityPlacer(): this is EntityPlacerItemComponent {
        return this instanceof EntityPlacerItemComponent;
    }
    isFood(): this is FoodItemComponent {
        return this instanceof FoodItemComponent;
    }
    isFuel(): this is FuelItemComponent {
        return this instanceof FuelItemComponent;
    }
    isIcon(): this is IconItemComponent {
        return this instanceof IconItemComponent;
    }
    isOnUse(): this is OnUseItemComponent {
        return this instanceof OnUseItemComponent;
    }
    isPlanter(): this is PlanterItemComponent {
        return this instanceof PlanterItemComponent;
    }
    isProjectile(): this is ProjectileItemComponent {
        return this instanceof ProjectileItemComponent;
    }
    isRecord(): this is RecordItemComponent {
        return this instanceof RecordItemComponent;
    }
    isRenderOffsets(): this is RenderOffsetsItemComponent {
        return this instanceof RenderOffsetsItemComponent;
    }
    isRepairable(): this is RepairableItemComponent {
        return this instanceof RepairableItemComponent;
    }
    isShooter(): this is ShooterItemComponent {
        return this instanceof ShooterItemComponent;
    }
    isThrowable(): this is ThrowableItemComponent {
        return this instanceof ThrowableItemComponent;
    }
    isWeapon(): this is WeaponItemComponent {
        return this instanceof WeaponItemComponent;
    }
    isWearable(): this is WearableItemComponent {
        return this instanceof WearableItemComponent;
    }
    isArmor(): this is ArmorItemComponent {
        return this instanceof ArmorItemComponent;
    }
}

export class CooldownItemComponent extends ItemComponent {}

export class ArmorItemComponent extends ItemComponent {}

export class DiggerItemComponent extends ItemComponent {
    mineBlock(itemStack: ItemStack, block: Block, int1: number, int2: number, int3: number, actor: Actor): boolean {
        abstract();
    }
}

export class DurabilityItemComponent extends ItemComponent {
    getDamageChance(int: number): number {
        const damageChangeRange = this.getUint32(0x14);
        let unk = this.getUint32(0x18);
        unk -= damageChangeRange;
        unk = (unk / int + 1) | 0;
        return unk + damageChangeRange;
    }
}

export class DisplayNameItemComponent extends ItemComponent {}

export class EntityPlacerItemComponent extends ItemComponent {
    // TODO: removed method, need to implement
    // positionAndRotateActor(actor: Actor, vec3: Vec3, unsignedInt8: number, _vec3: Vec3, blockLegacy: BlockLegacy): void {
    //     abstract();
    // }
    /**
     * Names the actor after the item's custom name, if the item has one and the actor is nameable (what placing a
     * spawn egg with a name does). 1.26 made it a static function of (Actor&, const ItemStack&): the component is
     * not used, so any EntityPlacerItemComponent serves.
     */
    setActorCustomName(actor: Actor, itemStack: ItemStack): void {
        abstract();
    }
}

export class FoodItemComponent extends ItemComponent {
    canAlwaysEat(): boolean {
        abstract();
    }
    /** a copy of the descriptor of the item this food turns into when eaten (a bowl for stew); the caller destructs it */
    getUsingConvertsToItemDescriptor(): ItemDescriptor {
        abstract();
    }
}

export class FuelItemComponent extends ItemComponent {}

export class IconItemComponent extends ItemComponent {}

export class OnUseItemComponent extends ItemComponent {}

export class PlanterItemComponent extends ItemComponent {}

export class ProjectileItemComponent extends ItemComponent {
    /**
     * The direction a throw by this player goes: the player's view direction (the vehicle's passenger yaw when riding),
     * turned by `angleOffset` degrees about the vertical axis.
     */
    getShootDir(player: Player, angleOffset: number): Vec3 {
        abstract();
    }
    /**
     * Spawns this component's projectile at `pos` and shoots it along `dir` with `power`, owned by `player`.
     * Returns the projectile, or null (no player, or the spawn failed).
     */
    shootProjectile(blockSource: BlockSource, pos: Vec3, dir: Vec3, power: number, player: Player): Actor | null {
        abstract();
    }
}

export class RecordItemComponent extends ItemComponent {
    // removed
    // getAlias(): string {
    //     abstract();
    // }
}

export class RenderOffsetsItemComponent extends ItemComponent {}

/**
 * RepairableItemComponent::handleItemRepair's result (the same 0xa0 bytes on both 1.26 builds: the repaired copy, then
 * how many of the repair material it used). A failed repair gives an empty stack and 0. Destruct it when done.
 */
@nativeClass()
export class RepairItemResult extends NativeClass {
    @nativeField(ItemStack)
    item: ItemStack;
    @nativeField(int32_t)
    materialsUsed: int32_t;
}

export class RepairableItemComponent extends ItemComponent {
    /**
     * Repairs a copy of `item` with `material`, which must be one of this component's repair items; `item` and
     * `material` are not changed. With `allowSameItem`, two stacks of the same item are combined instead.
     */
    handleItemRepair(item: ItemStack, material: ItemStack, allowSameItem?: boolean): RepairItemResult {
        abstract();
    }
}

export class ShooterItemComponent extends ItemComponent {}

export class ThrowableItemComponent extends ItemComponent {
    /**
     * The throw's power: 1, or with scale_power_by_draw_duration min((t*t + 2t) / 3, 1) where
     * t = (maxUseDuration - durationLeft) / maxDrawTicks; then times launch_power_scale, capped at max_launch_power.
     */
    getLaunchPower(durationLeft: number, maxDrawTicks: number, maxUseDuration: number): number {
        abstract();
    }
}

export class WeaponItemComponent extends ItemComponent {}

export class WearableItemComponent extends ItemComponent {}
