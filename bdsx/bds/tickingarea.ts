import { abstract } from "../common";
import { CxxVector } from "../cxxvector";
import { nativeClass, NativeClass } from "../nativeclass";
import { bool_t } from "../nativetype";
import { procHacker } from "../prochacker";
import { engineLayout } from "./engine/deps";
import { derived } from "./symbols";
import { CxxSharedPtr } from "../sharedpointer";
import { ChunkPos } from "./blockpos";
import { LevelChunk } from "./chunk";

@nativeClass()
export class ITickingAreaView extends NativeClass {
    getAvailableChunk(pos: ChunkPos): CxxSharedPtr<LevelChunk> {
        abstract();
    }
}

@nativeClass()
export class ITickingArea extends NativeClass {
    isRemoved(): boolean {
        abstract();
    }

    getView(): ITickingAreaView {
        abstract();
    }
}

@nativeClass()
export class TickingAreaList extends NativeClass {
    getAreas(): CxxVector<CxxSharedPtr<ITickingArea>> {
        abstract();
    }
}

ITickingAreaView.prototype.getAvailableChunk = procHacker.jsv(
    "??_7TickingAreaView@@6B@",
    "?getAvailableChunk@TickingAreaView@@UEAA?AV?$shared_ptr@VLevelChunk@@@std@@AEBVChunkPos@@@Z",
    CxxSharedPtr.make(LevelChunk),
    { this: ITickingAreaView, structureReturn: true },
    ChunkPos,
);

ITickingArea.prototype.isRemoved = procHacker.jsv("??_7TickingArea@@6B@", "?isRemoved@TickingArea@@UEAA_NXZ", bool_t, { this: ITickingArea });

ITickingArea.prototype.getView = procHacker.jsv("??_7TickingArea@@6B@", "?getView@TickingArea@@UEAAAEAVITickingAreaView@@XZ", ITickingAreaView, {
    this: ITickingArea,
});

// 2024's getAreas is `lea 8(%rcx)`: the vector<shared_ptr<ITickingArea>> right after the list's vftable. 1.26 keeps it
// there on both builds (ServerPlayer::moveView and the inlined TickingAreaListBase::add read +8/+0x10/+0x18) and has no
// out-of-line copy (docs/findings-blocks.md "Ticking areas").
const TICKING_AREA_LIST_AREAS = engineLayout("TickingAreaListBase", "areas", 8);
const TickingAreaVector = CxxVector.make(CxxSharedPtr.make(ITickingArea));
TickingAreaList.prototype.getAreas = derived(
    "?getAreas@TickingAreaListBase@@QEBAAEBV?$vector@V?$shared_ptr@VITickingArea@@@std@@V?$allocator@V?$shared_ptr@VITickingArea@@@std@@@2@@std@@XZ",
    function (this: TickingAreaList): CxxVector<CxxSharedPtr<ITickingArea>> {
        return this.addAs(TickingAreaVector, TICKING_AREA_LIST_AREAS);
    },
    () =>
        procHacker.js(
            "?getAreas@TickingAreaListBase@@QEBAAEBV?$vector@V?$shared_ptr@VITickingArea@@@std@@V?$allocator@V?$shared_ptr@VITickingArea@@@std@@@2@@std@@XZ",
            TickingAreaVector,
            { this: TickingAreaList },
        ),
);
