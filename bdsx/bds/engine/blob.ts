/**
 * mce::Blob's constructor and destructor (engine layer; docs/findings-inventory.md section 11, findings-utils.md).
 *
 * The 24-byte layout is the same in 2024 and 1.26 (Endstone blob.h: `unique_ptr<uint8_t[], Deleter>` -- the deleter
 * is one function pointer, stored first -- then the size): +0 deleter, +8 bytes, +0x10 size. 2024's constructor
 * (0x279a880) stores &Blob::defaultDeleter, zeroes the pointer and the size; its destructor (0x279a980) calls the
 * deleter on the pointer when it is not null. The default deleter is `delete[]`, which is the ucrt `free` under the
 * premise msAlloc already rests on (findings-utils.md), so bdsx stores the ucrt free itself, which is also what
 * bdsx's own `capi.malloc` bytes need. A Blob the engine made keeps its own deleter at +0 and the destructor calls it.
 */
import { StaticPointer, VoidPointer } from "../../core";
import { dll } from "../../dll";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";

const BLOB_DELETER = 0;
const BLOB_BYTES = 8;
const BLOB_SIZE = 0x10;

let ucrtFree: VoidPointer | null = null;
const deleters = new Map<string, (bytes: VoidPointer) => void>();

export function blobConstruct(blob: StaticPointer): void {
    ucrtFree ??= dll.ucrtbase.module.getProcAddress("free");
    blob.setPointer(ucrtFree, BLOB_DELETER);
    blob.setPointer(null, BLOB_BYTES);
    blob.setInt64WithFloat(0, BLOB_SIZE);
}

export function blobDestruct(blob: StaticPointer): void {
    const bytes = blob.getPointer(BLOB_BYTES);
    if (bytes.isNull()) return;
    const fn = blob.getPointer(BLOB_DELETER);
    const key = fn.toString();
    let call = deleters.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, void_t, null, VoidPointer);
        deleters.set(key, call);
    }
    call(bytes);
}
