/**
 * Creating a SimulatedPlayer (engine layer; docs/findings-slots.md "SimulatedPlayer").
 *
 * 2024's SimulatedPlayer::create took (name, BlockPos, dimension, not_null<NonOwnerPointer<ServerNetworkHandler>>, xuid).
 * 1.26's create takes nine arguments; the GameTest code calls it through a six-argument wrapper (40 0x12d1c60, 51
 * 0x11f3d20, byte-identical but for branch targets) that the table ships as `bdsx:SimulatedPlayer::create`:
 *   (std::string const& name, Vec3 const& pos, DimensionType, NonOwnerPointer<ServerNetworkHandler> by value,
 *    std::string const& xuid, a 16-byte std::optional by value -- the GameTest caller passes it disengaged)
 * and passes create (name, pos, Vec3::ZERO, Vec2::ZERO, false, dimension, the handler, xuid, the optional).
 *
 * The handler pointer: the GameTest caller takes it from ILevel's virtual +0xa48, which on both builds copies the
 * NonOwnerPointer the Level holds at +0x220 { control +0x220, its count block +0x228, object +0x230 }, and moves the
 * object pointer back by 0x10 (the base it points at sits 0x10 into ServerNetworkHandler). The wrapper takes it by
 * value and releases it on return, so bdsx adds the reference it will drop.
 */
import { AllocatedPointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, CxxString, int32_t, void_t } from "../../nativetype";
import type { Vec3 } from "../blockpos";
import { engineLayout, engineSymbol } from "./deps";

const LEVEL_SERVER_NETWORK_HANDLER = engineLayout("Level", "serverNetworkHandler", 0x220);
const SERVER_NETWORK_HANDLER_BASE = engineLayout("ServerNetworkHandler", "nonOwnerBase", 0x10);

let create: ((name: string, pos: VoidPointer, dimension: number, handler: VoidPointer, xuid: string, optional: VoidPointer) => VoidPointer) | null = null;

/** the new SimulatedPlayer, or null when the build has no wrapper address or the engine refused */
export function createSimulatedPlayer(level: StaticPointer, name: string, pos: Vec3, dimension: number): VoidPointer | null {
    if (create === null) {
        const fn = engineSymbol("bdsx:SimulatedPlayer::create");
        if (fn === null) return null;
        create = makefunc.js(fn, VoidPointer, null, CxxString, VoidPointer, int32_t, VoidPointer, CxxString, VoidPointer);
    }
    const control = level.getPointer(LEVEL_SERVER_NETWORK_HANDLER);
    const count = level.getNullablePointer(LEVEL_SERVER_NETWORK_HANDLER + 8);
    const object = level.getPointer(LEVEL_SERVER_NETWORK_HANDLER + 16);
    const handler = new AllocatedPointer(24);
    handler.setPointer(control, 0);
    handler.setPointer(count, 8);
    handler.setPointer(object.isNull() ? object : object.sub(SERVER_NETWORK_HANDLER_BASE), 16);
    if (count !== null) count.setInt32(count.getInt32(8) + 1, 8); // the reference the wrapper drops; game thread only
    const optional = new AllocatedPointer(16);
    optional.fill(0, 16);
    const result = create(name, pos as any as VoidPointer, dimension, handler, "", optional);
    return result.isNull() ? null : result;
}

/*
 * The actions 1.26 inlined into the GameTest bindings (docs/findings-slots.md "SimulatedPlayer: the five that were
 * inlined"). 2024 had out-of-line `simulate*` functions for these; 1.26 keeps none, so bdsx carries what each one did.
 *
 *   simulateInteract(Actor&)              the alive virtual (slot 46), then Player::interact(target, Vec3::ZERO)
 *   simulateInteract(BlockPos, facing)    the alive virtual, then Block::use(block at pos, player, pos, facing, no click)
 *   simulateStopDestroyingBlock           three copies of one body (the binding, preAiStep, simulateDestroyBlock)
 *   simulateDisconnect                    the disconnect helper the binding calls, then Player::remove (slot 11)
 */

function zeros(size: number): AllocatedPointer {
    const p = new AllocatedPointer(size);
    p.fill(0, size);
    return p;
}

let interact: ((player: VoidPointer, result: VoidPointer, actor: VoidPointer, pos: VoidPointer) => VoidPointer) | null = null;

/**
 * Player::interact(Actor&, Vec3 const&) with Vec3::ZERO, which is what the "interactWithEntity" binding calls: bdsx:Player::interact
 * fills an InteractionResult through an sret and bit 0 of its first byte is success. The caller checks the alive virtual.
 */
export function simInteractActor(player: StaticPointer, target: VoidPointer): boolean {
    if (interact === null) {
        const fn = engineSymbol("bdsx:Player::interact");
        if (fn === null) throw Error("SimulatedPlayer::simulateInteract: no bdsx:Player::interact in this build's symbols.json");
        interact = makefunc.js(fn, VoidPointer, null, VoidPointer, VoidPointer, VoidPointer, VoidPointer);
    }
    const result = zeros(64);
    interact(player, result, target, zeros(16));
    return (result.getUint8(0) & 1) !== 0;
}

/** 51's Block::use takes one more byte before its optional<Vec3> (the binding passes 0) */
const BLOCK_USE_EXTRA_BYTE = engineLayout("Block", "useExtraByte", 0);

let blockUse: ((...args: any[]) => number) | null = null;

/**
 * Block::use(Player&, BlockPos const&, uchar face, optional<Vec3>) with no click position, called on the block at `pos`
 * the way the "interactWithBlock" binding does (2024 0x1bbc3d0 was this function; 1.26 40 0x1bb2b50, 51 0x2ceb030, shipped as
 * bdsx:Block::use). `block` is what BlockSource::getBlock returned. The caller checks the alive virtual.
 */
export function simInteractBlock(player: StaticPointer, block: VoidPointer, pos: VoidPointer, face: number): boolean {
    if (blockUse === null) {
        const fn = engineSymbol("bdsx:Block::use");
        if (fn === null) throw Error("SimulatedPlayer::simulateInteract: no bdsx:Block::use in this build's symbols.json");
        blockUse =
            BLOCK_USE_EXTRA_BYTE === 1
                ? makefunc.js(fn, int32_t, null, VoidPointer, VoidPointer, VoidPointer, int32_t, bool_t, VoidPointer)
                : makefunc.js(fn, int32_t, null, VoidPointer, VoidPointer, VoidPointer, int32_t, VoidPointer);
    }
    const click = zeros(16); // std::optional<Vec3>, disengaged (the engaged byte is at +12)
    const r = BLOCK_USE_EXTRA_BYTE === 1 ? blockUse(block, player, pos, face, false, click) : blockUse(block, player, pos, face, click);
    return (r & 0xff) !== 0;
}

// SimulatedPlayer's block-breaking state, read off the three inlined copies of simulateStopDestroyingBlock (40 0x56a60b0,
// 0x12d25e0, 0x12d6660; 51 0x9108830, 0x11f4620, 0x11f8700). The numbers are 40/51: the `destroying` byte 0xf74/0xf7c, the block
// position it digs 0xf68/0xf70, the "active" byte 0xf79/0xf81, a task byte 0xb22, and a pointer to a state object at 0xcb0
// whose owned polymorphic member (+0x20) is deleted through virtual slot 16/17.
const SIM_BREAK_STATE = engineLayout("SimulatedPlayer", "breakState", -1);
const SIM_BREAK_STATE_DTOR_SLOT = engineLayout("SimulatedPlayer", "breakStateDtorSlot", -1);
const SIM_BLOCK_TASK = engineLayout("SimulatedPlayer", "blockTask", -1);
const SIM_DESTROYING = engineLayout("SimulatedPlayer", "destroying", -1);
const SIM_DESTROY_POS = engineLayout("SimulatedPlayer", "destroyPos", -1);
const SIM_DESTROY_ACTIVE = engineLayout("SimulatedPlayer", "destroyActive", -1);
/** GameMode::stopDestroyBlock(BlockPos const&): the GameMode table's slot 4 on 2024 and on both 1.26 builds */
const GAMEMODE_STOP_DESTROY_SLOT = engineLayout("GameMode", "stopDestroyBlockSlot", 4);

/**
 * What the three inlined copies do: reset the break-state object, clear the task byte, and when the `destroying` byte is 1
 * (and the player is alive) tell the GameMode to stop destroying the position it holds, then clear `destroying`; last,
 * clear the `active` byte. `gameMode` is the player's own (Player::getGameMode).
 */
export function simStopDestroyingBlock(player: StaticPointer, alive: boolean, gameMode: StaticPointer): void {
    if (SIM_DESTROYING < 0 || SIM_BREAK_STATE < 0) throw Error("SimulatedPlayer::simulateStopDestroyingBlock: no layouts.SimulatedPlayer in this build's symbols.json");
    const state = player.getPointer(SIM_BREAK_STATE);
    state.setUint8(0, 1);
    state.setUint8(0, 8);
    state.setInt32(0xffffffff | 0, 0x10);
    state.setInt32(0, 0x14);
    const owned = state.getNullablePointer(0x20);
    state.setPointer(null, 0x20);
    if (owned !== null) makefunc.js(owned.getPointer(0).getPointer(SIM_BREAK_STATE_DTOR_SLOT * 8), void_t, null, VoidPointer, int32_t)(owned, 1);
    player.setUint8(0, SIM_BLOCK_TASK);
    if (player.getUint8(SIM_DESTROYING) === 1) {
        if (alive) makefunc.js(gameMode.getPointer(0).getPointer(GAMEMODE_STOP_DESTROY_SLOT * 8), void_t, null, VoidPointer, VoidPointer)(gameMode, player.add(SIM_DESTROY_POS));
        player.setUint8(0, SIM_DESTROYING);
    }
    player.setUint8(0, SIM_DESTROY_ACTIVE);
}

let disconnectHelper: ((player: VoidPointer) => void) | null = null;

/**
 * 2024's simulateDisconnect was: the PlayerDisconnect event, removeAllPassengers, the callback token, a riding check, then
 * Player::remove and a reset of the GameTest function pointer. 1.26 moved the first half into a helper (40 0x6952f0,
 * 51 0x7589e0; ServerNetworkHandler::_onPlayerLeft calls it too) and the binding calls it, then the remove virtual, then
 * resets that pointer, which bdsx never sets.
 */
export function simDisconnect(player: StaticPointer, removeAddress: VoidPointer | null): void {
    if (disconnectHelper === null) {
        const fn = engineSymbol("bdsx:ServerPlayer::disconnect");
        if (fn === null) throw Error("SimulatedPlayer::simulateDisconnect: no bdsx:ServerPlayer::disconnect in this build's symbols.json");
        disconnectHelper = makefunc.js(fn, void_t, null, VoidPointer);
    }
    if (removeAddress === null) throw Error("SimulatedPlayer::simulateDisconnect: no ?remove@Player@@ in this build's symbols.json");
    const vft = player.getPointer(0);
    let slot = -1;
    for (let i = 0; i < 32; i++) {
        if (vft.getPointer(i * 8).equalsptr(removeAddress)) {
            slot = i;
            break;
        }
    }
    if (slot < 0) throw Error("SimulatedPlayer::simulateDisconnect: Player::remove is not in the player's vftable");
    disconnectHelper(player);
    makefunc.js(vft.getPointer(slot * 8), void_t, null, VoidPointer)(player);
}
