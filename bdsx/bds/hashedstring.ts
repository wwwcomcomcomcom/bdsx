import { StaticPointer, VoidPointer } from "../core";
import { makefunc } from "../makefunc";
import { nativeClass, NativeClass, nativeField } from "../nativeclass";
import { CxxString, NativeType, void_t } from "../nativetype";
import { procHacker } from "../prochacker";
import { derived } from "./symbols";

@nativeClass()
export class HashedString extends NativeClass {
    @nativeField(VoidPointer)
    hash: VoidPointer | null;
    @nativeField(CxxString)
    str: CxxString;
    @nativeField(HashedString.ref())
    recentCompared: HashedString | null;

    [NativeType.ctor](): void {
        this.hash = null;
        this.recentCompared = null;
    }

    set(str: string): void {
        this.str = str;
        this.hash = computeHash(this.add(str_offset));
    }
    static constructWith(str: string): HashedString {
        const hStr = new HashedString(true);
        HashedString$HashedString(hStr, str);
        return hStr;
    }
}
const HashedString$HashedString = procHacker.js(
    "??0HashedString@@QEAA@AEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    void_t,
    null,
    HashedString,
    CxxString,
);
const str_offset = HashedString.offsetOf("str");
/**
 * FNV-1 over the bytes of the string, 64-bit, stopping at the first NUL, with
 * the empty string hashing to zero -- which is what the 2024 body does:
 * basis 0xcbf29ce484222325, and per byte `hash = (hash * 0x100000001b3) ^ byte`
 * (the multiply comes first, so it is FNV-1 and not FNV-1a).
 *
 * Kept in 16-bit limbs because the runtime bdsx-core embeds has no BigInt, and
 * because a 16x16 product is the widest one a double holds exactly.
 */
function fnv1_64(bytes: Uint8Array): [number, number] {
    if (bytes.length === 0 || bytes[0] === 0) return [0, 0]; // the empty string hashes to zero, not to the basis
    const h = [0x2325, 0x8422, 0x9ce4, 0xcbf2]; // 0xcbf29ce484222325, least significant limb first
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte === 0) break; // the engine reads the C string, not the size
        // h *= 0x100000001b3, i.e. h * 0x1b3 + (h << 40), modulo 2**64
        const out = [0, 0, 0, 0];
        let carry = 0;
        for (let k = 0; k < 4; k++) {
            const t = h[k] * 0x1b3 + carry;
            out[k] = t & 0xffff;
            carry = Math.floor(t / 0x10000);
        }
        let add2 = (h[0] << 8) & 0xffff;
        let add3 = ((h[1] << 8) | (h[0] >>> 8)) & 0xffff;
        add2 += out[2];
        add3 += out[3] + (add2 >>> 16);
        out[2] = add2 & 0xffff;
        out[3] = add3 & 0xffff;
        out[0] ^= byte;
        h[0] = out[0];
        h[1] = out[1];
        h[2] = out[2];
        h[3] = out[3];
    }
    return [((h[1] << 16) | h[0]) >>> 0, ((h[3] << 16) | h[2]) >>> 0];
}

const computeHash: (str: VoidPointer) => VoidPointer = derived(
    "?computeHash@HashedString@@SA_KAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
    (str: VoidPointer): VoidPointer => {
        const text = (str as StaticPointer).getCxxString();
        const [low, high] = fnv1_64(Buffer.from(text, "utf8"));
        return VoidPointer.fromAddress(low, high);
    },
    () => procHacker.js("?computeHash@HashedString@@SA_KAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z", VoidPointer, null, VoidPointer),
);

/** exported for the execution check in tools/derived-probe.ts */
export function computeHashOf(text: string): VoidPointer {
    const [low, high] = fnv1_64(Buffer.from(text, "utf8"));
    return VoidPointer.fromAddress(low, high);
}

export const HashedStringToString = new NativeType<string>(
    HashedString.symbol,
    "HashedStringToString",
    HashedString[NativeType.size],
    HashedString[NativeType.align],
    v => typeof v === "string",
    undefined,
    (ptr, offset) => ptr.addAs(HashedString, offset).str,
    (ptr, value, offset) => ptr.addAs(HashedString, offset).set(value),
    undefined,
    undefined,
    HashedString[NativeType.ctor].bind(HashedString),
    HashedString[NativeType.dtor].bind(HashedString),
    HashedString[NativeType.ctor_copy].bind(HashedString),
    HashedString[NativeType.ctor_move].bind(HashedString),
);
HashedStringToString[makefunc.paramHasSpace] = true;
export type HashedStringToString = string;
