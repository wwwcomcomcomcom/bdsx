/**
 * LevelChunk::getBiome and Biome::getBiomeType on 1.26 (engine layer; docs/findings-inventory.md section 21).
 *
 * 2024 kept a chunk's biomes in a vector of SubChunkStorage<Biome> at +0x168, asked each through its vftable slot 3 (get(index),
 * which returned a state object) and turned the id at +0x80 into a Biome with BiomeRegistry::lookupById. 1.26 has no out-of-line
 * copy; the structure is the same idea one step shorter:
 *   - the vector of `unique_ptr<SubChunkStorage<Biome>>` is at LevelChunk +0x358 on both builds, one entry per sub-chunk (24 in the
 *     overworld, 8 in the nether, 16 in the end), null for a sub-chunk the world has not generated;
 *   - slot 3 of every storage class is getElement(uint16 index) and returns the Biome itself: the uniform class
 *     (`mov 0x8(%rcx),%rax`), the 1-bit and the 2-bit paletted ones (palette pointers inline) all read that way;
 *   - the index is 2024's: (x * 16 + z) * 16 + (y & 15), with y relative to the dimension's minimum height (measured: against
 *     the uniform neighbours of every mixed sub-chunk's four edges, this order has 274 mismatches in 26432 cells and the next best
 *     4045; docs/findings-inventory.md section 21);
 *   - Biome: the u16 id at +0x168, the std::string full name at +0x198, and BiomeComponentStorage (Endstone biome_component_storage.h:
 *     a vector of (typeid_t, unique_ptr<component>), 16 bytes each) at +0x170. The component for VanillaBiomeTypeAttributes holds
 *     the VanillaBiomeTypes value as its first int (+8). Its typeid is the runtime counter the engine handed out: 67 on 1.26.40.8
 *     and 69 on 1.26.51.1. A biome without the component (a data-driven one, lush_caves) is DataDriven = 18, as in 2024.
 */
import { asm, Register } from "../../assembler";
import { NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { uint16_t } from "../../nativetype";
import { engineLayout } from "./deps";

const CHUNK_BIOME_STORAGES = engineLayout("LevelChunk", "biomeStorages", 0x358);
const BIOME_GET_ELEMENT_SLOT = engineLayout("LevelChunk", "biomeGetElementSlot", 3);
export const BIOME_ID = engineLayout("Biome", "id", 0x168);
export const BIOME_NAME = engineLayout("Biome", "name", 0x198);
const BIOME_COMPONENTS = engineLayout("Biome", "components", 0x170);
const VANILLA_TYPE_ATTRIBUTES_TYPEID = engineLayout("Biome", "vanillaTypeAttributesTypeId", 67);
const DATA_DRIVEN = 18;

const getElement = makefunc.js(
    asm().mov_r_rp(Register.rax, Register.rcx, 1, 0).jmp_rp(Register.rax, 1, BIOME_GET_ELEMENT_SLOT * 8).alloc("SubChunkStorage<Biome>::getElement via vft"),
    NativePointer,
    null,
    VoidPointer,
    uint16_t,
);

/**
 * The Biome at a chunk-local cell (x, z in 0..15, y from the dimension's minimum height), or null when that sub-chunk has no
 * storage yet. A y past the top takes the last sub-chunk's top layer, as 2024 did.
 */
export function levelChunkGetBiome(chunk: StaticPointer, x: number, y: number, z: number): NativePointer | null {
    const begin = chunk.getPointer(CHUNK_BIOME_STORAGES);
    const count = chunk.getPointer(CHUNK_BIOME_STORAGES + 8).subptr(begin) / 8;
    if (count <= 0) return null;
    let index = y >> 4;
    let layer = y & 15;
    if (index < 0 || index >= count) {
        index = count - 1;
        layer = 15;
    }
    const storage = begin.getPointer(index * 8);
    if (storage.isNull()) return null;
    const cell = ((x & 15) * 16 + (z & 15)) * 16 + layer;
    const biome = getElement(storage, cell);
    return biome === null || biome.isNull() ? null : biome;
}

/** Biome::getBiomeType: the VanillaBiomeTypes value from the biome's VanillaBiomeTypeAttributes component, DataDriven without one */
export function biomeGetType(biome: StaticPointer): number {
    const begin = biome.getPointer(BIOME_COMPONENTS);
    const end = biome.getPointer(BIOME_COMPONENTS + 8);
    const count = end.subptr(begin) / 16;
    for (let i = 0; i < count; i++) {
        if (begin.getUint16(i * 16) !== VANILLA_TYPE_ATTRIBUTES_TYPEID) continue;
        const component = begin.getPointer(i * 16 + 8);
        return component.isNull() ? DATA_DRIVEN : component.getInt32(8);
    }
    return DATA_DRIVEN;
}
