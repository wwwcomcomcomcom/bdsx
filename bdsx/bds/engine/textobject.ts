/**
 * Translating a message id with parameters, as the engine does for a command's output (engine layer;
 * docs/findings-scoreboard.md section 16).
 *
 * 1.26 keeps TextObjectLocalizedTextWithParams out of line with 2024's shape (1.21.3.01 0x108d1f0 / 0x1091b40):
 *
 * - the constructor (40 0x2c4ad70, 51 0x2ec8d30) takes the id as a std::string by value and the parameters as a
 *   const std::vector<std::string>&. It stores the vftable (40 0xa6b2e80, 51 0xa7de7b0), moves the id to +8, puts a
 *   new 0x20-byte TextObjectRoot at +0x28 and adds one TextObjectText child per parameter. 0x30 bytes in all.
 *   The only callers are make_unique helpers (40 0x3f00f0, 51 0x429120), one of them in sendToAdmins.
 * - asString (vftable slot 1; 40 0x2c4b210, 51 0x2ec9140) gathers the children's strings (asStringVector, now
 *   inlined) and returns I18n::get(id, strings) from the engine's I18n (2024 called getI18n(); 1.26 inlines the
 *   static). rcx this, rdx the returned string.
 * - slot 0 is the deleting destructor: it deletes the root (and so the children) and frees the id; bit 0 of edx frees
 *   the 0x30 bytes too. bdsx owns that memory, so it passes 0.
 *
 * The two keep 2024's decorated names in the table: their parameters and return are unchanged.
 */
import { AllocatedPointer, VoidPointer } from "../../core";
import { CxxVector } from "../../cxxvector";
import { makefunc } from "../../makefunc";
import { CxxString, int32_t, void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const CTOR = engineSymbol(
    "??0TextObjectLocalizedTextWithParams@@QEAA@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEBV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@2@@Z",
);
const AS_STRING = engineSymbol("?asString@TextObjectLocalizedTextWithParams@@UEBA?AV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@XZ");

/** sizeof(TextObjectLocalizedTextWithParams): vftable, the id (0x20), unique_ptr<TextObjectRoot> */
const TEXT_OBJECT_SIZE = 0x30;

const CxxVector$string = CxxVector.make(CxxString);

let ctorCall: ((self: VoidPointer, id: string, params: VoidPointer) => void) | null = null;
let asStringCall: ((self: VoidPointer) => string) | null = null;
let deleteCall: ((self: VoidPointer, flags: number) => void) | null = null;

/**
 * What the engine's I18n makes of `id` with `params` (the server's language): the text of one CommandOutputMessage,
 * as CommandOutputSender::send prints it. bdsx's translateText (bds/implements.ts).
 */
export function translateText(id: string, params: CxxVector<CxxString> | readonly string[]): string {
    if (CTOR === null || AS_STRING === null) throw Error("TextObjectLocalizedTextWithParams: no address in this build");
    if (ctorCall === null) {
        const ctor = makefunc.js(CTOR, void_t, null, VoidPointer, CxxString, VoidPointer);
        ctorCall = (self, s, p) => ctor(self, s, p);
        const asString = makefunc.js(AS_STRING, CxxString, { this: VoidPointer, structureReturn: true });
        asStringCall = self => asString.call(self);
        const del = makefunc.js([0], void_t, { this: VoidPointer }, int32_t);
        deleteCall = (self, flags) => del.call(self, flags);
    }
    let owned: CxxVector<CxxString> | null = null;
    let vec: CxxVector<CxxString>;
    if (params instanceof CxxVector) {
        vec = params;
    } else {
        owned = CxxVector$string.construct();
        for (const p of params) owned.push(p);
        vec = owned;
    }
    const self = new AllocatedPointer(TEXT_OBJECT_SIZE);
    try {
        ctorCall(self, id, vec);
        try {
            return asStringCall!(self);
        } finally {
            deleteCall!(self, 0);
        }
    } finally {
        if (owned !== null) owned.destruct();
    }
}
