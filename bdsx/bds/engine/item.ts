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
import { bool_t, CxxString, float32_t, int16_t, int32_t } from "../../nativetype";
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
 * Item::namespace_ (a std::string, "minecraft"), +0x100 on both 1.26 builds: Endstone item.h declares raw_name_id_, namespace_,
 * full_name_ in that order, so it is the 0x20 bytes before the confirmed full_name_ (+0x120); 2024 kept it at +0xf8 right after
 * the raw name (?getSerializedName@Item@@ 0x1cae4b0 reads `lea 0xf8(%r8)` as its left half). 2024's getSerializedName is
 * namespace_ + ":" + raw_name_id_ with everything up to and including the first "tile." dropped from the raw name.
 */
export const ITEM_NAMESPACE = engineLayout("Item", "namespace", 0xf8);
export function itemSerializedName(item: StaticPointer): string {
    let raw = itemRawNameId(item);
    const tile = raw.indexOf("tile.");
    if (tile >= 0) raw = raw.substr(tile + 5);
    return item.getCxxString(ITEM_NAMESPACE) + ":" + raw;
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
 * The offhand rule (Item::allow_offhand_; 2024 bit 7 of the flag byte at +0x14a, what Item::setAllowOffhand 0x1cb3c10 sets).
 * The engine's reader is OffhandContainerValidation's vftable slot 2, which tests the stack's item and nothing else:
 * 1.26.40 (0x8f48ce0): `movzbl 0x152(item); shrb $7`, the flag byte's top bit; 1.26.51 (0x2f48d80): `movzbl 0x210(item);
 * andb $3; cmpb $1`, a two-bit state at Item+0x210 that 51's network writer also uses for "allow_off_hand" (0x20bb75d), and
 * whose reader stores 2 or 1 there (0x20bd5a7). Bit 7 of +0x152 is read by no code on 51. `layouts.Item.allowOffhandState` is
 * that byte's offset, 0 where the flag bit is the storage. A state of 0 is "not set" and reads false.
 */
export const ITEM_ALLOW_OFFHAND_STATE = engineLayout("Item", "allowOffhandState", 0);
export function itemAllowOffhand(item: StaticPointer): boolean {
    if (ITEM_ALLOW_OFFHAND_STATE !== 0) return (item.getUint8(ITEM_ALLOW_OFFHAND_STATE) & 3) === 1;
    return (item.getUint8(ITEM_FLAGS) & 0x80) !== 0;
}
export function itemSetAllowOffhand(item: StaticPointer, value: boolean): void {
    if (ITEM_ALLOW_OFFHAND_STATE !== 0) {
        item.setUint8((item.getUint8(ITEM_ALLOW_OFFHAND_STATE) & 0xfc) | (value ? 1 : 2), ITEM_ALLOW_OFFHAND_STATE);
        return;
    }
    const flags = item.getUint8(ITEM_FLAGS);
    item.setUint8(value ? flags | 0x80 : flags & 0x7f, ITEM_FLAGS);
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

/**
 * Item::tags_ (Endstone item.h: a std::vector<HashedString>): the begin/end pointers at +0x1f8/+0x200 on both builds, 0x30
 * bytes an element (the 64-bit hash, the std::string at +8, then the last-match pointer). 1.26 inlines every tag test to
 * this walk (docs/findings-containers.md section 24): it compares the hash, then the string, and caches the hit in the
 * element's last-match slot -- bdsx compares the strings only.
 */
export const ITEM_TAGS = engineLayout("Item", "tags", 0x1f8);
const ITEM_TAG_STRIDE = 0x30;
export function itemHasTag(item: StaticPointer, tag: string): boolean {
    const end = item.getPointer(ITEM_TAGS + 8);
    for (let p = item.getPointer(ITEM_TAGS); !p.equalsptr(end); p = p.add(ITEM_TAG_STRIDE)) {
        if (p.getCxxString(8) === tag) return true;
    }
    return false;
}

/**
 * ItemStackBase::isHorseArmorItem. 2024 (0x1b64ac0) compared the full name with four VanillaItemNames globals; 1.26 (40
 * 0x1bc79a0, 51 the same shape) asks whether the item carries the tag "minecraft:horse_armor", which the six horse armors
 * (leather, iron, golden, diamond, netherite, copper) do. The static-init hash globals of those six names are read by
 * nothing else (docs/findings-containers.md section 22), the tag is what the engine reads.
 */
export function itemIsHorseArmor(item: StaticPointer): boolean {
    return itemHasTag(item, "minecraft:horse_armor");
}

/**
 * ItemStackBase::isArmorItem: 1.26 (40 0x1bc7810, 51 0x1a59b00, both called by Mob::getArmorValue) is, in order, the item's
 * isHumanoidArmor virtual, the tag "minecraft:horse_armor", the item named "minecraft:wolf_armor", and the tag
 * "minecraft:nautilus_armor". 2024 (0x1b64560) was the first and the horse test only.
 */
export function itemIsArmor(item: StaticPointer): boolean {
    return itemIsHumanoidArmor(item) || itemIsHorseArmor(item) || itemFullName(item) === "minecraft:wolf_armor" || itemHasTag(item, "minecraft:nautilus_armor");
}

/**
 * Item::buildDescriptionName(ItemStackBase const&), the translated display name: slot 93 on both builds (2024: 82,
 * +0x290; Endstone item.h counts 92, and 1.26 has one more virtual between isValidAuxValue (67) and it). PickaxeItem's
 * slot 93 (40 0x24e8940, 51 0x1a8d530) calls slot 94 (+0x2f0, buildDescriptionId) and the static I18n's +0x80 (get),
 * 2024's body; slot 92 does neither (docs/findings-containers.md section 20).
 */
export const ITEM_BUILD_DESCRIPTION_NAME_SLOT = engineLayout("Item", "buildDescriptionNameSlot", 82);
const descriptionNameCalls = new Map<string, (item: VoidPointer, stack: VoidPointer) => string>();
export function itemBuildDescriptionName(item: StaticPointer, stack: VoidPointer): string {
    const fn = item.getPointer(0).getPointer(ITEM_BUILD_DESCRIPTION_NAME_SLOT * 8);
    const key = fn.toString();
    let call = descriptionNameCalls.get(key);
    if (call === undefined) {
        const native = makefunc.js(fn, CxxString, { this: VoidPointer, structureReturn: true }, VoidPointer);
        call = (i: VoidPointer, st: VoidPointer) => native.call(i, st);
        descriptionNameCalls.set(key, call);
    }
    return call(item, stack);
}

/**
 * Item virtuals ItemStackBase forwarded to in 2024 (`item_ ? item->vf(...) : 0`), all inlined by 1.26. Endstone item.h's
 * count is exact in this range: it matches every slot confirmed on both builds (isHumanoidArmor 10, isDamageable 14,
 * canDestroyInCreative 48, isValidAuxValue 67), and PickaxeItem's table shows the bodies (docs/findings-containers.md
 * section 21): 35 isStackedByData `movzbl 0x152; and $4`, 36 getMaxDamage `movzwl 0x150`, 37 getAttackDamage (the digger's
 * damage field), 40 isGlint(stack), 41 isPattern / 50 isLiquidClipItem (return 0 for a pickaxe), 57 getEnchantValue (the
 * tier's +0x10). 2024 slots: 33, 34, 35, 38, 39, 45, 51.
 */
export const ITEM_SLOTS = {
    isStackedByData: engineLayout("Item", "isStackedByDataSlot", 33),
    getMaxDamage: engineLayout("Item", "getMaxDamageSlot", 34),
    getAttackDamage: engineLayout("Item", "getAttackDamageSlot", 35),
    isGlint: engineLayout("Item", "isGlintSlot", 38),
    isPattern: engineLayout("Item", "isPatternSlot", 39),
    isLiquidClipItem: engineLayout("Item", "isLiquidClipItemSlot", 45),
    getEnchantValue: engineLayout("Item", "getEnchantValueSlot", 51),
};
type SlotRet = typeof bool_t | typeof int16_t | typeof int32_t;
const slotCalls = new Map<string, (...args: any[]) => any>();
/** call the item's own vftable slot with (item[, arg]) and the given return type */
export function itemSlotCall<T>(item: StaticPointer, slot: number, ret: SlotRet, arg?: VoidPointer): T {
    const fn = item.getPointer(0).getPointer(slot * 8);
    // several slots share one body (the image's `xor eax,eax; ret`), so the wrapper is keyed by the return type too
    const key = `${fn}:${(ret as any).name}:${arg === undefined ? 0 : 1}`;
    let call = slotCalls.get(key);
    if (call === undefined) {
        call = arg === undefined ? makefunc.js(fn, ret as any, null, VoidPointer) : makefunc.js(fn, ret as any, null, VoidPointer, VoidPointer);
        slotCalls.set(key, call);
    }
    return arg === undefined ? call(item) : call(item, arg);
}

/**
 * Item::getDestroySpeed(ItemStackBase const&, Block const&): slot 88 on both builds (2024: 77, +0x268). The base Item's
 * slot 88 is `movss 1.0f; ret` (MapItem, 40 0xdff460 / 51 0xd3f590), PickaxeItem's (40 0x3759800) reads the digger's tag
 * at +0x218 as canDestroySpecial does. Endstone item.h counts 88; the one extra 1.26 virtual sits between it and 93.
 */
export const ITEM_GET_DESTROY_SPEED_SLOT = engineLayout("Item", "getDestroySpeedSlot", 77);
const destroySpeedCalls = new Map<string, (item: VoidPointer, stack: VoidPointer, block: VoidPointer) => number>();
export function itemDestroySpeed(item: StaticPointer, stack: VoidPointer, block: VoidPointer): number {
    const fn = item.getPointer(0).getPointer(ITEM_GET_DESTROY_SPEED_SLOT * 8);
    const key = fn.toString();
    let call = destroySpeedCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, float32_t, null, VoidPointer, VoidPointer, VoidPointer);
        destroySpeedCalls.set(key, call);
    }
    return call(item, stack, block);
}

/**
 * Item::getCooldownType() -> HashedString const& is a virtual: slot 103 on both 1.26 builds (2024: 90, where 0x1cab770 read
 * the item's +0x210 component and returned its +0x48 string or the empty HashedString). Player::startCooldown (40 0x21d850,
 * 51 0x2ac040) calls `item->vf[0x338](item)`, namespaces the result with "minecraft" and, when the string is not empty,
 * calls slot 104 (getCooldownTime). docs/findings-slots.md "startCooldown", findings-inventory.md section 23.
 */
export const ITEM_GET_COOLDOWN_TYPE_SLOT = engineLayout("Item", "getCooldownTypeSlot", 90);
