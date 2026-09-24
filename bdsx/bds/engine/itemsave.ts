/**
 * ItemStackBase's NBT round trip on 1.26 (engine layer; docs/findings-nbt.md "ItemStackBase").
 *
 * save gained an argument: `std::unique_ptr<CompoundTag> save(SaveContext const&) const`, the context a one-byte
 * SaveUseCase (Endstone's save_context.h). ItemActor::addAdditionalSaveData allocates it, stores 0 (SaveToDisk) and
 * passes its address in r8. The 2024 decoration no longer describes it, so it ships as `bdsx:ItemStackBase::save`
 * (40 0x1bc6230 / 51 0x1a58680).
 *
 * load is inlined everywhere 1.26 uses it. ItemStack::fromTag (40 0x1bbef90 / 51 0x1a51880) spells it out:
 * ItemStackBase::_loadItem(tag), then, when the stack has an item, Item::fixupCommon(ItemStackBase&) through the
 * item's vftable (+0x358 on both builds; 2024's Item::fixupOnLoad called it at +0x2e8), then fixupOnLoad's tail --
 * an aux value that reads 0x7fff becomes 0 -- which implements.ts does with its derived getAuxValue.
 */
import { AllocatedPointer, NativePointer, StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";
import { engineLayout, engineSymbol } from "./deps";

const SAVE = engineSymbol("bdsx:ItemStackBase::save");
const LOAD_ITEM = engineSymbol("?_loadItem@ItemStackBase@@AEAAXAEBVCompoundTag@@@Z");
export const ITEM_FIXUP_COMMON_SLOT = engineLayout("Item", "fixupCommonSlot", 93);

/** SaveContext: one byte, SaveUseCase::SaveToDisk = 0, what ItemActor's own save passes */
const saveToDisk = new AllocatedPointer(8);
saveToDisk.setUint8(0, 0);

let saveCall: ((stack: VoidPointer, out: VoidPointer, context: VoidPointer) => void) | null = null;
/** ItemStackBase::save: the CompoundTag the engine allocated (the caller owns it), or null */
export function itemStackSave(stack: StaticPointer): NativePointer | null {
    if (SAVE === null) throw Error("ItemStackBase::save: no address in this build");
    // rcx = this, rdx = where the unique_ptr goes (the struct return), r8 = &SaveContext
    saveCall ??= makefunc.js(SAVE, void_t, null, VoidPointer, VoidPointer, VoidPointer);
    const out = new AllocatedPointer(8);
    out.setPointer(null, 0);
    saveCall(stack, out, saveToDisk);
    return out.getNullablePointer(0);
}

let loadItemCall: ((stack: VoidPointer, tag: VoidPointer) => void) | null = null;
const fixupCalls = new Map<string, (item: VoidPointer, stack: VoidPointer) => void>();
/** ItemStackBase::load up to fixupOnLoad's aux tail; returns whether the stack has an item (the tail runs only then) */
export function itemStackLoad(stack: StaticPointer, tag: VoidPointer): boolean {
    if (LOAD_ITEM === null) throw Error("ItemStackBase::_loadItem: no address in this build");
    loadItemCall ??= makefunc.js(LOAD_ITEM, void_t, null, VoidPointer, VoidPointer);
    loadItemCall(stack, tag);
    const ref = stack.getNullablePointer(8); // item_: a WeakPtr<Item>, the shared counter's first word is the Item*
    const item = ref === null ? null : ref.getNullablePointer(0);
    if (item === null) return false;
    const fn = item.getPointer(0).getPointer(ITEM_FIXUP_COMMON_SLOT * 8);
    const key = fn.toString();
    let call = fixupCalls.get(key);
    if (call === undefined) {
        call = makefunc.js(fn, void_t, null, VoidPointer, VoidPointer);
        fixupCalls.set(key, call);
    }
    call(item, stack);
    return true;
}
