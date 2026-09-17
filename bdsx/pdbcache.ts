/**
 * Binding between the static symbol table and the running bedrock_server.exe.
 *
 * Historically this read pdbcache.bin, a name -> RVA hashmap that pdbcachegen
 * produced from bedrock_server.pdb. Mojang stopped shipping that PDB, so the
 * table is now generated offline and shipped as symbols.json. The module name
 * and the { search, readKeys } surface are kept so existing callers --
 * bds/symbols.ts, pdblegacy.ts, analyzer.ts, bds/symbollist.ts -- are unchanged.
 */
import * as fs from "fs";
import * as path from "path";
import { Config } from "./config";
import { SymbolTable, SymbolTableError } from "./symboltable";

const tablePath = path.join(Config.BDS_PATH, "symbols.json");
/** object layouts read from live instances by the offline tooling: class -> member -> byte offset */
let rawLayouts: Record<string, Record<string, number>> = {};
/**
 * A member accessor that exists in the source but not as a findable function
 * in this build: `mov rax,[rcx+X]; ret` and its kin have no unwind entry, a
 * body that differs from hundreds of others by the offset alone, and are
 * inlined at every caller. The offline tooling ships the field instead
 * (docs/findings-layouts.md) and bds/symbols.ts emits the body at load time.
 */
export interface FieldAccessor {
    /** get: load [this+off]; lea: address of this+off; set: store the second argument; get-hidden: copy into the hidden return buffer */
    kind: "get" | "lea" | "set" | "get-hidden";
    /** bytes: 1, 2, 4 or 8 */
    width: number;
    off: number;
    /** xmm0 / xmm1 instead of rax / rdx */
    float?: boolean;
    /** sign- or zero-extend a narrow load into eax/rax */
    sx?: boolean;
    zx?: boolean;
}
let rawAccessors: Record<string, FieldAccessor> = {};

function load(): SymbolTable {
    let content: string;
    try {
        content = fs.readFileSync(tablePath, "utf8");
    } catch (err) {
        throw new SymbolTableError(
            `symbol table not found: ${tablePath}\n` + `Generate it with the offline resolver for this BDS build.`,
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch (err) {
        throw new SymbolTableError(`${tablePath}: invalid JSON (${(err as Error).message})`);
    }

    rawLayouts = (parsed as { layouts?: Record<string, Record<string, number>> }).layouts ?? {};
    rawAccessors = (parsed as { accessors?: Record<string, FieldAccessor> }).accessors ?? {};
    const table = SymbolTable.parse(parsed, tablePath);

    // Only bdsx-core can tell us which binary is actually mapped. Outside BDS
    // -- tooling, tests -- there is nothing to compare against, so the table
    // loads unverified rather than refusing to be inspected.
    if (Config.BDSX) {
        table.verifyAgainst(require("./core").bedrock_server_exe.md5);
    }
    return table;
}

const table = load();

export namespace pdbcache {
    /** @return RVA, or -1 when not found. */
    export function search(key: string): number {
        return table.search(key);
    }

    export function readKeys(): IterableIterator<string> {
        return table.keys();
    }

    /** Why a symbol is known to be unavailable on this build, else null. */
    export function unresolvedReason(key: string): string | null {
        return table.unresolvedReason(key);
    }

    /** class -> member -> offset, from symbols.json `layouts`; empty when the table has none */
    export const layouts: Record<string, Record<string, number>> = rawLayouts;
    /** name -> field accessor definition, from symbols.json `accessors`; consulted when the name has no address */
    export function accessor(key: string): FieldAccessor | undefined {
        return rawAccessors[key];
    }
    export const accessorCount = Object.keys(rawAccessors).length;
    export const bdsVersion = table.bdsVersion;
    export const exeMd5 = table.exeMd5;
    export const size = table.size;
}
