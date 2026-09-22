import * as colors from "colors";
import { asmcode } from "../asm/asmcode";
import { Register, asm } from "../assembler";
import { bin } from "../bin";
import { capi } from "../capi";
import { commandParser } from "../commandparser";
import { CommandResult, CommandResultType } from "../commandresult";
import { AttributeName, Direction, VectorXYZ, abstract } from "../common";
import { AllocatedPointer, StaticPointer, VoidPointer } from "../core";
import { CxxPair } from "../cxxpair";
import { CxxVector, CxxVectorToArray } from "../cxxvector";
import { decay } from "../decay";
import { dll } from "../dll";
import { events } from "../event";
import { bedrockServer } from "../launcher";
import { makefunc } from "../makefunc";
import { mce } from "../mce";
import { msAlloc } from "../msalloc";
import { AbstractClass, NativeClass, NativeClassType, nativeClass, nativeField, vectorDeletingDestructor } from "../nativeclass";
import {
    CxxString,
    CxxStringView,
    CxxStringWith8Bytes,
    NativeType,
    Type,
    bin64_t,
    bool_t,
    float32_t,
    int16_t,
    int32_t,
    int64_as_float_t,
    int8_t,
    uint16_t,
    uint32_t,
    uint64_as_float_t,
    uint8_t,
    void_t,
} from "../nativetype";
import { pdbcache } from "../pdbcache";
import { CxxStringWrapper, Wrapper } from "../pointer";
import { procHacker } from "../prochacker";
import { CxxSharedPtr } from "../sharedpointer";
import { abilityCount, abilityStride, Abilities, AbilitiesIndex, AbilitiesLayer, Ability, LayeredAbilities } from "./abilities";
import {
    Actor,
    ActorDamageByActorSource,
    ActorDamageByBlockSource,
    ActorDamageByChildActorSource,
    ActorDamageCause,
    ActorDamageSource,
    ActorDefinitionIdentifier,
    ActorFlags,
    ActorRuntimeID,
    ActorType,
    ActorUniqueID,
    DimensionId,
    DistanceSortedActor,
    EntityContext,
    ItemActor,
    Mob,
    OwnerStorageEntity,
    SynchedActorDataEntityWrapper,
    WeakEntityRef,
} from "./actor";
import { AttributeId, AttributeInstance, BaseAttributeMap } from "./attribute";
import { Bedrock } from "./bedrock";
import { Biome } from "./biome";
import { Block, BlockActor, BlockLegacy, BlockSource, BlockUtils, ChestBlockActor, PistonBlockActor } from "./block";
import { BlockPos, ChunkBlockPos, ChunkPos, RelativeFloat, Vec2, Vec3 } from "./blockpos";
import { ChunkSource, LevelChunk } from "./chunk";
import { CommandSymbols } from "./cmdsymbolloader";
import * as command from "./command";
import {
    Command,
    CommandContext,
    CommandOutput,
    CommandOutputParameter,
    CommandOutputSender,
    CommandOutputType,
    CommandPermissionLevel,
    CommandPositionFloat,
    CommandRegistry,
    CommandVersion,
    MCRESULT,
} from "./command";
import { CommandName } from "./commandname";
import { CommandOrigin, ServerCommandOrigin, VirtualCommandOrigin } from "./commandorigin";
import "./commandparsertypes";
import {
    ActorDataDirtyFlagsComponent,
    ActorDataFlagComponent,
    CommandBlockComponent,
    ConditionalBandwidthOptimizationComponent,
    ContainerComponent,
    DamageSensorComponent,
    HitResult,
    NameableComponent,
    NavigationComponent,
    NpcComponent,
    OnHitSubcomponent,
    Path,
    PhysicsComponent,
    ProjectileComponent,
    PushableComponent,
    RideableComponent,
    ShooterComponent,
} from "./components";
import { Certificate, ConnectionRequest, JsonValue } from "./connreq";
import { CxxOptional, CxxOptionalToUndefUnion } from "./cxxoptional";
import { Dimension } from "./dimension";
import { MobEffect, MobEffectInstance } from "./effects";
import { EnchantUtils, ItemEnchants } from "./enchants";
import { GameMode } from "./gamemode";
import { GameRule, GameRuleId, GameRules } from "./gamerules";
import { HashedString, HashedStringToString } from "./hashedstring";
import {
    ComponentItem,
    Container,
    ContainerId,
    EnderChestContainer,
    FillingContainer,
    Inventory,
    InventoryAction,
    InventorySource,
    InventoryTransaction,
    InventoryTransactionItemGroup,
    Item,
    ItemDescriptor,
    ItemStack,
    ItemStackBase,
    NetworkItemStackDescriptor,
    PlayerInventory,
    PlayerUIContainer,
    PlayerUISlot,
    SimpleContainer,
} from "./inventory";
import {
    ArmorItemComponent,
    CooldownItemComponent,
    DiggerItemComponent,
    DisplayNameItemComponent,
    DurabilityItemComponent,
    EntityPlacerItemComponent,
    FoodItemComponent,
    FuelItemComponent,
    IconItemComponent,
    ItemComponent,
    OnUseItemComponent,
    PlanterItemComponent,
    ProjectileItemComponent,
    RecordItemComponent,
    RenderOffsetsItemComponent,
    RepairableItemComponent,
    ShooterItemComponent,
    ThrowableItemComponent,
    WeaponItemComponent,
    WearableItemComponent,
    cereal,
} from "./item_component";
import { ActorFactory, AdventureSettings, BlockPalette, Difficulty, JsonUtil, Level, LevelData, ServerLevel, Spawner, TagRegistry } from "./level";
import {
    ByteArrayTag,
    ByteTag,
    CompoundTag,
    CompoundTagVariant,
    DoubleTag,
    EndTag,
    FloatTag,
    Int64Tag,
    IntArrayTag,
    IntTag,
    ListTag,
    NBT,
    ShortTag,
    StringTag,
    Tag,
    TagPointer,
} from "./nbt";
import { NetworkConnection, NetworkIdentifier, NetworkSystem, ServerNetworkHandler } from "./networkidentifier";
import { Packet } from "./packet";
import {
    AnimateEntityPacket,
    AttributeData,
    BlockActorDataPacket,
    GameRulesChangedPacket,
    ItemStackRequestAction,
    ItemStackRequestData,
    PlayerAuthInputPacket,
    PlayerListEntry,
    PlayerListPacket,
    SetDifficultyPacket,
    SetTimePacket,
    UpdateAbilitiesPacket,
    UpdateAttributesPacket,
} from "./packets";
import { BatchedNetworkPeer } from "./peer";
import { Player, PlayerPermission, ServerPlayer, SimulatedPlayer } from "./player";
import { RakNet } from "./raknet";
import { RakNetConnector } from "./raknetinstance";
import { DisplayObjective, IdentityDefinition, Objective, ObjectiveCriteria, ScoreInfo, Scoreboard, ScoreboardId, ScoreboardIdentityRef } from "./scoreboard";
import {
    DedicatedServer,
    Minecraft,
    Minecraft$Something,
    ScriptFramework,
    SemVersion,
    ServerInstance,
    VanillaGameModuleServer,
    VanillaServerGameplayEventListener,
} from "./server";
import { WeakPtr } from "./sharedptr";
import { SerializedSkin } from "./skin";
import { BinaryStream } from "./stream";
import { StructureManager, StructureSettings, StructureTemplate, StructureTemplateData } from "./structure";
import { derived, proc, procConst } from "./symbols";
import { WeakRefT } from "./weakreft";

// avoiding circular dependency

// Wrappers
const WrappedInt32 = Wrapper.make(int32_t);
// std::vector
const CxxVector$Vec3 = CxxVector.make(Vec3);
const CxxVector$string = CxxVector.make(CxxString);
const CxxVector$ScoreboardIdentityRef = CxxVector.make(ScoreboardIdentityRef);
const CxxVector$ScoreboardId = CxxVector.make(ScoreboardId);
const CxxVector$EntityContext = CxxVector.make(EntityContext);
const CxxVector$CommandName = CxxVector.make(CommandName);
const CxxVector$CxxStringWith8Bytes = CxxVector.make(CxxStringWith8Bytes);
const CxxVector$PlayerRef = CxxVector.make(Player.ref());
const CxxVector$ItemStackRequestActionRef = CxxVector.make(ItemStackRequestAction.ref());

// utils
namespace CommandUtils {
    export const createItemStack = procHacker.js(
        "?createItemStack@CommandUtils@@YA?AVItemStack@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@HH@Z",
        ItemStack,
        { structureReturn: true },
        CxxString,
        int32_t,
        int32_t,
    );
    export const spawnEntityAt = procHacker.js(
        "?spawnEntityAt@CommandUtils@@YAPEAVActor@@AEAVBlockSource@@AEBVVec3@@AEBUActorDefinitionIdentifier@@AEAUActorUniqueID@@PEAV2@@Z",
        Actor,
        null,
        BlockSource,
        Vec3,
        ActorDefinitionIdentifier,
        StaticPointer,
        VoidPointer,
    );
    export const getFeetPos = procHacker.js("?getFeetPos@CommandUtils@@YA?AVVec3@@PEBVActor@@@Z", Vec3, { structureReturn: true }, Actor);
}

namespace OnFireSystem {
    export const setOnFire = procHacker.js("?setOnFire@OnFireSystem@@SAXAEAVActor@@H@Z", void_t, null, Actor, int32_t);
    export const setOnFireNoEffects = procHacker.js("?setOnFireNoEffects@OnFireSystem@@SAXAEAVActor@@H@Z", void_t, null, Actor, int32_t);
}

// level.ts
// assume all Level is always ServerLevel.
const DimensionWeakRef = WeakRefT.make(Dimension);
Level.prototype.getOrCreateDimension = procHacker.js(
    "?getOrCreateDimension@Level@@UEAA?AV?$WeakRef@VDimension@@@@V?$AutomaticID@VDimension@@H@@@Z",
    DimensionWeakRef,
    { this: Level, structureReturn: true },
    int32_t,
);
Level.prototype.createDimension = function (id) {
    const ref = this.getOrCreateDimension(id);
    process.nextTick(() => ref.dispose());
    return ref.p!;
};
Level.prototype.destroyBlock = procHacker.js(
    "?destroyBlock@Level@@UEAA_NAEAVBlockSource@@AEBVBlockPos@@_N@Z",
    bool_t,
    { this: Level },
    BlockSource,
    BlockPos,
    bool_t,
);
Level.prototype.fetchEntity = procHacker.js("?fetchEntity@Level@@UEBAPEAVActor@@UActorUniqueID@@_N@Z", Actor, { this: Level }, bin64_t, bool_t);
Level.prototype.getActivePlayerCount = procHacker.js("?getActivePlayerCount@Level@@UEBAHXZ", int32_t, { this: Level });
Level.prototype.getActorFactory = procHacker.js("?getActorFactory@Level@@UEAAAEAVActorFactory@@XZ", ActorFactory, { this: Level });
Level.prototype.getAdventureSettings = procHacker.js("?getAdventureSettings@Level@@UEAAAEAUAdventureSettings@@XZ", AdventureSettings, { this: Level });
Level.prototype.getBlockPalette = procHacker.js("?getBlockPalette@Level@@UEAAAEAVBlockPalette@@XZ", BlockPalette, { this: Level });
Level.prototype.getDimension = function (id) {
    const ref = this.getDimensionWeakRef(id);
    const p = ref.p;
    if (p !== null) process.nextTick(() => ref.dispose());
    return p;
};
Level.prototype.getDimensionWeakRef = procHacker.js(
    "?getDimension@Level@@UEBA?AV?$WeakRef@VDimension@@@@V?$AutomaticID@VDimension@@H@@@Z",
    DimensionWeakRef,
    { this: Level, structureReturn: true },
    int32_t,
);
Level.prototype.getLevelData = procHacker.js("?getLevelData@Level@@UEAAAEAVLevelData@@XZ", LevelData.ref(), { this: Level });
Level.prototype.getGameRules = function () {
    return bedrockServer.gameRules;
};
Level.prototype.getScoreboard = procHacker.js("?getScoreboard@Level@@UEAAAEAVScoreboard@@XZ", Scoreboard, { this: Level });
Level.prototype.getSeed = procHacker.js("?getSeed@Level@@UEAAIXZ", uint32_t, {
    this: Level,
});

class StructureManagerShim extends StructureManager {
    [NativeType.dtor](): void {
        // empty
    }
}

Level.prototype.getStructureManager = function () {
    return bedrockServer.structureManager.as(StructureManagerShim);
};
Level.prototype.getSpawner = procHacker.js("?getSpawner@Level@@UEBAAEAVSpawner@@XZ", Spawner, { this: Level });
Level.prototype.getTagRegistry = procHacker.js(
    "?getTagRegistry@Level@@UEAAAEAV?$TagRegistry@U?$IDType@ULevelTagIDType@@@@U?$IDType@ULevelTagSetIDType@@@@@@XZ",
    TagRegistry,
    { this: Level },
);
Level.prototype.hasCommandsEnabled = procHacker.js("?hasCommandsEnabled@Level@@UEBA_NXZ", bool_t, { this: Level });
Level.prototype.setCommandsEnabled = procHacker.js("?setCommandsEnabled@ServerLevel@@UEAAX_N@Z", void_t, { this: ServerLevel }, bool_t);
Level.prototype.setShouldSendSleepMessage = procHacker.js("?setShouldSendSleepMessage@ServerLevel@@QEAAX_N@Z", void_t, { this: ServerLevel }, bool_t);
Level.prototype.getPlayerByXuid = procHacker.js(
    "?getPlayerByXuid@Level@@UEBAPEAVPlayer@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    Player,
    { this: Level },
    CxxString,
);

const unique_ptr$GameRulesChangedPacket = Wrapper.make(GameRulesChangedPacket.ref());
const GameRules$createAllGameRulesPacket = procHacker.js(
    "?createAllGameRulesPacket@GameRules@@QEBA?AV?$unique_ptr@VGameRulesChangedPacket@@U?$default_delete@VGameRulesChangedPacket@@@std@@@std@@XZ",
    unique_ptr$GameRulesChangedPacket,
    { this: GameRules },
    unique_ptr$GameRulesChangedPacket,
);
Level.prototype.syncGameRules = function () {
    const wrapper = new unique_ptr$GameRulesChangedPacket(true);
    GameRules$createAllGameRulesPacket.call(bedrockServer.gameRules, wrapper);
    for (const player of bedrockServer.serverInstance.getPlayers()) {
        player.sendNetworkPacket(wrapper.value);
    }
    wrapper.destruct();
};
Level.prototype.spawnParticleEffect = procHacker.js(
    "?spawnParticleEffect@Level@@UEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBVVec3@@PEAVDimension@@@Z",
    void_t,
    { this: Level },
    CxxString,
    Vec3,
    Dimension,
);
const level$setTime = procHacker.js("?setTime@Level@@UEAAXH@Z", void_t, { this: Level }, int64_as_float_t);
Level.prototype.setTime = function (time: number): void {
    level$setTime.call(this, time);
    const packet = SetTimePacket.allocate();
    packet.time = time;
    for (const player of bedrockServer.serverInstance.getPlayers()) {
        player.sendNetworkPacket(packet);
    }
    packet.dispose();
};

Level.prototype.getPlayers = function () {
    const out: ServerPlayer[] = [];
    for (const user of this.getUsers()) {
        const entity = ServerPlayer.tryGetFromEntity(user);
        if (entity) out.push(entity);
    }
    return out;
};
Level.prototype.getUsers = procHacker.js(
    "?getUsers@Level@@UEBAAEBV?$vector@V?$OwnerPtr@VEntityContext@@@@V?$allocator@V?$OwnerPtr@VEntityContext@@@@@std@@@std@@XZ",
    CxxVector$EntityContext,
    { this: Level },
);
Level.prototype.getActiveUsers = procHacker.js(
    "?getActiveUsers@Level@@UEBAAEBV?$vector@VWeakEntityRef@@V?$allocator@VWeakEntityRef@@@std@@@std@@XZ",
    CxxVector.make(WeakEntityRef),
    { this: Level },
);
(Level.prototype as any)._getEntities = procHacker.js(
    "?getEntities@Level@@UEBAAEBV?$vector@V?$OwnerPtr@VEntityContext@@@@V?$allocator@V?$OwnerPtr@VEntityContext@@@@@std@@@std@@XZ",
    CxxVector$EntityContext,
    { this: Level },
);
Level.prototype.getEntities = function () {
    const out: Actor[] = [];
    for (const context of (this as any)._getEntities()) {
        const entity = Actor.tryGetFromEntity(context);
        if (entity === null) continue;
        out.push(entity);
    }
    return out;
};

const Level$getRuntimeEntity = procHacker.js("?getRuntimeEntity@Level@@UEBAPEAVActor@@VActorRuntimeID@@_N@Z", Actor, null, Level, ActorRuntimeID, bool_t);
Level.prototype.getRuntimeEntity = function (id, getRemoved = false) {
    return Level$getRuntimeEntity(this, id, getRemoved);
};
Level.prototype.getRuntimePlayer = procHacker.js("?getRuntimePlayer@Level@@UEBAPEAVPlayer@@VActorRuntimeID@@@Z", Player, { this: Level }, ActorRuntimeID);
Level.prototype.getTime = procHacker.js("?getTime@Level@@UEBAHXZ", int64_as_float_t, { this: Level });
Level.prototype.getCurrentTick = procHacker.js("?getCurrentTick@Level@@UEBAAEBUTick@@XZ", int64_as_float_t.ref(), { this: Level }); // You can run the server for 1.4202551784875594e+22 years till it exceeds the max safe integer

@nativeClass()
class GamePlayUserManager extends AbstractClass {
    getActiveGameplayUsers(): CxxVector<WeakEntityRef> {
        abstract();
    }
}
GamePlayUserManager.prototype.getActiveGameplayUsers = procHacker.js(
    "?getActiveGameplayUsers@GameplayUserManager@@QEBAAEBV?$vector@VWeakEntityRef@@V?$allocator@VWeakEntityRef@@@std@@@std@@XZ",
    CxxVector.make(WeakEntityRef),
    { this: GamePlayUserManager },
);

Level.prototype.getRandomPlayer = function () {
    const mgr = this.addAs(GamePlayUserManager, 0x2e30);
    const activePlayers = mgr.getActiveGameplayUsers();
    if (activePlayers.empty()) return null;
    const list = CxxVector$PlayerRef.construct(); // rsp+28
    if (!activePlayers.empty()) {
        for (const p of activePlayers) {
            const storage = new StackResultStorageEntity(true); // rsp+40
            storage.constructWith(p);
            const al = storage._hasValue();
            if (al) {
                const entityctx = storage._getStackRef();
                const player = ServerPlayer.tryGetFromEntity(entityctx, true); // rsp+20
                if (player !== null) {
                    list.push(player);
                }
            }
        }
    }
    let out: Player | null;
    if (!list.empty()) {
        out = list.get((Math.random() * list.size()) | 0);
        // const random = this.getRandom();
        // const idx = random[vftable + 8](list.size());
        // out = list.get(idx);
    } else {
        out = null;
    }
    list.destruct();
    return out;
};
// On 1.26 the Level virtual is a 12-byte forwarder (`mov rcx,[rcx+weatherManager]; jmp`) that the table
// does not ship, because levelWeatherChange hooks this name and twelve bytes cannot take a hook. The
// function it forwards to is WeatherManager::updateWeather, reached through symbols.json
// `layouts.Level.weatherManager` (docs/findings-slots.md, "The anchor that was wrong").
Level.prototype.updateWeather = derived(
    "?updateWeather@Level@@UEAAXMHMH@Z",
    (() => {
        let fn: ((this: StaticPointer, rainLevel: number, rainTime: number, lightningLevel: number, lightningTime: number) => void) | null = null;
        return function updateWeather(this: Level, rainLevel: number, rainTime: number, lightningLevel: number, lightningTime: number): void {
            const off = pdbcache.layouts.Level?.weatherManager;
            if (off == null) throw Error("Level::updateWeather: no address and no layouts.Level.weatherManager in this build's symbols.json");
            if (fn === null) fn = procHacker.js("?updateWeather@WeatherManager@@QEAAXMHMH@Z", void_t, { this: StaticPointer }, float32_t, int32_t, float32_t, int32_t);
            fn.call((this as any as StaticPointer).getPointer(off), rainLevel, rainTime, lightningLevel, lightningTime);
        };
    })(),
    () => procHacker.js("?updateWeather@Level@@UEAAXMHMH@Z", void_t, { this: Level }, float32_t, int32_t, float32_t, int32_t),
);
Level.prototype.setDefaultSpawn = procHacker.js("?setDefaultSpawn@Level@@UEAAXAEBVBlockPos@@@Z", void_t, { this: Level }, BlockPos);
Level.prototype.getDefaultSpawn = procHacker.js("?getDefaultSpawn@Level@@UEBAAEBVBlockPos@@XZ", BlockPos, { this: Level });
Level.prototype.explode = procHacker.js(
    "?explode@Level@@UEAA_NAEAVBlockSource@@PEAVActor@@AEBVVec3@@M_N3M3@Z",
    bool_t,
    { this: Level },
    BlockSource,
    VoidPointer,
    Vec3,
    float32_t,
    bool_t,
    bool_t,
    float32_t,
    bool_t,
);
Level.prototype.getDifficulty = procHacker.js("?getDifficulty@Level@@UEBA?AW4Difficulty@@XZ", int32_t, { this: Level });
const Level$setDifficulty = procHacker.js("?setDifficulty@Level@@UEAAXW4Difficulty@@@Z", void_t, { this: Level }, int32_t);
Level.prototype.setDifficulty = function (difficulty) {
    Level$setDifficulty.call(this, difficulty);
    const pkt = SetDifficultyPacket.allocate();
    pkt.difficulty = difficulty;
    for (const player of this.getPlayers()) {
        player.sendNetworkPacket(pkt);
    }
    pkt.dispose();
};
Level.prototype.getNewUniqueID = procHacker.js("?getNewUniqueID@Level@@UEAA?AUActorUniqueID@@XZ", ActorUniqueID, { this: Level, structureReturn: true });
Level.prototype.getNextRuntimeID = procHacker.js("?getNextRuntimeID@Level@@UEAA?AVActorRuntimeID@@XZ", ActorRuntimeID, { this: Level, structureReturn: true });
Level.prototype.sendAllPlayerAbilities = procHacker.js("?sendAllPlayerAbilities@Level@@UEAAXAEBVPlayer@@@Z", void_t, { this: Level }, Player);

Level.abstract({
    vftable: VoidPointer,
});

ServerLevel.abstract({});

LevelData.prototype.getGameDifficulty = procHacker.js("?getGameDifficulty@LevelData@@QEBA?AW4Difficulty@@XZ", uint32_t, { this: LevelData });
LevelData.prototype.setGameDifficulty = procHacker.js("?setGameDifficulty@LevelData@@QEAAXW4Difficulty@@@Z", void_t, { this: LevelData }, uint32_t);
LevelData.prototype.getRainLevel = procHacker.js("?getRainLevel@LevelData@@QEBAMXZ", float32_t, { this: LevelData });
LevelData.prototype.setRainLevel = procHacker.js("?setRainLevel@LevelData@@QEAAXM@Z", void_t, { this: LevelData }, float32_t);
LevelData.prototype.getRainTime = procHacker.js("?getRainTime@LevelData@@QEBAHXZ", int32_t, { this: LevelData });
LevelData.prototype.setRainTime = procHacker.js("?setRainTime@LevelData@@QEAAXH@Z", void_t, { this: LevelData }, int32_t);
LevelData.prototype.getLightningLevel = procHacker.js("?getLightningLevel@LevelData@@QEBAMXZ", float32_t, { this: LevelData });
LevelData.prototype.setLightningLevel = procHacker.js("?setLightningLevel@LevelData@@QEAAXM@Z", void_t, { this: LevelData }, float32_t);
LevelData.prototype.getLightningTime = procHacker.js("?getLightningTime@LevelData@@QEBAHXZ", int32_t, { this: LevelData });
LevelData.prototype.setLightningTime = procHacker.js("?setLightningTime@LevelData@@QEAAXH@Z", void_t, { this: LevelData }, int32_t);

JsonUtil.getBlockLegacy = procHacker.js(
    "?getBlockLegacy@JsonUtil@@YAPEBVBlockLegacy@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    BlockLegacy,
    null,
    CxxString,
);

BlockPalette.prototype.getBlock = procHacker.jsv(
    "??_7BlockPalette@@6B@",
    "?getBlock@BlockPalette@@UEBAAEBVBlock@@AEBI@Z",
    Block,
    { this: BlockPalette },
    uint32_t.ref(),
);

const Spawner$spawnItem = procHacker.js(
    "?spawnItem@Spawner@@QEAAPEAVItemActor@@AEAVBlockSource@@AEBVItemStack@@PEAVActor@@AEBVVec3@@H@Z",
    ItemActor,
    null,
    Spawner,
    BlockSource,
    ItemStack,
    VoidPointer,
    Vec3,
    int32_t,
);
Spawner.prototype.spawnItem = function (region: BlockSource, itemStack: ItemStack, pos: Vec3, throwTime: number): ItemActor {
    return Spawner$spawnItem(this, region, itemStack, null, pos, throwTime);
};
const Spawner$spawnMob = procHacker.js(
    "?spawnMob@Spawner@@QEAAPEAVMob@@AEAVBlockSource@@AEBUActorDefinitionIdentifier@@PEAVActor@@AEBVVec3@@_N44@Z",
    Actor,
    null,
    Spawner,
    BlockSource,
    ActorDefinitionIdentifier,
    VoidPointer,
    Vec3,
    bool_t,
    bool_t,
    bool_t,
);
Spawner.prototype.spawnMob = function (
    region: BlockSource,
    id: ActorDefinitionIdentifier,
    pos: Vec3,
    naturalSpawn = false,
    surface = true,
    fromSpawner = false,
): Actor {
    return Spawner$spawnMob(this, region, id, null, pos, naturalSpawn, surface, fromSpawner);
};

// dimension.ts
const fetchNearestAttackablePlayer$nonBlockPos = procHacker.js(
    "?fetchNearestAttackablePlayer@Dimension@@QEBAPEAVPlayer@@AEAVActor@@M@Z",
    Player,
    { this: Dimension },
    Actor,
    float32_t,
);
const fetchNearestAttackablePlayer$withBlockPos = procHacker.js(
    "?fetchNearestAttackablePlayer@Dimension@@QEBAPEAVPlayer@@VBlockPos@@MPEAVActor@@@Z",
    Player,
    { this: Dimension },
    BlockPos,
    float32_t,
    Actor,
);
Dimension.prototype.fetchNearestAttackablePlayer = function (actor: Actor, distance: number, blockPos?: BlockPos): Player {
    if (blockPos) {
        return fetchNearestAttackablePlayer$withBlockPos.call(this, blockPos, distance, actor);
    }
    return fetchNearestAttackablePlayer$nonBlockPos.call(this, actor, distance);
};
Dimension.prototype.getSunAngle = procHacker.js("?getSunAngle@Dimension@@QEBAMM@Z", float32_t, { this: Dimension });
Dimension.prototype.getTimeOfDay = procHacker.js("?getTimeOfDay@Dimension@@QEBAMM@Z", float32_t, { this: Dimension });
Dimension.prototype.isDay = procHacker.jsv("??_7OverworldDimension@@6BIDimension@@@", "?isDay@Dimension@@UEBA_NXZ", bool_t, { this: Dimension });
Dimension.prototype.distanceToNearestPlayerSqr2D = procHacker.js("?distanceToNearestPlayerSqr2D@Dimension@@QEAAMVVec3@@@Z", float32_t, { this: Dimension }, Vec3);
Dimension.prototype.transferEntityToUnloadedChunk = procHacker.js(
    "?transferEntityToUnloadedChunk@Dimension@@QEAAXAEAVActor@@PEAVLevelChunk@@@Z",
    void_t,
    { this: Dimension },
    Actor,
    LevelChunk,
);
Dimension.prototype.getSpawnPos = procHacker.jsv("??_7OverworldDimension@@6BIDimension@@@", "?getSpawnPos@Dimension@@UEBA?AVBlockPos@@XZ", BlockPos, {
    this: Dimension,
    structureReturn: true,
});
Dimension.prototype.getPlayers = function () {
    const id = this.getDimensionId();
    const players: Player[] = [];
    const users = bedrockServer.level.getActiveUsers();
    for (const user of users) {
        const player = user.tryUnwrapPlayer();
        if (player === null) continue;
        if (player.getDimensionId() !== id) continue;
        players.push(player);
    }
    return players;
};
Dimension.prototype.fetchNearestPlayerToActor = function (actor, distance) {
    const actorPos = actor.getPosition();
    return this.fetchNearestPlayerToPosition(actorPos.x, actorPos.y, actorPos.z, distance, false);
};
Dimension.prototype.fetchNearestPlayerToPosition = function (x, y, z, distance, findAnyNearPlayer) {
    let found: Player | null = null;
    let nearestDistSq = distance * distance;
    const pos = { x, y, z };
    const users = bedrockServer.level.getActiveUsers();
    for (const user of users) {
        const player = user.tryUnwrapPlayer();
        if (player === null) continue;
        const distSq = player.getPosition().distanceSq(pos);
        if (distSq <= nearestDistSq) {
            if (findAnyNearPlayer) return player;
            found = player;
            nearestDistSq = distSq;
        }
    }
    return found;
};
Dimension.prototype.getMoonBrightness = procHacker.js("?getMoonBrightness@Dimension@@QEBAMXZ", float32_t, { this: Dimension });
Dimension.prototype.getHeight = procHacker.js("?getHeight@Dimension@@QEBAFXZ", int16_t, { this: Dimension });

Dimension.prototype.tryGetClosestPublicRegion = function (chunkpos: ChunkPos) {
    return this.getBlockSource();
};
Dimension.prototype.removeActorByID = procHacker.js("?removeActorByID@Dimension@@QEAAXAEBUActorUniqueID@@@Z", void_t, { this: Dimension }, ActorUniqueID);
Dimension.prototype.getMinHeight = procHacker.js("?getMinHeight@Dimension@@QEBAFXZ", int16_t, { this: Dimension });
Dimension.prototype.getDefaultBiomeString = procHacker.jsv(
    "??_7NetherDimension@@6BIDimension@@@",
    "?getDefaultBiome@NetherDimension@@UEBA?AVHashedString@@XZ",
    HashedStringToString,
    { this: Dimension, structureReturn: true },
);
Dimension.prototype.getMoonPhase = procHacker.js("?getMoonPhase@Dimension@@QEBAHXZ", int32_t, { this: Dimension });

// actor.ts
const actorMaps = new Map<string, Actor>();
const ServerPlayer$vftable = proc["??_7ServerPlayer@@6B@"];
const ItemActor$vftable = proc["??_7ItemActor@@6B@"];
const SimulatedPlayer$vftable = proc["??_7SimulatedPlayer@@6B@"];
const Actor$teleportTo = procHacker.jsv(
    "??_7Actor@@6B@",
    "?teleportTo@Actor@@UEAAXAEBVVec3@@_NHH1@Z",
    void_t,
    { this: Actor },
    Vec3,
    bool_t,
    int32_t,
    int32_t,
    bool_t,
);
Actor.abstract({
    vftable: VoidPointer,
    ctxbase: EntityContext, // accessed in ServerNetworkHandler::_displayGameMessage before calling EntityContextBase::_enttRegistry
});

Actor.prototype.changeDimension = procHacker.jsv(
    "??_7Actor@@6B@",
    "?changeDimension@Actor@@UEAAXV?$AutomaticID@VDimension@@H@@@Z",
    void_t,
    { this: Actor },
    int32_t,
);
Actor.prototype.teleportTo = function (position: Vec3, shouldStopRiding: boolean, cause: number, sourceEntityType: number, unknown?: ActorUniqueID | bool_t) {
    if (typeof unknown === "string") unknown = false;
    Actor$teleportTo.call(this, position, shouldStopRiding, cause, sourceEntityType, unknown);
};

// `includeSimulatedPlayer` is for deprecated overload
Actor.prototype.isPlayer = function (includeSimulatedPlayer: boolean = false) {
    return this instanceof ServerPlayer;
};
Actor.prototype.isSimulatedPlayer = function () {
    return this instanceof SimulatedPlayer;
};

// Every actor a hook hands over goes through this resolver before the hook's own code runs, so a missing
// Actor::hasType must not throw here: on 1.26.51.1 it did, and each event that carried a mob -- hurt,
// knockback -- took the server down at its first call. Without it a mob is wrapped as a plain Actor.
const Actor$hasTypeKnown = "?hasType@Actor@@QEBA_NW4ActorType@@@Z" in proc;
Actor.setResolver(ptr => {
    if (ptr === null) return null;
    const binptr = ptr.getAddressBin();
    let actor = actorMaps.get(binptr);
    if (actor != null) return actor;
    const vftable = ptr.getPointer();
    if (vftable.equalsptr(SimulatedPlayer$vftable)) {
        actor = ptr.as(SimulatedPlayer);
    } else if (vftable.equalsptr(ServerPlayer$vftable)) {
        actor = ptr.as(ServerPlayer);
    } else if (vftable.equalsptr(ItemActor$vftable)) {
        actor = ptr.as(ItemActor);
    } else if (Actor$hasTypeKnown && Actor$hasType.call(ptr, ActorType.Mob)) {
        actor = ptr.as(Mob);
    } else {
        actor = ptr.as(Actor);
    }
    actorMaps.set(binptr, actor);
    return actor;
});
Actor.all = function (): IterableIterator<Actor> {
    return actorMaps.values();
};

Actor.summonAt = function (
    region: BlockSource,
    pos: Vec3,
    type: ActorDefinitionIdentifier | ActorType,
    id: ActorUniqueID | int64_as_float_t | Actor = -1,
    summoner: Actor | null = null,
): Actor {
    const ptr = new AllocatedPointer(8);
    switch (typeof id) {
        case "number":
            ptr.setInt64WithFloat(id);
            break;
        case "string":
            ptr.setBin(id);
            break;
        case "object":
            ptr.setInt64WithFloat(-1);
            summoner = id;
            break;
    }
    if (!(type instanceof ActorDefinitionIdentifier)) {
        type = ActorDefinitionIdentifier.constructWith(type);
        const res = CommandUtils.spawnEntityAt(region, pos, type, ptr, summoner);
        type.destruct();
        return res;
    } else {
        return CommandUtils.spawnEntityAt(region, pos, type, ptr, summoner);
    }
};
Actor.prototype.addItem = procHacker.js("?add@Actor@@UEAA_NAEAVItemStack@@@Z", bool_t, { this: Actor }, ItemStack);
Actor.prototype.getAttributes = procHacker.js("?getAttributes@Actor@@QEAA?AV?$not_null@PEAVBaseAttributeMap@@@gsl@@XZ", BaseAttributeMap.ref(), {
    this: Actor,
    structureReturn: true,
});
Actor.prototype.getNameTag = procHacker.js("?getNameTag@Actor@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, { this: Actor });
Actor.prototype.setNameTag = procHacker.js(
    "?setNameTag@Actor@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: Actor },
    CxxString,
);
// 2024's body (0x19c6ba0) is one line: Actor vftable slot 1, setStatusFlag(CanShowName = 14, value).
// 1.26 has no out-of-line copy (every setActorFlag call that passes 14 sits inside a larger function),
// and setStatusFlag is itself derived() below, so this needs no address (docs/findings-synched.md).
Actor.prototype.setNameTagVisible = derived(
    "?setNameTagVisible@Actor@@QEAAX_N@Z",
    function setNameTagVisible(this: Actor, visible: boolean): void {
        this.setStatusFlag(ActorFlags.CanShowName, visible);
    },
    () => procHacker.js("?setNameTagVisible@Actor@@QEAAX_N@Z", void_t, { this: Actor }, bool_t),
);
Actor.prototype.addTag = procHacker.js(
    "?addTag@Actor@@QEAA_NAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    bool_t,
    { this: Actor },
    CxxString,
);
Actor.prototype.hasTag = procHacker.js(
    "?hasTag@Actor@@QEBA_NAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    bool_t,
    { this: Actor },
    CxxString,
);
Actor.prototype.despawn = procHacker.js("?despawn@Actor@@UEAAXXZ", void_t, {
    this: Actor,
});
Actor.prototype.removeTag = procHacker.js(
    "?removeTag@Actor@@QEAA_NAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    bool_t,
    { this: Actor },
    CxxString,
);
Actor.prototype.getPosition = procHacker.js("?getPosition@Actor@@QEBAAEBVVec3@@XZ", Vec3, { this: Actor });
Actor.prototype.getFeetPos = function (): Vec3 {
    return CommandUtils.getFeetPos(this);
};
Actor.prototype.getRotation = procHacker.js("?getRotation@Actor@@QEBAAEBVVec2@@XZ", Vec2, { this: Actor });

const SynchedActorDataEntityWrapper$getString = procHacker.js(
    "?getString@SynchedActorDataEntityWrapper@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@G@Z",
    CxxString,
    null,
    VoidPointer,
    uint16_t,
);
Actor.prototype.getScoreTag = function () {
    // accessed from Actor::setScoreTag
    return SynchedActorDataEntityWrapper$getString(this.getEntityData(), 0x54);
};
// Actor::getDimensionBlockSource is one line in 2024 (0x19b1f30: getDimension(), then a tail jump to
// Dimension::getBlockSourceFromMainChunkSource) and 1.26 keeps no out-of-line copy. Both halves ship
// as live-read field accessors on both builds, so bdsx walks them itself. The address the table used
// to carry for this name was a throw helper with 1,564 callers -- retracted, see
// data/candidates-instances-<v>.json.
Actor.prototype.getDimensionBlockSource = Actor.prototype.getRegion = derived(
    "?getDimensionBlockSource@Actor@@QEBAAEAVBlockSource@@XZ",
    function (this: Actor): BlockSource {
        return this.getDimension().getBlockSource();
    },
    () =>
        procHacker.js("?getDimensionBlockSource@Actor@@QEBAAEAVBlockSource@@XZ", BlockSource, {
            this: Actor,
        }),
);
Actor.prototype.getUniqueIdPointer = procHacker.js("?getOrCreateUniqueID@Actor@@QEBAAEBUActorUniqueID@@XZ", StaticPointer, { this: Actor });
Actor.prototype.getEntityTypeId = procHacker.js("?getEntityTypeId@Actor@@QEBA?AW4ActorType@@XZ", int32_t, { this: Actor }); // ActorType getEntityTypeId()
Actor.prototype.getRuntimeID = procHacker.js("?getRuntimeID@Actor@@QEBA?AVActorRuntimeID@@XZ", ActorRuntimeID, { this: Actor, structureReturn: true });
Actor.prototype.getDimension = procHacker.js("?getDimension@Actor@@QEBAAEAVDimension@@XZ", Dimension, { this: Actor });
Actor.prototype.getDimensionId = procHacker.js("?getDimensionId@Actor@@QEBA?AV?$AutomaticID@VDimension@@H@@XZ", int32_t, { this: Actor, structureReturn: true });
Actor.prototype.getActorIdentifier = procHacker.js("?getActorIdentifier@Actor@@QEBAAEBUActorDefinitionIdentifier@@XZ", ActorDefinitionIdentifier, { this: Actor });
Actor.prototype.getCommandPermissionLevel = procHacker.js("?getCommandPermissionLevel@Actor@@UEBA?AW4CommandPermissionLevel@@XZ", int32_t, { this: Actor });
Actor.prototype.getCarriedItem = procHacker.js("?getCarriedItem@Actor@@UEBAAEBVItemStack@@XZ", ItemStack, { this: Actor });
Actor.prototype.setCarriedItem = procHacker.jsv("??_7Actor@@6B@", "?setCarriedItem@Actor@@UEAAXAEBVItemStack@@@Z", void_t, { this: Actor }, ItemStack); // Actor::setCarriedItem Agent::setCarriedItem Player::setCarriedItem
// 1.26 keeps no out-of-line getOffhandSlot. The 2024 body (0x19b4260) is the whole definition:
// `addq $8, %rcx` (Actor::ctxbase), call ActorEquipment::getHandContainer, `movl $1, %edx`, then
// tail-jump [vftable + 56] -- slot 7, Container::getItem, which is slot 7 on 2024, 1.26.40.8 and
// 1.26.51.1 alike. docs/findings-containers.md
Actor.prototype.getOffhandSlot = derived(
    "?getOffhandSlot@Actor@@QEBAAEBVItemStack@@XZ",
    function getOffhandSlot(this: Actor): ItemStack {
        return this.getHandContainer().getItem(1);
    },
    () => procHacker.js("?getOffhandSlot@Actor@@QEBAAEBVItemStack@@XZ", ItemStack, { this: Actor }),
);
Actor.prototype.setOffhandSlot = procHacker.js("?setOffhandSlot@Actor@@UEAAXAEBVItemStack@@@Z", void_t, { this: Actor }, ItemStack);

@nativeClass()
class TeleportRotationData extends NativeClass {
    @nativeField(RelativeFloat)
    rx: RelativeFloat;
    @nativeField(RelativeFloat)
    ry: RelativeFloat;
    @nativeField(Vec2)
    pos: Vec2;
}

const TeleportCommand$computeTarget = procHacker.js(
    "?computeTarget@TeleportCommand@@SA?AVTeleportTarget@@AEAVActor@@VVec3@@PEAV4@V?$AutomaticID@VDimension@@H@@AEBV?$optional@VRotationData@RotationCommandUtils@@@std@@H@Z",
    void_t,
    null,
    StaticPointer,
    Actor,
    Vec3,
    Vec3,
    int32_t,
    CxxOptionalToUndefUnion.make(TeleportRotationData),
    int32_t,
);
const TeleportCommand$applyTarget = procHacker.js("?applyTarget@TeleportCommand@@SAXAEAVActor@@VTeleportTarget@@_N@Z", void_t, null, Actor, StaticPointer, bool_t);
Actor.prototype.teleport = function (pos: Vec3, dimensionId: DimensionId = DimensionId.Overworld, facePosition: Vec3 | null = null) {
    const target = new AllocatedPointer(0x80);
    const unknownParam = false;
    TeleportCommand$computeTarget(target, this, pos, facePosition, dimensionId, undefined, 0); // it allocates `target`
    TeleportCommand$applyTarget(this, target, unknownParam); // it deletes `target`
};
Actor.prototype.getArmor = procHacker.js("?getArmor@Actor@@QEBAAEBVItemStack@@W4ArmorSlot@@@Z", ItemStack, { this: Actor }, int32_t);

const Actor$hasType = (Actor.prototype.hasType = procHacker.js("?hasType@Actor@@QEBA_NW4ActorType@@@Z", bool_t, { this: Actor }, int32_t));
Actor.prototype.isType = procHacker.js("?isType@Actor@@QEBA_NW4ActorType@@@Z", bool_t, { this: Actor }, int32_t);

Actor.prototype.kill = procHacker.jsv("??_7Actor@@6B@", "?kill@Actor@@UEAAXXZ", void_t, { this: Actor });
Actor.prototype.die = procHacker.jsv("??_7Actor@@6B@", "?die@Actor@@UEAAXAEBVActorDamageSource@@@Z", void_t, { this: Actor }, ActorDamageSource);
Actor.prototype.setSneaking = procHacker.js("?setSneaking@Actor@@UEAAX_N@Z", void_t, { this: Actor }, bool_t);
// 1.26 has no out-of-line Actor::getHealth / Actor::getMaxHealth: both are free functions over the
// entity's EntityContext, the same shape ActorEquipment already has here. (docs/findings-components.md)
namespace ActorAttribute {
    export function getHealth(context: EntityContext): number {
        abstract();
    }
    export function getMaxHealth(context: EntityContext): number {
        abstract();
    }
}
ActorAttribute.getHealth = procHacker.js("?getHealth@ActorAttribute@@YAHAEBVEntityContext@@@Z", int32_t, null, EntityContext);
ActorAttribute.getMaxHealth = procHacker.js("?getMaxHealth@ActorAttribute@@YAHAEBVEntityContext@@@Z", int32_t, null, EntityContext);
Actor.prototype.getHealth = function () {
    return ActorAttribute.getHealth(this.ctxbase);
};
Actor.prototype.getMaxHealth = function () {
    return ActorAttribute.getMaxHealth(this.ctxbase);
};
// 1.26 gave Actor::startRiding a third argument: a bool that, when set, skips the virtual
// canAddPassenger call on the vehicle that 2024 made unconditionally (docs/findings-riding.md). The
// 2024 decoration would hand makefunc a two-argument prototype for a three-argument function, so the
// address ships under the 1.26 name and bdsx's one-argument API passes the bool 2024 behaved as.
const Actor$startRiding = procHacker.jsv("??_7Actor@@6B@", "?startRiding@Actor@@UEAA_NAEAV1@_N@Z", bool_t, { this: Actor }, Actor, bool_t);
Actor.prototype.startRiding = function startRiding(this: Actor, ride: Actor): boolean {
    return Actor$startRiding.call(this, ride, false);
};

const Actor$save = procHacker.js("?save@Actor@@UEBA_NAEAVCompoundTag@@@Z", bool_t, { this: Actor }, CompoundTag);
Actor.prototype.save = function (tag?: CompoundTag): any {
    if (tag != null) {
        return Actor$save.call(this, tag);
    } else {
        tag = CompoundTag.allocate();
        Actor$save.call(this, tag);
        const nbt = tag.value();
        tag.dispose();
        return nbt;
    }
};

const Actor$getTags = procHacker.js(
    "?getTags@Actor@@QEBA?BV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@XZ",
    CxxVector$string,
    { this: Actor, structureReturn: true },
);
Actor.prototype.getTags = function () {
    const tags: CxxVector<CxxString> = Actor$getTags.call(this);
    const out = tags.toArray();
    tags.destruct();
    return out;
};

const VirtualCommandOrigin$VirtualCommandOrigin = procHacker.js(
    "??0VirtualCommandOrigin@@QEAA@AEBVCommandOrigin@@AEAVActor@@AEBVCommandPositionFloat@@H@Z",
    void_t,
    null,
    VirtualCommandOrigin,
    CommandOrigin,
    Actor,
    CommandPositionFloat,
    int32_t,
);
Actor.prototype.runCommand = function (
    command: string,
    mute: CommandResultType = true,
    permissionLevel: CommandPermissionLevel = CommandPermissionLevel.Operator,
): CommandResult<CommandResult.Any> {
    const actorPos = CommandUtils.getFeetPos(this);
    const cmdPos = CommandPositionFloat.create(actorPos.x, false, actorPos.y, false, actorPos.z, false, false);

    const serverOrigin = ServerCommandOrigin.constructWith("Server", this.getLevel() as ServerLevel, permissionLevel, this.getDimension());
    const origin = VirtualCommandOrigin.constructWith(serverOrigin, this, cmdPos);
    serverOrigin.destruct(); // serverOrigin will be cloned.

    const result = executeCommandWithOutput(command, origin, mute);
    origin.destruct();
    return result;
};

@nativeClass()
class DefaultDataLoaderHelper extends NativeClass {
    static readonly vftable = proc["??_7DefaultDataLoadHelper@@6B@"];
    @nativeField(VoidPointer)
    vftable: VoidPointer;

    [NativeType.ctor](): void {
        this.vftable = DefaultDataLoaderHelper.vftable;
    }

    static create(): DefaultDataLoaderHelper {
        const v = new DefaultDataLoaderHelper(true);
        v.vftable = DefaultDataLoaderHelper.vftable;
        return v;
    }
}
const Actor$readAdditionalSaveData = procHacker.jsv(
    "??_7Actor@@6B@",
    "?readAdditionalSaveData@Actor@@MEAAXAEBVCompoundTag@@AEAVDataLoadHelper@@@Z",
    void_t,
    { this: Actor },
    CompoundTag,
    DefaultDataLoaderHelper,
);
Actor.prototype.readAdditionalSaveData = function (tag: CompoundTag | NBT.Compound): void {
    if (tag instanceof Tag) {
        Actor$readAdditionalSaveData.call(this, tag, DefaultDataLoaderHelper.create());
    } else {
        tag = NBT.allocate(tag) as CompoundTag;
        Actor$readAdditionalSaveData.call(this, tag, DefaultDataLoaderHelper.create());
        tag.dispose();
    }
};

const Actor$load = procHacker.js("?load@Actor@@UEAA_NAEBVCompoundTag@@AEAVDataLoadHelper@@@Z", void_t, { this: Actor }, CompoundTag, DefaultDataLoaderHelper);
Actor.prototype.load = function (tag: CompoundTag | NBT.Compound): void {
    if (tag instanceof Tag) {
        Actor$load.call(this, tag, DefaultDataLoaderHelper.create());
    } else {
        tag = NBT.allocate(tag) as CompoundTag;
        Actor$load.call(this, tag, DefaultDataLoaderHelper.create());
        tag.dispose();
    }
};

// 1.26: Actor::hurt(ActorDamageSource const&, float, P const&) returning an ActorHurtResult through a
// hidden pointer, where P is HurtEffectsSettings, the 24-byte struct Mob::_hurt takes (Endstone's
// hurt_effects_settings.h: knockback at +0, ignition at +1, receive_damage at +2, an optional<Vec3>
// aim direction at +4 whose engaged flag is at +16, and an extra knockback power at +20; see
// event_impl/entityevent.ts). The result: a variant<bool, float> -- value at +0, index at +4 -- and an
// allow-knockback flag at +8; "was hurt" is the bool when the variant holds one and true when it holds
// the damage dealt. Actor::hurt reads that index and calls the bad_variant_access thrower (an int3,
// exit 0x80000003) on anything but 0 or 1, so the struct has to be the shape the callee expects.
// receive_damage is the field 2024 did not have. BDS's own caller (1.26.40.8 0x82e6010) writes only
// the first two bytes as a word, the engaged flag at +16 and the extra power at +20, and leaves
// +2..+15 as stack garbage -- and the struct the entityHurt hook is handed carries a non-zero +2 on
// both builds, so that is what bdsx writes. It is not load-bearing: Mob::_hurt called directly with
// +2 = 0 still dealt the damage (q2hu40/q2hu51). What was fatal was the source, not this struct.
(Actor.prototype as any).hurt_ =
    "bdsx:Actor::hurt" in proc
        ? (() => {
              const hurt = procHacker.js("bdsx:Actor::hurt", StaticPointer, { this: Actor }, StaticPointer, ActorDamageSource, float32_t, StaticPointer);
              return function (this: Actor, source: ActorDamageSource, damage: number, knock: boolean, ignite: boolean): boolean {
                  const result = new AllocatedPointer(16);
                  result.fill(0, 16);
                  const params = new AllocatedPointer(24);
                  params.fill(0, 24);
                  params.setBoolean(knock, 0);
                  params.setBoolean(ignite, 1);
                  params.setBoolean(true, 2);
                  hurt.call(this, result, source, damage, params);
                  return result.getUint8(4) === 0 ? result.getUint8(0) !== 0 : true;
              };
          })()
        : procHacker.js("?hurt@Actor@@QEAA_NAEBVActorDamageSource@@M_N1@Z", bool_t, { this: Actor }, ActorDamageSource, float32_t, bool_t, bool_t);

// Actor::getStatusFlag / setStatusFlag (docs/findings-synched.md, "The status flags"). Both were
// virtual in 2024; 1.26's Actor slot 0 is hasComponent and neither name exists in either build. The
// bitset moved out of SynchedActorData into an ECS component, ActorDataFlagComponent, whose pointer
// the wrapper caches at +8 -- so a read is a pointer hop and three instructions, and a write goes to
// SynchedActorDataAccess::setActorFlag, the one out-of-line function in the image that touches the
// bitset (it also sets the right ActorDataIDs dirty bit, which a hand-written write would have to
// reproduce for three ranges).
namespace SynchedActorDataAccess {
    export function setActorFlag(context: EntityContext, flag: ActorFlags, value: boolean): void {
        abstract();
    }
}
SynchedActorDataAccess.setActorFlag = procHacker.js(
    "?setActorFlag@SynchedActorDataAccess@@YAXAEAVEntityContext@@W4ActorFlags@@_N@Z",
    void_t,
    null,
    EntityContext,
    int32_t,
    bool_t,
);
{
    /** ActorDataFlagComponent*, cached in the wrapper; its bitset is 64-bit words at the component's +0 */
    const FLAG_DATA = pdbcache.layouts.SynchedActorDataEntityWrapper?.flagData ?? 8;
    const flagBits = (self: Actor): StaticPointer | null => {
        const w = self.getEntityData() as any as StaticPointer;
        if (w.isNull()) return null;
        const p = w.getPointer(FLAG_DATA);
        return p.isNull() ? null : p;
    };
    Actor.prototype.getStatusFlag = derived(
        "?getStatusFlag@Actor@@UEBA_NW4ActorFlags@@@Z",
        function getStatusFlag(this: Actor, flag: ActorFlags): boolean {
            const bits = flagBits(this);
            if (bits === null) return false;
            return ((bits.getUint32((flag >>> 5) * 4) >>> (flag & 31)) & 1) !== 0;
        },
        () => procHacker.js("?getStatusFlag@Actor@@UEBA_NW4ActorFlags@@@Z", bool_t, { this: Actor }, int32_t),
    );
    Actor.prototype.setStatusFlag = derived(
        "?setStatusFlag@Actor@@UEAAXW4ActorFlags@@_N@Z",
        function setStatusFlag(this: Actor, flag: ActorFlags, value: boolean): void {
            SynchedActorDataAccess.setActorFlag(this.ctxbase, flag, value);
        },
        () => procHacker.js("?setStatusFlag@Actor@@UEAAXW4ActorFlags@@_N@Z", void_t, { this: Actor }, int32_t, bool_t),
    );

    // The one-line flag getters. Each 2024 body is `movq (%rcx),%rax; movl $<flag>,%edx;
    // movq (%rax),%rax; jmp [guard]` and nothing else, so the flag number is an immediate in the
    // 2024 image -- those 44 immediates are where the corrected ActorFlags came from
    // (docs/findings-synched.md), and Endstone's actor_flags.h agrees with every one of them.
    // 1.26 keeps no out-of-line copy of any of them.
    Actor.prototype.isSneaking = derived(
        "?isSneaking@Actor@@QEBA_NXZ",
        function isSneaking(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.Sneaking);
        },
        () => procHacker.js("?isSneaking@Actor@@QEBA_NXZ", bool_t, { this: Actor }, void_t),
    );
    Actor.prototype.isMoving = derived(
        "?isMoving@Actor@@QEBA_NXZ",
        function isMoving(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.Moving);
        },
        () => procHacker.js("?isMoving@Actor@@QEBA_NXZ", bool_t, { this: Actor }, void_t),
    );
    Actor.prototype.isAngry = derived(
        "?isAngry@Actor@@QEBA_NXZ",
        function isAngry(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.Angry);
        },
        () => procHacker.js("?isAngry@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
    );
    Actor.prototype.isSwimming = derived(
        "?isSwimming@Actor@@QEBA_NXZ",
        function isSwimming(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.Swimming);
        },
        () => procHacker.js("?isSwimming@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
    );
    Actor.prototype.isInScaffolding = derived(
        "?isInScaffolding@Actor@@QEBA_NXZ",
        function isInScaffolding(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.InScaffolding);
        },
        () => procHacker.js("?isInScaffolding@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
    );
    Actor.prototype.isInLove = derived(
        "?isInLove@Actor@@QEBA_NXZ",
        function isInLove(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.InLove);
        },
        () => procHacker.js("?isInLove@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
    );
    Actor.prototype.isBaby = derived(
        "?isBaby@Actor@@QEBA_NXZ",
        function isBaby(this: Actor): boolean {
            return this.getStatusFlag(ActorFlags.Baby);
        },
        () => procHacker.js("?isBaby@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
    );
    Mob.prototype.isSprinting = derived(
        "?isSprinting@Mob@@QEBA_NXZ",
        function isSprinting(this: Mob): boolean {
            return this.getStatusFlag(ActorFlags.Sprinting);
        },
        () => procHacker.js("?isSprinting@Mob@@QEBA_NXZ", bool_t, { this: Mob }),
    );
}

Actor.prototype.getLevel = procHacker.js("?getLevel@Actor@@QEAAAEAVLevel@@XZ", Level, { this: Actor });

Actor.prototype.isAlive = procHacker.js("?isAlive@Actor@@UEBA_NXZ", bool_t, {
    this: Actor,
});
Actor.prototype.isInvisible = procHacker.js("?isInvisible@Actor@@UEBA_NXZ", bool_t, { this: Actor });
// --- EnTT component lookup, and the riding family on top of it (docs/findings-riding.md) ---
// 1.26 has no out-of-line Actor::getVehicle / isRiding / isPassenger at all: every caller inlined the
// component lookup, and the ActorRiding free functions those bodies called in 2024 were leaves the
// inliner took with them. What survived is the lookup itself, and it is the same instructions in every
// one of them -- Actor::getEntityTypeId, Actor::getRuntimeID and Player::getAbilities differ only in the
// component's size -- so bdsx walks it here, over offsets the table ships as layouts.EnTTRegistry.
// The label is entt::type_hash, which in these builds is FNV-1a-32 of the bare component name
// (docs/findings-components.md): fnv1a("PassengerComponent") = 0x98e40c0e on both 1.26 builds.
const EnTT$layout = pdbcache.layouts.EnTTRegistry ?? {};
const ENTT_POOLS_BEGIN = EnTT$layout.poolsBegin ?? 72;
const ENTT_POOLS_END = EnTT$layout.poolsEnd ?? 80;
const ENTT_NODES = EnTT$layout.nodes ?? 104;
const ENTT_NODES_END = EnTT$layout.nodesEnd ?? 112;
const ENTT_NODE_STRIDE = EnTT$layout.nodeStride ?? 32;
const ENTT_NODE_HASH = EnTT$layout.nodeHash ?? 8;
const ENTT_NODE_STORAGE = EnTT$layout.nodeStorage ?? 16;
const ENTT_SPARSE_BEGIN = EnTT$layout.sparseBegin ?? 8;
const ENTT_SPARSE_END = EnTT$layout.sparseEnd ?? 16;
const ENTT_PACKED = EnTT$layout.packed ?? 80;
const ENTT_ENTITY_BITS = EnTT$layout.entityBits ?? 18; // entt::entity: 18 index bits, the rest version
const ENTT_SPARSE_PAGE_BITS = EnTT$layout.sparsePageBits ?? 11; // 2048 entries per sparse page
const ENTT_PACKED_PAGE_BITS = EnTT$layout.packedPageBits ?? 7; // 128 elements per packed page
const ENTT_ENTITY_MASK = (1 << ENTT_ENTITY_BITS) - 1;
const ACTOR_ENTT_REGISTRY = pdbcache.layouts.Actor?.enttRegistry ?? 16;
const ACTOR_ENTITY_ID = pdbcache.layouts.Actor?.entityId ?? 24;

function enttTypeHash(component: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < component.length; i++) {
        h = Math.imul((h ^ component.charCodeAt(i)) >>> 0, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** an index a dense_map bucket or node holds; entt's null is all ones */
function enttIndex(p: StaticPointer, offset: number): number | null {
    const low = p.getUint32(offset);
    const high = p.getUint32(offset + 4);
    if (low === 0xffffffff && high === 0xffffffff) return null;
    return high * 0x100000000 + low;
}

/** the storage (pool) a registry keeps for one component type, or null when it has none */
function enttStorage(registry: StaticPointer, hash: number): StaticPointer | null {
    const begin = registry.getPointer(ENTT_POOLS_BEGIN);
    const buckets = registry.getPointer(ENTT_POOLS_END).subptr(begin) >> 3;
    if (buckets <= 0) return null;
    const nodes = registry.getPointer(ENTT_NODES);
    const end = registry.getPointer(ENTT_NODES_END);
    let index = enttIndex(begin, (((buckets - 1) & hash) >>> 0) * 8);
    for (let hops = 0; index !== null && hops < 1024; hops++) {
        const node = nodes.add(index * ENTT_NODE_STRIDE);
        if (node.getUint32(ENTT_NODE_HASH) === hash) {
            return node.equalsptr(end) ? null : node.getNullablePointer(ENTT_NODE_STORAGE);
        }
        index = enttIndex(node, 0);
    }
    return null;
}

/**
 * The slot an actor occupies in one component's sparse set, or null when it holds none.
 *
 * This is the whole of `ctx.hasComponent<T>()`: 1.26's inlined copies stop right here, and for a
 * flag component -- an empty type, which entt stores with no payload at all -- there is nothing
 * after it to read. `enttComponent` below goes on to the payload for the component types that
 * have one.
 */
function enttSlot(actor: Actor, hash: number): number | null {
    const self = actor as unknown as StaticPointer;
    const registry = self.getNullablePointer(ACTOR_ENTT_REGISTRY);
    if (registry === null) return null;
    const entity = self.getUint32(ACTOR_ENTITY_ID);
    const storage = enttStorage(registry, hash);
    if (storage === null) return null;
    const index = entity & ENTT_ENTITY_MASK;
    const sparseBegin = storage.getPointer(ENTT_SPARSE_BEGIN);
    const page = index >>> ENTT_SPARSE_PAGE_BITS;
    if (page >= storage.getPointer(ENTT_SPARSE_END).subptr(sparseBegin) >> 3) return null;
    const sparse = sparseBegin.getNullablePointer(page * 8);
    if (sparse === null) return null;
    const entry = sparse.getUint32((index & ((1 << ENTT_SPARSE_PAGE_BITS) - 1)) * 4);
    if (((entry ^ entity) & ~ENTT_ENTITY_MASK) !== 0) return null; // a stale version is not this entity
    if ((entry & ENTT_ENTITY_MASK) === ENTT_ENTITY_MASK) return null; // entt::null
    return entry & ENTT_ENTITY_MASK;
}

/** whether an actor holds a component at all -- the only thing a flag component can be asked */
function enttHas(actor: Actor, hash: number): boolean {
    return enttSlot(actor, hash) !== null;
}

/** the component an actor holds, by the component's type hash, or null when it holds none */
function enttComponent(actor: Actor, hash: number, size: number): StaticPointer | null {
    const self = actor as unknown as StaticPointer;
    const registry = self.getNullablePointer(ACTOR_ENTT_REGISTRY);
    if (registry === null) return null;
    const slot = enttSlot(actor, hash);
    if (slot === null) return null;
    const storage = enttStorage(registry, hash);
    if (storage === null) return null;
    const entry = slot;
    const packed = storage.getPointer(ENTT_PACKED).getNullablePointer(((entry & ENTT_ENTITY_MASK) >>> ENTT_PACKED_PAGE_BITS) * 8);
    if (packed === null) return null;
    return packed.add((entry & ((1 << ENTT_PACKED_PAGE_BITS) - 1)) * size);
}

// PassengerComponent is one StrictActorIDEntityContextPair (the vehicle); VehicleComponent is a vector of
// them (the passengers). Both are Endstone's headers and both are what the 2024 bodies read: 2024's
// ActorRiding::getVehicleID returns *(component + 8), the pair's ActorUniqueID.
const PASSENGER_COMPONENT_HASH = enttTypeHash("PassengerComponent");
const VEHICLE_COMPONENT_HASH = enttTypeHash("VehicleComponent");
const Passenger$layout = pdbcache.layouts.PassengerComponent ?? {};
const PASSENGER_COMPONENT_SIZE = Passenger$layout.size ?? 16;
const PASSENGER_VEHICLE_ID = Passenger$layout.vehicleActorId ?? 8;
const Vehicle$layout = pdbcache.layouts.VehicleComponent ?? {};
const VEHICLE_COMPONENT_SIZE = Vehicle$layout.size ?? 24;
const VEHICLE_PASSENGERS = Vehicle$layout.passengers ?? 0;
const RIDER_PAIR_STRIDE = Vehicle$layout.passengerStride ?? 16;
const RIDER_PAIR_ID = Vehicle$layout.passengerActorId ?? 8;

Actor.prototype.getVehicle = derived(
    "?getVehicle@Actor@@QEBAPEAV1@XZ",
    function getVehicle(this: Actor): Actor | null {
        const component = enttComponent(this, PASSENGER_COMPONENT_HASH, PASSENGER_COMPONENT_SIZE);
        if (component === null) return null;
        const id = component.getBin64(PASSENGER_VEHICLE_ID);
        if (id === ACTOR_UNIQUE_ID_NONE) return null;
        return bedrockServer.level.fetchEntity(id, false);
    },
    () => procHacker.js("?getVehicle@Actor@@QEBAPEAV1@XZ", Actor, { this: Actor }),
);
// 2024's body is exactly this: getVehicle() != nullptr (0x19ba440 is a call, a test and a setne)
(Actor.prototype as any)._isRiding = derived(
    "?isRiding@Actor@@QEBA_NXZ",
    function _isRiding(this: Actor): boolean {
        return this.getVehicle() !== null;
    },
    () => procHacker.js("?isRiding@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
);
// and 2024's isRiding(Actor*) walks the vehicle chain upwards comparing with the argument
(Actor.prototype as any)._isRidingOn = derived(
    "?isRiding@Actor@@QEBA_NPEAV1@@Z",
    function _isRidingOn(this: Actor, entity: Actor): boolean {
        let vehicle = this.getVehicle();
        for (let hops = 0; vehicle !== null && hops < 16; hops++) {
            if (vehicle.equalsptr(entity)) return true;
            vehicle = vehicle.getVehicle();
        }
        return false;
    },
    () => procHacker.js("?isRiding@Actor@@QEBA_NPEAV1@@Z", bool_t, { this: Actor }, Actor),
);
// 2024's isPassenger asks the other way round: ActorRiding::getPassengers(this) contains the argument --
// `this` is the vehicle. 2024 compares Actor::getOrCreateUniqueID with each pair's id; bdsx resolves each
// id through Level::fetchEntity and compares the actor instead, which is the same answer through a
// function this table has confirmed by execution.
(Actor.prototype as any)._isPassenger = derived(
    "?isPassenger@Actor@@QEBA_NAEBV1@@Z",
    function _isPassenger(this: Actor, ride: Actor): boolean {
        const component = enttComponent(this, VEHICLE_COMPONENT_HASH, VEHICLE_COMPONENT_SIZE);
        if (component === null) return false;
        const begin = component.getPointer(VEHICLE_PASSENGERS);
        const count = component.getPointer(VEHICLE_PASSENGERS + 8).subptr(begin) / RIDER_PAIR_STRIDE;
        if (!(count > 0)) return false;
        for (let i = 0; i < count && i < 64; i++) {
            const id = begin.getBin64(i * RIDER_PAIR_STRIDE + RIDER_PAIR_ID);
            if (id === ACTOR_UNIQUE_ID_NONE) continue;
            const passenger = bedrockServer.level.fetchEntity(id, false);
            if (passenger !== null && passenger.equalsptr(ride)) return true;
        }
        return false;
    },
    () => procHacker.js("?isPassenger@Actor@@QEBA_NAEBV1@@Z", bool_t, { this: Actor }, Actor),
);
Actor.prototype.setVelocity = procHacker.js("?setVelocity@Actor@@QEAAXAEBVVec3@@@Z", void_t, { this: Actor }, Vec3);
// 2024's Actor::isInWater is two instructions -- `add rcx,8; jmp ActorEnvironment::getIsInWater` --
// and that callee is `ctx.hasComponent<WasInWaterFlagComponent>()`. 1.26 has neither out of line,
// but it left the lookup inlined in Actor::isInWaterOrRain, where fnv1a("WasInWaterFlagComponent")
// = 0x78e89f39 is the immediate in front of the rain test that function ends with -- so the name of
// the component is read out of the binary (tools/entt-typenames.mjs) and then confirmed at the one
// place 1.26 still spells the whole thing out (docs/findings-weather.md).
const WAS_IN_WATER_COMPONENT_HASH = enttTypeHash("WasInWaterFlagComponent");
Actor.prototype.isInWater = derived(
    "?isInWater@Actor@@QEBA_NXZ",
    function isInWater(this: Actor): boolean {
        return enttHas(this, WAS_IN_WATER_COMPONENT_HASH);
    },
    () => procHacker.js("?isInWater@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
);

namespace ActorEquipment {
    export function getArmorContainer(context: EntityContext): SimpleContainer {
        abstract();
    }
    export function getHandContainer(context: EntityContext): SimpleContainer {
        abstract();
    }
}
ActorEquipment.getArmorContainer = procHacker.js(
    "?getArmorContainer@ActorEquipment@@YAAEBVSimpleContainer@@AEBVEntityContext@@@Z",
    SimpleContainer,
    null,
    EntityContext,
);
ActorEquipment.getHandContainer = procHacker.js(
    "?getHandContainer@ActorEquipment@@YAAEAVSimpleContainer@@AEAVEntityContext@@@Z",
    SimpleContainer,
    null,
    EntityContext,
);
Actor.prototype.getArmorContainer = function () {
    return ActorEquipment.getArmorContainer(this.ctxbase);
};
Actor.prototype.getHandContainer = function () {
    return ActorEquipment.getHandContainer(this.ctxbase);
};

Actor.fromUniqueIdBin = function (bin, getRemovedActor = true) {
    return bedrockServer.level.fetchEntity(bin, getRemovedActor);
};

Actor.prototype.addEffect = procHacker.js("?addEffect@Actor@@QEAAXAEBVMobEffectInstance@@@Z", void_t, { this: Actor }, MobEffectInstance);
Actor.prototype.removeEffect = procHacker.js("?removeEffect@Actor@@QEAAXH@Z", void_t, { this: Actor }, int32_t);
// 1.26 keeps no out-of-line hasEffect: the 2024 build's was a 20-byte thunk (call getEffect; test; setne)
// and the inliner removed it. The definition is exactly that thunk, so bdsx carries it -- and the address
// propagation had given the name is the getEffect(unsigned int) overload, which returns a pointer.
(Actor.prototype as any)._hasEffect = derived(
    "?hasEffect@Actor@@QEBA_NAEBVMobEffect@@@Z",
    function _hasEffect(this: Actor, mobEffect: MobEffect): boolean {
        return (this as any)._getEffect(mobEffect) !== null;
    },
    () => procHacker.js("?hasEffect@Actor@@QEBA_NAEBVMobEffect@@@Z", bool_t, { this: Actor }, MobEffect),
);
(Actor.prototype as any)._getEffect = procHacker.js("?getEffect@Actor@@QEBAPEBVMobEffectInstance@@AEBVMobEffect@@@Z", MobEffectInstance, { this: Actor }, MobEffect);
Actor.prototype.removeAllEffects = procHacker.js("?removeAllEffects@Actor@@QEAAXXZ", void_t, { this: Actor });
Actor.prototype.setOnFire = function (seconds: number) {
    OnFireSystem.setOnFire(this, seconds);
};
Actor.prototype.setOnFireNoEffects = function (seconds: number) {
    OnFireSystem.setOnFireNoEffects(this, seconds);
};
Actor.prototype.getEquippedTotem = procHacker.js("?getEquippedTotem@Actor@@UEBAAEBVItemStack@@XZ", ItemStack, { this: Actor });
Actor.prototype.consumeTotem = procHacker.js("?consumeTotem@Actor@@UEAA_NXZ", bool_t, { this: Actor });
// `Actor::hasTotemEquipped` is `!getEquippedTotem().isNull()` and nothing else: the 2024 body
// (0x19b7020) calls the virtual getEquippedTotem through vftable+680, passes the result to
// ItemStackBase::isNull and returns `sete` of it. Both of those resolve on both builds, so the
// address buys nothing (docs/findings-utils.md).
Actor.prototype.hasTotemEquipped = derived(
    "?hasTotemEquipped@Actor@@QEBA_NXZ",
    function hasTotemEquipped(this: Actor): boolean {
        return !this.getEquippedTotem().isNull();
    },
    () => procHacker.js("?hasTotemEquipped@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
);
(Actor.prototype as any).hasFamily_ = procHacker.js("?hasFamily@Actor@@QEBA_NAEBVHashedString@@@Z", bool_t, { this: Actor }, HashedString);
// `?distanceTo@Actor@@` and `?getSpeedInMetersPerSecond@Actor@@` are the same two reads: 2024 takes
// the StateVectorComponent* at Actor+656 and works on `pos` (+0) and, for the speed, `pos_prev` (+12).
// 1.26 has no out-of-line copy of either, and it does not need one -- that pointer is Actor+536 here,
// which is exactly what the execution-confirmed `?getPosition@Actor@@` accessor returns, and Endstone's
// state_vector_component.h keeps pos / pos_prev / pos_delta at +0 / +12 / +24. The speed is the distance
// the actor moved in one tick times 20 ticks per second, the constant 2024 multiplies by.
// docs/findings-layouts.md, "The state vector".
const ACTOR_STATE_VECTOR = 536; // the 2024 fallback is a different offset, so there is no useful literal
function actorStateVector(actor: Actor): StaticPointer {
    return (actor as unknown as StaticPointer).getPointer(pdbcache.layouts.Actor?.stateVector ?? ACTOR_STATE_VECTOR);
}
function length3(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
}
Actor.prototype.distanceTo = derived(
    "?distanceTo@Actor@@QEBAMAEBVVec3@@@Z",
    function distanceTo(this: Actor, to: Vec3): number {
        const from = this.getPosition();
        return length3(from.x - to.x, from.y - to.y, from.z - to.z);
    },
    () => procHacker.js("?distanceTo@Actor@@QEBAMAEBVVec3@@@Z", float32_t, { this: Actor }, Vec3),
);
// Actor's last-hurt block (docs/findings-layouts.md, "The last-hurt block"). 1.26 keeps every field and
// no getter at all: six of the nine ship as symbols.json `accessors`, and the three that name another
// actor are an ActorUniqueID, not a pointer, so the getter is one Level::fetchEntity over the id -- which
// both builds resolve. -1 is the empty id. The real bodies also write -1 back when the fetch fails; that
// is a cache detail BDS's own Actor::baseTick does anyway, so bdsx leaves the field alone.
// The fallbacks are the 2024 offsets; the 1.26 block was reordered, so no constant delta carries them.
const ACTOR_LAST_HURT: Record<string, number> = { lastHurtMobId: 944, lastHurtByMobId: 952, lastHurtByPlayerId: 960, lastHitByPlayerTime: 392 };
function actorLastHurtOffset(member: string): number {
    return pdbcache.layouts.Actor?.[member] ?? ACTOR_LAST_HURT[member];
}
const ACTOR_UNIQUE_ID_NONE = bin.make64(0xffffffff, 0xffffffff);
function lastHurtActor(actor: Actor, member: string): Actor | null {
    const id = (actor as unknown as StaticPointer).getBin64(actorLastHurtOffset(member));
    if (id === ACTOR_UNIQUE_ID_NONE) return null;
    return bedrockServer.level.fetchEntity(id, false);
}
Actor.prototype.getLastHurtByMob = derived(
    "?getLastHurtByMob@Actor@@QEAAPEAVMob@@XZ",
    function getLastHurtByMob(this: Actor): Mob | null {
        return lastHurtActor(this, "lastHurtByMobId") as Mob | null;
    },
    () => procHacker.js("?getLastHurtByMob@Actor@@QEAAPEAVMob@@XZ", Mob, { this: Actor }),
);
Actor.prototype.getLastHurtCause = procHacker.js("?getLastHurtCause@Actor@@QEBA?AW4ActorDamageCause@@XZ", int32_t, { this: Actor });
// `?getLastHurtDamage@Actor@@QEBAMXZ`: M is float, the 2024 body is `movss 980(%rcx), %xmm0` and 1.26's
// writer in Mob::hurtEffects is `movss %xmm0, 0x344(%rsi)`. bdsx has declared it int32_t since 2024 --
// an upstream bug: an int return makes makefunc read eax, which holds nothing the function wrote.
Actor.prototype.getLastHurtDamage = procHacker.js("?getLastHurtDamage@Actor@@QEBAMXZ", float32_t, { this: Actor });
Actor.prototype.getLastHurtMob = derived(
    "?getLastHurtMob@Actor@@QEAAPEAVMob@@XZ",
    function getLastHurtMob(this: Actor): Mob | null {
        return lastHurtActor(this, "lastHurtMobId") as Mob | null;
    },
    () => procHacker.js("?getLastHurtMob@Actor@@QEAAPEAVMob@@XZ", Mob, { this: Actor }),
);
// the 400-tick countdown Actor::setLastHurtByMob starts when the attacker is a player; it cannot be a
// field accessor because bool_t reads the low byte of a value that spends most of its life above 255
Actor.prototype.wasLastHitByPlayer = derived(
    "?wasLastHitByPlayer@Actor@@QEAA_NXZ",
    function wasLastHitByPlayer(this: Actor): boolean {
        return (this as unknown as StaticPointer).getInt32(actorLastHurtOffset("lastHitByPlayerTime")) > 0;
    },
    () => procHacker.js("?wasLastHitByPlayer@Actor@@QEAA_NXZ", bool_t, { this: Actor }),
);
Actor.prototype.getSpeedInMetersPerSecond = derived(
    "?getSpeedInMetersPerSecond@Actor@@QEBAMXZ",
    function getSpeedInMetersPerSecond(this: Actor): number {
        const v = actorStateVector(this);
        return length3(v.getFloat32(0) - v.getFloat32(12), v.getFloat32(4) - v.getFloat32(16), v.getFloat32(8) - v.getFloat32(20)) * 20;
    },
    () => procHacker.js("?getSpeedInMetersPerSecond@Actor@@QEBAMXZ", float32_t, { this: Actor }),
);
(Actor.prototype as any).fetchNearbyActorsSorted_ = procHacker.js(
    "?fetchNearbyActorsSorted@Actor@@QEAA?AV?$vector@UDistanceSortedActor@@V?$allocator@UDistanceSortedActor@@@std@@@std@@AEBVVec3@@W4ActorType@@@Z",
    CxxVector.make(DistanceSortedActor),
    { this: Actor, structureReturn: true },
    Vec3,
    int32_t,
);
Actor.prototype.isCreative = procHacker.js("?isCreative@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isAdventure = procHacker.js("?isAdventure@Actor@@QEBA_NXZ", bool_t, { this: Actor });
// 1.26 keeps no isSurvival of its own (every caller tests the game type inline). The 2024 build's
// isAttackableGamemode is "survival or adventure" through the same two helpers isSurvival and isAdventure
// use, the default game type resolved the same way in each, so survival is what is attackable and not adventure.
Actor.prototype.isSurvival = derived(
    "?isSurvival@Actor@@QEBA_NXZ",
    function isSurvival(this: Actor): boolean {
        return this.isAttackableGamemode() && !this.isAdventure();
    },
    () => procHacker.js("?isSurvival@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
);
Actor.prototype.isSpectator = procHacker.js("?isSpectator@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.remove = procHacker.jsv("??_7Actor@@6B@", "?remove@Actor@@UEAAXXZ", void_t, { this: Actor });
Actor.prototype.isAttackableGamemode = procHacker.js("?isAttackableGamemode@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isInvulnerableTo = procHacker.jsv(
    "??_7Actor@@6B@",
    "?isInvulnerableTo@Actor@@UEBA_NAEBVActorDamageSource@@@Z",
    bool_t,
    { this: Actor },
    ActorDamageSource,
);
const Actor$canSeeEntity = procHacker.js("?canSee@Actor@@QEBA_NAEBV1@@Z", bool_t, null, Actor, Actor);
const Actor$canSeePos = procHacker.js("?canSee@Actor@@QEBA_NAEBVVec3@@@Z", bool_t, null, Actor, Vec3);
Actor.prototype.canSee = function (target) {
    if (target instanceof Actor) {
        return Actor$canSeeEntity(this, target);
    } else {
        return Actor$canSeePos(this, target);
    }
};
const Actor$isValidTarget = procHacker.jsv("??_7ServerPlayer@@6B@", "?isValidTarget@ServerPlayer@@UEBA_NPEAVActor@@@Z", bool_t, { this: Actor }, Actor);
Actor.prototype.isValidTarget = function (source = null) {
    return Actor$isValidTarget.call(this, source);
};
const Actor$canAttack = procHacker.jsv("??_7Actor@@6B@", "?canAttack@Actor@@UEBA_NPEAV1@_N@Z", bool_t, { this: Actor }, Actor, bool_t);
Actor.prototype.canAttack = function (target, unknown = false) {
    return Actor$canAttack.call(this, target, unknown);
};
Actor.prototype.getLastDeathPos = procHacker.jsv("??_7Actor@@6B@", "?getLastDeathPos@Actor@@UEBA?AV?$optional@VBlockPos@@@std@@XZ", CxxOptional.make(BlockPos), {
    this: Actor,
    structureReturn: true,
});
Actor.prototype.getLastDeathDimension = procHacker.jsv(
    "??_7Actor@@6B@",
    "?getLastDeathDimension@Actor@@UEBA?AV?$optional@V?$AutomaticID@VDimension@@H@@@std@@XZ",
    CxxOptional.make(int32_t),
    { this: Actor, structureReturn: true },
);
(Actor.prototype as any)._getViewVector = procHacker.js("?getViewVector@Actor@@QEBA?AVVec3@@M@Z", Vec3, { this: Actor, structureReturn: true }, float32_t);
Actor.prototype.isImmobile = procHacker.jsv("??_7Actor@@6B@", "?isImmobile@Actor@@UEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isInsidePortal = procHacker.js("?isInsidePortal@Actor@@QEBA_NXZ", bool_t, { this: Actor });
// `?hasDimension@Actor@@` is 2024's weak_ptr lock test on the dimension reference (0x19b69f0: a null
// control block or a zero use count is false, otherwise the pointer is checked), and `?isInWorld@Actor@@`
// is `added && hasDimension() && !removed` (0x19b9ac0). 1.26 kept no copy of either. The reference is
// the WeakRef<Dimension> the live-confirmed getDimension accessor reads (+456, control block +464); the
// two bytes are +138 / +617 (docs/findings-layouts.md, "isInWorld and hasDimension").
const ACTOR_WORLD_2024 = { added: 233, removed: 737, dimensionRef: 576 };
function actorHasDimension(actor: Actor): boolean {
    const off = pdbcache.layouts.Actor?.dimensionRef ?? ACTOR_WORLD_2024.dimensionRef;
    const sp = actor as unknown as StaticPointer;
    const rep = sp.getNullablePointer(off + 8);
    if (rep === null || rep.getInt32(8) === 0) return false;
    return sp.getNullablePointer(off) !== null;
}
Actor.prototype.isInWorld = derived(
    "?isInWorld@Actor@@QEBA_NXZ",
    function isInWorld(this: Actor): boolean {
        const l = pdbcache.layouts.Actor ?? {};
        const sp = this as unknown as StaticPointer;
        if (sp.getUint8(l.added ?? ACTOR_WORLD_2024.added) === 0) return false;
        if (!actorHasDimension(this)) return false;
        return sp.getUint8(l.removed ?? ACTOR_WORLD_2024.removed) === 0;
    },
    () => procHacker.js("?isInWorld@Actor@@QEBA_NXZ", bool_t, { this: Actor }),
);
Actor.prototype.isInWaterOrRain = procHacker.js("?isInWaterOrRain@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isInThunderstorm = procHacker.js("?isInThunderstorm@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isInSnow = procHacker.js("?isInSnow@Actor@@QEBA_NXZ", bool_t, {
    this: Actor,
});
Actor.prototype.isInRain = procHacker.js("?isInRain@Actor@@QEBA_NXZ", bool_t, {
    this: Actor,
});
Actor.prototype.isInPrecipitation = procHacker.js("?isInPrecipitation@Actor@@QEBA_NXZ", bool_t, { this: Actor });

Actor.prototype.getLastHurtByPlayer = derived(
    "?getLastHurtByPlayer@Actor@@QEAAPEAVPlayer@@XZ",
    function getLastHurtByPlayer(this: Actor): Player | null {
        return lastHurtActor(this, "lastHurtByPlayerId") as Player | null;
    },
    () => procHacker.js("?getLastHurtByPlayer@Actor@@QEAAPEAVPlayer@@XZ", Player, { this: Actor }),
);
Actor.prototype.getLastHurtByMobTime = procHacker.js("?getLastHurtByMobTime@Actor@@QEAAHXZ", int32_t, { this: Actor });
Actor.prototype.getLastHurtByMobTimestamp = procHacker.js("?getLastHurtByMobTimestamp@Actor@@QEAAHXZ", int32_t, { this: Actor });
Actor.prototype.getLastHurtMobTimestamp = procHacker.js("?getLastHurtMobTimestamp@Actor@@QEAAHXZ", int32_t, { this: Actor });
Actor.prototype.getLastHurtTimestamp = procHacker.js("?getLastHurtTimestamp@Actor@@QEBA_KXZ", uint64_as_float_t, { this: Actor });

namespace ActorMobilityUtils {
    export const shouldApplyLava = procHacker.js(
        "?shouldApplyLava@ActorMobilityUtils@@YA_NAEBVIConstBlockSource@@AEBVEntityContext@@@Z",
        bool_t,
        null,
        BlockSource,
        EntityContext,
    );
}
namespace PlayerMovement {
    export const getInputMode = procHacker.js("?getInputMode@PlayerMovement@@YA?AW4InputMode@@AEBVEntityContext@@@Z", int32_t, null, EntityContext);
}

Actor.prototype.isInLava = function () {
    const blockSource = this.getDimensionBlockSource();
    const context = this.addAs(EntityContext, 8);
    return ActorMobilityUtils.shouldApplyLava(blockSource, context);
};
Actor.prototype.isInContactWithWater = procHacker.js("?isInContactWithWater@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.isInClouds = procHacker.js("?isInClouds@Actor@@QEBA_NXZ", bool_t, { this: Actor });
Actor.prototype.getEntityData = procHacker.js("?getEntityData@Actor@@QEBAAEBVSynchedActorDataEntityWrapper@@XZ", SynchedActorDataEntityWrapper, { this: Actor });
Actor.prototype.getOwner = procHacker.js("?getOwner@Actor@@QEBAPEAVMob@@XZ", Mob, { this: Actor });
Actor.prototype.setOwner = procHacker.js("?setOwner@Actor@@UEAAXUActorUniqueID@@@Z", void_t, { this: Actor }, ActorUniqueID);
Actor.prototype.getVariant = procHacker.js("?getVariant@Actor@@QEBAHXZ", int32_t, { this: Actor });
Actor.prototype.setVariant = procHacker.js("?setVariant@Actor@@QEAAXH@Z", void_t, { this: Actor }, int32_t);
Actor.prototype.setTarget = procHacker.jsv("??_7Actor@@6B@", "?setTarget@Actor@@UEAAXPEAV1@@Z", void_t, { this: Actor }, Actor);
Actor.prototype.playAnimation = function (animation, options = {}) {
    const pk = AnimateEntityPacket.allocate();
    pk.animation = animation;
    pk.nextState = options.nextState ?? "default";
    pk.blendOutTime = options.blendOutTime ?? 0;
    pk.stopExpression = options.stopExpression ?? "query.any_animation_finished";
    pk.stopExpressionVersion = 1;
    pk.controller = options.controller ?? "__runtime_controller";
    pk.runtimeIds.push(this.getRuntimeID());
    const players = options.players ?? bedrockServer.serverInstance.getPlayers();
    for (const player of players) {
        player.sendNetworkPacket(pk);
    }
    pk.dispose();
};

const getProjectileComponent = procHacker.js("??$tryGetComponent@VProjectileComponent@@@Actor@@QEAAPEAVProjectileComponent@@XZ", ProjectileComponent, null, Actor);
const getPhysicsComponent = procHacker.js("??$tryGetComponent@VPhysicsComponent@@@Actor@@QEAAPEAVPhysicsComponent@@XZ", PhysicsComponent, null, Actor);
const getDamageSensorComponent = procHacker.js(
    "??$tryGetComponent@VDamageSensorComponent@@@Actor@@QEBAPEBVDamageSensorComponent@@XZ",
    DamageSensorComponent,
    null,
    Actor,
);
const getCommandBlockComponent = procHacker.js(
    "??$tryGetComponent@VCommandBlockComponent@@@Actor@@QEAAPEAVCommandBlockComponent@@XZ",
    CommandBlockComponent,
    null,
    Actor,
);
const getNameableComponent = procHacker.js("??$tryGetComponent@VNameableComponent@@@Actor@@QEAAPEAVNameableComponent@@XZ", NameableComponent, null, Actor);
const getNavigationComponent = procHacker.js("??$tryGetComponent@VNavigationComponent@@@Actor@@QEAAPEAVNavigationComponent@@XZ", NavigationComponent, null, Actor);
const getNpcComponent = procHacker.js("??$tryGetComponent@VNpcComponent@@@Actor@@QEAAPEAVNpcComponent@@XZ", NpcComponent, null, Actor);
const getRideableComponent = procHacker.js("??$tryGetComponent@VRideableComponent@@@Actor@@QEAAPEAVRideableComponent@@XZ", RideableComponent, null, Actor);
const getContainerComponent = procHacker.js("??$tryGetComponent@VContainerComponent@@@Actor@@QEAAPEAVContainerComponent@@XZ", ContainerComponent, null, Actor);
const getPushableComponent = procHacker.js("??$tryGetComponent@VPushableComponent@@@Actor@@QEAAPEAVPushableComponent@@XZ", PushableComponent, null, Actor);
const getShooterComponent = procHacker.js("??$tryGetComponent@VShooterComponent@@@Actor@@QEAAPEAVShooterComponent@@XZ", ShooterComponent, null, Actor);
const getConditionalBandwidthComponent = procHacker.js(
    "??$tryGetComponent@VConditionalBandwidthOptimizationComponent@@@Actor@@QEAAPEAVConditionalBandwidthOptimizationComponent@@XZ",
    ConditionalBandwidthOptimizationComponent,
    null,
    Actor,
);

(Actor.prototype as any)._tryGetComponent = function (comp: string) {
    switch (comp) {
        case "minecraft:projectile":
            return getProjectileComponent(this);
        case "minecraft:physics":
            return getPhysicsComponent(this);
        case "minecraft:damage_sensor":
            return getDamageSensorComponent(this);
        case "minecraft:command_block":
            return getCommandBlockComponent(this);
        case "minecraft:nameable":
            return getNameableComponent(this);
        case "minecraft:navigation":
            return getNavigationComponent(this);
        case "minecraft:npc":
            return getNpcComponent(this);
        case "minecraft:rideable":
            return getRideableComponent(this);
        case "minecraft:container":
            return getContainerComponent(this);
        case "minecraft:pushable":
            return getPushableComponent(this);
        case "minecraft:shooter":
            return getShooterComponent(this);
        case "minecraft:conditional_bandwidth_optimization":
            return getConditionalBandwidthComponent(this);
        default:
            return null;
    }
};

PhysicsComponent.prototype.setHasCollision = procHacker.js(
    "?setHasCollision@PhysicsComponent@@QEAAXAEAVActor@@_N@Z",
    void_t,
    { this: PhysicsComponent },
    Actor,
    bool_t,
);
PhysicsComponent.prototype.setAffectedByGravity = procHacker.js(
    "?setAffectedByGravity@PhysicsComponent@@QEBAXAEAUActorDataFlagComponent@@AEAUActorDataDirtyFlagsComponent@@_N@Z",
    void_t,
    { this: PhysicsComponent },
    ActorDataFlagComponent,
    ActorDataDirtyFlagsComponent,
    bool_t,
);

ProjectileComponent.prototype.shoot = procHacker.js("?shoot@ProjectileComponent@@QEAAXAEAVActor@@0@Z", void_t, { this: ProjectileComponent }, Actor, Actor);
ProjectileComponent.prototype.setOwnerId = procHacker.js(
    "?setOwnerId@ProjectileComponent@@QEAAXUActorUniqueID@@@Z",
    void_t,
    { this: ProjectileComponent },
    ActorUniqueID,
);

DamageSensorComponent.prototype.isFatal = procHacker.js("?isFatal@DamageSensorComponent@@QEBA_NXZ", bool_t, { this: DamageSensorComponent });

CommandBlockComponent.prototype.addAdditionalSaveData = procHacker.js(
    "?addAdditionalSaveData@CommandBlockComponent@@QEBAXAEAVCompoundTag@@@Z",
    void_t,
    { this: CommandBlockComponent },
    CompoundTag,
);
CommandBlockComponent.prototype.getTicking = procHacker.js("?getTicking@CommandBlockComponent@@QEBA_NXZ", bool_t, { this: CommandBlockComponent });
CommandBlockComponent.prototype.setTicking = procHacker.js("?setTicking@CommandBlockComponent@@QEAAX_N@Z", void_t, { this: CommandBlockComponent }, bool_t);
CommandBlockComponent.prototype.resetCurrentTicking = procHacker.js("?resetCurrentTick@CommandBlockComponent@@QEAAXXZ", void_t, { this: CommandBlockComponent });

NameableComponent.prototype.nameEntity = procHacker.js(
    "?nameEntity@NameableComponent@@QEAAXAEAVActor@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: NameableComponent },
    Actor,
    CxxString,
);
const NavigationComponent$$createPath$$Actor = procHacker.js(
    "?createPath@NavigationComponent@@QEAA?AV?$unique_ptr@VPath@@U?$default_delete@VPath@@@std@@@std@@AEAVMob@@AEAVActor@@@Z",
    Path.ref(),
    null,
    NavigationComponent,
    Actor,
    Actor,
);
const NavigationComponent$$createPath$$Vec3 = procHacker.js(
    "?createPath@NavigationComponent@@QEAA?AV?$unique_ptr@VPath@@U?$default_delete@VPath@@@std@@@std@@AEAVMob@@AEBVVec3@@@Z",
    Path.ref(),
    null,
    NavigationComponent,
    Actor,
    Vec3,
);
(NavigationComponent.prototype as any)._createPath = function (component: NavigationComponent, actor: Actor, target: Actor | Vec3): Path {
    if (target instanceof Actor) {
        return NavigationComponent$$createPath$$Actor(component, actor, target);
    } else {
        return NavigationComponent$$createPath$$Vec3(component, actor, target);
    }
};
NavigationComponent.prototype.setPath = procHacker.js(
    "?setPath@NavigationComponent@@QEAAXV?$unique_ptr@VPath@@U?$default_delete@VPath@@@std@@@std@@@Z",
    void_t,
    { this: NavigationComponent },
    Path.ref(),
);
NavigationComponent.prototype.stop = procHacker.js("?stop@NavigationComponent@@QEAAXAEAVMob@@@Z", void_t, { this: NavigationComponent }, Mob);
NavigationComponent.prototype.getMaxDistance = procHacker.js(
    "?getMaxDistance@NavigationComponent@@QEBAMAEBVActor@@@Z",
    float32_t,
    { this: NavigationComponent },
    Actor,
);
NavigationComponent.prototype.isDone = procHacker.js("?isDone@NavigationComponent@@QEBA_NXZ", bool_t, { this: NavigationComponent });
NavigationComponent.prototype.getSpeed = procHacker.js("?getSpeed@NavigationComponent@@QEBAMXZ", float32_t, { this: NavigationComponent });
NavigationComponent.prototype.getAvoidSun = procHacker.js("?getAvoidSun@NavigationComponent@@QEBA_NXZ", bool_t, { this: NavigationComponent });
NavigationComponent.prototype.getCanFloat = procHacker.js("?getCanFloat@NavigationComponent@@QEBA_NXZ", bool_t, { this: NavigationComponent });
NavigationComponent.prototype.getCanPathOverLava = procHacker.js("?getCanPathOverLava@NavigationComponent@@QEBA_NXZ", bool_t, { this: NavigationComponent });
NavigationComponent.prototype.getLastStuckCheckPosition = procHacker.js("?getLastStuckCheckPosition@NavigationComponent@@QEBA?AVVec3@@XZ", Vec3, {
    this: NavigationComponent,
});
NavigationComponent.prototype.isStuck = procHacker.js("?isStuck@NavigationComponent@@QEBA_NH@Z", bool_t, { this: NavigationComponent }, int32_t);
NavigationComponent.prototype.setCanFloat = procHacker.js("?setCanFloat@NavigationComponent@@QEAAX_N@Z", void_t, { this: NavigationComponent }, bool_t);
NavigationComponent.prototype.setAvoidWater = procHacker.js("?setAvoidWater@NavigationComponent@@QEAAX_N@Z", void_t, { this: NavigationComponent }, bool_t);
NavigationComponent.prototype.setAvoidSun = procHacker.js("?setAvoidSun@NavigationComponent@@QEAAX_N@Z", void_t, { this: NavigationComponent }, bool_t);
NavigationComponent.prototype.setSpeed = procHacker.js("?setSpeed@NavigationComponent@@QEAAXM@Z", void_t, { this: NavigationComponent }, float32_t);

RideableComponent.prototype.areSeatsFull = procHacker.js("?areSeatsFull@RideableComponent@@QEBA_NAEBVActor@@@Z", bool_t, { this: RideableComponent }, Actor);
RideableComponent.prototype.canAddPassenger = procHacker.js(
    "?canAddPassenger@RideableComponent@@QEBA_NAEBVActor@@AEAV2@@Z",
    bool_t,
    { this: RideableComponent },
    Actor,
    Actor,
);
RideableComponent.prototype.pullInEntity = procHacker.js("?pullInEntity@RideableComponent@@QEBA_NAEAVActor@@0@Z", bool_t, { this: RideableComponent }, Actor, Actor);

const ContainerComponent$addItem$ItemActor = procHacker.js("?addItem@ContainerComponent@@QEAA_NAEAVItemActor@@@Z", bool_t, null, ContainerComponent, ItemActor);
const ContainerComponent$addItem$ItemStack = procHacker.js("?addItem@ContainerComponent@@QEAA_NAEAVItemStack@@@Z", bool_t, null, ContainerComponent, ItemStack);
const ContainerComponent$addItem$ItemStack$count = procHacker.js(
    "?addItem@ContainerComponent@@QEAA_NAEAVItemStack@@HH@Z",
    bool_t,
    null,
    ContainerComponent,
    ItemStack,
    int32_t,
    int32_t,
);
(ContainerComponent.prototype as any)._addItem = function (component: ContainerComponent, item: ItemStack | ItemActor, count?: number, data: number = 0): boolean {
    if (item instanceof ItemActor) {
        return ContainerComponent$addItem$ItemActor(component, item);
    } else if (count !== undefined) {
        return ContainerComponent$addItem$ItemStack$count(component, item, count, data);
    } else {
        return ContainerComponent$addItem$ItemStack(component, item);
    }
};
ContainerComponent.prototype.getEmptySlotsCount = procHacker.js("?getEmptySlotsCount@ContainerComponent@@QEBAHXZ", int64_as_float_t, { this: ContainerComponent });
ContainerComponent.prototype.getSlots = procHacker.js(
    "?getSlots@ContainerComponent@@QEBA?BV?$vector@PEBVItemStack@@V?$allocator@PEBVItemStack@@@std@@@std@@XZ",
    CxxVector.make(ItemStack.ref()),
    { this: Container, structureReturn: true },
);
const PushableComponent$pushByActor = procHacker.js("?push@PushableComponent@@QEAAXAEAVActor@@0_N@Z", void_t, null, PushableComponent, Actor, Actor, bool_t);
const PushableComponent$pushByPos = procHacker.js("?push@PushableComponent@@QEAAXAEAVActor@@AEBVVec3@@@Z", void_t, null, PushableComponent, Actor, Vec3);
(PushableComponent.prototype as any)._push = function (entity: Actor, entityOrVec: Actor | Vec3, bool: bool_t) {
    if (bool !== undefined) {
        return PushableComponent$pushByActor(this, entity, entityOrVec as Actor, bool);
    } else {
        return PushableComponent$pushByPos(this, entity, entityOrVec as Vec3);
    }
};
ShooterComponent.prototype.shootProjectile = procHacker.js(
    "?_shootProjectile@ShooterComponent@@AEAAXAEAVActor@@AEBUActorDefinitionIdentifier@@H@Z",
    void_t,
    { this: ShooterComponent },
    Actor,
    ActorDefinitionIdentifier,
    int32_t,
);

Mob.prototype.getArmorValue = procHacker.jsv("??_7Mob@@6B@", "?getArmorValue@Mob@@UEBAHXZ", int32_t, { this: Actor });
// 1.26: Mob::knockback(Actor*, float damage, float xd, float zd, KnockbackParameters const&). The
// three values that used to follow xd and zd in registers are fields of a 28-byte struct (Endstone's
// knockback_parameters.h: the Vec2 power at +0, the vertical velocity cap at +8, the slowdown scale
// at +12, three bools at +16..18, an extra power at +20 and its approach at +24). Called with the
// 2024 prototype the callee reads a float where it wants that pointer. The event has hooked the
// present name since 2026-09-19 (event_impl/entityevent.ts); this is the call side, which had not
// been changed. The slowdown is the value BDS itself passes, read out of the struct in
// entityKnockback on both builds (docs/findings-slots.md, "Changed signatures").
const KNOCKBACK_PARAMETERS_SIZE = 28;
const KNOCKBACK_SLOWDOWN = 0.5;
const KNOCKBACK_1_26 = "?knockback@Mob@@UEAAXPEAVActor@@MMMAEBUKnockbackParameters@@@Z";
if (KNOCKBACK_1_26 in proc) {
    const knockback = procHacker.jsv("??_7Mob@@6B@", KNOCKBACK_1_26, void_t, { this: Mob }, Actor, float32_t, float32_t, float32_t, StaticPointer);
    Mob.prototype.knockback = function (
        this: Mob,
        source: Actor | null,
        damage: number,
        xd: number,
        zd: number,
        power: number,
        height: number,
        heightCap: number,
    ): void {
        const params = new AllocatedPointer(KNOCKBACK_PARAMETERS_SIZE);
        params.fill(0, KNOCKBACK_PARAMETERS_SIZE);
        params.setFloat32(power, 0);
        params.setFloat32(height, 4);
        params.setFloat32(heightCap, 8);
        params.setFloat32(KNOCKBACK_SLOWDOWN, 12);
        (knockback as any).call(this, source, damage, xd, zd, params);
    };
} else {
    Mob.prototype.knockback = procHacker.jsv(
        "??_7Mob@@6B@",
        "?knockback@Mob@@UEAAXPEAVActor@@HMMMMM@Z",
        void_t,
        { this: Mob },
        Actor,
        int32_t,
        float32_t,
        float32_t,
        float32_t,
        float32_t,
        float32_t,
    );
}
Mob.prototype.getSpeed = procHacker.js("?getSpeed@Mob@@UEBAMXZ", float32_t, {
    this: Mob,
});
Mob.prototype.setSpeed = procHacker.js("?setSpeed@Mob@@UEAAXM@Z", void_t, { this: Mob }, float32_t);
Mob.prototype.sendArmorSlot = procHacker.js("?sendArmorSlot@Mob@@QEAAXW4ArmorSlot@@@Z", void_t, { this: Mob }, uint32_t);
Mob.prototype.setSprinting = procHacker.js("?setSprinting@Mob@@UEAAX_N@Z", void_t, { this: Mob }, bool_t);
Mob.prototype.isAlive = procHacker.js("?isAlive@Mob@@UEBA_NXZ", bool_t, {
    this: Mob,
});
(Mob.prototype as any)._sendInventory = procHacker.js("?sendInventory@Mob@@UEAAX_N@Z", void_t, { this: Mob }, bool_t);
(Mob.prototype as any).hurtEffects_ = procHacker.jsv(
    "??_7Mob@@6B@",
    "?hurtEffects@Mob@@UEAAXAEBVActorDamageSource@@M_N1@Z",
    bool_t,
    { this: Mob },
    ActorDamageSource,
    int32_t,
    bool_t,
    bool_t,
);
// 1.26 has no out-of-line copy: no caller of ActorEquipment::getAllArmor converts an int to a
// float, and no function in either build holds both `cvtdq2ps` and the ActorEquipmentComponent
// hash. 2024's body (0x19119d0, 201 bytes) is entirely `getAllArmor(ctx)` -- which is
// `getArmorContainer(ctx)->getSlots()` -- then 0.25f for every piece whose isNull() is false,
// so bdsx counts the same slots of the same container. docs/findings-armor.md.
Mob.prototype.getArmorCoverPercentage = derived(
    "?getArmorCoverPercentage@Mob@@QEBAMXZ",
    function getArmorCoverPercentage(this: Mob): float32_t {
        const slots = this.getArmorContainer().getSlots();
        let worn = 0;
        for (const stack of slots) {
            if (!stack.isNull()) worn++;
        }
        slots.destruct();
        return worn * 0.25;
    },
    () => procHacker.js("?getArmorCoverPercentage@Mob@@QEBAMXZ", float32_t, { this: Mob }),
);
Mob.prototype.getToughnessValue = function () {
    let toughness = 0;
    const armors = this.getArmorContainer();
    const slots = armors.getSlots();
    for (const stack of slots) {
        const item = stack.getItem();
        if (item === null) continue;
        toughness += item.getToughnessValue();
    }
    slots.destruct();
    return toughness;
};
Mob.prototype.isBlocking = procHacker.jsv("??_7Mob@@6B@", "?isBlocking@Mob@@UEBA_NXZ", bool_t, { this: Mob });
Mob.prototype.shouldDropDeathLoot = procHacker.jsv("??_7Mob@@6B@", "?shouldDropDeathLoot@Mob@@UEBA_NXZ", bool_t, { this: Mob });

OwnerStorageEntity.prototype._getStackRef = procHacker.js("?_getStackRef@OwnerStorageEntity@@IEBAAEAVEntityContext@@XZ", EntityContext, {
    this: OwnerStorageEntity,
});
// Actor / Player / ServerPlayer ::tryGetFromEntity (docs/findings-components.md, "tryGetFromEntity").
// 1.26 keeps no out-of-line copy of any of them. The 2024 bodies (0x19ca400, 0x19ece30, 0xcd8660) are
// try_get<ActorOwnerComponent> -> the unique_ptr<Actor> it holds -> null if removed unless asked, and
// the two player ones put one flag test in front (PlayerComponent, ServerPlayerComponent). Endstone
// (Apache-2.0) writes Actor::tryGetFromEntity and Player::tryGetFromEntity the same way for 1.26.
// An EntityContext is the registry at +8 and the entity id at +16 -- the same two words an Actor holds
// at +16/+24, since the Actor's own context sits at +8 -- so the actor-keyed EnTT helpers read a context
// through a pointer 8 bytes before it.
const ACTOR_OWNER_COMPONENT_HASH = enttTypeHash("ActorOwnerComponent");
const PLAYER_COMPONENT_HASH = enttTypeHash("PlayerComponent");
const SERVER_PLAYER_COMPONENT_HASH = enttTypeHash("ServerPlayerComponent");
const ACTOR_CTXBASE = Actor.offsetOf("ctxbase");
function contextHolder(ctx: EntityContext): Actor {
    return (ctx as unknown as StaticPointer).add(-ACTOR_CTXBASE) as unknown as Actor;
}
function actorFromEntity(ctx: EntityContext, includeRemoved: boolean): StaticPointer | null {
    const owner = enttComponent(contextHolder(ctx), ACTOR_OWNER_COMPONENT_HASH, 8);
    if (owner === null) return null;
    const actor = owner.getNullablePointer(0);
    if (actor === null) return null;
    if (!includeRemoved && actor.getUint8(pdbcache.layouts.Actor?.removed ?? ACTOR_WORLD_2024.removed) !== 0) return null;
    return actor;
}
Actor.tryGetFromEntity = derived<(entity: EntityContext, getRemoved?: boolean) => Actor | null>(
    "?tryGetFromEntity@Actor@@SAPEAV1@AEAVEntityContext@@_N@Z",
    function tryGetFromEntity(entity: EntityContext, getRemoved: boolean = false): Actor | null {
        const p = actorFromEntity(entity, getRemoved);
        return p === null ? null : Actor.from(p);
    },
    () => procHacker.js("?tryGetFromEntity@Actor@@SAPEAV1@AEAVEntityContext@@_N@Z", Actor, null, EntityContext, bool_t),
);

SynchedActorDataEntityWrapper.prototype.getFloat = procHacker.js(
    "?getFloat@SynchedActorDataEntityWrapper@@QEBAMG@Z",
    float32_t,
    { this: SynchedActorDataEntityWrapper },
    uint16_t,
);
SynchedActorDataEntityWrapper.prototype.getInt = procHacker.js(
    "?getInt@SynchedActorDataEntityWrapper@@QEBAHG@Z",
    int32_t,
    { this: SynchedActorDataEntityWrapper },
    uint16_t,
);

// SynchedActorDataEntityWrapper::set<T> (docs/findings-synched.md). 1.26 keeps no out-of-line copy of
// either one -- every caller inlined it -- and what propagation offered for set<int> was a trade
// function. What the setter does is fixed by the container rather than by the binary, and the
// container did not change: the wrapper's first word is the SynchedActorData, its vector of DataItem
// pointers is indexed by the id itself (the invariant every getter relies on), and the dirty bitset
// sits at +24. So bdsx writes it out. The shape is the 2024 body (0x1417f0) and 1.26's inlined copy
// (0x23990b0 on 1.26.40.8) agreeing step for step: look the item up, refuse it if its type is not
// this setter's, do nothing at all when the value is already there, write the payload, then set the
// id's dirty bit unless the id is past the bitset.
{
    const l = pdbcache.layouts.SynchedActorData ?? {};
    const DIRTY = l.dirtyFlags ?? 24;
    const ID_COUNT = l.idCount ?? 132; // 141 in 1.26; the 2024 fallback is what 0x1417f0 compares
    const PAYLOAD = l.payload4 ?? 16; // 1.26 moved <=4-byte payloads to +0x0c; 2024 kept them at +0x10
    /** DataItem::getType, vftable slot 2 -- 1.26's code never reads the field directly, so neither do we */
    const DataItem$getType = makefunc.js([0x10], uint8_t, { this: VoidPointer });

    /** the DataItem the wrapper holds for `id`, or null when the id is out of range or the slot is empty */
    function dataItem(wrapper: SynchedActorDataEntityWrapper, id: number): VoidPointer | null {
        const data = (wrapper as any as StaticPointer).getPointer(0);
        if (data.isNull()) return null;
        const begin = data.getPointer(0);
        if (begin.isNull()) return null;
        if (data.getPointer(8).subptr(begin) >>> 3 <= id) return null;
        const item = begin.getPointer(id * 8);
        return item.isNull() ? null : item;
    }
    /** std::bitset<Count> at SynchedActorData+24: 64-bit words, so uint32 halves in order are the same bits */
    function markDirty(wrapper: SynchedActorDataEntityWrapper, id: number): void {
        if (id >= ID_COUNT) return;
        const data = (wrapper as any as StaticPointer).getPointer(0);
        const off = DIRTY + (id >>> 5) * 4;
        data.setUint32((data.getUint32(off) | (1 << (id & 31))) >>> 0, off);
    }

    SynchedActorDataEntityWrapper.prototype.setInt = derived(
        "??$set@H@SynchedActorDataEntityWrapper@@QEAAXGAEBH@Z",
        function (this: SynchedActorDataEntityWrapper, id: number, value: number): void {
            const item = dataItem(this, id);
            if (item === null) return;
            if (DataItem$getType.call(item) !== 2 /* DataItemType::Int */) return;
            const p = item as any as StaticPointer;
            if (p.getInt32(PAYLOAD) === value) return;
            p.setInt32(value, PAYLOAD);
            markDirty(this, id);
        },
        () =>
            procHacker.js(
                "??$set@H@SynchedActorDataEntityWrapper@@QEAAXGAEBH@Z",
                void_t,
                { this: SynchedActorDataEntityWrapper },
                uint16_t,
                int32_t.ref() /** int const & */,
            ),
    );
    SynchedActorDataEntityWrapper.prototype.setFloat = derived(
        "??$set@M@SynchedActorDataEntityWrapper@@QEAAXGAEBM@Z",
        function (this: SynchedActorDataEntityWrapper, id: number, value: number): void {
            const item = dataItem(this, id);
            if (item === null) return;
            if (DataItem$getType.call(item) !== 3 /* DataItemType::Float */) return;
            const p = item as any as StaticPointer;
            if (p.getFloat32(PAYLOAD) === value) return;
            p.setFloat32(value, PAYLOAD);
            markDirty(this, id);
        },
        () =>
            procHacker.js(
                "??$set@M@SynchedActorDataEntityWrapper@@QEAAXGAEBM@Z",
                void_t,
                { this: SynchedActorDataEntityWrapper },
                uint16_t,
                float32_t.ref() /** float const & */,
            ),
    );

    // set<std::string> has no out-of-line copy in 1.26 either, and bdsx never names it: it is only
    // reached through Actor::setScoreTag. The 2024 body (0x573da0) is the same shape as set<int> with
    // the string compare and assignment in place of the int one -- `cmpb $4, 8(%rax)` for the type,
    // a compare that returns without writing when the strings are already equal, the assignment into
    // the item's own std::string, then the same dirty bit. Strings keep the payload at +0x10, where
    // the <=4-byte types keep it at +0x0c (docs/findings-synched.md).
    function setSynchedString(wrapper: SynchedActorDataEntityWrapper, id: number, value: string): void {
        const item = dataItem(wrapper, id);
        if (item === null) return;
        if (DataItem$getType.call(item) !== 4 /* DataItemType::String */) return;
        const p = item as any as StaticPointer;
        const off = l.payload8 ?? 16;
        if (p.getCxxString(off) === value) return;
        p.setCxxString(value, off);
        markDirty(wrapper, id);
    }

    // Actor::setScoreTag is a tail call into set<string>(entity_data, 84, v) and nothing else
    // (2024 0x19c6fb0: `movq %rdx,%r8; addq $400,%rcx; movl $84,%edx; jmp`). Actor::setNameTag is NOT
    // this shape -- its 2024 body (0x19c6ac0) also looks a component up and clears a cached string at
    // Actor+880 -- so it stays missing rather than being written here from half a body.
    Actor.prototype.setScoreTag = derived(
        "?setScoreTag@Actor@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
        function (this: Actor, value: string): void {
            setSynchedString(this.getEntityData(), 84, value);
        },
        () =>
            procHacker.js(
                "?setScoreTag@Actor@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
                void_t,
                { this: Actor },
                CxxString,
            ),
    );

    // Actor::setHurtTime moved out of SynchedActorData. 2024's body (0x19c5fb0) is four instructions
    // around set<int>(entity_data, 11, time); in 1.26 there is no Int item at id 11 at all -- a sweep of
    // getInt over ids 0..63 on a mob one tick after it was hurt finds only ids 1 and 55 non-zero and
    // nothing moving over the next four ticks, on both builds. The countdown lives in a
    // MobHurtTimeComponent the Mob holds by pointer (Endstone mob.h: BuiltInMobComponents
    // { death_ticking, mob_animation, mob_hurt_time }), which is what the live scan found: following
    // every pointer-shaped word in a hurt mob, exactly one leads to a dword that reads 10 one tick after
    // the hit and 6 four ticks later, at Mob+0x428 [+0] on both builds. The binary says the same thing
    // where 2024 called setHurtTime(10): both builds carry `mov rax,[reg+0x428]; movl $10,(%rax)`.
    // Only a Mob has the component, so a non-mob actor is left alone, which is also what BDS does.
    const MOB_HURT_TIME_COMPONENT = pdbcache.layouts.Mob?.hurtTimeComponent ?? 0x428;
    const MOB_HURT_TIME = pdbcache.layouts.Mob?.hurtTime ?? 0;
    Actor.prototype.setHurtTime = derived(
        "?setHurtTime@Actor@@QEAAXH@Z",
        function (this: Actor, time: number): void {
            if ((this.getEntityTypeId() & ActorType.Mob) === 0) return;
            const c = (this as any as StaticPointer).getPointer(MOB_HURT_TIME_COMPONENT);
            if (c.isNull()) return;
            c.setInt32(time, MOB_HURT_TIME);
        },
        () => procHacker.js("?setHurtTime@Actor@@QEAAXH@Z", void_t, { this: Actor }, int32_t),
    );

    // Actor::getBlockTarget is getPosition(entity_data, 47) and nothing else
    // (2024 0x19b0d90: `movl $47,%r8d; addq $400,%rcx; jmp`).
    const SynchedActorDataEntityWrapper$getPosition = procHacker.js(
        "?getPosition@SynchedActorDataEntityWrapper@@QEBA?AVBlockPos@@G@Z",
        BlockPos,
        { this: SynchedActorDataEntityWrapper, structureReturn: true },
        uint16_t,
    );
    Actor.prototype.getBlockTarget = derived(
        "?getBlockTarget@Actor@@QEBA?AVBlockPos@@XZ",
        function (this: Actor): BlockPos {
            return SynchedActorDataEntityWrapper$getPosition.call(this.getEntityData(), 47);
        },
        () => procHacker.js("?getBlockTarget@Actor@@QEBA?AVBlockPos@@XZ", BlockPos, { this: Actor, structureReturn: true }),
    );
}

@nativeClass(0x20)
class StackResultStorageEntity extends NativeClass {
    constructWith(weakEntityRef: WeakEntityRef): void {
        abstract();
    }
    _hasValue(): boolean {
        abstract();
    }
    _getStackRef(): EntityContext {
        abstract();
    }
}
StackResultStorageEntity.prototype.constructWith = procHacker.js(
    "??0StackResultStorageEntity@@IEAA@AEBVWeakStorageEntity@@@Z",
    void_t,
    { this: StackResultStorageEntity },
    WeakEntityRef,
);
StackResultStorageEntity.prototype._hasValue = procHacker.js("?_hasValue@StackResultStorageEntity@@IEBA_NXZ", bool_t, { this: StackResultStorageEntity });
StackResultStorageEntity.prototype._getStackRef = procHacker.js("?_getStackRef@StackResultStorageEntity@@IEBAAEAVEntityContext@@XZ", EntityContext, {
    this: StackResultStorageEntity,
});

WeakEntityRef.prototype.tryUnwrap = function <T extends typeof Actor>(clazz: T, getRemoved: boolean = false): InstanceType<T> | null {
    const storage = new StackResultStorageEntity(true);
    storage.constructWith(this);
    if (!storage._hasValue()) return null;
    const entity = storage._getStackRef();
    return clazz.tryGetFromEntity(entity, getRemoved) as any;
};
WeakEntityRef.prototype.tryUnwrapPlayer = function (getRemoved = false) {
    return this.tryUnwrap(Player, getRemoved);
};
WeakEntityRef.prototype.tryUnwrapActor = function (getRemoved = false) {
    return this.tryUnwrap(Actor, getRemoved);
};

const ActorDefinitionIdentifier$ActorDefinitionIdentifier$ActorType = procHacker.js(
    "??0ActorDefinitionIdentifier@@QEAA@W4ActorType@@@Z",
    void_t,
    null,
    ActorDefinitionIdentifier,
    int32_t,
);
const ActorDefinitionIdentifier$ActorDefinitionIdentifier$CxxString = procHacker.js(
    "??0ActorDefinitionIdentifier@@QEAA@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    null,
    ActorDefinitionIdentifier,
    CxxString,
);
ActorDefinitionIdentifier.constructWith = function (type: string | number): ActorDefinitionIdentifier {
    const identifier = new ActorDefinitionIdentifier(true);
    if (typeof type === "number") {
        ActorDefinitionIdentifier$ActorDefinitionIdentifier$ActorType(identifier, type);
    } else {
        ActorDefinitionIdentifier$ActorDefinitionIdentifier$CxxString(identifier, type);
    }
    return identifier;
};

// 1.26: ActorDamageSource is 48 bytes, not 16. The vftable's slot 0 destroys a std::string at +16
// (data +16, size +32, capacity +40), resets it to the empty small string and sized-deletes 48, on
// both builds, byte for byte; 2024's slot 0 sized-deleted 16 and destroyed nothing. The constructor
// is gone from both builds, so bdsx builds the object: the vftable, the cause, and the empty small
// string the destructor itself leaves behind (size 0, capacity 15). Handing Mob::_hurt a 16-byte
// one makes it read that string out of the next heap block -- an access violation on 1.26.40.8 and
// a bad_variant_access int3 on 1.26.51.1 (docs/findings-slots.md, "Changed signatures").
// The declared class size stays 0x10: the derived sources' 1.26 layouts have not been measured, and
// raising the base would move their fields by guess. The buffer is held by the object that views it.
const ACTOR_DAMAGE_SOURCE_VFTABLE = "??_7ActorDamageSource@@6B@";
const ACTOR_DAMAGE_SOURCE_SIZE = 0x30;
ActorDamageSource.create = derived(
    "??0ActorDamageSource@@QEAA@W4ActorDamageCause@@@Z",
    function (cause: ActorDamageCause): ActorDamageSource {
        if (!(ACTOR_DAMAGE_SOURCE_VFTABLE in proc)) throw Error(`ActorDamageSource.create needs ${ACTOR_DAMAGE_SOURCE_VFTABLE}, which this build's table does not have`);
        const buf = new AllocatedPointer(ACTOR_DAMAGE_SOURCE_SIZE);
        buf.fill(0, ACTOR_DAMAGE_SOURCE_SIZE);
        buf.setPointer(proc[ACTOR_DAMAGE_SOURCE_VFTABLE], 0);
        buf.setInt32(cause, 8);
        buf.setInt32(15, 40); // std::string capacity: the small-string buffer at +16, size already 0
        const source = buf.as(ActorDamageSource);
        (source as any).$buffer = buf; // the view does not own the memory; this reference does
        return source;
    },
    () => {
        const ctor = procHacker.js("??0ActorDamageSource@@QEAA@W4ActorDamageCause@@@Z", void_t, null, ActorDamageSource, int32_t);
        return function (cause: ActorDamageCause): ActorDamageSource {
            const source = new ActorDamageSource(true);
            ctor(source, cause);
            return source;
        };
    },
);

const ActorDamageByActorSource$vftable = proc["??_7ActorDamageByActorSource@@6B@"];
const ActorDamageByChildActorSource$vftable = proc["??_7ActorDamageByChildActorSource@@6B@"];
const ActorDamageByBlockSource$vftable = proc["??_7ActorDamageByBlockSource@@6B@"];

ActorDamageSource.setResolver(ptr => {
    if (ptr === null) return null;
    const vftable = ptr.getPointer();
    if (vftable.equalsptr(ActorDamageByActorSource$vftable)) {
        return ptr.as(ActorDamageByActorSource);
    }
    if (vftable.equalsptr(ActorDamageByChildActorSource$vftable)) {
        return ptr.as(ActorDamageByChildActorSource);
    }
    if (vftable.equalsptr(ActorDamageByBlockSource$vftable)) {
        return ptr.as(ActorDamageByBlockSource);
    }
    return ptr.as(ActorDamageSource);
});

ActorDamageSource.prototype.getDamagingEntityUniqueID = procHacker.jsv(
    "??_7ActorDamageSource@@6B@",
    "?getDamagingEntityUniqueID@ActorDamageSource@@UEBA?AUActorUniqueID@@XZ",
    ActorUniqueID,
    { this: ActorDamageSource, structureReturn: true },
);
ActorDamageSource.prototype.setCause = procHacker.js("?setCause@ActorDamageSource@@QEAAXW4ActorDamageCause@@@Z", void_t, { this: ActorDamageSource }, int32_t);

ActorDamageByActorSource.prototype[NativeType.dtor] = procHacker.js("??1ActorDamageByActorSource@@UEAA@XZ", void_t, { this: ActorDamageByActorSource });
const ActorDamageByActorSource$ActorDamageByActorSource = procHacker.js(
    "??0ActorDamageByActorSource@@QEAA@AEBVActor@@W4ActorDamageCause@@@Z",
    void_t,
    null,
    ActorDamageByActorSource,
    Actor,
    int32_t,
);
ActorDamageByActorSource.constructWith = function (damagingEntity, cause: ActorDamageCause = ActorDamageCause.EntityAttack): ActorDamageByActorSource {
    const source = new ActorDamageByActorSource(true);
    ActorDamageByActorSource$ActorDamageByActorSource(source, damagingEntity as Actor, cause);
    return source;
};

ActorDamageByChildActorSource.prototype[NativeType.dtor] = procHacker.js("??1ActorDamageByChildActorSource@@UEAA@XZ", VoidPointer, {
    this: ActorDamageByChildActorSource,
});
const ActorDamageByChildActorSource$ActorDamageByChildActorSource = procHacker.js(
    "??0ActorDamageByChildActorSource@@QEAA@AEBVActor@@0W4ActorDamageCause@@@Z",
    ActorDamageByChildActorSource,
    null,
    ActorDamageByChildActorSource,
    Actor,
    Actor,
    int32_t,
);
ActorDamageByChildActorSource.constructWith = function (
    childEntity,
    damagingEntity?: Actor | ActorDamageCause,
    cause: ActorDamageCause = ActorDamageCause.Projectile,
): ActorDamageByChildActorSource {
    const source = new ActorDamageByChildActorSource(true);
    ActorDamageByChildActorSource$ActorDamageByChildActorSource(source, childEntity as Actor, damagingEntity as Actor, cause);
    return source;
};

ItemActor.abstract({
    itemStack: [ItemStack, 0x448], // accessed in ItemActor::isFireImmune
});

ServerPlayer.prototype.setAttribute = function (id: AttributeId, value: number): AttributeInstance | null {
    const attr = Actor.prototype.setAttribute.call(this, id, value);
    if (attr === null) return null;
    const packet = UpdateAttributesPacket.allocate();
    packet.actorId = this.getRuntimeID();
    const data = AttributeData.construct();
    const attrKey = AttributeId[id] as keyof typeof AttributeId;
    data.name.set(AttributeName[attrKey]);
    data.current = value;
    data.min = attr.minValue;
    data.max = attr.maxValue;
    data.default = attr.defaultValue;
    // 1.26 sends these two as well; BDS's own AttributeData(AttributeInstance const&) takes them
    // from +0x68 and +0x6c, so send what it would send rather than zero
    data.defaultMin = attr.defaultMinValue;
    data.defaultMax = attr.defaultMaxValue;
    packet.attributes.push(data);
    data.destruct();
    this.sendNetworkPacket(packet);
    packet.dispose();
    return attr;
};

function _removeActor(actorptr: VoidPointer): void {
    const addrbin = actorptr.getAddressBin();
    const actor = actorMaps.get(addrbin);
    if (actor != null) {
        actorMaps.delete(addrbin);
        decay(actor);
    }
}

const Actor$tryGetFromEntity_by_EntityContext = procHacker.js("?tryGetFromEntity@Player@@SAPEAV1@AEAVEntityContext@@_N@Z", Player, null, VoidPointer, bool_t);
const Level$levelCleanupQueueEntityRemoval = procHacker.hooking(
    "?levelCleanupQueueEntityRemoval@Level@@UEAAXV?$OwnerPtr@VEntityContext@@@@@Z",
    void_t,
    null,
    Level,
    StaticPointer,
)((level, OwnerPtr$EntityContext) => {
    const actor = Actor$tryGetFromEntity_by_EntityContext(OwnerPtr$EntityContext, true);
    Level$levelCleanupQueueEntityRemoval(level, OwnerPtr$EntityContext);
    if (actor !== null) _removeActor(actor);
});

asmcode.removeActor = makefunc.np(_removeActor, void_t, null, VoidPointer);
procHacker.hookingRawWithCallOriginal("??1Actor@@UEAA@XZ", asmcode.actorDestructorHook, [Register.rcx], []);

// player.ts
// All three moved in 1.26, so they come from symbols.json `layouts.Player`; the literals are the 2024
// offsets. 1.26: ender chest +2064 and the UI container +2232 are what Player::readAdditionalSaveData
// loads after looking up "EnderChestInventory" / "PlayerUIItems" (2024: +3168 / +3352), and the device
// id +3208 is the string the Player constructor fills from its argument right after last_emote_played_,
// a time_t and an int (2024: +7552). docs/findings-containers.md, 13.
{
    const l = pdbcache.layouts.Player ?? {};
    Player.abstract({
        enderChestContainer: [EnderChestContainer.ref(), l.enderChestContainer ?? 0xc60],
        playerUIContainer: [PlayerUIContainer, l.playerUIContainer ?? 0xd18],
        deviceId: [CxxString, l.deviceId ?? 0x1d80],
    });
}
(Player.prototype as any)._setName = procHacker.js(
    "?setName@Player@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: Player },
    CxxString,
);
// PlayerListPacket::emplace (docs/findings-containers.md, 14). 2024's (0xa274b0) was a vector
// emplace_back of the entry itself. 1.26 has no copy, and the packet no longer holds PlayerListEntry:
// its vector (+48) holds 184-byte variants -- alternative 0 is a removal {action 1, uuid}, alternative 1
// an addition {action 0, uuid, id, the three strings, platform, skin, the three bools, color}, index
// byte +176 -- and the one byte `action` at +72 that 2024 had became a constant 5 every constructor
// writes. ServerLevel's gameplay-user-added path (40 0x2e27020 / 51 0x8664c0) builds alternative 1 from
// an entry by moving each member; this does the same, and moves the entry's members out as it does.
const PlayerListPacket$emplace = derived<(pk: PlayerListPacket, entry: PlayerListEntry) => void>(
    "?emplace@PlayerListPacket@@QEAAX$$QEAVPlayerListEntry@@@Z",
    function emplace(pk: PlayerListPacket, entry: PlayerListEntry): void {
        const E = pdbcache.layouts.PlayerListEntry;
        const P = pdbcache.layouts.PlayerListPacket;
        const A = pdbcache.layouts.PlayerListPacketAddEntry;
        if (E === undefined || P === undefined || A === undefined) throw Error("PlayerListPacket::emplace: this build's symbols.json has no PlayerList layouts");
        const vec = (pk as unknown as StaticPointer).add(P.entries);
        const size = P.elementSize;
        let begin = vec.getPointer(0),
            end = vec.getPointer(8);
        const cap = vec.getPointer(16);
        const used = end.subptr(begin);
        if (end.equalsptr(cap)) {
            // grow: the elements are a byte, PODs, MSVC strings and a shared_ptr -- all relocatable by
            // memcpy, which is what the engine's own push does -- in storage the packet's destructor frees
            const oldCapBytes = cap.subptr(begin);
            const newCapBytes = Math.max(size, oldCapBytes * 2);
            const fresh = msAlloc.allocate(newCapBytes);
            if (used !== 0) {
                dll.vcruntime140.memcpy(fresh, begin, used);
                msAlloc.deallocate(begin, oldCapBytes);
            }
            begin = fresh;
            end = fresh.add(used);
            vec.setPointer(fresh, 0);
            vec.setPointer(fresh.add(newCapBytes), 16);
        }
        const src = entry as unknown as StaticPointer;
        dll.vcruntime140.memset(end, 0, size);
        end.setUint8(0, A.action); // Add
        end.copyFrom(src, 16, A.uuid, E.uuid);
        end.copyFrom(src, 8, A.id, E.id);
        for (const k of ["name", "xuid", "platformOnlineId"] as const) {
            end.copyFrom(src, 32, A[k], E[k]);
            // leave the source an empty small string: size 0, capacity 15
            src.setInt64WithFloat(0, E[k] + 16);
            src.setInt64WithFloat(15, E[k] + 24);
            src.setUint8(0, E[k]);
        }
        end.setInt32(src.getInt32(E.buildPlatform), A.buildPlatform);
        end.copyFrom(src, 16, A.skin, E.skin); // shared_ptr: pointer and control block
        src.setPointer(null, E.skin);
        src.setPointer(null, E.skin + 8);
        end.setUint8(src.getUint8(E.isTeacher), A.isTeacher);
        end.setUint8(src.getUint8(E.isHost), A.isHost);
        end.setUint8(src.getUint8(E.isSubClient), A.isSubClient);
        end.copyFrom(src, 16, A.color, E.color);
        end.setUint8(1, P.elementIndex); // alternative 1
        vec.setPointer(end.add(size), 8);
    },
    () => procHacker.js("?emplace@PlayerListPacket@@QEAAX$$QEAVPlayerListEntry@@@Z", void_t, null, PlayerListPacket, PlayerListEntry),
);
Player.prototype.setName = function (name: string): void {
    (this as any)._setName(name);
    this.updatePlayerList();
};
Player.prototype.updatePlayerList = function () {
    const entry = PlayerListEntry.constructWith(this);
    const pk = PlayerListPacket.allocate();
    PlayerListPacket$emplace(pk, entry);
    for (const player of bedrockServer.serverInstance.getPlayers()) {
        player.sendNetworkPacket(pk);
    }
    entry.destruct();
    pk.dispose();
};

Player.prototype.getGameMode = procHacker.js("?getGameMode@Player@@QEBAAEAVGameMode@@XZ", GameMode, { this: Player });
Player.prototype.getGameType = procHacker.js("?getPlayerGameType@Player@@QEBA?AW4GameType@@XZ", int32_t, { this: Player });
Player.prototype.getInventory = Player.prototype.getSupplies = procHacker.js("?getSupplies@Player@@QEAAAEAVPlayerInventory@@XZ", PlayerInventory, { this: Player });
Player.prototype.getCommandPermissionLevel = procHacker.js("?getCommandPermissionLevel@Player@@UEBA?AW4CommandPermissionLevel@@XZ", int32_t, { this: Actor });
// `Player::getPlayerPermissionLevel` and `Player::setPermissions` are one EnTT lookup and one byte.
// The 2024 bodies (0x19df780 and 0x19e8b60) are the same four instructions: try_get<AbilitiesComponent>
// on the entity context, then a tail jump into LayeredAbilities -- getPlayerPermissions, which is
// `movzbl 1(%rcx),%eax`, and setCommandPermissions, which is `movb %dl,(%rcx)`. bdsx has both halves on
// 1.26: Player::getAbilities resolves as an address and those two LayeredAbilities names ship as
// symbols.json `accessors` at +1 and +0 (docs/findings-layouts.md).
Player.prototype.getPermissionLevel = derived(
    "?getPlayerPermissionLevel@Player@@QEBA?AW4PlayerPermissionLevel@@XZ",
    function getPlayerPermissionLevel(this: Player): PlayerPermission {
        return this.getAbilities().getPlayerPermissions();
    },
    () => procHacker.js("?getPlayerPermissionLevel@Player@@QEBA?AW4PlayerPermissionLevel@@XZ", int32_t, { this: Player }),
);
// 2024's `?getSkin@Player@@` is `lea 1920(%rcx)`: the SerializedSkin was a member. 1.26 holds a
// unique_ptr<SerializedSkinRef> instead (+2736 -- Player::getActorRendererId loads it where 2024 took the
// lea), and SerializedSkinRef is a shared_ptr whose object is SerializedSkinImpl at +0 of an empty-based
// ThreadOwner; the impl's members are 2024's SerializedSkin members in the same order. There is no 2024
// fallback: the member became a pointer, so a build without the layout has nothing correct to return.
Player.prototype.getSkin = derived(
    "?getSkin@Player@@QEAAAEAVSerializedSkin@@XZ",
    function getSkin(this: Player): SerializedSkin {
        const off = pdbcache.layouts.Player?.skin;
        if (off === undefined) throw Error("getSkin: this build's symbols.json has no layouts.Player.skin");
        const ref = (this as unknown as StaticPointer).getPointer(off);
        return ref.getPointerAs(SerializedSkin, 0);
    },
    () => procHacker.js("?getSkin@Player@@QEAAAEAVSerializedSkin@@XZ", SerializedSkin, { this: Player }),
);
Player.prototype.startCooldown = procHacker.js("?startCooldown@Player@@QEAAXPEBVItem@@_N@Z", void_t, { this: Player }, Item);
Player.prototype.getItemCooldownLeft = procHacker.js("?getItemCooldownLeft@Player@@QEBAHAEBVHashedString@@@Z", int32_t, { this: Player }, HashedString);
Player.prototype.setGameType = procHacker.js("?setPlayerGameType@ServerPlayer@@UEAAXW4GameType@@@Z", void_t, { this: Player }, int32_t);
Player.prototype.setPermissions = derived(
    "?setPermissions@Player@@QEAAXW4CommandPermissionLevel@@@Z",
    function setPermissions(this: Player, permissions: CommandPermissionLevel): void {
        this.getAbilities().setCommandPermissions(permissions);
    },
    () => procHacker.js("?setPermissions@Player@@QEAAXW4CommandPermissionLevel@@@Z", void_t, { this: Player }, int32_t),
);
Player.prototype.setSleeping = procHacker.js("?setSleeping@Player@@UEAAX_N@Z", void_t, { this: Player }, bool_t);
Player.prototype.isSleeping = procHacker.js("?isSleeping@Player@@UEBA_NXZ", bool_t, { this: Player });
// the same shape as isInWater: 2024's Actor::isJumping is `add rcx,8; jmp MobJump::isJumping`, and
// that is `ctx.hasComponent<MobIsJumpingFlagComponent>()`. 2024 spells the type
// FlagComponent<MobIsJumpingFlag>, whose hash no 1.26 function contains; the name this build uses
// comes from its own entt::type_info descriptors (docs/findings-components.md).
const MOB_IS_JUMPING_COMPONENT_HASH = enttTypeHash("MobIsJumpingFlagComponent");
Player.prototype.isJumping = derived(
    "?isJumping@Actor@@QEBA_NXZ",
    function isJumping(this: Player): boolean {
        return enttHas(this, MOB_IS_JUMPING_COMPONENT_HASH);
    },
    () => procHacker.js("?isJumping@Actor@@QEBA_NXZ", bool_t, { this: Player }),
);

const UpdateAbilitiesPacket$UpdateAbilitiesPacket = procHacker.js(
    "??0UpdateAbilitiesPacket@@QEAA@UActorUniqueID@@AEBVLayeredAbilities@@@Z",
    UpdateAbilitiesPacket,
    null,
    UpdateAbilitiesPacket,
    ActorUniqueID,
    LayeredAbilities,
);
Player.prototype.syncAbilities = function () {
    const pkt = new UpdateAbilitiesPacket(true);
    UpdateAbilitiesPacket$UpdateAbilitiesPacket(pkt, this.getUniqueIdBin(), this.getAbilities());
    this.sendPacket(pkt);
    pkt.destruct();
};

// Player's respawn point (docs/findings-layouts.md, "The respawn point"). 1.26 keeps the struct and
// two of the five functions: setRespawnPosition and setSpawnBlockRespawnPosition resolve as addresses,
// getSpawnPosition and getSpawnDimension ship as symbols.json `accessors`, and the three below have no
// body left in the binary. The unset value is INT_MIN in each of the six ints and Undefined (3) in the
// dimension -- 2024 loads those from globals, 1.26 spells INT_MIN as an overflow test and the dimension
// as the immediate 3. The fallbacks are the 2024 offsets; 1.26's are a constant -3728 from them.
const PLAYER_RESPAWN_POINT: Record<string, number> = { respawnBlockPos: 6512, respawnPos: 6524, respawnDimension: 6536 };
function playerRespawnOffset(member: string): number {
    return pdbcache.layouts.Player?.[member] ?? PLAYER_RESPAWN_POINT[member];
}
// the sentinel the 2024 bodies load from a global and compare against each of x, y and z: it is
// BlockPos::MIN.x, which both builds ship as a symbols.json `constant` of three INT_MINs
const RESPAWN_POS_UNSET = BlockPos.MIN.x;
const RESPAWN_DIM_UNSET = 3; // DimensionId.Undefined
function respawnPosIsUnset(player: Player, member: string): boolean {
    const p = player as unknown as StaticPointer;
    const off = playerRespawnOffset(member);
    return p.getInt32(off) === RESPAWN_POS_UNSET && p.getInt32(off + 4) === RESPAWN_POS_UNSET && p.getInt32(off + 8) === RESPAWN_POS_UNSET;
}
// the 2024 body (0x19e0160) is `!(player_position is unset) && dimension != Undefined`, in that order:
// it returns false as soon as the three ints are all INT_MIN, and false again if the dimension is 3
Player.prototype.hasRespawnPosition = derived(
    "?hasRespawnPosition@Player@@QEBA_NXZ",
    function hasRespawnPosition(this: Player): boolean {
        if (respawnPosIsUnset(this, "respawnPos")) return false;
        return (this as unknown as StaticPointer).getInt32(playerRespawnOffset("respawnDimension")) !== RESPAWN_DIM_UNSET;
    },
    () => procHacker.js("?hasRespawnPosition@Player@@QEBA_NXZ", bool_t, { this: Player }),
);
// the 2024 body (0x19dbcb0) writes INT_MIN over all six ints of player_respawn_point_ and Undefined
// over the dimension -- nothing else
Player.prototype.clearRespawnPosition = derived(
    "?clearRespawnPosition@Player@@QEAAXXZ",
    function clearRespawnPosition(this: Player): void {
        const p = this as unknown as StaticPointer;
        for (const member of ["respawnBlockPos", "respawnPos"]) {
            const off = playerRespawnOffset(member);
            p.setInt32(RESPAWN_POS_UNSET, off);
            p.setInt32(RESPAWN_POS_UNSET, off + 4);
            p.setInt32(RESPAWN_POS_UNSET, off + 8);
        }
        p.setInt32(RESPAWN_DIM_UNSET, playerRespawnOffset("respawnDimension"));
    },
    () => procHacker.js("?clearRespawnPosition@Player@@QEAAXXZ", void_t, { this: Player }),
);
Player.prototype.setRespawnPosition = procHacker.js(
    "?setRespawnPosition@Player@@QEAAXAEBVBlockPos@@V?$AutomaticID@VDimension@@H@@@Z",
    void_t,
    { this: Player },
    BlockPos,
    int32_t,
);
// 1.26 has one function where 2024 had two: the three callers of setSpawnBlockRespawnPosition are
// 2024's two (SimulatedPlayer::create, RespawnAnchorBlock::_trySetSpawn) plus Player::startSleepInBed,
// which in 2024 called setBedRespawnPosition. The surviving signature is the three-argument one, so the
// bed form is that call with the player's own dimension -- which is what the 2024 body used too.
Player.prototype.setBedRespawnPosition = derived(
    "?setBedRespawnPosition@Player@@QEAAXAEBVBlockPos@@@Z",
    function setBedRespawnPosition(this: Player, pos: BlockPos): void {
        this.setSpawnBlockRespawnPosition(pos, this.getDimensionId());
    },
    () => procHacker.js("?setBedRespawnPosition@Player@@QEAAXAEBVBlockPos@@@Z", void_t, { this: Player }, BlockPos),
);
Player.prototype.getSpawnDimension = procHacker.js("?getSpawnDimension@Player@@QEBA?AV?$AutomaticID@VDimension@@H@@XZ", int32_t, {
    this: Player,
    structureReturn: true,
});
Player.prototype.getSpawnPosition = procHacker.js("?getSpawnPosition@Player@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: Player });
Player.prototype.getCarriedItem = procHacker.js("?getCarriedItem@Player@@UEBAAEBVItemStack@@XZ", ItemStack, { this: Player });
Player.prototype.setOffhandSlot = procHacker.js("?setOffhandSlot@Player@@UEAAXAEBVItemStack@@@Z", void_t, { this: Player }, ItemStack);
Player.prototype.addItem = procHacker.js("?add@Player@@UEAA_NAEAVItemStack@@@Z", bool_t, { this: Player }, ItemStack);
Player.prototype.getEquippedTotem = procHacker.js("?getEquippedTotem@Player@@UEBAAEBVItemStack@@XZ", ItemStack, { this: Player });
Player.prototype.consumeTotem = procHacker.js("?consumeTotem@Player@@UEAA_NXZ", bool_t, { this: Player });
Player.prototype.setSpeed = procHacker.js("?setSpeed@Player@@UEAAXM@Z", void_t, { this: Player }, float32_t);
(Player.prototype as any)._sendInventory = procHacker.js("?sendInventory@Player@@UEAAX_N@Z", void_t, { this: Player }, bool_t);

@nativeClass(null)
class UserEntityIdentifierComponent extends NativeClass {
    @nativeField(NetworkIdentifier)
    networkIdentifier: NetworkIdentifier;
    @nativeField(mce.UUID, 0xa8) // accessed in PlayerListEntry::PlayerListEntry after calling entt::basic_registry<EntityId>::try_get<UserEntityIdentifierComponent>
    uuid: mce.UUID;
    @nativeField(Certificate.ref(), 0xd8) // accessed in ServerNetworkHandler::_displayGameMessage before calling ExtendedCertificate::getXuid
    certificate: Certificate; // it's ExtendedCertificate actually
}

EntityContext.prototype.isValid = procHacker.js("?isValid@EntityContext@@QEBA_NXZ", bool_t, {
    this: EntityContext,
});
EntityContext.prototype._enttRegistry = procHacker.js("?_registry@EntityContext@@QEBAAEAVEntityRegistry@@XZ", VoidPointer, {
    this: EntityContext,
});
EntityContext.prototype._getEntityId = procHacker.js("?_getEntityId@EntityContext@@IEBA?AVEntityId@@XZ", VoidPointer, {
    this: EntityContext,
    structureReturn: true,
});

// 1.26 has no out-of-line try_get for it; the component is 592 bytes with the NetworkIdentifier first
// (data/candidates-instances-<v>.json offsets.UserEntityIdentifierComponent, docs/findings-packets.md).
// Only networkIdentifier is re-derived: uuid and certificate are still the 2024 offsets.
const USER_ENTITY_ID_HASH = enttTypeHash("UserEntityIdentifierComponent");
const USER_ENTITY_ID_SIZE = (pdbcache.layouts.UserEntityIdentifierComponent ?? {}).size ?? 0x250;
const TryGetUserEntityIdComponent = derived<(actor: Actor) => UserEntityIdentifierComponent>(
    "??$tryGetComponent@VUserEntityIdentifierComponent@@@Actor@@QEAAPEAVUserEntityIdentifierComponent@@XZ",
    function tryGetUserEntityIdComponent(actor: Actor): UserEntityIdentifierComponent {
        const component = enttComponent(actor, USER_ENTITY_ID_HASH, USER_ENTITY_ID_SIZE);
        return component === null ? (null as any) : component.as(UserEntityIdentifierComponent);
    },
    () =>
        procHacker.js(
            "??$tryGetComponent@VUserEntityIdentifierComponent@@@Actor@@QEAAPEAVUserEntityIdentifierComponent@@XZ",
            UserEntityIdentifierComponent,
            null,
            Actor,
        ),
);

/**
 * ~1.20.50 implementing part of ServerNetworkHandler::_displayGameMessage
 * 1.20.50~ aspiring from existing, get components manually
 */
Player.prototype.getCertificate = function () {
    // part of ServerNetworkHandler::_displayGameMessage
    return TryGetUserEntityIdComponent(this).certificate;
};
Player.prototype.getDestroySpeed = procHacker.js("?getDestroySpeed@Player@@QEBAMAEBVBlock@@@Z", float32_t, { this: Player }, Block.ref());
Player.prototype.canDestroy = procHacker.js("?canDestroy@Player@@QEBA_NAEBVBlock@@@Z", bool_t, { this: Player }, Block.ref());
Player.prototype.addExperience = procHacker.js("?addExperience@Player@@UEAAXH@Z", void_t, { this: Player }, int32_t);
Player.prototype.addExperienceLevels = procHacker.js("?addLevels@Player@@UEAAXH@Z", void_t, { this: Player }, int32_t);
Player.prototype.resetExperienceLevels = procHacker.js("?resetPlayerLevel@Player@@QEAAXXZ", void_t, { this: Player });
// the XP curve. The 2024 body (0x19dfcd0) reads the player's level attribute, truncates it, divides by
// 15 and picks one of three affine formulas by the quotient -- 2L+7 below 15, 5L-38 below 30, 9L-158
// above -- caching the result in a field beside a dirty flag. 1.26 has no copy of it (the three
// `leal` forms that spell those constants appear once in 2024 and nowhere in either 1.26 build), and
// it needs no address: the level is the PlayerLevel attribute bdsx already reads.
Player.prototype.getXpNeededForNextLevel = derived(
    "?getXpNeededForNextLevel@Player@@QEBAHXZ",
    function getXpNeededForNextLevel(this: Player): number {
        const level = Math.trunc(this.getExperienceLevel());
        const quotient = Math.trunc(level / 15);
        if (quotient === 0) return level * 2 + 7;
        if (quotient === 1) return level * 5 - 38;
        return level * 9 - 158;
    },
    () => procHacker.js("?getXpNeededForNextLevel@Player@@QEBAHXZ", int32_t, { this: Player }),
);
// The player UI container (cursor, anvil, crafting grid ...). 2024's getPlayerUIItem (0x19df800) is
// `addq $0xd18,%rcx` and a tail jump to the container's vft slot 7 (getItem), and setCursorSelectedItem
// (0x19e86a0) is setPlayerUIItem(CursorSelected, item); 1.26 kept no copy of either. setPlayerUIItem
// itself survives with one more argument, passed straight on to InventoryTransactionManager::addAction
// where 2024 passed a constant 0 -- so it ships as `bdsx:Player::setPlayerUIItem` and bdsx passes 0.
// Without that address bdsx does the write alone through the container's setItem (slot 12), which skips
// the InventoryAction the function records. docs/findings-containers.md, 13.
const SimpleContainer$setItem = procHacker.jsv(
    "??_7SimpleContainer@@6B@",
    "?setItem@SimpleContainer@@UEAAXHAEBVItemStack@@@Z",
    void_t,
    { this: Container },
    int32_t,
    ItemStack,
);
const Player$setPlayerUIItem =
    "bdsx:Player::setPlayerUIItem" in proc ? procHacker.js("bdsx:Player::setPlayerUIItem", void_t, { this: Player }, int32_t, ItemStack, int32_t) : null;
Player.prototype.getPlayerUIItem = derived(
    "?getPlayerUIItem@Player@@QEAAAEBVItemStack@@W4PlayerUISlot@@@Z",
    function getPlayerUIItem(this: Player, slot: PlayerUISlot): ItemStack {
        return this.playerUIContainer.getItem(slot);
    },
    () => procHacker.js("?getPlayerUIItem@Player@@QEAAAEBVItemStack@@W4PlayerUISlot@@@Z", ItemStack.ref(), { this: Player }, int32_t),
);
Player.prototype.setPlayerUIItem = derived(
    "?setPlayerUIItem@Player@@QEAAXW4PlayerUISlot@@AEBVItemStack@@@Z",
    function setPlayerUIItem(this: Player, slot: PlayerUISlot, itemStack: ItemStack): void {
        if (Player$setPlayerUIItem !== null) Player$setPlayerUIItem.call(this, slot, itemStack, 0);
        else SimpleContainer$setItem.call(this.playerUIContainer, slot, itemStack);
    },
    () => procHacker.js("?setPlayerUIItem@Player@@QEAAXW4PlayerUISlot@@AEBVItemStack@@@Z", void_t, { this: Player }, int32_t, ItemStack.ref()),
);
Player.prototype.setCursorSelectedItem = derived(
    "?setCursorSelectedItem@Player@@QEAAXAEBVItemStack@@@Z",
    function setCursorSelectedItem(this: Player, itemStack: ItemStack): void {
        this.setPlayerUIItem(PlayerUISlot.CursorSelected, itemStack);
    },
    () => procHacker.js("?setCursorSelectedItem@Player@@QEAAXAEBVItemStack@@@Z", void_t, { this: Player }, ItemStack),
);
Player.prototype.getCursorSelectedItem = function (): ItemStack {
    return this.getPlayerUIItem(PlayerUISlot.CursorSelected);
};
Player.prototype.getPlatform = procHacker.js("?getPlatform@Player@@QEBA?AW4BuildPlatform@@XZ", int32_t, { this: Player });
Player.prototype.getXuid = procHacker.js("?getXuid@Player@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Player,
    structureReturn: true,
});
Player.prototype.getUuid = function () {
    return TryGetUserEntityIdComponent(this).uuid;
};
// 2024's body (0x19dd740, 68B) is `isCreative() || getILevel().vft[32]() == 0`, and ILevel slot 32 in the 2024
// table (0x2dc3ef8) is ?getDifficulty@Level@@ -- Difficulty::Peaceful is 0. 1.26 keeps no copy: none of the 27
// callers of the out-of-line isCreative (40 0xe1d650 / 51 0xd5d940) is a function of that shape, and no
// function under 900B holds both the ActorGameTypeComponent hash and a Level slot-36 call (the 2024
// callers, FoodItemComponent::use and CakeBlock::use, inlined it). Both pieces are BDS's own: isCreative is
// an address on both builds and getDifficulty is Level slot 36, executed (docs/findings-slots.md, route 9).
Player.prototype.forceAllowEating = derived(
    "?forceAllowEating@Player@@QEBA_NXZ",
    function forceAllowEating(this: Player): boolean {
        return this.isCreative() || this.getLevel().getDifficulty() === Difficulty.Peaceful;
    },
    () => procHacker.js("?forceAllowEating@Player@@QEBA_NXZ", bool_t, { this: Player }),
);
Player.prototype.getSpeed = procHacker.js("?getSpeed@Player@@UEBAMXZ", float32_t, { this: Player });
// `?hasOpenContainer@Player@@` is `cmpq $0, <the container manager>; setne` and 1.26 kept no copy of it.
// The member is Player+1440 here (2024: +1872) -- ?setContainerManager@Player@@ stores there on both
// builds, and ?canOpenContainerScreen@Player@@, whose second step is the execution-confirmed
// ?isInsidePortal@Actor@@, opens by testing it. docs/findings-layouts.md, "The container manager".
const PLAYER_CONTAINER_MANAGER = 1872; // the 2024 offset, used only if a build resolves no layout
Player.prototype.hasOpenContainer = derived(
    "?hasOpenContainer@Player@@QEBA_NXZ",
    function hasOpenContainer(this: Player): boolean {
        const off = pdbcache.layouts.Player?.containerManager ?? PLAYER_CONTAINER_MANAGER;
        return (this as unknown as StaticPointer).getNullablePointer(off) !== null;
    },
    () => procHacker.js("?hasOpenContainer@Player@@QEBA_NXZ", bool_t, { this: Player }),
);
// `Player::isHungry` is one comparison on the hunger attribute. The 2024 body (0x19e1950) loads
// `Player::HUNGER`, calls Actor::getAttribute, then getCurrentValue into xmm6 and getMaxValue into
// xmm0 and returns `comiss %xmm6,%xmm0; seta` -- max above current. bdsx reaches the instance through
// the BaseAttributeMap lookup it already derives (docs/findings-layouts.md).
Player.prototype.isHungry = derived(
    "?isHungry@Player@@QEBA_NXZ",
    function isHungry(this: Player): boolean {
        const attr = this.getAttributes().getMutableInstance(AttributeId.PlayerHunger);
        if (attr === null) return false;
        return attr.maxValue > attr.currentValue;
    },
    () => procHacker.js("?isHungry@Player@@QEBA_NXZ", bool_t, { this: Player }),
);
// the 2024 body (0x19e1990) is getHealth() > 0 && getHealth() < getMaxHealth(), and both of those
// are functions bdsx already has on the 1.26 builds (ActorAttribute::getHealth / getMaxHealth)
Player.prototype.isHurt = derived(
    "?isHurt@Player@@QEAA_NXZ",
    function isHurt(this: Player): boolean {
        const health = this.getHealth();
        return health > 0 && health < this.getMaxHealth();
    },
    () =>
        procHacker.js("?isHurt@Player@@QEAA_NXZ", bool_t, {
            this: Player,
        }),
);
Player.prototype.isSpawned = procHacker.js("?isSpawned@Player@@QEBA_NXZ", bool_t, { this: Player });
Player.prototype.isLoading = procHacker.jsv("??_7ServerPlayer@@6B@", "?isLoading@ServerPlayer@@UEBA_NXZ", bool_t, { this: Player });
Player.prototype.isPlayerInitialized = procHacker.jsv("??_7ServerPlayer@@6B@", "?isPlayerInitialized@ServerPlayer@@UEBA_NXZ", bool_t, { this: Player });
// `?setLocalPlayerAsInitialized@ServerPlayer@@` is one byte store (2024: `movb $1,7754(%rcx); retq`) and
// 1.26 inlined it into the packet handler -- which is why events.playerJoin already falls back to hooking
// that handler. The offset is the byte ServerPlayer::isPlayerInitialized returns, the last of its four
// steps, and that function this table does resolve on both builds. It is the one offset that differs
// between them. docs/findings-layouts.md, "The initialized byte".
const SERVER_PLAYER_INITIALIZED = 7754; // 2024's; both 1.26 builds ship their own in layouts.ServerPlayer
Player.prototype.setLocalPlayerAsInitialized = derived(
    "?setLocalPlayerAsInitialized@ServerPlayer@@QEAAXXZ",
    function setLocalPlayerAsInitialized(this: Player): void {
        (this as unknown as StaticPointer).setUint8(1, pdbcache.layouts.ServerPlayer?.localPlayerInitialized ?? SERVER_PLAYER_INITIALIZED);
    },
    () => procHacker.js("?setLocalPlayerAsInitialized@ServerPlayer@@QEAAXXZ", void_t, { this: Player }),
);
Player.prototype.getDestroyProgress = procHacker.js("?getDestroyProgress@Player@@QEBAMAEBVBlock@@@Z", float32_t, { this: Player }, Block);
Player.prototype.respawn = procHacker.js("?respawn@Player@@UEAAXXZ", void_t, {
    this: Player,
});
// `?setRespawnReady@Player@@` is three stores (2024 0x19e91b0: the Vec3 at +6604, `movb $1,+2864`,
// `movb $0,+2905`) and 1.26 kept no copy. It inlined the whole body into the successor of
// setRespawnPositionCandidate (40 0x56a6960 / 51 0x9109070): the Vec3 to +2904, `movb $1,1800`,
// `movb $0,1802`, in that order. Player::respawn reads the Vec3 with `lea 2904` where 2024's takes
// `lea 6604`. docs/findings-layouts.md, "setRespawnReady".
const PLAYER_RESPAWN_2024 = { respawnReady: 2864, respawningFromTheEnd: 2905, respawnOriginalPosition: 6604 };
Player.prototype.setRespawnReady = derived(
    "?setRespawnReady@Player@@QEAAXAEBVVec3@@@Z",
    function setRespawnReady(this: Player, vec3: Vec3): void {
        const l = pdbcache.layouts.Player ?? {};
        const ptr = this as unknown as StaticPointer;
        const pos = l.respawnOriginalPosition ?? PLAYER_RESPAWN_2024.respawnOriginalPosition;
        ptr.setFloat32(vec3.x, pos);
        ptr.setFloat32(vec3.y, pos + 4);
        ptr.setFloat32(vec3.z, pos + 8);
        ptr.setUint8(1, l.respawnReady ?? PLAYER_RESPAWN_2024.respawnReady);
        ptr.setUint8(0, l.respawningFromTheEnd ?? PLAYER_RESPAWN_2024.respawningFromTheEnd);
    },
    () => procHacker.js("?setRespawnReady@Player@@QEAAXAEBVVec3@@@Z", void_t, { this: Player }, Vec3),
);
Player.prototype.setSpawnBlockRespawnPosition = procHacker.js(
    "?setSpawnBlockRespawnPosition@Player@@QEAAXAEBVBlockPos@@V?$AutomaticID@VDimension@@H@@@Z",
    void_t,
    { this: Player },
    BlockPos,
    int32_t,
);
Player.prototype.setSelectedSlot = procHacker.js("?setSelectedSlot@Player@@QEAAAEBVItemStack@@H@Z", ItemStack, { this: Player }, int32_t);
/** float32 of pi/180, the constant 2024's Player::getDirection multiplies the yaw by (0x2be5568) */
const DEG_TO_RAD = 0.01745329238474369;
// Player::getDirection is Direction::getDirection(sin(yaw), -cos(yaw)) over the actor's own rotation.
// The 2024 body (0x19de6f0) calls Actor::getRotation, multiplies rotation.y by float32(pi/180) twice,
// calls mce::Math::cos then mce::Math::sin, and tail-calls the static
// ?getDirection@Direction@@SA?AW4Type@1@MM@Z (0x17f8190) with xmm0 = sin, xmm1 = -cos. That static is a
// nine-instruction leaf and pure arithmetic: `|x| > |z| ? (x > 0 ? 1 : 3) : (z > 0 ? 2 : 0)`, which is
// bdsx's Direction.Type in its own order (South 0, West 1, North 2, East 3) -- the same quadrant
// convention Facing.convertYRotationToFacingDirection already carries. getRotation is a field accessor
// on both 1.26 builds, so nothing here needs an address. One caveat kept in the open: BDS's sin/cos are
// a 65,536-entry table (mce::Math::cos is `mulss; addss; cvttss2si; movzwl; movss (table,rcx,4)`), so on
// a yaw that sits exactly on a quadrant boundary (45, 135, ...) their rounding and ours may disagree.
Player.prototype.getDirection = derived(
    "?getDirection@Player@@QEBAHXZ",
    function getDirection(this: Player): Direction.Type {
        const rad = Math.fround(Math.fround(this.getRotation().y) * DEG_TO_RAD);
        const x = Math.fround(Math.sin(rad));
        const z = Math.fround(-Math.cos(rad));
        if (Math.abs(x) > Math.abs(z)) return x > 0 ? Direction.Type.West : Direction.Type.East;
        return z > 0 ? Direction.Type.North : Direction.Type.South;
    },
    () => procHacker.js("?getDirection@Player@@QEBAHXZ", int32_t, { this: Player }),
);
// 2024: try_get<AbilitiesComponent> then a tail jump into LayeredAbilities::getBool with index 9.
// getAbilities resolves on both 1.26 builds and getBool is bdsx's own body, so this is the two of them.
Player.prototype.isFlying = derived(
    "?isFlying@Player@@QEBA_NXZ",
    function isFlying(this: Player): boolean {
        return this.getAbilities().getBool(AbilitiesIndex.Flying);
    },
    () => procHacker.js("?isFlying@Player@@QEBA_NXZ", bool_t, { this: Player }),
);
Player.prototype.isHiddenFrom = procHacker.js("?isHiddenFrom@Player@@QEBA_NAEAVMob@@@Z", bool_t, { this: Player }, Mob);
Player.prototype.isInRaid = procHacker.js("?isInRaid@Player@@QEBA_NXZ", bool_t, { this: Player });
// `?isUsingItem@Player@@` and `?hasDimension@Actor@@` have no address on 1.26 and are deliberately not
// derived yet: each has a layout candidate whose check so far saw only one side (docs/findings-layouts.md,
// "Candidates held back"). isInWorld below uses the same dimension test internally.
Player.prototype.isUsingItem = procHacker.js("?isUsingItem@Player@@QEBA_NXZ", bool_t, { this: Player });
Player.prototype.hasDimension = procHacker.js("?hasDimension@Actor@@QEBA_NXZ", bool_t, { this: Player });
Player.prototype.getAbilities = procHacker.js("?getAbilities@Player@@QEAAAEAVLayeredAbilities@@XZ", LayeredAbilities, { this: Player });
Player.prototype.getSelectedItem = procHacker.js("?getSelectedItem@Player@@QEBAAEBVItemStack@@XZ", ItemStack, { this: Player });
Player.prototype.getName = procHacker.js("?getName@Player@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, { this: Player });

Player.tryGetFromEntity = derived<(entity: EntityContext, getRemoved?: boolean) => Player | null>(
    "?tryGetFromEntity@Player@@SAPEAV1@AEAVEntityContext@@_N@Z",
    function tryGetFromEntity(entity: EntityContext, getRemoved: boolean = false): Player | null {
        if (!enttHas(contextHolder(entity), PLAYER_COMPONENT_HASH)) return null;
        const p = actorFromEntity(entity, getRemoved);
        return p === null ? null : (Actor.from(p) as Player | null);
    },
    () => procHacker.js("?tryGetFromEntity@Player@@SAPEAV1@AEAVEntityContext@@_N@Z", Player, null, EntityContext, bool_t),
);

ServerPlayer.prototype.nextContainerCounter = procHacker.js("?_nextContainerCounter@ServerPlayer@@AEAA?AW4ContainerID@@XZ", int8_t, { this: ServerPlayer });
ServerPlayer.prototype.openInventory = procHacker.js("?openInventory@ServerPlayer@@UEAAXXZ", void_t, { this: ServerPlayer });
ServerPlayer.prototype.resendAllChunks = procHacker.js("?resendAllChunks@Player@@QEAAXXZ", void_t, { this: ServerPlayer });
ServerPlayer.prototype.sendNetworkPacket = procHacker.js("?sendNetworkPacket@ServerPlayer@@UEBAXAEAVPacket@@@Z", void_t, { this: ServerPlayer }, Packet);
/**
 * ~1.20.50 implementing part of ServerPlayer::sendNetworkPacket
 * 1.20.50~ aspiring from existing, get components manually
 */
ServerPlayer.prototype.getNetworkIdentifier = function () {
    return TryGetUserEntityIdComponent(this).networkIdentifier;
};
ServerPlayer.prototype.setArmor = procHacker.js("?setArmor@ServerPlayer@@UEAAXW4ArmorSlot@@AEBVItemStack@@@Z", void_t, { this: ServerPlayer }, uint32_t, ItemStack);
ServerPlayer.prototype.sendArmor = procHacker.js("?sendArmor@ServerPlayer@@UEAAXV?$bitset@$03@std@@@Z", void_t, { this: ServerPlayer }, int32_t);
ServerPlayer.prototype.getInputMode = function () {
    return PlayerMovement.getInputMode(this.ctxbase);
};
ServerPlayer.prototype.setOffhandSlot = procHacker.js("?setOffhandSlot@ServerPlayer@@UEAAXAEBVItemStack@@@Z", void_t, { this: ServerPlayer }, ItemStack);
(ServerPlayer.prototype as any)._sendInventory = procHacker.js("?sendInventory@ServerPlayer@@UEAAX_N@Z", void_t, { this: ServerPlayer }, bool_t);
ServerPlayer.tryGetFromEntity = derived<(entity: EntityContext, getRemoved?: boolean) => ServerPlayer | null>(
    "?tryGetFromEntity@ServerPlayer@@SAPEAV1@AEAVEntityContext@@_N@Z",
    function tryGetFromEntity(entity: EntityContext, getRemoved: boolean = false): ServerPlayer | null {
        if (!enttHas(contextHolder(entity), SERVER_PLAYER_COMPONENT_HASH)) return null;
        const p = actorFromEntity(entity, getRemoved);
        return p === null ? null : (Actor.from(p) as ServerPlayer | null);
    },
    () => procHacker.js("?tryGetFromEntity@ServerPlayer@@SAPEAV1@AEAVEntityContext@@_N@Z", ServerPlayer, null, EntityContext, bool_t),
);

const ServerNetworkHandlerNonOwnerPointer = Bedrock.NonOwnerPointer.make(ServerNetworkHandler);
SimulatedPlayer.abstract({});
const SimulatedPlayer$create = procHacker.js(
    "?create@SimulatedPlayer@@SAPEAV1@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBVBlockPos@@V?$AutomaticID@VDimension@@H@@V?$not_null@V?$NonOwnerPointer@VServerNetworkHandler@@@Bedrock@@@gsl@@0@Z",
    SimulatedPlayer,
    null,
    CxxString,
    BlockPos,
    int32_t,
    ServerNetworkHandlerNonOwnerPointer,
    CxxString,
);

const shHandler = ServerNetworkHandlerNonOwnerPointer.construct();

SimulatedPlayer.create = function (name: string, blockPos: VectorXYZ, dimensionId: DimensionId) {
    if (!(blockPos instanceof BlockPos)) blockPos = BlockPos.create(blockPos);
    shHandler.assign(bedrockServer.nonOwnerPointerServerNetworkHandler);
    const unknown = "";
    return SimulatedPlayer$create(name, blockPos as BlockPos, dimensionId, shHandler, unknown); // it destructs snHandler
};
SimulatedPlayer.prototype.simulateDisconnect = procHacker.js("?simulateDisconnect@SimulatedPlayer@@QEAAXXZ", void_t, { this: SimulatedPlayer });
SimulatedPlayer.prototype.simulateAttack = procHacker.js("?simulateAttack@SimulatedPlayer@@QEAA_NPEAVActor@@@Z", bool_t, { this: SimulatedPlayer }, Actor);
const SimulatedPlayer$simulateLookAtEntity = procHacker.js(
    "?simulateLookAt@SimulatedPlayer@@QEAAXAEAVActor@@W4LookDuration@sim@@@Z",
    void_t,
    null,
    SimulatedPlayer,
    Actor,
    uint8_t,
);
const SimulatedPlayer$simulateLookAtBlock = procHacker.js(
    "?simulateLookAt@SimulatedPlayer@@QEAAXAEBVBlockPos@@W4LookDuration@sim@@@Z",
    void_t,
    null,
    SimulatedPlayer,
    BlockPos,
    uint8_t,
);
const SimulatedPlayer$simulateLookAtLocation = procHacker.js(
    "?simulateLookAt@SimulatedPlayer@@QEAAXAEBVVec3@@W4LookDuration@sim@@@Z",
    void_t,
    null,
    SimulatedPlayer,
    Vec3,
    uint8_t,
);
SimulatedPlayer.prototype.simulateLookAt = function (target: BlockPos | Actor | Vec3, duration: uint8_t = 0) {
    if (target instanceof Actor) {
        SimulatedPlayer$simulateLookAtEntity(this, target, duration);
    } else if (target instanceof BlockPos) {
        SimulatedPlayer$simulateLookAtBlock(this, target, duration);
    } else {
        SimulatedPlayer$simulateLookAtLocation(this, target, duration);
    }
};
SimulatedPlayer.tryGetFromEntity = procHacker.js("?tryGetFromEntity@SimulatedPlayer@@SAPEAV1@AEAVEntityContext@@_N@Z", SimulatedPlayer, null, EntityContext, bool_t);

/*
TODO: Implement `ScriptNavigationResult`
const SimulatedPlayer$simulateNavigateToEntity = procHacker.js("?simulateNavigateToEntity@SimulatedPlayer@@QEAA?AUScriptNavigationResult@@AEAVActor@@M@Z",void_t,null,SimulatedPlayer,Actor,float32_t);
const SimulatedPlayer$simulateNavigateToLocation = procHacker.js("?simulateNavigateToLocation@SimulatedPlayer@@QEAA?AUScriptNavigationResult@@AEBVVec3@@M@Z",void_t,null,SimulatedPlayer,Vec3,float32_t);
SimulatedPlayer.prototype.simulateNavigateTo = function(goal:Actor|Vec3, speed:number){
    if(goal instanceof Vec3){
        SimulatedPlayer$simulateNavigateToLocation(this,goal,speed);
    }else{
        SimulatedPlayer$simulateNavigateToEntity(this,goal,speed);
    }
}; */

const SimulatedPlayer$simulateNavigateToLocations = procHacker.js(
    "?simulateNavigateToLocations@SimulatedPlayer@@QEAAX$$QEAV?$vector@VVec3@@V?$allocator@VVec3@@@std@@@std@@M@Z",
    void_t,
    null,
    SimulatedPlayer,
    CxxVector$Vec3,
    float32_t,
);
SimulatedPlayer.prototype.simulateNavigateToLocations = function (_locations, speed) {
    const locations = CxxVector$Vec3.construct();
    locations.reserve(_locations.length);
    for (const location of _locations) {
        locations.push(location);
    }
    SimulatedPlayer$simulateNavigateToLocations(this, locations, speed);
    locations.destruct();
};

SimulatedPlayer.prototype.simulateInteractWithActor = procHacker.js(
    "?simulateInteract@SimulatedPlayer@@QEAA_NAEAVActor@@@Z",
    bool_t,
    { this: SimulatedPlayer },
    Actor,
);
const SimulatedPlayer$simulateInteractWithBlock = procHacker.js(
    "?simulateInteract@SimulatedPlayer@@QEAA_NAEBVBlockPos@@W4ScriptFacing@ScriptModuleMinecraft@@@Z",
    bool_t,
    null,
    SimulatedPlayer,
    BlockPos,
    uint8_t,
);
SimulatedPlayer.prototype.simulateInteractWithBlock = function (blockPos: BlockPos, direction: number = 1) {
    return SimulatedPlayer$simulateInteractWithBlock(this, blockPos, direction);
};
SimulatedPlayer.prototype.simulateJump = procHacker.js("?simulateJump@SimulatedPlayer@@QEAA_NXZ", void_t, { this: SimulatedPlayer });
SimulatedPlayer.prototype.simulateSetBodyRotation = procHacker.js(
    "?simulateSetBodyRotation@SimulatedPlayer@@QEAAXM@Z",
    void_t,
    { this: SimulatedPlayer },
    float32_t,
);
SimulatedPlayer.prototype.simulateSetItem = procHacker.js(
    "?simulateSetItem@SimulatedPlayer@@QEAA_NAEAVItemStack@@_NH@Z",
    bool_t,
    { this: SimulatedPlayer },
    ItemStack,
    bool_t,
    int32_t,
);
const SimulatedPlayer$simulateDestroyBlock = procHacker.js(
    "?simulateDestroyBlock@SimulatedPlayer@@QEAA_NAEBVBlockPos@@W4ScriptFacing@ScriptModuleMinecraft@@@Z",
    bool_t,
    null,
    SimulatedPlayer,
    BlockPos,
    int32_t,
);
SimulatedPlayer.prototype.simulateDestroyBlock = function (pos: BlockPos, direction: number = 1) {
    return SimulatedPlayer$simulateDestroyBlock(this, pos, direction);
};
SimulatedPlayer.prototype.simulateStopDestroyingBlock = procHacker.js("?simulateStopDestroyingBlock@SimulatedPlayer@@QEAAXXZ", void_t, { this: SimulatedPlayer });
SimulatedPlayer.prototype.simulateLocalMove = procHacker.js(
    "?simulateLocalMove@SimulatedPlayer@@QEAAXAEBVVec3@@M@Z",
    void_t,
    { this: SimulatedPlayer },
    Vec3,
    float32_t,
);
SimulatedPlayer.prototype.simulateMoveToLocation = procHacker.js(
    "?simulateMoveToLocation@SimulatedPlayer@@QEAAXAEBVVec3@@M_N@Z",
    void_t,
    { this: SimulatedPlayer },
    Vec3,
    float32_t,
    bool_t,
);
SimulatedPlayer.prototype.simulateStopMoving = procHacker.js("?simulateStopMoving@SimulatedPlayer@@QEAAXXZ", void_t, { this: SimulatedPlayer });
SimulatedPlayer.prototype.simulateUseItem = procHacker.js("?simulateUseItem@SimulatedPlayer@@QEAA_NAEAVItemStack@@@Z", bool_t, { this: SimulatedPlayer }, ItemStack);
SimulatedPlayer.prototype.simulateUseItemInSlot = procHacker.js("?simulateUseItemInSlot@SimulatedPlayer@@QEAA_NH@Z", bool_t, { this: SimulatedPlayer }, int32_t);
const SimulatedPlayer$simulateUseItemOnBlock = procHacker.js(
    "?simulateUseItemOnBlock@SimulatedPlayer@@QEAA_NAEAVItemStack@@AEBVBlockPos@@W4ScriptFacing@ScriptModuleMinecraft@@AEBVVec3@@@Z",
    bool_t,
    null,
    SimulatedPlayer,
    ItemStack,
    BlockPos,
    int32_t,
    Vec3,
);
SimulatedPlayer.prototype.simulateUseItemOnBlock = function (item: ItemStack, pos: BlockPos, direction: number = 1, clickPos: Vec3 = Vec3.create(0, 0, 0)) {
    return SimulatedPlayer$simulateUseItemOnBlock(this, item, pos, direction, clickPos);
};
const SimulatedPlayer$simulateUseItemInSlotOnBlock = procHacker.js(
    "?simulateUseItemInSlotOnBlock@SimulatedPlayer@@QEAA_NHAEBVBlockPos@@W4ScriptFacing@ScriptModuleMinecraft@@AEBVVec3@@@Z",
    bool_t,
    null,
    SimulatedPlayer,
    int32_t,
    BlockPos,
    int32_t,
    Vec3,
);
SimulatedPlayer.prototype.simulateUseItemInSlotOnBlock = function (slot: number, pos: BlockPos, direction: number = 1, clickPos: Vec3 = Vec3.create(0, 0, 0)) {
    return SimulatedPlayer$simulateUseItemInSlotOnBlock(this, slot, pos, direction, clickPos);
};

const PlayerListEntry$PlayerListEntry = procHacker.js("??0PlayerListEntry@@QEAA@AEBVPlayer@@@Z", PlayerListEntry, null, PlayerListEntry, Player);
PlayerListEntry.constructWith = function (player: Player): PlayerListEntry {
    const entry = new PlayerListEntry(true);
    return PlayerListEntry$PlayerListEntry(entry, player);
};
PlayerListEntry.prototype[NativeType.dtor] = procHacker.js("??1PlayerListEntry@@QEAA@XZ", void_t, { this: PlayerListEntry });
// 1.26's entry holds the skin by shared_ptr (+128, taken from the Player's SerializedSkinRef at +2736)
// where 2024 held a SerializedSkin by value at 0x80; the pointed-to object has 2024's members in order.
if (pdbcache.layouts.PlayerListEntry?.skin !== undefined) {
    const off = pdbcache.layouts.PlayerListEntry.skin;
    Object.defineProperty(PlayerListEntry.prototype, "skin", {
        get(this: PlayerListEntry): SerializedSkin {
            return (this as unknown as StaticPointer).getPointerAs(SerializedSkin, off);
        },
    });
}

// networkidentifier.ts
NetworkIdentifier.prototype.getActor = function (): ServerPlayer | null {
    return bedrockServer.serverNetworkHandler._getServerPlayer(this, 0);
};
NetworkIdentifier.prototype.getAddress = function (): string {
    const idx = this.address.GetSystemIndex();
    const rakpeer = bedrockServer.rakPeer;
    return rakpeer.GetSystemAddressFromIndex(idx).toString();
};
// Both comparisons are spelled out from the type when the build has no
// address for them (docs/findings-instances.md, "The full launcher and a
// client"): the 1.26 builds inline them, and the first packet sent to a
// joining client is what asks.
const NetworkIdentifier$equalsTypeData = derived<(a: NetworkIdentifier, b: NetworkIdentifier) => boolean>(
    "?equalsTypeData@NetworkIdentifier@@AEBA_NAEBV1@@Z",
    (a, b) => a.equalsTypeDataByLayout(b),
    () => procHacker.js("?equalsTypeData@NetworkIdentifier@@AEBA_NAEBV1@@Z", bool_t, null, NetworkIdentifier, NetworkIdentifier),
);
NetworkIdentifier.prototype.equals = function (other): boolean {
    if (this.type !== other.type) return false;
    return NetworkIdentifier$equalsTypeData(this, other);
};

const NetworkIdentifier_getHash = derived<(ni: NetworkIdentifier) => number>(
    "?getHash@NetworkIdentifier@@QEBA_KXZ",
    ni => ni.hashByLayout(),
    () => {
        const native = procHacker.js("?getHash@NetworkIdentifier@@QEBA_KXZ", bin64_t, null, NetworkIdentifier);
        return ni => {
            const hash = native(ni);
            return bin.int32(hash) ^ bin.int32_high(hash);
        };
    },
);
NetworkIdentifier.prototype.hash = function () {
    return NetworkIdentifier_getHash(this);
};

NetworkConnection.abstract({
    networkIdentifier: [NetworkIdentifier, 0],
});
Object.defineProperties(NetworkSystem.prototype, {
    instance: {
        get() {
            return bedrockServer.connector;
        },
    },
});

// NetworkSystem::Connection* NetworkSystem::getConnectionFromId(const NetworkIdentifier& ni)
NetworkSystem.prototype.getConnectionFromId = procHacker.js(
    "?_getConnectionFromId@NetworkSystem@@AEBAPEAVNetworkConnection@@AEBVNetworkIdentifier@@@Z",
    NetworkConnection,
    { this: NetworkSystem },
);

// void NetworkSystem::send(const NetworkIdentifier& ni, Packet& packet, unsigned char senderSubClientId)
NetworkSystem.prototype.send = makefunc.js(
    asmcode.packetSendHook, // pass hooked function directly, reduce overhead
    void_t,
    { this: NetworkSystem },
    NetworkIdentifier,
    Packet,
    uint8_t,
);

// void NetworkSystem::_sendInternal(const NetworkIdentifier& ni, Packet* packet, std::string& data)
NetworkSystem.prototype.sendInternal = procHacker.js(
    "?_sendInternal@NetworkSystem@@AEAAXAEBVNetworkIdentifier@@AEBVPacket@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: NetworkSystem },
    NetworkIdentifier,
    Packet,
    CxxStringWrapper,
);

NetworkConnection.prototype.disconnect = function () {
    // NetworkSystem::onConnectionClosed, [rbx] = NetworkSystem*
    (this as any as StaticPointer).setUint8(1, 0x168);
};

const BatchedNetworkPeer$sendPacket = procHacker.js(
    "?sendPacket@BatchedNetworkPeer@@UEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@W4Reliability@NetworkPeer@@W4Compressibility@@@Z",
    void_t,
    { this: BatchedNetworkPeer },
    CxxString,
    int32_t,
    int32_t,
);
BatchedNetworkPeer.prototype.sendPacket = function (data: CxxString, reliability: number, compressibility: number, oldparam?: number, oldparam2?: number) {
    if (oldparam2 !== undefined) {
        compressibility = oldparam2;
    } else if (oldparam !== undefined) {
        compressibility = oldparam;
    }
    BatchedNetworkPeer$sendPacket.call(this, data, reliability, compressibility);
};
Object.defineProperties(RakNetConnector.prototype, {
    peer: {
        get() {
            return bedrockServer.rakPeer;
        },
    },
});
RakNetConnector.prototype.getPort = procHacker.js("?getPort@RakNetConnector@@UEBAGXZ", uint16_t, { this: RakNetConnector });

RakNet.RakPeer.prototype.GetAveragePing = procHacker.js(
    "?GetAveragePing@RakPeer@RakNet@@UEAAHUAddressOrGUID@2@@Z",
    int32_t,
    { this: RakNet.RakPeer },
    RakNet.AddressOrGUID,
);
RakNet.RakPeer.prototype.GetLastPing = procHacker.js(
    "?GetLastPing@RakPeer@RakNet@@UEBAHUAddressOrGUID@2@@Z",
    int32_t,
    { this: RakNet.RakPeer },
    RakNet.AddressOrGUID,
);
RakNet.RakPeer.prototype.GetLowestPing = procHacker.js(
    "?GetLowestPing@RakPeer@RakNet@@UEBAHUAddressOrGUID@2@@Z",
    int32_t,
    { this: RakNet.RakPeer },
    RakNet.AddressOrGUID,
);

// packet.ts
Packet.prototype[NativeType.dtor] = vectorDeletingDestructor;
Packet.prototype.sendTo = function (target: NetworkIdentifier, senderSubClientId: number = 0): void {
    bedrockServer.networkSystem.send(target, this, senderSubClientId);
};
// Packet::getId is slot 1 of every packet table, in 2024 and in 1.26 (Endstone packet.h:
// ~Packet, getId, getName, ...); 1.26 has no SetTitlePacket::getId to name the slot by, so the
// call goes through the object's own table (docs/findings-packets.md). Every received packet
// passes through this in packetevent.ts.
Packet.prototype.getId = derived<(this: Packet) => number>(
    "?getId@SetTitlePacket@@UEBA?AW4MinecraftPacketIds@@XZ",
    makefunc.js(
        asm().mov_r_rp(Register.rax, Register.rcx, 1, 0).jmp_rp(Register.rax, 1, 8).alloc("Packet::getId via vft[1]"),
        int32_t,
        { this: Packet },
    ),
    () => procHacker.jsv("??_7SetTitlePacket@@6B@", "?getId@SetTitlePacket@@UEBA?AW4MinecraftPacketIds@@XZ", int32_t, { this: Packet }),
);
Packet.prototype.getName = procHacker.jsv(
    "??_7LoginPacket@@6B@",
    "?getName@LoginPacket@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: Packet, structureReturn: true },
);
Packet.prototype.write = procHacker.jsv("??_7LoginPacket@@6B@", "?write@LoginPacket@@UEBAXAEAVBinaryStream@@@Z", void_t, { this: Packet }, BinaryStream);
Packet.prototype.read = procHacker.jsv(
    "??_7LoginPacket@@6B@",
    "?_read@LoginPacket@@EEAA?AV?$Result@XVerror_code@std@@@Bedrock@@AEAVReadOnlyBinaryStream@@@Z",
    Bedrock.VoidErrorCodeResult,
    { this: Packet },
    BinaryStream,
);

ItemStackRequestData.prototype.getStringsToFilter = function () {
    // assuming it is put before the actions vector, it can be tested by renaming an item with an anvil.
    return this.addAs(CxxVector$string, 0x10);
};
ItemStackRequestData.prototype.getActions = function () {
    // accessed in tryFindAction, to check if the vector is empty
    return this.addAs(CxxVector$ItemStackRequestActionRef, 0x30);
};
ItemStackRequestData.prototype.tryFindAction = procHacker.js(
    "?tryFindAction@ItemStackRequestData@@QEBAPEBVItemStackRequestAction@@W4ItemStackRequestActionType@@@Z",
    ItemStackRequestAction,
    { this: ItemStackRequestData },
    uint8_t,
);

PlayerAuthInputPacket.prototype.getInput = procHacker.js(
    "?getInput@PlayerAuthInputPacket@@QEBA_NW4InputData@1@@Z",
    bool_t,
    { this: PlayerAuthInputPacket },
    int32_t,
);

// networkidentifier.ts
ServerNetworkHandler.prototype._getServerPlayer = procHacker.js(
    "?_getServerPlayer@ServerNetworkHandler@@EEAAPEAVServerPlayer@@AEBVNetworkIdentifier@@W4SubClientId@@@Z",
    ServerPlayer,
    { this: ServerNetworkHandler },
    NetworkIdentifier,
    uint8_t,
);
const ServerNetworkHandler$disconnectClient = procHacker.js(
    "?disconnectClient@ServerNetworkHandler@@QEAAXAEBVNetworkIdentifier@@W4SubClientId@@W4DisconnectFailReason@Connection@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@_N@Z",
    void_t,
    null,
    ServerNetworkHandler,
    NetworkIdentifier,
    uint8_t,
    int32_t,
    CxxString,
    bool_t,
);
ServerNetworkHandler.prototype.disconnectClient = function (
    client: NetworkIdentifier,
    message: string = "disconnectionScreen.disconnected",
    skipMessage: boolean = false,
): void {
    ServerNetworkHandler$disconnectClient(this, client, /** subClientId */ 0, /** disconnectFailReason */ 0, message, skipMessage);
};
ServerNetworkHandler.prototype.allowIncomingConnections = procHacker.js(
    "?allowIncomingConnections@ServerNetworkHandler@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@_N@Z",
    void_t,
    { this: ServerNetworkHandler },
    CxxString,
    bool_t,
);
ServerNetworkHandler.prototype.updateServerAnnouncement = procHacker.js("?updateServerAnnouncement@ServerNetworkHandler@@QEAAXXZ", void_t, {
    this: ServerNetworkHandler,
});
ServerNetworkHandler.prototype.setMaxNumPlayers = procHacker.js("?setMaxNumPlayers@ServerNetworkHandler@@QEAAHH@Z", void_t, { this: ServerNetworkHandler }, int32_t);
ServerNetworkHandler.prototype.fetchConnectionRequest = procHacker.js(
    "?fetchConnectionRequest@ServerNetworkHandler@@QEAAAEBVConnectionRequest@@AEBVNetworkIdentifier@@@Z",
    ConnectionRequest,
    { this: ServerNetworkHandler },
    NetworkIdentifier,
);

// connreq.ts
Certificate.prototype.getXuid = function (b): string {
    return ExtendedCertificate.getXuid(this, b!);
};
Certificate.prototype.getIdentityName = function (): string {
    return ExtendedCertificate.getIdentityName(this);
};
Certificate.prototype.getIdentity = function (): mce.UUID {
    return ExtendedCertificate.getIdentity(this).value;
};

ConnectionRequest.prototype.getCertificate = procHacker.js("?getCertificate@ConnectionRequest@@QEBAPEBVCertificate@@XZ", Certificate, { this: ConnectionRequest });

namespace ExtendedCertificate {
    export const getXuid = procHacker.js(
        "?getXuid@ExtendedCertificate@@SA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBVCertificate@@_N@Z",
        CxxString,
        { structureReturn: true },
        Certificate,
        bool_t,
    );
    export const getIdentityName = procHacker.js(
        "?getIdentityName@ExtendedCertificate@@SA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBVCertificate@@@Z",
        CxxString,
        { structureReturn: true },
        Certificate,
    );
    export const getIdentity = procHacker.js(
        "?getIdentity@ExtendedCertificate@@SA?AVUUID@mce@@AEBVCertificate@@@Z",
        mce.UUIDWrapper,
        { structureReturn: true },
        Certificate,
    );
}

// attribute.ts
// The four floats moved in 1.26 (down by eight), so they come from symbols.json
// `layouts.AttributeInstance` when the table has them; the literals are the 2024 offsets.
{
    const l = pdbcache.layouts.AttributeInstance ?? {};
    AttributeInstance.abstract({
        vftable: VoidPointer,
        u1: VoidPointer,
        u2: VoidPointer,
        currentValue: [float32_t, l.currentValue ?? 0x84],
        minValue: [float32_t, l.minValue ?? 0x7c],
        maxValue: [float32_t, l.maxValue ?? 0x80],
        defaultValue: [float32_t, l.defaultValue ?? 0x78],
        // the two 1.26 added, read off AttributeData's constructor from AttributeInstance (+0x68 / +0x6c,
        // right below defaultValue). The fallbacks are those offsets shifted by the same eight the other
        // four moved by; no 2024 body reads them, so the fallbacks are unverified and only matter when
        // symbols.json carries no layout at all.
        defaultMinValue: [float32_t, l.defaultMinValue ?? 0x70],
        defaultMaxValue: [float32_t, l.defaultMaxValue ?? 0x74],
    });
}

// 1.26 has no BaseAttributeMap::getMutableInstance in any form. 2024's took the attribute id and probed
// an open-addressed FNV-1a-64 table; 1.26's map is a sorted std::vector<unsigned int> of ids at +0..+8
// with the AttributeInstance array at +24, and the only out-of-line lookups left take an
// `Attribute const&` or a `HashedString const&`. So the lookup is written here against symbols.json
// `layouts.BaseAttributeMap`, as the lower_bound the binary runs, returning null rather than the static
// invalid instance when the id is not there.
// (docs/findings-components.md, "The health pair, and the code `.pdata` does not describe")
const baseAttributeMapLayout = (): { ids: number; instances: number; instanceSize: number } => {
    const l = pdbcache.layouts.BaseAttributeMap;
    if (l?.ids == null || l.instances == null || l.instanceSize == null) {
        throw Error("BaseAttributeMap::getMutableInstance: no address and no layouts.BaseAttributeMap in this build's symbols.json");
    }
    return l as { ids: number; instances: number; instanceSize: number };
};
// The attribute ids are not the same in the two 1.26 builds: the five player attributes are one
// lower on 1.26.51.1, which has no id 6 at all, while everything from Health (7) up is unchanged
// (docs/findings-layouts.md). bdsx's AttributeId enum stays the 2024 numbering -- it is public API
// and plugins are written against it -- and every id is translated here, at the one place an
// attribute id reaches the binary. A build whose table has no `AttributeId` layout is assumed to
// use the enum's own numbering, which is what 1.26.40.8 does.
const attributeIdReported = new Set<string>();
function nativeAttributeId(type: AttributeId): number {
    const table = pdbcache.layouts.AttributeId;
    if (table === undefined) return type;
    const name = AttributeId[type];
    if (name === undefined) return type;
    const mapped = table[name];
    if (typeof mapped !== "number") return type;
    if (mapped !== type && !attributeIdReported.has(name)) {
        attributeIdReported.add(name);
        console.error(colors.cyan(`[bdsx] AttributeId.${name}: this build numbers it ${mapped}, not ${type}`));
    }
    return mapped;
}
BaseAttributeMap.prototype.nativeIdOf = function (type: AttributeId): number {
    return nativeAttributeId(type);
};
BaseAttributeMap.prototype.getMutableInstance = derived(
    "?getMutableInstance@BaseAttributeMap@@QEAAPEAVAttributeInstance@@I@Z",
    function getMutableInstance(this: BaseAttributeMap, wanted: AttributeId): AttributeInstance | null {
        const type = nativeAttributeId(wanted);
        const l = baseAttributeMapLayout(),
            self = this as any as StaticPointer;
        const begin = self.getPointer(l.ids),
            end = self.getPointer(l.ids + 8);
        const d = end.subBin(begin.getAddressBin());
        const count = Math.floor((d.getAddressHigh() * 0x100000000 + d.getAddressLow()) / 4);
        let lo = 0,
            hi = count;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (begin.getUint32(mid * 4) < type) lo = mid + 1;
            else hi = mid;
        }
        if (lo >= count || begin.getUint32(lo * 4) !== type) return null;
        return self.getPointer(l.instances).addAs(AttributeInstance, lo * l.instanceSize);
    },
    () => {
        // the binary wants this build's id too, so the translation wraps the real function as well
        const native = procHacker.js(
            "?getMutableInstance@BaseAttributeMap@@QEAAPEAVAttributeInstance@@I@Z",
            AttributeInstance,
            { this: BaseAttributeMap },
            int32_t,
        );
        return function getMutableInstance(this: BaseAttributeMap, wanted: AttributeId): AttributeInstance | null {
            return native.call(this, nativeAttributeId(wanted));
        };
    },
);

// server.ts
VanillaGameModuleServer.abstract({
    listener: [VanillaServerGameplayEventListener.ref(), 0x8],
});
DedicatedServer.abstract({
    vftable: VoidPointer,
});
Minecraft.abstract({
    vftable: VoidPointer,
    vanillaGameModuleServer: [CxxSharedPtr, 0x28], // VanillaGameModuleServer
    server: DedicatedServer.ref(),
});
Minecraft.prototype.getLevel = function () {
    return bedrockServer.level;
};
Minecraft.prototype.getNetworkHandler = function () {
    return bedrockServer.networkSystem;
};
Minecraft.prototype.getNonOwnerPointerServerNetworkHandler = procHacker.js(
    "?getServerNetworkHandler@Minecraft@@QEAA?AV?$NonOwnerPointer@VServerNetworkHandler@@@Bedrock@@XZ",
    Bedrock.NonOwnerPointer.make(ServerNetworkHandler),
    { this: Minecraft, structureReturn: true },
);
Minecraft.prototype.getServerNetworkHandler = function () {
    return bedrockServer.serverNetworkHandler;
};
Minecraft.prototype.getCommands = function () {
    return bedrockServer.minecraftCommands;
};
ScriptFramework.abstract({
    vftable: VoidPointer,
});
ServerInstance.abstract({
    vftable: VoidPointer,
});
Object.defineProperties(ServerInstance.prototype, {
    server: {
        get() {
            return bedrockServer.dedicatedServer;
        },
    },
    minecraft: {
        get() {
            return bedrockServer.minecraft;
        },
    },
    networkSystem: {
        get() {
            return bedrockServer.networkSystem;
        },
    },
});
(ServerInstance.prototype as any)._disconnectAllClients = procHacker.js(
    "?disconnectAllClientsWithMessage@ServerInstance@@QEAAXV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: ServerInstance },
    CxxString,
);

ServerInstance.prototype.createDimension = function (id: DimensionId): Dimension {
    return bedrockServer.level.createDimension(id);
};
ServerInstance.prototype.getActivePlayerCount = function (): number {
    return bedrockServer.level.getActivePlayerCount();
};
ServerInstance.prototype.disconnectClient = function (
    client: NetworkIdentifier,
    message: string = "disconnectionScreen.disconnected",
    skipMessage: boolean = false,
): void {
    return bedrockServer.serverNetworkHandler.disconnectClient(client, message, skipMessage);
};
ServerInstance.prototype.getMotd = function (): string {
    return bedrockServer.serverNetworkHandler.motd;
};
ServerInstance.prototype.setMotd = function (motd: string): void {
    return bedrockServer.serverNetworkHandler.setMotd(motd);
};
ServerInstance.prototype.getMaxPlayers = function (): number {
    return bedrockServer.serverNetworkHandler.maxPlayers;
};
ServerInstance.prototype.setMaxPlayers = function (count: number): void {
    bedrockServer.serverNetworkHandler.setMaxNumPlayers(count);
};
ServerInstance.prototype.getPlayers = function (): ServerPlayer[] {
    return bedrockServer.level.getPlayers();
};
ServerInstance.prototype.updateCommandList = function (): void {
    const pk = bedrockServer.commandRegistry.serializeAvailableCommands();
    for (const player of this.getPlayers()) {
        player.sendNetworkPacket(pk);
    }
    pk.dispose();
};
const networkProtocolVersion = procConst("?NetworkProtocolVersion@SharedConstants@@3HB", p => p.getInt32(), 0);
ServerInstance.prototype.getNetworkProtocolVersion = function (): number {
    return networkProtocolVersion;
};
const currentGameSemVersion = procConst("?CurrentGameSemVersion@SharedConstants@@3VSemVersion@@B", p => p.as(SemVersion), null as any as SemVersion);
ServerInstance.prototype.getGameVersion = function (): SemVersion {
    return currentGameSemVersion;
};

Minecraft$Something.prototype.network = bedrockServer.networkSystem;
Minecraft$Something.prototype.level = bedrockServer.level;
Minecraft$Something.prototype.shandler = bedrockServer.serverNetworkHandler;

// gamemode.ts
GameMode.abstract({
    actor: [Player.ref(), 8],
});

@nativeClass(null)
class RecordItem extends Item {
    @nativeField(VoidPointer)
    vftable: VoidPointer;
}

const RecordItem$vftable = proc["??_7RecordItem@@6B@"];
Item.setResolver(ptr => {
    if (ptr === null) {
        return null;
    }
    const vftable = ptr.getPointer();
    if (vftable.equalsptr(RecordItem$vftable)) {
        return ptr.as(RecordItem);
    } else {
        return ptr.as(Item);
    }
});

Item.prototype.isMusicDisk = function () {
    return this instanceof RecordItem;
};

// inventory.ts
Item.prototype.allowOffhand = function () {
    // manual implement
    // accessed on Item::setAllowOffhand
    return (this as any).getInt8(0x13a) < 0;
};
Item.prototype.isDamageable = procHacker.js("?isDamageable@Item@@UEBA_NXZ", bool_t, { this: Item });
Item.prototype.isFood = procHacker.js("?isFood@Item@@UEBA_NXZ", bool_t, {
    this: Item,
});
Item.prototype.setAllowOffhand = procHacker.js("?setAllowOffhand@Item@@QEAAAEAV1@_N@Z", void_t, { this: Item }, bool_t);
Item.prototype.getSerializedName = procHacker.js("?getSerializedName@Item@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Item,
    structureReturn: true,
});
Item.prototype.getCommandNames = procHacker.js(
    "?getCommandNames@Item@@QEBA?AV?$vector@UCommandName@@V?$allocator@UCommandName@@@std@@@std@@XZ",
    CxxVector$CxxStringWith8Bytes,
    { this: Item, structureReturn: true },
);
Item.prototype.getCommandNames2 = procHacker.js(
    "?getCommandNames@Item@@QEBA?AV?$vector@UCommandName@@V?$allocator@UCommandName@@@std@@@std@@XZ",
    CxxVector$CommandName,
    { this: Item, structureReturn: true },
);
Item.prototype.getCreativeCategory = procHacker.js("?getCreativeCategory@Item@@QEBA?AW4CreativeItemCategory@@XZ", int32_t, { this: Item });

ItemStackBase.prototype[NativeType.dtor] = vectorDeletingDestructor;

Item.prototype.isArmor = procHacker.jsv("??_7HumanoidArmorItem@@6B@", "?isHumanoidArmor@HumanoidArmorItem@@UEBA_NXZ", bool_t, { this: Item });
Item.prototype.getArmorValue = procHacker.jsv("??_7HumanoidArmorItem@@6B@", "?getArmorValue@HumanoidArmorItem@@UEBAHXZ", int32_t, { this: Item });
Item.prototype.getToughnessValue = procHacker.jsv("??_7HumanoidArmorItem@@6B@", "?getToughnessValue@HumanoidArmorItem@@UEBAHXZ", int32_t, { this: Item });
Item.prototype.getCooldownType = procHacker.jsv("??_7Item@@6B@", "?getCooldownType@Item@@UEBAAEBVHashedString@@XZ", HashedString, { this: Item });
Item.prototype.canDestroyInCreative = procHacker.jsv("??_7ComponentItem@@6B@", "?canDestroyInCreative@ComponentItem@@UEBA_NXZ", bool_t, { this: Item });

ItemStackBase.prototype.toString = procHacker.jsv(
    "??_7ItemStackBase@@6B@",
    "?toString@ItemStackBase@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: ItemStackBase, structureReturn: true },
);
ItemStackBase.prototype.toDebugString = procHacker.jsv(
    "??_7ItemStackBase@@6B@",
    "?toDebugString@ItemStackBase@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: ItemStackBase, structureReturn: true },
);

ItemStackBase.prototype.remove = procHacker.js("?remove@ItemStackBase@@QEAAXH@Z", void_t, { this: ItemStackBase }, int32_t);
ItemStackBase.prototype.addAmount = procHacker.js("?add@ItemStackBase@@QEAAXH@Z", void_t, { this: ItemStackBase }, int32_t);
ItemStackBase.prototype.setAuxValue = procHacker.js("?setAuxValue@ItemStackBase@@QEAAXF@Z", void_t, { this: ItemStackBase }, int16_t);
// ItemStackBase's three readers 1.26 inlined away (next-steps Q1-B-2, docs/findings-containers.md 11).
// Both offsets they need moved, and both 1.26 builds say the same thing:
//   `Item::id_` 162 -> **170**. The whole of `ItemStackBase::getId` is inlined into
//   `ItemStackBase::toString` (40 0x1bbfb40 / 51 0x1a52430) byte for byte -- `mov dx,0xffff;
//   cmpb $1,35(%rsi); jne -> -1; mov rcx,[rsi+8]; test/je -> 0; mov rcx,[rcx]; test/je -> 0;
//   movzwl 170(%rcx),%edx` -- which is also why the "@aux" toString prints is `aux_` (the very next
//   instruction is `movswl 32(%rsi),%edx`) and not getAuxValue().
//   `Block::data_` 40 -> **288**. Endstone's 1.26 block.h takes DataID out of its old place behind
//   components_ (its `// DataID data_;` comment is still sitting there) and puts it in the tail,
//   asserting sizeof(Block) == 296; `??_GBlock` (40 0x1bb6360 / 51 0x2cfae90) frees client_data_ at
//   +280, which pins the tail at 280 client_data_ / 288 data_ / 290 has_runtime_id_ / 296.
// The literals below are the 2024 offsets, used only when the table ships no layouts.
const Item$id = pdbcache.layouts.Item?.id ?? 162;
const Block$data = pdbcache.layouts.Block?.data ?? 40;
ItemStackBase.prototype.getAuxValue = derived(
    "?getAuxValue@ItemStackBase@@QEBAFXZ",
    // 2024 0x1b5f320 is ten instructions: `block_ && aux_ != 0x7FFF ? block_->data_ : aux_`.
    function getAuxValue(this: ItemStackBase): number {
        const self = this as unknown as StaticPointer;
        const aux = self.getInt16(32);
        if (aux === 0x7fff) return aux;
        const block = self.getNullablePointer(24);
        if (block === null) return aux;
        return block.getInt16(Block$data);
    },
    () => procHacker.js("?getAuxValue@ItemStackBase@@QEBAFXZ", int16_t, { this: ItemStackBase }),
);
ItemStackBase.prototype.isValidAuxValue = procHacker.js("?isValidAuxValue@ItemStackBase@@QEBA_NH@Z", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.getMaxStackSize = procHacker.js("?getMaxStackSize@ItemStackBase@@QEBAEXZ", int32_t, { this: ItemStackBase });
ItemStackBase.prototype.getId = derived(
    "?getId@ItemStackBase@@QEBAFXZ",
    // 2024 0x1b61150: `!valid_ ? -1 : (item_ && *item_ ? Item::getId(*item_) : 0)`, and
    // `Item::getId` (2024 0x1cad2e0) is the two-instruction leaf `movzwl 162(%rcx); retq`.
    function getId(this: ItemStackBase): number {
        const self = this as unknown as StaticPointer;
        if (self.getUint8(35) === 0) return -1;
        const weak = self.getNullablePointer(8);
        if (weak === null) return 0;
        const item = weak.getNullablePointer(0);
        if (item === null) return 0;
        return item.getInt16(Item$id);
    },
    () => procHacker.js("?getId@ItemStackBase@@QEBAFXZ", int16_t, { this: ItemStackBase }),
);
ItemStackBase.prototype.getRawNameId = procHacker.js(
    "?getRawNameId@ItemStackBase@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: ItemStackBase, structureReturn: true },
);
ItemStackBase.prototype.getCustomName = procHacker.js("?getName@ItemStackBase@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: ItemStackBase,
    structureReturn: true,
});
ItemStackBase.prototype.setCustomName = procHacker.js(
    "?setCustomName@ItemStackBase@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: ItemStackBase },
    CxxString,
);
ItemStackBase.prototype.getUserData = procHacker.js("?getUserData@ItemStackBase@@QEAAPEAVCompoundTag@@XZ", CompoundTag, { this: ItemStackBase });
ItemStackBase.prototype.hasCustomName = procHacker.js("?hasCustomHoverName@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isBlock = procHacker.js("?isBlock@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isNull = procHacker.js("?isNull@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.setNull = procHacker.js(
    "?setNull@ItemStackBase@@UEAAXV?$optional@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@std@@@Z",
    void_t,
    { this: ItemStackBase },
    CxxOptionalToUndefUnion.make(CxxString),
);
ItemStackBase.prototype.getEnchantValue = procHacker.js("?getEnchantValue@ItemStackBase@@QEBAHXZ", int32_t, { this: ItemStackBase });
ItemStackBase.prototype.isEnchanted = procHacker.js("?isEnchanted@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.setDamageValue = procHacker.js("?setDamageValue@ItemStackBase@@QEAAXF@Z", void_t, { this: ItemStackBase }, int16_t);
ItemStackBase.prototype.setItem = procHacker.js("?_setItem@ItemStackBase@@AEAA_NH_N@Z", bool_t, { this: ItemStackBase }, int32_t);
ItemStackBase.prototype.startCoolDown = procHacker.js("?startCoolDown@ItemStackBase@@QEBAXPEAVPlayer@@@Z", void_t, { this: ItemStackBase }, ServerPlayer);
@nativeClass()
class ComparisonOptions extends NativeClass {
    @nativeField(bool_t)
    b0: bool_t;
    @nativeField(bool_t)
    b1: bool_t;
}
const ItemStackBase$sameItem = procHacker.js("?sameItem@ItemStackBase@@QEBA_NAEBV1@AEBUComparisonOptions@1@@Z", bool_t, { this: ItemStackBase }, ItemStackBase);
ItemStackBase.prototype.sameItem = function (item) {
    const opt = new ComparisonOptions(true);
    opt.b0 = false;
    opt.b1 = false;
    return ItemStackBase$sameItem.call(this, item, opt);
};
ItemStackBase.prototype.sameItemAndAux = procHacker.js("?sameItemAndAux@ItemStackBase@@QEBA_NAEBV1@@Z", bool_t, { this: ItemStackBase }, ItemStackBase);
ItemStackBase.prototype.isStackedByData = procHacker.js("?isStackedByData@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isStackable = procHacker.js("?isStackable@ItemStackBase@@QEBA_NAEBV1@@Z", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isPotionItem = procHacker.js("?isPotionItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isPattern = procHacker.js("?isPattern@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isLiquidClipItem = procHacker.js("?isLiquidClipItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isHorseArmorItem = procHacker.js("?isHorseArmorItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isGlint = procHacker.js("?isGlint@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isFullStack = procHacker.js("?isFullStack@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isFireResistant = procHacker.js("?isFireResistant@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isExplodable = procHacker.js("?isExplodable@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isDamaged = procHacker.js("?isDamaged@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isDamageableItem = procHacker.js("?isDamageableItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isArmorItem = procHacker.js("?isArmorItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.getComponentItem = procHacker.js("?getComponentItem@ItemStackBase@@QEBAPEBVComponentItem@@XZ", ComponentItem, { this: ItemStackBase });
ItemStackBase.prototype.getMaxDamage = procHacker.js("?getMaxDamage@ItemStackBase@@QEBAFXZ", int32_t, { this: ItemStackBase });
// next-steps Q1-B-2. 2024's ItemStackBase::getDamageValue (0x1b5fa50) is ten bytes: the same
// item_ (+8, double pointer -- see getAuxValue/getId just above) null-check as its siblings, then
// a tail jump into Item::getDamageValue(CompoundTag const* userData) (0x1cab820). That inner
// function never reads `this` at all -- it is purely `!userData ? 0 : userData->contains("Damage")
// ? userData->getInt("Damage") : 0` (TAG_DAMAGE, 0x840080 CompoundTag::getInt: _Find the key,
// return 0 unless the found node's variant is Tag::Type::Int). Neither
// `?contains@CompoundTag@@...` nor `?getInt@CompoundTag@@...` nor `?getDamageValue@Item@@...` are
// required by bdsx or resolved on either 1.26 build, and none need to be: `userData` (+0x10) is
// already a `CompoundTag`, and CxxMap.get() is bdsx's own red-black-tree walk over the exact same
// memory std::map::find would walk (nbt.ts's `CompoundTag.data`), with `CompoundTagVariant.get()`
// (Tag.setResolver, already vtable-based) giving the typed IntTag back. The whole function is
// already carried -- nothing here is BDS code, so nothing here needs an address.
ItemStackBase.prototype.getDamageValue = derived(
    "?getDamageValue@ItemStackBase@@QEBAFXZ",
    function getDamageValue(this: ItemStackBase): number {
        const self = this as unknown as StaticPointer;
        const weak = self.getNullablePointer(8);
        if (weak === null) return 0;
        const item = weak.getNullablePointer(0);
        if (item === null) return 0;
        const userData = self.getNullablePointerAs(CompoundTag, 0x10);
        if (userData === null) return 0;
        const variant = userData.data.get("Damage");
        if (variant === null) return 0;
        const tag = variant.get();
        return tag instanceof IntTag ? tag.data : 0;
    },
    () => procHacker.js("?getDamageValue@ItemStackBase@@QEBAFXZ", int16_t, { this: ItemStackBase }),
);
ItemStackBase.prototype.getAttackDamage = procHacker.js("?getAttackDamage@ItemStackBase@@QEBAHXZ", int32_t, { this: ItemStackBase });
ItemStackBase.prototype.isHumanoidWearableItem = procHacker.js("?isHumanoidWearableItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isHumanoidWearableBlockItem = procHacker.js("?isHumanoidWearableBlockItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.isHumanoidWearableArmorItem = procHacker.js("?isHumanoidArmorItem@ItemStackBase@@QEBA_NXZ", bool_t, { this: ItemStackBase });
ItemStackBase.prototype.allocateAndSave = procHacker.js(
    "?save@ItemStackBase@@QEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@XZ",
    CompoundTag.ref(),
    { this: ItemStackBase, structureReturn: true },
);
ItemStackBase.prototype.isMusicDiscItem = function () {
    return this.getItem()?.isMusicDisk() === true;
};

(ItemStackBase.prototype as any)._getItem = derived(
    "?getItem@ItemStackBase@@QEBAPEBVItem@@XZ",
    // 2024 0x1b61370 is the whole function: `rax = [this+8]; return rax ? [rax] : nullptr`.
    function _getItem(this: ItemStackBase): Item | null {
        const weak = (this as unknown as StaticPointer).getNullablePointer(8);
        if (weak === null) return null;
        return weak.getNullablePointerAs(Item, 0);
    },
    () => procHacker.js("?getItem@ItemStackBase@@QEBAPEBVItem@@XZ", Item, { this: ItemStackBase }),
);
(ItemStackBase.prototype as any)._setCustomLore = procHacker.js(
    "?setCustomLore@ItemStackBase@@QEAAXAEBV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@@Z",
    void_t,
    { this: ItemStackBase },
    CxxVector.make(CxxStringWrapper),
);
const ItemStackBase$getCustomLore = procHacker.js(
    "?getCustomLore@ItemStackBase@@QEBA?AV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@XZ",
    CxxVector$string,
    { this: ItemStackBase, structureReturn: true },
);
ItemStackBase.prototype.getCustomLore = function () {
    const lore: CxxVector<CxxString> = ItemStackBase$getCustomLore.call(this);
    const res = lore.toArray();
    lore.destruct();
    return res;
};

ItemStackBase.prototype.constructItemEnchantsFromUserData = procHacker.js(
    "?constructItemEnchantsFromUserData@ItemStackBase@@QEBA?AVItemEnchants@@XZ",
    ItemEnchants,
    { this: ItemStackBase, structureReturn: true },
);
ItemStackBase.prototype.saveEnchantsToUserData = procHacker.js(
    "?saveEnchantsToUserData@ItemStackBase@@QEAAXAEBVItemEnchants@@@Z",
    void_t,
    { this: ItemStackBase },
    ItemEnchants,
);
// ItemStackBase.prototype.getCategoryName = procHacker.js(
//     "?getCategoryName@ItemStackBase@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
//     CxxString,
//     { this: ItemStackBase, structureReturn: true },
// );
ItemStackBase.prototype.canDestroySpecial = procHacker.js("?canDestroySpecial@ItemStackBase@@QEBA_NAEBVBlock@@@Z", bool_t, { this: ItemStackBase }, Block);
const ItemStackBase$hurtAndBreak = procHacker.js("?hurtAndBreak@ItemStackBase@@QEAA_NHPEAVActor@@@Z", bool_t, { this: ItemStackBase }, int32_t, Actor);
ItemStackBase.prototype.hurtAndBreak = function (count: number, actor: Actor | null = null): boolean {
    return ItemStackBase$hurtAndBreak.call(this, count, actor);
};
ItemStackBase.prototype.matches = procHacker.js("?matches@ItemStackBase@@QEBA_NAEBV1@@Z", bool_t, { this: ItemStackBase }, ItemStackBase);
ItemStackBase.prototype.matchesItem = procHacker.js("?matchesItem@ItemStackBase@@QEBA_NAEBV1@@Z", bool_t, { this: ItemStackBase }, ItemStackBase);

const ItemStackBase$load = procHacker.js("?load@ItemStackBase@@QEAAXAEBVCompoundTag@@@Z", void_t, { this: ItemStackBase }, CompoundTag);
ItemStackBase.prototype.load = function (tag) {
    if (tag instanceof Tag) {
        ItemStackBase$load.call(this, tag);
    } else {
        const allocated = NBT.allocate(tag);
        ItemStackBase$load.call(this, allocated as CompoundTag);
        allocated.dispose();
    }
};

const ItemStack$clone = procHacker.js("?clone@ItemStack@@QEBA?AV1@XZ", void_t, null, ItemStack, ItemStack);
ItemStack.prototype.clone = function (target: ItemStack = new ItemStack(true)) {
    ItemStack$clone(this, target);
    return target;
};
ItemStack.prototype.getDestroySpeed = procHacker.js("?getDestroySpeed@ItemStack@@QEBAMAEBVBlock@@@Z", float32_t, { this: ItemStack }, Block);
ItemStack.constructWith = function (itemName: CxxString, amount: int32_t = 1, data: int32_t = 0): ItemStack {
    return CommandUtils.createItemStack(itemName, amount, data);
};
ItemStack.fromDescriptor = procHacker.js(
    "?fromDescriptor@ItemStack@@SA?AV1@AEBVNetworkItemStackDescriptor@@AEAVBlockPalette@@_N@Z",
    ItemStack,
    { structureReturn: true },
    NetworkItemStackDescriptor,
    BlockPalette,
    bool_t,
);
NetworkItemStackDescriptor.constructWith = procHacker.js(
    "??0NetworkItemStackDescriptor@@QEAA@AEBVItemStack@@@Z",
    NetworkItemStackDescriptor,
    { structureReturn: true },
    ItemStack,
);

NetworkItemStackDescriptor.prototype[NativeType.ctor_move] = procHacker.js(
    "??0NetworkItemStackDescriptor@@QEAA@$$QEAV0@@Z",
    void_t,
    { this: NetworkItemStackDescriptor },
    NetworkItemStackDescriptor,
);

const ItemStack$fromTag = procHacker.js("?fromTag@ItemStack@@SA?AV1@AEBVCompoundTag@@@Z", ItemStack, { structureReturn: true }, CompoundTag);
ItemStack.fromTag = function (tag) {
    if (tag instanceof Tag) {
        return ItemStack$fromTag(tag);
    } else {
        const allocated = NBT.allocate(tag);
        const res = ItemStack$fromTag(allocated as CompoundTag);
        allocated.dispose();
        return res;
    }
};

ComponentItem.prototype.buildNetworkTag = procHacker.jsv(
    "??_7ComponentItem@@6B@",
    "?buildNetworkTag@ComponentItem@@UEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@XZ",
    CompoundTag.ref(),
    { this: ComponentItem, structureReturn: true },
);
ComponentItem.prototype.initializeFromNetwork = procHacker.jsv(
    "??_7ComponentItem@@6B@",
    "?initializeFromNetwork@ComponentItem@@UEAAXAEBVCompoundTag@@@Z",
    void_t,
    { this: ComponentItem },
    CompoundTag,
);
(ComponentItem.prototype as any)._getComponent = procHacker.js(
    "?getComponent@ComponentItem@@UEBAPEAVItemComponent@@AEBVHashedString@@@Z",
    ItemComponent,
    { this: ComponentItem },
    HashedString,
);

Container.prototype.addItem = procHacker.js("?addItem@Container@@UEAA_NAEAVItemStack@@@Z", void_t, { this: Container }, ItemStack);
Container.prototype.addItemToFirstEmptySlot = procHacker.js("?addItemToFirstEmptySlot@Container@@UEAA_NAEBVItemStack@@@Z", bool_t, { this: Container }, ItemStack);
Container.prototype.getSlots = procHacker.js(
    "?getSlots@Container@@UEBA?BV?$vector@PEBVItemStack@@V?$allocator@PEBVItemStack@@@std@@@std@@XZ",
    CxxVector.make(ItemStack.ref()),
    { this: Container, structureReturn: true },
);
Container.prototype.getItem = procHacker.jsv(
    "??_7SimpleContainer@@6B@",
    "?getItem@SimpleContainer@@UEBAAEBVItemStack@@H@Z",
    ItemStack,
    { this: Container },
    uint8_t,
);
Container.prototype.getItemCount = procHacker.js("?getItemCount@Container@@UEBAHAEBVItemStack@@@Z", int32_t, { this: Container }, ItemStack);
Container.prototype.getContainerType = procHacker.js("?getContainerType@Container@@QEBA?AW4ContainerType@@XZ", uint8_t, { this: Container });
Container.prototype.hasRoomForItem = procHacker.js("?hasRoomForItem@Container@@UEAA_NAEBVItemStack@@@Z", bool_t, { this: Container }, ItemStack);
Container.prototype.isEmpty = procHacker.js("?isEmpty@Container@@UEBA_NXZ", bool_t, { this: Container });
Container.prototype.removeAllItems = procHacker.js("?removeAllItems@Container@@UEAAXXZ", void_t, { this: Container });
Container.prototype.removeItem = procHacker.js("?removeItem@Container@@UEAAXHH@Z", void_t, { this: Container }, int32_t, int32_t);
Container.prototype.setCustomName = procHacker.js(
    "?setCustomName@Container@@UEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: Container },
    CxxString,
);

FillingContainer.prototype.canAdd = procHacker.jsv(
    "??_7FillingContainer@@6B@",
    "?canAdd@FillingContainer@@UEBA_NAEBVItemStack@@@Z",
    bool_t,
    { this: FillingContainer },
    ItemStack,
);

Inventory.prototype.dropSlot = procHacker.js("?dropSlot@Inventory@@QEAAXH_N00@Z", void_t, { this: Inventory }, int32_t, bool_t, bool_t, bool_t);

// PlayerInventory (next-steps Q1-B-3, docs/findings-containers.md 11). Every one of these is a
// forwarder into `inventory_`, and 1.26 keeps no out-of-line copy of any of them; what each one
// forwards to is a Container/FillingContainer/Inventory virtual the table already resolves, so bdsx
// carries the forwarder and the binary keeps doing the work. The 2024 bodies are three to six
// instructions each -- bail out unless the ContainerID is Inventory(0), then `container->vft[n]()`:
//
//   getItem           0x186b450  r8b != 0 -> &EMPTY_ITEM         else vft[7]  getItem
//   getSelectedItem   0x186c1d0  [this+184] != 0 -> &EMPTY_ITEM  else vft[7](selected_ at +16)
//   setItem           0x1879a90  r9b != 0 -> return              else vft[13](slot, item, linkEmptySlot)
//   setSelectedItem   0x187a320  [this+184] != 0 -> return       else vft[12](selected_, item)
//   clearSlot         0x1869830  r8b != 0 -> return              else vft[43] FillingContainer::clearSlot
//   add               0x1868540  vft[41] FillingContainer::add          (the bool is dropped)
//   canAdd            0x1869340  vft[42] FillingContainer::canAdd
//   getContainerSize  0x186a900  dl != 0 -> 0                    else vft[20] getContainerSize
//   getFirstEmptySlot 0x186ae40  vft[46] Inventory::getFirstEmptySlot
//   getHotbarSize     0x186b1c0  tail-jumps FillingContainer::getHotbarSize
//
// Those slot numbers are 2024's and none of them is carried: `??_7FillingContainer@@6B@` and
// `??_7Inventory@@6B@` are searched by name here, and both tables line up with Endstone's
// filling_container.h / inventory.h declaration order slot for slot on both builds (Container is
// 44 slots on 1.26.40.8 and 43 on 1.26.51.1 -- docs/findings-containers.md 2 and 3).
// `FillingContainer::getHotbarSize` is `movl $9,%eax; retq`, the same six bytes in all three builds
// (2024 0xa27d60, 40 0x14842c0, 51 0x1286390), so bdsx returns the constant.
const FillingContainer$setItem = procHacker.jsv("??_7FillingContainer@@6B@", "?setItem@FillingContainer@@UEAAXHAEBVItemStack@@@Z", void_t, { this: Container }, int32_t, ItemStack);
const FillingContainer$setItemWithForceBalance = procHacker.jsv(
    "??_7FillingContainer@@6B@",
    "?setItemWithForceBalance@FillingContainer@@UEAAXHAEBVItemStack@@_N@Z",
    void_t,
    { this: Container },
    int32_t,
    ItemStack,
    bool_t,
);
const FillingContainer$getContainerSize = procHacker.jsv("??_7FillingContainer@@6B@", "?getContainerSize@FillingContainer@@UEBAHXZ", int32_t, { this: Container });
const FillingContainer$add = procHacker.jsv("??_7FillingContainer@@6B@", "?add@FillingContainer@@UEAA_NAEAVItemStack@@@Z", bool_t, { this: FillingContainer }, ItemStack);
const FillingContainer$clearSlot = procHacker.jsv("??_7FillingContainer@@6B@", "?clearSlot@FillingContainer@@UEAAXH@Z", void_t, { this: FillingContainer }, int32_t);
const Inventory$getFirstEmptySlot = procHacker.jsv("??_7Inventory@@6B@", "?getFirstEmptySlot@Inventory@@UEBAHXZ", int32_t, { this: Inventory });
// The three FillingContainer members the first Q1-B-3 batch left open (docs/findings-containers.md
// 12). 1.26 made `removeResource` and `swapSlots` the first two of FillingContainer's nine own
// virtuals -- 2024's table has six own slots and neither of these was one of them -- so they carry a
// `U` decoration here and are reached through the table by name, never by slot number.
// `getSlotWithItem` is non-virtual in both and 1.26 still keeps it out of line.
const FillingContainer$removeResource = procHacker.jsv(
    "??_7FillingContainer@@6B@",
    "?removeResource@FillingContainer@@UEAAHAEBVItemStack@@_N1H@Z",
    int32_t,
    { this: FillingContainer },
    ItemStack,
    bool_t,
    bool_t,
    int32_t,
);
const FillingContainer$swapSlots = procHacker.jsv(
    "??_7FillingContainer@@6B@",
    "?swapSlots@FillingContainer@@UEAAXHH@Z",
    void_t,
    { this: FillingContainer },
    int32_t,
    int32_t,
);
const FillingContainer$getSlotWithItem = procHacker.js(
    "?getSlotWithItem@FillingContainer@@QEBAHAEBVItemStack@@_N1@Z",
    int32_t,
    { this: FillingContainer },
    ItemStack,
    bool_t,
    bool_t,
);
/** FillingContainer::HOTBAR_SIZE -- `movl $9,%eax; retq` in all three builds (2024 0xa27d60) */
const HOTBAR_SIZE = 9;
/** PlayerInventory::selected_, +16 in every build; 2024's getSelectedItemSlot and 1.26's inlined copies read it there */
const PlayerInventory$selected = pdbcache.layouts.PlayerInventory?.selected ?? 16;
/** PlayerInventory::selected_container_id_, 2024 +184, 1.26 +176 -- it moved with sizeof(ItemStack) */
const PlayerInventory$selectedContainerId = pdbcache.layouts.PlayerInventory?.selectedContainerId ?? 184;
function selectedContainerId(inv: PlayerInventory): number {
    return (inv as unknown as StaticPointer).getUint8(PlayerInventory$selectedContainerId);
}

PlayerInventory.prototype.getSlotWithItem = derived(
    "?getSlotWithItem@PlayerInventory@@QEBAHAEBVItemStack@@_N1@Z",
    function getSlotWithItem(this: PlayerInventory, itemStack: ItemStack, checkAux: boolean, checkData: boolean): number {
        // 2024's body (0x186c250) is `movq 192(%rcx),%rcx; jmp FillingContainer::getSlotWithItem`.
        return FillingContainer$getSlotWithItem.call(this.container, itemStack, checkAux, checkData);
    },
    () => procHacker.js("?getSlotWithItem@PlayerInventory@@QEBAHAEBVItemStack@@_N1@Z", int32_t, { this: PlayerInventory }, ItemStack, bool_t, bool_t),
);
PlayerInventory.prototype.addItem = derived(
    "?add@PlayerInventory@@QEAA_NAEAVItemStack@@_N@Z",
    function addItem(this: PlayerInventory, itemStack: ItemStack, _linkEmptySlot: boolean): boolean {
        return FillingContainer$add.call(this.container, itemStack);
    },
    () => procHacker.js("?add@PlayerInventory@@QEAA_NAEAVItemStack@@_N@Z", bool_t, { this: PlayerInventory }, ItemStack, bool_t),
);
PlayerInventory.prototype.clearSlot = derived(
    "?clearSlot@PlayerInventory@@QEAAXHW4ContainerID@@@Z",
    function clearSlot(this: PlayerInventory, slot: number, containerId: ContainerId = ContainerId.Inventory): void {
        if (containerId !== ContainerId.Inventory) return;
        FillingContainer$clearSlot.call(this.container, slot);
    },
    () => procHacker.js("?clearSlot@PlayerInventory@@QEAAXHW4ContainerID@@@Z", void_t, { this: PlayerInventory }, int32_t, int32_t),
);
PlayerInventory.prototype.getContainerSize = derived(
    "?getContainerSize@PlayerInventory@@QEBAHW4ContainerID@@@Z",
    function getContainerSize(this: PlayerInventory, containerId: ContainerId = ContainerId.Inventory): number {
        if (containerId !== ContainerId.Inventory) return 0;
        return FillingContainer$getContainerSize.call(this.container);
    },
    () => procHacker.js("?getContainerSize@PlayerInventory@@QEBAHW4ContainerID@@@Z", int32_t, { this: PlayerInventory }, int32_t),
);
PlayerInventory.prototype.getFirstEmptySlot = derived(
    "?getFirstEmptySlot@PlayerInventory@@QEBAHXZ",
    function getFirstEmptySlot(this: PlayerInventory): number {
        return Inventory$getFirstEmptySlot.call(this.container);
    },
    () => procHacker.js("?getFirstEmptySlot@PlayerInventory@@QEBAHXZ", int32_t, { this: PlayerInventory }),
);
PlayerInventory.prototype.getHotbarSize = derived(
    "?getHotbarSize@PlayerInventory@@QEBAHXZ",
    function getHotbarSize(this: PlayerInventory): number {
        return 9;
    },
    () => procHacker.js("?getHotbarSize@PlayerInventory@@QEBAHXZ", int32_t, { this: PlayerInventory }),
);
PlayerInventory.prototype.getItem = derived(
    "?getItem@PlayerInventory@@QEBAAEBVItemStack@@HW4ContainerID@@@Z",
    function getItem(this: PlayerInventory, slot: number, containerId: ContainerId = ContainerId.Inventory): ItemStack {
        if (containerId !== ContainerId.Inventory) return ItemStack.EMPTY_ITEM;
        return this.container.getItem(slot);
    },
    () => procHacker.js("?getItem@PlayerInventory@@QEBAAEBVItemStack@@HW4ContainerID@@@Z", ItemStack, { this: PlayerInventory }, int32_t, int32_t),
);
PlayerInventory.prototype.getSelectedItem = derived(
    "?getSelectedItem@PlayerInventory@@QEBAAEBVItemStack@@XZ",
    function getSelectedItem(this: PlayerInventory): ItemStack {
        if (selectedContainerId(this) !== ContainerId.Inventory) return ItemStack.EMPTY_ITEM;
        return this.container.getItem(this.getSelectedSlot());
    },
    () => procHacker.js("?getSelectedItem@PlayerInventory@@QEBAAEBVItemStack@@XZ", ItemStack, { this: PlayerInventory }),
);
PlayerInventory.prototype.selectSlot = derived(
    "?selectSlot@PlayerInventory@@QEAA_NHW4ContainerID@@@Z",
    function selectSlot(this: PlayerInventory, slot: number, containerId: ContainerId = ContainerId.Inventory): void {
        // 2024's body (0x1878380) is the hotbar bound check and two stores: it calls
        // FillingContainer::getHotbarSize on inventory_ (the constant 9), bails on `slot >= that`
        // and on `slot < 0`, then writes selected_ and selected_container_id_ and returns true.
        if (slot < 0 || slot >= HOTBAR_SIZE) return;
        const self = this as unknown as StaticPointer;
        self.setInt32(slot, PlayerInventory$selected);
        self.setUint8(containerId, PlayerInventory$selectedContainerId);
    },
    () => procHacker.js("?selectSlot@PlayerInventory@@QEAA_NHW4ContainerID@@@Z", void_t, { this: PlayerInventory }, int32_t, int32_t),
);
PlayerInventory.prototype.setItem = derived(
    "?setItem@PlayerInventory@@QEAAXHAEBVItemStack@@W4ContainerID@@_N@Z",
    function setItem(this: PlayerInventory, slot: number, itemStack: ItemStack, containerId: ContainerId, linkEmptySlot: boolean): void {
        if (containerId !== ContainerId.Inventory) return;
        FillingContainer$setItemWithForceBalance.call(this.container, slot, itemStack, linkEmptySlot);
    },
    () =>
        procHacker.js("?setItem@PlayerInventory@@QEAAXHAEBVItemStack@@W4ContainerID@@_N@Z", void_t, { this: PlayerInventory }, int32_t, ItemStack, int32_t, bool_t),
);
PlayerInventory.prototype.setSelectedItem = derived(
    "?setSelectedItem@PlayerInventory@@QEAAXAEBVItemStack@@@Z",
    function setSelectedItem(this: PlayerInventory, itemStack: ItemStack): void {
        if (selectedContainerId(this) !== ContainerId.Inventory) return;
        FillingContainer$setItem.call(this.container, this.getSelectedSlot(), itemStack);
    },
    () => procHacker.js("?setSelectedItem@PlayerInventory@@QEAAXAEBVItemStack@@@Z", void_t, { this: PlayerInventory }, ItemStack),
);
PlayerInventory.prototype.swapSlots = derived(
    "?swapSlots@PlayerInventory@@QEAAXHH@Z",
    function swapSlots(this: PlayerInventory, primarySlot: number, secondarySlot: number): void {
        // 2024's body (0x187bc60) is `movq 192(%rcx),%rcx; jmp FillingContainer::swapSlots`.
        FillingContainer$swapSlots.call(this.container, primarySlot, secondarySlot);
    },
    () => procHacker.js("?swapSlots@PlayerInventory@@QEAAXHH@Z", void_t, { this: PlayerInventory }, int32_t, int32_t),
);
PlayerInventory.prototype.removeResource = function (item: ItemStack, requireExactAux: boolean = true, requireExactData: boolean = false, maxCount?: int32_t) {
    const container = this.container;
    maxCount ??= container.getItemCount(item);
    return FillingContainer$removeResource.call(container, item, requireExactAux, requireExactData, maxCount);
};
PlayerInventory.prototype.canAdd = derived(
    "?canAdd@PlayerInventory@@QEBA_NAEBVItemStack@@@Z",
    function canAdd(this: PlayerInventory, itemStack: ItemStack): boolean {
        return this.container.canAdd(itemStack);
    },
    () => procHacker.js("?canAdd@PlayerInventory@@QEBA_NAEBVItemStack@@@Z", bool_t, { this: PlayerInventory }, ItemStack),
);
PlayerInventory.prototype.dropAllOnDeath = procHacker.js("?dropAllOnDeath@PlayerInventory@@QEAAX_N@Z", void_t, { this: PlayerInventory }, bool_t);

ItemDescriptor.prototype[NativeType.ctor] = procHacker.js("??0ItemDescriptor@@QEAA@XZ", void_t, { this: ItemDescriptor });
ItemDescriptor.prototype[NativeType.dtor] = procHacker.js("??1ItemDescriptor@@UEAA@XZ", void_t, { this: ItemDescriptor });
ItemDescriptor.prototype[NativeType.ctor_copy] = procHacker.js("??0ItemDescriptor@@QEAA@AEBV0@@Z", void_t, { this: ItemDescriptor }, ItemDescriptor);
NetworkItemStackDescriptor.prototype[NativeType.dtor] = procHacker.js("??1NetworkItemStackDescriptor@@UEAA@XZ", void_t, { this: NetworkItemStackDescriptor });
NetworkItemStackDescriptor.prototype[NativeType.ctor_copy] = procHacker.js(
    "??0NetworkItemStackDescriptor@@QEAA@AEBVItemStackDescriptor@@@Z",
    void_t,
    { this: NetworkItemStackDescriptor },
    NetworkItemStackDescriptor,
);

InventoryTransaction.prototype.addItemToContent = procHacker.js(
    "?addItemToContent@InventoryTransaction@@AEAAXAEBVItemStack@@H@Z",
    void_t,
    { this: InventoryTransaction },
    ItemStack,
    int32_t,
);
(InventoryTransaction.prototype as any)._getActions = procHacker.js(
    "?getActions@InventoryTransaction@@QEBAAEBV?$vector@VInventoryAction@@V?$allocator@VInventoryAction@@@std@@@std@@AEBVInventorySource@@@Z",
    CxxVector.make(InventoryAction),
    { this: InventoryTransaction },
    InventorySource,
);
InventoryTransactionItemGroup.prototype.getItemStack = procHacker.js("?getItemInstance@InventoryTransactionItemGroup@@QEBA?AVItemStack@@XZ", ItemStack, {
    this: InventoryTransaction,
    structureReturn: true,
});

// block.ts
namespace BlockTypeRegistry {
    export const lookupByName = procHacker.js(
        "?lookupByName@BlockTypeRegistry@@SA?AV?$WeakPtr@VBlockLegacy@@@@AEBVHashedString@@_N@Z",
        WeakPtr.make(BlockLegacy),
        { structureReturn: true },
        HashedString,
        bool_t,
    );
}

BlockLegacy.prototype.getCommandNames = procHacker.js(
    "?getCommandNames@BlockLegacy@@QEBA?AV?$vector@UCommandName@@V?$allocator@UCommandName@@@std@@@std@@XZ",
    CxxVector$CxxStringWith8Bytes,
    { this: BlockLegacy, structureReturn: true },
);
BlockLegacy.prototype.getCommandNames2 = procHacker.js(
    "?getCommandNames@BlockLegacy@@QEBA?AV?$vector@UCommandName@@V?$allocator@UCommandName@@@std@@@std@@XZ",
    CxxVector$CommandName,
    { this: BlockLegacy, structureReturn: true },
);
BlockLegacy.prototype.getCreativeCategory = procHacker.js("?getCreativeCategory@BlockLegacy@@QEBA?AW4CreativeItemCategory@@XZ", int32_t, { this: BlockLegacy });
BlockLegacy.prototype.setDestroyTime = procHacker.js("?setDestroyTime@BlockLegacy@@QEAAAEAV1@M@Z", void_t, { this: BlockLegacy }, float32_t);
BlockLegacy.prototype.getBlockEntityType = procHacker.js("?getBlockEntityType@BlockLegacy@@QEBA?AW4BlockActorType@@XZ", int32_t, { this: BlockLegacy });
BlockLegacy.prototype.getBlockItemId = procHacker.js("?getBlockItemId@BlockLegacy@@QEBAFXZ", int16_t, { this: BlockLegacy });
BlockLegacy.prototype.getStateFromLegacyData = procHacker.js(
    "?getStateFromLegacyData@BlockLegacy@@QEBAAEBVBlock@@G@Z",
    Block.ref(),
    { this: BlockLegacy },
    uint16_t,
);

BlockLegacy.prototype.getRenderBlock = procHacker.js("?getRenderBlock@BlockLegacy@@UEBAAEBVBlock@@XZ", Block, { this: BlockLegacy });
BlockLegacy.prototype.getDefaultState = procHacker.js("?getDefaultState@BlockLegacy@@QEBAAEBVBlock@@XZ", Block, { this: BlockLegacy });
BlockLegacy.prototype.tryGetStateFromLegacyData = procHacker.js(
    "?tryGetStateFromLegacyData@BlockLegacy@@QEBAPEBVBlock@@G@Z",
    Block,
    { this: BlockLegacy },
    uint16_t,
);
BlockLegacy.prototype.use = procHacker.jsv(
    "??_7JukeboxBlock@@6B@",
    "?use@JukeboxBlock@@UEBA_NAEAVPlayer@@AEBVBlockPos@@E@Z",
    bool_t,
    { this: BlockLegacy },
    Player,
    BlockPos,
    uint8_t,
);
BlockLegacy.prototype.asItemInstance = procHacker.jsv(
    "??_7BlockLegacy@@6B@",
    "?asItemInstance@BlockLegacy@@UEBA?AVItemInstance@@AEBVBlock@@PEBVBlockActor@@@Z",
    ItemStackBase,
    { this: BlockLegacy, structureReturn: true },
    Block,
    BlockActor,
);
BlockLegacy.prototype.getSilkTouchedItemInstance = function (block) {
    return this.asItemInstance(this.getRenderBlock());
};

// Block::getName is one line in 2024 (0x2f2d00: `movq 48(%rcx),%rax; addq $152,%rax`) and 1.26 keeps no
// out-of-line copy -- the inliner took it, and neither image holds a function of that shape. The two
// offsets it walks were read off live objects instead (docs/findings-reach.md: Block+0x68 is the
// BlockLegacy, and every legacy block carries its own name there), so bdsx walks them itself. The
// literals are the 2024 offsets, used only when the table ships no layouts for these classes.
const Block$blockLegacyOffset = pdbcache.layouts.Block?.blockLegacy ?? 0x30;
// 1.26: +0xe0. findings-reach.md recorded +0xe8, which is the std::string *inside* the HashedString --
// reading the HashedString from there returned "t:dirt" for "minecraft:dirt" (docs/findings-blocks.md).
const BlockLegacy$nameOffset = pdbcache.layouts.BlockLegacy?.name ?? 0x98;
(Block.prototype as any)._getName = derived(
    "?getName@Block@@QEBAAEBVHashedString@@XZ",
    function (this: Block): HashedString {
        return (this as any as StaticPointer).getPointer(Block$blockLegacyOffset).addAs(HashedString, BlockLegacy$nameOffset);
    },
    () => procHacker.js("?getName@Block@@QEBAAEBVHashedString@@XZ", HashedString, { this: Block }),
);
Block.create = function (blockName: string, data: number = 0): Block | null {
    data |= 0;
    if (data < 0 || data > 0x7fff) data = 0;
    const blockNameHashed = HashedString.constructWith(blockName);
    const legacyptr = BlockTypeRegistry.lookupByName(blockNameHashed, false);
    blockNameHashed.destruct();

    const legacy = legacyptr.value();
    legacyptr.dispose(); // it does not delete `legacy` because it's WeakPtr
    if (legacy !== null) {
        if (legacy.getBlockItemId() < 0x100) {
            if (data === 0x7fff) {
                return legacy.getDefaultState();
            } else {
                return legacy.tryGetStateFromLegacyData(data);
            }
        } else {
            return legacy.tryGetStateFromLegacyData(data);
        }
    }
    return null;
};
Block.prototype.getDescriptionId = procHacker.js("?getDescriptionId@Block@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Block,
    structureReturn: true,
});
Block.prototype.getRuntimeId = procHacker.js("?getRuntimeId@Block@@QEBAAEBIXZ", uint32_t.ref(), { this: Block });
Block.prototype.getBlockEntityType = procHacker.js("?getBlockEntityType@Block@@QEBA?AW4BlockActorType@@XZ", int32_t, { this: Block });
Block.prototype.hasBlockEntity = procHacker.js("?hasBlockEntity@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.use = procHacker.js("?use@Block@@QEBA_NAEAVPlayer@@AEBVBlockPos@@EV?$optional@VVec3@@@std@@@Z", bool_t, { this: Block }, Player, BlockPos, uint8_t);
Block.prototype.getVariant = procHacker.js("?getVariant@Block@@QEBAHXZ", int32_t, { this: Block });
Block.prototype.getSerializationId = procHacker.js("?getSerializationId@Block@@QEBAAEBVCompoundTag@@XZ", CompoundTag.ref(), { this: Block });
(Block.prototype as any)._asItemInstance1 = procHacker.js(
    "?asItemInstance@Block@@QEBA?AVItemInstance@@AEAVBlockSource@@AEBVBlockPos@@@Z",
    ItemStack,
    {
        this: Block,
        structureReturn: true,
    },
    BlockSource,
    BlockPos,
);
(Block.prototype as any)._asItemInstance2 = procHacker.js(
    "?asItemInstance@Block@@QEBA?AVItemInstance@@AEAVBlockSource@@AEBVBlockPos@@_N@Z",
    ItemStack,
    {
        this: Block,
        structureReturn: true,
    },
    BlockSource,
    BlockPos,
    bool_t,
);
Block.prototype.getSilkTouchItemInstance = function () {
    return this.blockLegacy.asItemInstance(this);
};
Block.prototype.isUnbreakable = procHacker.js("?isUnbreakable@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.buildDescriptionId = procHacker.js("?buildDescriptionId@Block@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Block,
    structureReturn: true,
});
Block.prototype.isCropBlock = procHacker.js("?isCropBlock@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.popResource = procHacker.js(
    "?popResource@Block@@QEBAPEAVItemActor@@AEAVBlockSource@@AEBVBlockPos@@AEBVItemInstance@@@Z",
    ItemActor,
    { this: Block },
    BlockSource,
    BlockPos,
    ItemStack,
);
Block.prototype.canHurtAndBreakItem = procHacker.js("?canHurtAndBreakItem@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.getThickness = procHacker.js("?getThickness@Block@@QEBAMXZ", float32_t, { this: Block });
Block.prototype.hasComparatorSignal = procHacker.js("?hasComparatorSignal@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.getTranslucency = procHacker.js("?getTranslucency@Block@@QEBAMXZ", float32_t, { this: Block });
const Block$getExplosionResistance = procHacker.js("?getExplosionResistance@Block@@QEBAMXZ", float32_t, null, Block);
Block.prototype.getExplosionResistance = function (actor: Actor | null = null): number {
    return Block$getExplosionResistance(this);
};
Block.prototype.getComparatorSignal = procHacker.js(
    "?getComparatorSignal@Block@@QEBAHAEAVBlockSource@@AEBVBlockPos@@E@Z",
    int32_t,
    { this: Block },
    BlockSource,
    BlockPos,
    uint8_t,
);
Block.prototype.getDirectSignal = procHacker.js(
    "?getDirectSignal@Block@@QEBAHAEAVBlockSource@@AEBVBlockPos@@H@Z",
    int32_t,
    { this: Block },
    BlockSource,
    BlockPos,
    int32_t,
);
Block.prototype.isSignalSource = procHacker.js("?isSignalSource@Block@@QEBA_NXZ", bool_t, { this: Block });
Block.prototype.getDestroySpeed = procHacker.js("?getDestroySpeed@Block@@QEBAMXZ", float32_t, { this: Block });

// BDS calls BlockSource::setBlock (this, exactly same overload) when player moves to TheEnd Dimension, to secure the obsidian platform.
//
// 1.26 keeps no out-of-line copy of that (int,int,int,...) wrapper: a scan of every .pdata function
// for the three-int spill that builds the BlockPos finds the 2024 one (0x1b1ad60) and nothing of that
// shape in either 1.26 build. So bdsx builds the BlockPos and calls the virtual itself. Slot 32 of
// ??_7BlockSource@@6B@ is the same function as 2024's slot 33 (which the 2024 wrapper reaches through
// `movq 264(%rax)`), instruction for instruction bar the security cookie 1.26 added. The one thing
// that changed is the last parameter, from `Actor*` to `BlockChangeContext const&`, and the body says
// so on both builds: it reads the variant's index byte at +16 and takes the Actor* at +0 when that
// byte is 2 (ActorChangeContext, the third alternative in Endstone's block_change_context.h). A
// zeroed context is std::monostate, which is exactly what bdsx's null actor means.
// docs/findings-blocks.md.
const BlockSource$setBlockSlot = 0x100; // slot 32 in ??_7BlockSource@@6B@
const BlockChangeContext$size = 24; // 16 bytes of variant storage, the index byte at +16
const BlockChangeContext$indexOffset = 16;
const BlockChangeContext$actorIndex = 2;
const BlockSource$setBlockVirtual = makefunc.js(
    [BlockSource$setBlockSlot],
    bool_t,
    { this: BlockSource },
    BlockPos,
    Block,
    int32_t,
    VoidPointer, // ActorBlockSyncMessage const*: the 2024 wrapper always passed nullptr here too
    VoidPointer, // BlockChangeContext const&
);
(BlockSource.prototype as any)._setBlock = derived(
    "?setBlock@BlockSource@@QEAA_NHHHAEBVBlock@@HPEAVActor@@@Z",
    function (this: BlockSource, x: number, y: number, z: number, block: Block, updateFlags: number, actor: Actor | null): boolean {
        const pos = BlockPos.create(x, y, z);
        const context = new AllocatedPointer(BlockChangeContext$size);
        context.setBuffer(Buffer.alloc(BlockChangeContext$size));
        if (actor != null) {
            context.setPointer(actor, 0);
            context.setUint8(BlockChangeContext$actorIndex, BlockChangeContext$indexOffset);
        }
        return BlockSource$setBlockVirtual.call(this, pos, block, updateFlags, null as any, context);
    },
    () =>
        procHacker.js(
            "?setBlock@BlockSource@@QEAA_NHHHAEBVBlock@@HPEAVActor@@@Z",
            bool_t,
            { this: BlockSource },
            int32_t,
            int32_t,
            int32_t,
            Block,
            int32_t,
            Actor,
        ),
);
BlockSource.prototype.setBlock = function (blockPos: BlockPos, block: Block): boolean {
    if (block == null) throw Error("Block is null");
    return (this as any)._setBlock(blockPos.x, blockPos.y, blockPos.z, block, 3, null);
};

BlockSource.prototype.getBlock = procHacker.js("?getBlock@BlockSource@@UEBAAEBVBlock@@AEBVBlockPos@@@Z", Block, { this: BlockSource }, BlockPos);
BlockSource.prototype.getBlockEntity = procHacker.js(
    "?getBlockEntity@BlockSource@@QEAAPEAVBlockActor@@AEBVBlockPos@@@Z",
    BlockActor,
    { this: BlockSource },
    BlockPos,
);
BlockSource.prototype.removeBlockEntity = procHacker.js(
    "?removeBlockEntity@BlockSource@@QEAA?AV?$shared_ptr@VBlockActor@@@std@@AEBVBlockPos@@@Z",
    void_t,
    { this: BlockSource },
    BlockPos,
);
BlockSource.prototype.getDimension = procHacker.js("?getDimension@BlockSource@@UEAAAEAVDimension@@XZ", Dimension, { this: BlockSource });
BlockSource.prototype.getDimensionId = procHacker.js("?getDimensionId@BlockSource@@UEBA?AV?$AutomaticID@VDimension@@H@@XZ", int32_t, {
    this: BlockSource,
    structureReturn: true,
});
BlockSource.prototype.getBrightness = procHacker.jsv(
    "??_7BlockSource@@6B@",
    "?getBrightness@BlockSource@@UEBAMAEBVBlockPos@@@Z",
    float32_t,
    { this: BlockSource },
    BlockPos,
);

const ChestBlockActor$vftable = proc["??_7ChestBlockActor@@6BRandomizableBlockActorContainerBase@@@"];
BlockActor.setResolver(ptr => {
    if (ptr === null) return null;
    const vftable = ptr.getPointer();
    if (vftable.equalsptr(ChestBlockActor$vftable)) {
        return ptr.as(ChestBlockActor);
    }
    return ptr.as(BlockActor);
});

const BlockActor$load = procHacker.jsv(
    "??_7BlockActor@@6B@",
    "?load@BlockActor@@UEAAXAEAVLevel@@AEBVCompoundTag@@AEAVDataLoadHelper@@@Z",
    void_t,
    { this: BlockActor },
    Level,
    CompoundTag,
    DefaultDataLoaderHelper,
);
const BlockActor$save = procHacker.jsv("??_7BlockActor@@6B@", "?save@BlockActor@@UEBA_NAEAVCompoundTag@@@Z", bool_t, { this: BlockActor }, CompoundTag);

BlockActor.prototype.save = function (tag?: CompoundTag): any {
    if (tag != null) {
        return BlockActor$save.call(this, tag);
    }
    tag = CompoundTag.allocate();
    if (!BlockActor$save.call(this, tag)) return null;
    const res = tag.value();
    tag.dispose();
    return res;
};
BlockActor.prototype.load = function (tag) {
    const level = bedrockServer.level;
    if (tag instanceof Tag) {
        BlockActor$load.call(this, level, tag, DefaultDataLoaderHelper.create());
    } else {
        const allocated = NBT.allocate(tag);
        BlockActor$load.call(this, level, allocated as CompoundTag, DefaultDataLoaderHelper.create());
        allocated.dispose();
    }
};
BlockActor.prototype.setChanged = procHacker.js("?setChanged@BlockActor@@QEAAXXZ", void_t, { this: BlockActor });
BlockActor.prototype.setCustomName = procHacker.js(
    "?setCustomName@BlockActor@@UEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    { this: BlockActor },
    CxxString,
);
BlockActor.prototype.getContainer = procHacker.jsv(
    "??_7ChestBlockActor@@6BRandomizableBlockActorContainerBase@@@",
    "?getContainer@ChestBlockActor@@UEBAPEBVContainer@@XZ",
    Container,
    { this: BlockActor },
);
BlockActor.prototype.getType = procHacker.js("?getType@BlockActor@@QEBAAEBW4BlockActorType@@XZ", int32_t.ref(), { this: BlockActor });
BlockActor.prototype.getPosition = procHacker.js("?getPosition@BlockActor@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: BlockActor });
BlockActor.prototype.getServerUpdatePacket = procHacker.js(
    "?getServerUpdatePacket@BlockActor@@QEAA?AV?$unique_ptr@VBlockActorDataPacket@@U?$default_delete@VBlockActorDataPacket@@@std@@@std@@AEAVBlockSource@@@Z",
    BlockActorDataPacket.ref(),
    { this: BlockActor, structureReturn: true },
    BlockSource,
);
BlockActor.prototype.updateClientSide = function (player: ServerPlayer): void {
    const pk = BlockActorDataPacket.allocate();
    const nbtData = this.allocateAndSave();
    pk.pos.set(this.getPosition());
    pk.data.destruct();
    pk.data[NativeType.ctor_move](nbtData);
    player.sendNetworkPacket(pk);
    nbtData.dispose();
    pk.dispose();
};
BlockActor.prototype.getCustomName = procHacker.js("?getCustomName@BlockActor@@UEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: BlockActor,
});

ChestBlockActor.prototype.isLargeChest = procHacker.js("?isLargeChest@ChestBlockActor@@QEBA_NXZ", bool_t, { this: ChestBlockActor });
ChestBlockActor.prototype.openBy = procHacker.js("?openBy@ChestBlockActor@@UEAAXAEAVPlayer@@@Z", void_t, { this: ChestBlockActor }, Player);
ChestBlockActor.prototype.getPairedChestPosition = procHacker.js("?getPairedChestPosition@ChestBlockActor@@QEAAAEBVBlockPos@@XZ", BlockPos, {
    this: ChestBlockActor,
});

PistonBlockActor.prototype.getPosition = procHacker.js("?getPosition@BlockActor@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: PistonBlockActor });
PistonBlockActor.prototype.getAttachedBlocks = procHacker.js(
    "?getAttachedBlocks@PistonBlockActor@@QEBAAEBV?$vector@VBlockPos@@V?$allocator@VBlockPos@@@std@@@std@@XZ",
    CxxVectorToArray.make(BlockPos),
    { this: PistonBlockActor },
);
PistonBlockActor.prototype.getFacingDir = procHacker.js(
    "?getFacingDir@PistonBlockActor@@QEBAAEBVBlockPos@@AEBVIConstBlockSource@@@Z",
    BlockPos,
    { this: PistonBlockActor },
    BlockSource,
);

BlockSource.prototype.getChunk = procHacker.js("?getChunk@BlockSource@@UEBAPEAVLevelChunk@@AEBVChunkPos@@@Z", LevelChunk, { this: BlockSource }, ChunkPos);
BlockSource.prototype.getChunkAt = procHacker.js("?getChunkAt@BlockSource@@UEBAPEAVLevelChunk@@AEBVBlockPos@@@Z", LevelChunk, { this: BlockSource }, BlockPos);
BlockSource.prototype.getChunkSource = procHacker.js("?getChunkSource@BlockSource@@UEAAAEAVChunkSource@@XZ", ChunkSource, { this: BlockSource });
BlockSource.prototype.checkBlockDestroyPermission = procHacker.js(
    "?checkBlockDestroyPermissions@BlockSource@@QEAA_NAEAVActor@@AEBVBlockPos@@AEBVItemStackBase@@_N@Z",
    bool_t,
    { this: BlockSource },
    Actor,
    BlockPos,
    ItemStackBase,
    bool_t,
);

BlockUtils.isDownwardFlowingLiquid = procHacker.js("?isDownwardFlowingLiquid@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);
BlockUtils.isBeehiveBlock = procHacker.js("?isBeehiveBlock@BlockUtils@@SA_NAEBVBlockLegacy@@@Z", bool_t, null, BlockLegacy);
BlockUtils.isWaterSource = procHacker.js("?isWaterSource@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);
BlockUtils.isFullFlowingLiquid = procHacker.js("?isFullFlowingLiquid@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);
BlockUtils.allowsNetherVegetation = procHacker.js("?allowsNetherVegetation@BlockUtils@@SA_NAEBVBlockLegacy@@@Z", bool_t, null, BlockLegacy);
BlockUtils.isThinFenceOrWallBlock = procHacker.js("?isThinFenceOrWallBlock@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);
BlockUtils.isLiquidSource = procHacker.js("?isLiquidSource@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);
BlockUtils.getLiquidBlockHeight = procHacker.js("?getLiquidBlockHeight@BlockUtils@@SAMAEBVBlock@@AEBVBlockPos@@@Z", float32_t, null, Block, BlockPos);
BlockUtils.canGrowTreeWithBeehive = procHacker.js("?canGrowTreeWithBeehive@BlockUtils@@SA_NAEBVBlock@@@Z", bool_t, null, Block);

// abilties.ts
// The ability block (docs/findings-abilities.md). 1.26 inlined every one of these functions away:
// Player::getAbilities still resolves, and after it everything is arithmetic over one layout --
// a layer is `abilityCount` Ability records of `abilityStride` bytes, LayeredAbilities holds
// `layerCount` of them starting at `layers`, and a lookup walks the layers from the top down to
// the first record that is not Unset, falling back to Abilities::INVALID_ABILITY. The numbers come
// from symbols.json `layouts` (1.26: 20 abilities, 6 layers at +24, 240 bytes each) and the
// fallbacks are the 2024 shape (19 abilities, 5 layers at +4). Each body is written from the
// semantics; the binary wins whenever a build resolves the name.
Ability.define({
    type: uint8_t,
    value: Ability.Value,
    options: uint8_t,
});
const Ability$layout = pdbcache.layouts.Ability ?? {};
const ABILITY_VALUE = Ability$layout.value ?? 0x04;
const LayeredAbilities$layout = pdbcache.layouts.LayeredAbilities ?? {};
const LA_LAYERS = LayeredAbilities$layout.layers ?? 4;
const LA_LAYER_STRIDE = LayeredAbilities$layout.layerStride ?? abilityCount * abilityStride;
const LA_LAYER_COUNT = LayeredAbilities$layout.layerCount ?? 5;
/** the layer `setAbility` writes into; the engine's own setter only ever touches this one */
const LA_BASE_LAYER = LayeredAbilities$layout.baseLayer ?? AbilitiesLayer.Base;

/** `&layers_[layer].abilities_[index]`, or INVALID_ABILITY for an index the layer does not have */
function abilityIn(self: LayeredAbilities, layer: number, abilityIndex: AbilitiesIndex): Ability {
    if (abilityIndex < 0 || abilityIndex >= abilityCount) return Ability.INVALID_ABILITY;
    return (self as any as StaticPointer).addAs(Ability, LA_LAYERS + layer * LA_LAYER_STRIDE + abilityIndex * abilityStride);
}
/** the topmost layer that has the ability set; INVALID_ABILITY when none of them does */
function topmostAbility(self: LayeredAbilities, abilityIndex: AbilitiesIndex): Ability {
    for (let layer = LA_LAYER_COUNT - 1; layer >= 0; layer--) {
        const ability = abilityIn(self, layer, abilityIndex);
        if (ability.type !== Ability.Type.Unset) return ability;
    }
    return Ability.INVALID_ABILITY;
}
// A layer index the object does not have: the engine returns a shared, never-written Abilities, so
// every record in it reads as Invalid with a zero value. bdsx keeps its own zeroed copy for that.
let emptyAbilities: Abilities | null = null;
function noSuchLayer(): Abilities {
    if (emptyAbilities === null) {
        const ptr = new AllocatedPointer(LA_LAYER_STRIDE);
        ptr.setBuffer(Buffer.alloc(LA_LAYER_STRIDE));
        emptyAbilities = ptr.as(Abilities);
    }
    return emptyAbilities;
}

Ability.prototype.getBool = derived(
    "?getBool@Ability@@QEBA_NXZ",
    function getBool(this: Ability): boolean {
        return this.type === Ability.Type.Unset ? false : this.getUint8(ABILITY_VALUE) !== 0;
    },
    () => procHacker.js("?getBool@Ability@@QEBA_NXZ", bool_t, { this: Ability }),
);
Ability.prototype.getFloat = derived(
    "?getFloat@Ability@@QEBAMXZ",
    function getFloat(this: Ability): number {
        return this.type === Ability.Type.Unset ? 0 : this.getFloat32(ABILITY_VALUE);
    },
    () => procHacker.js("?getFloat@Ability@@QEBAMXZ", float32_t, { this: Ability }),
);
Ability.prototype.setBool = derived(
    "?setBool@Ability@@QEAAX_N@Z",
    function setBool(this: Ability, value: boolean): void {
        // an Unset record becomes a Bool one with a cleared union first, as the engine's setter does
        if (this.type === Ability.Type.Unset) {
            this.type = Ability.Type.Bool;
            this.setUint8(0, ABILITY_VALUE);
        }
        this.setUint8(value ? 1 : 0, ABILITY_VALUE);
    },
    () => procHacker.js("?setBool@Ability@@QEAAX_N@Z", void_t, { this: Ability }, bool_t),
);

Abilities.prototype.getBool = derived(
    "?getBool@Abilities@@QEBA_NW4AbilitiesIndex@@@Z",
    function getBool(this: Abilities, abilityIndex: AbilitiesIndex): boolean {
        return this.getAbility(abilityIndex).getBool();
    },
    () => procHacker.js("?getBool@Abilities@@QEBA_NW4AbilitiesIndex@@@Z", bool_t, { this: Abilities }, uint16_t),
);
Abilities.prototype.getFloat = derived(
    "?getFloat@Abilities@@QEBAMW4AbilitiesIndex@@@Z",
    function getFloat(this: Abilities, abilityIndex: AbilitiesIndex): number {
        return this.getAbility(abilityIndex).getFloat();
    },
    () => procHacker.js("?getFloat@Abilities@@QEBAMW4AbilitiesIndex@@@Z", float32_t, { this: Abilities }, uint16_t),
);
const Abilities$setAbilityBool = derived(
    "?setAbility@Abilities@@QEAAXW4AbilitiesIndex@@_N@Z",
    function setAbilityBool(this: Abilities, abilityIndex: AbilitiesIndex, value: boolean): void {
        this.getAbility(abilityIndex).setBool(value);
    },
    () => {
        const bound = procHacker.js("?setAbility@Abilities@@QEAAXW4AbilitiesIndex@@_N@Z", void_t, { this: Abilities }, uint16_t, bool_t);
        return function setAbilityBool(this: Abilities, abilityIndex: AbilitiesIndex, value: boolean): void {
            bound.call(this, abilityIndex, value);
        };
    },
);
Abilities.prototype.setAbility = function (abilityIndex: AbilitiesIndex, value: boolean | number) {
    switch (typeof value) {
        case "boolean":
            Abilities$setAbilityBool.call(this, abilityIndex, value);
            break;
        case "number":
            this.getAbility(abilityIndex).setFloat(value);
            break;
    }
};
Abilities.prototype.isFlying = function () {
    return this.getBool(AbilitiesIndex.Flying);
};

LayeredAbilities.prototype.getLayer = derived(
    "?getLayer@LayeredAbilities@@QEAAAEAVAbilities@@W4AbilitiesLayer@@@Z",
    function getLayer(this: LayeredAbilities, layer: AbilitiesLayer): Abilities {
        if (layer < 0 || layer >= LA_LAYER_COUNT) return noSuchLayer();
        return (this as any as StaticPointer).addAs(Abilities, LA_LAYERS + layer * LA_LAYER_STRIDE);
    },
    () => procHacker.js("?getLayer@LayeredAbilities@@QEAAAEAVAbilities@@W4AbilitiesLayer@@@Z", Abilities, { this: LayeredAbilities }, uint16_t),
);
LayeredAbilities.prototype.getCommandPermissions = procHacker.js("?getCommandPermissions@LayeredAbilities@@QEBA?AW4CommandPermissionLevel@@XZ", int32_t, {
    this: LayeredAbilities,
});
LayeredAbilities.prototype.getPlayerPermissions = procHacker.js("?getPlayerPermissions@LayeredAbilities@@QEBA?AW4PlayerPermissionLevel@@XZ", int32_t, {
    this: LayeredAbilities,
});
LayeredAbilities.prototype.setCommandPermissions = procHacker.js(
    "?setCommandPermissions@LayeredAbilities@@QEAAXW4CommandPermissionLevel@@@Z",
    void_t,
    { this: LayeredAbilities },
    int32_t,
);
LayeredAbilities.prototype.setPlayerPermissions = procHacker.js(
    "?setPlayerPermissions@LayeredAbilities@@QEAAXW4PlayerPermissionLevel@@@Z",
    void_t,
    { this: LayeredAbilities },
    int32_t,
);

LayeredAbilities.prototype.getCommandPermissionLevel = LayeredAbilities.prototype.getCommandPermissions;
LayeredAbilities.prototype.getPlayerPermissionLevel = LayeredAbilities.prototype.getPlayerPermissions;
LayeredAbilities.prototype.setCommandPermissionLevel = LayeredAbilities.prototype.setCommandPermissions;
LayeredAbilities.prototype.setPlayerPermissionLevel = LayeredAbilities.prototype.setPlayerPermissions;

const LayeredAbilities$getAbility = derived(
    "?getAbility@LayeredAbilities@@QEAAAEAVAbility@@W4AbilitiesLayer@@W4AbilitiesIndex@@@Z",
    function getAbility(this: LayeredAbilities, abilityLayer: AbilitiesLayer, abilityIndex: AbilitiesIndex): Ability {
        if (abilityLayer < 0 || abilityLayer >= LA_LAYER_COUNT) return Ability.INVALID_ABILITY;
        return abilityIn(this, abilityLayer, abilityIndex);
    },
    () => {
        const bound = procHacker.js(
            "?getAbility@LayeredAbilities@@QEAAAEAVAbility@@W4AbilitiesLayer@@W4AbilitiesIndex@@@Z",
            Ability,
            { this: LayeredAbilities },
            uint16_t,
            uint16_t,
        );
        return function getAbility(this: LayeredAbilities, abilityLayer: AbilitiesLayer, abilityIndex: AbilitiesIndex): Ability {
            return bound.call(this, abilityLayer, abilityIndex);
        };
    },
);
const LayeredAbilities$getAbilityOnlyIndex = derived(
    "?getAbility@LayeredAbilities@@QEBAAEBVAbility@@W4AbilitiesIndex@@@Z",
    function getAbility(this: LayeredAbilities, abilityIndex: AbilitiesIndex): Ability {
        return topmostAbility(this, abilityIndex);
    },
    () => {
        const bound = procHacker.js("?getAbility@LayeredAbilities@@QEBAAEBVAbility@@W4AbilitiesIndex@@@Z", Ability, { this: LayeredAbilities }, uint16_t);
        return function getAbility(this: LayeredAbilities, abilityIndex: AbilitiesIndex): Ability {
            return bound.call(this, abilityIndex);
        };
    },
);
LayeredAbilities.prototype.getAbility = function (abilityLayer: AbilitiesLayer | AbilitiesIndex, abilityIndex?: AbilitiesIndex) {
    if (abilityIndex == null) {
        return LayeredAbilities$getAbilityOnlyIndex.call(this, abilityLayer);
    } else {
        return LayeredAbilities$getAbility.call(this, abilityLayer, abilityIndex);
    }
};
const LayeredAbilities$setAbilityFloat = derived(
    "?setAbility@LayeredAbilities@@QEAAXW4AbilitiesIndex@@M@Z",
    function setAbilityFloat(this: LayeredAbilities, abilityIndex: AbilitiesIndex, value: number): void {
        abilityIn(this, LA_BASE_LAYER, abilityIndex).setFloat(value);
    },
    () => {
        const bound = procHacker.js("?setAbility@LayeredAbilities@@QEAAXW4AbilitiesIndex@@M@Z", void_t, { this: LayeredAbilities }, uint16_t, float32_t);
        return function setAbilityFloat(this: LayeredAbilities, abilityIndex: AbilitiesIndex, value: number): void {
            bound.call(this, abilityIndex, value);
        };
    },
);
const LayeredAbilities$setAbilityBool = derived(
    "?setAbility@LayeredAbilities@@QEAAXW4AbilitiesIndex@@_N@Z",
    function setAbilityBool(this: LayeredAbilities, abilityIndex: AbilitiesIndex, value: boolean): void {
        abilityIn(this, LA_BASE_LAYER, abilityIndex).setBool(value);
    },
    () => {
        const bound = procHacker.js("?setAbility@LayeredAbilities@@QEAAXW4AbilitiesIndex@@_N@Z", void_t, { this: LayeredAbilities }, uint16_t, bool_t);
        return function setAbilityBool(this: LayeredAbilities, abilityIndex: AbilitiesIndex, value: boolean): void {
            bound.call(this, abilityIndex, value);
        };
    },
);
LayeredAbilities.prototype.setAbility = function (abilityIndex: AbilitiesIndex, value: boolean | number) {
    switch (typeof value) {
        case "boolean":
            LayeredAbilities$setAbilityBool.call(this, abilityIndex, value);
            break;
        case "number":
            LayeredAbilities$setAbilityFloat.call(this, abilityIndex, value);
            break;
    }
};

LayeredAbilities.prototype.getBool = derived(
    "?getBool@LayeredAbilities@@QEBA_NW4AbilitiesIndex@@@Z",
    function getBool(this: LayeredAbilities, abilityIndex: AbilitiesIndex): boolean {
        return topmostAbility(this, abilityIndex).getBool();
    },
    () => procHacker.js("?getBool@LayeredAbilities@@QEBA_NW4AbilitiesIndex@@@Z", bool_t, { this: LayeredAbilities }, uint16_t),
);
const AbilityFloatWithLayer = CxxPair.make(float32_t, int32_t);
const getFloatWithLayerKey = "?getFloatWithLayer@LayeredAbilities@@QEBA?AU?$pair@MW4AbilitiesLayer@@@std@@W4AbilitiesIndex@@@Z";
(LayeredAbilities as any).prototype._getFloatWithLayer = derived(
    getFloatWithLayerKey,
    function getFloatWithLayer(this: LayeredAbilities, abilityIndex: AbilitiesIndex): CxxPair<float32_t, int32_t> {
        const pair = AbilityFloatWithLayer.construct();
        for (let layer = LA_LAYER_COUNT - 1; layer >= 0; layer--) {
            const ability = abilityIn(this, layer, abilityIndex);
            if (ability.type !== Ability.Type.Unset) {
                pair.first = ability.getFloat();
                pair.second = layer;
                return pair;
            }
        }
        // nothing set anywhere: the engine reports zero and LayerCount, which is no layer at all
        pair.first = 0;
        pair.second = LA_LAYER_COUNT;
        return pair;
    },
    () => procHacker.js(getFloatWithLayerKey, AbilityFloatWithLayer, { this: LayeredAbilities }, uint16_t),
);
LayeredAbilities.prototype.isFlying = function () {
    return this.getBool(AbilitiesIndex.Flying);
};

// The two ability-name functions were leaves over one table -- `const char*` in AbilitiesIndex
// order -- and 1.26 inlined both of them away. The table did not go anywhere: it is one entry
// longer (verticalFlySpeed) and it still carries the engine's own spelling, capitals and all, so
// bdsx reads it through its address and does the indexing and the search itself. The count is
// `abilityCount`, the same bound the binary checks before it indexes a layer.
// docs/findings-abilities.md, "The name table".
const ABILITY_NAMES_KEY = "bdsx:Abilities::ABILITY_NAMES";
let abilityNames: string[] | null = null;
function abilityNameTable(): string[] {
    if (abilityNames === null) {
        if (!(ABILITY_NAMES_KEY in proc)) throw Error(`${ABILITY_NAMES_KEY}: no ability name table in this build's symbols.json`);
        const table = proc[ABILITY_NAMES_KEY];
        const names: string[] = [];
        for (let i = 0; i < abilityCount; i++) {
            const name = table.getNullablePointer(i * 8);
            names.push(name === null ? "" : name.getString());
        }
        abilityNames = names;
    }
    return abilityNames;
}
const getAbilityNameKey = "?getAbilityName@Abilities@@SAPEBDW4AbilitiesIndex@@@Z";
const Abilities$getAbilityName = derived(
    getAbilityNameKey,
    function getAbilityName(abilityIndex: uint16_t): string {
        // the engine indexes the array without a bounds check; bdsx stops at the end of it instead
        const names = abilityNameTable();
        return abilityIndex >= 0 && abilityIndex < names.length ? names[abilityIndex] : "";
    },
    () => {
        const bound = procHacker.js(getAbilityNameKey, StaticPointer, null, uint16_t);
        return function getAbilityName(abilityIndex: uint16_t): string {
            return bound(abilityIndex).getString();
        };
    },
);
Abilities.getAbilityName = function (abilityIndex: uint16_t): string {
    return Abilities$getAbilityName(abilityIndex);
};
const nameToAbilityIndexKey = "?nameToAbilityIndex@Abilities@@SA?AW4AbilitiesIndex@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z";
const Abilities$nameToAbilityIndex = derived(
    nameToAbilityIndexKey,
    function nameToAbilityIndex(name: string): int16_t {
        // the engine compares the bytes, so a name whose case differs is no ability at all --
        // which is why `flySpeed`, `walkSpeed`, `verticalFlySpeed` and `privilegedBuilder` never
        // match through the caller below. That is 2024's behaviour, kept.
        const names = abilityNameTable();
        for (let i = 0; i < names.length; i++) {
            if (names[i] === name) return i;
        }
        return -1;
    },
    () => {
        // Will return -1 if not found, so int16 instead of uint16
        const bound = procHacker.js(nameToAbilityIndexKey, int16_t, null, CxxString);
        return function nameToAbilityIndex(name: string): int16_t {
            return bound(name);
        };
    },
);
Abilities.nameToAbilityIndex = function (name: string): int16_t {
    return Abilities$nameToAbilityIndex(name.toLowerCase());
};

// gamerules.ts
// getRule, hasRule and nameToGameRuleIndex are bodies over one layout: a std::vector<GameRule> inside
// GameRules, indexed by id, each rule carrying its name. 1.26 keeps no separate copies to resolve, so
// they are written here against symbols.json `layouts.GameRules` (the vector's offset, the element
// size, the name's offset: read from the live object, docs/findings-slots.md). An id outside the
// vector gives null / false, a name that is no rule gives -1, as the 2024 functions did.
const gameRulesLayout = (): { rules: number; ruleSize: number; ruleName: number } => {
    const l = pdbcache.layouts.GameRules;
    if (l?.rules == null || l.ruleSize == null || l.ruleName == null) throw Error("GameRules: no address and no layouts.GameRules in this build's symbols.json");
    return l as { rules: number; ruleSize: number; ruleName: number };
};
function gameRuleCount(rules: StaticPointer, l: { rules: number; ruleSize: number }): number {
    const begin = rules.getPointer(l.rules),
        end = rules.getPointer(l.rules + 8);
    const d = end.subBin(begin.getAddressBin());
    return Math.floor((d.getAddressHigh() * 0x100000000 + d.getAddressLow()) / l.ruleSize);
}
GameRules.prototype.getRule = derived(
    "?getRule@GameRules@@QEBAPEBVGameRule@@UGameRuleId@@@Z",
    function getRule(this: GameRules, id: GameRuleId): GameRule {
        const l = gameRulesLayout(),
            self = this as any as StaticPointer;
        if (id < 0 || id >= gameRuleCount(self, l)) return null as any;
        return self.getPointer(l.rules).addAs(GameRule, id * l.ruleSize);
    },
    () => {
        const GameRules$getRule = procHacker.js("?getRule@GameRules@@QEBAPEBVGameRule@@UGameRuleId@@@Z", GameRule.ref(), { this: GameRules }, WrappedInt32);
        return function getRule(this: GameRules, id: GameRuleId): GameRule {
            return GameRules$getRule.call(this, WrappedInt32.create(id));
        };
    },
);
GameRules.prototype.hasRule = derived(
    "?hasRule@GameRules@@QEBA_NUGameRuleId@@@Z",
    function hasRule(this: GameRules, id: GameRuleId): bool_t {
        return id >= 0 && id < gameRuleCount(this as any as StaticPointer, gameRulesLayout());
    },
    () => {
        const GameRules$hasRule = procHacker.js("?hasRule@GameRules@@QEBA_NUGameRuleId@@@Z", bool_t, { this: GameRules }, WrappedInt32);
        return function hasRule(this: GameRules, id: GameRuleId): bool_t {
            return GameRules$hasRule.call(this, WrappedInt32.create(id));
        };
    },
);

const nameToGameRuleIndexKey = "?nameToGameRuleIndex@GameRules@@QEBA?AUGameRuleId@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z";
GameRules.prototype.nameToGameRuleIndex = derived(
    nameToGameRuleIndexKey,
    function nameToGameRuleIndex(this: GameRules, name: string): int32_t {
        const l = gameRulesLayout(),
            self = this as any as StaticPointer;
        const n = gameRuleCount(self, l),
            begin = self.getPointer(l.rules),
            want = name.toLowerCase();
        // rule names are compared without case, as `/gamerule` does
        for (let i = 0; i < n; i++) if (begin.getCxxString(i * l.ruleSize + l.ruleName).toLowerCase() === want) return i;
        return -1;
    },
    () => procHacker.js(nameToGameRuleIndexKey, int32_t, { this: GameRules, structureReturn: true }, CxxString), // Will return -1 if not found, so int32 instead of uint32
);

GameRules.nameToGameRuleIndex = function (name: string): int32_t {
    return bedrockServer.gameRules.nameToGameRuleIndex(name);
};

GameRule.abstract({
    shouldSave: bool_t,
    type: uint8_t,
    value: [GameRule.Value, 0x04],
});
GameRule.prototype.getBool = procHacker.js("?getBool@GameRule@@QEBA_NXZ", bool_t, { this: GameRule });
GameRule.prototype.getInt = procHacker.js("?getInt@GameRule@@QEBAHXZ", int32_t, { this: GameRule });
GameRule.prototype.getFloat = procHacker.js("?getFloat@GameRule@@QEBAMXZ", float32_t, { this: GameRule });

// scoreboard.ts
Scoreboard.prototype.clearDisplayObjective = procHacker.js(
    "?clearDisplayObjective@ServerScoreboard@@UEAAPEAVObjective@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    Objective,
    { this: Scoreboard },
    CxxString,
);
Scoreboard.prototype.setDisplayObjective = procHacker.js(
    "?setDisplayObjective@ServerScoreboard@@UEAAPEBVDisplayObjective@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBVObjective@@W4ObjectiveSortOrder@@@Z",
    DisplayObjective,
    { this: Scoreboard },
    CxxString,
    Objective,
    uint8_t,
);
Scoreboard.prototype.addObjective = procHacker.js(
    "?addObjective@Scoreboard@@QEAAPEAVObjective@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@0AEBVObjectiveCriteria@@@Z",
    Objective,
    { this: Scoreboard },
    CxxString,
    CxxString,
    ObjectiveCriteria,
);
Scoreboard.prototype.createScoreboardId = procHacker.js(
    "?createScoreboardId@ServerScoreboard@@UEAAAEBUScoreboardId@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    ScoreboardId,
    { this: Scoreboard },
    CxxString,
);
Scoreboard.prototype.getCriteria = procHacker.js(
    "?getCriteria@Scoreboard@@QEBAPEAVObjectiveCriteria@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    ObjectiveCriteria,
    { this: Scoreboard },
    CxxString,
);
Scoreboard.prototype.getDisplayObjective = procHacker.js(
    "?getDisplayObjective@Scoreboard@@QEBAPEBVDisplayObjective@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    DisplayObjective,
    { this: Scoreboard },
    CxxString,
);
Scoreboard.prototype.getObjective = procHacker.js(
    "?getObjective@Scoreboard@@QEBAPEAVObjective@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    Objective,
    { this: Scoreboard },
    CxxString,
);
const Scoreboard$getObjectiveNames = procHacker.js(
    "?getObjectiveNames@Scoreboard@@QEBA?AV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@XZ",
    CxxVector$string,
    { this: Scoreboard, structureReturn: true },
);
Scoreboard.prototype.getObjectiveNames = function () {
    const names: CxxVector<CxxString> = Scoreboard$getObjectiveNames.call(this);
    const res = names.toArray();
    names.destruct();
    return res;
};
const Scoreboard$getObjectives = procHacker.js(
    "?getObjectives@Scoreboard@@QEBA?AV?$vector@PEBVObjective@@V?$allocator@PEBVObjective@@@std@@@std@@XZ",
    CxxVector.make(Objective.ref()),
    { this: Scoreboard, structureReturn: true },
);
Scoreboard.prototype.getObjectives = function () {
    const objectives: CxxVector<Objective> = Scoreboard$getObjectives.call(this);
    const res = objectives.toArray();
    objectives.destruct();
    return res;
};
const Scoreboard$getActorScoreboardId = procHacker.js("?getScoreboardId@Scoreboard@@QEBAAEBUScoreboardId@@AEBVActor@@@Z", ScoreboardId, null, Scoreboard, Actor);
const Scoreboard$getPlayerScoreboardId = procHacker.js("?getScoreboardId@Scoreboard@@QEBAAEBUScoreboardId@@AEBVPlayer@@@Z", ScoreboardId, null, Scoreboard, Player);
const Scoreboard$getFakePlayerScoreboardId = procHacker.js(
    "?getScoreboardId@Scoreboard@@QEBAAEBUScoreboardId@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    ScoreboardId,
    null,
    Scoreboard,
    CxxString,
);

const Scoreboard$createActorScoreboardId = procHacker.jsv(
    "??_7ServerScoreboard@@6B@",
    "?createScoreboardId@ServerScoreboard@@UEAAAEBUScoreboardId@@AEBVActor@@@Z",
    ScoreboardId,
    { this: Scoreboard },
    Actor,
);
const Scoreboard$createPlayerScoreboardId = procHacker.jsv(
    "??_7ServerScoreboard@@6B@",
    "?createScoreboardId@ServerScoreboard@@UEAAAEBUScoreboardId@@AEBVPlayer@@@Z",
    ScoreboardId,
    { this: Scoreboard },
    Player,
);

Scoreboard.prototype.getActorScoreboardId = function (target) {
    const id = Scoreboard$getActorScoreboardId(this, target);
    if (id.id === bin64_t.minus_one) {
        return Scoreboard$createActorScoreboardId.call(this, target);
    }
    return id;
};
Scoreboard.prototype.getPlayerScoreboardId = function (target) {
    const id = Scoreboard$getPlayerScoreboardId(this, target);
    if (id.id === bin64_t.minus_one) {
        return Scoreboard$createPlayerScoreboardId.call(this, target);
    }
    return id;
};
Scoreboard.prototype.getFakePlayerScoreboardId = function (target) {
    const id = Scoreboard$getFakePlayerScoreboardId(this, target);
    if (id.id === bin64_t.minus_one) {
        return this.createScoreboardId(target);
    }
    return id;
};

Scoreboard.prototype.getScoreboardIdentityRef = procHacker.js(
    "?getScoreboardIdentityRef@Scoreboard@@QEAAPEAVScoreboardIdentityRef@@AEBUScoreboardId@@@Z",
    ScoreboardIdentityRef,
    { this: Scoreboard },
    ScoreboardId,
);
(Scoreboard.prototype as any)._getScoreboardIdentityRefs = procHacker.js(
    "?getScoreboardIdentityRefs@Scoreboard@@QEBA?AV?$vector@VScoreboardIdentityRef@@V?$allocator@VScoreboardIdentityRef@@@std@@@std@@XZ",
    CxxVector$ScoreboardIdentityRef,
    { this: Scoreboard },
    CxxVector$ScoreboardIdentityRef,
);
(Scoreboard.prototype as any)._getTrackedIds = procHacker.js(
    "?getTrackedIds@Scoreboard@@QEBA?AV?$vector@UScoreboardId@@V?$allocator@UScoreboardId@@@std@@@std@@XZ",
    CxxVector$ScoreboardId,
    { this: Scoreboard },
    CxxVector$ScoreboardId,
);
Scoreboard.prototype.removeObjective = procHacker.js("?removeObjective@Scoreboard@@QEAA_NPEAVObjective@@@Z", bool_t, { this: Scoreboard }, Objective);
Scoreboard.prototype.resetPlayerScore = procHacker.js(
    "?resetPlayerScore@Scoreboard@@QEAA_NAEBUScoreboardId@@AEAVObjective@@@Z",
    bool_t,
    { this: Scoreboard },
    ScoreboardId,
    Objective,
);
Scoreboard.prototype.sync = procHacker.js(
    "?onScoreChanged@ServerScoreboard@@UEAAXAEBUScoreboardId@@AEBVObjective@@@Z",
    void_t,
    { this: Scoreboard },
    ScoreboardId,
    Objective,
);

const Objective$getPlayers = procHacker.js(
    "?getPlayers@Objective@@QEBA?AV?$vector@UScoreboardId@@V?$allocator@UScoreboardId@@@std@@@std@@XZ",
    CxxVector$ScoreboardId,
    { this: Objective, structureReturn: true },
);
Objective.prototype.getPlayers = function () {
    const ids: CxxVector<ScoreboardId> = Objective$getPlayers.call(this);
    const res = ids.toArray();
    ids.destruct();
    return res;
};
Objective.prototype.getPlayerScore = procHacker.js(
    "?getPlayerScore@Objective@@QEBA?AUScoreInfo@@AEBUScoreboardId@@@Z",
    ScoreInfo,
    { this: Objective, structureReturn: true },
    ScoreboardId,
);
Objective.prototype.getName = procHacker.js("?getName@Objective@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Objective,
});
Objective.prototype.getDisplayName = procHacker.js("?getDisplayName@Objective@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ", CxxString, {
    this: Objective,
});

IdentityDefinition.prototype.isPlayerType = procHacker.js("?getScoreboardId@ScoreboardIdentityRef@@QEBAAEBUScoreboardId@@XZ", bool_t, {
    this: IdentityDefinition,
});
IdentityDefinition.prototype.getEntityId = procHacker.js("?getEntityId@IdentityDefinition@@QEBAAEBUActorUniqueID@@XZ", ActorUniqueID.ref(), {
    this: IdentityDefinition,
});
IdentityDefinition.prototype.getPlayerId = procHacker.js("?getPlayerId@IdentityDefinition@@QEBAAEBUPlayerScoreboardId@@XZ", ActorUniqueID.ref(), {
    this: IdentityDefinition,
});
IdentityDefinition.prototype.getFakePlayerName = procHacker.js(
    "?getFakePlayerName@IdentityDefinition@@QEBAAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: IdentityDefinition },
);
IdentityDefinition.prototype.getIdentityType = procHacker.js("?getIdentityType@IdentityDefinition@@QEBA?AW4Type@1@XZ", uint8_t, { this: IdentityDefinition });

// The 2024 body is one comparison: `this->id != ScoreboardId::INVALID.id`, and
// that object's first eight bytes are 0xffffffffffffffff (it ships in
// symbols.json as a constant, docs/findings-layouts.md). Two statements of the
// same fact, so the comparison is written against the constant itself.
ScoreboardId.prototype.isValid = derived(
    "?isValid@ScoreboardId@@QEBA_NXZ",
    function isValid(this: ScoreboardId): boolean {
        return this.id !== ScoreboardId.INVALID.id;
    },
    () => procHacker.js("?isValid@ScoreboardId@@QEBA_NXZ", bool_t, { this: ScoreboardId }),
);

(ScoreboardIdentityRef.prototype as any)._modifyScoreInObjective = procHacker.js(
    "?modifyScoreInObjective@ScoreboardIdentityRef@@QEAA_NAEAHAEAVObjective@@HW4PlayerScoreSetFunction@@@Z",
    bool_t,
    { this: ScoreboardIdentityRef },
    StaticPointer,
    Objective,
    int32_t,
    uint8_t,
);
ScoreboardIdentityRef.prototype.getIdentityType = procHacker.js("?getIdentityType@ScoreboardIdentityRef@@QEBA?AW4Type@IdentityDefinition@@XZ", uint8_t, {
    this: ScoreboardIdentityRef,
});
ScoreboardIdentityRef.prototype.getEntityId = procHacker.js("?getEntityId@ScoreboardIdentityRef@@QEBAAEBUActorUniqueID@@XZ", ActorUniqueID.ref(), {
    this: ScoreboardIdentityRef,
});
ScoreboardIdentityRef.prototype.getPlayerId = procHacker.js("?getPlayerId@ScoreboardIdentityRef@@QEBAAEBUPlayerScoreboardId@@XZ", ActorUniqueID.ref(), {
    this: ScoreboardIdentityRef,
});
ScoreboardIdentityRef.prototype.getScoreboardId = procHacker.js("?getScoreboardId@ScoreboardIdentityRef@@QEBAAEBUScoreboardId@@XZ", ScoreboardId, {
    this: ScoreboardIdentityRef,
});
ScoreboardIdentityRef.prototype.isPlayerType = function () {
    let iddef = (this as any as StaticPointer).getPointerAs(IdentityDefinition, 0x10);
    if (iddef === null) iddef = IdentityDefinition.Invalid;
    return iddef.isPlayerType();
};

// effects.ts
MobEffect.create = procHacker.js("?getById@MobEffect@@SAPEAV1@I@Z", MobEffect, null, int32_t);
MobEffect.prototype.getId = procHacker.js("?getId@MobEffect@@QEBAIXZ", uint32_t, { this: MobEffect });

(MobEffectInstance.prototype as any)._create = procHacker.js(
    "??0MobEffectInstance@@QEAA@IHH_N00@Z",
    void_t,
    { this: MobEffectInstance },
    uint32_t,
    int32_t,
    int32_t,
    bool_t,
    bool_t,
    bool_t,
);
(MobEffectInstance.prototype as any)._getComponentName = procHacker.js("?getComponentName@MobEffectInstance@@QEBAAEBVHashedString@@XZ", HashedString, {
    this: MobEffectInstance,
});
MobEffectInstance.prototype.getAmplifier = procHacker.js("?getAmplifier@MobEffectInstance@@QEBAHXZ", int32_t, { this: MobEffectInstance });
MobEffectInstance.prototype.allocateAndSave = procHacker.js(
    "?save@MobEffectInstance@@QEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@XZ",
    CompoundTag.ref(),
    { this: MobEffectInstance, structureReturn: true },
);
const MobEffectInstance$load = procHacker.js("?load@MobEffectInstance@@SA?AV1@AEBVCompoundTag@@@Z", void_t, null, MobEffectInstance, CompoundTag);
MobEffectInstance.prototype.load = function (tag) {
    if (tag instanceof Tag) {
        MobEffectInstance$load(this, tag);
    } else {
        const allocated = NBT.allocate(tag);
        MobEffectInstance$load(this, allocated as CompoundTag);
        allocated.dispose();
    }
};
MobEffectInstance.load = function (tag) {
    const inst = new MobEffectInstance(true);
    inst.load(tag);
    return inst;
};

// enchants.ts
EnchantUtils.applyEnchant = procHacker.js(
    "?applyEnchant@EnchantUtils@@SA_NAEAVItemStackBase@@W4Type@Enchant@@H_N@Z",
    bool_t,
    null,
    ItemStack,
    int16_t,
    int32_t,
    bool_t,
);
EnchantUtils.getEnchantLevel = procHacker.js("?getEnchantLevel@EnchantUtils@@SAHW4Type@Enchant@@AEBVItemStackBase@@@Z", int32_t, null, uint8_t, ItemStack);
EnchantUtils.hasCurse = procHacker.js("?hasCurse@EnchantUtils@@SA_NAEBVItemStackBase@@@Z", bool_t, null, ItemStack);
EnchantUtils.hasEnchant = procHacker.js("?hasEnchant@EnchantUtils@@SA_NW4Type@Enchant@@AEBVItemStackBase@@@Z", bool_t, null, int16_t, ItemStack);

// nbt.ts
const tagTypes: NativeClassType<Tag>[] = [
    EndTag,
    ByteTag,
    ShortTag,
    IntTag,
    Int64Tag,
    FloatTag,
    DoubleTag,
    ByteArrayTag,
    StringTag,
    ListTag,
    CompoundTag,
    IntArrayTag,
];
Tag.setResolver(ptr => {
    if (ptr === null) return null;
    const typeId = Tag.prototype.getId.call(ptr);
    const type = tagTypes[typeId];
    if (type == null) {
        throw Error(`Invalid Tag.getId(): ${typeId}`);
    }
    return ptr.as(type);
});

Tag.prototype.toString = procHacker.jsv(
    "??_7CompoundTag@@6B@",
    "?toString@CompoundTag@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxString,
    { this: Tag, structureReturn: true },
);
Tag.prototype.getId = procHacker.jsv("??_7CompoundTag@@6B@", "?getId@CompoundTag@@UEBA?AW4Type@Tag@@XZ", uint8_t, { this: Tag });
Tag.prototype.equals = procHacker.jsv("??_7CompoundTag@@6B@", "?equals@CompoundTag@@UEBA_NAEBVTag@@@Z", bool_t, { this: Tag }, Tag);

const EndTag$vftable = proc["??_7EndTag@@6B@"];
const ByteTag$vftable = proc["??_7ByteTag@@6B@"];
const ShortTag$vftable = proc["??_7ShortTag@@6B@"];
const IntTag$vftable = proc["??_7IntTag@@6B@"];
const Int64Tag$vftable = proc["??_7Int64Tag@@6B@"];
const FloatTag$vftable = proc["??_7FloatTag@@6B@"];
const DoubleTag$vftable = proc["??_7DoubleTag@@6B@"];
const ByteArrayTag$vftable = proc["??_7ByteArrayTag@@6B@"];
const StringTag$vftable = proc["??_7StringTag@@6B@"];

EndTag.prototype[NativeType.ctor] = function () {
    this.vftable = EndTag$vftable;
};
ByteTag.prototype[NativeType.ctor] = function () {
    this.vftable = ByteTag$vftable;
};
ShortTag.prototype[NativeType.ctor] = function () {
    this.vftable = ShortTag$vftable;
};
IntTag.prototype[NativeType.ctor] = function () {
    this.vftable = IntTag$vftable;
};
Int64Tag.prototype[NativeType.ctor] = function () {
    this.vftable = Int64Tag$vftable;
};
FloatTag.prototype[NativeType.ctor] = function () {
    this.vftable = FloatTag$vftable;
};
DoubleTag.prototype[NativeType.ctor] = function () {
    this.vftable = DoubleTag$vftable;
};
ByteArrayTag.prototype[NativeType.ctor] = function () {
    this.vftable = ByteArrayTag$vftable;
    this.data.construct();
};
ByteArrayTag.prototype.constructWith = function (data: Uint8Array): void {
    this.vftable = ByteArrayTag$vftable;
    this.data.construct();
    this.data.setFromTypedArray(data);
};
const StringTagDataOffset = StringTag.offsetOf("data");
StringTag.prototype[NativeType.ctor] = function () {
    this.vftable = StringTag$vftable;
    CxxString[NativeType.ctor](this.add(StringTagDataOffset));
};
ListTag.prototype[NativeType.ctor] = procHacker.js("??0ListTag@@QEAA@XZ", void_t, { this: ListTag });
ListTag.prototype[NativeType.dtor] = procHacker.js("??1ListTag@@UEAA@XZ", void_t, { this: ListTag });
const ListTag$add = procHacker.js("?add@ListTag@@QEAAXV?$unique_ptr@VTag@@U?$default_delete@VTag@@@std@@@std@@@Z", void_t, null, ListTag, TagPointer);
ListTag.prototype.pushAllocated = function (tag: Tag): void_t {
    ListTag$add(this, TagPointer.create(tag));
};
ListTag.prototype.size = procHacker.js("?size@ListTag@@QEBAHXZ", int64_as_float_t, { this: ListTag });

CompoundTag.prototype[NativeType.ctor] = procHacker.js("??0CompoundTag@@QEAA@XZ", void_t, { this: CompoundTag });
CompoundTag.prototype[NativeType.dtor] = procHacker.js("??1CompoundTag@@UEAA@XZ", void_t, { this: CompoundTag });
CompoundTag.prototype[NativeType.ctor_move] = procHacker.js("??0CompoundTag@@QEAA@$$QEAV0@@Z", void_t, { this: CompoundTag }, CompoundTag);
CompoundTag.prototype.get = procHacker.js(
    "?get@CompoundTag@@QEAAPEAVTag@@V?$basic_string_view@DU?$char_traits@D@std@@@std@@@Z",
    Tag,
    { this: CompoundTag },
    CxxStringView,
) as any;
const CompoundTag$put = procHacker.js(
    "?put@CompoundTag@@QEAAPEAVTag@@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$unique_ptr@VTag@@U?$default_delete@VTag@@@std@@@4@@Z",
    void_t,
    null,
    CompoundTag,
    CxxStringWrapper,
    TagPointer,
);
CompoundTag.prototype.setAllocated = function (key, value) {
    CompoundTag$put(this, CxxStringWrapper.constructWith(key), TagPointer.create(value)); // `key` and `value` will be moved into the CompoundTag. no need to destruct them
};
CompoundTag.prototype.delete = procHacker.js(
    "?remove@CompoundTag@@QEAA_NV?$basic_string_view@DU?$char_traits@D@std@@@std@@@Z",
    bool_t,
    { this: CompoundTag },
    CxxStringView,
);
CompoundTag.prototype.has = procHacker.js(
    "?contains@CompoundTag@@QEBA_NV?$basic_string_view@DU?$char_traits@D@std@@@std@@@Z",
    bool_t,
    { this: CompoundTag },
    CxxStringView,
);
CompoundTag.prototype.clear = procHacker.js("?clear@CompoundTag@@QEAAXXZ", void_t, { this: CompoundTag });

CompoundTagVariant.prototype[NativeType.ctor] = function (): void {
    // init as a EndTag

    const ptr = this as any as StaticPointer;
    ptr.setPointer(EndTag$vftable, 0); // set the value as a EndTag
    ptr.setUint8(0, 0x28); // the type index of the std::variant<...>, 0 is the EndTag
};
CompoundTagVariant.prototype[NativeType.dtor] = procHacker.js("??1CompoundTagVariant@@QEAA@XZ", void_t, { this: CompoundTagVariant });
CompoundTagVariant.prototype.emplace = procHacker.js("?emplace@CompoundTagVariant@@QEAAAEAVTag@@$$QEAV2@@Z", void_t, { this: CompoundTagVariant }, Tag);

// structure.ts
StructureSettings.prototype[NativeType.ctor] = procHacker.js("??0StructureSettings@@QEAA@XZ", void_t, { this: StructureSettings });
StructureSettings.constructWith = function (size: BlockPos, ignoreEntities: boolean = false, ignoreBlocks: boolean = false): StructureSettings {
    const settings = StructureSettings.construct();
    settings.setStructureSize(size);
    settings.setStructureOffset(BlockPos.create(0, 0, 0));
    settings.setIgnoreEntities(ignoreEntities);
    settings.setIgnoreBlocks(ignoreBlocks);
    return settings;
};
StructureSettings.prototype[NativeType.dtor] = procHacker.js("??1StructureSettings@@QEAA@XZ", void_t, { this: StructureSettings });
// deleted
// StructureSettings.prototype.getIgnoreBlocks = procHacker.js("?getIgnoreBlocks@StructureSettings@@QEBA_NXZ", bool_t, { this: StructureSettings });
// StructureSettings.prototype.getIgnoreEntities = procHacker.js("?getIgnoreEntities@StructureSettings@@QEBA_NXZ", bool_t, { this: StructureSettings });
StructureSettings.prototype.isAnimated = procHacker.js("?isAnimated@StructureSettings@@QEBA_NXZ", bool_t, { this: StructureSettings });
// StructureSettings.prototype.getStructureOffset = procHacker.js("?getStructureOffset@StructureSettings@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: StructureSettings });
// StructureSettings.prototype.getStructureSize = procHacker.js("?getStructureSize@StructureSettings@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: StructureSettings });
// StructureSettings.prototype.getPivot = procHacker.js("?getPivot@StructureSettings@@QEBAAEBVVec3@@XZ", Vec3, { this: StructureSettings });
// StructureSettings.prototype.getAnimationMode = procHacker.js("?getAnimationMode@StructureSettings@@QEBA?AW4AnimationMode@@XZ", uint8_t, { this: StructureSettings });
// StructureSettings.prototype.getMirror = procHacker.js("?getMirror@StructureSettings@@QEBA?AW4Mirror@@XZ", uint32_t, { this: StructureSettings });
// StructureSettings.prototype.getRotation = procHacker.js("?getRotation@StructureSettings@@QEBA?AW4Rotation@@XZ", uint32_t, { this: StructureSettings });
// StructureSettings.prototype.getAnimationSeconds = procHacker.js("?getAnimationSeconds@StructureSettings@@QEBAMXZ", float32_t, { this: StructureSettings });
// StructureSettings.prototype.getIntegrityValue = procHacker.js("?getIntegrityValue@StructureSettings@@QEBAMXZ", float32_t, { this: StructureSettings });
StructureSettings.prototype.getAnimationTicks = procHacker.js("?getAnimationTicks@StructureSettings@@QEBAIXZ", uint32_t, { this: StructureSettings });
// StructureSettings.prototype.getIntegritySeed = procHacker.js("?getIntegritySeed@StructureSettings@@QEBAIXZ", float32_t, { this: StructureSettings });
// StructureSettings.prototype.setAnimationMode = procHacker.js(
//     "?setAnimationMode@StructureSettings@@QEAAXW4AnimationMode@@@Z",
//     void_t,
//     { this: StructureSettings },
//     uint8_t,
// );
// StructureSettings.prototype.setAnimationSeconds = procHacker.js("?setAnimationSeconds@StructureSettings@@QEAAXM@Z", void_t, { this: StructureSettings }, float32_t);
StructureSettings.prototype.setIgnoreBlocks = procHacker.js("?setIgnoreBlocks@StructureSettings@@QEAAX_N@Z", void_t, { this: StructureSettings }, bool_t);
StructureSettings.prototype.setIgnoreEntities = procHacker.js("?setIgnoreEntities@StructureSettings@@QEAAX_N@Z", void_t, { this: StructureSettings }, bool_t);
StructureSettings.prototype.setIgnoreJigsawBlocks = procHacker.js(
    "?setIgnoreJigsawBlocks@StructureSettings@@QEAAX_N@Z",
    void_t,
    { this: StructureSettings },
    bool_t,
);
StructureSettings.prototype.setIntegritySeed = procHacker.js("?setIntegritySeed@StructureSettings@@QEAAXI@Z", void_t, { this: StructureSettings }, float32_t);
// StructureSettings.prototype.setIntegrityValue = procHacker.js("?setIntegrityValue@StructureSettings@@QEAAXM@Z", void_t, { this: StructureSettings }, float32_t);
StructureSettings.prototype.setMirror = procHacker.js("?setMirror@StructureSettings@@QEAAXW4Mirror@@@Z", void_t, { this: StructureSettings }, uint8_t);
// StructureSettings.prototype.setPaletteName = procHacker.js(
//     "?setPaletteName@StructureSettings@@QEAAXV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
//     void_t,
//     { this: StructureSettings },
//     CxxString,
// );
// StructureSettings.prototype.setPivot = procHacker.js("?setPivot@StructureSettings@@QEAAXAEBVVec3@@@Z", void_t, { this: StructureSettings }, Vec3);
StructureSettings.prototype.setReloadActorEquipment = procHacker.js(
    "?setReloadActorEquipment@StructureSettings@@QEAAX_N@Z",
    void_t,
    { this: StructureSettings },
    bool_t,
);
StructureSettings.prototype.setRotation = procHacker.js("?setRotation@StructureSettings@@QEAAXW4Rotation@@@Z", void_t, { this: StructureSettings }, uint8_t);
StructureSettings.prototype.setStructureOffset = procHacker.js(
    "?setStructureOffset@StructureSettings@@QEAAXAEBVBlockPos@@@Z",
    void_t,
    { this: StructureSettings },
    BlockPos,
);
StructureSettings.prototype.setStructureSize = procHacker.js(
    "?setStructureSize@StructureSettings@@QEAAXAEBVBlockPos@@@Z",
    void_t,
    { this: StructureSettings },
    BlockPos,
);
StructureTemplateData.prototype.allocateAndSave = procHacker.js(
    "?save@StructureTemplateData@@QEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@XZ",
    CompoundTag.ref(),
    { this: StructureTemplate, structureReturn: true },
);
const StructureTemplateData$load = procHacker.js("?load@StructureTemplateData@@QEAA_NAEBVCompoundTag@@@Z", bool_t, null, StructureTemplateData, CompoundTag);
StructureTemplateData.prototype.load = function (tag) {
    if (tag instanceof Tag) {
        return StructureTemplateData$load(this, tag);
    } else {
        const allocated = NBT.allocate(tag);
        const res = StructureTemplateData$load(this, allocated as CompoundTag);
        allocated.dispose();
        return res;
    }
};
StructureTemplate.prototype.fillFromWorld = procHacker.js(
    "?fillFromWorld@StructureTemplate@@QEAAXAEAVBlockSource@@AEBVBlockPos@@AEBVStructureSettings@@@Z",
    void_t,
    { this: StructureTemplate },
    BlockSource,
    BlockPos,
    StructureSettings,
);
StructureTemplate.prototype.placeInWorld = procHacker.js(
    "?placeInWorld@StructureTemplate@@QEBAXAEAVBlockSource@@AEBVBlockPalette@@AEBVBlockPos@@AEBVStructureSettings@@PEAVStructureTelemetryServerData@@_N@Z",
    void_t,
    { this: StructureTemplate },
    BlockSource,
    BlockPalette,
    BlockPos,
    StructureSettings,
);
StructureTemplate.prototype.tryGetBlockAtPos = procHacker.js(
    "?tryGetBlockAtPos@StructureTemplate@@QEBAPEBVBlock@@AEBVBlockPos@@@Z",
    Block,
    { this: StructureTemplate },
    BlockPos,
);
StructureTemplate.prototype.getSize = procHacker.js("?getSize@StructureTemplate@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: StructureTemplate });
StructureTemplate.prototype.allocateAndSave = procHacker.js(
    "?save@StructureTemplate@@QEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@XZ",
    CompoundTag.ref(),
    { this: StructureTemplate, structureReturn: true },
);
StructureManager.prototype.getOrCreate = procHacker.js(
    "?getOrCreate@StructureManager@@QEAAAEAVStructureTemplate@@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    StructureTemplate,
    { this: StructureManager },
    CxxString,
);
// components.ts
OnHitSubcomponent.prototype.readfromJSON = procHacker.jsv(
    "??_7FreezeOnHitSubcomponent@@6B@",
    "?readfromJSON@FreezeOnHitSubcomponent@@UEAAXAEAVValue@Json@@AEBVSemVersion@@@Z",
    void_t,
    { this: OnHitSubcomponent },
    JsonValue,
);
OnHitSubcomponent.prototype.writetoJSON = procHacker.jsv(
    "??_7FreezeOnHitSubcomponent@@6B@",
    "?writetoJSON@FreezeOnHitSubcomponent@@UEBAXAEAVValue@Json@@@Z",
    void_t,
    { this: OnHitSubcomponent },
    JsonValue,
);
(OnHitSubcomponent.prototype as any)._getName = procHacker.jsv("??_7FreezeOnHitSubcomponent@@6B@", "?getName@FreezeOnHitSubcomponent@@UEAAPEBDXZ", StaticPointer, {
    this: OnHitSubcomponent,
});

HitResult.prototype.getEntity = procHacker.js("?getEntity@HitResult@@QEBAPEAVActor@@XZ", Actor, { this: HitResult });

// chunk.ts
LevelChunk.prototype.getBiome = procHacker.js("?getBiome@LevelChunk@@QEBAAEBVBiome@@AEBVChunkBlockPos@@@Z", Biome, { this: LevelChunk }, ChunkBlockPos);
LevelChunk.prototype.getLevel = procHacker.js("?getLevel@LevelChunk@@QEBAAEAVLevel@@XZ", Level, { this: LevelChunk });
LevelChunk.prototype.getPosition = procHacker.js("?getPosition@LevelChunk@@QEBAAEBVChunkPos@@XZ", ChunkPos, { this: LevelChunk });
LevelChunk.prototype.getMin = procHacker.js("?getMin@LevelChunk@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: LevelChunk });
LevelChunk.prototype.getMax = procHacker.js("?getMax@LevelChunk@@QEBAAEBVBlockPos@@XZ", BlockPos, { this: LevelChunk });
LevelChunk.prototype.isFullyLoaded = procHacker.js("?isFullyLoaded@LevelChunk@@QEBA_NXZ", bool_t, { this: LevelChunk });
LevelChunk.prototype.toWorldPos = procHacker.js(
    "?toWorldPos@LevelChunk@@QEBA?AVBlockPos@@AEBVChunkBlockPos@@@Z",
    BlockPos,
    { this: LevelChunk, structureReturn: true },
    ChunkPos,
);
LevelChunk.prototype.getEntity = procHacker.js("?getEntity@LevelChunk@@QEBAPEAVActor@@AEBUActorUniqueID@@@Z", Actor, { this: LevelChunk }, ActorUniqueID.ref());
// std::vector<WeakEntityRef>& LevelChunk::getChunkEntities();
LevelChunk.prototype.getChunkEntities = procHacker.js(
    "?getChunkEntities@LevelChunk@@QEAAAEAV?$vector@VWeakEntityRef@@V?$allocator@VWeakEntityRef@@@std@@@std@@XZ",
    CxxVectorToArray.make(WeakEntityRef),
    { this: LevelChunk },
);

ChunkSource.prototype.getLevel = procHacker.js("?getLevel@ChunkSource@@QEBAAEAVLevel@@XZ", Level, { this: ChunkSource });
ChunkSource.prototype.isChunkKnown = procHacker.jsv(
    "??_7ChunkSource@@6B@",
    "?isChunkKnown@ChunkSource@@UEAA_NAEBVChunkPos@@@Z",
    bool_t,
    { this: ChunkSource },
    ChunkPos,
);
ChunkSource.prototype.isChunkSaved = procHacker.js("?isChunkSaved@ChunkSource@@UEAA_NAEBVChunkPos@@@Z", bool_t, { this: ChunkSource }, ChunkPos);
ChunkSource.prototype.isWithinWorldLimit = procHacker.jsv(
    "??_7WorldLimitChunkSource@@6B@",
    "?isWithinWorldLimit@WorldLimitChunkSource@@UEBA_NAEBVChunkPos@@@Z",
    bool_t,
    { this: ChunkSource },
    ChunkPos,
);
ChunkSource.prototype.isShutdownDone = procHacker.js("?isShutdownDone@ChunkSource@@UEAA_NXZ", bool_t, { this: ChunkSource });

// origin.ts
VirtualCommandOrigin.allocateWith = function (origin: CommandOrigin, actor: Actor, cmdPos: CommandPositionFloat): VirtualCommandOrigin {
    const out = capi.malloc(VirtualCommandOrigin[NativeType.size]).as(VirtualCommandOrigin);
    VirtualCommandOrigin$VirtualCommandOrigin(out, origin, actor, cmdPos, CommandVersion.CurrentVersion);
    return out;
};
VirtualCommandOrigin.constructWith = function (origin: CommandOrigin, actor: Actor, cmdPos: CommandPositionFloat): VirtualCommandOrigin {
    const out = new VirtualCommandOrigin(true);
    VirtualCommandOrigin$VirtualCommandOrigin(out, origin, actor, cmdPos, CommandVersion.CurrentVersion);
    return out;
};

// biome.ts
Biome.prototype.getBiomeType = procHacker.js("?getBiomeType@Biome@@QEBA?AW4VanillaBiomeTypes@@XZ", uint32_t, { this: Biome });

// item_component.ts
const itemComponents = new Map<bin64_t, new () => ItemComponent>([
    [proc["??_7CooldownItemComponent@@6B@"].getAddressBin(), CooldownItemComponent], // CooldownItemComponent$vftable
    [proc["??_7ArmorItemComponent@@6B@"].getAddressBin(), ArmorItemComponent], // ArmorItemComponent$vftable
    [proc["??_7DurabilityItemComponent@@6B@"].getAddressBin(), DurabilityItemComponent], // DurabilityItemComponent$vftable
    [proc["??_7DiggerItemComponent@@6B@"].getAddressBin(), DiggerItemComponent], // DiggerItemComponent$vftable
    [proc["??_7DisplayNameItemComponent@@6B@"].getAddressBin(), DisplayNameItemComponent], // DisplayNameItemComponent$vftable
    // XXX: removed
    // [proc["??_7DyePowderItemComponent@@6B@"].getAddressBin(), DyePowderItemComponent], // DyePowderItemComponent$vftable
    [proc["??_7EntityPlacerItemComponent@@6B@"].getAddressBin(), EntityPlacerItemComponent], // EntityPlacerItemComponent$vftable
    [proc["??_7FoodItemComponent@@6B?$NetworkedItemComponent@VFoodItemComponent@@@@@"].getAddressBin(), FoodItemComponent], // FoodItemComponent$vftable
    [proc["??_7FuelItemComponent@@6B@"].getAddressBin(), FuelItemComponent], // FuelItemComponent$vftable
    [proc["??_7IconItemComponent@@6B@"].getAddressBin(), IconItemComponent], // IconItemComponent$vftable
    // XXX: removed
    // [proc["??_7KnockbackResistanceItemComponent@@6B@"].getAddressBin(), KnockbackResistanceItemComponent], // KnockbackResistanceItemComponent$vftable
    [proc["??_7OnUseItemComponent@@6B@"].getAddressBin(), OnUseItemComponent], // OnUseItemComponent$vftable
    [proc["??_7PlanterItemComponent@@6B@"].getAddressBin(), PlanterItemComponent], // PlanterItemComponent$vftable
    [proc["??_7ProjectileItemComponent@@6B@"].getAddressBin(), ProjectileItemComponent], // ProjectileItemComponent$vftable
    [proc["??_7RecordItemComponent@@6B@"].getAddressBin(), RecordItemComponent], // RecordItemComponent$vftable
    [proc["??_7RenderOffsetsItemComponent@@6B@"].getAddressBin(), RenderOffsetsItemComponent], // RenderOffsetsItemComponent$vftable
    [proc["??_7RepairableItemComponent@@6B@"].getAddressBin(), RepairableItemComponent], // RepairableItemComponent$vftable
    [proc["??_7ShooterItemComponent@@6B@"].getAddressBin(), ShooterItemComponent], // ShooterItemComponent$vftable
    [proc["??_7ThrowableItemComponent@@6B@"].getAddressBin(), ThrowableItemComponent], // ThrowableItemComponent$vftable
    [proc["??_7WeaponItemComponent@@6B@"].getAddressBin(), WeaponItemComponent], // WeaponItemComponent$vftable
    [proc["??_7WearableItemComponent@@6B@"].getAddressBin(), WearableItemComponent], // WearableItemComponent$vftable
]);

ItemComponent.setResolver(ptr => {
    if (ptr === null) return null;
    const vftable = ptr.getBin64();
    const cls = itemComponents.get(vftable);
    return ptr.as(cls || ItemComponent);
});

const ItemComponent$buildNetworkTag = procHacker.jsv(
    "??_7ItemComponent@@6B@",
    "?buildNetworkTag@ItemComponent@@UEBA?AV?$unique_ptr@VCompoundTag@@U?$default_delete@VCompoundTag@@@std@@@std@@AEBUReflectionCtx@cereal@@@Z",
    CompoundTag.ref(),
    { this: ItemComponent, structureReturn: true },
    cereal.ReflectionCtx,
);
ItemComponent.prototype.buildNetworkTag = function (u = new cereal.ReflectionCtx(true)) {
    return ItemComponent$buildNetworkTag.call(this, u);
};
const ItemComponent$initializeFromNetwork = procHacker.jsv(
    "??_7InteractButtonItemComponent@@6B@",
    "?initializeFromNetwork@InteractButtonItemComponent@@UEAA_NAEBVCompoundTag@@AEBUReflectionCtx@cereal@@@Z",
    bool_t,
    { this: ItemComponent },
    CompoundTag,
    cereal.ReflectionCtx,
);
ItemComponent.prototype.initializeFromNetwork = function (tag, u = new cereal.ReflectionCtx(true)) {
    return ItemComponent$initializeFromNetwork.call(this, tag, u);
};

CooldownItemComponent.getIdentifier = procHacker.js("?getIdentifier@CooldownItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
ArmorItemComponent.getIdentifier = procHacker.js("?getIdentifier@ArmorItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
DurabilityItemComponent.getIdentifier = procHacker.js("?getIdentifier@DurabilityItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
DiggerItemComponent.getIdentifier = procHacker.js("?getIdentifier@DiggerItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
DisplayNameItemComponent.getIdentifier = procHacker.js("?getIdentifier@DisplayNameItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
// XXX: removed
// DyePowderItemComponent.getIdentifier = procHacker.js("?getIdentifier@DyePowderItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
EntityPlacerItemComponent.getIdentifier = procHacker.js("?getIdentifier@EntityPlacerItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
FoodItemComponent.getIdentifier = procHacker.js("?getIdentifier@FoodItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
FuelItemComponent.getIdentifier = procHacker.js("?getIdentifier@FuelItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
IconItemComponent.getIdentifier = procHacker.js("?getIdentifier@IconItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
// XXX: removed
// KnockbackResistanceItemComponent.getIdentifier = procHacker.js("?getIdentifier@KnockbackResistanceItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
OnUseItemComponent.getIdentifier = procHacker.js("?getIdentifier@OnUseItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
PlanterItemComponent.getIdentifier = procHacker.js("?getIdentifier@PlanterItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
ProjectileItemComponent.getIdentifier = procHacker.js("?getIdentifier@ProjectileItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
RecordItemComponent.getIdentifier = procHacker.js("?getIdentifier@RecordItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
RenderOffsetsItemComponent.getIdentifier = procHacker.js("?getIdentifier@RenderOffsetsItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
RepairableItemComponent.getIdentifier = procHacker.js("?getIdentifier@RepairableItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
ShooterItemComponent.getIdentifier = procHacker.js("?getIdentifier@ShooterItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
ThrowableItemComponent.getIdentifier = procHacker.js("?getIdentifier@ThrowableItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
WeaponItemComponent.getIdentifier = procHacker.js("?getIdentifier@WeaponItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);
WearableItemComponent.getIdentifier = procHacker.js("?getIdentifier@WearableItemComponent@@SAAEBVHashedString@@XZ", HashedString, null);

// XXX: removed
// DiggerItemComponent.prototype.mineBlock = procHacker.js(
//     "?mineBlock@DiggerItemComponent@@QEAA_NAEAVItemStack@@AEBVBlock@@HHHPEAVActor@@@Z",
//     bool_t,
//     { this: DiggerItemComponent },
//     ItemStack,
//     Block,
//     int32_t,
//     int32_t,
//     int32_t,
//     Actor,
// );
// TODO: removed method, need to implement
// EntityPlacerItemComponent.prototype.positionAndRotateActor = procHacker.js(
//     "?_positionAndRotateActor@EntityPlacerItemComponent@@AEBAXAEAVActor@@VVec3@@EAEBV3@PEBVBlockLegacy@@@Z",
//     void_t,
//     { this: EntityPlacerItemComponent },
//     Actor,
//     Vec3,
//     int8_t,
//     Vec3,
//     BlockLegacy,
// );
EntityPlacerItemComponent.prototype.setActorCustomName = procHacker.js(
    "?_setActorCustomName@EntityPlacerItemComponent@@AEBAXAEAVActor@@AEBVItemStack@@@Z",
    void_t,
    { this: EntityPlacerItemComponent },
    Actor,
    ItemStack,
);
FoodItemComponent.prototype.canAlwaysEat = procHacker.js("?canAlwaysEat@FoodItemComponent@@UEBA_NXZ", bool_t, { this: FoodItemComponent });
FoodItemComponent.prototype.getUsingConvertsToItemDescriptor = procHacker.js(
    "?getUsingConvertsToItemDescriptor@FoodItemComponent@@QEBA?AVItemDescriptor@@XZ",
    ItemDescriptor,
    { this: FoodItemComponent },
);
// XXX: removed
// KnockbackResistanceItemComponent.prototype.getProtectionValue = procHacker.js("?getProtectionValue@KnockbackResistanceItemComponent@@QEBAMXZ", float32_t, {
//     this: KnockbackResistanceItemComponent,
// });
ProjectileItemComponent.prototype.getShootDir = procHacker.js(
    "?getShootDir@ProjectileItemComponent@@QEBA?AVVec3@@AEBVPlayer@@M@Z",
    Vec3,
    { this: ProjectileItemComponent },
    Player,
    float32_t,
);
ProjectileItemComponent.prototype.shootProjectile = procHacker.js(
    "?shootProjectile@ProjectileItemComponent@@QEBAPEAVActor@@AEAVBlockSource@@AEBVVec3@@1MPEAVPlayer@@@Z",
    Actor,
    { this: ProjectileItemComponent },
    BlockSource,
    Vec3,
    Vec3,
    float32_t,
    Player,
);
// TODO: removed, reimplement
// RecordItemComponent.prototype.getAlias = procHacker.js(
//     "?getAlias@RecordItemComponent@@QEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
//     CxxString,
//     { this: RecordItemComponent },
// );
RepairableItemComponent.prototype.handleItemRepair = procHacker.js(
    "?handleItemRepair@RepairableItemComponent@@QEBA?AURepairItemResult@@AEAVItemStack@@0_N@Z",
    int32_t,
    { this: RepairableItemComponent },
    ItemStackBase,
    ItemStackBase,
);
ThrowableItemComponent.prototype.getLaunchPower = procHacker.js(
    "?_getLaunchPower@ThrowableItemComponent@@AEBAMHHH@Z",
    float32_t,
    { this: ThrowableItemComponent },
    int32_t,
    int32_t,
    int32_t,
);

// command.ts
CommandRegistry.getParser = function <T>(type: Type<T>): VoidPointer {
    return commandParser.get(type);
};

CommandRegistry.hasParser = function <T>(type: Type<T>): boolean {
    return commandParser.has(type);
};

CommandRegistry.loadParser = function (symbols: CommandSymbols): void {
    return commandParser.load(symbols);
};

CommandRegistry.setParser = function (type: Type<any>, parserFnPointer: VoidPointer): void {
    return commandParser.set(type, parserFnPointer);
};

/**
 * @deprecated no need to use
 */
CommandRegistry.setEnumParser = function (parserFnPointer: VoidPointer): void {
    return commandParser.setEnumParser(parserFnPointer);
};
command.MinecraftCommands.prototype.getRegistry = function () {
    return bedrockServer.commandRegistry;
};
Object.defineProperties(command.MinecraftCommands.prototype, {
    sender: {
        get() {
            return bedrockServer.commandOutputSender;
        },
    },
});

// launcher.ts
const CommandOutputParameterVector = CxxVector.make(CommandOutputParameter);
bedrockServer.executeCommand = function (
    command: string,
    mute: CommandResultType = null,
    permissionLevel: CommandPermissionLevel | null = null,
    dimension: Dimension | null = null,
): CommandResult<any> {
    const origin = ServerCommandOrigin.constructWith(
        "Server",
        bedrockServer.level, // assume it's always ServerLevel
        permissionLevel ?? CommandPermissionLevel.Admin,
        dimension,
    );
    const result = executeCommandWithOutput(command, origin, mute);
    origin.destruct();
    return result;
};

function executeCommandWithOutput(command: string, origin: CommandOrigin, mute: CommandResultType = null): CommandResult<CommandResult.Any> {
    // fire `events.command` manually. because it does not pass MinecraftCommands::executeCommand
    const ctx = CommandContext.constructWith(command, origin);
    const resv = events.command.fire(command, origin.getName(), ctx);
    ctx.destruct();
    decay(ctx);
    if (typeof resv === "number") {
        const res = new MCRESULT(true) as CommandResult<CommandResult.Any>;
        res.result = resv;
        return res;
    }

    // modified MinecraftCommands::executeCommand
    const commands = bedrockServer.minecraftCommands;
    const registry = bedrockServer.commandRegistry;

    if (mute === true || mute == null) mute = CommandResultType.Mute;
    else if (mute === false) mute = CommandResultType.Output;

    const outputType =
        mute === CommandResultType.Mute ? CommandOutputType.None : mute === CommandResultType.Output ? CommandOutputType.AllOutput : CommandOutputType.DataSet;
    const output = CommandOutput.constructWith(outputType);
    const cmdparser = CommandRegistry.Parser.constructWith(registry, CommandVersion.CurrentVersion);
    try {
        let cmd: Command | null;
        const res = new MCRESULT(true) as CommandResult<CommandResult.Any>;
        if (cmdparser.parseCommand(command) && (cmd = cmdparser.createCommand(origin)) !== null) {
            cmd.run(origin, output);
            cmd.destruct();

            const successCount = output.getSuccessCount();
            if (successCount > 0) {
                res.result = 1; // MCRESULT_Success
            } else {
                res.result = 0x200; // MCRESULT_ExecutionFail
            }
        } else {
            const outputParams = CommandOutputParameterVector.construct();
            const errorParams: string[] = cmdparser.getErrorParams();
            if (errorParams.length !== 0) {
                outputParams.reserve(errorParams.length);
                for (const err of errorParams) {
                    outputParams.prepare().constructWith(err);
                }
            }
            const message = cmdparser.getErrorMessage();
            output.error(message, outputParams); // outputParams is destructed by output.error
            res.result = 0; // MCRESULT_FailedToParseCommand;
        }

        const statusCode = res.getFullCode();
        output.set_int("statusCode", statusCode);

        if ((mute & CommandResultType.Output) !== 0 && !output.empty()) {
            commands.handleOutput(origin, output);
        }
        if ((mute & CommandResultType.Data) !== 0) {
            const len = output.messages.size();
            let statusMessage = "";
            if (len > 0) {
                const first = output.messages.get(0);
                statusMessage = translateText(first.messageId, first.params);
                for (let i = 1; i < len; i++) {
                    const msg = output.messages.get(i);
                    const translated = translateText(msg.messageId, msg.params);
                    statusMessage += "\n";
                    statusMessage += translated;
                }
            }
            res.data = Object.assign({ statusCode, statusMessage }, output.propertyBag.json.value());
        }
        return res;
    } finally {
        output.destruct();
        cmdparser.destruct();
    }
}

/**
 * internal class
 */
@nativeClass(0x30) // allocated in CommandUtils::displayLocalizableMessage
class TextObjectLocalizedTextWithParams extends NativeClass {
    asString(): CxxStringWrapper {
        abstract();
    }
    static _constructWith(messageId: string, params: CxxVector<CxxString>): TextObjectLocalizedTextWithParams {
        abstract();
    }
}
TextObjectLocalizedTextWithParams.prototype.asString = procHacker.js(
    "?asString@TextObjectLocalizedTextWithParams@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ",
    CxxStringWrapper,
    { this: TextObjectLocalizedTextWithParams, structureReturn: true },
);
TextObjectLocalizedTextWithParams._constructWith = function (messageId: string, params: CxxVector<CxxString>) {
    const object = new TextObjectLocalizedTextWithParams(true);
    TextObjectLocalizedTextWithParams$Ctor(object, messageId, params);
    return object;
};
const TextObjectLocalizedTextWithParams$Ctor = procHacker.js(
    "??0TextObjectLocalizedTextWithParams@@QEAA@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@2@@Z",
    TextObjectLocalizedTextWithParams,
    null,
    TextObjectLocalizedTextWithParams,
    CxxString,
    CxxVector$string,
);
const translateText = (rawtext: string, params: CxxVector<CxxString>): string => {
    const textObject = TextObjectLocalizedTextWithParams._constructWith(rawtext, params);
    const str = textObject.asString();
    const translated = str.value;
    str.destruct();
    textObject.destruct();
    return translated;
};

CommandOutputSender.prototype._toJson = function (output) {
    const len = output.messages.size();
    let statusMessage = "";
    if (len > 0) {
        const first = output.messages.get(0);
        statusMessage = translateText(first.messageId, first.params);
        for (let i = 1; i < len; i++) {
            const msg = output.messages.get(i);
            const translated = translateText(msg.messageId, msg.params);
            statusMessage += "\n";
            statusMessage += translated;
        }
    }
    const value = Object.assign({ statusCode: output.getSuccessCount() > 0 ? 0 : -1 }, output.propertyBag.json.value());
    return JsonValue.constructWith(value);
};
