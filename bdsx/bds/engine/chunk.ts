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

/** LevelChunk::toWorldPos: min_ plus the chunk-local position */
export function levelChunkToWorld(chunk: StaticPointer, x: number, y: number, z: number): [number, number, number] {
    return [chunk.getInt32(LEVEL_CHUNK_MIN) + x, chunk.getInt32(LEVEL_CHUNK_MIN + 4) + y, chunk.getInt32(LEVEL_CHUNK_MIN + 8) + z];
}
