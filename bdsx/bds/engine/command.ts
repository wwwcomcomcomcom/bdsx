/**
 * Plugin command registration on 1.26 (engine layer; docs/findings-scoreboard.md section 9).
 *
 * Two things 2024's registration wrote as plain function pointers are objects in 1.26:
 *
 * - CommandParameterData+8 is no longer the parse function but `const CommandRegistry::ParamParseRule*`, a pointer to
 *   `{ ParseFunction parse; Symbol symbol; }` (Endstone command_registry.h). The engine has one static
 *   `ParseRuleFor<T>::instance` per parameter type, filled by one dynamic initializer (40 0x3417e7.., 51 0x1222427..;
 *   21 rules on 40, 23 on 51, the same order on both). registerOverloadInternal takes a basic parameter's grammar
 *   symbol from `parse_rule->symbol` when neither enum_or_postfix_symbol (+64) nor chained_subcommand_symbol (+80)
 *   is set, so the rule has to be the engine's (or at least carry its symbol): Int 0x100001, Id 0x100038.
 * - Overload+8 is a 64-byte `brstd::copyable_function<std::unique_ptr<Command>() const>`: `{ vtable* vfptr; target }`
 *   with the vtable `{ move_to, destroy, invoke, copy_to }`. For a function-pointer target the engine uses one shared
 *   vtable (40 0xa52d510, 51 0xa64c4b0: move/copy copy the qword at +8, destroy is `ret`, invoke calls [storage+8]
 *   with the caller's rcx as the hidden unique_ptr return slot), which is exactly 2024's allocator calling
 *   convention, so bdsx's allocator goes in the target slot unchanged.
 */
import { NativePointer, VoidPointer } from "../../core";
import { engineSymbol } from "./deps";

const RULES: [string, NativePointer | null][] = [
    ["int", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<int>::instance")],
    ["std::string", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<std::string>::instance")],
];

/** The engine's ParseRuleFor<T>::instance whose parse function is `parser` (the 2024-style parse<T> address), or null. */
export function commandParseRule(parser: VoidPointer | null): NativePointer | null {
    if (parser === null || parser.isNull()) return null;
    for (const [, rule] of RULES) {
        if (rule !== null && rule.getPointer(0).equalsptr(parser)) return rule;
    }
    return null;
}

/** [type name, rule address, its parse function, its symbol] for every rule bdsx knows on this build (for probes) */
export function commandParseRules(): [string, NativePointer | null, VoidPointer | null, number][] {
    return RULES.map(([name, rule]) => [name, rule, rule === null ? null : rule.getPointer(0), rule === null ? 0 : rule.getInt32(8) >>> 0]);
}

/** brstd::copyable_function's vtable for a `std::unique_ptr<Command>(*)()` target (Overload::alloc) */
export function commandAllocVftable(): NativePointer {
    const vt = engineSymbol("bdsx:CommandRegistry::Overload::AllocFunction::fnptr_vftable");
    if (vt === null) throw Error("CommandRegistry::Overload: no copyable_function vtable in this build's table");
    return vt;
}
