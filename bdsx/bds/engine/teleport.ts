/**
 * Teleporting an actor, to a position and optionally across dimensions (engine layer; docs/findings-layouts.md
 * "Actor.teleport: TeleportCommand::computeTarget / applyTarget").
 *
 * 2024 bdsx called the two statics the /tp command is built from: computeTarget(Actor&, Vec3, Vec3* facing,
 * DimensionType, optional<RotationData> const&, int commandVersion) returns a 0x30-byte TeleportTarget -- an
 * optional<Vec2> rotation (+0, engaged +8), an optional<TeleportData> (+0xc: destination, stop-riding byte, cause 3,
 * entity type 1; engaged +0x24) for a same-dimension move, and a unique_ptr<ChangeDimensionRequest> (+0x28) when the
 * dimension differs -- and applyTarget(Actor&, TeleportTarget, bool) consumes it: the rotation, then either the
 * change-dimension request (ILevel slot 17 for a player, slot 19 for any other actor) or Actor::teleportTo.
 *
 * Both are still out of line on both 1.26 builds, called together by the same four functions as in 2024 (the tp
 * command's std::function lambda and three ScriptActor teleports), and computeTarget kept its signature and its
 * TeleportTarget. applyTarget did not stay the same everywhere: on 1.26.51.1 it takes the command version as a third
 * argument (it sets a flag in the non-player change-dimension request when the version is at least 0x33), so it
 * ships under a bdsx: key on both builds and the per-build layout fact TeleportCommand.applyTargetVersionArg says
 * whether to pass it.
 *
 * TeleportTarget is taken by value: the callee owns it, moves the request out, and frees it.
 *
 * The command version is the one the engine's own ScriptActor teleports pass to both functions on both builds, 0x32.
 * 2024 bdsx passed 0, and at a version <= 0x17 computeTarget adds a player's height offset to y when the dimension
 * changes, so a player sent to another dimension landed 1.62 above the position asked for (seen on both builds,
 * 2026-09-27). At 0x32 it lands where asked, and the facing and rotation rules are the current ones.
 */
import { AllocatedPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t, int32_t, void_t } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

const COMPUTE_TARGET = engineSymbol(
    "?computeTarget@TeleportCommand@@SA?AVTeleportTarget@@AEAVActor@@VVec3@@PEAV4@V?$AutomaticID@VDimension@@H@@AEBV?$optional@VRotationData@RotationCommandUtils@@@std@@H@Z",
);
const APPLY_TARGET = engineSymbol("bdsx:TeleportCommand::applyTarget");
/** 1 where applyTarget is (Actor&, TeleportTarget, int commandVersion, bool), 0 where it is (Actor&, TeleportTarget, bool) */
const APPLY_TARGET_VERSION_ARG = engineLayout("TeleportCommand", "applyTargetVersionArg", 0) !== 0;
/** TeleportTarget: both builds write +0x00..+0x2f (0x30 in 2024 too) */
const TARGET_SIZE = engineLayout("TeleportTarget", "size", 0x30);
/** optional<RotationCommandUtils::RotationData>: two RelativeFloats, an optional<Vec2> (+0x10, engaged +0x18), engaged +0x1c */
const ROTATION_OPTIONAL_SIZE = 0x20;
/** what ScriptActor::teleport passes (40 0x433f180 / 51 0x449ff30: `movl $0x32` into both calls) */
const COMMAND_VERSION = 0x32;

type ComputeTarget = (
    target: VoidPointer,
    actor: VoidPointer,
    pos: VoidPointer,
    facing: VoidPointer | null,
    dimension: number,
    rotation: VoidPointer,
    version: number,
) => void;
let computeTarget: ComputeTarget | null = null;
let applyTarget: ((actor: VoidPointer, target: VoidPointer, keepVelocity: boolean) => void) | null = null;
let applyTargetVersioned: ((actor: VoidPointer, target: VoidPointer, version: number, keepVelocity: boolean) => void) | null = null;

function zeroed(size: number): AllocatedPointer {
    const p = new AllocatedPointer(size);
    for (let i = 0; i < size; i += 4) p.setInt32(0, i);
    return p;
}

function vec3(x: number, y: number, z: number): AllocatedPointer {
    const p = new AllocatedPointer(12);
    p.setFloat32(x, 0);
    p.setFloat32(y, 4);
    p.setFloat32(z, 8);
    return p;
}

/** TeleportCommand::computeTarget, then applyTarget: what `/tp` does for one target */
export function teleportActor(
    actor: VoidPointer,
    x: number,
    y: number,
    z: number,
    dimensionId: number,
    facing: { x: number; y: number; z: number } | null,
): void {
    if (COMPUTE_TARGET === null || APPLY_TARGET === null) throw Error("TeleportCommand::computeTarget/applyTarget: no address in this build");
    if (computeTarget === null) {
        computeTarget = makefunc.js(COMPUTE_TARGET, void_t, null, VoidPointer, VoidPointer, VoidPointer, VoidPointer, int32_t, VoidPointer, int32_t);
    }
    // the position is a by-value Vec3, i.e. a pointer to the caller's copy, which computeTarget may write (a player
    // changing dimension under a version <= 0x17 gets its height offset added to y): always a fresh copy
    const pos = vec3(x, y, z);
    const face = facing === null ? null : vec3(facing.x, facing.y, facing.z);
    const rotation = zeroed(ROTATION_OPTIONAL_SIZE); // nullopt
    const target = zeroed(TARGET_SIZE);
    computeTarget(target, actor, pos, face, dimensionId | 0, rotation, COMMAND_VERSION);
    if (APPLY_TARGET_VERSION_ARG) {
        if (applyTargetVersioned === null) applyTargetVersioned = makefunc.js(APPLY_TARGET, void_t, null, VoidPointer, VoidPointer, int32_t, bool_t);
        applyTargetVersioned(actor, target, COMMAND_VERSION, false);
    } else {
        if (applyTarget === null) applyTarget = makefunc.js(APPLY_TARGET, void_t, null, VoidPointer, VoidPointer, bool_t);
        applyTarget(actor, target, false);
    }
}
