import { asm, Register } from "./assembler";
import { AllocatedPointer } from "./core";
import { NativeClass, NativeClassType } from "./nativeclass";
import { procHacker } from "./prochacker";

interface ThisGetterItem<DEST> {
    type: NativeClassType<any>;
    key: keyof DEST;
    buffer: AllocatedPointer;
}

/**
 * Every buffer a hook writes into, for as long as the process runs. The hook's code holds the buffer's address,
 * and a hook is never removed, so the buffer must never be collected: finish() used to drop the only reference,
 * the next GC freed the buffer, and every later call of a hooked function that runs again after serverOpen
 * (ServerNetworkHandler::updateServerAnnouncement, CommandRegistry::registerCommand) wrote `this` into freed heap.
 * On 1.26.51.1 that killed about one fresh bdsx server in ten at its first player's join or at `stop`
 * (docs/findings-gamethread.md "The fresh-boot bisect").
 */
const hookBuffers: AllocatedPointer[] = [];

export class ThisGetter<DEST> {
    private items: ThisGetterItem<DEST>[] = [];

    constructor(private readonly dest: DEST) {}

    register<T extends NativeClass>(type: new () => T, symbol: string, key: keyof DEST): void {
        const buffer = new AllocatedPointer(8);
        buffer.setPointer(null); // stays null when the constructor symbol is missing and the hook is skipped
        hookBuffers.push(buffer);
        this.items.push({ type: type as NativeClassType<T>, key, buffer });
        const code = asm().stack_c(0x28).mov_r_c(Register.r10, buffer).mov_rp_r(Register.r10, 1, 0, Register.rcx).alloc();
        procHacker.hookingRawWithCallOriginal(symbol, code, [], []);
    }

    finish(): void {
        const items = this.items;
        this.items = [];
        for (const item of items) {
            const ptr = item.buffer.getPointer();
            this.dest[item.key] = (ptr === null || ptr.isNull() ? null : item.buffer.getPointerAs(item.type)) as any;
        }
    }
}
