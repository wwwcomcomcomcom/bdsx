/**
 * Plugin commands on 1.26 (engine layer; docs/findings-scoreboard.md sections 9-10).
 *
 * Two things 2024's registration wrote as plain function pointers are objects in 1.26:
 *
 * - CommandParameterData+8 is no longer the parse function but `const CommandRegistry::ParamParseRule*`, a pointer to
 *   `{ ParseFunction parse; Symbol symbol; }` (Endstone command_registry.h). The engine has one static
 *   `ParseRuleFor<T>::instance` per parameter type, filled by one dynamic initializer (40 0x3417e0.., 51 0x1222420..;
 *   21 rules on 40, 23 on 51, the same order on both). registerOverloadInternal takes a basic parameter's grammar
 *   symbol from `parse_rule->symbol` when neither enum_or_postfix_symbol (+64) nor chained_subcommand_symbol (+80)
 *   is set, so the rule has to be the engine's (or at least carry its symbol). Each rule below was named by reading
 *   its parse function on both builds against the 2024 parse<T> of that type (section 10.2): what it writes into
 *   the parameter's storage is what bdsx's class of that name holds.
 * - Overload+8 is a 64-byte `brstd::copyable_function<std::unique_ptr<Command>() const>`: `{ vtable* vfptr; target }`
 *   with the vtable `{ move_to, destroy, invoke, copy_to }`. For a function-pointer target the engine uses one shared
 *   vtable (40 0xa52d510, 51 0xa64c4b0: move/copy copy the qword at +8, destroy is `ret`, invoke calls [storage+8]
 *   with the caller's rcx as the hidden unique_ptr return slot), which is exactly 2024's allocator calling
 *   convention, so bdsx's allocator goes in the target slot unchanged.
 *
 * And a command's output (section 10.1): CommandOutput keeps 2024's layout (type +0, property bag +8, messages +0x10,
 * success count +0x28), but success(message, params) and error(message, params) are inlined everywhere; the one
 * out-of-line member left is addMessage, which now takes the message id as a `std::string_view`.
 */
import { NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { CxxStringView, int32_t, void_t } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

/**
 * [label, rule]. The label is what `commandParseRuleFor` is asked for (bds/command.ts maps bdsx's parameter types to
 * it). Two rules can share a parse function (the three selector rules, Position and PositionFloat): the engine told
 * them apart by the symbol, so they are looked up by label, never by the function.
 */
const RULES: [string, NativePointer | null][] = [
    ["int", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<int>::instance")],
    ["std::string", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<std::string>::instance")],
    ["float", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<float>::instance")],
    ["RelativeFloat", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<RelativeFloat>::instance")],
    ["CommandWildcardInt", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandWildcardInt>::instance")],
    ["CommandPosition", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandPosition>::instance")],
    ["CommandPositionFloat", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandPositionFloat>::instance")],
    ["CommandRawText", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandRawText>::instance")],
    ["CommandSelector<Actor>", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandSelector<Actor>>::instance")],
    ["CommandSelector<Player>", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandSelector<Player>>::instance")],
    ["WildcardCommandSelector<Actor>", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<WildcardCommandSelector<Actor>>::instance")],
];

/** The engine's ParseRuleFor<T>::instance for the type bds/command.ts labels `label`, or null. */
export function commandParseRuleFor(label: string | undefined): NativePointer | null {
    if (label === undefined) return null;
    for (const [name, rule] of RULES) {
        if (name === label) return rule;
    }
    return null;
}

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

// ---- CommandOutput (section 10.1) ----

/** CommandOutput::success_count_, the int every inlined success() increments (`inc dword [output+0x28]`) */
export const COMMAND_OUTPUT_SUCCESS_COUNT = 0x28;

const ADD_MESSAGE = engineSymbol("bdsx:CommandOutput::addMessage");
let addMessageCall: ((output: VoidPointer, messageId: string, params: VoidPointer, type: number) => void) | null = null;

/**
 * CommandOutput::addMessage(std::string_view id, const std::vector<CommandOutputParameter>& params, CommandOutputMessageType)
 * (40 0x12f19e0, 51 0x1211560): clears the messages first when the type is LastOutput, copies every parameter whose
 * count is not -1 as a string, and appends a 0x40-byte CommandOutputMessage.
 */
export function commandOutputAddMessage(output: VoidPointer, messageId: string, params: VoidPointer, type: number): void {
    if (ADD_MESSAGE === null) throw Error("CommandOutput::addMessage: no address in this build");
    if (addMessageCall === null) addMessageCall = makefunc.js(ADD_MESSAGE, void_t, null, VoidPointer, CxxStringView, VoidPointer, int32_t);
    addMessageCall(output, messageId, params, type);
}

/**
 * The inlined CommandOutput::success(id, params), as every 1.26 command's execute writes it (40 KillCommand's output,
 * 0x3ba340..0x3ba39a): the parameters' counts are summed; unless the sum is -1 the success count grows by
 * max(1, sum); then, when the output keeps messages (type not None or Silent) and the id is not empty, the message is
 * added as a Success.
 */
export function commandOutputSuccess(output: StaticPointer, messageId: string, params: StaticPointer): void {
    let sum = 0;
    const begin = params.getPointer(0);
    const end = params.getPointer(8);
    const n = (end.subptr(begin) / 0x28) | 0;
    for (let i = 0; i < n; i++) sum = (sum + begin.getInt32(i * 0x28 + 0x20)) | 0;
    if (sum !== -1) output.setInt32(output.getInt32(COMMAND_OUTPUT_SUCCESS_COUNT) + (sum >= 2 ? sum : 1), COMMAND_OUTPUT_SUCCESS_COUNT);
    if ((output.getInt32(0) & ~2) !== 0 && messageId.length !== 0) commandOutputAddMessage(output, messageId, params, 0);
}

/** The inlined CommandOutput::error(id, params): unless the output's type is None, the message is added as an Error. */
export function commandOutputError(output: StaticPointer, messageId: string, params: StaticPointer): void {
    if (output.getInt32(0) !== 0) commandOutputAddMessage(output, messageId, params, 1);
}

// ---- CommandSelectorBase (section 10.3) ----

/**
 * The inlined CommandSelectorBase(bool forcePlayer) constructor, as the engine's allocateCommand<T> writes it (40
 * TestForCommand 0x3cba388.., GetSpawnPointCommand 0x1110808..; 51 0x3a54ff0.., 0xffe72b..): 0xc8 bytes, zero but for
 * the CommandPosition's three relative flags (+0x94..+0x96), radius max FLT_MAX (+0xa8), result count 0xffffffff
 * (+0xb0), forcePlayer (+0xbe) and, on builds that have it, one more flag set true (40 only: +0xc2).
 */
export function commandSelectorConstruct(selector: StaticPointer, forcePlayer: boolean): void {
    for (let off = 0; off < 0xc8; off += 8) selector.setInt64WithFloat(0, off);
    selector.setUint8(1, 0x94);
    selector.setUint8(1, 0x95);
    selector.setUint8(1, 0x96);
    selector.setInt32(0x7f7fffff, 0xa8);
    selector.setInt32(-1, 0xb0);
    selector.setUint8(forcePlayer ? 1 : 0, 0xbe);
    const extra = engineLayout("CommandSelectorBase", "defaultTrueFlag", -1);
    if (extra >= 0) selector.setUint8(1, extra);
}
