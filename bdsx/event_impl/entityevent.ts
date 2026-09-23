import { Actor, ActorDamageCause, ActorDamageSource, type ActorInitializationMethod, DimensionId, Mob } from "../bds/actor";
import { GameMode } from "../bds/gamemode";
import { pdbcache } from "../pdbcache";
import { BlockPos, Vec3 } from "../bds/blockpos";
import { HitResult, ProjectileComponent, SplashPotionEffectSubcomponent } from "../bds/components";
import { ComplexInventoryTransaction, ContainerId, HandSlot, InventorySource, InventorySourceType, ItemStack, ItemStackBase } from "../bds/inventory";
import { BedSleepingResult } from "../bds/level";
import { NetworkIdentifier, ServerNetworkHandler } from "../bds/networkidentifier";
import { proc } from "../bds/symbols";
import { MinecraftPacketIds } from "../bds/packetids";
import { CompletedUsingItemPacket, PlayerAuthInputPacket, SetLocalPlayerAsInitializedPacket } from "../bds/packets";
import { Player, ServerPlayer, SimulatedPlayer } from "../bds/player";
import { CANCEL } from "../common";
import { engineLayout } from "../bds/engine/deps";
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../core";
import { decay } from "../decay";
import { events } from "../event";
import { bedrockServer } from "../launcher";
import { makefunc } from "../makefunc";
import { bool_t, float32_t, int32_t, uint8_t, void_t } from "../nativetype";
import { Wrapper } from "../pointer";
import { procHacker } from "../prochacker";

export class EntityHurtEvent {
    constructor(
        public entity: Mob,
        public damage: number,
        public damageSource: ActorDamageSource,
        public knock: boolean,
        public ignite: boolean,
        /**
         * 1.26 and later: the caller's HurtEffectsSettings (24 bytes, read-only), of which knock and
         * ignite above are the first two bytes. Endstone's hurt_effects_settings.h names the rest:
         * receive_damage at +2, an optional<Vec3> aim direction at +4 (engaged flag at +16) and an
         * extra knockback power at +20. null on builds with the 2024 signature.
         */
        public parameters: StaticPointer | null = null,
    ) {}
}

export class EntityHealthChangeEvent {
    constructor(public entity: Actor, readonly oldHealth: number, public newHealth: number) {}
}

/** @deprecated use EntityHealthChangeEvent class instead, to match the official class name*/
export const EntityHeathChangeEvent = EntityHealthChangeEvent;
/** @deprecated use EntityHealthChangeEvent class instead, to match the official class name*/
export type EntityHeathChangeEvent = EntityHealthChangeEvent;

export class EntityDieEvent {
    constructor(public entity: Mob, public damageSource: ActorDamageSource) {}
}
export class EntityStartSwimmingEvent {
    constructor(public entity: Actor) {}
}
export class EntityStartRidingEvent {
    /** @param force 1.26's third argument: skip the vehicle's canAddPassenger check (docs/findings-riding.md) */
    constructor(public entity: Actor, public ride: Actor, public force: boolean = false) {}
}
export class EntityStopRidingEvent {
    /** @param isBeingTeleported 1.26's fourth argument (docs/findings-riding.md) */
    constructor(
        public entity: Actor,
        public exitFromRider: boolean,
        public actorIsBeingDestroyed: boolean,
        public switchingRides: boolean,
        public isBeingTeleported: boolean = false,
    ) {}
}
export class EntitySneakEvent {
    constructor(public entity: Actor, public isSneaking: boolean) {}
}

export class EntityCreatedEvent {
    constructor(public entity: Actor, public method: ActorInitializationMethod) {}
}

export class PlayerAttackEvent {
    constructor(public player: Player, public victim: Actor) {}
}

export class PlayerInteractEvent {
    constructor(public player: Player, public victim: Actor, public interactPos: Vec3) {}
}

export class PlayerDropItemEvent {
    constructor(public player: Player, public itemStack: ItemStack, public inContainer: boolean, public hotbarSlot?: number) {}
}

export class PlayerInventoryChangeEvent {
    constructor(public player: Player, readonly oldItemStack: ItemStack, readonly newItemStack: ItemStack, readonly slot: number) {}
}

export class PlayerRespawnEvent {
    constructor(public player: Player) {}
}

export class PlayerLevelUpEvent {
    constructor(
        public player: Player,
        /** Amount of levels upgraded */
        public levels: number,
    ) {}
}

export class PlayerJoinEvent {
    constructor(readonly player: ServerPlayer, readonly isSimulated: boolean) {}
}

export class PlayerLeftEvent {
    constructor(public player: ServerPlayer, public skipMessage: boolean) {}
}

export class PlayerPickupItemEvent {
    constructor(
        public player: Player,
        /**
         * itemActor is not ItemActor always.
         * it can be the arrow or trident.
         */
        public itemActor: Actor,
    ) {}
}
export class PlayerCritEvent {
    constructor(public player: Player, public victim: Actor) {}
}

export class PlayerUseItemEvent {
    constructor(public player: Player, public useMethod: CompletedUsingItemPacket.Actions, public consumeItem: boolean, public itemStack: ItemStack) {}
}

export class ItemUseEvent {
    constructor(public itemStack: ItemStack, public player: Player) {}
}

export class ItemUseOnBlockEvent {
    constructor(
        public itemStack: ItemStack,
        public actor: Actor,
        public x: number,
        public y: number,
        public z: number,
        public face: number,
        public clickX: number,
        public clickY: number,
        public clickZ: number,
    ) {}
}

export class PlayerJumpEvent {
    constructor(public player: Player) {}
}

export class SplashPotionHitEvent {
    constructor(public entity: Actor, public potionEffect: number) {}
}

export class ProjectileShootEvent {
    constructor(public projectile: Actor, public shooter: Actor) {}
}

export class PlayerSleepInBedEvent {
    constructor(public player: Player, public pos: BlockPos) {}
}

export class EntityConsumeTotemEvent {
    constructor(public entity: Actor, public totem: ItemStack) {}
}

export class PlayerDimensionChangeEvent {
    constructor(
        public player: ServerPlayer,
        public dimension: DimensionId,
        /** @deprecated deleted parameter */
        public useNetherPortal: boolean,
    ) {}
}

export class ProjectileHitEvent {
    constructor(public projectile: Actor, public victim: Actor | null, public result: HitResult) {}
}

export class EntityCarriedItemChangedEvent {
    constructor(public entity: Actor, public oldItemStack: ItemStackBase, public newItemStack: ItemStackBase, public handSlot: HandSlot) {}
}

export class EntityKnockbackEvent {
    constructor(
        public target: Mob,
        public source: Actor | null,
        public damage: number,
        public xd: number,
        public zd: number,
        public power: number,
        public height: number,
        public heightCap: number,
        /**
         * 1.26 and later: the caller's KnockbackParameters (28 bytes, read-only), from which
         * power, height and heightCap above were taken. null on builds with the 2024 signature.
         */
        public parameters: StaticPointer | null = null,
    ) {}
}
const KNOCKBACK_PARAMETERS_SIZE = 28;
const HURT_PARAMETERS_SIZE = 24;

events.playerJump.setInstaller(() => {
    function onMobJump(player: Player): void {
        const event = new PlayerJumpEvent(player);
        events.playerJump.fire(event);
        return _onMobJump(player);
    }
    const _onMobJump = procHacker.hooking("?handleJumpEffects@Player@@QEAAXXZ", void_t, null, Player)(onMobJump);
});

events.playerUseItem.setInstaller(() => {
    function onPlayerUseItem(player: Player, itemStack: ItemStack, useMethod: number, consumeItem: boolean): void {
        const event = new PlayerUseItemEvent(player, useMethod, consumeItem, itemStack);
        events.playerUseItem.fire(event);
        decay(itemStack);
        return _onPlayerUseItem(event.player, event.itemStack, event.useMethod, event.consumeItem);
    }
    const _onPlayerUseItem = procHacker.hooking(
        "?useItem@Player@@UEAAXAEAVItemStackBase@@W4ItemUseMethod@@_N@Z",
        void_t,
        null,
        Player,
        ItemStack,
        int32_t,
        bool_t,
    )(onPlayerUseItem);
});

events.itemUse.setInstaller(() => {
    // 1.26 inlines ItemStack::use into its only caller, GameMode::useItem (the cooldown check, then the item's use
    // virtual), so the event is raised there: the same item and player before the use, a cancel returning false
    // (docs/findings-slots.md "itemUse")
    if (!("?use@ItemStack@@QEAAAEAV1@AEAVPlayer@@@Z" in proc) && "?useItem@GameMode@@UEAA_NAEAVItemStack@@@Z" in proc) {
        const _onUseItem = procHacker.hooking("?useItem@GameMode@@UEAA_NAEAVItemStack@@@Z", bool_t, null, GameMode, ItemStack)(
            (gameMode: GameMode, itemStack: ItemStack): boolean => {
                const event = new ItemUseEvent(itemStack, gameMode.actor);
                if (events.itemUse.fire(event) === CANCEL) return false;
                return _onUseItem(gameMode, event.itemStack);
            },
        );
        return;
    }
    function onItemUse(itemStack: ItemStack, player: Player): ItemStack {
        const event = new ItemUseEvent(itemStack, player);
        const canceled = events.itemUse.fire(event) === CANCEL;
        decay(itemStack);
        if (canceled) {
            return itemStack;
        }
        return _onItemUse(event.itemStack, event.player);
    }
    const _onItemUse = procHacker.hooking("?use@ItemStack@@QEAAAEAV1@AEAVPlayer@@@Z", ItemStack, null, ItemStack, Player)(onItemUse);
});

events.itemUseOnBlock.setInstaller(() => {
    // 1.26: ItemStack::useOn no longer covers the whole interaction -- when it reports failure, GameMode::useItemOn goes
    // on and places the block itself -- so the event is raised from useItemOn, and a cancel returns a failed result
    // before anything happens. 1.26's useItemOn takes one more bool than 2024's: after the Block* on 1.26.40.8, before
    // it on 1.26.51.1 (layouts.GameMode.useItemOnBoolFirst), hence bdsx:GameMode::useItemOn
    // (docs/findings-slots.md "itemUseOnBlock")
    if ("bdsx:GameMode::useItemOn" in proc) {
        const boolFirst = pdbcache.layouts.GameMode?.useItemOnBoolFirst === 1;
        const fire = (gameMode: GameMode, result: StaticPointer, itemStack: ItemStack, pos: BlockPos, face: number, click: Vec3): ItemUseOnBlockEvent | null => {
            const event = new ItemUseOnBlockEvent(itemStack, gameMode.actor, pos.x, pos.y, pos.z, face, click.x, click.y, click.z);
            if (events.itemUseOnBlock.fire(event) === CANCEL) {
                result.setInt32(0);
                return null;
            }
            pos.x = event.x;
            pos.y = event.y;
            pos.z = event.z;
            click.x = event.clickX;
            click.y = event.clickY;
            click.z = event.clickZ;
            return event;
        };
        if (boolFirst) {
            const _useItemOn = procHacker.hooking("bdsx:GameMode::useItemOn", StaticPointer, null, GameMode, StaticPointer, ItemStack, BlockPos, uint8_t, Vec3, uint8_t, StaticPointer)(
                (gameMode, result, itemStack, pos, face, click, b, block) => {
                    const event = fire(gameMode, result, itemStack, pos, face, click);
                    return event === null ? result : _useItemOn(gameMode, result, event.itemStack, pos, event.face, click, b, block);
                },
            );
        } else {
            const _useItemOn = procHacker.hooking("bdsx:GameMode::useItemOn", StaticPointer, null, GameMode, StaticPointer, ItemStack, BlockPos, uint8_t, Vec3, StaticPointer, uint8_t)(
                (gameMode, result, itemStack, pos, face, click, block, b) => {
                    const event = fire(gameMode, result, itemStack, pos, face, click);
                    return event === null ? result : _useItemOn(gameMode, result, event.itemStack, pos, event.face, click, block, b);
                },
            );
        }
        return;
    }
    function onItemUseOnBlock(
        itemStack: ItemStack,
        interactionResult: StaticPointer,
        actor: Actor,
        x: int32_t,
        y: int32_t,
        z: int32_t,
        face: uint8_t,
        clickPos: Vec3,
    ): StaticPointer {
        const event = new ItemUseOnBlockEvent(itemStack, actor, x, y, z, face, clickPos.x, clickPos.y, clickPos.z);
        const canceled = events.itemUseOnBlock.fire(event) === CANCEL;
        decay(itemStack);
        if (canceled) {
            interactionResult.setInt32(0);
            return interactionResult;
        }
        clickPos.x = event.clickX;
        clickPos.y = event.clickY;
        clickPos.z = event.clickZ;
        return _onItemUseOnBlock(event.itemStack, interactionResult, event.actor, event.x, event.y, event.z, event.face, clickPos);
    }
    const _onItemUseOnBlock = procHacker.hooking(
        "?useOn@ItemStack@@QEAA?AVInteractionResult@@AEAVActor@@HHHEAEBVVec3@@@Z",
        StaticPointer,
        null,
        ItemStack,
        StaticPointer,
        Actor,
        int32_t,
        int32_t,
        int32_t,
        uint8_t,
        Vec3,
    )(onItemUseOnBlock);
});

// 1.26's Player::_crit takes one more int, which it writes as a float into the AnimatePacket it sends; the hook passes
// it through under the bdsx:Player::_crit key (docs/findings-slots.md "SimulatedPlayer actions")
events.playerCrit.setInstaller(() => {
    if ("bdsx:Player::_crit" in proc) {
        const _onPlayerCrit = procHacker.hooking("bdsx:Player::_crit", void_t, null, Player, Actor, int32_t)((player: Player, victim: Actor, data: number): void => {
            events.playerCrit.fire(new PlayerCritEvent(player, victim));
            return _onPlayerCrit(player, victim, data);
        });
        return;
    }
    function onPlayerCrit(player: Player, victim: Actor): void {
        const event = new PlayerCritEvent(player, victim);
        events.playerCrit.fire(event);
        return _onPlayerCrit(player, victim);
    }
    const _onPlayerCrit = procHacker.hooking("?_crit@Player@@UEAAXAEAVActor@@@Z", void_t, null, Player, Actor)(onPlayerCrit);
});

events.entityHurt.setInstaller(() => {
    function onEntityHurt(entity: Mob, actorDamageSource: ActorDamageSource, damage: number, knock: boolean, ignite: boolean): boolean {
        const event = new EntityHurtEvent(entity, damage, actorDamageSource, knock, ignite);
        const canceled = events.entityHurt.fire(event) === CANCEL;
        decay(actorDamageSource);
        if (canceled) {
            return false;
        }
        return _onEntityHurt(event.entity, event.damageSource, event.damage, event.knock, event.ignite);
    }
    // 1.26: _hurt(ActorDamageSource const&, float, P const&) returning an ActorHurtResult through a
    // hidden pointer. Neither change is in any header: the prototype was read from the body and
    // confirmed by execution (docs/findings-slots.md, "Changed signatures"); hooked with the 2024
    // prototype the first hit kills the server. P is 24 bytes, knock at +0 and ignite at +1; a
    // listener that changes either gets a copy, the rest of it passes through untouched. The table
    // ships the function under bdsx's own key, since P has no name we can know.
    // A cancelled hurt is written as "not hurt, no knockback": value 0, variant index 0, flag 0.
    if ("bdsx:Mob::_hurt" in proc) {
        const original = procHacker.hooking("bdsx:Mob::_hurt", StaticPointer, null, Mob, StaticPointer, ActorDamageSource, float32_t, StaticPointer)(
            (entity, result, actorDamageSource, damage, params) => {
                const knock = params.getBoolean(0),
                    ignite = params.getBoolean(1);
                const event = new EntityHurtEvent(entity, damage, actorDamageSource, knock, ignite, params);
                let canceled = false;
                // the caller reads the struct this returns a pointer to: a listener that throws must not
                // leave the hook without one, so the error is reported and the hurt goes ahead unchanged
                try {
                    canceled = events.entityHurt.fire(event) === CANCEL;
                } catch (err) {
                    events.errorFire(err);
                    return original(entity, result, actorDamageSource, damage, params);
                }
                if (canceled) {
                    decay(actorDamageSource);
                    result.fill(0, 12);
                    return result;
                }
                let out = params;
                if (event.knock !== knock || event.ignite !== ignite) {
                    const copy = new AllocatedPointer(HURT_PARAMETERS_SIZE);
                    copy.copyFrom(params, HURT_PARAMETERS_SIZE);
                    copy.setBoolean(event.knock, 0);
                    copy.setBoolean(event.ignite, 1);
                    out = copy;
                }
                const res = original(event.entity as Mob, result, event.damageSource, event.damage, out);
                decay(actorDamageSource);
                return res;
            },
        );
        return;
    }
    const _onEntityHurt = procHacker.hooking(
        "?_hurt@Mob@@MEAA_NAEBVActorDamageSource@@M_N1@Z",
        bool_t,
        null,
        Mob,
        ActorDamageSource,
        float32_t,
        bool_t,
        bool_t,
    )(onEntityHurt);
});

// 1.26: std::optional<float> change(float old, float new, AttributeBuff const&), returned through a hidden
// pointer (Endstone attribute_instance_delegate.h); the owning mob moved to +0x18. The table ships it under bdsx's
// key, read off the live delegate's vftable (docs/findings-slots.md, "HealthAttributeDelegate").
const HealthAttributeDelegate$mob = engineLayout("HealthAttributeDelegate", "mob", 0x20);
events.entityHealthChange.setInstaller(() => {
    function onEntityHealthChange(attributeDelegate: NativePointer, result: StaticPointer, oldHealth: number, newHealth: number, attributeBuffInfo: VoidPointer): StaticPointer {
        const actor = Actor[makefunc.getFromParam](attributeDelegate, HealthAttributeDelegate$mob);
        const event = new EntityHealthChangeEvent(actor, oldHealth, newHealth);
        events.entityHealthChange.fire(event);
        attributeDelegate.setPointer(event.entity, HealthAttributeDelegate$mob);
        return _onEntityHealthChange(attributeDelegate, result, event.oldHealth, event.newHealth, attributeBuffInfo);
    }
    const _onEntityHealthChange = procHacker.hooking(
        "bdsx:HealthAttributeDelegate::change",
        StaticPointer,
        null,
        NativePointer,
        StaticPointer,
        float32_t,
        float32_t,
        VoidPointer,
    )(onEntityHealthChange);
});

events.entityDie.setInstaller(() => {
    function onEntityDie(entity: Mob, damageSource: ActorDamageSource): boolean {
        const event = new EntityDieEvent(entity, damageSource);
        events.entityDie.fire(event);
        decay(damageSource);
        return _onEntityDie(event.entity, event.damageSource);
    }
    const _onEntityDie = procHacker.hooking("?die@Mob@@UEAAXAEBVActorDamageSource@@@Z", bool_t, null, Mob, ActorDamageSource)(onEntityDie);
});

events.entityStartSwimming.setInstaller(() => {
    function onEntityStartSwimming(entity: Actor): void {
        const event = new EntityStartSwimmingEvent(entity);
        const canceled = events.entityStartSwimming.fire(event) === CANCEL;
        if (!canceled) {
            return _onEntityStartSwimming(event.entity);
        }
    }
    function onPlayerStartSwimming(entity: Player): void {
        const event = new EntityStartSwimmingEvent(entity);
        const canceled = events.entityStartSwimming.fire(event) === CANCEL;
        if (!canceled) {
            return _onPlayerStartSwimming(event.entity as Player);
        }
    }
    const _onEntityStartSwimming = procHacker.hooking("?startSwimming@Actor@@UEAAXXZ", void_t, null, Actor)(onEntityStartSwimming);
    const _onPlayerStartSwimming = procHacker.hooking("?startSwimming@Player@@UEAAXXZ", void_t, null, Player)(onPlayerStartSwimming);
});

// 1.26 added a third argument to Actor::startRiding and a fourth to Actor::stopRiding, so both hooks
// take and pass on what the caller really put in the registers (docs/findings-riding.md). Hooking the
// 2024 prototypes would call the originals with a register the caller's value never reached.
events.entityStartRiding.setInstaller(() => {
    function onEntityStartRiding(entity: Actor, ride: Actor, force: boolean): boolean {
        const event = new EntityStartRidingEvent(entity, ride, force);
        const canceled = events.entityStartRiding.fire(event) === CANCEL;
        if (canceled) {
            return false;
        }
        return _onEntityStartRiding(event.entity, event.ride, event.force);
    }
    const _onEntityStartRiding = procHacker.hooking("?startRiding@Actor@@UEAA_NAEAV1@_N@Z", bool_t, null, Actor, Actor, bool_t)(onEntityStartRiding);
});

events.entityStopRiding.setInstaller(() => {
    function onEntityStopRiding(
        entity: Actor,
        exitFromRider: boolean,
        actorIsBeingDestroyed: boolean,
        switchingRides: boolean,
        isBeingTeleported: boolean,
    ): void {
        const event = new EntityStopRidingEvent(entity, exitFromRider, actorIsBeingDestroyed, switchingRides, isBeingTeleported);
        const canceled = events.entityStopRiding.fire(event) === CANCEL;
        if (canceled) {
            return;
        }
        return _onEntityStopRiding(event.entity, event.exitFromRider, event.actorIsBeingDestroyed, event.switchingRides, event.isBeingTeleported);
    }
    const _onEntityStopRiding = procHacker.hooking("?stopRiding@Actor@@QEAAX_N000@Z", void_t, null, Actor, bool_t, bool_t, bool_t, bool_t)(onEntityStopRiding);
});

events.entitySneak.setInstaller(() => {
    events.packetBefore(MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
        const player = ni.getActor()!;
        if (pkt.getInput(PlayerAuthInputPacket.InputData.StartSneaking)) {
            events.entitySneak.fire(new EntitySneakEvent(player, true));
        } else if (pkt.getInput(PlayerAuthInputPacket.InputData.StopSneaking)) {
            events.entitySneak.fire(new EntitySneakEvent(player, false));
        }
    });
});

// 1.26: the method is passed by reference (the body reads it through r8), and the function is reached through a
// vftable; the table ships it under bdsx's key, found through its own lambda (docs/findings-slots.md
// "sendActorCreated"). Fires once for every actor entering the world: Loaded (1) with the world, Spawned (2), ...
events.entityCreated.setInstaller(() => {
    function onEntityCreated(actorEventCoordinator: VoidPointer, entity: Actor, method: StaticPointer): void {
        const event = new EntityCreatedEvent(entity, method.getUint8(0));
        _onEntityCreated(actorEventCoordinator, event.entity, method);
        events.entityCreated.fire(event);
    }
    const _onEntityCreated = procHacker.hooking("bdsx:ActorEventCoordinator::sendActorCreated", void_t, null, VoidPointer, Actor, StaticPointer)(onEntityCreated);
});

events.playerAttack.setInstaller(() => {
    // 1.26: Actor::attack(Actor&, ActorDamageCause const&) became a pure virtual on Actor returning
    // ActorHurtResult through a hidden pointer (docs/findings-audit.md "attack"; the same shift already
    // recorded above for Actor::hurt / Mob::_hurt -- a struct return inserts the hidden pointer right
    // after `this`, so every later argument moves up one register). The decorated 2024 name still
    // names a real vftable slot 52 target on Player, but it is a 34-byte ABI shim -- forwards
    // this/result/victim/cause untouched, adds one more (unnamed) argument on the stack, and falls
    // into the real ~3.4KB combat body -- not combat logic itself; two routes had agreed on the
    // *slot*, not the *prototype* (docs/HANDOFF.md rule 3, `data/candidates-instances-<v>.json`
    // `retracted`). Hooking the shim is enough: original() replays its own untouched bytes, so the
    // extra argument never has to be known. ActorHurtResult is variant<bool, float> (payload at +0,
    // tag at +4) then a bool at +8, the same layout Mob::_hurt returns; "not hurt" is all-zero.
    if ("bdsx:Actor::attack" in proc) {
        function onPlayerAttack(player: Player, result: StaticPointer, victim: Actor, cause: Wrapper<ActorDamageCause>): StaticPointer {
            const event = new PlayerAttackEvent(player, victim);
            const canceled = events.playerAttack.fire(event) === CANCEL;
            if (canceled) {
                result.fill(0, 12);
                return result;
            }
            return _onPlayerAttack(event.player, result, event.victim, cause);
        }
        const _onPlayerAttack = procHacker.hooking("bdsx:Actor::attack", StaticPointer, null, Player, StaticPointer, Actor, Wrapper.make(int32_t))(
            onPlayerAttack,
        );
        return;
    }
    function onPlayerAttackOld(player: Player, victim: Actor, cause: Wrapper<ActorDamageCause>): boolean {
        const event = new PlayerAttackEvent(player, victim);
        const canceled = events.playerAttack.fire(event) === CANCEL;
        if (canceled) {
            return false;
        }
        return _onPlayerAttackOld(event.player, event.victim, cause);
    }
    const _onPlayerAttackOld = procHacker.hooking(
        "?attack@Player@@UEAA_NAEAVActor@@AEBW4ActorDamageCause@@@Z",
        bool_t,
        null,
        Player,
        Actor,
        Wrapper.make(int32_t),
    )(onPlayerAttackOld);
});

events.playerInteract.setInstaller(() => {
    function onPlayerInteract(player: Player, victim: Actor, interactPos: Vec3): boolean {
        const event = new PlayerInteractEvent(player, victim, interactPos);
        const canceled = events.playerInteract.fire(event) === CANCEL;
        if (canceled) {
            return false;
        }
        return _onPlayerInteract(event.player, event.victim, event.interactPos);
    }
    const _onPlayerInteract = procHacker.hooking("?interact@Player@@QEAA_NAEAVActor@@AEBVVec3@@@Z", bool_t, null, Player, Actor, Vec3)(onPlayerInteract);
});

const hasOpenContainer = Symbol("hasOpenContainer");

events.playerDropItem.setInstaller(() => {
    events.packetBefore(MinecraftPacketIds.InventoryTransaction).on((pk, ni) => {
        const transaction = pk.transaction;
        if (transaction === null) return; // nullable
        if (transaction.type === ComplexInventoryTransaction.Type.NormalTransaction) {
            const src = InventorySource.create(ContainerId.Inventory, InventorySourceType.ContainerInventory);
            const actions = transaction.data.getActions(src);
            if (actions.length === 1) {
                const player = ni.getActor()!;
                const slot = actions[0].slot;
                const itemStack = player.getInventory().getItem(slot, ContainerId.Inventory);
                const event = new PlayerDropItemEvent(player, itemStack, false, slot);
                const canceled = events.playerDropItem.fire(event) === CANCEL;
                decay(itemStack);
                if (canceled) {
                    player.sendInventory();
                    return CANCEL;
                }
            }
        }
    });
    events.packetSend(MinecraftPacketIds.ContainerOpen).on((pk, ni) => {
        const player = ni.getActor()!;
        (player as any)[hasOpenContainer] = true;
    });
    events.packetSend(MinecraftPacketIds.ContainerClose).on((pk, ni) => {
        const player = ni.getActor()!;
        (player as any)[hasOpenContainer] = false;
    });
    function onPlayerDropItem(player: Player, itemStack: ItemStack, randomly: boolean): boolean {
        if ((player as any)[hasOpenContainer]) {
            const event = new PlayerDropItemEvent(player, itemStack, true);
            const canceled = events.playerDropItem.fire(event) === CANCEL;
            decay(itemStack);
            if (canceled) {
                return false;
            }
            return _onPlayerDropItem(event.player, event.itemStack, randomly);
        }
        return _onPlayerDropItem(player, itemStack, randomly);
    }
    const _onPlayerDropItem = procHacker.hooking("?drop@Player@@UEAA_NAEBVItemStack@@_N@Z", bool_t, null, Player, ItemStack, bool_t)(onPlayerDropItem);
});

events.playerInventoryChange.setInstaller(() => {
    function onPlayerInventoryChange(
        player: Player,
        container: VoidPointer,
        slot: number,
        oldItemStack: ItemStack,
        newItemStack: ItemStack,
        unknown: boolean,
    ): void {
        const event = new PlayerInventoryChangeEvent(player, oldItemStack, newItemStack, slot);
        events.playerInventoryChange.fire(event);
        decay(oldItemStack);
        decay(newItemStack);
        return _onPlayerInventoryChange(event.player, container, event.slot, event.oldItemStack, event.newItemStack, unknown);
    }
    const _onPlayerInventoryChange = procHacker.hooking(
        "?inventoryChanged@Player@@QEAAXAEAVContainer@@HAEBVItemStack@@1_N@Z",
        void_t,
        null,
        Player,
        VoidPointer,
        int32_t,
        ItemStack,
        ItemStack,
        bool_t,
    )(onPlayerInventoryChange);
});

events.playerRespawn.setInstaller(() => {
    function onPlayerRespawn(player: Player): void {
        const event = new PlayerRespawnEvent(player);
        events.playerRespawn.fire(event);
        return _onPlayerRespawn(event.player);
    }
    const _onPlayerRespawn = procHacker.hooking("?respawn@Player@@UEAAXXZ", void_t, null, Player)(onPlayerRespawn);
});

events.playerLevelUp.setInstaller(() => {
    function onPlayerLevelUp(player: Player, levels: int32_t): void {
        const event = new PlayerLevelUpEvent(player, levels);
        const canceled = events.playerLevelUp.fire(event) === CANCEL;
        if (canceled) {
            return;
        }
        return _onPlayerLevelUp(event.player, event.levels);
    }
    const _onPlayerLevelUp = procHacker.hooking("?addLevels@Player@@UEAAXH@Z", void_t, null, Player, int32_t)(onPlayerLevelUp);
});

events.packetBefore(MinecraftPacketIds.SetLocalPlayerAsInitialized).on((pk, ni) => {
    const actor = ni.getActor();
    if (actor === null) return CANCEL; // possibilities by the hacked client
});

events.playerJoin.setInstaller(() => {
    const LEAF = "?setLocalPlayerAsInitialized@ServerPlayer@@QEAAXXZ";
    const HANDLER = "?handle@ServerNetworkHandler@@UEAAXAEBVNetworkIdentifier@@AEBVSetLocalPlayerAsInitializedPacket@@@Z";
    if (!(LEAF in proc) && HANDLER in proc) {
        // The 1.26 builds inline setLocalPlayerAsInitialized (a byte store) into
        // the packet handler, so the handler is the seam -- the one Endstone
        // hooks for its join event. `this` is the NetEventCallback subobject;
        // the player comes from the handler's own lookup, which bdsx already
        // binds as ServerNetworkHandler::_getServerPlayer.
        const handle = procHacker.hooking(HANDLER, void_t, null, VoidPointer, NetworkIdentifier, SetLocalPlayerAsInitializedPacket)((callback, ni, packet) => {
            try {
                const player = bedrockServer.serverNetworkHandler._getServerPlayer(ni, packet.senderSubId);
                if (player !== null) {
                    const event = new PlayerJoinEvent(player, player instanceof SimulatedPlayer);
                    events.playerJoin.fire(event);
                }
            } catch (err) {
                events.errorFire(err);
            }
            return handle(callback, ni, packet);
        });
        return;
    }
    const setLocalPlayerAsInitialized = procHacker.hooking(LEAF, void_t, null, ServerPlayer)(player => {
        const event = new PlayerJoinEvent(player, player instanceof SimulatedPlayer);
        events.playerJoin.fire(event);
        return setLocalPlayerAsInitialized(player);
    });
});

events.playerPickupItem.setInstaller(() => {
    function onPlayerPickupItem(player: Player, itemActor: Actor, orgCount: number, favoredSlot: number): boolean {
        const event = new PlayerPickupItemEvent(player, itemActor);
        const canceled = events.playerPickupItem.fire(event) === CANCEL;
        if (canceled) {
            return false;
        }
        return _onPlayerPickupItem(event.player, event.itemActor, orgCount, favoredSlot);
    }
    const _onPlayerPickupItem = procHacker.hooking("?take@Player@@QEAA_NAEAVActor@@HH@Z", bool_t, null, Player, Actor, int32_t, int32_t)(onPlayerPickupItem);
});

events.playerLeft.setInstaller(() => {
    function onPlayerLeft(networkSystem: ServerNetworkHandler, player: ServerPlayer, skipMessage: boolean): void {
        const event = new PlayerLeftEvent(player, skipMessage);
        events.playerLeft.fire(event);
        return _onPlayerLeft(networkSystem, event.player, event.skipMessage);
    }
    const _onPlayerLeft = procHacker.hooking(
        "?_onPlayerLeft@ServerNetworkHandler@@AEAAXPEAVServerPlayer@@_N@Z",
        void_t,
        null,
        ServerNetworkHandler,
        ServerPlayer,
        bool_t,
    )(onPlayerLeft);
});

const _onSimulatedDisconnect = procHacker.hooking(
    "?simulateDisconnect@SimulatedPlayer@@QEAAXXZ",
    void_t,
    null,
    SimulatedPlayer,
)(simulatedPlayer => {
    const event = new PlayerLeftEvent(simulatedPlayer, false /** disconnecting SimulatedPlayer doesn't send any message.*/);
    events.playerLeft.fire(event);
    _onSimulatedDisconnect(simulatedPlayer);
});

// 1.26: SplashPotionEffectSubcomponent is gone; ThrownPotionEffectSubcomponent::doOnHitEffect does its work and first
// reads the thrown potion's id from synched data item 36 into the subcomponent (+8), as 2024's version did before
// handing over to the splash one (docs/findings-slots.md "splashPotionHit"). The hook reads the same item at entry,
// and a listener's change is written back to it before the original reads it.
const THROWN_POTION = 0x400056; // ActorType, the constant the body compares with
const THROWN_POTION_ID_DATA = 36;
events.splashPotionHit.setInstaller(() => {
    function onSplashPotionHit(subcomponent: SplashPotionEffectSubcomponent, entity: Actor, projectileComponent: ProjectileComponent): void {
        const thrown = entity.getEntityTypeId() === THROWN_POTION;
        const potion = thrown ? entity.getEntityData().getShort(THROWN_POTION_ID_DATA) : subcomponent.potionEffect;
        const event = new SplashPotionHitEvent(entity, potion);
        const canceled = events.splashPotionHit.fire(event) === CANCEL;
        if (!canceled) {
            if (event.potionEffect !== potion) {
                if (thrown) entity.getEntityData().setShort(THROWN_POTION_ID_DATA, event.potionEffect);
                subcomponent.potionEffect = event.potionEffect;
            }
            _onSplashPotionHit(subcomponent, event.entity, projectileComponent);
        }
        decay(subcomponent);
    }
    const _onSplashPotionHit = procHacker.hooking(
        "?doOnHitEffect@ThrownPotionEffectSubcomponent@@UEAAXAEAVActor@@AEAVProjectileComponent@@@Z",
        void_t,
        null,
        SplashPotionEffectSubcomponent,
        Actor,
        ProjectileComponent,
    )(onSplashPotionHit);
});

events.projectileShoot.setInstaller(() => {
    function onProjectileShoot(projectileComponent: ProjectileComponent, projectile: Actor, shooter: Actor): void {
        const event = new ProjectileShootEvent(projectile, shooter);
        events.projectileShoot.fire(event);
        decay(projectileComponent);
        return _onProjectileShoot(projectileComponent, event.projectile, event.shooter);
    }
    const _onProjectileShoot = procHacker.hooking(
        "?shoot@ProjectileComponent@@QEAAXAEAVActor@@0@Z",
        void_t,
        null,
        ProjectileComponent,
        Actor,
        Actor,
    )(onProjectileShoot);
    // TODO: hook ?shoot@ProjectileComponent@@QEAAXAEAVActor@@AEBVVec3@@MM1PEAV2@@Z instead
});

events.playerSleepInBed.setInstaller(() => {
    function onPlayerSleepInBed(player: Player, pos: BlockPos): number {
        const event = new PlayerSleepInBedEvent(player, pos);
        const canceled = events.playerSleepInBed.fire(event) === CANCEL;
        decay(pos);
        if (canceled) {
            return BedSleepingResult.OTHER_PROBLEM;
        }
        return _onPlayerSleepInBed(event.player, event.pos);
    }
    // 1.26: startSleepInBed(BlockPos const&, bool, float) -- two arguments more than in 2024
    // (Endstone's player.h); the table ships it under its present name and they pass through.
    if ("?startSleepInBed@Player@@UEAA?AW4BedSleepingResult@@AEBVBlockPos@@_NM@Z" in proc) {
        const original = procHacker.hooking(
            "?startSleepInBed@Player@@UEAA?AW4BedSleepingResult@@AEBVBlockPos@@_NM@Z",
            uint8_t,
            null,
            Player,
            BlockPos,
            bool_t,
            float32_t,
        )((player, pos, a2, a3) => {
            const event = new PlayerSleepInBedEvent(player, pos);
            const canceled = events.playerSleepInBed.fire(event) === CANCEL;
            decay(pos);
            if (canceled) return BedSleepingResult.OTHER_PROBLEM;
            return original(event.player, event.pos, a2, a3);
        });
        return;
    }
    const _onPlayerSleepInBed = procHacker.hooking(
        "?startSleepInBed@Player@@UEAA?AW4BedSleepingResult@@AEBVBlockPos@@@Z",
        uint8_t,
        null,
        Player,
        BlockPos,
    )(onPlayerSleepInBed);
});

events.entityConsumeTotem.setInstaller(() => {
    function onConsumeTotem(entity: Actor): boolean {
        const event = new EntityConsumeTotemEvent(entity, entity.getEquippedTotem());
        events.entityConsumeTotem.fire(event);
        return _onConsumeTotem(entity);
    }
    const _onConsumeTotem = procHacker.hooking("?consumeTotem@Actor@@UEAA_NXZ", bool_t, null, Actor)(onConsumeTotem);
});

events.playerDimensionChange.setInstaller(() => {
    function onPlayerDimensionChange(player: ServerPlayer, dimension: DimensionId): void {
        const event = new PlayerDimensionChangeEvent(player, dimension, false);
        const canceled = events.playerDimensionChange.fire(event) === CANCEL;
        if (canceled) {
            return;
        }
        return _onPlayerDimensionChange(player, event.dimension);
    }
    // 1.26: a teleport across dimensions never reaches ServerPlayer::changeDimension -- that is the
    // portal path only. Every change, the portal's included, is a ChangeDimensionRequest handed to
    // PlayerDimensionTransferManager::requestPlayerChangeDimension (Level's virtual is a 12-byte
    // forwarder to it), so that is the seam. The request (Endstone's change_dimension_request.h):
    // state at +0, from at +4, to at +8. A request that stays in its dimension is not a change.
    if (
        !("?changeDimension@ServerPlayer@@UEAAXV?$AutomaticID@VDimension@@H@@@Z" in proc) &&
        "?requestPlayerChangeDimension@PlayerDimensionTransferManager@@QEAAXAEBVPlayer@@$$QEAVChangeDimensionRequest@@@Z" in proc
    ) {
        const original = procHacker.hooking(
            "?requestPlayerChangeDimension@PlayerDimensionTransferManager@@QEAAXAEBVPlayer@@$$QEAVChangeDimensionRequest@@@Z",
            void_t,
            null,
            StaticPointer,
            ServerPlayer,
            StaticPointer,
        )((manager, player, request) => {
            const from = request.getInt32(4),
                to = request.getInt32(8);
            if (from !== to) {
                const event = new PlayerDimensionChangeEvent(player, to, request.getBoolean(36)); // use_portal
                if (events.playerDimensionChange.fire(event) === CANCEL) return;
                if (event.dimension !== to) request.setInt32(event.dimension, 8);
            }
            return original(manager, player, request);
        });
        return;
    }
    // 1.26 spells the argument DimensionType, a struct of one int: the same register, another name
    if ("?changeDimension@ServerPlayer@@UEAAXUDimensionType@@@Z" in proc) {
        const original = procHacker.hooking(
            "?changeDimension@ServerPlayer@@UEAAXUDimensionType@@@Z",
            void_t,
            null,
            ServerPlayer,
            int32_t,
        )((player, dimension) => {
            const event = new PlayerDimensionChangeEvent(player, dimension, false);
            if (events.playerDimensionChange.fire(event) === CANCEL) return;
            return original(player, event.dimension);
        });
        return;
    }
    const _onPlayerDimensionChange = procHacker.hooking(
        "?changeDimension@ServerPlayer@@UEAAXV?$AutomaticID@VDimension@@H@@@Z",
        void_t,
        null,
        ServerPlayer,
        int32_t,
    )(onPlayerDimensionChange);
});

events.projectileHit.setInstaller(() => {
    const onProjectileHit = procHacker.hooking(
        "?onHit@ProjectileComponent@@QEAAXAEAVActor@@AEBVHitResult@@@Z",
        void_t,
        null,
        ProjectileComponent,
        Actor,
        HitResult,
    )((projectileComponent, projectile, result) => {
        const event = new ProjectileHitEvent(projectile, result.getEntity(), result);
        events.projectileHit.fire(event);
        decay(projectileComponent);
        decay(result);
        return onProjectileHit(projectileComponent, event.projectile, event.result);
    });
});

// TODO: implement
// const sendActorCarriedItemChanged = procHacker.hooking(
//     "?sendActorCarriedItemChanged@ActorEventCoordinator@@QEAAXAEAVActor@@AEBVItemInstance@@1W4HandSlot@@@Z",
//     void_t,
//     null,
//     VoidPointer, // this, ActorEventCoordinator
//     Actor,
//     ItemStackBase, // Actually ItemInstance which extends ItemStackBase without additional fields
//     ItemStackBase,
//     int32_t,
// )((self, entity, oldItemStack, newItemStack, handSlot) => {
//     const event = new EntityCarriedItemChangedEvent(entity, oldItemStack, newItemStack, handSlot);
//     events.entityCarriedItemChanged.fire(event);
//     decay(oldItemStack);
//     decay(newItemStack);
//     return sendActorCarriedItemChanged(self, entity, oldItemStack, newItemStack, handSlot);
// });

events.entityKnockback.setInstaller(() => {
    function onEntityKnockback(
        target: Mob,
        source: Actor | null,
        damage: int32_t,
        xd: float32_t,
        zd: float32_t,
        power: float32_t,
        height: float32_t,
        heightCap: float32_t,
    ): void {
        const event = new EntityKnockbackEvent(target, source, damage, xd, zd, power, height, heightCap);
        const canceled = events.entityKnockback.fire(event) === CANCEL;
        if (canceled) {
            return;
        }
        return _onEntityKnockback(target, source, damage, event.xd, event.zd, event.power, event.height, event.heightCap);
    }
    // 1.26: knockback(Actor*, float damage, float xd, float zd, KnockbackParameters const&). The
    // three values the event exposes beside the direction moved into the struct (Endstone's
    // knockback_parameters.h: Vec2 power = (horizontal, vertical) at +0, the vertical cap at +8,
    // 28 bytes). A listener that changes one gets a copy; the caller's struct is const.
    if ("?knockback@Mob@@UEAAXPEAVActor@@MMMAEBUKnockbackParameters@@@Z" in proc) {
        const original = procHacker.hooking(
            "?knockback@Mob@@UEAAXPEAVActor@@MMMAEBUKnockbackParameters@@@Z",
            void_t,
            null,
            Mob,
            Actor,
            float32_t,
            float32_t,
            float32_t,
            StaticPointer,
        )((target, source, damage, xd, zd, params) => {
            const power = params.getFloat32(0),
                height = params.getFloat32(4),
                heightCap = params.getFloat32(8);
            const event = new EntityKnockbackEvent(target, source, damage, xd, zd, power, height, heightCap, params);
            if (events.entityKnockback.fire(event) === CANCEL) return;
            let out = params;
            if (event.power !== power || event.height !== height || event.heightCap !== heightCap) {
                const copy = new AllocatedPointer(KNOCKBACK_PARAMETERS_SIZE);
                copy.copyFrom(params, KNOCKBACK_PARAMETERS_SIZE);
                copy.setFloat32(event.power, 0);
                copy.setFloat32(event.height, 4);
                copy.setFloat32(event.heightCap, 8);
                out = copy;
            }
            return original(target, source, damage, event.xd, event.zd, out);
        });
        return;
    }
    const _onEntityKnockback = procHacker.hooking(
        "?knockback@Mob@@UEAAXPEAVActor@@HMMMMM@Z",
        void_t,
        null,
        Mob,
        Actor,
        int32_t,
        float32_t,
        float32_t,
        float32_t,
        float32_t,
        float32_t,
    )(onEntityKnockback);
});
