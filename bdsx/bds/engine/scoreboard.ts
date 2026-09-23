/**
 * The scoreboard's containers (engine layer; docs/findings-scoreboard.md section 6).
 *
 * 1.26 keeps no out-of-line copy of the scoreboard's readers (getObjectives, getTrackedIds, the getScoreboardId
 * overloads, Objective::getPlayerScore, ...); Endstone (Apache-2.0) reimplements them over the members declared in
 * its scoreboard.h / objective.h / identity_dictionary.h, and the 1.26 bodies read the same offsets
 * (identity refs +0x150, objectives +0x198, the event coordinator +0x258, an objective's scores +0x18 and its
 * name +0x58; the same on both builds). Every container is an MSVC std::unordered_map: its std::list head is at
 * +8, a node is { next, prev, value } with the value at +16.
 */
import type { NativePointer, StaticPointer } from "../../core";
import { engineLayout } from "./deps";

export const SCOREBOARD_DISPLAY_OBJECTIVES = engineLayout("Scoreboard", "displayObjectives", 0x10);
export const SCOREBOARD_IDENTITY_PLAYERS = engineLayout("Scoreboard", "identityPlayers", 0x50);
export const SCOREBOARD_IDENTITY_ENTITIES = engineLayout("Scoreboard", "identityEntities", 0x90);
export const SCOREBOARD_IDENTITY_FAKES = engineLayout("Scoreboard", "identityFakes", 0xd0);
export const SCOREBOARD_IDENTITY_REFS = engineLayout("Scoreboard", "identityRefs", 0x150);
export const SCOREBOARD_OBJECTIVES = engineLayout("Scoreboard", "objectives", 0x198);
export const SCOREBOARD_CRITERIA = engineLayout("Scoreboard", "criteria", 0x218);
/** ServerScoreboard's vftable slot for onPlayerScoreRemoved(ScoreboardId const&, Objective const&) */
export const SCOREBOARD_ON_PLAYER_SCORE_REMOVED_SLOT = engineLayout("Scoreboard", "onPlayerScoreRemovedSlot", 9);
export const OBJECTIVE_SCORES = engineLayout("Objective", "scores", 0x18);

/** a node's value offset in every map below; a std::string key takes 32 bytes, a ScoreboardId 16, an ActorUniqueID 8 */
export const MAP_NODE_VALUE = 16;

/** every node of the std::unordered_map at `self + offset`, in list order */
export function* mapNodes(self: StaticPointer, offset: number): IterableIterator<NativePointer> {
    const head = self.getPointer(offset + 8);
    for (let node = head.getPointer(0); !node.equalsptr(head); node = node.getPointer(0)) {
        yield node;
    }
}
