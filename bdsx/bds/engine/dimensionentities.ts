/**
 * Dimension and Level virtuals bdsx calls by slot for the block-entity and entity-removal names
 * (engine layer; docs/findings-inventory.md section 19).
 *
 * IDimension's vftable (Endstone dimension.h) is dtor, isNaturalDimension, getDimensionId, sendPacketForPosition, ...: slot 3 on
 * both 1.26 builds, as in 2024. 1.26's body clears the recipient vector at Dimension+0x5f0, asks virtual 13
 * (buildPlayersForPositionPacket(pos, except, vector)) to fill it, then hands vector and packet to the level's packet sender; the
 * arguments are (BlockPos const&, Packet const&, Player const* except) like 2024's.
 *
 * Level's ILevel vftable: forceRemoveEntity and forceRemoveEntityfromWorld are the two consecutive `mov 0x418(%rcx),%rcx; jmp`
 * thunks into the ActorManager (Level+0x418 on both builds): slots 241 / 242 on 1.26.40.8 and 1.26.51.1 (2024: 209 / 210,
 * 0x1abdc10 / 0x1abdc30 jumping to ActorManager::forceRemoveActor / forceRemoveActorFromWorld). 2024's Dimension::removeActorByID
 * looked the id up in the dimension's own map and called the second one with the actor.
 */
import { StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";
import { engineLayout } from "./deps";

const SEND_PACKET_FOR_POSITION_SLOT = engineLayout("Dimension", "sendPacketForPositionSlot", 3);
const FORCE_REMOVE_FROM_WORLD_SLOT = engineLayout("Level", "forceRemoveEntityFromWorldSlot", 210);
/** Packet::reliability_ (Endstone packet.h: +12); 2024's Dimension::_sendBlockEntityUpdatePacket stores 1 (ReliableOrdered) there */
const PACKET_RELIABILITY = engineLayout("Packet", "reliability", 0xc);
const RELIABLE_ORDERED = 1;

const calls = new Map<string, (...args: any[]) => any>();
function virtualCall<T extends (...args: any[]) => any>(object: StaticPointer, slot: number, make: (fn: VoidPointer) => T): T {
    const fn = object.getPointer(0).getPointer(slot * 8);
    const key = fn.toString();
    let call = calls.get(key);
    if (call === undefined) {
        call = make(fn);
        calls.set(key, call);
    }
    return call as T;
}

/** IDimension::sendPacketForPosition(pos, packet, except): the players who can see the position, `except` (null for all) left out */
export function dimensionSendPacketForPosition(dimension: StaticPointer, pos: VoidPointer, packet: VoidPointer, except: VoidPointer | null): void {
    virtualCall(dimension, SEND_PACKET_FOR_POSITION_SLOT, fn => makefunc.js(fn, void_t, null, VoidPointer, VoidPointer, VoidPointer, VoidPointer))(
        dimension,
        pos,
        packet,
        except,
    );
}

/** what 2024's _sendBlockEntityUpdatePacket does to the packet before sending it */
export function packetSetReliableOrdered(packet: StaticPointer): void {
    packet.setUint32(RELIABLE_ORDERED, PACKET_RELIABILITY);
}

/** Level::forceRemoveEntityfromWorld(Actor&) through the level's own vftable */
export function levelForceRemoveEntityFromWorld(level: StaticPointer, actor: VoidPointer): void {
    virtualCall(level, FORCE_REMOVE_FROM_WORLD_SLOT, fn => makefunc.js(fn, void_t, null, VoidPointer, VoidPointer))(level, actor);
}
