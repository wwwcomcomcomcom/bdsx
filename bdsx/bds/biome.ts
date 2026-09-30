import { abstract } from "../common";
import { VoidPointer } from "../core";
import { AbstractClass, nativeClass, nativeField } from "../nativeclass";
import { CxxString, uint16_t } from "../nativetype";

export enum VanillaBiomeTypes {
    Beach = 0,
    Desert = 1,
    ExtremeHills = 2,
    Flat = 3,
    Forest = 4,
    Hell = 5,
    Ice = 6,
    Jungle = 7,
    Mesa = 8,
    MushroomIsland = 9,
    Ocean = 10,
    Plain = 11,
    River = 12,
    Savanna = 13,
    StoneBeach = 14,
    Swamp = 15,
    Taiga = 16,
    TheEnd = 17,
    DataDriven = 18,
}

@nativeClass(null)
export class Biome extends AbstractClass {
    @nativeField(VoidPointer)
    vftable: VoidPointer;
    /** BiomeIdType: the engine's numeric id (0 ocean, 1 plains, 8 hell, 9 the_end, ...). +0x168 on both 1.26 builds (2024: +0x80) */
    @nativeField(uint16_t, 0x168)
    id: uint16_t;
    /** the full name, "minecraft:plains". +0x198 on both 1.26 builds (2024 kept it at +8) */
    @nativeField(CxxString, 0x198)
    name: CxxString;

    /**
     * Returns the type of the biome (not the name)
     */
    getBiomeType(): VanillaBiomeTypes {
        abstract();
    }
}
