/**
 * Enchanting an item stack (engine layer; docs/findings-nbt.md "applyEnchant").
 *
 * 2024 had three out-of-line EnchantUtils::applyEnchant overloads. The (ItemStackBase&, Enchant::Type, int level,
 * bool allowUnsafe) one bdsx exposes (1.21.3.01 0x1add0e0) was a 53-byte wrapper: build an EnchantmentInstance
 * {Type as a byte at +0, level as an int at +4} on the stack and call the (ItemStackBase&, const EnchantmentInstance&,
 * bool) overload (0x1add040). 1.26 inlines the wrapper into every caller -- EnchantCommand::execute stores the byte
 * and the int into a stack slot and passes its address -- and keeps the EnchantmentInstance overload out of line with
 * 2024's body (40 0x1c66a90, 51 0x1b56000): constructItemEnchantsFromUserData, the inlined ItemEnchants::addEnchant
 * (canEnchant: the item's enchant slot against the enchantment's slot masks unless allowUnsafe, then the
 * compatibility and existing-level tests; there is no level-against-maximum test for an enchantment the item does not
 * have yet), the book-to-enchanted-book check, saveEnchantsToUserData. So bdsx builds the 8-byte instance itself.
 */
import { AllocatedPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { bool_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const APPLY_INSTANCE = engineSymbol("?applyEnchant@EnchantUtils@@SA_NAEAVItemStackBase@@AEBVEnchantmentInstance@@_N@Z");

let applyInstance: ((item: VoidPointer, instance: VoidPointer, allowUnsafe: boolean) => boolean) | null = null;

/** EnchantUtils::applyEnchant(ItemStackBase&, Enchant::Type, int, bool): the instance overload over {type, level} */
export function applyEnchantOwn(item: VoidPointer, type: number, level: number, allowUnsafe: boolean): boolean {
    if (APPLY_INSTANCE === null) throw Error("EnchantUtils::applyEnchant(ItemStackBase&, const EnchantmentInstance&, bool): no address in this build");
    if (applyInstance === null) applyInstance = makefunc.js(APPLY_INSTANCE, bool_t, null, VoidPointer, VoidPointer, bool_t);
    // EnchantmentInstance: Enchant::Type (a byte) at +0, the level (int) at +4; the callee copies all eight bytes
    const instance = new AllocatedPointer(8);
    instance.setInt32(0, 0);
    instance.setUint8(type & 0xff, 0);
    instance.setInt32(level | 0, 4);
    return applyInstance(item, instance, allowUnsafe);
}
