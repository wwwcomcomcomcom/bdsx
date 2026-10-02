# BDSX revival: bdsx on BDS 1.26

This is a fork of [bdsx](https://github.com/bdsx/bdsx), which was archived on 2024-11-14. It runs bdsx on
current Bedrock Dedicated Server builds.

**Why bdsx stopped working.** bdsx read `bedrock_server.pdb` at runtime to find the address of every
function it hooks or calls. Mojang has not shipped that PDB since BDS 1.21.20, so upstream bdsx cannot start
on any newer server.

**What this fork does instead.** The `name -> address` table is generated offline, once per BDS build, and
shipped with the project as `symbols/<version>/symbols.json`. bdsx loads it at startup, and it refuses to
run if the table was built for a different `bedrock_server.exe` (it checks the MD5). The table also carries
some object layouts and constants that no longer have a function to read them. Where a function no longer
exists, bdsx implements it itself. Plugins use the same bdsx API, except for the parts listed under Known limits.

## Supported BDS builds

| BDS                     | table                |
| ----------------------- | -------------------- |
| **1.26.51.1** (default) | `symbols/1.26.51.1/` |
| 1.26.40.8               | `symbols/1.26.40.8/` |

Only these exact builds will run. A table matches one `bedrock_server.exe`, so any other version, including
later 1.26 patches, needs a new table. The installer refuses a version it has no table for.

## Install (Windows)

Requirements: [node.js](https://nodejs.org/) (tested with 20), [git](https://git-scm.com/download), and the
[Microsoft Visual C++ 2015-2022 x64 redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe).
Windows Server does not include that runtime, and BDS will not start without it.

```bat
git clone https://github.com/wwwcomcomcomcom/bdsx.git
cd bdsx
npm i
bdsx.bat
```

`npm i` runs bdsx's installer. It downloads BDS from minecraft.net and bdsx-core from
[bdsx/bdsx-core](https://github.com/bdsx/bdsx-core/releases), and copies the matching symbol table into
`bedrock_server/`. To install 1.26.40.8 instead, run `set BDSX_BDS_VERSION=1.26.40.8` before `npm i`.
After a `git pull`, run `npm i` again (or `update.bat`) so that `bedrock_server/` gets the updated table.

The rest of this README is upstream's text. The VSCode and `bdsx.bat` instructions still apply.

## Known limits

-   **Windows only.** Linux with Wine has not been tried.
-   **NetherNet on 1.26.51.1.** BDS 1.26.51.1 ships `transport=nethernet` in `server.properties`, and it warns
    that players cannot connect over RakNet. Under NetherNet, the RakNet part of bdsx is unavailable:
    `bedrockServer.rakPeer`, player IP addresses (`NetworkIdentifier.getAddress()`) and ping. bdsx prints a
    `connector: unavailable` line at boot, and the `net-ping.ts` example fails to load. All of the 1.26.51.1
    testing used `transport=raknet` and a RakNet test client, so it has not been tested whether packet and
    player events fire for a real NetherNet client. 1.26.40.8 ships `transport=raknet`, the tested setup.
-   **Some names have no address.** When the server boots, it prints red `Symbol not found: ...` lines. These
    are expected: they are the names that are not in this build's table. bdsx only fails if a plugin calls
    one of them.
-   **Some upstream APIs are gone,** because BDS 1.26 no longer has them: `DyePowderItemComponent`,
    `KnockbackResistanceItemComponent`, and copying or moving a `SerializedSkin`. Calling them throws
    "not available on BDS 1.26".
-   **Some upstream examples do not work on 1.26.** In `example_and_test/`, `hidemapmarker.ts` and
    `lowlevel-apihooking.ts` hook functions that have a different signature in 1.26.
    `SurvivalMode::destroyBlock`, which `blockevent.ts` uses, is not in the table. The `example_score` command
    of `net-scorepacket.ts` fails with an error, because `SetScorePacket` still has its 2024 layout.
-   **bdsx no longer reads the console.** BDS 1.26 builds its console reader into its startup code, so bdsx
    cannot replace it. Typed commands still work, but BDS reads them itself, and
    `bedrockServer.DefaultStdInHandler` is not installed. `bedrockServer.executeCommandOnConsole` still works.
-   **Development tools that need the PDB do not work:** `pdbcachegen` and searching for symbols by
    name at runtime. Only the names in the shipped table resolve.
-   **Login certificates:** the XUID of a player who logs in with online-mode authentication has not been
    tested. Testing ran with `online-mode=false`.
-   **Old plugins:** compatibility with plugins written for bdsx in 2024 is not a goal. APIs for things that
    BDS 1.26 removed are dropped instead of emulated.

## Credits and licence

bdsx is by karikera and its contributors, MIT ([LICENSE.txt](LICENSE.txt), unchanged). The revival's
changes are under the same licence. The 1.26 class layouts and virtual-table slots were cross-checked
against the headers of [Endstone](https://github.com/EndstoneMC/endstone) (Apache-2.0). This fork contains no
Mojang code: the tables hold addresses, offsets and a few constant values, not code from
`bedrock_server.exe`. Minecraft and Bedrock Dedicated Server are Mojang's. Downloading BDS means you accept
the [Minecraft EULA](https://account.mojang.com/terms).

---

# BDSX : BDS + node.js

![logo](bdsx/images/icon.png)\
BDSX is a modification of Minecraft Bedrock Dedicated Server, supporting [node.js](https://nodejs.org/). Because it is based on the offical BDS software, it includes all the features of vanilla Minecraft, but includes other features as well, such as hooking functions and packets to change behavior.

## Features

-   OS: Windows(Recommended), Linux with Wine(Unstable)
-   All Minecraft BDS features
-   All node.js features (\*that are supported by ChakraCore. See [this page](https://github.com/bdsx/bdsx/wiki/Available-NPM-Modules) for more information)
-   Debug with Visual Studio Code (You can debug plugins too)
-   Intercept network packets
-   [Custom Commands](https://github.com/bdsx/bdsx/wiki/Custom-Commands)
-   Low-level hooking and [DLL Call](https://github.com/bdsx/bdsx/wiki/Call-DLL-Directly)
-   Get IP Address & XUID (Example below)

```ts
import { events } from "bdsx/event";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
events.packetAfter(MinecraftPacketIds.Login).on((ptr, networkIdentifier, packetId) => {
    const ip = networkIdentifier.getAddress();
    if (ptr.connreq === null) return; // Wrong client version
    const cert = ptr.connreq.getCertificate();
    const xuid = cert.getXuid();
    const username = cert.getId();
    console.log(`Connection: ${username}> IP=${ip}, XUID=${xuid}`);
});
```

## Usage

-   Requirements
    -   [node.js](https://nodejs.org/) Please make sure your node is up to date.
    -   [GIT](https://git-scm.com/download)
    -   Wine (if using Linux)
-   Recommended
    -   [VSCode](https://code.visualstudio.com/)

To download, clone the repo:

```bash
git clone https://github.com/bdsx/bdsx.git
```

### Debug & Launch with VSCode

When starting BDSX with VSCode, you need to

1. Open the project with VSCode
2. Install the legacy debugger. the suggestion dialog will be opened up on the right bottom corner.
3. Open a terminal (Ctrl+Shift+｀)
4. Run `npm i` to install npm packages and BDS
5. Press `F5` to build and run in VSCode

### Launch with the executable

Run `bdsx.bat` (or `bdsx.sh` on Linux) to start BDSX

### Manual instruction of the executable

1. Open a terminal to the bdsx folder
2. Run `npm i` to install npm packages and BDS
3. Use `tsc` to compile the typescript and use `bedrock_server.exe ..` in the `bedrock_server` directory. If on Linux, use `wine bedrock_server.exe ..` instead.

## File Structure

```sh
[bdsx project]
├ [bdsx] # Core Library
├ [example_and_test] # Examples for using the BDSX API and tests of the BDSX API
├ [bedrock_server] # BDS installation
├ launcher.ts # Script for launching BDS
├ index.ts # Main entry point. This file is required by the launcher when BDS is fully started.
├ bdsx.sh # Executable for Linux
└ bdsx.bat # Executable for Windows
```

> Please start your own code from ./index.ts

> By default index.ts imports example_and_test. To disable the examples simply remove the import or replace it with your own code.

> For examples, see the `example_and_test` folder. There are some plugins available on npm in the @bdsx organization as well.

## Make a bdsx plugin

Please check [`plugin-example/README.md`](plugin-example/README.md).

## Discord

https://discord.gg/pC9XdkC

## BDSX Discussions

https://github.com/bdsx/bdsx/discussions

## BDSX Wiki

https://github.com/bdsx/bdsx/wiki

## Hosting Support

[<img src="bdsx/images/supports/emh.png" height="15"> https://easyminecrafthosting.com/](https://easyminecrafthosting.com/) (Latin America)

## Docker Image

https://hub.docker.com/r/karikera/bdsx

## Bug Report

https://github.com/bdsx/bdsx/issues

## BDSX Core

https://github.com/bdsx/bdsx-core
