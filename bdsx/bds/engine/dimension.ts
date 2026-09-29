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
import { float32_t, int16_t, int32_t } from "../../nativetype";
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

/**
 * Dimension::sky_darken_ (Brightness, one byte): Endstone dimension.h puts ultra_warm_ at +422, then has_ceiling_,
 * has_skylight_, sky_darken_ (+425 = 0x1a9), then dispatcher_ at +432. 2024's isDay (0x1f4bd30) is
 * `cmpb $0x4, 0x170(%rcx); setb %al`; 1.26 inlines it with the same constant at the new offset (40 0x215163,
 * 51 0x2a2963: `cmpb $0x4, 0x1a9(%rbx); jb`). docs/findings-layouts.md "Dimension::isDay".
 */
const DIMENSION_SKY_DARKEN = engineLayout("Dimension", "skyDarken", 0x170);
export function dimensionIsDay(dimension: StaticPointer): boolean {
    return dimension.getUint8(DIMENSION_SKY_DARKEN) < 4;
}

/**
 * Dimension::getTimeOfDay(int time, float alpha), a virtual: slot 30 on both 1.26 builds (2024: +0xe8, slot 29).
 * OverworldDimension's (40 0x178f880, 51 0x1886900, the same code) takes time % 24000 (`imul $0x5dc0`), adds alpha,
 * divides and folds it into [0, 1), then the cosine easing. The caller that shows the slot (Overworld slot 32, 40
 * 0x178bd60) checks the DoDaylightCycle rule (alpha 0 when it is off), reads the level's time and calls +0xf0.
 * docs/findings-layouts.md "Dimension::getTimeOfDay".
 */
export const DIMENSION_TIME_OF_DAY_SLOT = engineLayout("Dimension", "getTimeOfDaySlot", 29);
const timeOfDayBySlot = new Map<string, (self: VoidPointer, time: number, alpha: number) => number>();
export function dimensionTimeOfDay(dimension: StaticPointer, time: number, alpha: number): number {
    const fn = dimension.getPointer(0).getPointer(DIMENSION_TIME_OF_DAY_SLOT * 8);
    const key = fn.toString();
    let call = timeOfDayBySlot.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, float32_t, null, VoidPointer, int32_t, float32_t);
        timeOfDayBySlot.set(key, call);
    }
    return call(dimension, time, alpha);
}
