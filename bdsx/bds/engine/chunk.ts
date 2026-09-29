/**
 * LevelChunk fields on 1.26 (engine layer; docs/findings-layouts.md "LevelChunk and BlockActor on 1.26").
 *
 * Endstone level_chunk.h (0.11.7 and HEAD, the same members): block_entity_access_lock_, level_, dimension_, min_,
 * max_, position_. level_ is +0x50 on both builds (getLevel@LevelChunk, which ships: 40 0x741e40 / 51 0x7d9700,
 * `movq 0x50(%rcx),%rax`), so dimension_ +0x58, min_ +0x60, max_ +0x6c (BlockPos, 12 bytes each) and position_ +0x78
 * (ChunkPos). 1.26's inlined toWorldPos (40 0xba1532 in 0xba1510, 51 0x9f3d82) adds ChunkBlockPos x / y / z to
 * +0x60 / +0x64 / +0x68, 2024's 0x218cb50. 2024: getMin `lea 0x60`, getMax `lea 0x6c`, getPosition `lea 0x78`.
 */
import type { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

export const LEVEL_CHUNK_MIN = engineLayout("LevelChunk", "min", 0x60);
export const LEVEL_CHUNK_MAX = engineLayout("LevelChunk", "max", 0x6c);
export const LEVEL_CHUNK_POSITION = engineLayout("LevelChunk", "position", 0x78);
/**
 * LevelChunk's std::vector<WeakEntityRef> of the actors it holds (2024 +0x1028, getChunkEntities `lea 0x1028`): +0x1360 on
 * both builds. The same 471-byte function walks it by 0x18 on each (40 0xba5840, 51 0x9f7d50: `movq 0x1360(%rcx),%rbx;
 * movq 0x1368(%rcx),%r14; cmp`, then each element's entity id at +0x10), and on 40 a live chunk's +0x1360 held the pig
 * summoned in it. Endstone level_chunk.h stops declaring members before it.
 */
export const LEVEL_CHUNK_ENTITIES = engineLayout("LevelChunk", "entities", 0x1028);

/**
 * LevelChunk::isFullyLoaded (2024 0x2180b80, a leaf 1.26 inlined): `load_state_ < Loaded || flag || redstone set up`.
 * - load state: Endstone `std::atomic<ChunkState> load_state_` (2024 getState `lea 0xd8`), +0xf0 on both builds;
 * - Loaded: ChunkState::Loaded, 9 in 2024, 13 on 40 (Endstone 0.11.7 chunk_state.h, with the two NeighborAwareUpgrade
 *   states) and 11 on 51 (Endstone HEAD) -- the constant each build's inlined copies compare against;
 * - the flag byte: 2024 +0x11ba, 40 +0x1526, 51 +0x152e (no direct writer in any of the three images);
 * - redstone set up: 2024 +0xde4, +0x10d1 on both builds, stored as 1 only at the end of setupRedstoneCircuit.
 * Ten inlined copies per 1.26 build read the three bytes in that order (40 0xb969bd, 0x14f60a5 in BlockSource's
 * areChunksFullyLoaded; 51 0x9eaded, 0x15f6425), instruction for instruction 2024's body.
 */
export const LEVEL_CHUNK_LOAD_STATE = engineLayout("LevelChunk", "loadState", 0xd8);
export const CHUNK_STATE_LOADED = engineLayout("LevelChunk", "stateLoaded", 9);
export const LEVEL_CHUNK_FULLY_LOADED_FLAG = engineLayout("LevelChunk", "fullyLoadedFlag", 0x11ba);
export const LEVEL_CHUNK_REDSTONE_SET_UP = engineLayout("LevelChunk", "redstoneSetUp", 0xde4);

export function levelChunkIsFullyLoaded(chunk: StaticPointer): boolean {
    if (chunk.getUint8(LEVEL_CHUNK_LOAD_STATE) < CHUNK_STATE_LOADED) return true;
    if (chunk.getUint8(LEVEL_CHUNK_FULLY_LOADED_FLAG) !== 0) return true;
    return chunk.getUint8(LEVEL_CHUNK_REDSTONE_SET_UP) !== 0;
}

/** LevelChunk::toWorldPos: min_ plus the chunk-local position */
export function levelChunkToWorld(chunk: StaticPointer, x: number, y: number, z: number): [number, number, number] {
    return [chunk.getInt32(LEVEL_CHUNK_MIN) + x, chunk.getInt32(LEVEL_CHUNK_MIN + 4) + y, chunk.getInt32(LEVEL_CHUNK_MIN + 8) + z];
}
