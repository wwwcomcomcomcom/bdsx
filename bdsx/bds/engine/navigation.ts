/**
 * NavigationComponent on 1.26 (engine layer; docs/findings-components.md, section NavigationComponent).
 *
 * The component is an EnTT element (hash fnv1a "NavigationComponent" = 0xbb725ebe) of 0x60 bytes on both builds
 * (2024: 0x70). Its fields, each read off a live mob on both builds and set against the behaviour packs' own JSON:
 *
 *   +0x00 u16 bit field: bit 2 avoid_sun, bit 3 avoid_water, bit 5 can_path_over_water (bdsx's canFloat), bit 6
 *         can_path_over_lava (2024 kept the same bit numbers as byte offsets +2 +3 +5 +6)
 *   +0x04 i32 the tick the last stuck check ran against          +0x0c i32 the tick of the last stuck check
 *   +0x14 f32 speed                                              +0x1c Vec3 the position of the last stuck check
 *   +0x50 the PathNavigation object (a polymorphic heap object)  +0x58 the owned Path (unique_ptr, null when idle)
 *
 * 2024 had every one of these as a leaf in NavigationComponent's own out-of-line members, 0x10 further out (the
 * fields after the bit field moved by exactly 0x10 -- the flags packed from separate bytes into one word). The three
 * that ran PathNavigation code are forwarders through the navigation object's vftable -- stop is slot 9, createPath
 * for an Actor slot 4, createPath for a Vec3 slot 5 -- and 1.26's slot bodies have 2024's shapes (slot 9 is
 * `path = null; delete old` over the component in rdx and one entt lookup; slots 4 and 5 test slot 11 and call into
 * the Mob's own navigation). Every offset is a layouts.NavigationComponent entry; the fallbacks are 2024's.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { msAlloc } from "../../msalloc";
import { void_t } from "../../nativetype";
import type { Actor, Mob } from "../actor";
import { AttributeId } from "../attribute";
import { Vec3 } from "../blockpos";
import { engineLayout, componentHash } from "./deps";
import { enttComponent } from "./entt";

export const NAVIGATION_HASH = componentHash("NavigationComponent");
export const NAVIGATION_SIZE = engineLayout("NavigationComponent", "size", 0x70);
const FLAGS = engineLayout("NavigationComponent", "flags", 0);
const TICK = engineLayout("NavigationComponent", "tick", 0x14);
const STUCK_TICK = engineLayout("NavigationComponent", "stuckTick", 0x1c);
const SPEED = engineLayout("NavigationComponent", "speed", 0x24);
const LAST_STUCK_POSITION = engineLayout("NavigationComponent", "lastStuckPosition", 0x2c);
const NAVIGATION = engineLayout("NavigationComponent", "navigation", 0x60);
const PATH = engineLayout("NavigationComponent", "path", 0x68);
const STOP_SLOT = engineLayout("PathNavigation", "stopSlot", 9);
const CREATE_PATH_ACTOR_SLOT = engineLayout("PathNavigation", "createPathActorSlot", 4);
const CREATE_PATH_VEC3_SLOT = engineLayout("PathNavigation", "createPathVec3Slot", 5);
/** Path: the node vector's begin/end/capacity at +0, +8, +0x10, the node cursor at +0x18; 0x28 bytes */
const PATH_END = 8;
const PATH_CAPACITY = 0x10;
const PATH_CURSOR = 0x18;
const PATH_NODE_SIZE = 0x10;
const PATH_SIZE = 0x28;

const AVOID_SUN_BIT = 2;
const AVOID_WATER_BIT = 3;
const CAN_FLOAT_BIT = 5;
const CAN_PATH_OVER_LAVA_BIT = 6;

const at = (self: unknown): StaticPointer => self as StaticPointer;

/** the actor's NavigationComponent, or null when it holds none */
export function navigationComponent(actor: Actor): StaticPointer | null {
    return enttComponent(actor, NAVIGATION_HASH, NAVIGATION_SIZE);
}

function bit(self: unknown, n: number): boolean {
    return ((at(self).getUint8(FLAGS + (n >> 3)) >> (n & 7)) & 1) !== 0;
}
function setBit(self: unknown, n: number, value: boolean): void {
    const p = at(self);
    const off = FLAGS + (n >> 3);
    const mask = 1 << (n & 7);
    const cur = p.getUint8(off);
    p.setUint8(value ? cur | mask : cur & ~mask, off);
}

export const navigationOwn = {
    getAvoidSun: (self: unknown): boolean => bit(self, AVOID_SUN_BIT),
    setAvoidSun: (self: unknown, v: boolean): void => setBit(self, AVOID_SUN_BIT, v),
    setAvoidWater: (self: unknown, v: boolean): void => setBit(self, AVOID_WATER_BIT, v),
    getAvoidWater: (self: unknown): boolean => bit(self, AVOID_WATER_BIT),
    getCanFloat: (self: unknown): boolean => bit(self, CAN_FLOAT_BIT),
    setCanFloat: (self: unknown, v: boolean): void => setBit(self, CAN_FLOAT_BIT, v),
    getCanPathOverLava: (self: unknown): boolean => bit(self, CAN_PATH_OVER_LAVA_BIT),
    getSpeed: (self: unknown): number => at(self).getFloat32(SPEED),
    setSpeed: (self: unknown, v: number): void => at(self).setFloat32(v, SPEED),
    /** a copy: 2024 returned the Vec3 by value */
    getLastStuckCheckPosition: (self: unknown): Vec3 => {
        const p = at(self);
        const out = Vec3.allocate();
        out.x = p.getFloat32(LAST_STUCK_POSITION);
        out.y = p.getFloat32(LAST_STUCK_POSITION + 4);
        out.z = p.getFloat32(LAST_STUCK_POSITION + 8);
        return out;
    },
    /** 2024: (tick - stuckTick) > t */
    isStuck: (self: unknown, t: number): boolean => at(self).getInt32(TICK) - at(self).getInt32(STUCK_TICK) > t,
    /** 2024: FOLLOW_RANGE's current value on the actor */
    getMaxDistance: (actor: Actor): number => actor.getAttribute(AttributeId.FollowRange),
    /** 2024: no path, or the path's cursor at or past its last node */
    isDone: (self: unknown): boolean => {
        const path = at(self).getNullablePointer(PATH);
        if (path === null) return true;
        const begin = path.getPointer(0);
        return path.getUint32(PATH_CURSOR) >= path.getPointer(PATH_END).subptr(begin) / PATH_NODE_SIZE;
    },
};

/** frees a Path the way 1.26's own deletion does: the node vector's storage, then the 0x28 bytes */
function destroyPath(path: StaticPointer): void {
    const begin = path.getNullablePointer(0);
    if (begin !== null) msAlloc.deallocate(begin, path.getPointer(PATH_CAPACITY).subptr(begin));
    msAlloc.deallocate(path, PATH_SIZE);
}

/** NavigationComponent::setPath(unique_ptr<Path>): the component takes the path over, the old one is deleted */
export function navigationSetPath(self: unknown, path: StaticPointer | null): void {
    const p = at(self);
    const old = p.getNullablePointer(PATH);
    if (old !== null && path !== null && old.equals(path)) return;
    if (path === null) {
        p.setUint32(0, PATH);
        p.setUint32(0, PATH + 4);
    } else {
        p.setPointer(path, PATH);
    }
    if (old !== null) destroyPath(old);
}

const vfn = (nav: StaticPointer, slot: number): VoidPointer => nav.getPointer(0).getPointer(slot * 8);
// the slot's address is per build and per class (a spider's navigation is not a zombie's), so the call is built on first use
const fnCache = new Map<string, any>();
function slotFn(kind: "stop" | "create", address: VoidPointer): any {
    const key = `${kind}:${address}`;
    let f = fnCache.get(key);
    if (f === undefined) {
        f = kind === "stop" ? makefunc.js(address, void_t, null, VoidPointer, VoidPointer, VoidPointer) : makefunc.js(address, VoidPointer, null, VoidPointer, VoidPointer, VoidPointer, VoidPointer, VoidPointer);
        fnCache.set(key, f);
    }
    return f;
}

/** NavigationComponent::stop(Mob&): the navigation object's slot 9 over this component */
export function navigationStop(self: unknown, mob: Mob): void {
    const nav = at(self).getNullablePointer(NAVIGATION);
    if (nav === null) return;
    slotFn("stop", vfn(nav, STOP_SLOT))(nav, self, mob);
}

/** NavigationComponent::createPath(Mob&, Actor&/Vec3 const&): the caller owns the returned Path (give it to setPath) */
export function navigationCreatePath(self: unknown, mob: Mob, target: unknown, isVec3: boolean): StaticPointer | null {
    const nav = at(self).getNullablePointer(NAVIGATION);
    if (nav === null) return null;
    const sret = new AllocatedPointer(8);
    sret.setUint32(0, 0);
    sret.setUint32(0, 4);
    slotFn("create", vfn(nav, isVec3 ? CREATE_PATH_VEC3_SLOT : CREATE_PATH_ACTOR_SLOT))(nav, sret, self, mob, target);
    return sret.getNullablePointer(0);
}
