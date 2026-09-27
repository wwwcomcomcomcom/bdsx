/**
 * InventoryTransaction::getActions (engine layer; docs/findings-nbt.md section 28).
 *
 * 2024 kept getActions out of line (1.21.3.01 0x1bd2c10); 1.26 inlines it on both builds, into the three
 * Item*InventoryTransaction::handle (40 0x258e130 / 0x2591460 / 0x2596380, 51 0x2a69040 / 0x2a6c4a0 / 0x2a71b60), which
 * are the only code referencing its static empty vector (40 0xa691560 / 51 0xa7c8390). So bdsx does the lookup itself.
 *
 * InventoryTransaction::actions_ is a std::unordered_map<InventorySource, std::vector<InventoryAction>> at +0 (Endstone's
 * inventory_transaction.h, Apache-2.0), MSVC's layout, read in the engine's own InventoryTransaction::addAction
 * (40 0x258cbb0 / 51 0x2a67320) and in 2024's getActions:
 *
 *   map+0x08  the list's sentinel node        map+0x10  the element count
 *   map+0x18  the bucket vector (lo/hi pairs) map+0x30  the bucket mask
 *   node+0x00 next   node+0x08 prev   node+0x10 the key (InventorySource, 12 bytes)   node+0x20 the vector
 *
 * addAction allocates each node as 0x38 bytes and writes the key's first 8 bytes to +0x10 and its flags to +0x18, then
 * zeroes the vector at +0x20. The hash is (type << 16) ^ (int8)containerId on both builds and in 2024, but bdsx does not
 * need it: this walks the list, which holds every element once, and compares keys the way 1.26 does. 1.26's key
 * equality (both builds, addAction's two jump tables) is by type:
 *
 *   ContainerInventory (0), NonImplementedFeatureTODO (99999)   the same type and the same container id byte (+4)
 *   GlobalInventory (1), CreativeInventory (3)                   the same type
 *   WorldInteraction (2)                                         the same type and the same flags (+8)
 *   anything else (InvalidInventory, ...)                        never equal, so never found
 *
 * (2024's equality differed: it compared the container id for type 0, nothing for type 1 and found nothing otherwise.)
 * A source the map does not hold gives null; the caller returns an empty vector, as the engine returns its static one.
 */
import { StaticPointer, VoidPointer } from "../../core";

const MAP_HEAD = 0x08;
const MAP_SIZE = 0x10;
const NODE_NEXT = 0x00;
const NODE_KEY = 0x10;
const NODE_VALUE = 0x20;

/** InventorySource equality as 1.26's InventoryTransaction::addAction compares keys */
export function inventorySourceEquals(a: VoidPointer, b: VoidPointer): boolean {
    const x = a as StaticPointer;
    const y = b as StaticPointer;
    const type = x.getUint32(0);
    if (type !== y.getUint32(0)) return false;
    switch (type) {
        case 0:
        case 99999:
            return x.getUint8(4) === y.getUint8(4);
        case 1:
        case 3:
            return true;
        case 2:
            return x.getUint32(8) === y.getUint32(8);
        default:
            return false;
    }
}

/** &actions_[source] if the map holds the source, else null (InventoryTransaction::getActions without the empty static) */
export function inventoryTransactionActions(transaction: VoidPointer, source: VoidPointer): StaticPointer | null {
    const map = transaction as StaticPointer;
    const head = map.getPointer(MAP_HEAD);
    let left = map.getUint32(MAP_SIZE);
    for (let node = head.getPointer(NODE_NEXT); left > 0 && !node.equalsptr(head); node = node.getPointer(NODE_NEXT), left--) {
        if (inventorySourceEquals(node.add(NODE_KEY), source)) return node.add(NODE_VALUE);
    }
    return null;
}
