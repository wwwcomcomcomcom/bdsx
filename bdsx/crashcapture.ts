/**
 * What bdsx-core's crash report leaves out: the faulting RIP, the registers and the stack at the fault.
 *
 * bdsx-core catches a native crash in an SEH `__except` filter and prints a stack walk, but the release
 * build never prints the context's RIP, and when the fault is in code without unwind data -- bdsx's own
 * asm hooks and makefunc stubs, or a call through a garbage pointer -- the walk loses every frame up to
 * the next one it can unwind. On 1.26.51.1 a session died that way with only `gameThreadEntry +0x17`
 * (the return address after the whole game loop) and "0x3f800000" to go on (next-steps Q8).
 *
 * A vectored handler runs before any SEH filter and sees the full CONTEXT. This one is a few dozen
 * instructions of native code (it must not run JavaScript inside an exception): for every access
 * violation it copies ExceptionAddress, ExceptionInformation[0..1], the sixteen general registers, RIP
 * and 40 qwords from RSP into a four-entry ring, and returns EXCEPTION_CONTINUE_SEARCH -- so the
 * process behaves exactly as without it. Any access violation that something else handles and recovers
 * from passes through it as well, which is why it keeps a ring rather than one record: the fatal one is
 * the entry whose address matches the report.
 */
import { asm, OperationSize, Register } from "./assembler";
import { AllocatedPointer, cgate, VoidPointer } from "./core";
import { dllraw } from "./dllraw";
import { makefunc } from "./makefunc";
import { int32_t } from "./nativetype";
import { EXCEPTION_ACCESS_VIOLATION } from "./windows_h";

const SLOTS = 4; // a power of two: the slot is the counter masked
const RECORD = 0x200;
const STACK_QWORDS = 40;
const REGS = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15", "rip"];

// record layout
const R_SEQ = 0x00;
const R_ADDRESS = 0x08; // ExceptionRecord.ExceptionAddress
const R_INFO0 = 0x10; // ExceptionInformation[0]: 0 read, 1 write, 8 execute
const R_INFO1 = 0x18; // ExceptionInformation[1]: the address accessed
const R_REGS = 0x20; // CONTEXT.Rax .. CONTEXT.R15, CONTEXT.Rip (contiguous in CONTEXT from +0x78)
const R_STACK = R_REGS + REGS.length * 8;

let buffer: AllocatedPointer | null = null;

export function installCrashCapture(): void {
    if (buffer !== null) return;
    if (process.env.BDSX_NO_FAULT_CAPTURE === "1") return;
    const buf = new AllocatedPointer(8 + SLOTS * RECORD);
    buf.fill(0, 8 + SLOTS * RECORD);

    // rcx = EXCEPTION_POINTERS*; only rax, rcx, rdx, r8-r11 are touched (volatile)
    const code = asm()
        .mov_r_rp(Register.rax, Register.rcx, 1, 0) // ExceptionRecord*
        .cmp_rp_c(Register.rax, 1, 0, EXCEPTION_ACCESS_VIOLATION | 0, OperationSize.dword)
        .jnz_label("done")
        .mov_r_c(Register.r8, buf)
        .mov_r_rp(Register.rdx, Register.r8, 1, 0) // counter before this one
        .inc_rp(Register.r8, 1, 0)
        .and_r_c(Register.rdx, SLOTS - 1)
        .shl_r_c(Register.rdx, 9) // * RECORD
        .lea_r_rp(Register.r9, Register.r8, 1, 8)
        .add_r_r(Register.r9, Register.rdx) // r9 = this record
        .mov_r_rp(Register.r10, Register.r8, 1, 0)
        .mov_rp_r(Register.r9, 1, R_SEQ, Register.r10)
        .mov_r_rp(Register.r10, Register.rax, 1, 0x10)
        .mov_rp_r(Register.r9, 1, R_ADDRESS, Register.r10)
        .mov_r_rp(Register.r10, Register.rax, 1, 0x20)
        .mov_rp_r(Register.r9, 1, R_INFO0, Register.r10)
        .mov_r_rp(Register.r10, Register.rax, 1, 0x28)
        .mov_rp_r(Register.r9, 1, R_INFO1, Register.r10)
        .mov_r_rp(Register.rax, Register.rcx, 1, 8); // CONTEXT*
    for (let i = 0; i < REGS.length; i++) {
        code.mov_r_rp(Register.r10, Register.rax, 1, 0x78 + i * 8).mov_rp_r(Register.r9, 1, R_REGS + i * 8, Register.r10);
    }
    code.mov_r_rp(Register.r11, Register.rax, 1, 0x98); // CONTEXT.Rsp
    for (let i = 0; i < STACK_QWORDS; i++) {
        code.mov_r_rp(Register.r10, Register.r11, 1, i * 8).mov_rp_r(Register.r9, 1, R_STACK + i * 8, Register.r10);
    }
    code.label("done").xor_r_r(Register.rax, Register.rax, OperationSize.dword).ret(); // EXCEPTION_CONTINUE_SEARCH
    const handler = code.alloc("crash capture");

    const AddVectoredExceptionHandler = makefunc.js(
        cgate.GetProcAddress(dllraw.kernel32.module, "AddVectoredExceptionHandler"),
        VoidPointer,
        null,
        int32_t,
        VoidPointer,
    );
    if (AddVectoredExceptionHandler(1, handler) === null) return;
    buffer = buf;
}

let GetModuleHandleExW: ((flags: int32_t, addr: VoidPointer, out: Uint8Array) => int32_t) | null = null;
let GetModuleFileNameW: ((mod: VoidPointer, out: Uint16Array, size: int32_t) => int32_t) | null = null;

function qword(p: AllocatedPointer, off: number): number {
    return (p.getInt32(off + 4) >>> 0) * 0x100000000 + (p.getInt32(off) >>> 0); // user-mode addresses fit in 53 bits
}
function hex(n: number): string {
    return "0x" + n.toString(16);
}
/** `module+0xrva` for an address inside a loaded image, or null. */
function where(n: number): string | null {
    if (n < 0x10000 || n >= 0x800000000000) return null;
    if (GetModuleHandleExW === null) {
        GetModuleHandleExW = makefunc.js(cgate.GetProcAddress(dllraw.kernel32.module, "GetModuleHandleExW"), int32_t, null, int32_t, VoidPointer, makefunc.Buffer);
        GetModuleFileNameW = makefunc.js(cgate.GetProcAddress(dllraw.kernel32.module, "GetModuleFileNameW"), int32_t, null, VoidPointer, makefunc.Buffer, int32_t);
    }
    const addr = new AllocatedPointer(8);
    addr.setInt32(n % 0x100000000 | 0, 0);
    addr.setInt32(Math.floor(n / 0x100000000) | 0, 4);
    const out = new Uint8Array(8);
    // GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT
    if (GetModuleHandleExW(6, addr.getPointer(0), out) === 0) return null;
    const dv = new DataView(out.buffer);
    const base = dv.getUint32(4, true) * 0x100000000 + dv.getUint32(0, true);
    if (base === 0) return null;
    const mod = new AllocatedPointer(8);
    mod.setInt32(base % 0x100000000 | 0, 0);
    mod.setInt32(Math.floor(base / 0x100000000) | 0, 4);
    const name = new Uint16Array(260);
    const len = GetModuleFileNameW!(mod.getPointer(0), name, 260);
    const file = String.fromCharCode(...name.subarray(0, len)).replace(/^.*\\/, "");
    return `${file || hex(base)}+${hex(n - base)}`;
}

/** Print the captured access violations, oldest first. Called by the native crash report. */
export function printCrashCapture(print: (line: string) => void): void {
    const buf = buffer;
    if (buf === null) {
        print("[ Fault Capture ] not installed");
        return;
    }
    const total = qword(buf, 0);
    print(`[ Fault Capture ] ${total} access violation(s) seen by the vectored handler; the last ${Math.min(total, SLOTS)}:`);
    const records: number[] = [];
    for (let i = 0; i < SLOTS; i++) {
        const off = 8 + i * RECORD;
        if (qword(buf, off + R_SEQ) !== 0) records.push(off);
    }
    records.sort((a, b) => qword(buf, a + R_SEQ) - qword(buf, b + R_SEQ));
    for (const off of records) {
        const kind = qword(buf, off + R_INFO0);
        const kindName = kind === 0 ? "read" : kind === 1 ? "write" : kind === 8 ? "execute" : `kind ${kind}`;
        const at = qword(buf, off + R_ADDRESS);
        print(`#${qword(buf, off + R_SEQ)} ${kindName} of ${hex(qword(buf, off + R_INFO1))} at ${hex(at)} ${where(at) ?? "(no module)"}`);
        const regs: string[] = [];
        for (let i = 0; i < REGS.length; i++) {
            const v = qword(buf, off + R_REGS + i * 8);
            const w = where(v);
            regs.push(`${REGS[i]}=${hex(v)}${w !== null ? ` [${w}]` : ""}`);
        }
        print("   " + regs.join(" "));
        const stack: string[] = [];
        for (let i = 0; i < STACK_QWORDS; i++) {
            const v = qword(buf, off + R_STACK + i * 8);
            const w = where(v);
            if (w !== null) stack.push(`[rsp+${hex(i * 8)}] ${w}`);
        }
        print("   stack, code pointers only: " + (stack.length === 0 ? "none" : stack.join(", ")));
    }
}
