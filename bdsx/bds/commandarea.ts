import { capi } from "../capi";
import { abstract } from "../common";
import { AbstractClass, nativeClass, NativeClass, nativeField } from "../nativeclass";
import { AllocatedPointer, StaticPointer, VoidPointer } from "../core";
import { makefunc } from "../makefunc";
import { bool_t, int32_t, NativeType, void_t } from "../nativetype";
import { procHacker } from "../prochacker";
import { BlockSource } from "./block";
import { BlockPos } from "./blockpos";
import { Dimension } from "./dimension";
import { engineLayout } from "./engine/deps";
import { derived } from "./symbols";

@nativeClass(null)
export class CommandArea extends AbstractClass {
    [NativeType.dtor](): void {
        abstract();
    }

    dispose(): void {
        this.destruct();
        capi.free(this);
    }

    getDimensionBlockSource(): BlockSource {
        abstract();
    }
    /**@deprecated use getDimensionBlockSource method */
    get blockSource(): BlockSource {
        return this.getDimensionBlockSource();
    }
}

@nativeClass()
export class CommandAreaFactory extends NativeClass {
    @nativeField(Dimension.ref())
    dimension: Dimension;

    static create(dimension: Dimension): CommandAreaFactory {
        const factory = new CommandAreaFactory(true);
        factory.dimension = dimension;
        return factory;
    }

    /**
     * @return CommandArea need to be disposed
     */
    findArea(pos1: BlockPos, pos2: BlockPos, b: boolean, b2: boolean, b3: boolean): CommandArea | null {
        abstract();
    }
}

// 1.26 has no out-of-line CommandArea destructor, getDimensionBlockSource or CommandAreaFactory::findArea (docs/findings-inventory.md
// section 23). A CommandArea is still one owned ChunkViewSource* (8 bytes): the destructor deletes it through its virtual destructor,
// the block source is the main one of the view source's dimension (ChunkSource +0x28), and findArea is 2024's chunk-bounds step in
// front of _getArea, which does have an address ("bdsx:CommandAreaFactory::_getArea": calculateChunksLoadedInfo, then a view source
// moved over the bounds; null when a chunk of the area is not loaded).
const CHUNK_SOURCE_DIMENSION = engineLayout("ChunkSource", "dimension", 0x28);
const deleteViewSource = makefunc.js([0], void_t, { this: VoidPointer }, int32_t);
CommandArea.prototype[NativeType.dtor] = derived(
    "??1CommandArea@@QEAA@XZ",
    function (this: CommandArea): void {
        const viewSource = (this as unknown as StaticPointer).getNullablePointer(0);
        if (viewSource !== null) deleteViewSource.call(viewSource, 1);
    },
    () => procHacker.js("??1CommandArea@@QEAA@XZ", void_t, { this: CommandArea }),
);
CommandArea.prototype.getDimensionBlockSource = derived(
    "?getDimensionBlockSource@CommandArea@@QEAAAEAVBlockSource@@XZ",
    function (this: CommandArea): BlockSource {
        const viewSource = (this as unknown as StaticPointer).getPointer(0);
        return viewSource.getPointerAs(Dimension, CHUNK_SOURCE_DIMENSION).getBlockSource();
    },
    () => procHacker.js("?getDimensionBlockSource@CommandArea@@QEAAAEAVBlockSource@@XZ", BlockSource, { this: CommandArea }),
);
const FIND_AREA_KEY = "?findArea@CommandAreaFactory@@QEBA?AV?$unique_ptr@VCommandArea@@U?$default_delete@VCommandArea@@@std@@@std@@AEBVBlockPos@@0_N11@Z";
let getArea: ((this: CommandAreaFactory, bounds: VoidPointer, b: boolean, b2: boolean, b3: boolean) => CommandArea | null) | null = null;
CommandAreaFactory.prototype.findArea = derived(
    FIND_AREA_KEY,
    function (this: CommandAreaFactory, pos1: BlockPos, pos2: BlockPos, b: boolean, b2: boolean, b3: boolean): CommandArea | null {
        getArea ??= procHacker.js("bdsx:CommandAreaFactory::_getArea", CommandArea.ref(), { structureReturn: true, this: CommandAreaFactory }, VoidPointer, bool_t, bool_t, bool_t);
        // Bounds: min and max chunk corner (y 0), the extents, the cell count twice and 16
        const x1 = pos1.x >> 4;
        const z1 = pos1.z >> 4;
        const x2 = pos2.x >> 4;
        const z2 = pos2.z >> 4;
        const dx = x2 - x1 + 1;
        const dz = z2 - z1 + 1;
        const bounds = new AllocatedPointer(0x30);
        [x1, 0, z1, x2, 0, z2, dx, 1, dz, dx * dz, dx * dz, 16].forEach((v, i) => bounds.setInt32(v, i * 4));
        const area = getArea.call(this, bounds, b, b2, b3);
        return area !== null && !(area as unknown as StaticPointer).isNull() ? area : null;
    },
    () =>
        procHacker.js(
            FIND_AREA_KEY,
            CommandArea.ref(),
            { structureReturn: true, this: CommandAreaFactory },
            BlockPos,
            BlockPos,
            bool_t,
            bool_t,
            bool_t,
        ),
);
