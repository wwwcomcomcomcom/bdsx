/**
 * The static symbol table that replaces runtime PDB lookup.
 *
 * BDS stopped shipping bedrock_server.pdb after 1.21.10, so addresses are now
 * resolved offline, once per BDS build, and shipped as a table. Everything in
 * this file is pure data logic with no dependency on bdsx-core or on a running
 * BDS, so the parsing, the version rejection and the degradation behaviour can
 * all be unit tested in plain node.
 *
 * The binding to the live process lives in ./pdbcache.
 */

/** Bumped whenever the on-disk shape changes incompatibly. */
export const SYMBOL_TABLE_FORMAT_VERSION = 1;

export interface SymbolTableFile {
    formatVersion: number;
    /** BDS release the addresses were derived from, e.g. "1.26.51.1". */
    bdsVersion: string;
    /** MD5 of the bedrock_server.exe the addresses were derived from. */
    exeMd5: string;
    /** Decorated name -> RVA. */
    symbols: Record<string, number>;
    /**
     * Names that were looked for and deliberately not found, mapped to why.
     * Distinguishes "we know this is gone" from "we have not got to it yet",
     * which is the difference between a clear error and a silent wrong hook.
     */
    unresolved?: Record<string, string>;
    generator?: string;
    generatedAt?: string;
}

export class SymbolTableError extends Error {}

/**
 * Thrown when the table does not describe the binary that is actually running.
 * Kept distinct because accepting a table built for another build is the worst
 * available failure: every hook lands at a plausible-looking wrong address.
 */
export class SymbolTableMismatchError extends SymbolTableError {
    constructor(readonly expectedMd5: string, readonly actualMd5: string, readonly bdsVersion: string) {
        super(
            `symbol table was built for a different bedrock_server.exe\n` +
                `  table : ${expectedMd5} (BDS ${bdsVersion})\n` +
                `  actual: ${actualMd5}\n` +
                `Regenerate the table for this BDS build; do not run with a mismatched table.`,
        );
    }
}

/** RVAs must land inside a plausible image; 1 GB is far past any BDS section. */
const MAX_PLAUSIBLE_RVA = 0x4000_0000;

export class SymbolTable {
    private constructor(
        readonly bdsVersion: string,
        readonly exeMd5: string,
        private readonly symbols: Map<string, number>,
        private readonly unresolved: Map<string, string>,
        readonly generator: string | null,
        readonly generatedAt: string | null,
    ) {}

    /**
     * Parse and structurally validate a table. Does not check which binary is
     * running; call {@link verifyAgainst} for that.
     */
    static parse(raw: unknown, source = "<memory>"): SymbolTable {
        const fail = (msg: string): never => {
            throw new SymbolTableError(`${source}: ${msg}`);
        };
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) fail("not a JSON object");
        const file = raw as Partial<SymbolTableFile>;

        if (file.formatVersion !== SYMBOL_TABLE_FORMAT_VERSION) {
            fail(`unsupported formatVersion ${String(file.formatVersion)}, expected ${SYMBOL_TABLE_FORMAT_VERSION}`);
        }
        if (typeof file.bdsVersion !== "string" || file.bdsVersion === "") fail("missing bdsVersion");
        if (typeof file.exeMd5 !== "string" || !/^[0-9a-f]{32}$/.test(file.exeMd5)) fail("missing or malformed exeMd5");
        if (file.symbols === null || typeof file.symbols !== "object" || Array.isArray(file.symbols)) {
            fail("missing symbols map");
        }

        const symbols = new Map<string, number>();
        for (const [name, rva] of Object.entries(file.symbols!)) {
            if (!Number.isInteger(rva) || (rva as number) <= 0 || (rva as number) >= MAX_PLAUSIBLE_RVA) {
                fail(`implausible RVA for ${name}: ${String(rva)}`);
            }
            symbols.set(name, rva as number);
        }

        const unresolved = new Map<string, string>();
        if (file.unresolved != null) {
            if (typeof file.unresolved !== "object" || Array.isArray(file.unresolved)) fail("unresolved must be an object");
            for (const [name, reason] of Object.entries(file.unresolved)) {
                if (symbols.has(name)) fail(`${name} is both resolved and unresolved`);
                unresolved.set(name, String(reason));
            }
        }

        return new SymbolTable(
            file.bdsVersion!,
            file.exeMd5!.toLowerCase(),
            symbols,
            unresolved,
            file.generator ?? null,
            file.generatedAt ?? null,
        );
    }

    /** @throws SymbolTableMismatchError if the table describes another build. */
    verifyAgainst(actualExeMd5: string): void {
        const actual = actualExeMd5.toLowerCase();
        if (actual !== this.exeMd5) {
            throw new SymbolTableMismatchError(this.exeMd5, actual, this.bdsVersion);
        }
    }

    /** @return RVA, or -1 when the name is not in the table. */
    search(key: string): number {
        return this.symbols.get(key) ?? -1;
    }

    /**
     * Why a name is known to be unavailable on this build, or null when the
     * table simply says nothing about it.
     */
    unresolvedReason(key: string): string | null {
        return this.unresolved.get(key) ?? null;
    }

    keys(): IterableIterator<string> {
        return this.symbols.keys();
    }

    get size(): number {
        return this.symbols.size;
    }

    get unresolvedCount(): number {
        return this.unresolved.size;
    }
}
