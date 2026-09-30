/**
 * EntityContext and the entity storages that hold one (engine layer; docs/findings-inventory.md section 16).
 *
 * 1.26 keeps no out-of-line copy of EntityContext's accessors or of the optional-shaped storage classes, but the
 * layouts are the ones 2024's bodies read:
 *
 *   EntityContext (0x18): EntityRegistry& +0, the entt registry inside it +8 (EntityRegistry + 0x30, findings-riding.md),
 *                         the entt::entity id +0x10. An Actor holds one at +8, which is why its registry and id are at
 *                         +16 / +24 there.
 *   OwnerStorageEntity / StackResultStorageEntity (0x20): an optional<EntityContext> -- the context at +0, the engaged
 *                         flag at +0x18. 2024's `_getStackRef` (0x1046820, shared by both classes) is `optional::value`:
 *                         throw bad_optional_access when the flag is clear, else return `this`; `_hasValue` (0x4d72f0)
 *                         returns the flag byte.
 *
 * `isValid` is entt's `registry.valid(entity)`: the entity storage's sparse page for the id's index holds an entry whose
 * version bits equal the id's and whose index half is not the null marker. 2024 reads the storage's sparse vector at
 * registry +0xe0/+0xe8 (0x2728b20); both 1.26 builds keep it at the same offsets (a scan of the live registry finds exactly one
 * page vector holding the bot's id, at +0xe0). The 0x110/0x118 loads that resemble it in the binary belong to another class.
 */
import { AllocatedPointer, StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const CONTEXT_REGISTRY = engineLayout("EntityContext", "entityRegistry", 0);
const CONTEXT_ENTT = engineLayout("EntityContext", "enttRegistry", 8);
const CONTEXT_ID = engineLayout("EntityContext", "entityId", 0x10);
const STORAGE_ENGAGED = engineLayout("EntityContext", "storageEngaged", 0x18);
const SPARSE_BEGIN = engineLayout("EnTTRegistry", "entitySparseBegin", 0xe0);
const SPARSE_END = engineLayout("EnTTRegistry", "entitySparseEnd", 0xe8);
const ENTITY_BITS = engineLayout("EnTTRegistry", "entityBits", 18);
const SPARSE_PAGE_BITS = engineLayout("EnTTRegistry", "sparsePageBits", 11);
const INDEX_MASK = (1 << ENTITY_BITS) - 1;

/** the EntityRegistry& an EntityContext holds (2024 `EntityContext::_registry`) */
export function entityContextRegistry(context: StaticPointer): StaticPointer {
    return context.getPointer(CONTEXT_REGISTRY);
}

/** the entt registry the EntityContext points into */
export function entityContextEntt(context: StaticPointer): StaticPointer {
    return context.getPointer(CONTEXT_ENTT);
}

/** the entt::entity id (2024 `EntityContext::_getEntityId`, which returned it by value) */
export function entityContextId(context: StaticPointer): number {
    return context.getUint32(CONTEXT_ID);
}

/** a fresh 4-byte buffer holding the id, the shape `_getEntityId` returned (an EntityId by value) */
export function entityContextIdBuffer(context: StaticPointer): AllocatedPointer {
    const out = new AllocatedPointer(4);
    out.setUint32(entityContextId(context), 0);
    return out;
}

/** entt `registry.valid(entity)` for an id in a registry */
export function enttValid(registry: StaticPointer, entity: number): boolean {
    const begin = registry.getNullablePointer(SPARSE_BEGIN);
    const end = registry.getNullablePointer(SPARSE_END);
    if (begin === null || end === null) return false;
    const index = entity & INDEX_MASK;
    const page = index >>> SPARSE_PAGE_BITS;
    if (page >= end.subptr(begin) >> 3) return false;
    const sparse = begin.getNullablePointer(page * 8);
    if (sparse === null) return false;
    const entry = sparse.getUint32((index & ((1 << SPARSE_PAGE_BITS) - 1)) * 4);
    // the entry's version bits must be the id's, and what is left (its packed index) must not be entt::null
    return (((entry ^ (entity & ~INDEX_MASK)) >>> 0) < INDEX_MASK) as boolean;
}

/** 2024 `EntityContext::isValid`: the context's own id in the context's own registry */
export function entityContextIsValid(context: StaticPointer): boolean {
    return enttValid(entityContextEntt(context), entityContextId(context));
}

const ENTITY_REGISTRY_ENTT = engineLayout("EntityRegistry", "registry", 0x30);

/**
 * `StackResultStorageEntity(WeakStorageEntity const&)` (docs/findings-inventory.md section 19). 2024 0x2728c90: the flag starts clear;
 * the weak storage must be set (`_isSet` 0x2728fb0: its control block at +8 is not null and the id's index bits are not the null
 * marker), its registry (weak +0, a WeakRef<EntityRegistry>: pointer and control block) must lock (the use count at control +8 is
 * not zero: a lock takes a strong reference and gives it back), and an EntityContext(registry, id) built from them must be valid;
 * then the three context words are copied in and the flag set. A WeakEntityRef is { EntityRegistry* +0, control +8, EntityId +0x10 }
 * (engine/entt.ts), and the entt registry inside an EntityRegistry is at +0x30.
 */
export function stackResultStorageConstruct(storage: StaticPointer, weak: StaticPointer): void {
    storage.setUint8(0, STORAGE_ENGAGED);
    const registry = weak.getNullablePointer(0);
    const control = weak.getNullablePointer(8);
    const id = weak.getUint32(0x10);
    if (control === null || (id & INDEX_MASK) === INDEX_MASK) return; // _isSet
    if (registry === null || control.getInt32(8) <= 0) return; // the weak reference does not lock: no strong owner left
    const entt = registry.add(ENTITY_REGISTRY_ENTT);
    if (!enttValid(entt, id)) return;
    storage.setPointer(registry, CONTEXT_REGISTRY);
    storage.setPointer(entt, CONTEXT_ENTT);
    storage.setUint32(id, CONTEXT_ID);
    storage.setUint8(1, STORAGE_ENGAGED);
}

/** the engaged flag of an optional<EntityContext> storage (OwnerStorageEntity, StackResultStorageEntity `_hasValue`) */
export function storageHasValue(storage: StaticPointer): boolean {
    return storage.getUint8(STORAGE_ENGAGED) !== 0;
}

/** `optional::value`: the storage itself, or a throw when it holds nothing (2024 called std::_Throw_bad_optional_access) */
export function storageStackRef(storage: StaticPointer): StaticPointer {
    if (!storageHasValue(storage)) throw Error("bad optional access: the entity storage is empty");
    return storage;
}
