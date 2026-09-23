/**
 * Dimension virtuals bdsx calls by slot (engine layer; docs/findings-slots.md "isInClouds").
 *
 * Dimension's primary table is IDimension's fifteen virtuals followed by Dimension's own (Endstone 0.11.7 / HEAD
 * dimension.h); getCloudHeight is the tenth of those, slot 24 on both 1.26 builds (2024: 21). Read live on both builds:
 * NetherDimension's is `mov ax,0x80; ret`, TheEndDimension's `mov ax,8; ret`, OverworldDimension's returns 192 (128
 * behind an old-world version gate), and slot 23 is getBrightnessDependentFogColor (copies its Color argument).
 */
import { StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { int16_t } from "../../nativetype";
import { engineLayout } from "./deps";

export const DIMENSION_CLOUD_HEIGHT_SLOT = engineLayout("Dimension", "getCloudHeightSlot", 21);

const cloudHeightBySlot = new Map<string, (self: VoidPointer) => number>();

/** Dimension::getCloudHeight, through the dimension's own vftable (one wrapper per dimension class) */
export function dimensionCloudHeight(dimension: StaticPointer): number {
    const fn = dimension.getPointer(0).getPointer(DIMENSION_CLOUD_HEIGHT_SLOT * 8);
    const key = fn.toString();
    let call = cloudHeightBySlot.get(key);
    if (call === undefined) {
        const native = makefunc.js(fn, int16_t, null, VoidPointer);
        call = (self: VoidPointer) => native(self);
        cloudHeightBySlot.set(key, call);
    }
    return call(dimension);
}
