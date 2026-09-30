/**
 * BlockActor's container and custom name on 1.26 (engine layer; docs/findings-containers.md section 24).
 *
 * 2024 kept both on BlockActor itself: `getCustomName` a `std::string const&`, `setCustomName` a virtual over `std::string`,
 * and `getContainer` a virtual with per-type overrides. 1.26 moved all three onto VanillaBlockActor's first interface,
 * IVanillaMainBlockActorComponent (Endstone vanilla_block_actor.h), whose sub-object is at BlockActor+40 on 1.26.40.8 and
 * +48 on 1.26.51.1 (the base grew by one pointer). Its vftable has 27 slots on both builds, in Endstone's order:
 *
 *   2, 3  getContainer (const / non-const; the same function in every table read, `lea 0xe8(%rcx),%rax` for a chest and
 *         `xor eax,eax` for a block actor without one; the reverse-order rule puts them next to each other)
 *   8     hasCustomName      `cmpq $0, 0x68(%rcx); setne al`  (the custom name's size)
 *   9     getCustomName      `lea 0x58(%rcx),%rax`  (the RedactableString, whose first member is the std::string)
 *   10    setCustomName      `RedactableString::operator=(this+0x58, rdx)`, then clears the filtered name at +0xa0
 *
 * A Bedrock::Safety::RedactableString is 0x48 bytes: the raw std::string at +0 and a std::optional<std::string> at
 * +0x20 (engaged flag +0x40), the shape RedactableString's assignment reads (40 0x970420, 51 0xc3f1c0). setCustomName
 * builds one with no filtered part.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, CxxString, NativeType, void_t } from "../../nativetype";
import { engineLayout } from "./deps";

const MAIN_INTERFACE = engineLayout("BlockActor", "mainInterface", 0);
const GET_CONTAINER_SLOT = engineLayout("BlockActor", "getContainerSlot", 3);
const HAS_CUSTOM_NAME_SLOT = engineLayout("BlockActor", "hasCustomNameSlot", 8);
const GET_CUSTOM_NAME_SLOT = engineLayout("BlockActor", "getCustomNameSlot", 9);
const SET_CUSTOM_NAME_SLOT = engineLayout("BlockActor", "setCustomNameSlot", 10);
const REDACTABLE_STRING_SIZE = 0x48;

const calls = new Map<string, (...args: any[]) => any>();
function slotCall<T extends (...args: any[]) => any>(iface: StaticPointer, slot: number, make: (fn: VoidPointer) => T): T {
    const fn = iface.getPointer(0).getPointer(slot * 8);
    const key = fn.toString();
    let call = calls.get(key);
    if (call === undefined) {
        call = make(fn);
        calls.set(key, call);
    }
    return call as T;
}
const mainInterface = (blockActor: StaticPointer): StaticPointer => (blockActor as any as VoidPointer).add(MAIN_INTERFACE) as any as StaticPointer;

/** the address of the BlockActor's Container through its own virtual: null for one that holds none */
export function blockActorGetContainer(blockActor: StaticPointer): VoidPointer | null {
    const iface = mainInterface(blockActor);
    const p = slotCall(iface, GET_CONTAINER_SLOT, fn => makefunc.js(fn, VoidPointer, null, VoidPointer))(iface) as VoidPointer;
    return p === null || p.isNull() ? null : p;
}

export function blockActorHasCustomName(blockActor: StaticPointer): boolean {
    const iface = mainInterface(blockActor);
    return slotCall(iface, HAS_CUSTOM_NAME_SLOT, fn => makefunc.js(fn, bool_t, null, VoidPointer))(iface);
}

export function blockActorGetCustomName(blockActor: StaticPointer): string {
    const iface = mainInterface(blockActor);
    const p = slotCall(iface, GET_CUSTOM_NAME_SLOT, fn => makefunc.js(fn, VoidPointer, null, VoidPointer))(iface) as VoidPointer;
    return p.as(StaticPointer).getCxxString();
}

/**
 * Runs `use` with a temporary Bedrock::Safety::RedactableString holding `name` (a zeroed 0x48-byte block with a constructed
 * raw std::string and no filtered part) and destroys it again.
 */
export function withRedactableString<T>(name: string, use: (redactable: VoidPointer) => T): T {
    const tmp = new AllocatedPointer(REDACTABLE_STRING_SIZE);
    tmp.fill(0, REDACTABLE_STRING_SIZE);
    CxxString[NativeType.ctor](tmp as any);
    try {
        tmp.setCxxString(name);
        return use(tmp);
    } finally {
        CxxString[NativeType.dtor](tmp as any);
    }
}

export function blockActorSetCustomName(blockActor: StaticPointer, name: string): void {
    const iface = mainInterface(blockActor);
    const call = slotCall(iface, SET_CUSTOM_NAME_SLOT, fn => makefunc.js(fn, void_t, null, VoidPointer, VoidPointer));
    withRedactableString(name, tmp => call(iface, tmp));
}
