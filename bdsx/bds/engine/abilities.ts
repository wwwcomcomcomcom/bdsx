/**
 * The ability block (engine layer; docs/findings-abilities.md, docs/plan-architecture.md A3).
 *
 * 1.26 inlined every Abilities / LayeredAbilities / Ability function away: Player::getAbilities still
 * resolves, and after it everything is arithmetic over one layout -- a layer is `abilityCount` Ability
 * records of `abilityStride` bytes, LayeredAbilities holds `layerCount` of them starting at `layers`,
 * and a lookup walks the layers from the top down to the first record that is not Unset, falling back
 * to Abilities::INVALID_ABILITY. 1.26: 20 abilities, 6 layers at +24, 240 bytes each; the fallbacks are
 * the 2024 shape (19 abilities, 5 layers at +4).
 *
 * The UpdateAbilitiesPacket builder is here too: 1.26 has no out-of-line
 * UpdateAbilitiesPacket(ActorUniqueID, LayeredAbilities const&) and no SerializedAbilitiesData
 * constructor, so the payload is written the way Endstone's serialized_abilities_data.cpp (Apache-2.0)
 * writes it, into a packet MinecraftPackets::createPacket made (vftable, header and the default
 * payload are the engine's own).
 */
import { AllocatedPointer, StaticPointer } from "../../core";
import { msAlloc } from "../../msalloc";
import { Abilities, AbilitiesIndex, AbilitiesLayer, abilityCount, abilityStride, Ability, LayeredAbilities } from "../abilities";
import { engineLayout, engineSymbol } from "./deps";

/**
 * The addresses this area stands on. Each is still read where it is used (bds/abilities.ts,
 * bds/packet.ts, implements.ts); they are named here so tools/engine-deps.mjs lists them.
 */
export const ABILITY_SYMBOLS = {
    getAbilities: engineSymbol("?getAbilities@Player@@QEAAAEAVLayeredAbilities@@XZ"),
    invalidAbility: engineSymbol("?INVALID_ABILITY@Abilities@@2VAbility@@A"),
    abilityNames: engineSymbol("bdsx:Abilities::ABILITY_NAMES"),
    createPacket: engineSymbol("?createPacket@MinecraftPackets@@SA?AV?$shared_ptr@VPacket@@@std@@W4MinecraftPacketIds@@@Z"),
};

export const ABILITY_VALUE = engineLayout("Ability", "value", 0x04);
export const LAYERS = engineLayout("LayeredAbilities", "layers", 4);
export const LAYER_STRIDE = engineLayout("LayeredAbilities", "layerStride", abilityCount * abilityStride);
export const LAYER_COUNT = engineLayout("LayeredAbilities", "layerCount", 5);
/** the layer `setAbility` writes into; the engine's own setter only ever touches this one */
export const BASE_LAYER = engineLayout("LayeredAbilities", "baseLayer", AbilitiesLayer.Base);

/** `&layers_[layer].abilities_[index]`, or INVALID_ABILITY for an index the layer does not have */
export function abilityIn(self: LayeredAbilities, layer: number, abilityIndex: AbilitiesIndex): Ability {
    if (abilityIndex < 0 || abilityIndex >= abilityCount) return Ability.INVALID_ABILITY;
    return (self as any as StaticPointer).addAs(Ability, LAYERS + layer * LAYER_STRIDE + abilityIndex * abilityStride);
}

/** the topmost layer that has the ability set; INVALID_ABILITY when none of them does */
export function topmostAbility(self: LayeredAbilities, abilityIndex: AbilitiesIndex): Ability {
    for (let layer = LAYER_COUNT - 1; layer >= 0; layer--) {
        const ability = abilityIn(self, layer, abilityIndex);
        if (ability.type !== Ability.Type.Unset) return ability;
    }
    return Ability.INVALID_ABILITY;
}

// A layer index the object does not have: the engine returns a shared, never-written Abilities, so
// every record in it reads as Invalid with a zero value. bdsx keeps its own zeroed copy for that.
let emptyAbilities: Abilities | null = null;
export function noSuchLayer(): Abilities {
    if (emptyAbilities === null) {
        const ptr = new AllocatedPointer(LAYER_STRIDE);
        ptr.setBuffer(Buffer.alloc(LAYER_STRIDE));
        emptyAbilities = ptr.as(Abilities);
        (emptyAbilities as any).$buffer = ptr; // `as()` copies only the address; the view must keep the buffer alive
    }
    return emptyAbilities;
}

// UpdateAbilitiesPacket (Endstone update_abilities_packet.h: sizeof 96, payload +48,
// SerializationMode +88) and its payload SerializedAbilitiesData (serialized_abilities_data.h:
// ActorUniqueID +0, command permission +8, player permission +9, vector<SerializedLayer> +16).
// The 1.26 move constructor (40 0x31ab8c0) reads and writes exactly these offsets.
const PACKET_PAYLOAD = engineLayout("UpdateAbilitiesPacket", "payload", 48);
const PAYLOAD_TARGET = engineLayout("SerializedAbilitiesData", "targetPlayer", 0);
const PAYLOAD_COMMAND_PERMISSIONS = engineLayout("SerializedAbilitiesData", "commandPermissions", 8);
const PAYLOAD_PLAYER_PERMISSIONS = engineLayout("SerializedAbilitiesData", "playerPermissions", 9);
const PAYLOAD_LAYERS = engineLayout("SerializedAbilitiesData", "layers", 16);
// SerializedLayer: layer u16 +0, abilities_set u32 +4, ability_values u32 +8, then three floats
const SL_SIZE = engineLayout("SerializedAbilitiesData", "layerSize", 24);
const SL_LAYER = 0;
const SL_SET = 4;
const SL_VALUES = 8;
const SL_FLY_SPEED = 12;
const SL_VERTICAL_FLY_SPEED = 16;
const SL_WALK_SPEED = 20;
// LayeredAbilities' PermissionsHandler: command permission +0, player permission +1
const PERMISSIONS_COMMAND = engineLayout("LayeredAbilities", "commandPermissions", 0);
const PERMISSIONS_PLAYER = engineLayout("LayeredAbilities", "playerPermissions", 1);

/** one SerializedLayer's worth of a layer, or null when nothing in the layer is set */
export interface SerializedLayer {
    layer: number;
    abilitiesSet: number;
    abilityValues: number;
    flySpeed: number;
    verticalFlySpeed: number;
    walkSpeed: number;
}

/** SerializedAbilitiesData's layers, in its order: top layer first, layers with nothing set skipped */
export function serializeLayers(abilities: LayeredAbilities): SerializedLayer[] {
    const out: SerializedLayer[] = [];
    for (let layer = LAYER_COUNT - 1; layer >= 0; layer--) {
        let set = 0;
        let values = 0;
        for (let i = 0; i < abilityCount; i++) {
            const ability = abilityIn(abilities, layer, i);
            if (ability.type === Ability.Type.Unset) continue;
            set |= 1 << i;
            if (ability.type === Ability.Type.Bool && (ability as any as StaticPointer).getUint8(ABILITY_VALUE) !== 0) values |= 1 << i;
        }
        if (set === 0) continue; // !isAnyAbilitySet()
        // Abilities::getFloat: 0 when the record is Unset
        const f = (i: number): number => {
            const a = abilityIn(abilities, layer, i);
            return a.type === Ability.Type.Unset ? 0 : (a as any as StaticPointer).getFloat32(ABILITY_VALUE);
        };
        out.push({
            layer, // ABILITIES_LAYER_MAP is the identity
            abilitiesSet: set >>> 0,
            abilityValues: values >>> 0,
            flySpeed: f(AbilitiesIndex.FlySpeed),
            verticalFlySpeed: abilityCount > AbilitiesIndex.VerticalFlySpeed ? f(AbilitiesIndex.VerticalFlySpeed) : 0,
            walkSpeed: f(AbilitiesIndex.WalkSpeed),
        });
    }
    return out;
}

/**
 * Fill an UpdateAbilitiesPacket that MinecraftPackets::createPacket made, from a live LayeredAbilities.
 * The layer vector is allocated on BDS's heap (msAlloc) so the packet's own destructor frees it; a
 * vector the packet already holds is freed first.
 */
export function writeUpdateAbilitiesPayload(packet: StaticPointer, uniqueId: StaticPointer, abilities: LayeredAbilities): SerializedLayer[] {
    const payload = packet.add(PACKET_PAYLOAD);
    payload.setInt32(uniqueId.getInt32(0), PAYLOAD_TARGET);
    payload.setInt32(uniqueId.getInt32(4), PAYLOAD_TARGET + 4);
    const la = abilities as any as StaticPointer;
    payload.setUint8(la.getUint8(PERMISSIONS_COMMAND), PAYLOAD_COMMAND_PERMISSIONS);
    payload.setUint8(la.getUint8(PERMISSIONS_PLAYER), PAYLOAD_PLAYER_PERMISSIONS);

    const layers = serializeLayers(abilities);
    const vec = payload.add(PAYLOAD_LAYERS);
    const oldBegin = vec.getNullablePointer(0);
    if (oldBegin !== null) msAlloc.deallocate(oldBegin, vec.getPointer(16).subptr(oldBegin));
    const bytes = layers.length * SL_SIZE;
    const begin = layers.length === 0 ? null : msAlloc.allocate(bytes);
    for (let n = 0; n < layers.length; n++) {
        const e = begin!.add(n * SL_SIZE);
        const l = layers[n];
        e.setUint16(l.layer, SL_LAYER);
        e.setUint16(0, SL_LAYER + 2);
        e.setInt32(l.abilitiesSet | 0, SL_SET);
        e.setInt32(l.abilityValues | 0, SL_VALUES);
        e.setFloat32(l.flySpeed, SL_FLY_SPEED);
        e.setFloat32(l.verticalFlySpeed, SL_VERTICAL_FLY_SPEED);
        e.setFloat32(l.walkSpeed, SL_WALK_SPEED);
    }
    if (begin === null) {
        for (let off = 0; off < 24; off += 4) vec.setInt32(0, off);
    } else {
        vec.setPointer(begin, 0);
        vec.setPointer(begin.add(bytes), 8);
        vec.setPointer(begin.add(bytes), 16);
    }
    return layers;
}
