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
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { CxxString, CxxStringView, int32_t, void_t } from "../../nativetype";
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
    // section 11.1: FullIntegerRange 0x100017, FilePath 0x100011, JsonObject 0x10004a
    ["CommandIntegerRange", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandIntegerRange>::instance")],
    ["CommandFilePath", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandFilePath>::instance")],
    ["Json::Value", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<Json::Value>::instance")],
    // section 11.5: MessageRoot 0x100044 (a vector of 0x28-byte MessageComponent, as 2024)
    ["CommandMessage", engineSymbol("bdsx:CommandRegistry::ParseRuleFor<CommandMessage>::instance")],
];

/** sizeof(CommandMessage): 2024's vector (0x18) plus, on 1.26, a bool at +0x18 (section 11.5) */
export const COMMAND_MESSAGE_SIZE = engineLayout("CommandMessage", "size", 0x18);

// ---- types the engine parses through an enum (section 11.2) ----

/**
 * The rule the engine itself passes for a type it parses through an enum: `bool`'s own parameters (alwaysday's
 * `lock`, 40 0x3ccf4d0) hand CommandParameterData ParseRuleFor<bool>::instance, which a static initializer zeroes (40
 * 0xba1d0) and nothing fills. registerOverloadInternal (40 0x36c4b0, 51 0x1248da0) looks a basic parameter's type id up
 * in type_lookup_ (+0x1c0); when it maps to an enum it turns the parameter into that enum's (type 1, its name) and the
 * enum's parse function becomes the parse override, so the rule is never read. bdsx passes a zeroed rule of its own.
 */
let enumBackedRule: AllocatedPointer | null = null;
export function commandEnumBackedRule(): NativePointer {
    if (enumBackedRule === null) {
        enumBackedRule = new AllocatedPointer(16);
        enumBackedRule.setInt64WithFloat(0, 0);
        enumBackedRule.setInt64WithFloat(0, 8);
    }
    return enumBackedRule as unknown as NativePointer;
}

/** CommandRegistry::enums_ (+0xe0, a vector of 0x48-byte Enum { name, type id +0x20, parse +0x28, values +0x30 }) */
const REGISTRY_ENUMS = 0xe0;
const ENUM_STRIDE = 0x48;

/**
 * The type id the engine gave the enum named `name` (Enum::type, +0x20): the id of the C++ type its parse function
 * writes. For `Boolean` that is type_id<CommandRegistry, bool> (the addEnumValues<bool> call in the registry setup,
 * 40 0x347449 / 51 0x1226fd8, passes the static 40 0xc8b8340 / 51 0xcc1ed88), which a basic parameter must carry for
 * registerOverloadInternal to find the enum. Read from the registry so no per-build static is needed. null if absent.
 */
export function commandEnumTypeId(registry: VoidPointer, name: string): number | null {
    const e = findEnum(registry, name);
    return e === null ? null : e.getUint16(0x20);
}

/** The engine's Enum entry named `name` (the vector element), or null */
export function findEnum(registry: VoidPointer, name: string): NativePointer | null {
    const vec = registry.add(REGISTRY_ENUMS);
    const begin = vec.getPointer(0);
    const end = vec.getPointer(8);
    const n = (end.subptr(begin) / ENUM_STRIDE) | 0;
    for (let i = 0; i < n; i++) {
        const e = begin.add(i * ENUM_STRIDE);
        if (e.getCxxString(0) === name) return e;
    }
    return null;
}

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

const bagDeleteBySlot = new Map<string, (bag: VoidPointer, flags: number) => void>();

/**
 * The property-bag half of the inlined ~CommandOutput (section 13). The constructor ships (40 0x12df330, 51 0x1201940)
 * but no out-of-line destructor is left: executeCommand's epilogue (40 0x38bc60, 51 0x3dabe0) and a run-and-count
 * helper (40 0x10d6420, 51 0xfbe4c0) destroy the message vector at +0x10, then call slot 0 of the bag at +8 with 1
 * when it is set -- 2024's ??1CommandOutput (0xcbd0e0) member for member. Slot 0 is CommandPropertyBag's deleting
 * destructor (40 0x3c2390, 51 0x125a8c0: ~Json::Value on +8, then a 0x20-byte free). The caller destroys the
 * messages first.
 */
export function commandOutputDeleteBag(output: StaticPointer): void {
    const bag = output.getNullablePointer(8);
    if (bag === null) return;
    output.setPointer(null, 8);
    const fn = bag.getPointer(0).getPointer(0);
    const key = fn.toString();
    let call = bagDeleteBySlot.get(key);
    if (call === undefined) {
        const native = makefunc.js(fn, void_t, null, VoidPointer, int32_t);
        call = (b: VoidPointer, flags: number) => native(b, flags);
        bagDeleteBySlot.set(key, call);
    }
    call(bag, 1);
}

// ---- MinecraftCommands::getOutputType (section 14) ----

/**
 * The inlined MinecraftCommands::getOutputType(origin), as executeCommand writes it right before it constructs its
 * output (40 0x38b5cb..0x38b6f9, 51 0x3da53b..0x3da669; 2024's out-of-line body is 0xd0a020). Origin types 4, 5, 6 and
 * 14 (Test, AutomationPlayer, ClientAutomation, Scripting) are DataSet and 7 (DedicatedServer) is AllOutput: a table
 * indexed by type - 4 under the mask 0x40f (40 0xa5dfaf0, 51 0xa6fe9f0, both { 4, 4, 4, 3, 0 x6, 4 }). Every other
 * type reads the origin's level's game rules: command blocks (1, 2) are AllOutput with commandblockoutput on and
 * LastOutput with it off, the rest AllOutput with sendcommandfeedback on and Silent with it off. A rule index past the
 * end of the rule vector counts as off; no level is AllOutput. Endstone's re-implementation (minecraft_commands.cpp)
 * is the same. `ruleOn` is null when the origin has no level.
 */
export function commandOutputTypeFor(originType: number, ruleOn: ((rule: "commandblockoutput" | "sendcommandfeedback") => boolean) | null): number {
    switch (originType) {
        case 4:
        case 5:
        case 6:
        case 14:
            return 4;
        case 7:
            return 3;
    }
    if (ruleOn === null) return 3;
    if (originType === 1 || originType === 2) return ruleOn("commandblockoutput") ? 3 : 1;
    return ruleOn("sendcommandfeedback") ? 3 : 2;
}

/**
 * A bool game rule's value as the inlined getOutputType reads it: GameRule::value_ is a std::variant<monostate, bool,
 * int, float> at +4 whose index byte is at +8 (Endstone game_rules.h); the engine takes the byte at +4 after checking
 * the index is 1 (std::get, which throws bad_variant_access otherwise).
 */
export function gameRuleBoolValue(rule: StaticPointer): boolean {
    const index = rule.getUint8(8);
    if (index !== 1) throw Error(`GameRule: not a bool (variant index ${index})`);
    return rule.getUint8(4) !== 0;
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

// ---- CommandRegistry::Parser (docs/findings-scoreboard.md section 12) ----

/**
 * CommandRegistry::Parser keeps 2024's 0xc0-byte layout on both builds: registry +0, parse table +8, the parse stack
 * (a deque) +0x10, the input +0x38, the root ParseToken (unique_ptr) +0x78, the error message +0x80, the error
 * parameters (vector<string>) +0xa0, the version +0xb8, "generate params" +0xbc. The constructor (40 0x33e390, 51
 * 0x121f2a0, buildParseTable inlined), parseCommand, getErrorParams and the destructor are out of line under their
 * 2024 prototypes; createCommand (2024: an 89-byte wrapper) and getErrorMessage (`lea rax,[rcx+0x80]`) are not.
 */
export const COMMAND_PARSER_SIZE = engineLayout("CommandRegistry::Parser", "size", 0xc0);
const PARSER_ROOT = engineLayout("CommandRegistry::Parser", "root", 0x78);
const PARSER_ERROR_MESSAGE = engineLayout("CommandRegistry::Parser", "errorMessage", 0x80);
const PARSER_ERROR_PARAMS = engineLayout("CommandRegistry::Parser", "errorParams", 0xa0);
const PARSER_VERSION = engineLayout("CommandRegistry::Parser", "version", 0xb8);

const REGISTRY_CREATE_COMMAND = engineSymbol(
    "?createCommand@CommandRegistry@@AEBA?AV?$unique_ptr@VCommand@@U?$default_delete@VCommand@@@std@@@std@@AEBUParseToken@1@AEBVCommandOrigin@@HAEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@3@AEAV?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@3@@Z",
);
let registryCreateCommand:
    | ((registry: VoidPointer, out: VoidPointer, root: VoidPointer, origin: VoidPointer, version: number, error: VoidPointer, params: VoidPointer) => void)
    | null = null;

/**
 * Parser::createCommand(origin): nothing before a parse has made a root token; otherwise
 * CommandRegistry::createCommand(root, origin, version, errorMessage&, errorParams&) (40 0x33c3b0, 51 0x121d2d0), the
 * call MinecraftCommands::compileCommand and executeCommand make themselves on both builds. Returns the Command the
 * caller now owns, or null.
 */
export function commandParserCreateCommand(parser: StaticPointer, origin: VoidPointer): NativePointer | null {
    const root = parser.getPointer(PARSER_ROOT);
    if (root.isNull()) return null;
    if (REGISTRY_CREATE_COMMAND === null) throw Error("CommandRegistry::createCommand: no address in this build");
    if (registryCreateCommand === null) {
        registryCreateCommand = makefunc.js(REGISTRY_CREATE_COMMAND, void_t, null, VoidPointer, VoidPointer, VoidPointer, VoidPointer, int32_t, VoidPointer, VoidPointer);
    }
    const out = new AllocatedPointer(8);
    out.setInt64WithFloat(0, 0);
    registryCreateCommand(parser.getPointer(0), out, root, origin, parser.getInt32(PARSER_VERSION), parser.add(PARSER_ERROR_MESSAGE), parser.add(PARSER_ERROR_PARAMS));
    const cmd = out.getPointer(0);
    return cmd.isNull() ? null : cmd;
}

/** Parser::getErrorMessage(): the std::string at +0x80 */
export function commandParserErrorMessage(parser: StaticPointer): string {
    return parser.getCxxString(PARSER_ERROR_MESSAGE);
}

// ---- CommandRegistry::getCommandName (section 12) ----

/**
 * getCommandName(const std::string&): lexes the line and returns its first non-whitespace token, or "" (40 0x36dc70,
 * 51 0x124a3e0; the only callers of the lexer's step besides Parser::_parse). 2024's is a const member that never
 * reads `this`; 51 keeps that (rcx registry, rdx sret, r8 string) and 40 drops the dead `this` (rcx sret, rdx string),
 * so `thisArgs` in the table says which.
 */
const GET_COMMAND_NAME = engineSymbol("bdsx:CommandRegistry::getCommandName");
const GET_COMMAND_NAME_THIS_ARGS = engineLayout("CommandRegistry::getCommandName", "thisArgs", 1);
let getCommandNameCall: ((registry: VoidPointer, command: string) => string) | null = null;

export function commandNameOf(registry: VoidPointer, command: string): string {
    if (GET_COMMAND_NAME === null) throw Error("CommandRegistry::getCommandName: no address in this build");
    if (getCommandNameCall === null) {
        if (GET_COMMAND_NAME_THIS_ARGS === 0) {
            const fn = makefunc.js(GET_COMMAND_NAME, CxxString, { structureReturn: true }, CxxString);
            getCommandNameCall = (_registry, cmd) => fn(cmd);
        } else {
            const fn = makefunc.js(GET_COMMAND_NAME, CxxString, { this: VoidPointer, structureReturn: true }, CxxString);
            getCommandNameCall = (reg, cmd) => fn.call(reg, cmd);
        }
    }
    return getCommandNameCall(registry, command);
}
