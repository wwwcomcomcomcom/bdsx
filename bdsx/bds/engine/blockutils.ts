/**
 * BlockUtils on 1.26 (engine layer; docs/findings-blocks.md "BlockUtils on 1.26").
 *
 * Four of 2024's BlockUtils statics are still out of line, four calls apart in the same object file as
 * isFullFlowingLiquid (40 0x2c58910, 51 0x2ed62e0): isDownwardFlowingLiquid (40 0x2c58ac0 / 51 0x2ed6490), isLiquidSource
 * (0x2c58c50 / 0x2ed6620), canGrowTreeWithBeehive (0x2c58de0 / 0x2ed67b0) and getLiquidBlockHeight (0x2c58f50 / 0x2ed6920).
 * They ship by address. The other four were inlined, and bdsx implements them here:
 *
 * - isWaterSource: 2024 was `material is Water && LiquidDepth == 0`. The engine's isLiquidSource already tests the depth
 *   (a liquid_depth of 0 on a block that has the state), and the only block types with that state are the four liquids, so
 *   the material test is the block type's name: water and flowing_water (not lava, not flowing_lava).
 * - isBeehiveBlock: 2024 compared the block type's name with VanillaBlockTypeIds::Beehive and BeeNest.
 * - isThinFenceOrWallBlock: 2024 was `isThinFenceBlock() || isWallBlock()`, the BlockType virtuals at 36 and 37. They are
 *   27 and 28 on both builds (ThinFenceBlock's table returns true at 27, WallBlock's at 28; every other block type returns false).
 * - allowsNetherVegetation: 2024 was twelve names; NetherFungusBlock::mayPlaceOn (2024 tail-jumped to it) on 1.26 tests three
 *   HashedString globals and a std::vector<reference_wrapper<HashedString const>> of eleven (40 0x69dcd30, 51 0x65ebe70,
 *   slot 68), read off the live process: the twelve plus coarse_dirt and pale_moss_block.
 * - Block::isCropBlock (also in this file): 2024 looked for VanillaBlockTags::Crop in the block's own tag vector and then the
 *   block type's; 1.26 keeps tags_ on the BlockType only (+0x1a0, a vector of 0x30-byte HashedStrings, Endstone +416).
 */
import { StaticPointer } from "../../core";
import { blockTypeName } from "./item";
import { engineLayout } from "./deps";

const WATER_BLOCKS = new Set(["minecraft:water", "minecraft:flowing_water"]);
const BEEHIVE_BLOCKS = new Set(["minecraft:beehive", "minecraft:bee_nest"]);

/** BlockUtils::isWaterSource's material test, by the block type's full name */
export function blockTypeIsWater(blockType: StaticPointer): boolean {
    return WATER_BLOCKS.has(blockTypeName(blockType));
}

/** BlockUtils::isBeehiveBlock: Beehive or BeeNest */
export function blockTypeIsBeehive(blockType: StaticPointer): boolean {
    return BEEHIVE_BLOCKS.has(blockTypeName(blockType));
}

const NETHER_VEGETATION_SOILS = new Set([
    "minecraft:soul_soil", "minecraft:warped_nylium", "minecraft:crimson_nylium",
    "minecraft:dirt", "minecraft:grass_block", "minecraft:podzol", "minecraft:coarse_dirt", "minecraft:mycelium",
    "minecraft:dirt_with_roots", "minecraft:moss_block", "minecraft:pale_moss_block", "minecraft:mud",
    "minecraft:muddy_mangrove_roots", "minecraft:farmland",
]);

/** BlockUtils::allowsNetherVegetation: the block types nether roots, sprouts and fungi may stand on */
export function blockTypeAllowsNetherVegetation(blockType: StaticPointer): boolean {
    return NETHER_VEGETATION_SOILS.has(blockTypeName(blockType));
}

/** BlockType::tags_ (std::vector<HashedString>): Endstone block_type.h +416; 2024's legacy kept it at +0x228 */
const BLOCK_TYPE_TAGS = engineLayout("BlockLegacy", "tags", 0x228);
/** BlockType::hasTag(HashedString): a linear search of tags_, as 2024's 0x1bf0be0 */
export function blockTypeHasTag(blockType: StaticPointer, tag: string): boolean {
    const begin = blockType.getPointer(BLOCK_TYPE_TAGS), end = blockType.getPointer(BLOCK_TYPE_TAGS + 8);
    if (begin.isNull() || end.isNull()) return false;
    const size = end.subptr(begin);
    for (let i = 0; i < size; i += 0x30) {
        if (begin.getCxxString(i + 8) === tag) return true;
    }
    return false;
}
