/**
 * Map markers: whether an entity keeps its marker (decoration) on a map (engine layer; docs/findings-inventory.md
 * section 32).
 *
 * A map (MapItemSavedData) holds a vector of std::shared_ptr<MapItemTrackedActor> at +0x60: the players that
 * GameplayUserManager adds when the map is created, and whoever carries it. Each tick, tickCarriedBy and tickByBlock
 * walk that vector (_updateTrackedEntityDecorations), and for every entry they call
 *   bool MapItemSavedData::_updateTrackedEntityDecoration(BlockSource&, std::shared_ptr<MapItemTrackedActor>)
 * It returns true after it has re-added the entry's decoration (_addDecoration). When it returns false, the caller
 * removes the decoration (_removeDecoration). The shared_ptr is passed by value. On MSVC x64 that is a pointer to the
 * caller's temporary, and the callee destroys it.
 *
 * 1.26 kept 2024's function, its prototype and the layouts below, on both builds: 40 0x399d2d0 / 51 0x371dc80, reached
 * from tickCarriedBy's first local callee. The tracked entry starts with its UniqueId (type +0, where 0 is an entity;
 * ActorUniqueID +8). The map's decorations are a vector<pair<UniqueId, shared_ptr<MapDecoration>>> at +0x80, with
 * 0x30-byte entries.
 *
 * setMapMarkerFilter installs one hook. For an entity entry, the filter sees the Actor. If the filter returns false,
 * the hook releases the shared_ptr it was handed and returns false without running the function, so the engine drops
 * that marker the same tick. Block-entity entries (a framed map) always run the function.
 */
import { StaticPointer, VoidPointer } from "../../core";
import { events } from "../../event";
import { makefunc } from "../../makefunc";
import { bool_t, void_t } from "../../nativetype";
import { procHacker } from "../../prochacker";
import { Actor } from "../actor";
import { engineLayout, engineSymbol } from "./deps";

const UPDATE_TRACKED_DECORATION = "?_updateTrackedEntityDecoration@MapItemSavedData@@AEAA_NAEAVBlockSource@@V?$shared_ptr@VMapItemTrackedActor@@@std@@@Z";
const TRACKED_TYPE = engineLayout("MapItemTrackedActor", "type", 0x00);
const TRACKED_ENTITY_ID = engineLayout("MapItemTrackedActor", "entityId", 0x08);
const MAP_DECORATIONS = engineLayout("MapItemSavedData", "decorations", 0x80);
const DECORATION_ENTRY_SIZE = engineLayout("MapItemSavedData", "decorationEntrySize", 0x30);
const TYPE_ENTITY = 0; // MapItemTrackedActor::Type::Entity

/** `map` is the MapItemSavedData*, valid only during the call. Return false to hide this actor's marker on it. */
export type MapMarkerFilter = (actor: Actor, map: StaticPointer) => boolean;

let filter: MapMarkerFilter | null = null;
let installed = false;

// std::_Ref_count_base: uses at +8, weaks at +0xc; vftable slot 0 _Destroy, slot 1 _Delete_this
const refDestroy = makefunc.js([0], void_t, { this: VoidPointer });
const refDeleteThis = makefunc.js([8], void_t, { this: VoidPointer });

/** destroys a std::shared_ptr that was passed to the hooked function by value (the callee owns it) */
function releaseByValue(sharedPtr: StaticPointer): void {
    const ref = sharedPtr.getNullablePointer(8);
    if (ref === null) return;
    if (ref.interlockedDecrement32(8) === 0) {
        refDestroy.call(ref);
        if (ref.interlockedDecrement32(12) === 0) refDeleteThis.call(ref);
    }
}

function install(): void {
    if (engineSymbol(UPDATE_TRACKED_DECORATION) === null) {
        throw Error("MapItemSavedData::_updateTrackedEntityDecoration is not in this build's symbol table");
    }
    const original = procHacker.hooking(
        UPDATE_TRACKED_DECORATION,
        bool_t,
        null,
        StaticPointer,
        StaticPointer,
        StaticPointer,
    )((map, region, tracked) => {
        const f = filter;
        if (f !== null) {
            try {
                const entry = tracked.getNullablePointer(0);
                if (entry !== null && entry.getInt32(TRACKED_TYPE) === TYPE_ENTITY) {
                    const actor = Actor.fromUniqueIdBin(entry.getBin64(TRACKED_ENTITY_ID), false);
                    if (actor !== null && !f(actor, map)) {
                        releaseByValue(tracked);
                        return false;
                    }
                }
            } catch (err) {
                events.errorFire(err);
            }
        }
        return original(map, region, tracked);
    });
    installed = true;
}

/**
 * Sets the one filter that decides which entities keep their markers on maps, or null to show every marker again.
 * The hook is installed on the first non-null call, which throws if the build's table lacks the function.
 */
export function setMapMarkerFilter(f: MapMarkerFilter | null): void {
    if (f !== null && !installed) install();
    filter = f;
}

export function getMapMarkerFilter(): MapMarkerFilter | null {
    return filter;
}

/** The ActorUniqueIDs (bin64) of the entity markers that the map has now. Block-entity markers are left out. */
export function mapEntityMarkers(map: StaticPointer): string[] {
    const begin = map.getNullablePointer(MAP_DECORATIONS);
    const end = map.getNullablePointer(MAP_DECORATIONS + 8);
    const out: string[] = [];
    if (begin === null || end === null) return out;
    const bytes = end.subptr(begin);
    for (let off = 0; off + DECORATION_ENTRY_SIZE <= bytes; off += DECORATION_ENTRY_SIZE) {
        if (begin.getInt32(off + TRACKED_TYPE) === TYPE_ENTITY) out.push(begin.getBin64(off + TRACKED_ENTITY_ID));
    }
    return out;
}
