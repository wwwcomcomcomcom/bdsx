/**
 * The engine layer's per-build facts (docs/plan-architecture.md, layer [2]).
 *
 * Everything below bdsx's public API that depends on the exact BDS build goes through one of these
 * three calls, always with literal arguments, so that `node tools/engine-deps.mjs` can list the
 * whole dependency set statically and check it against each build's symbols.json -- the checklist
 * for a new build (docs/HANDOFF.md section 6, Q6).
 *
 *   engineLayout("Class", "field", fallback)   a byte offset, size or count from symbols.json `layouts`
 *   engineSymbol("?decorated@name")             an address from symbols.json `symbols` (null if missing)
 *   componentHash("ComponentName")              an EnTT type hash: FNV-1a-32 of the bare type name
 *
 * The fallback of engineLayout is the 2024 (1.21.3.01) value, which is what a table without the
 * entry had before the engine layer existed.
 */
import { NativePointer } from "../../core";
import { pdbcache } from "../../pdbcache";
import { proc } from "../symbols";

export function engineLayout(cls: string, field: string, fallback: number): number {
    const v = pdbcache.layouts[cls]?.[field];
    return typeof v === "number" ? v : fallback;
}

export function engineSymbol(name: string): NativePointer | null {
    if (!(name in proc)) return null;
    const p = proc[name];
    return p === null || p.isNull() ? null : p;
}

export function componentHash(name: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h = Math.imul((h ^ name.charCodeAt(i)) >>> 0, 0x01000193) >>> 0;
    }
    return h >>> 0;
}
