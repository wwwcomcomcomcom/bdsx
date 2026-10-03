/**
 * NetherNet::NetworkID as a key (engine layer; docs/findings-nethernet.md).
 *
 * 1.26's NetherNet::NetworkID is a std::variant<std::monostate, P2P::NetworkID (u64), Realms::NetworkID (mce::UUID)>:
 * 16 bytes of storage, the one-byte index at +16, 24 bytes in all (Endstone's network_id.h; the index is the byte
 * SimpleNetworkInterfaceImpl::ReceiveFromSignalingChannel switches on, 51 0x112d1c0 `movzbl 0x10(%rdx)`). Only the
 * active alternative is meaningful: a live P2P id carried other bytes in the unused half of the storage and in the
 * padding after the index (the nn51 session, 2026-10-03), so two copies of one id differ in their 24 raw bytes.
 * 2024's NetworkID was a bare u64 (no `NetherNetNetworkID.index` layout in its table): the key is those 8 bytes.
 */
import { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const NETHERNET_ID_INDEX = engineLayout("NetherNetNetworkID", "index", -1);

function hex(p: StaticPointer, off: number, n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += p.getUint8(off + i).toString(16).padStart(2, "0");
    return s;
}

/** "<index>:<active bytes>" for the NetworkID at p+off; equal keys = equal ids, as the variant's operator== */
export function netherNetIdKey(p: StaticPointer, off: number): string {
    if (NETHERNET_ID_INDEX < 0) return hex(p, off, 8);
    const index = p.getUint8(off + NETHERNET_ID_INDEX);
    const n = index === 1 ? 8 : index === 2 ? 16 : 0;
    return `${index}:${hex(p, off, n)}`;
}

/** a 32-bit hash of the same bytes the key covers */
export function netherNetIdHash(p: StaticPointer, off: number): number {
    if (NETHERNET_ID_INDEX < 0) return p.getInt32(off) ^ p.getInt32(off + 4);
    const index = p.getUint8(off + NETHERNET_ID_INDEX);
    let h = index;
    if (index === 1 || index === 2) h ^= p.getInt32(off) ^ p.getInt32(off + 4);
    if (index === 2) h ^= p.getInt32(off + 8) ^ p.getInt32(off + 12);
    return h;
}
