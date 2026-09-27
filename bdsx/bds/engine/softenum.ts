/**
 * Command soft enums (engine layer; docs/findings-scoreboard.md section 8).
 *
 * 2024's CommandSoftEnumRegistry::updateSoftEnum (a class holding only the CommandRegistry pointer) switched on the
 * update type into CommandRegistry::addSoftEnumValues, removeSoftEnumValues and an inlined setSoftEnumValues. 1.26
 * keeps no out-of-line copy of it: ServerScoreboard::onObjectiveAdded (40 0x13c0f0) calls addSoftEnumValues itself.
 * The three members are out of line on both builds (40 0x376d60 / 0x3773d0 / 0x376fc0, 51 0x1252ba0 / 0x12531d0 /
 * 0x1252e00), each `(CommandRegistry* this, std::string const& name, std::vector<std::string> values)` with the
 * vector passed by value (a pointer the callee destroys), each looking the name up in soft_enum_lookup_ (+0x248),
 * changing soft_enums_ (+0x230, 0x38-byte entries) and sending an UpdateSoftEnumPacket of its own type (0 add,
 * 1 remove, 2 replace) through the registry's network callback. An unknown name returns without doing anything.
 */
import { VoidPointer } from "../../core";
import { CxxVectorToArray } from "../../cxxvector";
import { makefunc } from "../../makefunc";
import { CxxString, void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

/** indexed by SoftEnumUpdateType: Add, Remove, Replace */
const TARGETS = [
    engineSymbol(
        "?addSoftEnumValues@CommandRegistry@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@3@@Z",
    ),
    engineSymbol(
        "?removeSoftEnumValues@CommandRegistry@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@3@@Z",
    ),
    engineSymbol(
        "?setSoftEnumValues@CommandRegistry@@QEAAXAEBV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@3@@Z",
    ),
];
const NAMES = ["addSoftEnumValues", "removeSoftEnumValues", "setSoftEnumValues"];

type ValuesCall = (registry: VoidPointer, name: string, values: string[]) => void;
const calls: (ValuesCall | null)[] = [null, null, null];

/** CommandSoftEnumRegistry::updateSoftEnum, with the registry itself in place of the one-pointer wrapper */
export function updateSoftEnumOwn(registry: VoidPointer, type: number, name: string, values: string[]): void {
    const target = TARGETS[type];
    if (target === undefined) throw Error(`updateSoftEnum: unknown SoftEnumUpdateType ${type}`);
    if (target === null) throw Error(`CommandRegistry::${NAMES[type]}: no address in this build`);
    let call = calls[type];
    if (call === null) call = calls[type] = makefunc.js(target, void_t, null, VoidPointer, CxxString, CxxVectorToArray.make(CxxString));
    call(registry, name, values);
}
