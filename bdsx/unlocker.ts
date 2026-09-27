import { VoidPointer } from "./core";
import { dll } from "./dll";
import { PAGE_EXECUTE_WRITECOPY } from "./windows_h";

const int32buffer = new Int32Array(1);
// BDSX_LOG_PATCHES=1 prints every code write (address, size, the JS frames that made it): the full list
// of what bdsx patches into the running server (docs/findings-gamethread.md "The fresh-boot bisect").
const logPatches = process.env.BDSX_LOG_PATCHES === "1";

export class MemoryUnlocker implements Disposable {
    private readonly oldprotect: number;

    constructor(private readonly ptr: VoidPointer, private readonly size: number) {
        if (!dll.kernel32.VirtualProtect(ptr, size, PAGE_EXECUTE_WRITECOPY, int32buffer)) throw Error(`${ptr}: ${size} bytes, Failed to unprotect memory`);
        this.oldprotect = int32buffer[0];
        if (logPatches) {
            const frames = (new Error().stack || "").split("\n").slice(2, 6).map(l => l.trim()).join(" <- ");
            console.error(`[patch] ${ptr} ${size} bytes: ${frames}`);
        }
    }

    done(): void {
        if (!dll.kernel32.VirtualProtect(this.ptr, this.size, this.oldprotect, int32buffer))
            throw Error(`${this.ptr}: ${this.size} bytes, Failed to re-protect memory`);
    }

    [Symbol.dispose](): void {
        this.done();
    }
}
