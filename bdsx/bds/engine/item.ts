/**
 * An item's block type, and the set of blocks a humanoid wears (engine layer; docs/findings-audit.md
 * "isHumanoidWearableBlockItem").
 *
 * Item::block_type_ sits at +0x178 on both builds, but its type changed between them: 1.26.40.8 (Endstone 0.11.7
 * item.h) holds a WeakPtr<BlockType> -- a pointer to a shared counter whose first word is the BlockType* -- and
 * 1.26.51.1 (Endstone HEAD) holds the BlockType* itself. `layouts.Item.blockTypeWeak` says which.
 *
 * 2024's ItemStackBase::isHumanoidWearableBlockItem compared the block against two constants (the skull and the
 * carved pumpkin). 1.26 split the skull into seven head blocks: both builds' bodies (40 0x1bc3ad0, and inlined into
 * 51's isHumanoidWearableItem 0x1a59d80) look the name hash up in a seven-element static vector, then compare it with
 * one more global. The vector's initializer list names the seven HashedString globals below and the global is
 * carved_pumpkin, the same on both builds.
 */
import type { NativePointer, StaticPointer } from "../../core";
import { engineLayout } from "./deps";

export const ITEM_BLOCK_TYPE = engineLayout("Item", "blockType", 0x178);
export const ITEM_BLOCK_TYPE_WEAK = engineLayout("Item", "blockTypeWeak", 1);
export const BLOCK_TYPE_NAME = engineLayout("BlockLegacy", "name", 0x98);

export const WEARABLE_BLOCK_NAMES: ReadonlySet<string> = new Set([
    "minecraft:skeleton_skull",
    "minecraft:wither_skeleton_skull",
    "minecraft:zombie_head",
    "minecraft:player_head",
    "minecraft:creeper_head",
    "minecraft:dragon_head",
    "minecraft:piglin_head",
    "minecraft:carved_pumpkin",
]);

/** the BlockType an Item places, or null (most items place none) */
export function itemBlockType(item: StaticPointer): NativePointer | null {
    let p = item.getPointer(ITEM_BLOCK_TYPE);
    if (p.isNull()) return null;
    if (ITEM_BLOCK_TYPE_WEAK !== 0) {
        p = p.getPointer(0);
        if (p.isNull()) return null;
    }
    return p;
}

/** the full name ("minecraft:stone") of the BlockType, read off its HashedString */
export function blockTypeName(blockType: StaticPointer): string {
    return blockType.getCxxString(BLOCK_TYPE_NAME + 8);
}

/** ItemStackBase::isHumanoidWearableBlockItem: item_ (a WeakPtr<Item> at +8) places one of the wearable blocks */
export function isHumanoidWearableBlockItemOwn(stack: StaticPointer): boolean {
    const ref = stack.getPointer(8);
    if (ref.isNull()) return false;
    const item = ref.getPointer(0);
    if (item.isNull()) return false;
    const blockType = itemBlockType(item);
    return blockType !== null && WEARABLE_BLOCK_NAMES.has(blockTypeName(blockType));
}
