/**
 * The StructureManager behind a Level (engine layer; docs/findings-nbt.md "StructureTemplate").
 *
 * 1.26's Bedrock::NonOwnerPointer<T> is 24 bytes { control, its count block, the object } (the same shape
 * engine/simulatedplayer.ts builds for ServerNetworkHandler). Level::getStructureManager (40 0x72d300 / 51 0x7c5190)
 * copies Level+0x2c0..+0x2d0 into its struct return, adds a use on the count block (`lock incl 8(rep)`), and checks
 * the control byte is set. bdsx's Bedrock.NonOwnerPointer is the 2024 16-byte shape: through it bdsx read a wrong
 * pointer, and the call wrote 8 bytes past the 16 bdsx allocated for the return.
 *
 * This takes the object at +0x10 (StructureManager has no second base in front of it: its own destructor stores
 * ??_7StructureManager@@6B@ at +0, which launcher.ts checks) and drops the use at once, the way launcher.ts drops the
 * connector's: the Level keeps its own reference for as long as the server runs.
 */
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const GET = engineSymbol("?getStructureManager@Level@@UEAA?AV?$not_null@V?$NonOwnerPointer@VStructureManager@@@Bedrock@@@gsl@@XZ");

let getCall: ((level: VoidPointer, out: VoidPointer) => void) | null = null;
let slotCalls: Map<string, (rep: VoidPointer) => void> | null = null;

function vcall(rep: NativePointer, slot: number): void {
    slotCalls ??= new Map();
    const fn = rep.getPointer(0).getPointer(slot * 8);
    const key = fn.toString();
    let call = slotCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, void_t, null, VoidPointer);
        slotCalls.set(key, call);
    }
    call(rep);
}

/** std::_Ref_count_base::_Decref: uses at +8, weak at +0xc; _Destroy is slot 0, _Delete_this slot 1 */
function releaseUse(rep: NativePointer): void {
    if (rep.interlockedDecrement32(8) !== 0) return;
    vcall(rep, 0);
    if (rep.interlockedDecrement32(0xc) === 0) vcall(rep, 1);
}

/** the Level's StructureManager, or null when the build has no Level::getStructureManager */
export function levelStructureManager(level: StaticPointer): NativePointer | null {
    if (GET === null) return null;
    getCall ??= makefunc.js(GET, void_t, null, VoidPointer, VoidPointer);
    const out = new AllocatedPointer(0x18);
    out.fill(0, 0x18);
    getCall(level, out); // rcx = this, rdx = the struct return
    const object = out.getNullablePointer(0x10);
    const rep = out.getNullablePointer(8);
    if (rep !== null) releaseUse(rep);
    return object;
}
