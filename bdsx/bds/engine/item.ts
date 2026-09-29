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
 * Item::creative_category_ (SharedTypes::CreativeItemCategory; a one-byte enum in 1.26: All 0, Construction 1, Nature 2,
 * Equipment 3, Items 4, ItemCommandOnly 5, Undefined 6). 2024's ?getCreativeCategory@Item@@ (0x1cab790) was the leaf
 * `movl 0x1d0(%rcx),%eax; ret` over a four-byte enum; 1.26 keeps no out-of-line copy. The field is +0x180 on both builds:
 * the Item constructor (40 0x24cb9c0 / 51 0x1a790c0) stores `movb $0x4,0x180(%rcx)` between block_type_ (+0x178) and
 * crafting_remaining_item_ (+0x188), 2024's `movl $0x4,0x1d0`; the inlined "Undefined takes the group's category" in
 * the creative-group add (40 0x37520c0 / 51 0x36ea0c0) is `cmpb $0x6,0x180(%rax)` / `movb %dl,0x180(%rax)`
 * (docs/findings-containers.md section 17). One byte is also right over 2024's layout (little endian, values < 7).
 */
export const ITEM_CREATIVE_CATEGORY = engineLayout("Item", "creativeCategory", 0x1d0);
export function itemCreativeCategory(item: StaticPointer): number {
    return item.getUint8(ITEM_CREATIVE_CATEGORY);
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

/**
 * FoodItemComponent's IFoodItemComponent base (docs/findings-audit.md "Audit leftovers"). The component the item's
 * component map hands out starts with the NetworkedItemComponent<FoodItemComponent> vptr; the IFoodItemComponent vptr
 * sits at +0x10, and IFoodItemComponent's virtuals (getNutrition, getSaturationModifier, canAlwaysEat, ...) take that
 * subobject as `this`. ComponentItem::getFood returns `component + 0x10` on both builds (40 0x33c1060 / 51 0x20b5b50,
 * `lea 0x10(%rax),%rcx; cmovne`), as 2024's constructor stored it (0x1da3f50).
 */
export const FOOD_ITEM_COMPONENT_INTERFACE = engineLayout("FoodItemComponent", "foodInterface", 0x10);

/**
 * Item::raw_name_id_ ("diamond"), a HashedString: Endstone item.h puts description_id_, raw_name_id_, namespace_,
 * full_name_ in that order, so counted back from the confirmed full_name_ (+0x120): namespace_ (a std::string) +0x100,
 * raw_name_id_ +0xd0 -- 2024's +0xc8 moved by the same 8 bytes as full_name_ (+0x118 -> +0x120). 2024
 * getRawNameId@Item 0x1cae490 `add $0xc8,%rcx; jmp` the HashedString string getter. The BlockType's raw name is
 * name_info_.raw_name, the first member of name_info_ (Endstone block_type.h +144), whose full_name (+224) is
 * confirmed; 2024 getRawNameId@BlockLegacy 0x1bef940 `add $0x48,%rcx`. docs/findings-containers.md section 19.
 */
export const ITEM_RAW_NAME_ID = engineLayout("Item", "rawNameId", 0xc8);
export const BLOCK_TYPE_RAW_NAME = engineLayout("BlockLegacy", "rawName", 0x48);
export function itemRawNameId(item: StaticPointer): string {
    return item.getCxxString(ITEM_RAW_NAME_ID + 8);
}
export function blockTypeRawName(blockType: StaticPointer): string {
    return blockType.getCxxString(BLOCK_TYPE_RAW_NAME + 8);
}

/**
 * Item's flag byte right after max_damage_ (Endstone item.h: is_glint_, hand_equipped_, is_stacked_by_data_,
 * requires_world_builder_, explodable_, fire_resistant_, should_despawn_, allow_offhand_ as one-bit fields), +0x152 on
 * both builds between the confirmed full_name_ (+0x120, a 0x30-byte HashedString, then max_damage_ +0x150) and
 * max_use_duration_ (+0x154). 2024 +0x14a with the same bits: isExplodable@Item 0x1cb1cb0 `shr $4; and $1`,
 * isFireResistant@Item 0x1cb1cc0 `shr $5; and $1`. 1.26's item-entity hurt (40 0x2d3b864 / 51 0x5989c54) skips an
 * explosion (cause 10/11) unless `testb $0x10, 0x152(item)` and fire unless not `testb $0x20` -- 2024 ItemActor::_hurt.
 */
export const ITEM_FLAGS = engineLayout("Item", "flags", 0x14a);
export function itemIsExplodable(item: StaticPointer): boolean {
    return (item.getUint8(ITEM_FLAGS) & 0x10) !== 0;
}
export function itemIsFireResistant(item: StaticPointer): boolean {
    return (item.getUint8(ITEM_FLAGS) & 0x20) !== 0;
}

/**
 * Item::isHumanoidArmor through the item's own vftable: slot 10 on both builds (2024: 9, +0x48). 1.26.51's
 * isHumanoidWearableItem (0x1a59d80) calls vftable +0x50 before its wearable-block walk, and 1.26.40, which keeps no
 * isHumanoidWearableItem, inlines the same +0x50 check into two callers (0x8f66a50, 0x1bc7a90); HumanoidArmorItem's
 * slot 10 is the image's `return true` (docs/findings-audit.md "isHumanoidWearableItem").
 */
export const ITEM_IS_HUMANOID_ARMOR_SLOT = engineLayout("Item", "isHumanoidArmorSlot", 9);
const humanoidArmorCalls = new Map<string, (item: VoidPointer) => boolean>();
export function itemIsHumanoidArmor(item: StaticPointer): boolean {
    const fn = item.getPointer(0).getPointer(ITEM_IS_HUMANOID_ARMOR_SLOT * 8);
    const key = fn.toString();
    let call = humanoidArmorCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, bool_t, null, VoidPointer);
        humanoidArmorCalls.set(key, call);
    }
    return call(item);
}
