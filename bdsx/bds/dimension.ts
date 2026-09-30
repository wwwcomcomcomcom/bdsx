import { abstract } from "../common";
import { VoidPointer } from "../core";
import { nativeClass, NativeClass, nativeField } from "../nativeclass";
import { float32_t, int16_t, int32_t, void_t } from "../nativetype";
import { procHacker } from "../prochacker";
import type { Actor, ActorUniqueID, DimensionId } from "./actor";
import { BlockSource } from "./block";
import { BlockPos, ChunkPos, Vec3 } from "./blockpos";
import { ChunkSource, LevelChunk } from "./chunk";
import { HashedStringToString } from "./hashedstring";
import type { Player } from "./player";
import type { TickingAreaList } from "./tickingarea";

@nativeClass(null)
export class Dimension extends NativeClass {
    @nativeField(VoidPointer)
    vftable: VoidPointer;
    /** @deprecated Use `this.getBlockSource()` instead */
    get blockSource(): BlockSource {
        return this.getBlockSource();
    }

    getBlockSource(): BlockSource {
        abstract();
    }
    getChunkSource(): ChunkSource {
        abstract();
    }
    /** the dimension's ticking areas (the /tickingarea list) */
    getTickingAreas(): TickingAreaList {
        abstract();
    }
    getDimensionId(): DimensionId {
        abstract();
    }
    _sendBlockEntityUpdatePacket(pos: BlockPos): void {
        abstract();
    }
    fetchNearestAttackablePlayer(actor: Actor, distance: number): Player;
    fetchNearestAttackablePlayer(actor: Actor, distance: number, blockPos: BlockPos): Player;
    fetchNearestAttackablePlayer(actor: Actor, distance: number, blockPos?: BlockPos): Player {
        abstract();
    }
    /** @param alpha the partial tick, 0..1 (2024 took it as a float argument; bdsx used to leave it unset) */
    getSunAngle(alpha: number = 0): number {
        abstract();
    }
    /** 0 at noon, 0.5 at midnight; @param alpha the partial tick, 0..1 */
    getTimeOfDay(alpha: number = 0): number {
        abstract();
    }
    isDay(): boolean {
        abstract();
    }
    distanceToNearestPlayerSqr2D(pos: Vec3): number {
        abstract();
    }
    transferEntityToUnloadedChunk(actor: Actor, levelChunk?: LevelChunk): void {
        abstract();
    }
    getSpawnPos(): BlockPos {
        abstract();
    }
    getPlayers(): Player[] {
        abstract();
    }
    fetchNearestPlayerToActor(actor: Actor, distance: number): Player | null {
        abstract();
    }
    fetchNearestPlayerToPosition(x: number, y: number, z: number, distance: number, findAnyNearPlayer: boolean): Player | null {
        abstract();
    }
    getMoonBrightness(): float32_t {
        abstract();
    }
    getHeight(): int16_t {
        abstract();
    }
    getMinHeight(): int16_t {
        abstract();
    }
    tryGetClosestPublicRegion(chunkPos: ChunkPos): BlockSource {
        abstract();
    }
    removeActorByID(actorUniqueId: ActorUniqueID): void {
        abstract();
    }
    getDefaultBiomeString(): HashedStringToString {
        abstract();
    }
    /**
     * @deprecated use getDefaultBiomeString
     */
    getDefaultBiome(): number {
        // polyfill
        switch (this.getDefaultBiomeString()) {
            case "hell":
                return 8;
            case "the_end":
                return 9;
            case "ocean":
            default:
                return 0; // unexpected
        }
    }
    getMoonPhase(): number {
        abstract();
    }
}

Dimension.prototype.getBlockSource = procHacker.js("?getBlockSourceFromMainChunkSource@Dimension@@QEBAAEAVBlockSource@@XZ", BlockSource, { this: Dimension });
Dimension.prototype.getChunkSource = procHacker.js("?getChunkSource@Dimension@@QEBAAEAVChunkSource@@XZ", ChunkSource, { this: Dimension });
Dimension.prototype.getDimensionId = procHacker.js("?getDimensionId@Dimension@@UEBA?AV?$AutomaticID@VDimension@@H@@XZ", int32_t, {
    this: Dimension,
    structureReturn: true,
});

