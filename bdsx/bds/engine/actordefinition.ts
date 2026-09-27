/**
 * Building an ActorDefinitionIdentifier (engine layer; docs/findings-layouts.md "ActorDefinitionIdentifier and
 * spawnEntityAt").
 *
 * The object is 0xb0 bytes on both 1.26 builds, as in 2024: namespace (+0x00), identifier (+0x20), initEvent (+0x40),
 * fullName (+0x60), each a std::string, then a HashedString canonicalName (+0x80: hash, string +0x88, last-match
 * pointer +0xa8). Every constructor below writes exactly +0x00..+0xaf and ends in _initialize.
 *
 * - From a string, `ActorDefinitionIdentifier(const std::string&)` is still out of line with 2024's body: clear all
 *   five members, _extractIdentifier(name, *this), _initialize() (40 0x18ffbe0, 51 0x1ce0310). Same signature, so it
 *   ships under its own decorated name.
 * - From an ActorType, 2024's one-argument constructor is gone. What is left is a constructor that also takes the init
 *   event, by value: `ActorDefinitionIdentifier(ActorType, std::string)` (40 0x18ffd00, 51 0x1ce0430). "minecraft"
 *   into namespace, EntityTypeIdWithoutCategories(type) into identifier, the moved string into initEvent,
 *   EntityCanonicalName(type) copied into canonicalName, _initialize(), then it destroys its by-value string. 2024's
 *   one-argument body is the same with an empty initEvent, so bdsx passes an empty one. No decoration for it is
 *   knowable, so it ships under a bdsx: key.
 */
import { AllocatedPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { CxxString, int32_t, void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const FROM_STRING = engineSymbol("??0ActorDefinitionIdentifier@@QEAA@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z");
const FROM_TYPE_AND_INIT_EVENT = engineSymbol("bdsx:ActorDefinitionIdentifier::ActorDefinitionIdentifier(ActorType,std::string)");

let fromString: ((target: VoidPointer, name: string) => void) | null = null;
let fromTypeAndInitEvent: ((target: VoidPointer, type: number, initEvent: VoidPointer) => void) | null = null;

/** an empty small std::string (size 0, capacity 15): what a moved-from string is, so the callee's destructor frees nothing */
function emptyString(): AllocatedPointer {
    const p = new AllocatedPointer(0x20);
    for (let i = 0; i < 0x20; i += 4) p.setInt32(0, i);
    p.setInt32(0xf, 0x18);
    return p;
}

/** constructs an ActorDefinitionIdentifier in place at `target` (0xb0 bytes), from a name or an ActorType */
export function constructActorDefinitionIdentifier(target: VoidPointer, type: string | number): void {
    if (typeof type === "number") {
        if (FROM_TYPE_AND_INIT_EVENT === null) throw Error("ActorDefinitionIdentifier(ActorType, std::string): no address in this build");
        if (fromTypeAndInitEvent === null) fromTypeAndInitEvent = makefunc.js(FROM_TYPE_AND_INIT_EVENT, void_t, null, VoidPointer, int32_t, VoidPointer);
        fromTypeAndInitEvent(target, type | 0, emptyString());
    } else {
        if (FROM_STRING === null) throw Error("ActorDefinitionIdentifier(const std::string&): no address in this build");
        if (fromString === null) fromString = makefunc.js(FROM_STRING, void_t, null, VoidPointer, CxxString);
        fromString(target, type);
    }
}
