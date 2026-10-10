# BDSX revival: bdsx on BDS 1.26

This is a fork of [bdsx](https://github.com/bdsx/bdsx), which was archived on 2024-11-14. It runs bdsx on
current Bedrock Dedicated Server builds without `bedrock_server.pdb`.

## Supported BDS builds

| BDS                     | table                |
| ----------------------- | -------------------- |
| **1.26.52.3** (default) | `symbols/1.26.52.3/` |
| 1.26.51.1               | `symbols/1.26.51.1/` |
| 1.26.40.8               | `symbols/1.26.40.8/` |

1.26.52.3 is a hotfix of 1.26.51.1 (same protocol, 2193), so the same clients connect to both.

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
`bedrock_server/`. To install another supported build instead, run `set BDSX_BDS_VERSION=1.26.51.1` (or
`1.26.40.8`) before `npm i`. An existing install whose BDS is older than the default is updated to the default
by the next `npm i` unless `BDSX_BDS_VERSION` names the build it has.
After a `git pull`, run `npm i` again (or `update.bat`) so that `bedrock_server/` gets the updated table.

## How bdsx starts without the PDB

Upstream bdsx used the PDB in two places, and they turned out to need very different amounts of it.

**The native side needs one address.** bdsx-core (the DLL that loads node.js into BDS) reads only the first
28 bytes of `pdbcache.bin`: a format version, the MD5 of `bedrock_server.exe`, and the address of `main`. It
checks the MD5, writes a jump over the start of `main`, and hands control to JavaScript. The symbol hash map
that followed those 28 bytes was only ever read from JavaScript. So bdsx-core runs unmodified (the official
1.0.14.2 release). This fork ships a 28-byte `pdbcache.bin` per build, and the address of `main` comes from
the C runtime's startup code: the PE entry point jumps to `__scrt_common_main_seh`, which calls `main` with
argc in `ecx`. That walk reproduces the `main` that the PDB gives on 1.21.3.01, the last build with a PDB.

**The JavaScript side needs names.** bdsx asks for functions by their decorated names
(`?tick@Level@@UEAAXXZ`). In this fork, bdsx's `proc` (`bdsx/bds/symbols.ts`) answers those lookups from a
table that is generated offline and shipped in `symbols/<version>/symbols.json`, instead of from the PDB. The
names stay the same, so the roughly 950 `procHacker` call sites in bdsx did not have to change.

## How the addresses were found

There is no PDB for 1.26, so every address in the table had to be found in the binary. The reference point
is 1.21.3.01. Its PDB gives the 2024 names, their signatures, and their function bodies. The compiler and
the code changed too much in between for byte matching to work: whole-function byte matching paired 1 of
736 functions, and BinDiff got every game function it tried wrong. What worked was structure that the
compiler and linker have to keep:

-   **Virtual tables.** The vftables in `.rdata` are walked and lined up against the 2024 ones. A single
    walk is 90-95% right, so a slot is only kept where two walks from independent seeds agree. The slot
    order of each class is taken from the headers of [Endstone](https://github.com/EndstoneMC/endstone),
    which also publishes an exact name-to-address list for a few dozen functions of each release.
-   **ECS component lookups.** Many Actor getters of 2024 are now a lookup into an EnTT registry. EnTT
    identifies a component by the FNV-1a hash of its type name, so the functions that touch a component can
    be listed by searching for that hash.
-   **Strings and constants.** A log message, a save key or a constant that appears once in the image points
    straight at the function that uses it.
-   **Callers and callees.** A function's callers and callees are compared with those of its 2024 version,
    starting from neighbours that are already confirmed.
-   **Live objects.** On a running server, a launcher captures objects, reads their vftables, and calls
    getters by slot number.
-   **The other build.** Names found in one 1.26 build are carried to the other where both builds line up
    and the function bodies agree.
-   **A hotfix.** 1.26.52.3 has the same functions in the same order as 1.26.51.1. Its table is 1.26.51.1's,
    carried function by function where the two builds' order, size and bytes (up to moved addresses) agree.

Each candidate address is accepted only after its 1.26 disassembly has been read and compared with the 2024
function, and preferably after two independent routes agree. Names that bdsx's events and APIs need were
then confirmed by execution: a Windows host runs each supported build under bdsx, a headless test client joins as a
real 1.26 client (it attacks, jumps, breaks and places blocks, uses items, sleeps, chats), and test plugins
check that each event fires through bdsx's own hook. Calling a function and counting its calls proves the
address but not the prototype: one function was "confirmed" this way and still crashed the server, because
its parameters had changed.

## The RVA table

`symbols/<version>/symbols.json` is generated for exactly one `bedrock_server.exe`. bdsx checks the MD5 at
startup and refuses to run with a table built for another exe. It holds four things:

| field       | contents                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `symbols`   | decorated name -> RVA (address relative to the image base)                                     |
| `layouts`   | class -> member -> offset, for objects whose getter no longer exists                           |
| `accessors` | field accessors whose function was inlined away; bdsx generates the code for them at load time |
| `constants` | the bytes of static constants that 1.26 no longer stores (such as `Vec3::ONE`)                 |

A function whose parameters changed in 1.26 cannot keep its 2024 decorated name. It ships under a `bdsx:`
key instead (`bdsx:Actor::hurt`, `bdsx:Mob::_hurt`), with the bdsx code that calls it updated to match.

At this release, bdsx's code asks for 1,144 names. 592 of them have an address on each of the three builds.
Counting offsets, constants and bdsx's own implementations (below), 1,089 resolve on each. Each table also
holds names that bdsx does not use (12,478 names in all on 1.26.40.8, 14,586 on 1.26.51.1 and 14,568 on
1.26.52.3), most of them found by the vftable walks.

## Derived functions

Some functions no longer exist in 1.26: the compiler inlined them into their callers, or the data they read
moved into ECS components. Many of these do something that bdsx can do itself, such as math on `Vec3`,
`HashedString`'s hash, or reading a field at a known offset. bdsx carries its own implementation of these
functions (`derived()` in `bdsx/bds/symbols.ts`, about 430 of them). Each one is written from what the
function does and checked against the 2024 build's behaviour, not copied from it. A derived function prints
`no address in this build, using bdsx's own implementation` the first time it is used. If a later table
does resolve the name, bdsx calls the function in the binary instead.

Newer code is written against an explicit 1.26 engine layer (`bdsx/bds/engine/`). That layer reads the build
only through named layouts, symbols and component hashes, so what each build has to provide can be listed
before the build is booted.

## Limits

-   **You cannot call any function you like.** Upstream bdsx could look up any of the roughly 700,000
    symbols in the PDB at runtime. Here, only the names in the shipped table resolve. A plugin that hooks or
    calls a name outside the table gets `Symbol not found`, and `pdbcachegen` and searching for symbols by
    name do not work. Adding a name means finding its address for every supported build, as described
    above. When the server boots, it prints red `Symbol not found: ...` lines. These are expected: bdsx only
    fails if a plugin actually calls one of those names.
-   **Not every function has been verified.** The events and APIs that bdsx exposes were run on 1.26.40.8 and
    1.26.51.1, and the full regression set again on 1.26.52.3.
    Many other addresses rest on static evidence only: two routes that agree, and a reading of the
    disassembly. Even where the address is right, the prototype may have changed since 2024. Test a hook on
    a name you have not seen used before you rely on it.
-   **Some functions are bdsx's own implementation.** A derived function behaves like the 2024 original, but
    it is not the 1.26 code. If Mojang changes what that function does in a later build, the derived version
    keeps the old behaviour. A few upstream APIs are gone because BDS 1.26 no longer has the concept at
    all: `DyePowderItemComponent`, `KnockbackResistanceItemComponent`, and copying or moving a
    `SerializedSkin`. Calling them throws "not available on BDS 1.26".
-   **Large engine changes are expensive to follow.** Every BDS build needs a new table, slot numbers shift
    between builds, and there is still no PDB to start from. The change from RakNet to NetherNet shows the
    cost. BDS 1.26.51.1 and 1.26.52.3 ship `transport=nethernet` in `server.properties` (1.26.40.8 ships
    `transport=raknet`). Packet events, player events, chat, kicks, `NetworkIdentifier.getAddress()` and
    `getPing()` work with NetherNet clients, tested with a NetherNet test client over LAN and HTTP
    signalling. But `getAddress()` and `getPing()` needed new native hooks inside BDS's WebRTC code, and
    `bedrockServer.rakPeer` is still RakNet-only: under NetherNet, bdsx prints a `connector: unavailable`
    line at boot, and the `net-ping.ts` example answers with `getPing()` alone. A change of that size in a
    future build means new work, not just a new table.
-   **Some functions have not been found yet.** About 60 of the names that bdsx's code asks for have neither
    an address nor a derived implementation. Among them is `SurvivalMode::destroyBlock`, which the
    `blockevent.ts` example uses.

Other known gaps:

-   **Windows only.** Linux with Wine has not been tried.
-   **Some upstream examples do not work on 1.26.** In `example_and_test/`, `hidemapmarker.ts` and
    `lowlevel-apihooking.ts` hook functions that have a different signature in 1.26. The `example_score`
    command of `net-scorepacket.ts` fails with an error, because `SetScorePacket` still has its 2024 layout.
-   **bdsx no longer reads the console.** BDS 1.26 builds its console reader into its startup code, so bdsx
    cannot replace it. Typed commands still work, but BDS reads them itself, and
    `bedrockServer.DefaultStdInHandler` is not installed. `bedrockServer.executeCommandOnConsole` still works.
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

The rest of this README is upstream's text. The VSCode and `bdsx.bat` instructions still apply.

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
