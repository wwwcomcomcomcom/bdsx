import { abstract } from "../common";
import { nativeClass, NativeClass, nativeField, NativeStruct } from "../nativeclass";
import { bool_t, float32_t, int32_t } from "../nativetype";

/**
 * The index of a rule in GameRules' vector. The order is the build's: this is
 * 1.26's (39 vanilla rules -- read from the live vector and the same as
 * Endstone's GameRules::GameRulesIndex), which inserted RecipesUnlock,
 * DoLimitedCrafting, PlayerWaypoints, LocatorBar and ShowDaysPlayed into the
 * 2024 order. Prefer GameRules.nameToGameRuleIndex(name) where a build may vary.
 */
export enum GameRuleId {
    CommandBlockOutput,
    DoDaylightCycle,
    DoEntityDrops,
    DoFireTick,
    RecipesUnlock,
    DoLimitedCrafting,
    DoMobLoot,
    DoMobSpawning,
    DoTileDrops,
    DoWeatherCycle,
    DrowningDamage,
    FallDamage,
    FireDamage,
    KeepInventory,
    MobGriefing,
    Pvp,
    ShowCoordinates,
    PlayerWaypoints,
    LocatorBar,
    ShowDaysPlayed,
    NaturalRegeneration,
    TntExplodes,
    SendCommandFeedback,
    MaxCommandChainLength,
    DoInsomnia,
    CommandBlocksEnabled,
    RandomTickSpeed,
    DoImmediateRespawn,
    ShowDeathMessages,
    FunctionCommandLimit,
    SpawnRadius,
    ShowTags,
    FreezeDamage,
    RespawnBlocksExplode,
    ShowBorderEffect,
    ShowRecipeMessages,
    PlayersSleepingPercentage,
    ProjectilesCanBreakBlocks,
    TntExplosionDropDecay,
}

export class GameRules extends NativeClass {
    getRule(id: GameRuleId): GameRule {
        abstract();
    }
    hasRule(id: GameRuleId): boolean {
        abstract();
    }
    setRule(id: GameRuleId, value: boolean | number, type?: GameRule.Type): void {
        this.getRule(id).setValue(value, type);
    }
    nameToGameRuleIndex(name: string): number {
        abstract();
    }

    static nameToGameRuleIndex(name: string): number {
        abstract();
    }
}

export class GameRule extends NativeClass {
    shouldSave: bool_t;
    type: GameRule.Type;
    value: GameRule.Value;

    getBool(): boolean {
        abstract();
    }
    getInt(): number {
        abstract();
    }
    getFloat(): number {
        abstract();
    }
    setBool(value: boolean): void {
        this.type = GameRule.Type.Bool;
        this.value.boolVal = value;
    }
    setInt(value: number): void {
        this.type = GameRule.Type.Int;
        this.value.intVal = value;
    }
    setFloat(value: number): void {
        this.type = GameRule.Type.Float;
        this.value.floatVal = value;
    }
    getValue(): boolean | number | undefined {
        switch (this.type) {
            case GameRule.Type.Invalid:
                return undefined;
            case GameRule.Type.Bool:
                return this.getBool();
            case GameRule.Type.Int:
                return this.getInt();
            case GameRule.Type.Float:
                return this.getFloat();
        }
    }
    setValue(value: boolean | number, type?: GameRule.Type): void {
        switch (type) {
            case GameRule.Type.Bool:
                this.setBool(value as boolean);
                break;
            case GameRule.Type.Int:
                this.setInt(value as number);
                break;
            case GameRule.Type.Float:
                this.setFloat(value as number);
                break;
            default:
                switch (typeof value) {
                    case "boolean":
                        this.setBool(value);
                        break;
                    case "number":
                        if (Number.isInteger(value)) {
                            this.setInt(value);
                        } else {
                            this.setFloat(value);
                        }
                        break;
                }
        }
    }
}

export namespace GameRule {
    export enum Type {
        Invalid,
        Bool,
        Int,
        Float,
    }

    @nativeClass()
    export class Value extends NativeStruct {
        @nativeField(bool_t, { ghost: true })
        boolVal: bool_t;
        @nativeField(int32_t, { ghost: true })
        intVal: int32_t;
        @nativeField(float32_t)
        floatVal: float32_t;
    }
}
