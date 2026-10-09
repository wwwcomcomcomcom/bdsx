import * as colors from "colors";
import * as readline from "readline";
import { createAbstractObject } from "./abstractobject";
import { installMinecraftAddons } from "./addoninstaller";
import { asmcode } from "./asm/asmcode";
import { asm, Register } from "./assembler";
import { Bedrock } from "./bds/bedrock";
import { CommandContext, CommandOutputSender, CommandPermissionLevel, CommandRegistry, MinecraftCommands } from "./bds/command";
import { Dimension } from "./bds/dimension";
import { GameRules } from "./bds/gamerules";
import { Level, ServerLevel } from "./bds/level";
import * as nimodule from "./bds/networkidentifier";
import { RakNet } from "./bds/raknet";
import { RakNetConnector } from "./bds/raknetinstance";
import * as bd_server from "./bds/server";
import { copyLevelServerNetworkHandler } from "./bds/engine/networkhandler";
import { levelStructureManager } from "./bds/engine/structure";
import { engineLayout } from "./bds/engine/deps";
import { StructureManager } from "./bds/structure";
import { derived, proc } from "./bds/symbols";
import { minecraftCommandsRegistry, minecraftLevel } from "./bds/engine/serverfields";
import type { CommandResult } from "./commandresult";
import { CommandResultType } from "./commandresult";
import { CANCEL, Encoding } from "./common";
import { Config } from "./config";
import { capi } from "./capi";
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
let structureManagerTaken = false;
const loadingIsFired = DeferPromise.make<void>();
let pendingOpenFromTick: ((level: Level) => void) | null = null;
let serverStopHooked = true;
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
/** the getLine patch below is what dequeues commandQueue; without the symbol executeCommandOnConsole runs commands itself */
const CONSOLE_GETLINE = "?getLine@ConsoleInputReader@@QEAA_NAEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@Z";
/** mce::UUID::EMPTY.asString(): the request id of the origin BDS builds for a console line */
const CONSOLE_REQUEST_ID = "00000000-0000-0000-0000-000000000000";
const consoleCommands: string[] = [];

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
    if ("bdsx:BedrockLogOut" in proc) {
        // BDS 1.26 keeps BedrockLogOut only as a clone whose one caller always
        // passed "%s": the format was constant-propagated away, so the priority
        // is in ecx, the message in r8 and rdx is dead. Put "%s" back in rdx and
        // enter the same hook (docs/findings-inventory.md, A1-c).
        const fmt = capi.malloc(3);
        fmt.setUint8(0x25, 0);
        fmt.setUint8(0x73, 1);
        fmt.setUint8(0, 2);
        procHacker.write("bdsx:BedrockLogOut", 0, asm().mov_r_c(Register.rdx, fmt).jmp64(asmcode.logHook, Register.rax));
    } else {
        procHacker.write("?BedrockLogOut@@YAXIPEBDZZ", 0, asm().jmp64(asmcode.logHook, Register.rax));
    }

    const commandOutputSenderHookCallback = makefunc.np(
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
    asmcode.CommandOutputSenderHookCallback = commandOutputSenderHookCallback;

    // send joins the output's messages into one std::string on its frame and hands it to BedrockLog::log; the patch
    // replaces that call with one to the callback above. Where the call sits, which frame slot holds the string and
    // the call's bytes are per build (docs/findings-scoreboard.md section 15): 2024 send+0xb8, the string at rbp+7;
    // 1.26.40/51 send+0x147, the string at rbp+0x18, the same log arguments set in another order. A table without
    // the entry gets 2024's values, and procHacker.patching skips (red "code does not match") unless the bytes agree.
    const sendLogCallForms: (number | null)[][] = [
        // prettier-ignore
        [
            0x41, 0xB9, 0x0C, 0x00, 0x00, 0x00, // mov r9d,C
            0x45, 0x33, 0xC0,                   // xor r8d,r8d
            0x41, 0x8D, 0x51, 0xF5,             // lea edx,qword ptr ds:[r9-B]
            0x33, 0xC9,                         // xor ecx,ecx
            0xE8, null, null, null, null,       // call <bedrock_server.void __cdecl BedrockLog::log(enum BedrockLog::LogCat
        ],
        // prettier-ignore
        [
            0x31, 0xC9,                         // xor ecx,ecx
            0xBA, 0x01, 0x00, 0x00, 0x00,       // mov edx,1
            0x45, 0x31, 0xC0,                   // xor r8d,r8d (the 31 /r encoding; 2024's is 33 /r)
            0x41, 0xB9, 0x0C, 0x00, 0x00, 0x00, // mov r9d,C
            0xE8, null, null, null, null,       // call BedrockLog::log
        ],
    ];
    const sendLogCall = engineLayout("CommandOutputSender::send", "logCall", 0xb8);
    const sendLogCallForm = sendLogCallForms[engineLayout("CommandOutputSender::send", "logCallForm", 0)];
    const sendText = engineLayout("CommandOutputSender::send", "text", 7);
    if (sendLogCallForm === undefined) {
        console.error(colors.red("hook-command-output: unknown layouts[CommandOutputSender::send].logCallForm, skip"));
    } else {
        const commandOutputSenderHook = asm()
            .sub_r_c(Register.rsp, 0x28)
            .lea_r_rp(Register.rcx, Register.rbp, 1, sendText)
            .call64(commandOutputSenderHookCallback, Register.rax)
            .add_r_c(Register.rsp, 0x28)
            .ret()
            .alloc("hook-command-output");
        procHacker.patching(
            // it's hard to replace with the normal hooking method because of it has the lambda call inside.
            "hook-command-output",
            "?send@CommandOutputSender@@UEAAXAEBVCommandOrigin@@AEBVCommandOutput@@@Z",
            sendLogCall,
            commandOutputSenderHook,
            Register.rdx,
            true,
            sendLogCallForm,
        );
    }

    // hook stdin
    asmcode.commandQueue = commandQueue;
    asmcode.MultiThreadQueueTryDequeue = MultiThreadQueue.tryDequeue;
    procHacker.patching(
        "hook-stdin-command",
        CONSOLE_GETLINE,
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
        if (!serverStopHooked) {
            // the fallback for a missing sendEvent symbol (see below): plugins
            // get their serverStop before the native objects are decayed
            try {
                events.serverStop.fire();
                _tickCallback();
            } catch (err) {
                events.errorFire(err);
            }
        }
        // Fields that serverOpen could not fill still hold the "BDS is not
        // loaded yet" object, whose every access throws; a throw here, inside
        // a native callback at shutdown, is reported as a native crash.
        const decayIfReal = (key: keyof typeof bedrockServer): void => {
            const desc = Object.getOwnPropertyDescriptor(bedrockServer, key);
            // no descriptor: never filled; accessor: a lazy field (rakPeer) with nothing to decay
            if (desc === undefined || desc.get !== undefined || desc.value == null || desc.value === bedrockServer._abstractobject) return;
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
        if (structureManagerTaken) {
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
    if (GAME_THREAD_LAMBDA in proc) {
        procHacker.patching(
            "update-hook",
            GAME_THREAD_LAMBDA, // caller of ServerInstance::_update
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
    } else if (GAME_THREAD_INVOKE in proc) {
        // 1.26 inlined the lambda and its std::this_thread::sleep_until into _Invoke, so without this nothing ran node's
        // loop while the server ran: timers and sockets fired at shutdown (docs/findings-bot.md section 7). The sleep is a
        // QPC loop that starts at _Invoke+0xfd8 on 1.26.40.8 and 1.26.51.1 alike, once r15 holds the next tick's deadline
        // (the same steady-clock nanoseconds nodeLoop takes). A call to updateWithSleep with rcx = r15 takes the 21 bytes
        // below: node's loop runs until the deadline, and the inlined sleep loop after it finds the deadline passed and
        // leaves through the `mov r12,r15` in front of the loop top, as the jl would have.
        const updateThunk = asm().mov_r_r(Register.rcx, Register.r15).jmp64(asmcode.updateWithSleep, Register.rax).alloc("update-hook thunk");
        procHacker.patching(
            "update-hook",
            GAME_THREAD_INVOKE,
            0xfd8,
            updateThunk,
            Register.rax,
            true,
            // prettier-ignore
            [
                0x4C, 0x89, 0xF8,                         // mov rax,r15
                0x48, 0x29, 0xD0,                         // sub rax,rdx
                0x4D, 0x89, 0xFC,                         // mov r12,r15
                0x48, 0x3D, 0x88, 0x13, 0x00, 0x00,       // cmp rax,1388h
                0x0F, 0x8C, null, null, null, null,       // jl <loop top>
            ],
        );
    }

    // The open block. Every acquisition is attempted on its own: with the
    // static symbol table incomplete (docs/status.md), a missing getter must
    // cost one field, not the whole of serverOpen. Fields that could not be
    // filled keep the "BDS is not loaded yet" abstract object.
    const attempt = <T>(what: string, fn: () => T): T | null => {
        // BDSX_SKIP=open:<what> leaves that field unfilled without running its acquisition (a Q8 bisect switch)
        if (skip.includes(`open:${what}`)) {
            console.error(colors.yellow(`[bdsx] BDSX_SKIP=open:${what}: not acquired`));
            return null;
        }
        try {
            return fn();
        } catch (err) {
            console.error(colors.yellow(`[bdsx] ${what}: unavailable (${(err as Error).message})`));
            return null;
        }
    };
    const onServerOpen = (levelFromTick: Level | null): void => {
        // BDSX_SKIP=open-late runs serverOpen's reads of the engine objects but none of what hands control to
        // JavaScript: no node loop pump, no serverOpen/afterOpen listeners, launch() never resolves (a Q8
        // bisect switch: docs/findings-gamethread.md "The fresh-boot bisect")
        const openStart = Date.now();
        const runLate = !skip.includes("open-late");
        if (!runLate) console.error(colors.yellow("[bdsx] BDSX_SKIP=open-late: serverOpen reads the engine objects only"));
        try {
            if (runLate) {
                _tickCallback();
                cgate.nodeLoopOnce();
            }

            // 1.26 has no address for either getter; both are field reads (engine/serverfields.ts)
            const Minecraft$getLevel = derived(
                "?getLevel@Minecraft@@QEBAPEAVLevel@@XZ",
                (mc: bd_server.Minecraft): Level | null => {
                    const l = minecraftLevel(mc as any as StaticPointer);
                    return l === null ? null : l.as(Level);
                },
                () => procHacker.js("?getLevel@Minecraft@@QEBAPEAVLevel@@XZ", Level, null, bd_server.Minecraft),
            );
            const Minecraft$getCommands = procHacker.js(
                "?getCommands@Minecraft@@QEAAAEAVMinecraftCommands@@XZ",
                MinecraftCommands,
                null,
                bd_server.Minecraft,
            );
            const MinecraftCommands$getRegistry = derived(
                "?getRegistry@MinecraftCommands@@QEAAAEAVCommandRegistry@@XZ",
                (mc: MinecraftCommands): CommandRegistry => minecraftCommandsRegistry(mc as any as StaticPointer).as(CommandRegistry),
                () =>
                    procHacker.js(
                        "?getRegistry@MinecraftCommands@@QEAAAEAVCommandRegistry@@XZ",
                        CommandRegistry,
                        null,
                        MinecraftCommands,
                    ),
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
            // 1.26 has no Minecraft::getServerNetworkHandler; the Level holds the same NonOwnerPointer (engine/networkhandler.ts)
            const nonOwnerPointerServerNetworkHandler =
                minecraft != null && "?getServerNetworkHandler@Minecraft@@QEAA?AV?$NonOwnerPointer@VServerNetworkHandler@@@Bedrock@@XZ" in proc
                    ? attempt("nonOwnerPointerServerNetworkHandler", () => minecraft.getNonOwnerPointerServerNetworkHandler())
                    : level != null
                    ? attempt("nonOwnerPointerServerNetworkHandler", () => {
                          const out = Bedrock.NonOwnerPointer.make(nimodule.ServerNetworkHandler).construct();
                          copyLevelServerNetworkHandler(level as any as StaticPointer, out as any as StaticPointer);
                          return out;
                      })
                    : null;
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
            if (minecraftCommands != null) {
                commandRegistry = attempt("commandRegistry", () => MinecraftCommands$getRegistry(minecraftCommands!));
                if (commandRegistry != null && commandRegistryFromRegister != null && !commandRegistry.equalsptr(commandRegistryFromRegister)) {
                    console.error(colors.yellow(`[bdsx] commandRegistry: MinecraftCommands+0x10 ${commandRegistry} is not the registry the register hook saw ${commandRegistryFromRegister}`));
                    commandRegistry = commandRegistryFromRegister;
                }
            }
            if (commandRegistry == null && commandRegistryFromRegister != null) {
                commandRegistry = commandRegistryFromRegister;
            }
            const gameRules = level != null ? attempt("gameRules", () => Level$getGameRules(level)) : null;

            let connector: RakNetConnector | null = null;
            let rakPeer: RakNet.RakPeer | null = null;
            let rakPeerLazy: (() => RakNet.RakPeer | null) | null = null;
            // 1.26 has no NetworkSystem::getRemoteConnector address: the connector and the peer are members whose
            // offsets were read from the live objects (symbols.json layouts). 2024's route through the getter's
            // NonOwnerPointer (and its 2024 -48 adjustment) is gone with the name. The peer is created after the first
            // tick, so it is read lazily.
            if (serverNetworkSystem != null && layouts.ServerNetworkSystem?.connector != null) {
                const sns = serverNetworkSystem as any as StaticPointer;
                attempt("connector", () => {
                    const c = sns.getPointer(layouts.ServerNetworkSystem.connector);
                    if (c === null || c.isNull()) throw Error("connector member is null");
                    const typed = c.as(RakNetConnector);
                    // 1.26.51's server.properties ships transport=nethernet, and then the member holds NetherNet's
                    // connector. Calling RakNetConnector's slots on it runs some other function, so refuse it:
                    // connector and rakPeer stay null and the RakNet-only API (IP address, ping) is unavailable.
                    const vftable = "??_7RakNetConnector@@6BConnector@@@";
                    if (vftable in proc && !typed.vftable.equalsptr(proc[vftable])) {
                        throw Error("not RakNet's connector (server.properties transport=nethernet?): RakNet peer and ping unavailable; NetherNet clients' getAddress() still works");
                    }
                    connector = typed;
                });
                // The listening peer is the connector's own: RakNetConnector::getPeer
                // (an Endstone slot, checked by execution on 1.26.40.8) returns a
                // RakPeer whose bound addresses carry the server port. The RakPeer in
                // the holder at ServerNetworkSystem+0xf8 has the same vftable and no
                // port anywhere in its first 16 KB: another peer, so the holder is
                // only a fallback for a table without getPeer.
                if ("?getPeer@RakNetConnector@@UEAAPEAVRakPeerInterface@RakNet@@XZ" in proc) {
                    rakPeerLazy = () => {
                        if (connector === null) throw Error("no RakNet connector (see the connector line at boot)");
                        const rp: RakNet.RakPeer | null = RakNetConnector$getPeer(connector);
                        if (rp === null || rp.isNull()) return null;
                        if ("??_7RakPeer@RakNet@@6BRakPeerInterface@1@@" in proc) {
                            bdsxEqualsAssert(rp.vftable, proc["??_7RakPeer@RakNet@@6BRakPeerInterface@1@@"], "Invalid rakPeer");
                        }
                        return rp;
                    };
                    rakPeer = attempt("rakPeer", rakPeerLazy);
                } else if (layouts.ServerNetworkSystem.rakPeerHolder != null && layouts.RakPeerHolder?.rakPeer != null) {
                    const holderOff = layouts.ServerNetworkSystem.rakPeerHolder, peerOff = layouts.RakPeerHolder.rakPeer;
                    rakPeerLazy = () => {
                        const holder = sns.getPointer(holderOff);
                        if (holder === null || holder.isNull()) return null;
                        const peer = holder.getPointer(peerOff);
                        if (peer === null || peer.isNull()) return null;
                        const rp = peer.as(RakNet.RakPeer);
                        if ("??_7RakPeer@RakNet@@6BRakPeerInterface@1@@" in proc) {
                            bdsxEqualsAssert(rp.vftable, proc["??_7RakPeer@RakNet@@6BRakPeerInterface@1@@"], "Invalid rakPeer");
                        }
                        return rp;
                    };
                    rakPeer = attempt("rakPeer", rakPeerLazy);
                }
            } else if (serverNetworkSystem != null) {
                console.error(colors.yellow("[bdsx] connector: no ServerNetworkSystem.connector layout in this build's table"));
            }
            // 1.26: +8 the context provider, +0x10 the registry, +0x18 the sender (handleOutput; Endstone minecraft_commands.h)
            const commandOutputSender =
                minecraftCommands != null
                    ? (minecraftCommands as any as StaticPointer).getPointerAs(CommandOutputSender, engineLayout("MinecraftCommands", "commandOutputSender", 0x8))
                    : null;
            // the handler is updateServerAnnouncement's `this`; the NonOwnerPointer's object must be the same one, and the
            // handler's second base (NetEventCallback, +0x10: its constructor, 40 0xa58530 / 51 0x96b9b0) its own vftable
            let serverNetworkHandler: nimodule.ServerNetworkHandler | null = serverNetworkHandlerFromAnnounce;
            if (nonOwnerPointerServerNetworkHandler != null) {
                attempt("serverNetworkHandler", () => {
                    const handler = nonOwnerPointerServerNetworkHandler.get();
                    if (handler === null) throw Error("the NonOwnerPointer is empty or its object is gone");
                    if (serverNetworkHandler !== null) {
                        bdsxEqualsAssert(handler, serverNetworkHandler, "nonOwnerPointerServerNetworkHandler.get() vs updateServerAnnouncement's this");
                    } else {
                        serverNetworkHandler = handler;
                    }
                });
            }
            if (serverNetworkHandler !== null && "??_7ServerNetworkHandler@@6BNetEventCallback@@@" in proc) {
                const netEventCallback = (serverNetworkHandler as any as StaticPointer).getPointer(0x10);
                bdsxEqualsAssert(netEventCallback, proc["??_7ServerNetworkHandler@@6BNetEventCallback@@@"], "Invalid serverNetworkHandler (NetEventCallback base at +0x10)");
            }
            let structureManager: StructureManager | null = null;
            if (level != null) {
                attempt("structureManager", () => {
                    // through engine/structure.ts: the 24-byte NonOwnerPointer, object at +0x10
                    const p = levelStructureManager(level as any as StaticPointer);
                    if (p === null) throw Error("no Level::getStructureManager in this build");
                    structureManager = p.as(StructureManager);
                    structureManagerTaken = true;
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
                    if (key === "rakPeer" && rakPeerLazy !== null) {
                        // not created yet at the first tick: resolve on first access
                        const lazy = rakPeerLazy;
                        let cached: RakNet.RakPeer | null = null;
                        Object.defineProperty(bedrockServer, key, {
                            get: () => {
                                if (cached === null) cached = lazy();
                                if (cached === null) throw Error("rakPeer is not created yet");
                                return cached;
                            },
                            configurable: true,
                        });
                        continue;
                    }
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

            if (process.env.BDSX_LOG_OPEN_TIME === "1") console.error(`[bdsx] serverOpen reads took ${Date.now() - openStart} ms`);
            if (!runLate) return;
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
        // BDSX_SKIP=open leaves the Level::tick hook in place and never runs serverOpen (a Q8 bisect switch:
        // docs/findings-gamethread.md "The fresh-boot bisect")
        if (skip.includes("open")) console.error(colors.yellow("[bdsx] BDSX_SKIP=open: serverOpen will not fire"));
        else pendingOpenFromTick = onServerOpen;
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
    const SEND_EVENT = "?sendEvent@ServerInstanceEventCoordinator@@QEAAXAEBV?$EventRef@U?$ServerInstanceGameplayEvent@X@@@@@Z";
    serverStopHooked = SEND_EVENT in proc;
    if (!serverStopHooked) {
        // events.serverStop is what the example plugins (and any plugin) use to
        // clear their timers; without this symbol it fires when the game loop
        // returns instead, in gameThreadFinish.
        console.error(colors.yellow("[bdsx] sendEvent is not in the symbol table; events.serverStop fires when the game loop returns instead"));
    }
    const sendEvent = procHacker.hooking(
        SEND_EVENT,
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
        // DedicatedServer::stop's `this` is the Bedrock::AppIsland base: +8 in 2024 (IMinecraftApp's vptr came first),
        // the object itself on 1.26, whose constructor stores only AppIsland's vftable, at +0. Calling it at +8 there
        // set the wrong byte as the stop flag and killed the server (docs/findings-inventory.md section 29)
        stopfunc(bedrockServer.dedicatedServer.add(engineLayout("DedicatedServer", "stopThis", 8)));
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
        if (CONSOLE_GETLINE in proc) {
            commandQueueBuffer.construct();
            commandQueueBuffer.value = command;
            commandQueue.enqueue(commandQueueBuffer); // assumes the string is moved, and does not have the buffer anymore.
            return;
        }
        // 1.26 inlined ConsoleInputReader, so nothing drains commandQueue: run the command as the console would,
        // from the node loop on the game thread like a dequeued line was
        consoleCommands.push(command);
        if (consoleCommands.length !== 1) return;
        openIsFired.then(() =>
            setImmediate(() => {
                const commands = consoleCommands.splice(0);
                for (const cmd of commands) {
                    try {
                        // a console line reaches the engine (and events.command) with its leading slash
                        runConsoleLine(cmd.startsWith("/") ? cmd : "/" + cmd);
                    } catch (err) {
                        events.errorFire(err);
                    }
                }
            }),
        );
    }

    /**
     * What BDS does with a line typed on its console (40 0xf6d90 / 51 0xf67c0): a ServerCommandOrigin whose request id
     * is the static string mce::UUID::EMPTY.asString(), at permission level 4 in the overworld, a CommandContext at the
     * engine's own command version, then MinecraftCommands::executeCommand(ctx, false), output on. 2024's
     * executeCommandOnConsole fed that same handler; bedrockServer.executeCommand's origin is bdsx's own ("Server" as
     * the request id). docs/findings-inventory.md section 30.
     */
    function runConsoleLine(line: string): void {
        const { ServerCommandOrigin } = require("./bds/commandorigin") as typeof import("./bds/commandorigin");
        const origin = ServerCommandOrigin.constructWith(CONSOLE_REQUEST_ID, bedrockServer.level as ServerLevel, CommandPermissionLevel.Admin, null);
        const ctx = CommandContext.constructWith(line, origin);
        try {
            // through bdsx's own wrapper, so events.command fires exactly once
            bedrockServer.minecraftCommands.executeCommand(ctx, false);
        } finally {
            ctx.destruct();
            origin.destruct();
        }
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
