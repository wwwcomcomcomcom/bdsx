/**
 * StructureSettings, and StructureTemplate::tryGetBlockAtPos (engine layer; docs/findings-structure.md).
 *
 * 1.26 keeps no out-of-line StructureSettings constructor, destructor or accessor, and reordered the fields
 * (2024 first, 1.26 second, hex; the same on both builds). Read from StructureTemplate::fillFromWorld
 * (40 0x3bc5700 / 51 0x1f62330), placeInWorld (40 0x3bc8290 / 51 0x1f52300), StructureManager::
 * tryPlaceStructureInWorld (40 0x36deca0 / 51 0x1f51a60) and the constructor `/structure save` writes out inline
 * (40 0x3c762f0, the settings object at rbp+0x350):
 *
 *   paletteName       std::string     0     0        "default" from the constructor
 *   ignoreEntities    bool            20    20       fillFromWorld skips _fillEntityList; placeInWorld skips _placeEntitiesInWorld
 *   reloadActorEquipment bool         21    21       placeInWorld hands it to _placeEntitiesInWorld
 *   ignoreBlocks      bool            22    22       fillFromWorld skips _fillBlockInfo; placeInWorld skips the block segments
 *   ignoreJigsawBlocks bool           24    24       placeInWorld hands it to _placeNextBlockSegmentInWorld
 *   lastTouchedByPlayerId int64       50    28       -1 from the constructor; the load helper takes it
 *   structureSize     BlockPos        28    30
 *   structureOffset   BlockPos        34    3c       fillFromWorld reads region = pos + offset, size
 *   pivot             Vec3            40    48       the load helper's rotation centre
 *   mirror            uint8           59    54       (see the notes in docs/findings-structure.md)
 *   rotation          uint8           58    55
 *   animationMode     uint8           5a    56       tryPlaceStructureInWorld: animated when mode != 0 ...
 *   animationSeconds  float           5c    58       ... and floor(seconds * 20) != 0
 *   integrityValue    float           60    5c       100.0 from the constructor
 *   integritySeed     uint32          64    60
 *   sizeof                            68    68
 */
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { CxxString, NativeType } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

const PALETTE_NAME = engineLayout("StructureSettings", "paletteName", 0x00);
const IGNORE_ENTITIES = engineLayout("StructureSettings", "ignoreEntities", 0x20);
const RELOAD_ACTOR_EQUIPMENT = engineLayout("StructureSettings", "reloadActorEquipment", 0x21);
const IGNORE_BLOCKS = engineLayout("StructureSettings", "ignoreBlocks", 0x22);
const IGNORE_JIGSAW_BLOCKS = engineLayout("StructureSettings", "ignoreJigsawBlocks", 0x24);
const LAST_TOUCHED_BY = engineLayout("StructureSettings", "lastTouchedByPlayerId", 0x50);
const STRUCTURE_SIZE = engineLayout("StructureSettings", "structureSize", 0x28);
const STRUCTURE_OFFSET = engineLayout("StructureSettings", "structureOffset", 0x34);
const MIRROR = engineLayout("StructureSettings", "mirror", 0x59);
const ROTATION = engineLayout("StructureSettings", "rotation", 0x58);
const ANIMATION_MODE = engineLayout("StructureSettings", "animationMode", 0x5a);
const ANIMATION_SECONDS = engineLayout("StructureSettings", "animationSeconds", 0x5c);
const INTEGRITY_VALUE = engineLayout("StructureSettings", "integrityValue", 0x60);
const INTEGRITY_SEED = engineLayout("StructureSettings", "integritySeed", 0x64);
const SIZE = engineLayout("StructureSettings", "size", 0x68);

export function structureSettingsGetIgnoreJigsawBlocks(self: StaticPointer): boolean {
    return self.getBoolean(IGNORE_JIGSAW_BLOCKS);
}
export function structureSettingsGetReloadActorEquipment(self: StaticPointer): boolean {
    return self.getBoolean(RELOAD_ACTOR_EQUIPMENT);
}

/** StructureSettings::StructureSettings(): what the engine's inline construction writes (a zero size and offset) */
export function structureSettingsConstruct(self: StaticPointer): void {
    self.fill(0, SIZE);
    CxxString[NativeType.ctor](self.add(PALETTE_NAME) as any);
    self.setCxxString("default", PALETTE_NAME);
    self.setInt32(-1, LAST_TOUCHED_BY);
    self.setInt32(-1, LAST_TOUCHED_BY + 4);
    self.setFloat32(100, INTEGRITY_VALUE);
}

/** StructureSettings::~StructureSettings(): the palette name is the only member that owns memory */
export function structureSettingsDestruct(self: StaticPointer): void {
    CxxString[NativeType.dtor](self.add(PALETTE_NAME) as any);
}

export function structureSettingsSetIgnoreBlocks(self: StaticPointer, value: boolean): void {
    self.setBoolean(value, IGNORE_BLOCKS);
}
export function structureSettingsSetIgnoreEntities(self: StaticPointer, value: boolean): void {
    self.setBoolean(value, IGNORE_ENTITIES);
}
export function structureSettingsSetIgnoreJigsawBlocks(self: StaticPointer, value: boolean): void {
    self.setBoolean(value, IGNORE_JIGSAW_BLOCKS);
}
export function structureSettingsSetReloadActorEquipment(self: StaticPointer, value: boolean): void {
    self.setBoolean(value, RELOAD_ACTOR_EQUIPMENT);
}
export function structureSettingsSetIntegritySeed(self: StaticPointer, seed: number): void {
    self.setUint32(seed >>> 0, INTEGRITY_SEED);
}
export function structureSettingsSetMirror(self: StaticPointer, mirror: number): void {
    self.setUint8(mirror, MIRROR);
}
export function structureSettingsSetRotation(self: StaticPointer, rotation: number): void {
    self.setUint8(rotation, ROTATION);
}
export function structureSettingsSetStructureOffset(self: StaticPointer, x: number, y: number, z: number): void {
    self.setInt32(x, STRUCTURE_OFFSET);
    self.setInt32(y, STRUCTURE_OFFSET + 4);
    self.setInt32(z, STRUCTURE_OFFSET + 8);
}
export function structureSettingsSetStructureSize(self: StaticPointer, x: number, y: number, z: number): void {
    self.setInt32(x, STRUCTURE_SIZE);
    self.setInt32(y, STRUCTURE_SIZE + 4);
    self.setInt32(z, STRUCTURE_SIZE + 8);
}

/** floor(animationSeconds * 20.0f), in single precision like the engine's */
export function structureSettingsGetAnimationTicks(self: StaticPointer): number {
    return Math.floor(Math.fround(self.getFloat32(ANIMATION_SECONDS) * 20));
}
/** tryPlaceStructureInWorld queues an animation when both hold; anything else places at once */
export function structureSettingsIsAnimated(self: StaticPointer): boolean {
    return structureSettingsGetAnimationTicks(self) !== 0 && self.getUint8(ANIMATION_MODE) !== 0;
}

/**
 * StructureTemplate::tryGetBlockAtPos(pos). 1.26 inlines it at every caller (the three placement constraints'
 * constructors, the script API's getBlockPermutation) around one out-of-line helper, 40 0x3bcb4f0 / 51 0x1f671d0:
 * `(BlockPos const& pos, StructureTemplateData const& data, NonOwnerPointer<IUnknownBlockTypeRegistry> registry)`,
 * which looks up the "default" palette, indexes block_indices layer 0 with (sizeY * x + y) * sizeZ + z and asks the
 * palette for the block. The registry is a 24-byte { ptr, count block, object } by value the callee releases (it
 * `lock decl`s the count block at +8 and zeroes the copy), and the callers build it from the template's own
 * NonOwnerPointer, which sits at +0xe0 on 40 and +0xe8 on 51 with a use added.
 */
const HELPER = engineSymbol("bdsx:StructureTemplateData::tryGetBlockAtPos");
const DATA_IN_TEMPLATE = 0x28;
const REGISTRY_IN_TEMPLATE = engineLayout("StructureTemplate", "unknownBlockTypeRegistry", 0xe0);
const NOP_SIZE = 0x18;
let helperCall: ((pos: VoidPointer, data: VoidPointer, registry: VoidPointer) => NativePointer | null) | null = null;

export function structureTemplateTryGetBlockAtPos(self: StaticPointer, pos: VoidPointer): NativePointer | null {
    if (HELPER === null) throw Error("StructureTemplateData::tryGetBlockAtPos: no address in this build");
    helperCall ??= makefunc.js(HELPER, VoidPointer, null, VoidPointer, VoidPointer, VoidPointer) as any;
    const registry = new AllocatedPointer(NOP_SIZE);
    registry.copyFrom(self, NOP_SIZE, 0, REGISTRY_IN_TEMPLATE);
    const rep = registry.getNullablePointer(8);
    if (rep !== null) rep.interlockedIncrement32(8);
    const block = helperCall!(pos, self.add(DATA_IN_TEMPLATE), registry) as any as NativePointer | null;
    return block === null || block.isNull() ? null : block;
}
