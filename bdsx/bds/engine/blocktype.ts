/**
 * The block type registry (engine layer; docs/findings-blocks.md "The block type registry on 1.26").
 *
 * 2024's BlockTypeRegistry was all statics: lookupByName(HashedString const&, bool) returned a
 * WeakPtr<BlockLegacy> through `_lookupByNameImpl(name, data, resolve, bool)`, whose 16-byte result is
 * { WeakPtr<const BlockLegacy> +0, const Block* +8 } (2024 0x2043c30 / 0x202c970). In 1.26 the registry is an
 * object -- one global instance (40 0xc95fe38, 51 0xccb0608) that every caller passes as `this`: the setblock /
 * fill parameter's resolveBlock (40 0x12e30c0, 51 0x1205860), Endstone's `forEachBlockType` (a QEBA member) and
 * ServerLevel's own block helpers -- and `_lookupByNameImpl` is a member with the same arguments behind `this`
 * and the return slot: `(this, sret, HashedString const& name, int data, LookupByNameImplResolve resolve, bool)`.
 * Neither build reads the trailing bool.
 *
 * The result's first member differs between the builds. 1.26.40 keeps 2024's WeakPtr: the out-of-line
 * lookupByName (40 0x284b850) takes a weak reference on +0, and resolveBlock dereferences it
 * (`movq (%rbx),%rcx`) before calling tryGetStateFromLegacyData. 1.26.51 stores the map node's value, a plain
 * `const BlockType*`, with no reference count: resolveBlock hands +0 straight to tryGetStateFromLegacyData, and a
 * helper compares it with Block+0x68 (51 0x11d9fd0). `layouts.BlockTypeRegistry.lookupResultIsWeakPtr` says
 * which (1 on 40, 0 on 51).
 */
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, int32_t, void_t } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

const REGISTRY = engineSymbol("bdsx:BlockTypeRegistry::instance");
const LOOKUP_BY_NAME_IMPL = engineSymbol("bdsx:BlockTypeRegistry::_lookupByNameImpl");
const RESULT_IS_WEAK_PTR = engineLayout("BlockTypeRegistry", "lookupResultIsWeakPtr", 1) !== 0;
/** BlockType::id_ (NewBlockID, uint16): Endstone block_type.h +382, and the engine's inlined getBlockItemId reads it */
const BLOCK_TYPE_ID = engineLayout("BlockLegacy", "id", 0x1a6);
/**
 * BlockType::creative_category_ (SharedTypes::CreativeItemCategory, a one-byte enum in 1.26; the values are the Item
 * field's). 2024's ?getCreativeCategory@BlockLegacy@@ (0x1bee130) was the leaf `movl 0x138(%rcx),%eax; ret` over a
 * four-byte enum; 1.26 keeps no out-of-line copy. The field is +0x160 on both builds (Endstone block_type.h +352): the
 * BlockType constructor (40 0x1ee72c0 / 51 0x1a1fef0) stores `movl $0x80050000,0x160(%rcx)`, the category 0 (All) as in
 * 2024, and the block-item registration (40 0x154a8d0 / 51 0x1661130) copies it with `movzbl 0x160(%rsi),%ecx; movb
 * %cl,0x180(%rax)` into the item's creative_category_ (docs/findings-containers.md section 18). One byte is also right
 * over 2024's layout (little endian, values < 7).
 */
const BLOCK_TYPE_CREATIVE_CATEGORY = engineLayout("BlockLegacy", "creativeCategory", 0x138);
/** { block type (WeakPtr or pointer) +0, const Block* +8 } */
const RESULT_SIZE = 0x10;
/** LookupByNameImplResolve: 0 finds the type only, 1 also resolves the Block for `data` */
const RESOLVE_TYPE_ONLY = 0;

type ImplCall = (registry: VoidPointer, result: VoidPointer, name: VoidPointer, data: number, resolve: number, unused: boolean) => void;
let impl: ImplCall | null = null;

/**
 * BlockTypeRegistry::lookupByName(name): the registered block type, or null. `name` is a HashedString; the engine
 * adds the `minecraft:` namespace to a bare name itself. The weak reference 1.26.40's result carries is released
 * here, so the caller owns nothing.
 */
export function lookupBlockType(name: VoidPointer): NativePointer | null {
    if (REGISTRY === null || LOOKUP_BY_NAME_IMPL === null) throw Error("BlockTypeRegistry::_lookupByNameImpl: no address in this build");
    if (impl === null) impl = makefunc.js(LOOKUP_BY_NAME_IMPL, void_t, null, VoidPointer, VoidPointer, VoidPointer, int32_t, int32_t, bool_t);
    const result = new AllocatedPointer(RESULT_SIZE);
    for (let i = 0; i < RESULT_SIZE; i += 4) result.setInt32(0, i);
    impl(REGISTRY, result, name, 0, RESOLVE_TYPE_ONLY, false);
    const first = result.getPointer(0);
    if (first.isNull()) return null;
    if (!RESULT_IS_WEAK_PTR) return first;
    // the WeakPtr's counter block: { T* +0, strong count +8, weak count +0xc }. A miss is WeakPtr::null(), a
    // static counter with a null object, so the count never reaches zero here and there is nothing to free.
    const type = first.getPointer(0);
    first.interlockedDecrement32(0xc);
    return type.isNull() ? null : type;
}

/** BlockType::getBlockItemId: the id below 0x100 as is, above it 0xff - id, as an int16 (2024 0x1becc10) */
export function blockTypeItemId(blockType: StaticPointer): number {
    const id = blockType.getUint16(BLOCK_TYPE_ID);
    return id < 0x100 ? id : ((0xff - id) << 16) >> 16;
}

/** BlockType::getCreativeCategory: the creative_category_ byte */
export function blockTypeCreativeCategory(blockType: StaticPointer): number {
    return blockType.getUint8(BLOCK_TYPE_CREATIVE_CATEGORY);
}
