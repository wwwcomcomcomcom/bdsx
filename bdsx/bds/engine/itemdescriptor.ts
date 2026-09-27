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

/**
 * NetworkItemStackDescriptor(NetworkItemStackDescriptor&&) (docs/findings-nbt.md section 26).
 *
 * The class is 0x60 bytes on both builds (Endstone's network_item_stack_descriptor.h, Apache-2.0): ItemDescriptor
 * (vptr, impl_ +8), uint16 count +0x10, bool include_net_ids +0x18, the ItemStackNetIdVariant +0x20 (0x10 bytes of
 * storage, its index byte at +0x30), BlockRuntimeId +0x38, the user-data std::string +0x40. 2024's move constructor
 * (1.21.3.01 0x85ee90) is ItemDescriptor's move (impl_ taken, the source's nulled), the count, the byte, the variant
 * copied, the runtime id, and the string moved (the source left an empty SSO string). 1.26 keeps no out-of-line copy
 * on either build: the only small functions that store both ??_7ItemDescriptor and ??_7NetworkItemStackDescriptor
 * without freeing anything are the copy constructor (40 0x2431a0, which clones impl_ and copies the string) and a
 * relocation that also destroys the source (40 0x2734790). Both copy the variant member by member: the server id is
 * an int at +0x20, and each client id alternative is a static vptr at +0x20 and an int at +0x28, so a byte copy of
 * the variant is the same thing. So: the table's vptr, the other 0x58 bytes as they are, then the source's impl_
 * nulled and its string emptied. Nothing is allocated or freed; the moved-from object still destructs normally.
 */
const NISD_VFTABLE = engineSymbol("??_7NetworkItemStackDescriptor@@6B@");
const NISD_SIZE = 0x60;
const NISD_USERDATA = 0x40;

/** NetworkItemStackDescriptor::NetworkItemStackDescriptor(NetworkItemStackDescriptor&&) */
export function networkItemStackDescriptorMove(self: StaticPointer, other: StaticPointer): void {
    if (NISD_VFTABLE === null) throw Error("??_7NetworkItemStackDescriptor@@6B@: no address in this build");
    self.copyFrom(other, NISD_SIZE);
    self.setPointer(NISD_VFTABLE, 0);
    other.setPointer(null, IMPL);
    // std::string: buffer/pointer +0x00, size +0x10, capacity +0x18 -> an empty SSO string
    other.setPointer(null, NISD_USERDATA + 0x10);
    other.setPointer(null, NISD_USERDATA + 0x18);
    other.setInt32(0xf, NISD_USERDATA + 0x18);
    other.setUint8(0, NISD_USERDATA);
}
