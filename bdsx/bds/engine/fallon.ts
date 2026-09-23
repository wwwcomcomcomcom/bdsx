/**
 * BlockEvents::BlockEntityFallOnEvent (engine layer; docs/findings-blocks.md section 19).
 *
 * 1.26 inlines Block::onFallOn into Actor::checkFallDamage: it builds this event on the stack and hands it
 * to the block type's PubSub subscribers, or, without any, to BlockType::onFallOnBase -- which most
 * subscribers (hay, bed, slime, ...) also end in. bdsx's fallOnBlock hooks onFallOnBase and reads the event.
 * The offsets are the same on both 1.26 builds; the fallbacks are the 2024 BlockFallOnEvent's.
 */
import { engineLayout } from "./deps";

export const FALLON_POS = engineLayout("BlockEntityFallOnEvent", "pos", 0x08);
export const FALLON_REGION = engineLayout("BlockEntityFallOnEvent", "region", 0x18);
export const FALLON_ACTOR = engineLayout("BlockEntityFallOnEvent", "actor", 0x20);
export const FALLON_DISTANCE = engineLayout("BlockEntityFallOnEvent", "fallDistance", 0x28);
