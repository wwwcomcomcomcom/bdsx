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
import { NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, int32_t } from "../../nativetype";
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

/**
 * Item::full_name_ ("minecraft:diamond"), a HashedString: the 64-bit hash, then the std::string at +8. 2024 kept it at
 * +0x118 (?getFullItemName@Item@@ 0x1cacd80 is `add $0x118,%rcx; jmp HashedString::getString`, getFullNameHash
 * 0x1cacd90 `lea 0x118(%rcx),%rax`); 1.26 keeps it at +0x120 on both builds, where ItemStackBase::isNull (40 0x1bc2260 /
 * 51 0x1a549d0, byte for byte the same there) compares it with the air name: the hash at +0x120, the string's
 * data/size/capacity at +0x128/+0x138/+0x140, the last-match pointer at +0x148 (docs/findings-nbt.md "Item names").
 */
export const ITEM_FULL_NAME = engineLayout("Item", "fullName", 0x118);
export function itemFullName(item: StaticPointer): string {
    return item.getCxxString(ITEM_FULL_NAME + 8);
}

/**
 * The list Item::getCommandNames and BlockLegacy::getCommandNames build (2024 0x1cab320 / 0x1bedcc0, read in full):
 * the lowercased full name with the flag byte set; then, when the namespace is "minecraft", that flag cleared and the
 * lowercased raw name appended with it set. The namespace and the raw name are the two halves of the full name, which
 * is how the engine composes it. Each entry is a CommandName {std::string, bool at +0x20}, 0x28 bytes.
 */
export function commandNames(fullName: string): [string, boolean][] {
    const full = fullName.toLowerCase();
    const colon = full.indexOf(":");
    if (colon === -1 || full.slice(0, colon) !== "minecraft") return [[full, true]];
    return [
        [full, false],
        [full.slice(colon + 1), true],
    ];
}
/** Item::getCommandNames: an item that places a block answers with its block's names (2024 tested getLegacyBlock first) */
export function itemCommandNames(item: StaticPointer): [string, boolean][] {
    const blockType = itemBlockType(item);
    return commandNames(blockType !== null ? blockTypeName(blockType) : itemFullName(item));
}

/** ItemStackBase::isBlock, 2024's body (0x1b64660): item_ (a WeakPtr<Item> at +8) is set and its Item places a block */
export function itemStackIsBlockOwn(stack: StaticPointer): boolean {
    const ref = stack.getPointer(8);
    if (ref.isNull()) return false;
    const item = ref.getPointer(0);
    if (item.isNull()) return false;
    return itemBlockType(item) !== null;
}

/**
 * Item::canDestroyInCreative through the item's own vftable. bdsx found the slot by looking the address up in
 * ??_7ComponentItem@@6B@, which 1.26's tables do not name; the slot is 48 on both builds (2024: 43), read off the
 * component item's table, whose slot holds the same bit-1-of-the-flags-byte leaf 2024's had.
 */
export const ITEM_CAN_DESTROY_IN_CREATIVE_SLOT = engineLayout("Item", "canDestroyInCreativeSlot", 43);
const canDestroyCalls = new Map<string, (item: VoidPointer) => boolean>();
export function itemCanDestroyInCreative(item: StaticPointer): boolean {
    const fn = item.getPointer(0).getPointer(ITEM_CAN_DESTROY_IN_CREATIVE_SLOT * 8);
    const key = fn.toString();
    let call = canDestroyCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, bool_t, null, VoidPointer);
        canDestroyCalls.set(key, call);
    }
    return call(item);
}

/**
 * ItemStackBase::isValidAuxValue(aux) (docs/findings-audit.md "The next audit batch"): 2024's body (0x1b657a0) is
 * `item_ ? item->isValidAuxValue(aux) : false`, a tail call through the Item's vftable +0x1c0 (slot 56). 1.26 keeps no
 * out-of-line copy on either build; the slot is 67 on both (Endstone item.h, and the overrides the walk named there).
 */
export const ITEM_IS_VALID_AUX_VALUE_SLOT = engineLayout("Item", "isValidAuxValueSlot", 56);
const auxCalls = new Map<string, (item: VoidPointer, aux: number) => boolean>();
export function itemStackIsValidAuxValue(stack: StaticPointer, aux: number): boolean {
    const ref = stack.getPointer(8);
    if (ref.isNull()) return false;
    const item = ref.getPointer(0);
    if (item.isNull()) return false;
    const fn = item.getPointer(0).getPointer(ITEM_IS_VALID_AUX_VALUE_SLOT * 8);
    const key = fn.toString();
    let call = auxCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, bool_t, null, VoidPointer, int32_t);
        auxCalls.set(key, call);
    }
    return call(item, aux);
}

/**
 * ComponentItem's cereal::ReflectionCtx (docs/findings-nbt.md "Item components"): the item holds a pointer to the
 * engine's context -- the constructor's fourth argument, stored at +0x290 on 1.26.40.8, +0x298 on 1.26.51.1, +0x2c0 in
 * 2024 -- and ComponentItem::buildNetworkTag passes it to each networked component's buildNetworkTag.
 */
export const COMPONENT_ITEM_REFLECTION_CTX = engineLayout("ComponentItem", "reflectionCtx", 0x2c0);
export function componentItemReflectionCtx(item: StaticPointer): NativePointer | null {
    return item.getNullablePointer(COMPONENT_ITEM_REFLECTION_CTX);
}
/** where ComponentItem.getComponent leaves its item's context on the component it returns */
export const REFLECTION_CTX_OF = Symbol("reflectionCtx");
