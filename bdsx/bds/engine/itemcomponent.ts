/**
 * Item component methods 1.26 inlines into their callers (engine layer; docs/findings-nbt.md section 24).
 *
 * ThrowableItemComponent's throw is two std::function callbacks its _initializeComponent registers (vftable slot 7): the
 * use callback (40 0x281e800 / 51 0x2c94120) and the release callback (40 0x27cd1c0 / 51 0x2c56d90). Both inline 2024's
 * _getLaunchPower and call the throw itself (40 0x27ccdc0 / 51 0x2c56990, 2024's _doThrow), which inlines
 * ProjectileItemComponent::getShootDir and then calls ProjectileItemComponent::shootProjectile (still out of line).
 * FoodItemComponent::getUsingConvertsToItemDescriptor is inlined into the script API's getter (40 0x4f871a0 /
 * 51 0x55ea320): the component's ItemDescriptor copied from +0x20. None of the three has an out-of-line copy on either
 * build, so bdsx computes them from the same fields.
 */
import { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const f = Math.fround;

/** ThrowableItemComponent's fields, as the callbacks read them (2024 _getLaunchPower: the same offsets) */
const THROW_SCALE_BY_DRAW = engineLayout("ThrowableItemComponent", "scalePowerByDrawDuration", 0x24);
const THROW_POWER_SCALE = engineLayout("ThrowableItemComponent", "launchPowerScale", 0x1c);
const THROW_MAX_POWER = engineLayout("ThrowableItemComponent", "maxLaunchPower", 0x20);

/**
 * 2024's ThrowableItemComponent::_getLaunchPower(durationLeft, maxDrawTicks, maxUseDuration). The 1.26 callbacks
 * compute it inline in this form: t = (maxUse - left) / maxDraw (the release callback: `subl`, `cvtsi2ss`, over the
 * truncated max_draw_duration * 20), power = min((t*t + (t + t)) / 3, 1) when +0x24 is set, else 1; then
 * min(power * +0x1c, +0x20). 2024 wrote the same polynomial as t*t*(1/3) + t*(2/3).
 */
export function throwableLaunchPower(self: StaticPointer, durationLeft: number, maxDrawTicks: number, maxUseDuration: number): number {
    let power = 1;
    if (self.getUint8(THROW_SCALE_BY_DRAW) !== 0) {
        const t = f(f(maxUseDuration - durationLeft) / f(maxDrawTicks));
        power = Math.min(f(f(f(t + t) + f(t * t)) / 3), 1);
    }
    return Math.min(f(power * self.getFloat32(THROW_POWER_SCALE)), self.getFloat32(THROW_MAX_POWER));
}

// mce::Math::sin/cos: a 65,536-entry table indexed by (int)(radians * 65536 / 2pi) & 0xffff, cos a quarter turn on.
// The inlined getShootDir reads it directly (40 table 0xc8e5d80), with these float constants (40 0xa52ea04..0xa52ea10).
const K_DEG = -0.01745329238474369; // -pi/180
const K_HALF_TURN = -3.1415927410125732; // -pi
const K_INDEX = 10430.3779296875; // 65536 / 2pi
const K_QUARTER = 16384;
let sinTable: Float32Array | null = null;
function mceSin(index: number): number {
    if (sinTable === null) {
        sinTable = new Float32Array(65536);
        for (let i = 0; i < 65536; i++) sinTable[i] = Math.sin((i * Math.PI * 2) / 65536);
    }
    return sinTable[index & 0xffff];
}
/** 2024's getShootDir multiplies the offset by float32(pi/180) before sincosf */
const DEG_TO_RAD = 0.01745329238474369;

/**
 * ProjectileItemComponent::getShootDir(player, angleOffset) from the player's pitch and yaw (the vehicle's
 * getPassengerYRotation when riding, which the caller resolves). The direction is Vec3::directionFromRotation as the
 * throw inlines it: x = sin(-yaw - pi) * -cos(-pitch), y = sin(-pitch), z = cos(-yaw - pi) * -cos(-pitch) over the
 * engine's table; then 2024's turn about the vertical axis, x' = x cos a + z sin a, z' = z cos a - x sin a (the
 * inlined copy passes a = 0, so 1.26 folds the turn away; 2024 used sincosf, not the table, for it).
 */
export function projectileShootDir(pitch: number, yaw: number, angleOffset: number): [number, number, number] {
    const yawIndex = f(f(f(f(yaw) * K_DEG) + K_HALF_TURN) * K_INDEX);
    const sinYaw = mceSin(Math.trunc(yawIndex));
    const cosYaw = mceSin(Math.trunc(f(yawIndex + K_QUARTER)));
    const pitchIndex = f(f(f(pitch) * K_DEG) * K_INDEX);
    const sinPitch = mceSin(Math.trunc(pitchIndex));
    const negCosPitch = -mceSin(Math.trunc(f(pitchIndex + K_QUARTER)));
    let x = f(sinYaw * negCosPitch);
    let z = f(cosYaw * negCosPitch);
    if (angleOffset !== 0) {
        const a = f(f(angleOffset) * DEG_TO_RAD);
        const s = f(Math.sin(a));
        const c = f(Math.cos(a));
        const nx = f(f(x * c) + f(z * s));
        z = f(f(z * c) - f(x * s));
        x = nx;
    }
    return [x, sinPitch, z];
}

/** FoodItemComponent's using_converts_to ItemDescriptor (the script getter copies it from here; 2024 the same) */
export const FOOD_USING_CONVERTS_TO = engineLayout("FoodItemComponent", "usingConvertsTo", 0x20);
