/**
 * Dimension::fetchNearestAttackablePlayer on 1.26 (engine layer; docs/findings-inventory.md section 23).
 *
 * Both overloads are a forEachPlayer (IDimension virtual) over a predicate lambda, and 1.26 has no out-of-line function for either:
 * every caller builds the closure itself. The lambda is one function per build (40 0x179d510, 51 0x188aec0, reached from the
 * mob-targeting code), with 2024's body (0x1f3cc50) step for step:
 *   - a player whose Invulnerable ability is set, or who is not alive, is skipped;
 *   - the squared distance is taken from the BlockPos as three floats (no +0.5) to the player's position, (x^2 + y^2) + z^2 in float;
 *   - the limit starts as the radius, times 0.8 for a sneaking player;
 *   - an invisible player's limit is also multiplied by max(0.1, armour cover) * 0.7, unless the mob is there and holds one EnTT
 *     component (hash 0xa74de0e8 on both builds; its name is not known);
 *   - a mob that is not removed and has the category bit 2 (Mob) halves it when isHiddenFrom(mob's type) holds;
 *   - a radius below 0 means no limit, otherwise the player counts only when distance < limit^2;
 *   - the nearest counting player wins (strictly smaller than the best so far, the best starting at -1 = none).
 * The closure the engine builds is five pointers: best float, BlockPos, radius float, Actor*, Player* result.
 */
import { Actor } from "../actor";
import { AbilitiesIndex } from "../abilities";
import { Player } from "../player";
import { engineLayout } from "./deps";
import { enttHas } from "./entt";

const ACTOR_REMOVED = engineLayout("Actor", "removed", 0x269);
const ACTOR_CATEGORIES = engineLayout("Actor", "categoryFlags", 0x210);
const MOB_CATEGORY_BIT = 2;
/** the component whose presence on the mob lets an invisible player's limit skip the armour term */
const SKIP_ARMOR_COMPONENT_HASH = 0xa74de0e8;
const f = Math.fround;

/** @param players the dimension's players in the order its forEachPlayer visits them */
export function nearestAttackablePlayer(players: Player[], bx: number, by: number, bz: number, radius: number, mob: Actor | null): Player | null {
    radius = f(radius);
    let best = -1;
    let found: Player | null = null;
    const fx = f(bx);
    const fy = f(by);
    const fz = f(bz);
    for (const player of players) {
        if (player.getAbilities().getBool(AbilitiesIndex.Invulnerable)) continue;
        if (!player.isAlive()) continue;
        const p = player.getPosition();
        const dx = f(f(p.x) - fx);
        const dy = f(f(p.y) - fy);
        const dz = f(f(p.z) - fz);
        const dist = f(f(f(dx * dx) + f(dy * dy)) + f(dz * dz));
        let limit = radius;
        if (player.isSneaking()) limit = f(limit * f(0.8));
        if (player.isInvisible()) {
            const skip = mob !== null && enttHas(mob, SKIP_ARMOR_COMPONENT_HASH);
            if (!skip) limit = f(limit * f(f(Math.max(f(0.1), player.getArmorCoverPercentage())) * f(0.7)));
        }
        if (mob !== null && (mob as any).getUint8(ACTOR_REMOVED) === 0 && ((mob as any).getUint8(ACTOR_CATEGORIES) & MOB_CATEGORY_BIT) !== 0) {
            if (player.isHiddenFrom(mob as any)) limit = f(limit * f(0.5));
        }
        if (!(0 > radius)) {
            if (f(limit * limit) <= dist) continue;
        }
        if (best !== -1 && best <= dist) continue;
        best = dist;
        found = player;
    }
    return found;
}
