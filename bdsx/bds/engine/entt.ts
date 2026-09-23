/**
 * EnTT component access (engine layer, docs/plan-architecture.md).
 *
 * 1.26 has no out-of-line Actor::getVehicle / isRiding / isPassenger and friends: every caller inlined
 * the component lookup, and it is the same instructions in every one of them -- Actor::getEntityTypeId,
 * Actor::getRuntimeID and Player::getAbilities differ only in the component's size -- so bdsx walks it
 * here, over offsets the table ships as layouts.EnTTRegistry (docs/findings-riding.md). The label is
 * entt::type_hash, which in these builds is FNV-1a-32 of the bare component name
 * (docs/findings-components.md): componentHash("PassengerComponent") = 0x98e40c0e on both 1.26 builds.
 */
import { StaticPointer } from "../../core";
import { componentHash, engineLayout } from "./deps";

/** anything whose +enttRegistry / +entityId are an EnTT registry pointer and an entity id: an Actor */
export type EntityOwner = StaticPointer | object;

const ENTT_POOLS_BEGIN = engineLayout("EnTTRegistry", "poolsBegin", 72);
const ENTT_POOLS_END = engineLayout("EnTTRegistry", "poolsEnd", 80);
const ENTT_NODES = engineLayout("EnTTRegistry", "nodes", 104);
const ENTT_NODES_END = engineLayout("EnTTRegistry", "nodesEnd", 112);
const ENTT_NODE_STRIDE = engineLayout("EnTTRegistry", "nodeStride", 32);
const ENTT_NODE_HASH = engineLayout("EnTTRegistry", "nodeHash", 8);
const ENTT_NODE_STORAGE = engineLayout("EnTTRegistry", "nodeStorage", 16);
const ENTT_SPARSE_BEGIN = engineLayout("EnTTRegistry", "sparseBegin", 8);
const ENTT_SPARSE_END = engineLayout("EnTTRegistry", "sparseEnd", 16);
const ENTT_PACKED = engineLayout("EnTTRegistry", "packed", 80);
const ENTT_ENTITY_BITS = engineLayout("EnTTRegistry", "entityBits", 18); // entt::entity: 18 index bits, the rest version
const ENTT_SPARSE_PAGE_BITS = engineLayout("EnTTRegistry", "sparsePageBits", 11); // 2048 entries per sparse page
const ENTT_PACKED_PAGE_BITS = engineLayout("EnTTRegistry", "packedPageBits", 7); // 128 elements per packed page
const ENTT_ENTITY_MASK = (1 << ENTT_ENTITY_BITS) - 1;
const ACTOR_ENTT_REGISTRY = engineLayout("Actor", "enttRegistry", 16);
const ACTOR_ENTITY_ID = engineLayout("Actor", "entityId", 24);

/** @deprecated the engine name is componentHash; kept for the call sites that predate it */
export const enttTypeHash = componentHash;

/** an index a dense_map bucket or node holds; entt's null is all ones */
function enttIndex(p: StaticPointer, offset: number): number | null {
    const low = p.getUint32(offset);
    const high = p.getUint32(offset + 4);
    if (low === 0xffffffff && high === 0xffffffff) return null;
    return high * 0x100000000 + low;
}

/** the storage (pool) a registry keeps for one component type, or null when it has none */
export function enttStorage(registry: StaticPointer, hash: number): StaticPointer | null {
    const begin = registry.getPointer(ENTT_POOLS_BEGIN);
    const buckets = registry.getPointer(ENTT_POOLS_END).subptr(begin) >> 3;
    if (buckets <= 0) return null;
    const nodes = registry.getPointer(ENTT_NODES);
    const end = registry.getPointer(ENTT_NODES_END);
    let index = enttIndex(begin, (((buckets - 1) & hash) >>> 0) * 8);
    for (let hops = 0; index !== null && hops < 1024; hops++) {
        const node = nodes.add(index * ENTT_NODE_STRIDE);
        if (node.getUint32(ENTT_NODE_HASH) === hash) {
            return node.equalsptr(end) ? null : node.getNullablePointer(ENTT_NODE_STORAGE);
        }
        index = enttIndex(node, 0);
    }
    return null;
}

/**
 * The slot an actor occupies in one component's sparse set, or null when it holds none.
 *
 * This is the whole of `ctx.hasComponent<T>()`: 1.26's inlined copies stop right here, and for a
 * flag component -- an empty type, which entt stores with no payload at all -- there is nothing
 * after it to read. `enttComponent` below goes on to the payload for the component types that
 * have one.
 */
export function enttSlot(actor: EntityOwner, hash: number): number | null {
    const self = actor as unknown as StaticPointer;
    const registry = self.getNullablePointer(ACTOR_ENTT_REGISTRY);
    if (registry === null) return null;
    const entity = self.getUint32(ACTOR_ENTITY_ID);
    const storage = enttStorage(registry, hash);
    if (storage === null) return null;
    const index = entity & ENTT_ENTITY_MASK;
    const sparseBegin = storage.getPointer(ENTT_SPARSE_BEGIN);
    const page = index >>> ENTT_SPARSE_PAGE_BITS;
    if (page >= storage.getPointer(ENTT_SPARSE_END).subptr(sparseBegin) >> 3) return null;
    const sparse = sparseBegin.getNullablePointer(page * 8);
    if (sparse === null) return null;
    const entry = sparse.getUint32((index & ((1 << ENTT_SPARSE_PAGE_BITS) - 1)) * 4);
    if (((entry ^ entity) & ~ENTT_ENTITY_MASK) !== 0) return null; // a stale version is not this entity
    if ((entry & ENTT_ENTITY_MASK) === ENTT_ENTITY_MASK) return null; // entt::null
    return entry & ENTT_ENTITY_MASK;
}

/** whether an actor holds a component at all -- the only thing a flag component can be asked */
export function enttHas(actor: EntityOwner, hash: number): boolean {
    return enttSlot(actor, hash) !== null;
}

/** the component an actor holds, by the component's type hash, or null when it holds none */
export function enttComponent(actor: EntityOwner, hash: number, size: number): StaticPointer | null {
    const self = actor as unknown as StaticPointer;
    const registry = self.getNullablePointer(ACTOR_ENTT_REGISTRY);
    if (registry === null) return null;
    const slot = enttSlot(actor, hash);
    if (slot === null) return null;
    const storage = enttStorage(registry, hash);
    if (storage === null) return null;
    const entry = slot;
    const packed = storage.getPointer(ENTT_PACKED).getNullablePointer(((entry & ENTT_ENTITY_MASK) >>> ENTT_PACKED_PAGE_BITS) * 8);
    if (packed === null) return null;
    return packed.add((entry & ((1 << ENTT_PACKED_PAGE_BITS) - 1)) * size);
}
