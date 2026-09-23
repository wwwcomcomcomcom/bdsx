/**
 * The event a block's interact handler receives (engine layer; docs/findings-slots.md "chestOpen, buttonPress").
 *
 * 1.26 dispatches a player's use of a block to per-block handlers the block's constructor registers (BlockType+0x340
 * holds them; the interact one answers type 4) instead of 2024's BlockLegacy::use virtual. Each handler takes
 * (BlockType const*, the event&); the bed's, the chest's and the button's handlers all read the position at +0x8 and the
 * Player* at +0x18, and write the result bytes at +0x20/+0x21. None reads a face.
 */
import type { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

export const INTERACT_EVENT_POS = engineLayout("BlockPlayerInteractEvent", "pos", 8);
export const INTERACT_EVENT_PLAYER = engineLayout("BlockPlayerInteractEvent", "player", 0x18);

export function interactEventPlayer(ev: StaticPointer): StaticPointer {
    return ev.getPointer(INTERACT_EVENT_PLAYER);
}
