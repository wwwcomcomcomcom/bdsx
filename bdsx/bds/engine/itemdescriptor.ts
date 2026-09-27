/**
 * ItemDescriptor's constructors and destructor (engine layer; docs/findings-nbt.md section 23).
 *
 * ItemDescriptor is 0x10 bytes on both builds: its vptr, then a std::unique_ptr<BaseDescriptor> impl_ (Endstone's
 * item_descriptor.h, Apache-2.0; ItemStackBase::getDescriptor, 40 0x1bc1d60 / 51 0x1a544e0, stores the vptr and
 * reads impl_ at +8). 2024 kept all three members out of line (1.21.3.01 0x1b486f0 default, 0x1b476a0 copy,
 * 0x149790 destructor). 1.26 keeps none of them on either build: each of the ~1,200 functions that store
 * ??_7ItemDescriptor@@6B@ inlines them, and the only out-of-line code is the vftable's slot 0, the scalar deleting
 * destructor (40 0x23e110 / 51 0x1cea20, 78 bytes: store the vptr, release impl_ through its own vftable's deleting
 * destructor with 1, then operator delete(this, 0x10) only when the flag is nonzero). So:
 *
 *   default  the vptr and a null impl_, 2024's 0x1b486f0 as written
 *   copy     the vptr, then impl_ = other.impl_ ? other.impl_->clone() : null. clone is BaseDescriptor's vftable
 *            slot 0 on both builds (this=rcx, the unique_ptr's sret=rdx; InternalItemDescriptor's is
 *            40 0x2533930 / 51 0x1adab90: the engine allocator's 0x18 bytes, the vptr, the 16-byte ItemEntry) and
 *            the inlined copies (e.g. the vector growths at 40 0x1b23d50 / 51 0x2441e20) pass &this->impl_ as the
 *            sret directly, as 2024's did through a temporary
 *   dtor     the deleting destructor with 0
 *
 * The impl_ is allocated and freed by the engine only; bdsx never touches its memory.
 */
import { asm, Register } from "../../assembler";
import { StaticPointer, VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { int32_t, void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const VFTABLE = engineSymbol("??_7ItemDescriptor@@6B@");
const DELETING = engineSymbol("??_GItemDescriptor@@UEAAPEAXI@Z");
/** ItemDescriptor::impl_ */
const IMPL = 8;

let clone: ((impl: VoidPointer, out: VoidPointer) => void) | null = null;
let deleting: ((self: VoidPointer, flags: number) => VoidPointer) | null = null;

function vftable(): VoidPointer {
    if (VFTABLE === null) throw Error("??_7ItemDescriptor@@6B@: no address in this build");
    return VFTABLE;
}

/** ItemDescriptor::ItemDescriptor() */
export function itemDescriptorConstruct(self: StaticPointer): void {
    self.setPointer(vftable(), 0);
    self.setPointer(null, IMPL);
}

/** ItemDescriptor::ItemDescriptor(const ItemDescriptor&) */
export function itemDescriptorCopy(self: StaticPointer, other: StaticPointer): void {
    const vptr = vftable();
    const impl = other.getNullablePointer(IMPL);
    self.setPointer(vptr, 0);
    self.setPointer(null, IMPL);
    if (impl === null) return;
    if (clone === null) {
        // BaseDescriptor::clone() const, vftable slot 0
        clone = makefunc.js(
            asm().mov_r_rp(Register.rax, Register.rcx, 1, 0).jmp_rp(Register.rax, 1, 0).alloc("ItemDescriptor::BaseDescriptor::clone via vft[0]"),
            void_t,
            null,
            VoidPointer,
            VoidPointer,
        );
    }
    clone(impl, self.add(IMPL));
}

/** ItemDescriptor::~ItemDescriptor(): the scalar deleting destructor with 0 */
export function itemDescriptorDestruct(self: StaticPointer): void {
    if (deleting === null) {
        if (DELETING === null) throw Error("??_GItemDescriptor@@UEAAPEAXI@Z: no address in this build");
        deleting = makefunc.js(DELETING, VoidPointer, null, VoidPointer, int32_t);
    }
    deleting(self, 0);
}
