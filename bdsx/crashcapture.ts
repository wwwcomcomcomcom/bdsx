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
 * process behaves exactly as without it. It also copies the first 16 qwords at every general register
 * (not RSP) that points into committed, readable memory: the object a register holds says more than its
 * address (a vftable, or a heap free-list shape; Q8's bad LevelChunk has its Dimension* at +0x58). Each
 * address is checked with VirtualQuery before the copy, because a fault inside the handler would take
 * the process down with no report. Any access violation that something else handles and recovers
 * from passes through it as well, which is why it keeps a ring rather than one record: the fatal one is
 * the entry whose address matches the report.
 */
import { asm, OperationSize, Register, Value64, X64Assembler } from "./assembler";
import { AllocatedPointer, cgate, VoidPointer } from "./core";
import { dllraw } from "./dllraw";
import { makefunc } from "./makefunc";
import { int32_t } from "./nativetype";
import { EXCEPTION_ACCESS_VIOLATION } from "./windows_h";

const SLOTS = 4; // a power of two: the slot is the counter masked
const RECORD = 0x1000;
const STACK_QWORDS = 40;
const MEM_QWORDS = 16; // 0x80 bytes per register: covers LevelChunk+0x58 (Dimension*) and +0x78 (position)
const MEM_BYTES = MEM_QWORDS * 8;
const REG_RSP = 4;
const REGS = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15", "rip"];

// record layout
const R_SEQ = 0x00;
const R_ADDRESS = 0x08; // ExceptionRecord.ExceptionAddress
const R_INFO0 = 0x10; // ExceptionInformation[0]: 0 read, 1 write, 8 execute
const R_INFO1 = 0x18; // ExceptionInformation[1]: the address accessed
const R_REGS = 0x20; // CONTEXT.Rax .. CONTEXT.R15, CONTEXT.Rip (contiguous in CONTEXT from +0x78)
const R_STACK = R_REGS + REGS.length * 8;
const R_MASK = R_STACK + STACK_QWORDS * 8; // bit i: the memory at general register i was copied
const R_MEM = R_MASK + 8; // 16 slots of MEM_BYTES, indexed like REGS[0..15]
if (R_MEM + 16 * MEM_BYTES > RECORD) throw Error("crash capture record overflow");

// MEMORY_BASIC_INFORMATION (x64)
const MBI_SIZE = 0x30;
const MBI_BASE = 0x00;
const MBI_REGION_SIZE = 0x18;
const MBI_STATE = 0x20;
const MBI_PROTECT = 0x24;
const MEM_COMMIT = 0x1000;
const PAGE_NOACCESS_OR_GUARD = 0x101;
const PAGE_READABLE = 0xee; // READONLY READWRITE WRITECOPY EXECUTE_READ EXECUTE_READWRITE EXECUTE_WRITECOPY

let buffer: AllocatedPointer | null = null;

/** The vectored handler's code. Exported only so it can be assembled and disassembled off the host. */
export function buildCaptureHandler(buf: Value64, virtualQuery: Value64): X64Assembler {
    // rcx = EXCEPTION_POINTERS*. The first part touches only rax, rcx, rdx, r8-r11 (volatile); the
    // register-memory part calls VirtualQuery, so it keeps the record in rsi and the CONTEXT in rbx
    const code = asm()
        .mov_r_rp(Register.rax, Register.rcx, 1, 0) // ExceptionRecord*
        .cmp_rp_c(Register.rax, 1, 0, EXCEPTION_ACCESS_VIOLATION | 0, OperationSize.dword)
        .jnz_label("done")
        .mov_r_c(Register.r8, buf)
        .mov_r_rp(Register.rdx, Register.r8, 1, 0) // counter before this one
        .inc_rp(Register.r8, 1, 0)
        .and_r_c(Register.rdx, SLOTS - 1)
        .shl_r_c(Register.rdx, Math.log2(RECORD)) // * RECORD
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
    // the memory each register points at. Entry rsp is 8 mod 16; three pushes and 0x50 (shadow space +
    // MEMORY_BASIC_INFORMATION) leave it 16-aligned at the calls.
    code.push_r(Register.rbx)
        .push_r(Register.rsi)
        .push_r(Register.rdi)
        .sub_r_c(Register.rsp, 0x50)
        .mov_r_r(Register.rbx, Register.rax) // CONTEXT*
        .mov_r_r(Register.rsi, Register.r9) // this record
        .mov_rp_c(Register.rsi, 1, R_MASK, 0)
        .mov_r_c(Register.rdi, virtualQuery);
    const MBI = 0x20;
    for (let i = 0; i < 16; i++) {
        if (i === REG_RSP) continue; // the stack is already copied
        const skip = `mem_skip_${i}`;
        const reg = 0x78 + i * 8;
        code.mov_r_rp(Register.rcx, Register.rbx, 1, reg)
            .cmp_r_c(Register.rcx, 0x10000)
            .jb_label(skip)
            .lea_r_rp(Register.rdx, Register.rsp, 1, MBI)
            .mov_r_c(Register.r8, MBI_SIZE)
            .call_r(Register.rdi)
            .cmp_r_c(Register.rax, MBI_SIZE)
            .jne_label(skip)
            .cmp_rp_c(Register.rsp, 1, MBI + MBI_STATE, MEM_COMMIT, OperationSize.dword)
            .jne_label(skip)
            .mov_r_rp(Register.rax, Register.rsp, 1, MBI + MBI_PROTECT, OperationSize.dword)
            .test_r_c(Register.rax, PAGE_NOACCESS_OR_GUARD, OperationSize.dword)
            .jnz_label(skip)
            .test_r_c(Register.rax, PAGE_READABLE, OperationSize.dword)
            .jz_label(skip)
            // the whole copy must stay inside the region: value + MEM_BYTES <= base + size
            .mov_r_rp(Register.rax, Register.rsp, 1, MBI + MBI_BASE)
            .add_r_rp(Register.rax, Register.rsp, 1, MBI + MBI_REGION_SIZE)
            .mov_r_rp(Register.rcx, Register.rbx, 1, reg)
            .add_r_c(Register.rcx, MEM_BYTES)
            .cmp_r_r(Register.rcx, Register.rax)
            .ja_label(skip)
            .mov_r_rp(Register.rcx, Register.rbx, 1, reg);
        for (let j = 0; j < MEM_QWORDS; j++) {
            code.mov_r_rp(Register.rax, Register.rcx, 1, j * 8).mov_rp_r(Register.rsi, 1, R_MEM + i * MEM_BYTES + j * 8, Register.rax);
        }
        code.or_rp_c(Register.rsi, 1, R_MASK, 1 << i).label(skip);
    }
    code.add_r_c(Register.rsp, 0x50).pop_r(Register.rdi).pop_r(Register.rsi).pop_r(Register.rbx);
    code.label("done").xor_r_r(Register.rax, Register.rax, OperationSize.dword).ret(); // EXCEPTION_CONTINUE_SEARCH
    return code;
}

export function installCrashCapture(): void {
    if (buffer !== null) return;
    if (process.env.BDSX_NO_FAULT_CAPTURE === "1") return;
    const buf = new AllocatedPointer(8 + SLOTS * RECORD);
    buf.fill(0, 8 + SLOTS * RECORD);
    const handler = buildCaptureHandler(buf, cgate.GetProcAddress(dllraw.kernel32.module, "VirtualQuery")).alloc("crash capture");

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
/** The qword at `off` in hex, exact: qword() rounds above 2^53, which data (not addresses) often is. */
function qhex(p: AllocatedPointer, off: number): string {
    const hi = p.getInt32(off + 4) >>> 0, lo = p.getInt32(off) >>> 0;
    return hi === 0 ? hex(lo) : hex(hi) + lo.toString(16).padStart(8, "0");
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
        print(`#${qword(buf, off + R_SEQ)} ${kindName} of ${qhex(buf, off + R_INFO1)} at ${hex(at)} ${where(at) ?? "(no module)"}`);
        const regs: string[] = [];
        for (let i = 0; i < REGS.length; i++) {
            const v = qword(buf, off + R_REGS + i * 8);
            const w = where(v);
            regs.push(`${REGS[i]}=${qhex(buf, off + R_REGS + i * 8)}${w !== null ? ` [${w}]` : ""}`);
        }
        print("   " + regs.join(" "));
        const stack: string[] = [];
        for (let i = 0; i < STACK_QWORDS; i++) {
            const v = qword(buf, off + R_STACK + i * 8);
            const w = where(v);
            if (w !== null) stack.push(`[rsp+${hex(i * 8)}] ${w}`);
        }
        print("   stack, code pointers only: " + (stack.length === 0 ? "none" : stack.join(", ")));
        const mask = qword(buf, off + R_MASK);
        const shown = new Map<number, string>();
        for (let i = 0; i < 16; i++) {
            if (i === REG_RSP) continue;
            const v = qword(buf, off + R_REGS + i * 8);
            if ((mask & (1 << i)) === 0) continue;
            const same = shown.get(v);
            if (same !== undefined) {
                print(`   [${REGS[i]}] same as [${same}]`);
                continue;
            }
            shown.set(v, REGS[i]);
            for (let row = 0; row < MEM_QWORDS; row += 4) {
                const cells: string[] = [];
                for (let j = row; j < row + 4; j++) {
                    const q = qword(buf, off + R_MEM + i * MEM_BYTES + j * 8);
                    const w = where(q);
                    cells.push(`${qhex(buf, off + R_MEM + i * MEM_BYTES + j * 8)}${w !== null ? ` [${w}]` : ""}`);
                }
                print(`   [${REGS[i]}+${hex(row * 8)}] ${cells.join(" ")}`);
            }
        }
        const unread = REGS.slice(0, 16).filter((r, i) => i !== REG_RSP && (mask & (1 << i)) === 0 && qword(buf, off + R_REGS + i * 8) >= 0x10000);
        if (unread.length !== 0) print(`   not readable (or crosses a region end): ${unread.join(" ")}`);
    }
}
