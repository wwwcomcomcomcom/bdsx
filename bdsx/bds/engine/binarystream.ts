/**
 * BinaryStream / ReadOnlyBinaryStream made from JS (engine layer; docs/findings-inventory.md section 22).
 *
 * 1.26 has no out-of-line constructor for either stream (every caller inlines it: 195 functions store the
 * BinaryStream vftable), so bdsx lays the object out itself and lets the engine's virtual methods do the work.
 * The layout is the same on both builds and was read off the engine's own inlined constructor and off `read`/`writeByte`
 * (40 0x82b050 / 0x82bcc0, 51 0x8b89b0 / 0x8b9580):
 *
 *   +0x00 vftable        ReadOnlyBinaryStream's (2 slots: dtor, read) or BinaryStream's (29 slots: + the write* family)
 *   +0x08 std::string    owned_buffer_ (0x20)
 *   +0x28 const char*    view_ data   `read` copies from here + read_pointer; every write* refreshes it from the buffer
 *   +0x30 size_t         view_ size
 *   +0x38 size_t         read_pointer_
 *   +0x40 bool           has_overflowed_  (a failed `read` sets it, and the next `read` fails at once)
 *   +0x48 std::string*   BinaryStream only: buffer_, the string every write* appends to
 *
 * A writer's buffer_ points at its own owned_buffer_; a reader views a byte buffer bdsx keeps alive.
 */
import { AllocatedPointer, StaticPointer } from "../../core";
import { CxxStringWrapper } from "../../pointer";
import { BinaryStream } from "../stream";
import { engineSymbol } from "./deps";

const STRING_AT = 8;
const VIEW_DATA = 0x28;
const VIEW_SIZE = 0x30;
const READ_POINTER = 0x38;
const OVERFLOWED = 0x40;
const BUFFER_REF = 0x48;
const READER_SIZE = 0x48;
const WRITER_SIZE = 0x50;

function constructString(mem: StaticPointer): CxxStringWrapper {
    const str = mem.addAs(CxxStringWrapper, STRING_AT);
    str.construct();
    return str;
}

/** A BinaryStream the engine can write into. Read the bytes with `bytes()`, then `dispose()`. */
export class JsBinaryStream {
    private readonly mem: AllocatedPointer;
    private readonly str: CxxStringWrapper;
    readonly stream: BinaryStream;

    constructor() {
        const vft = engineSymbol("??_7BinaryStream@@6B@");
        if (vft === null) throw Error("BinaryStream: no vftable in this build's symbols.json");
        this.mem = new AllocatedPointer(WRITER_SIZE);
        this.mem.fill(0, WRITER_SIZE);
        this.mem.setPointer(vft, 0);
        this.str = constructString(this.mem);
        this.mem.setPointer(this.mem.add(STRING_AT), BUFFER_REF);
        this.mem.setPointer(this.str.valueptr, VIEW_DATA);
        this.stream = this.mem.as(BinaryStream);
    }

    /** what the engine wrote so far */
    bytes(): Uint8Array {
        return this.str.valueptr.getBuffer(this.str.length);
    }

    dispose(): void {
        this.str.destruct();
    }
}

/** A ReadOnlyBinaryStream over `data` (not copied: the object keeps its own copy). */
export class JsReadOnlyBinaryStream {
    private readonly mem: AllocatedPointer;
    private readonly data: AllocatedPointer;
    readonly stream: BinaryStream;

    constructor(data: Uint8Array) {
        const vft = engineSymbol("??_7ReadOnlyBinaryStream@@6B@");
        if (vft === null) throw Error("ReadOnlyBinaryStream: no vftable in this build's symbols.json");
        this.data = new AllocatedPointer(Math.max(data.length, 1));
        this.data.setBuffer(data);
        this.mem = new AllocatedPointer(READER_SIZE);
        this.mem.fill(0, READER_SIZE);
        this.mem.setPointer(vft, 0);
        constructString(this.mem);
        this.mem.setPointer(this.data, VIEW_DATA);
        this.mem.setInt64WithFloat(data.length, VIEW_SIZE);
        this.stream = this.mem.as(BinaryStream);
    }

    /** bytes the engine has consumed so far */
    get readPointer(): number {
        return this.mem.getInt64AsFloat(READ_POINTER);
    }
    get overflowed(): boolean {
        return this.mem.getUint8(OVERFLOWED) !== 0;
    }

    dispose(): void {
        this.mem.addAs(CxxStringWrapper, STRING_AT).destruct();
    }
}
