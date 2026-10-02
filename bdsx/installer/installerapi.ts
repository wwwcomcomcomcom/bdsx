import * as colors from "colors";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fsutil } from "../fsutil";
import { spropsUtil } from "../serverproperties";
import * as BDS_VERSION_DEFAULT from "../version-bds.json";
import * as BDSX_CORE_VERSION_DEFAULT from "../version-bdsx.json";
import { BDSInstaller, InstallItem } from "./installercls";

// minecraft.azureedge.net was retired with Azure CDN Edgio and no longer resolves.
// Mojang serves the same archives from www.minecraft.net; the current version is
// listed at https://net-secondary.web.minecraft-services.net/api/v1.0/download/links
const BDS_LINK_DEFAULT = "https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-%BDS_VERSION%.zip";
const BDSX_CORE_LINK_DEFAULT = "https://github.com/bdsx/bdsx-core/releases/download/%BDSX_CORE_VERSION%/bdsx-core-%BDSX_CORE_VERSION%.zip";

const BDS_VERSION = process.env.BDSX_BDS_VERSION || BDS_VERSION_DEFAULT;
const BDSX_CORE_VERSION = process.env.BDSX_CORE_VERSION || BDSX_CORE_VERSION_DEFAULT;
const BDS_LINK = replaceVariable(process.env.BDSX_BDS_LINK || BDS_LINK_DEFAULT);
const BDSX_CORE_LINK = replaceVariable(process.env.BDSX_CORE_LINK || BDSX_CORE_LINK_DEFAULT);

function replaceVariable(str: string): string {
    return str.replace(/%(.*?)%/g, (match, name: string) => {
        switch (name.toUpperCase()) {
            case "":
                return "%";
            case "BDS_VERSION":
                return BDS_VERSION;
            case "BDSX_CORE_VERSION":
                return BDSX_CORE_VERSION;
            default:
                return match;
        }
    });
}

const KEEPS_FILES = new Set([`whitelist.json`, `allowlist.json`, `valid_known_packs.json`, `server.properties`, `permissions.json`]);
const KEEPS_REGEXP = new Set([new RegExp(`config${path.sep}.*`)]);
function filterFiles(files: string[]): string[] {
    return files
        .filter(file => !KEEPS_FILES.has(file))
        .filter(v => {
            for (const reg of KEEPS_REGEXP) {
                if (reg.test(v)) {
                    return false;
                }
            }
            return true;
        });
}

// Mojang stopped shipping bedrock_server.pdb, so there is no pdbcache to download or
// generate any more. Each supported BDS build instead has a pair under symbols/<version>/,
// generated offline and shipped with the project:
//   symbols.json  the name -> RVA table bdsx reads at startup (bdsx/pdbcache.ts)
//   pdbcache.bin  the 28-byte header bdsx-core reads before any JS runs: format version,
//                 MD5 of bedrock_server.exe, and the RVA of main
// Both are keyed on the MD5 of bedrock_server.exe, and the pair is picked by that MD5.
const TABLES_DIR = path.join(fsutil.projectPath, "symbols");
const TABLE_FILES = ["symbols.json", "pdbcache.bin"];

function supportedVersions(): string[] {
    let dirs: string[];
    try {
        dirs = fs.readdirSync(TABLES_DIR);
    } catch (err) {
        return [];
    }
    return dirs.filter(v => TABLE_FILES.every(file => fs.existsSync(path.join(TABLES_DIR, v, file)))).sort();
}

function unsupportedReport(what: string): InstallItem.Report {
    const supported = supportedVersions();
    return new InstallItem.Report(
        `${what} is not supported by this bdsx: there is no symbol table for it.\n` +
            `Supported BDS versions: ${supported.length === 0 ? "(none found in symbols/)" : supported.join(", ")}\n` +
            `Set BDSX_BDS_VERSION to one of them and run 'npm i' again.`,
    );
}

/** the shipped table whose exe MD5 is the installed bedrock_server.exe's, by version directory */
async function findTable(exeMd5: string): Promise<string | null> {
    for (const version of supportedVersions()) {
        const dir = path.join(TABLES_DIR, version);
        const header = await fsutil.readFile(path.join(dir, "pdbcache.bin"), null);
        if (header.length !== 28 || header.readUInt32LE(0) !== 1 || header.subarray(4, 20).toString("hex") !== exeMd5) continue;
        const table = JSON.parse(await fsutil.readFile(path.join(dir, "symbols.json")));
        if (table.exeMd5 !== exeMd5) continue;
        return version;
    }
    return null;
}

async function installSymbolTable(installer: BDSInstaller): Promise<void> {
    const exe = path.join(installer.bdsPath, "bedrock_server.exe");
    const exeMd5 = crypto
        .createHash("md5")
        .update(await fsutil.readFile(exe, null))
        .digest("hex");
    const version = await findTable(exeMd5);
    if (version === null) throw unsupportedReport(`bedrock_server.exe (MD5 ${exeMd5})`);
    for (const file of TABLE_FILES) {
        await fsutil.copyFile(path.join(TABLES_DIR, version, file), path.join(installer.bdsPath, file));
    }
    installer.info.pdbcacheVersion = version;
    console.log(`symbol table: ${version}`);
}

const bds = new InstallItem({
    name: "BDS",
    version: BDS_VERSION,
    url: BDS_LINK,
    targetPath: ".",
    key: "bdsVersion",
    keyFile: "bedrock_server.exe",
    skipExists: true,
    async confirm(installer) {
        console.log(`This will download and install Bedrock Dedicated Server to '${path.resolve(installer.bdsPath)}'`);
        console.log(`BDS Version: ${BDS_VERSION}`);
        console.log(`Minecraft End User License Agreement: https://account.mojang.com/terms`);
        console.log(`Privacy Policy: https://go.microsoft.com/fwlink/?LinkId=521839`);
        const ok = await installer.yesno("Do you agree to the terms above? (y/n)");
        if (!ok) throw new InstallItem.Report("Canceled");
    },
    async preinstall(installer) {
        if (installer.info.files) {
            const files = filterFiles(installer.info.files);
            // Removes KEEPS because they could have been stored before by bugs.

            await installer.removeInstalled(installer.bdsPath, files);
        }
    },
    async postinstall(installer, writtenFiles) {
        installer.info.files = filterFiles(writtenFiles);
        // `installer.info will` be saved to `bedrock_server/installinfo.json`.
        // Removes KEEPS because they don't need to be remembered.
    },
    merge: [["server.properties", spropsUtil.merge]],
});

const bdsxCore = new InstallItem({
    name: "bdsx-core",
    version: BDSX_CORE_VERSION,
    url: BDSX_CORE_LINK,
    targetPath: ".",
    key: "bdsxCoreVersion",
    keyFile: "VCRUNTIME140_1.dll",
    oldFiles: ["mods", "Chakra.pdb"],
    async fallback(installer, statusCode) {
        if (statusCode !== 404) return;
        console.error(colors.yellow(`bdsx-core-${BDSX_CORE_VERSION} does not exist on the server`));
        const corePath = path.join(fsutil.projectPath, `../bdsx-core/release/bdsx-core-${BDSX_CORE_VERSION}.zip`);
        if (await fsutil.exists(corePath)) {
            console.error(colors.yellow(`Found it from the local core project: ${corePath}`));
            await installer.gitPublish(this, corePath);
        }
        return false;
    },
});

export async function installBDS(bdsPath: string, opts: BDSInstaller.Options): Promise<boolean> {
    const installer = new BDSInstaller(bdsPath, opts);
    if (opts.skip !== undefined) {
        console.log(`Skipped by ${opts.skip}`);
        return true;
    }
    await installer.info.load();
    try {
        if (supportedVersions().indexOf(BDS_VERSION) === -1) throw unsupportedReport(`BDS ${BDS_VERSION}`);
        await bds.install(installer);
        await bdsxCore.install(installer);
        await installSymbolTable(installer);
        await installer.info.save();
        return true;
    } catch (err) {
        if (err instanceof InstallItem.Report) {
            console.error(err.message);
        } else {
            console.error(err.stack);
        }
        await installer.info.save();
        return false;
    }
}
