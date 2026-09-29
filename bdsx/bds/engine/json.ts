/**
 * Json::Value on 1.26 (engine layer; docs/findings-scoreboard.md 11.3).
 *
 * 16 bytes on both builds: the value at +0 and the type byte at +8 (the Value(ValueType) constructor, 40 0x9fd9830,
 * 51 0xa0f9df0). An array (type 6) holds a pointer to a `std::vector<Value*>` (operator[](unsigned), 40 0x9fdae00,
 * 51 0xa0fb3c0: `sar 3` on end-begin, each element a 0x10-byte Value on the heap). An object (type 7) holds a pointer
 * to a `std::map<CZString, Value>` { head +0, size +8 } whose 0x38-byte nodes keep the key's `const char*` at +0x20
 * and the Value at +0x28, the nil flag at +0x19 (operator[](const char*) const, 40 0x9fdb1e0, 51 0xa0fb7a0, compares
 * with strcmp and returns a static null Value when the key is absent). A string (type 4) holds a pointer to an
 * 8-byte holder of the `const char*` (Value(const std::string&), 40 0x9fd9a70, 51 0xa0fa030).
 *
 * These readers are what bdsx's JsonValue needs to read a parsed value back (`size`, `get`, `getMemberNames`,
 * `isMember`); no address of either build is involved.
 *
 * Inserting goes through the engine's two non-const lookups (docs/findings-scoreboard.md section 17). In 2024 the
 * non-const operator[](int) and operator[](const char*) were bare jumps (0x27a1d80, 0x27a1f20) to operator[](unsigned)
 * (0x27a1d90) and _resolveReference(const char*) (0x27a2480); 1.26 keeps no copy of the two jumps but ships both
 * targets, with 2024's bodies: operator[](unsigned) (40 0x9fdae00, 51 0xa0fb3c0) makes the value an array if it is
 * not one and resizes it to index + 1 when the index is past the end, each new element a null Value on the heap;
 * _resolveReference (40 0x9fdb970, 51 0xa0fbf30) makes it an object if it is not one and inserts a null member when
 * the key is absent. Both return the element in place.
 */
import { NativePointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { int32_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const TYPE = 8;
const ARRAY = 6;
const OBJECT = 7;

/** the elements of an array Value (empty for any other type) */
export function jsonArrayElements(value: VoidPointer): NativePointer[] {
    const p = value as NativePointer;
    if (p.getUint8(TYPE) !== ARRAY) return [];
    const vec = p.getNullablePointer(0);
    if (vec === null) return [];
    const begin = vec.getPointer(0);
    const n = (vec.getPointer(8).subptr(begin) / 8) | 0;
    const out: NativePointer[] = [];
    for (let i = 0; i < n; i++) out.push(begin.getPointer(i * 8));
    return out;
}

/** the members of an object Value in the map's (key) order, as [key, value] (empty for any other type) */
export function jsonObjectMembers(value: VoidPointer): [string, NativePointer][] {
    const p = value as NativePointer;
    if (p.getUint8(TYPE) !== OBJECT) return [];
    const map = p.getNullablePointer(0);
    if (map === null) return [];
    const head = map.getPointer(0);
    const out: [string, NativePointer][] = [];
    const visit = (node: NativePointer): void => {
        if (node.getUint8(0x19) !== 0) return;
        visit(node.getPointer(0));
        out.push([node.getPointer(0x20).getString(), node.add(0x28)]);
        visit(node.getPointer(0x10));
    };
    visit(head.getPointer(8));
    return out;
}

/** the member `key` of an object Value, or null */
export function jsonObjectGet(value: VoidPointer, key: string): NativePointer | null {
    for (const [k, v] of jsonObjectMembers(value)) if (k === key) return v;
    return null;
}

/** Value::size(): an array's element count, an object's member count, 0 otherwise */
export function jsonSize(value: VoidPointer): number {
    const p = value as NativePointer;
    const type = p.getUint8(TYPE);
    if (type === ARRAY) return jsonArrayElements(p).length;
    if (type === OBJECT) {
        const map = p.getNullablePointer(0);
        return map === null ? 0 : map.getInt32(8);
    }
    return 0;
}

const RESOLVE_REFERENCE = engineSymbol("?_resolveReference@Value@Json@@AEAAAEAV12@PEBD@Z");
const INDEX_UNSIGNED = engineSymbol("??AValue@Json@@QEAAAEAV01@I@Z");
let resolveReference: ((value: VoidPointer, key: string) => VoidPointer) | null = null;
let indexUnsigned: ((value: VoidPointer, index: number) => VoidPointer) | null = null;

/** the non-const operator[](const char*): the member `key`, inserted as null if absent; the value becomes an object */
export function jsonObjectMemberInsert(value: VoidPointer, key: string): VoidPointer {
    if (resolveReference === null) {
        if (RESOLVE_REFERENCE === null) throw Error("Json::Value::_resolveReference: no address in this build");
        resolveReference = makefunc.js(RESOLVE_REFERENCE, VoidPointer, null, VoidPointer, makefunc.Utf8);
    }
    return resolveReference(value, key);
}

/** the non-const operator[](unsigned): the element `index`, the array grown to hold it; the value becomes an array */
export function jsonArrayElementInsert(value: VoidPointer, index: number): VoidPointer {
    if (index < 0 || (index | 0) !== index) throw RangeError(`Json::Value: bad array index ${index}`);
    if (indexUnsigned === null) {
        if (INDEX_UNSIGNED === null) throw Error("Json::Value::operator[](unsigned): no address in this build");
        indexUnsigned = makefunc.js(INDEX_UNSIGNED, VoidPointer, null, VoidPointer, int32_t);
    }
    return indexUnsigned(value, index);
}
