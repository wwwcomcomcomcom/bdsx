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

    export const bdsVersion = table.bdsVersion;
    export const exeMd5 = table.exeMd5;
    export const size = table.size;
}
