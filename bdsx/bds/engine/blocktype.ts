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
/**
 * BlockType::thickness_ and translucency_, floats right before creative_category_ (Endstone block_type.h +344 / +348),
 * between two fields confirmed on both builds: creative_group_ (a std::string at +0x138, which the block-item
 * registration copies into the item) and creative_category_ (+0x160). The constructor zeroes both (`movq $0,0x158`);
 * block constructors store translucency immediates at +0x15c (1.0 and 0.8 on 80-odd and 45-odd sites of each build).
 * 2024: getThickness@BlockLegacy `movss 0x118(%rcx)`, getTranslucency@Block `movss 0x16c` of the legacy.
 * docs/findings-blocks.md "BlockType and Block fields on 1.26".
 */
const BLOCK_TYPE_THICKNESS = engineLayout("BlockLegacy", "thickness", 0x118);
const BLOCK_TYPE_TRANSLUCENCY = engineLayout("BlockLegacy", "translucency", 0x16c);
/**
 * Block (a block state) fields. direct_data_ caches the block type's component values per state (Endstone
 * BlockComponentDirectData): explosion_resistance, friction and destroy_speed are three floats, the last of which is
 * the hardness already confirmed at +0xb4 on both builds (findings-blocks.md section 12), so +0xac / +0xb0 / +0xb4; the
 * Block constructor (40 0x1bb0460 / 51 0x2ce8950) zeroes 0xa8..0xb7. network_id_ (BlockRuntimeId) is +0x114: the
 * constructor stores `movabsq $0xffffffff00000000` at +0x110 (hash 0, id -1), and the id assignment (40 0x14f16c8 /
 * 51 0x15f15a8) is `movl %ecx,0x114(%rdx); movb $1,0x122(%rdx)` (has_runtime_id_ after data_ at +0x120).
 * 2024: getExplosionResistance `movss 0x70`, getDestroySpeed `movss 0x80`, isUnbreakable `0 > +0x80`,
 * getRuntimeId `lea 0xc4`.
 */
const BLOCK_EXPLOSION_RESISTANCE = engineLayout("Block", "explosionResistance", 0x70);
const BLOCK_FRICTION = engineLayout("Block", "friction", 0x7c);
const BLOCK_DESTROY_SPEED = engineLayout("Block", "destroySpeed", 0x80);
const BLOCK_RUNTIME_ID = engineLayout("Block", "runtimeId", 0xc4);
/**
 * BlockType::block_permutations_ (a std::vector<std::unique_ptr<Block>>, Endstone block_type.h +552 = 0x228) and the
 * destructible-by-mining pointer at Block+0xd0. Read off Block.create objects on both builds: stone has one permutation,
 * lever sixteen, and every first entry's +0x68 points back at the type. 2024 kept the destroy time and explosion
 * resistance in the legacy (0x184 / 0x188), so BlockLegacy::setDestroyTime (0x1bf38b0, both = t) wrote two floats;
 * 1.26 copies them into every permutation's direct_data_ (+0xb4 / +0xac) and the hardness helper reads `[+0xd0]+0` instead
 * when that pointer is set (findings-blocks.md section 12). docs/findings-blocks.md "Block leftovers".
 */
const BLOCK_TYPE_PERMUTATIONS = engineLayout("BlockLegacy", "permutations", 0x228);
const BLOCK_MINING_COMPONENT = engineLayout("Block", "miningComponent", 0xd0);
/** every permutation (Block state) of a block type */
export function blockTypePermutations(blockType: StaticPointer): StaticPointer[] {
    const begin = blockType.getPointer(BLOCK_TYPE_PERMUTATIONS);
    const end = blockType.getPointer(BLOCK_TYPE_PERMUTATIONS + 8);
    const out: StaticPointer[] = [];
    if (begin.isNull()) return out;
    for (let p = begin; p.subptr(end) < 0; p = p.add(8)) out.push(p.getPointer(0));
    return out;
}
/** BlockLegacy::setDestroyTime(t) on one permutation: destroy speed and explosion resistance both become t */
export function blockSetDestroyTime(block: StaticPointer, time: number): void {
    block.setFloat32(time, BLOCK_DESTROY_SPEED);
    block.setFloat32(time, BLOCK_EXPLOSION_RESISTANCE);
    const mining = block.getPointer(BLOCK_MINING_COMPONENT);
    if (!mining.isNull()) mining.setFloat32(time, 0);
}
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

export function blockTypeThickness(blockType: StaticPointer): number {
    return blockType.getFloat32(BLOCK_TYPE_THICKNESS);
}
export function blockTypeTranslucency(blockType: StaticPointer): number {
    return blockType.getFloat32(BLOCK_TYPE_TRANSLUCENCY);
}
export function blockExplosionResistance(block: StaticPointer): number {
    return block.getFloat32(BLOCK_EXPLOSION_RESISTANCE);
}
export function blockFriction(block: StaticPointer): number {
    return block.getFloat32(BLOCK_FRICTION);
}
export function blockDestroySpeed(block: StaticPointer): number {
    return block.getFloat32(BLOCK_DESTROY_SPEED);
}
export function blockRuntimeId(block: StaticPointer): number {
    return block.getUint32(BLOCK_RUNTIME_ID);
}

/**
 * BlockActor::type_ (BlockActorType, one byte in 1.26): Endstone block_actor.h +20 in 0.11.7 and HEAD, right after
 * position_ (a BlockPos at +8, execution-confirmed on both builds as the getPosition accessor). The first run read it as
 * four bytes and got 0xffffff01 for a furnace and 0x656f6426 for a blast furnace: the low byte is the type, the rest is
 * not. 2024: getType@BlockActor `lea 0x50(%rcx)` over a four-byte enum. docs/findings-layouts.md "LevelChunk and
 * BlockActor on 1.26".
 */
const BLOCK_ACTOR_TYPE = engineLayout("BlockActor", "type", 0x50);
export function blockActorType(blockActor: StaticPointer): number {
    return blockActor.getUint8(BLOCK_ACTOR_TYPE);
}

/**
 * BlockActor::setChanged. 2024's was a non-virtual `movb $1, 0xc0(%rcx)` on BlockActor's own bool. 1.26 moved the flag
 * into VanillaBlockActor's `EnumSet<BlockActor::Property> properties_`, whose Changed is bit 0 (Endstone
 * vanilla_block_actor.h: `properties_.insert(Changed)`). That is +68 on 40 (0.11.7: BlockActor 40 bytes + three interface
 * vptrs, tick_count_ +64) and +76 on 51 (HEAD: BlockActor 48 bytes). Each build has one out-of-line copy, slot 22 of 31
 * IVanillaMainBlockActorComponent vftables, `orb $1, 0x1c(%rcx); ret` on the interface sub-object (40 0x4614200, 51
 * 0x486c4a0; isChanged at slot 23 is `movzbl 0x1c(%rcx),%eax; and $1`), and about 120 inlined `orb $1` writes at +0x44 on
 * 40 and +0x4c on 51 (40 0x290aaac, 51 0x1f2931c). docs/findings-layouts.md "BlockActor::setChanged".
 */
const BLOCK_ACTOR_PROPERTIES = engineLayout("BlockActor", "properties", 0xc0);
export function blockActorSetChanged(blockActor: StaticPointer): void {
    blockActor.setUint8(blockActor.getUint8(BLOCK_ACTOR_PROPERTIES) | 1, BLOCK_ACTOR_PROPERTIES);
}

/**
 * BlockType::asItemInstance(Block const&, BlockActor const*) is a virtual: slot 77 on both builds (Endstone block_type.h
 * counts 76 from the top, which is off by one). The base body (40 0x1eeb770, 51 0x1a24b60) builds an ItemInstance of
 * default_state_ (+0x240, Endstone +576) with count 1 and no tag into the return slot, ignoring both arguments -- 2024's
 * BlockLegacy::asItemInstance (0x1be8270: ItemInstance(mDefaultState, 1, nullptr)). docs/findings-blocks.md "asItemInstance".
 */
export const BLOCK_TYPE_AS_ITEM_INSTANCE_SLOT = engineLayout("BlockLegacy", "asItemInstanceSlot", 96);

/**
 * BlockType::buildDescriptionId(Block const&) -> std::string is a virtual: slot 97 on both 1.26 builds (2024: 119, 0x3b8).
 * The base body (40 0x1eec8b0) copies description_id_ (+8) and appends ".name" (the five bytes at 40 0xa8e354a), reading
 * neither the Block nor r8; overrides answer through the type's own vftable. 2024's Block::buildDescriptionId was
 * `BlockDisplayNameComponent string, else legacy->vf[119](out, block)`. docs/findings-inventory.md section 23.
 */
export const BLOCK_TYPE_BUILD_DESCRIPTION_ID_SLOT = engineLayout("BlockLegacy", "buildDescriptionIdSlot", 119);

/**
 * BlockPalette::getBlock(uint const& runtimeId) is a virtual: slot 3 on both 2024 and 1.26 (dtor, getPaletteType, appendBlock,
 * getBlock, assignBlockNetworkId; Endstone block_palette.h). The table ??_7BlockPalette@@6B@ is only the base's: the live
 * palettes carry their own vptr (a Sequential one reads the vector at +0x68, a Hashed one walks a map at +0x88 first), so the
 * call goes through the object's vptr. docs/findings-inventory.md section 23.
 */
export const BLOCK_PALETTE_GET_BLOCK_SLOT = engineLayout("BlockPalette", "getBlockSlot", 3);

/** the function at `slot` of the object's own vftable */
export function virtualFunction(obj: StaticPointer, slot: number): NativePointer {
    return obj.getPointer(0).getPointer(slot * 8);
}

/**
 * BlockType virtuals Block forwarded to in 2024 (`block_type_->vf(...)`, all inlined by 1.26), by slot on both builds:
 * hasComparatorSignal() 90 and
 * getComparatorSignal(BlockSource&, BlockPos const&, Block const&, FacingID) 91 (JukeboxBlock and ChestBlock override both,
 * 90 as the image's return-true), getVariant(Block const&) 102 (`movzwl 0x120(%rdx)`, the Block's data_). Endstone
 * block_type.h counts the same three. 2024 slots: 111, 112, 129. docs/findings-blocks.md "Block's signal and variant".
 * isSignalSource() 35 and getDirectSignal(BlockSource&, BlockPos const&, int) 43 are Endstone's 34 and 42 plus one (its 42 is
 * onFillBlock here: the base's is `ret` and calling it as getDirectSignal killed the server). The engine's own inlined
 * forwards call them: calculateGoldenRailSpeedIncrease tests `!type->vf[35]()` after the solid-blocking checks (2024's
 * isSolidBlockingBlockAndNotSignalSource), DiodeBlock::getAlternateSignalAt tail-calls `type->vf[43](region, pos, dir)`.
 * RepeaterBlock/ComparatorBlock override both. 2024 slots: 47, 54. docs/findings-blocks.md "getDirectSignal and isSignalSource".
 */
export const BLOCK_TYPE_SLOTS = {
    hasComparatorSignal: engineLayout("BlockLegacy", "hasComparatorSignalSlot", 111),
    getComparatorSignal: engineLayout("BlockLegacy", "getComparatorSignalSlot", 112),
    getVariant: engineLayout("BlockLegacy", "getVariantSlot", 129),
    isSignalSource: engineLayout("BlockLegacy", "isSignalSourceSlot", 47),
    getDirectSignal: engineLayout("BlockLegacy", "getDirectSignalSlot", 54),
    // 2024's isThinFenceBlock / isWallBlock (0x120 / 0x128 of the table): 27 and 28 here; ThinFenceBlock's table returns true at
    // 27 and WallBlock's at 28 (docs/findings-blocks.md "BlockUtils on 1.26")
    isThinFenceBlock: engineLayout("BlockLegacy", "isThinFenceBlockSlot", 36),
    isWallBlock: engineLayout("BlockLegacy", "isWallBlockSlot", 37),
};
