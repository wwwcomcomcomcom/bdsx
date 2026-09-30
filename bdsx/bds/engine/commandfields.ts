/**
 * Field reads behind the command helpers 1.26 inlined (docs/findings-inventory.md section 19).
 *
 * `CommandUtils::getFeetPos(Actor const*)`: 2024 0xd08fd0 returns Vec3::ZERO for a null actor; else x and z of Actor::getPosition,
 * and y = the actor's AABB min.y, raised to the vehicle's own AABB min.y when it rides one (`comiss` / `cmovb` picks the larger).
 * 1.26 keeps no out-of-line copy: PlayerCommandOrigin::getWorldPosition and ActorCommandOrigin::getWorldPosition inline it (40
 * 0x12e6f00 / 0x12ef220, 51 0x1209330 / 0x120f4f0), reading the position vector through the pointer at Actor +0x218 (the
 * `getPosition` accessor), the AABB through the pointer at +0x220 (`movss 4(%rbx)` is min.y) and taking `maxss` with the vehicle's.
 */
import { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const ACTOR_AABB = engineLayout("Actor", "aabbComponent", 0x220);

/** the AABB's min.y of an actor (its feet) */
export function actorFeetY(actor: StaticPointer): number {
    return actor.getPointer(ACTOR_AABB).getFloat32(4);
}
