import * as colors from "colors";
import * as readline from "readline";
import { createAbstractObject } from "./abstractobject";
import { installMinecraftAddons } from "./addoninstaller";
import { asmcode } from "./asm/asmcode";
import { asm, Register } from "./assembler";
import { Bedrock } from "./bds/bedrock";
import { CommandOutputSender, CommandPermissionLevel, CommandRegistry, MinecraftCommands } from "./bds/command";
import { Dimension } from "./bds/dimension";
import { GameRules } from "./bds/gamerules";
import { Level, ServerLevel } from "./bds/level";
import * as nimodule from "./bds/networkidentifier";
import { RakNet } from "./bds/raknet";
import { RakNetConnector } from "./bds/raknetinstance";
import * as bd_server from "./bds/server";
import { StructureManager } from "./bds/structure";
import { proc } from "./bds/symbols";
import type { CommandResult, CommandResultType } from "./commandresult";
import { CANCEL, Encoding } from "./common";
import { Config } from "./config";
import { bedrock_server_exe, cgate, ipfilter, MultiThreadQueue, NativePointer, StaticPointer, uv_async, VoidPointer } from "./core";
import { decay } from "./decay";
import { dll } from "./dll";
import { events } from "./event";
import { GetLine } from "./getline";
import { makefunc } from "./makefunc";
import { AbstractClass, NativeClass, nativeClass, nativeField } from "./nativeclass";
import { bool_t, CxxString, int32_t, int64_as_float_t, int8_t, NativeType, void_t } from "./nativetype";
import { loadAllPlugins } from "./plugins";
import { CxxStringWrapper } from "./pointer";
import { pdbcache } from "./pdbcache";
import { procHacker } from "./prochacker";
import { remapError } from "./source-map-support";
import { ThisGetter } from "./thisgetter";
import { MemoryUnlocker } from "./unlocker";
import { _tickCallback, DeferPromise } from "./util";
import { bdsxEqualsAssert } from "./warning";

declare module "colors" {
    export const brightRed: Color;
    export const brightGreen: Color;
    export const brightYellow: Color;
    export const brightBlue: Color;
    export const brightMagenta: Color;
    export const brightCyan: Color;
    export const brightWhite: Color;
}

class Liner {
    private remaining = "";
    write(str: string): string | null {
        const lastidx = str.lastIndexOf("\n");
        if (lastidx === -1) {
            this.remaining += str;
            return null;
        } else {
            const out = this.remaining + str.substr(0, lastidx);
            this.remaining = str.substr(lastidx + 1);
            return out;
        }
    }
}

(global as any).server = createAbstractObject("Bedrock scripting API is removed");

let launched = false;
let closed = false;
let nonOwnerPointerStructureManager: Bedrock.NonOwnerPointer<StructureManager> | null = null;
const loadingIsFired = DeferPromise.make<void>();
let pendingOpenFromTick: ((level: Level) => void) | null = null;
/** @internal called by event_impl/levelevent.ts from its Level::tick hook */
export function _firstTickHook(level: Level): void {
    if (pendingOpenFromTick === null) return;
    const open = pendingOpenFromTick;
    pendingOpenFromTick = null;
    open(level);
}
const openIsFired = DeferPromise.make<void>();

const bedrockLogLiner = new Liner();

const commandQueue = new MultiThreadQueue(CxxString[NativeType.size]);
const commandQueueBuffer = new CxxStringWrapper(true);

function patchForStdio(): void {
    // hook bedrock log
    asmcode.bedrockLogNp = makefunc.np(
        (severity, msgptr, size) => {
            // void(*callback)(int severity, const char* msg, size_t size)
            let line = bedrockLogLiner.write(msgptr.getString(size, 0, Encoding.Utf8));
            if (line === null) return;

            let color: colors.Color;
            switch (severity) {
                case 1:
                    color = colors.white;
                    break;
                case 2:
                    color = colors.brightWhite;
                    break;
                case 4:
                    color = colors.brightYellow;
                    break;
                default:
                    color = colors.brightRed;
                    break;
            }
            if (events.serverLog.fire(line, color) === CANCEL) return;
            line = color(line);
            console.log(line);
        },
        void_t,
        { onError: asmcode.jsend_returnZero, name: "bedrockLogNp" },
        int32_t,
        StaticPointer,
        int64_as_float_t,
    );
    procHacker.write("?BedrockLogOut@@YAXIPEBDZZ", 0, asm().jmp64(asmcode.logHook, Register.rax));

    asmcode.CommandOutputSenderHookCallback = makefunc.np(
        line => {
            // void(*callback)(std::string* line)
            const lines = line.split("\n");
            if (lines[lines.length - 1].length === 0) lines.pop();

            for (const line of lines) {
                if (events.commandOutput.fire(line) !== CANCEL) {
                    console.log(line);
                }
            }
        },
        void_t,
        {
            onError: asmcode.jsend_returnZero,
            name: `CommandOutputSenderHookCallback`,
        },
        CxxString,
    );

    procHacker.patching(
        // it's hard to replace with the normal hooking method because of it has the lambda call inside.
        "hook-command-output",
        "?send@CommandOutputSender@@UEAAXAEBVCommandOrigin@@AEBVCommandOutput@@@Z",
        0xb8,
        asmcode.CommandOutputSenderHook,
        Register.rdx,
        true,
        // prettier-ignore
        [
            0x41, 0xB9, 0x0C, 0x00, 0x00, 0x00, // mov r9d,C
            0x45, 0x33, 0xC0,                   // xor r8d,r8d
            0x41, 0x8D, 0x51, 0xF5,             // lea edx,qword ptr ds:[r9-B]
            0x33, 0xC9,                         // xor ecx,ecx
            0xE8, null, null, null, null,       // call <bedrock_server.void __cdecl BedrockLog::log(enum BedrockLog::LogCat
        ],
    );

    // hook stdin
    asmcode.commandQueue = commandQueue;
    asmcode.MultiThreadQueueTryDequeue = MultiThreadQueue.tryDequeue;
    procHacker.patching(
        "hook-stdin-command",
        "?getLine@ConsoleInputReader@@QEAA_NAEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z",
        0,
        asmcode.ConsoleInputReader_getLine_hook,
        Register.rax,
        false,
        // prettier-ignore
        [
            0xE9, null, null, null, null,  // jmp SPSCQueue::tryDequeue
            0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, // int3 ...
        ],
    );

    // remove original stdin thread
    const justReturn = asm().ret().buffer();
    procHacker.write("??0ConsoleInputReader@@QEAA@XZ", 0, justReturn);
    procHacker.write("??1ConsoleInputReader@@QEAA@XZ", 0, justReturn);
    procHacker.write("?unblockReading@ConsoleInputReader@@QEAAXXZ", 0, justReturn);
}

@nativeClass()
class ServerNetworkSystem extends NativeClass {
    @nativeField(nimodule.NetworkSystem, 0x18)
    networkSystem: nimodule.NetworkSystem;
}

function _launch(asyncResolve: () => void): void {
    // check memory corruption for debug core
    if (cgate.memcheck != null) {
        const memcheck = setInterval(() => {
            cgate.memcheck!();
        }, 500);
        events.serverClose.on(() => {
            clearInterval(memcheck);
        });
    }

    ipfilter.init(ip => {
        console.error(`[BDSX] traffic exceeded threshold for IP: ${ip}`);
    });

    asmcode.evWaitGameThreadEnd = dll.kernel32.CreateEventW(null, 0, 0, null);

    uv_async.open();

    // uv async callback, when BDS closed perfectly (end of the main function)
    function finishCallback(): void {
        closed = true; // for if BDS failed to execute the game thread.

        uv_async.close();
        threadHandle.close();
        events.serverClose.fire();
        events.serverClose.clear();
        _tickCallback();
    }

    // replace unicode encoder
    // int Core::StringConversions::toWide(char const *, int, wchar_t *, int)
    const StringConversions$toWide = "?toWide@StringConversions@Core@@SAHPEBDHPEA_WH@Z";
    // int Core::StringConversions::toUtf8(wchar_t const *, int, char *, int)
    const StringConversions$toUtf8 = "?toUtf8@StringConversions@Core@@SAHPEB_WHPEADH@Z";
    proc[StringConversions$toWide];
    proc[StringConversions$toUtf8];
    if (Config.REPLACE_UNICODE_ENCODER) {
        procHacker.write(StringConversions$toWide, 0, asm().jmp64(cgate.toWide, Register.rax));
        procHacker.write(StringConversions$toUtf8, 0, asm().jmp64(cgate.toUtf8, Register.rax));
    }

    // events
    asmcode.SetEvent = dll.kernel32.SetEvent.pointer;
    asmcode.CloseHandle = dll.kernel32.CloseHandle.pointer;
    asmcode.CreateEventW = dll.kernel32.CreateEventW.pointer;
    asmcode.WaitForSingleObject = dll.kernel32.WaitForSingleObject.pointer;

    // call game thread entry
    asmcode.gameThreadStart = makefunc.np(() => {
        // empty
    }, void_t);
    asmcode.gameThreadFinish = makefunc.np(() => {
        closed = true;
        // Fields that serverOpen could not fill still hold the "BDS is not
        // loaded yet" object, whose every access throws; a throw here, inside
        // a native callback at shutdown, is reported as a native crash.
        const decayIfReal = (key: keyof typeof bedrockServer): void => {
            const desc = Object.getOwnPropertyDescriptor(bedrockServer, key);
            if (desc === undefined || desc.value === bedrockServer._abstractobject) return;
            decay(desc.value);
        };
        for (const key of [
            "serverInstance",
            "networkSystem",
            "minecraft",
            "dedicatedServer",
            "level",
            "serverNetworkHandler",
            "minecraftCommands",
            "commandRegistry",
            "gameRules",
            "connector",
            "rakPeer",
            "commandOutputSender",
        ] as (keyof typeof bedrockServer)[]) {
            decayIfReal(key);
        }
        const nonOwner = Object.getOwnPropertyDescriptor(bedrockServer, "nonOwnerPointerServerNetworkHandler");
        if (nonOwner !== undefined && nonOwner.value !== bedrockServer._abstractobject) {
            bedrockServer.nonOwnerPointerServerNetworkHandler.dispose();
            decay(bedrockServer.nonOwnerPointerServerNetworkHandler);
        }
        if (nonOwnerPointerStructureManager != null) {
            nonOwnerPointerStructureManager.dispose();
            decayIfReal("structureManager");
        }
    }, void_t);
    asmcode.free = dll.ucrtbase.free.pointer;

    // hook game thread
    asmcode._Cnd_do_broadcast_at_thread_exit = dll.msvcp140._Cnd_do_broadcast_at_thread_exit;

    // Both of these are callers of ServerInstance::_update. Neither carries a
    // string literal, so they are found structurally instead: _Invoke is the
    // .text function that calls the MSVCP140 import
    // _Cnd_do_broadcast_at_thread_exit and whose call closure reaches the
    // server tick markers. See tools/find-gamethread.mjs.
    const GAME_THREAD_INVOKE = "std::thread::_Invoke<std::tuple<<lambda_261fc769b4b17f58193d57d5f3ee7db9> >,0>";
    const GAME_THREAD_LAMBDA = "<lambda_261fc769b4b17f58193d57d5f3ee7db9>::operator()";

    if (GAME_THREAD_LAMBDA in proc) {
        // The lambda is its own function and _Invoke calls it, so the call is
        // what gets replaced and _Invoke's own prologue and tail are untouched.
        asmcode.gameThreadInner = proc[GAME_THREAD_LAMBDA];
        procHacker.patching(
            "hook-game-thread",
            GAME_THREAD_INVOKE,
            6,
            asmcode.gameThreadHook, // original depended
            Register.rax,
            true,
            // prettier-ignore
            [
                0x48, 0x8B, 0xD9, // mov rbx,rcx
                0xE8, null, null, null, null, // call <bedrock_server.<lambda_261fc769b4b17f58193d57d5f3ee7db9>::operator()>
                0xE8, null, null, null, null, // call <bedrock_server._Cnd_do_broadcast_at_thread_exit>
            ],
            // [4, 8, 9, 13], // [4, 8), [9, 13)
        );
    } else {
        // 1.26.40.8 inlined the lambda into _Invoke: _Invoke is 6046 bytes
        // against 45 in 1.21.3.01, and nothing in the binary has the lambda's
        // address to take. So _Invoke itself becomes the inner function --
        // prologue-relocated by hookingRaw, which its eight leading pushes
        // suit -- and the hook replaces _Invoke rather than a call inside it.
        //
        // gameThreadHook was written to be patched *into* _Invoke, after
        // _Invoke had already pushed rbx, so it clobbers rbx and leaves the
        // stack to its caller. Standing in for a whole function it has to
        // preserve rbx and reserve its own shadow space.
        const replacement = asm()
            .push_r(Register.rbx)
            .sub_r_c(Register.rsp, 0x20)
            .call64(asmcode.gameThreadHook, Register.rax)
            .add_r_c(Register.rsp, 0x20)
            .pop_r(Register.rbx)
            .ret()
            .alloc("game thread _Invoke replacement");
        procHacker.hookingRaw(GAME_THREAD_INVOKE, original => {
            asmcode.gameThreadInner = original;
            return replacement;
        });
        // NOTE, unverified: the inlined body still ends with its own
        // _Cnd_do_broadcast_at_thread_exit, which now runs on the node loop
        // thread, and gameThreadHook tail-jumps to it again on the BDS thread.
        // The original design called it once, on the BDS thread. Check this at
        // shutdown before trusting it.
    }

    const instances = {} as {
        serverInstance: bd_server.ServerInstance;
        serverNetworkSystem: ServerNetworkSystem;
        dedicatedServer: bd_server.DedicatedServer;
        minecraft: bd_server.Minecraft;
        commandRegistryFromRegister: CommandRegistry | null;
        serverNetworkHandlerFromAnnounce: nimodule.ServerNetworkHandler | null;
    };
    const thisGetter = new ThisGetter(instances);
    thisGetter.register(
        bd_server.ServerInstance,
        "??0ServerInstance@@QEAA@AEAVIMinecraftApp@@AEBV?$not_null@V?$NonOwnerPointer@VServerInstanceEventCoordinator@@@Bedrock@@@gsl@@@Z",
        "serverInstance",
    );
    thisGetter.register(
        ServerNetworkSystem,
        "??0ServerNetworkSystem@@QEAA@AEAVScheduler@@AEBV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@AEBUNetworkSystemToggles@@AEBV?$NonOwnerPointer@VNetworkDebugManager@@@Bedrock@@V?$ServiceReference@VServicesManager@@@@V?$not_null@V?$NonOwnerPointer@VNetworkSessionOwner@@@Bedrock@@@gsl@@UNetworkSettingOptions@@@Z",
        "serverNetworkSystem",
    );
    thisGetter.register(bd_server.DedicatedServer, "??0DedicatedServer@@QEAA@XZ", "dedicatedServer");
    // Two instances that need no constructor: CommandRegistry::registerCommand
    // hands over the registry as `this` dozens of times during startup, and
    // updateServerAnnouncement the ServerNetworkHandler. Both symbols are
    // execution-confirmed on 1.26.40.8; the last capture wins.
    thisGetter.register(
        CommandRegistry,
        "?registerCommand@CommandRegistry@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@PEBDW4CommandPermissionLevel@@UCommandFlag@@3@Z",
        "commandRegistryFromRegister",
    );
    thisGetter.register(nimodule.ServerNetworkHandler, "?updateServerAnnouncement@ServerNetworkHandler@@QEAAXXZ", "serverNetworkHandlerFromAnnounce");
    thisGetter.register(
        bd_server.Minecraft,
        "??0Minecraft@@QEAA@AEAVIMinecraftApp@@AEAVGameCallbacks@@AEAVAllowList@@PEAVPermissionsFile@@AEBV?$not_null@V?$NonOwnerPointer@VFilePathManager@Core@@@Bedrock@@@gsl@@V?$duration@_JU?$ratio@$00$00@std@@@chrono@std@@AEAVIMinecraftEventing@@VClientOrServerNetworkSystemRef@@AEAVPacketSender@@W4SubClientId@@AEAVTimer@@AEAVTimer@@AEBV?$not_null@V?$NonOwnerPointer@$$CBVIContentTierManager@@@Bedrock@@@6@PEAVServerMetrics@@@Z",
        "minecraft",
    );

    patchForStdio();

    // seh wrapped main
    bedrock_server_exe.args.as(NativePointer).setPointer(null, 8); // remove options
    asmcode.bedrock_server_exe_args = bedrock_server_exe.args;
    asmcode.bedrock_server_exe_argc = 1; // bedrock_server_exe.argc;
    asmcode.bedrock_server_exe_main = bedrock_server_exe.main;
    asmcode.finishCallback = makefunc.np(finishCallback, void_t);

    {
        // restore main
        const unlock = new MemoryUnlocker(bedrock_server_exe.main, 12);
        bedrock_server_exe.main.add().copyFrom(bedrock_server_exe.mainOriginal12Bytes, 12);
        unlock.done();
    }

    // call main as a new thread
    // main will create a game thread.
    // and bdsx will hijack the game thread and run it on the node thread.
    const threadHandle = dll.kernel32.CreateThread(null, 0, asmcode.wrapped_main, null, 0, asmcode.addressof_bdsMainThreadId);

    // Upstream order: the modules load (and install their hooks) after the
    // BDS thread starts. Loading them first was tried and the node thread
    // then hung before BDS printed a line, so the order stays.
    // BDSX_SKIP=implements,events bisects a boot failure to one of the two.
    const skip = (process.env.BDSX_SKIP ?? "").split(",");
    if (!skip.includes("implements")) require("./bds/implements");
    if (!skip.includes("events")) require("./event_impl");

    loadingIsFired.resolve();
    events.serverLoading.promiseFire();
    events.serverLoading.clear();

    // hook on update
    asmcode.cgateNodeLoop = cgate.nodeLoop;
    events.serverUpdate.setInstaller(() => {
        asmcode.updateEvTargetFire = makefunc.np(
            () => {
                events.serverUpdate.fire();
            },
            void_t,
            { name: "events.serverUpdate.fire" },
        );
    });

    /**
     * it hooks the sleep part of the server and inject the node message loop.
     */
    procHacker.patching(
        "update-hook",
        "<lambda_261fc769b4b17f58193d57d5f3ee7db9>::operator()", // caller of ServerInstance::_update
        0x8b6,
        asmcode.updateWithSleep,
        Register.rax,
        true,
        // prettier-ignore
        [
            0x48, 0x2B, 0xC8,                         // sub rcx,rax
            0x48, 0x81, 0xF9, 0x88, 0x13, 0x00, 0x00, // cmp rcx,1388
            0x7C, 0x0B,                               // jl bedrock_server.7FF743BA7B50
            0x48, 0x8D, 0x4C, 0x24, 0x20,             // lea rcx,qword ptr ss:[rsp+20]
            0xE8, null, null, null, null,             // call <bedrock_server.void __cdecl std::this_thread::sleep_until<struct std::chrono::steady_clock,class std::chrono::duration<__int64,struct std::ratio<1,1000000000> > >(class std::chrono::ti
            0x90,                                     // nop
        ],
    );

    // The open block. Every acquisition is attempted on its own: with the
    // static symbol table incomplete (docs/status.md), a missing getter must
    // cost one field, not the whole of serverOpen. Fields that could not be
    // filled keep the "BDS is not loaded yet" abstract object.
    const attempt = <T>(what: string, fn: () => T): T | null => {
        try {
            return fn();
        } catch (err) {
            console.error(colors.yellow(`[bdsx] ${what}: unavailable (${(err as Error).message})`));
            return null;
        }
    };
    const onServerOpen = (levelFromTick: Level | null): void => {
        try {
            _tickCallback();
            cgate.nodeLoopOnce();

            const Minecraft$getLevel = procHacker.js("?getLevel@Minecraft@@QEBAPEAVLevel@@XZ", Level, null, bd_server.Minecraft);
            const Minecraft$getCommands = procHacker.js(
                "?getCommands@Minecraft@@QEAAAEAVMinecraftCommands@@XZ",
                MinecraftCommands,
                null,
                bd_server.Minecraft,
            );
            const MinecraftCommands$getRegistry = procHacker.js(
                "?getRegistry@MinecraftCommands@@QEAAAEAVCommandRegistry@@XZ",
                CommandRegistry,
                null,
                MinecraftCommands,
            );
            const Level$getGameRules = procHacker.js("?getGameRules@Level@@UEAAAEAVGameRules@@XZ", GameRules, null, Level);
            const RakNetConnector$getPeer = procHacker.js(
                "?getPeer@RakNetConnector@@UEAAPEAVRakPeerInterface@RakNet@@XZ",
                RakNet.RakPeer,
                null,
                RakNetConnector,
            );

            // All pointer is found from ServerInstance::startServerThread with debug breaking.
            thisGetter.finish();
            const { serverInstance, dedicatedServer, serverNetworkSystem, minecraft, commandRegistryFromRegister, serverNetworkHandlerFromAnnounce } = instances;
            const layouts = pdbcache.layouts;
            const networkSystem = serverNetworkSystem != null ? attempt("networkSystem", () => serverNetworkSystem.networkSystem) : null;

            const level = levelFromTick ?? (minecraft != null ? attempt("level", () => Minecraft$getLevel(minecraft)) : null);
            const nonOwnerPointerServerNetworkHandler = minecraft != null ? attempt("serverNetworkHandler", () => minecraft.getNonOwnerPointerServerNetworkHandler()) : null;
            let minecraftCommands: MinecraftCommands | null = null;
            if (minecraft != null) {
                if ("?getCommands@Minecraft@@QEAAAEAVMinecraftCommands@@XZ" in proc) {
                    minecraftCommands = attempt("minecraftCommands", () => Minecraft$getCommands(minecraft));
                } else if (layouts.Minecraft?.commands != null) {
                    // the getter is a load from this offset; the offset was read from the live object
                    minecraftCommands = (minecraft as any as StaticPointer).getPointerAs(MinecraftCommands, layouts.Minecraft.commands);
                } else {
                    console.error(colors.yellow("[bdsx] minecraftCommands: no getter symbol and no Minecraft layout for this build"));
                }
            }
            if (minecraftCommands != null && "??_7MinecraftCommands@@6B@" in proc) {
                bdsxEqualsAssert(minecraftCommands.vftable, proc["??_7MinecraftCommands@@6B@"], "Invalid minecraftCommands instance");
            }

            let commandRegistry: CommandRegistry | null = null;
            if (minecraftCommands != null && "?getRegistry@MinecraftCommands@@QEAAAEAVCommandRegistry@@XZ" in proc) {
                commandRegistry = attempt("commandRegistry", () => MinecraftCommands$getRegistry(minecraftCommands!));
            } else if (commandRegistryFromRegister != null) {
                commandRegistry = commandRegistryFromRegister;
            }
            const gameRules = level != null ? attempt("gameRules", () => Level$getGameRules(level)) : null;

            let connector: RakNetConnector | null = null;
            let rakPeer: RakNet.RakPeer | null = null;
            if (networkSystem != null) {
                attempt("connector", () => {
                    const NetworkSystem$getConnector = procHacker.js(
                        "?getRemoteConnector@NetworkSystem@@QEAA?AV?$not_null@V?$NonOwnerPointer@VRemoteConnector@@@Bedrock@@@gsl@@XZ",
                        Bedrock.NonOwnerPointer.make(RakNetConnector),
                        { structureReturn: true, this: nimodule.NetworkSystem },
                    );
                    const nonOwnerPointerConnector: Bedrock.NonOwnerPointer<RakNetConnector> = NetworkSystem$getConnector.call(networkSystem);
                    connector = nonOwnerPointerConnector.get()!.subAs(RakNetConnector, 48); // adjust
                    if ("??_7RakNetConnector@@6BConnector@@@" in proc) {
                        bdsxEqualsAssert(connector.vftable, proc["??_7RakNetConnector@@6BConnector@@@"], "Invalid connector");
                    }
                    rakPeer = RakNetConnector$getPeer(connector);
                    nonOwnerPointerConnector.dispose();
                    if ("??_7RakPeer@RakNet@@6BRakPeerInterface@1@@" in proc) {
                        bdsxEqualsAssert(rakPeer.vftable, proc["??_7RakPeer@RakNet@@6BRakPeerInterface@1@@"], "Invalid rakPeer");
                    }
                });
            }
            const commandOutputSender = minecraftCommands != null ? (minecraftCommands as any as StaticPointer).getPointerAs(CommandOutputSender, 0x8) : null;
            const serverNetworkHandler =
                nonOwnerPointerServerNetworkHandler == null && serverNetworkHandlerFromAnnounce != null
                    ? serverNetworkHandlerFromAnnounce
                    : nonOwnerPointerServerNetworkHandler != null
                    ? attempt("serverNetworkHandler", () => {
                          const handler = nonOwnerPointerServerNetworkHandler.get()!.subAs(nimodule.ServerNetworkHandler, 0x10); // XXX: unknown state. cut corners.
                          if ("??_7ServerNetworkHandler@@6BEnableQueueForMainThread@Threading@Bedrock@@@" in proc) {
                              bdsxEqualsAssert(
                                  handler.vftable,
                                  proc["??_7ServerNetworkHandler@@6BEnableQueueForMainThread@Threading@Bedrock@@@"],
                                  "Invalid serverNetworkHandler",
                              );
                          }
                          return handler;
                      })
                    : null;
            let structureManager: StructureManager | null = null;
            if (level != null) {
                attempt("structureManager", () => {
                    const Level$getStructureManager = procHacker.js(
                        "?getStructureManager@Level@@UEAA?AV?$not_null@V?$NonOwnerPointer@VStructureManager@@@Bedrock@@@gsl@@XZ",
                        Bedrock.NonOwnerPointer.make(StructureManager),
                        { this: Level, structureReturn: true },
                    );
                    nonOwnerPointerStructureManager = Level$getStructureManager.call(level);
                    structureManager = nonOwnerPointerStructureManager!.get()!;
                    if ("??_7StructureManager@@6B@" in proc) {
                        bdsxEqualsAssert(structureManager.vftable, proc["??_7StructureManager@@6B@"], "level.getStructureManager()");
                    }
                });
            }

            const fields: Record<string, unknown> = {
                serverInstance,
                networkHandler: networkSystem,
                networkSystem,
                minecraft,
                dedicatedServer,
                level,
                serverNetworkHandler,
                nonOwnerPointerServerNetworkHandler,
                minecraftCommands,
                commandRegistry,
                gameRules,
                raknetInstance: connector,
                connector,
                rakPeer,
                commandOutputSender,
                structureManager,
            };
            const missing: string[] = [];
            for (const [key, value] of Object.entries(fields)) {
                if (value == null) {
                    missing.push(key);
                    continue;
                }
                Object.defineProperty(bedrockServer, key, { value });
            }
            if (missing.length !== 0) {
                console.error(colors.yellow(`[bdsx] serverOpen with ${missing.length} field(s) unavailable on this build: ${missing.join(", ")}`));
            }

            if (serverInstance != null) {
                Object.defineProperty(bd_server, "serverInstance", {
                    value: serverInstance,
                });
            }
            if (networkSystem != null) {
                Object.defineProperty(nimodule, "networkSystem", {
                    value: networkSystem,
                });
            }

            openIsFired.resolve();
            events.serverOpen.fire();
            events.serverOpen.clear(); // it will never fire again, clear it
            asyncResolve();

            _tickCallback();
            cgate.nodeLoopOnce();
        } catch (err) {
            events.errorFire(err);
        }
    };

    // hook on script starting
    const SERVER_THREAD_STARTED = "?sendServerThreadStarted@ServerInstanceEventCoordinator@@QEAAXAEAVServerInstance@@@Z";
    if (SERVER_THREAD_STARTED in proc) {
        procHacker.hookingRawWithCallOriginal(
            SERVER_THREAD_STARTED,
            makefunc.np(() => onServerOpen(null), void_t, { name: "hook of ScriptEngine::startScriptLoading", onlyOnce: true }, VoidPointer),
            [Register.rcx, Register.rdx],
            [],
        );
    } else {
        // Without the symbol that marks the server thread start, the first
        // Level::tick is the moment: the level exists, the game loop is on
        // the node thread, and `this` is the Level itself. event_impl/
        // levelevent.ts already hooks Level::tick and hands `this` to
        // _firstTickHook; a second hook on the same function is what took
        // the server down on 1.26.40.8.
        console.error(colors.yellow("[bdsx] sendServerThreadStarted is not in the symbol table; serverOpen fires on the first Level::tick instead"));
        pendingOpenFromTick = onServerOpen;
    }

    procHacker.hookingRawWithCallOriginal(
        "?startLeaveGame@Minecraft@@QEAAX_N@Z",
        makefunc.np(
            (mc, b) => {
                events.serverLeave.fire();
            },
            void_t,
            { name: "hook of Minecraft::startLeaveGame" },
            bd_server.Minecraft,
            bool_t,
        ),
        [Register.rcx, Register.rdx],
        [],
    );
    const sendEvent = procHacker.hooking(
        "?sendEvent@ServerInstanceEventCoordinator@@QEAAXAEBV?$EventRef@U?$ServerInstanceGameplayEvent@X@@@@@Z",
        void_t,
        { name: "hook of shutdown" },
        VoidPointer,
        EventRef$ServerInstanceGameplayEvent$Void,
    )((_this, ev) => {
        if (!ev.restart) {
            events.serverStop.fire();
            _tickCallback();
        } else {
            events.resourceReload.fire();
        }
        sendEvent(_this, ev);
    });

    // graceful kill for Network port occupied
    // BDS crashes at terminating on `Network port occupied`. it kills the crashing thread and keeps the node thread.
    // and BDSX finishes at the end of the node thread.
    asmcode.terminate = dll.ucrtbase.module.getProcAddress("terminate");
    asmcode.ExitThread = dll.kernel32.module.getProcAddress("ExitThread");
    procHacker.hookingRawWithoutOriginal("?terminate@details@gsl@@YAXXZ", asmcode.terminateHook);

    /**
     * send stdin to bedrockServer.executeCommandOnConsole
     * without this, you need to control stdin manually
     */
    // bdsx's stdin handler replaces BDS's ConsoleInputReader, which the three
    // patches above neuter. Without those symbols BDS keeps its own reader,
    // and a second reader on the same stdin takes the server down at start;
    // so BDS keeps the console and bdsx does not intercept typed commands.
    if (skip.includes("stdin")) {
        // bisection switch
    } else if ("??0ConsoleInputReader@@QEAA@XZ" in proc) {
        bedrockServer.DefaultStdInHandler.install();
    } else {
        console.error(colors.yellow("[bdsx] ConsoleInputReader is not in the symbol table; BDS keeps its own console reader"));
    }
}

const stopfunc = procHacker.js("?stop@DedicatedServer@@UEAA_NXZ", void_t, null, VoidPointer);

function sessionIdGrabber(text: string): void {
    const tmp = text.match(/\[\d{4}-\d\d-\d\d \d\d:\d\d:\d\d:\d{3} INFO\] Session ID (.*)$/);
    if (tmp) {
        bedrockServer.sessionId = tmp[1];
        events.serverLog.remove(sessionIdGrabber);
    }
}
events.serverLog.on(sessionIdGrabber);

export namespace bedrockServer {
    export let sessionId: string;

    const abstractobject = createAbstractObject("BDS is not loaded yet");
    /** @internal the placeholder every unfilled field holds, for the shutdown guard */
    export const _abstractobject = abstractobject;
    // eslint-disable-next-line prefer-const
    export let serverInstance: bd_server.ServerInstance = abstractobject;
    // eslint-disable-next-line prefer-const
    export let networkHandler: nimodule.NetworkSystem = abstractobject;
    // eslint-disable-next-line prefer-const
    export let networkSystem: nimodule.NetworkSystem = abstractobject;
    // eslint-disable-next-line prefer-const
    export let minecraft: bd_server.Minecraft = abstractobject;
    // eslint-disable-next-line prefer-const
    export let level: ServerLevel = abstractobject;
    // eslint-disable-next-line prefer-const
    export let serverNetworkHandler: nimodule.ServerNetworkHandler = abstractobject;
    // eslint-disable-next-line prefer-const
    export let dedicatedServer: bd_server.DedicatedServer = abstractobject;
    // eslint-disable-next-line prefer-const
    export let minecraftCommands: MinecraftCommands = abstractobject;
    // eslint-disable-next-line prefer-const
    export let commandRegistry: CommandRegistry = abstractobject;
    // eslint-disable-next-line prefer-const
    export let gameRules: GameRules = abstractobject;
    /**
     * @alias bedrockServer.connector
     */
    // eslint-disable-next-line prefer-const
    export let raknetInstance: RakNetConnector = abstractobject;
    // eslint-disable-next-line prefer-const
    export let connector: RakNetConnector = abstractobject;
    // eslint-disable-next-line prefer-const
    export let rakPeer: RakNet.RakPeer = abstractobject;
    // eslint-disable-next-line prefer-const
    export let commandOutputSender: CommandOutputSender = abstractobject;
    // eslint-disable-next-line prefer-const
    export let nonOwnerPointerServerNetworkHandler: Bedrock.NonOwnerPointer<nimodule.ServerNetworkHandler> = abstractobject;
    // eslint-disable-next-line prefer-const
    export let structureManager: StructureManager = abstractobject;

    Object.defineProperty(bd_server, "serverInstance", {
        value: abstractobject,
        writable: true,
    });
    Object.defineProperty(nimodule, "networkSystem", {
        value: abstractobject,
        writable: true,
    });

    export function withLoading(): Promise<void> {
        return loadingIsFired;
    }
    export function afterOpen(): Promise<void> {
        return openIsFired;
    }

    /**
     * @remark It does not check BDS is loaded fully. It only checks the launch is called.
     * @deprecated Not intuitive & Useless.
     */
    export function isLaunched(): boolean {
        return launched;
    }

    export function isClosed(): boolean {
        return closed;
    }

    /**
     * stop the BDS
     * It will stop next tick
     */
    export function stop(): void {
        stopfunc(bedrockServer.dedicatedServer.add(8));
    }

    export function forceKill(exitCode: number): never {
        bedrock_server_exe.forceKill(exitCode);
    }

    export async function launch(): Promise<void> {
        if (launched) {
            throw remapError(Error("Cannot launch BDS again"));
        }
        launched = true;

        await Promise.all([loadAllPlugins(), installMinecraftAddons()]);

        await new Promise<void>(_launch);
    }

    /**
     * pass to stdin
     */
    export function executeCommandOnConsole(command: string): void {
        commandQueueBuffer.construct();
        commandQueueBuffer.value = command;
        commandQueue.enqueue(commandQueueBuffer); // assumes the string is moved, and does not have the buffer anymore.
    }

    export declare function executeCommand(
        command: `testfor ${string}`,
        mute?: CommandResultType,
        permissionLevel?: CommandPermissionLevel,
        dimension?: Dimension | null,
    ): CommandResult<CommandResult.TestFor>;

    export declare function executeCommand(
        command: `testforblock ${string}`,
        mute?: CommandResultType,
        permissionLevel?: CommandPermissionLevel,
        dimension?: Dimension | null,
    ): CommandResult<CommandResult.TestForBlock>;

    export declare function executeCommand(
        command: `testforblocks ${string}`,
        mute?: CommandResultType,
        permissionLevel?: CommandPermissionLevel,
        dimension?: Dimension | null,
    ): CommandResult<CommandResult.TestForBlocks>;

    export declare function executeCommand(
        command: "list",
        mute?: CommandResultType,
        permissionLevel?: CommandPermissionLevel,
        dimension?: Dimension | null,
    ): CommandResult<CommandResult.List>;

    /**
     * it does the same thing with executeCommandOnConsole
     * but call the internal function directly
     * @param mute suppress outputs if true, returns data if null
     */
    export declare function executeCommand(
        command: string,
        mute?: CommandResultType,
        permissionLevel?: CommandPermissionLevel | null,
        dimension?: Dimension | null,
    ): CommandResult<CommandResult.Any>;

    let stdInHandler: DefaultStdInHandler | null = null;

    export abstract class DefaultStdInHandler {
        protected online: (line: string) => void = executeCommandOnConsole;
        protected readonly onclose = (): void => {
            this.close();
        };

        protected constructor() {
            // empty
        }

        abstract close(): void;

        static install(): DefaultStdInHandler {
            if (Config.USE_NATIVE_STDIN_HANDLER) {
                return NativeStdInHandler.install();
            } else {
                return NodeStdInHandler.install();
            }
        }
    }

    /**
     * this handler has bugs on Linux+Wine
     */
    export class NodeStdInHandler extends DefaultStdInHandler {
        private readonly rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        constructor() {
            super();

            this.rl.on("line", line => this.online(line));
            events.serverClose.on(this.onclose);
        }

        close(): void {
            if (stdInHandler === null) return;
            console.assert(stdInHandler !== null);
            stdInHandler = null;
            this.rl.close();
            this.rl.removeAllListeners();
            events.serverClose.remove(this.onclose);
        }

        static install(): NodeStdInHandler {
            if (stdInHandler !== null) throw remapError(Error("Already opened"));
            return (stdInHandler = new NodeStdInHandler());
        }
    }

    export class NativeStdInHandler extends DefaultStdInHandler {
        private readonly getline = new GetLine(line => this.online(line));
        constructor() {
            super();
            events.serverClose.on(this.onclose);
        }

        close(): void {
            if (stdInHandler === null) return;
            console.assert(stdInHandler !== null);
            stdInHandler = null;
            this.getline.close();
        }

        static install(): NativeStdInHandler {
            if (stdInHandler !== null) throw remapError(Error("Already opened"));
            return (stdInHandler = new NativeStdInHandler());
        }
    }
}

/**
 * temporal name
 */
@nativeClass()
class EventRef$ServerInstanceGameplayEvent$Void extends AbstractClass {
    @nativeField(int8_t, 0x18)
    restart: int8_t; // assumed, inaccurate
}
