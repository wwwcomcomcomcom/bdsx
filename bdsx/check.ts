import "./common";
import "./checkmodules";
import "./asm/checkasm";
import { cgate } from "./core";
import * as bdsVersionJson from "./version-bds.json";
import * as bdsxVersionJson from "./version-bdsx.json";
import * as colors from "colors";
import { InstallInfo } from "./installer/installinfo";
import { Config } from "./config";

function checkInstallInfoAndExit(): never {
    function check(versionKey: keyof InstallInfo, oversion: string): void {
        const installed = installInfo[versionKey];
        if (installed === "manual" || installed == null) {
            if (versionKey === "bdsVersion") {
                cannotUpdate = true;
                return;
            }
            installInfo[versionKey] = oversion as any;
            modified = true;
        }
    }

    let modified = false;
    let cannotUpdate = false;
    const installInfo = new InstallInfo(Config.BDS_PATH);
    installInfo.loadSync();
    check("bdsVersion", bdsVersion);
    check("pdbcacheVersion", bdsVersion);
    check("bdsxCoreVersion", cgate.bdsxCoreVersion);
    if (modified) installInfo.saveSync();

    if (cannotUpdate) {
        // the installed manual BDS is hard to update.
        // BDSX cannot distinguish between user files and BDS files.
        console.error(`[BDSX] BDSX cannot update the manual installed BDS`);
        console.error(`[BDSX] Please update BDS manually`);
        process.exit(BdsxExitCode.Quit);
    } else {
        console.error(`[BDSX] Please run 'npm i' or ${process.platform === "win32" ? "update.bat" : "update.sh"} to update`);
        process.exit(BdsxExitCode.InstallNpm);
    }
}
function checkAndReport(name: string, oversion: string, nversion: string): void {
    if (oversion === nversion) return;
    console.error(colors.red(`[BDSX] ${name} outdated`));
    console.error(colors.red(`[BDSX] Current version: ${oversion}`));
    console.error(colors.red(`[BDSX] Required version: ${nversion}`));
    checkInstallInfoAndExit();
}

// check BDSX version
checkAndReport("BDSX Core", cgate.bdsxCoreVersion, bdsxVersionJson);

// check BDS version
import { proc } from "./bds/symbols";
import { BdsxExitCode } from "./shellprepare/exitcode";

// SharedConstants::{Major,Minor,Patch,Revision}Version are plain `const int`s.
// In 1.21.3.01 they are loaded by three adjacent `lea`s feeding the SemVersion
// constructor, which makes them easy to find by cross-reference; in 1.26.51.1
// no code window anywhere in .text references a 1, a 26 and a 51 within 512
// bytes of each other, so that anchor is gone. They are marked unresolved in
// the symbol table until something better turns them up.
//
// Skipping the check costs nothing: the symbol table is keyed on the MD5 of
// bedrock_server.exe and refuses to load against any other binary, which is a
// strictly stronger guarantee than comparing four integers.
const versionSymbols = [
    "?MajorVersion@SharedConstants@@3HB",
    "?MinorVersion@SharedConstants@@3HB",
    "?PatchVersion@SharedConstants@@3HB",
    "?RevisionVersion@SharedConstants@@3HB",
];
if (versionSymbols.every(name => name in proc)) {
    const versions = [
        proc["?MajorVersion@SharedConstants@@3HB"].getInt32(),
        proc["?MinorVersion@SharedConstants@@3HB"].getInt32(),
        proc["?PatchVersion@SharedConstants@@3HB"].getInt32(),
        (proc["?RevisionVersion@SharedConstants@@3HB"].getInt32() + 100).toString().substr(1),
    ];
    const bdsVersion = versions.join(".");
    checkAndReport("BDS", bdsVersion, bdsVersionJson);
}
