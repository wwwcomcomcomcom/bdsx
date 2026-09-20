import { abstract } from "../common";
import { CxxPair } from "../cxxpair";
import { AbstractClass, nativeClass, NativeClass, nativeField, NativeStruct } from "../nativeclass";
import { bool_t, float32_t } from "../nativetype";
import { pdbcache } from "../pdbcache";
import type { CommandPermissionLevel } from "./command";
import type { PlayerPermission } from "./player";
import { proc } from "./symbols";

// The ability block's shape, from symbols.json `layouts` (docs/findings-abilities.md). 1.26 added
// one ability (VerticalFlySpeed) and one layer (Editor), so a layer is 20 * 12 bytes rather than
// 19 * 12 and LayeredAbilities carries six of them after a 24-byte PermissionsHandler. The literals
// are the 2024 shape, which is what a build without the layouts entry had.
const Abilities$layout = pdbcache.layouts.Abilities ?? {};
/** bytes per Ability; the ability count is the bound the binary checks before indexing */
export const abilityStride = Abilities$layout.abilityStride ?? 0x0c;
export const abilityCount = Abilities$layout.abilityCount ?? 19;
const Abilities$size = Abilities$layout.size ?? abilityCount * abilityStride;

@nativeClass(Abilities$size)
export class Abilities extends AbstractClass {
    getAbility(abilityIndex: AbilitiesIndex): Ability {
        if (abilityIndex < 0 || abilityIndex >= abilityCount) {
            return Ability.INVALID_ABILITY;
        }
        return this.addAs(Ability, abilityIndex * abilityStride);
    }
    setAbility(abilityIndex: AbilitiesIndex, value: boolean | number): void {
        abstract();
    }
    isFlying(): boolean {
        abstract();
    }

    getFloat(abilityIndex: AbilitiesIndex): number {
        abstract();
    }
    getBool(abilityIndex: AbilitiesIndex): boolean {
        abstract();
    }
    static getAbilityName(abilityIndex: AbilitiesIndex): string {
        abstract();
    }
    static nameToAbilityIndex(name: string): AbilitiesIndex {
        abstract();
    }
}

/**
 * The ability layers, highest first when a value is looked up: the topmost layer that has the
 * ability set wins. 1.26 has six (Endstone's layered_abilities.h, Apache-2.0); 2024 had five,
 * without Editor. `LayerCount` is the count this build actually carries.
 */
export enum AbilitiesLayer {
    CustomCache = 0,
    Base = 1,
    Spectator = 2,
    Commands = 3,
    Editor = 4,
    LoadingScreen = 5,
    LayerCount = 6,
}

@nativeClass(null)
export class LayeredAbilities extends AbstractClass {
    getLayer(layer: AbilitiesLayer): Abilities {
        abstract();
    }
    protected _setAbility(abilityIndex: AbilitiesIndex, value: boolean): void {
        abstract();
    }
    /**
     * Returns the command permission level of the ability owner
     */
    getCommandPermissions(): CommandPermissionLevel {
        abstract();
    }
    /**
     * Returns the player permission level of the ability owner
     */
    getPlayerPermissions(): PlayerPermission {
        abstract();
    }
    /**
     * Changes the command permission level of the ability owner
     */
    setCommandPermissions(commandPermissionLevel: CommandPermissionLevel): void {
        abstract();
    }
    /**
     * Changes the player permission level of the ability owner
     */
    setPlayerPermissions(playerPermissionLevel: PlayerPermission): void {
        abstract();
    }
    /**
     * Returns the command permission level of the ability owner
     * @deprecated use getCommandPermissions, use the native function name
     */
    getCommandPermissionLevel(): CommandPermissionLevel {
        abstract();
    }
    /**
     * Returns the player permission level of the ability owner
     * @deprecated use getPlayerPermissions, use the native function name
     */
    getPlayerPermissionLevel(): PlayerPermission {
        abstract();
    }
    /**
     * Changes the command permission level of the ability owner
     * @deprecated use setCommandPermissions, use the native function name
     */
    setCommandPermissionLevel(commandPermissionLevel: CommandPermissionLevel): void {
        abstract();
    }
    /**
     * Changes the player permission level of the ability owner
     * @deprecated use setPlayerPermissions, use the native function name
     */
    setPlayerPermissionLevel(playerPermissionLevel: PlayerPermission): void {
        abstract();
    }
    getAbility(abilityIndex: AbilitiesIndex): Ability;
    getAbility(abilityLayer: AbilitiesLayer, abilityIndex: AbilitiesIndex): Ability;
    getAbility(abilityLayer: AbilitiesLayer | AbilitiesIndex, abilityIndex?: AbilitiesIndex): Ability {
        abstract();
    }

    setAbility(abilityIndex: AbilitiesIndex, value: boolean | number): void {
        abstract();
    }

    isFlying(): boolean {
        abstract();
    }
    getFloat(abilityIndex: AbilitiesIndex): number {
        return this._getFloatWithLayer(abilityIndex).first;
    }
    protected _getFloatWithLayer(index: AbilitiesIndex): CxxPair<float32_t, AbilitiesLayer> {
        abstract();
    }
    getBool(abilityIndex: AbilitiesIndex): boolean {
        abstract();
    }
}

export enum AbilitiesIndex {
    Build,
    Mine,
    DoorsAndSwitches,
    OpenContainers,
    AttackPlayers,
    AttackMobs,
    OperatorCommands,
    Teleport,
    /** Both are 8 */
    ExposedAbilityCount,

    Invulnerable = 8,
    Flying,
    MayFly,
    Instabuild,
    Lightning,
    FlySpeed,
    WalkSpeed,
    Muted,
    WorldBuilder,
    NoClip,
    PrivilegedBuilder = 18,
    /**
     * The 2024 count, kept because it is public API. The bound the binary checks is
     * `abilityCount` above, which is 20 on 1.26 -- the build that added VerticalFlySpeed.
     */
    AbilityCount = 19,
    VerticalFlySpeed = 19,
}

export class Ability extends NativeClass {
    type: Ability.Type;
    value: Ability.Value;
    options: Ability.Options;

    getBool(): boolean {
        abstract();
    }
    getFloat(): number {
        abstract();
    }
    setBool(value: boolean): void {
        abstract();
    }
    setFloat(value: number): void {
        this.type = Ability.Type.Float;
        this.setFloat32(value, 0x04);
    }

    getValue(): boolean | number | undefined {
        switch (this.type) {
            case Ability.Type.Unset:
                return undefined;
            case Ability.Type.Bool:
                return this.getBool();
            case Ability.Type.Float:
                return this.getFloat();
            default:
                throw Error(`invalid Ability.type, ${this.type}`);
        }
    }
    setValue(value: boolean | number): void {
        switch (typeof value) {
            case "boolean":
                this.setBool(value);
                break;
            case "number":
                this.setFloat(value);
                break;
        }
    }

    static readonly INVALID_ABILITY = proc["?INVALID_ABILITY@Abilities@@2VAbility@@A"].as(Ability);
}

export namespace Ability {
    export enum Type {
        Invalid,
        Unset,
        Bool,
        Float,
    }

    export enum Options {
        None,
        NoSave,
        CommandExposed = 2,
        PermissionsInterfaceExposed = 4,
        WorldbuilderOverrides = 8,

        NoSaveCommandExposed = 3,
        NoSavePermissionsInterfaceExposed = 5,
        CommandExposedPermissionsInterfaceExposed = 6,
        NoSaveCommandExposedPermissionsInterfaceExposed = 7,
        NoSaveWorldbuilderOverrides = 9,
        CommandExposedWorldbuilderOverrides = 10,
        NoSaveCommandExposedWorldbuilderOverrides = 11,
        PermissionsInterfaceExposedWorldbuilderOverrides = 12,
        NoSavePermissionsInterfaceExposedWorldbuilderOverrides = 13,
        CommandExposedPermissionsInterfaceExposedWorldbuilderOverrides = 14,
        All = 15,
    }

    @nativeClass()
    export class Value extends NativeStruct {
        @nativeField(bool_t, { ghost: true })
        boolVal: bool_t;
        @nativeField(float32_t)
        floatVal: float32_t;
    }
}
