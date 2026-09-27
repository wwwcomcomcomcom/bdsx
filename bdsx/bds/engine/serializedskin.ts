/**
 * SerializedSkin's constructor and destructor (engine layer; docs/findings-layouts.md "SerializedSkin").
 *
 * 1.26 has no SerializedSkin class. A skin is a SerializedSkinRef -- a std::shared_ptr to
 * Bedrock::Application::ThreadOwner<SerializedSkinImpl>, whose base is empty -- and SerializedSkinImpl carries
 * 2024's SerializedSkin members in 2024's order, plus two (Endstone's serialized_skin.cpp, Apache-2.0; the
 * layout itself is in skin.ts). bdsx's SerializedSkin is that Impl.
 *
 * Every Impl the engine makes comes out of std::make_shared: the control block (0x240 bytes from the engine
 * allocator) is its vptr and two counts, then the Impl at +0x10. Its vftable (40 0xa621b20 / 51 0xa79f500) is
 * stored at 19 places on each build, and each one then calls one of four constructors on block+0x10:
 *
 *   SerializedSkinImpl()   40 0x1262bc0 / 51 0x24c2810, 597 bytes; 16 of the 19. It writes every member (the two
 *                          builds differ only in the CurrentCmdVersion it stores: 50 / 52)
 *   three request forms    ConnectionRequest, SubClientConnectionRequest and the many-argument one, one site each
 *
 * No copy or move constructor exists on either build, out of line or inlined: those 19 sites are every
 * construction, and none of them takes an Impl. A skin is shared (PlayerListEntry's constructor copies the
 * Player's shared_ptr), never copied. So bdsx's ctor_copy/ctor_move refuse (skin.ts).
 *
 * The destructor is inlined too. Its only body is slot 0 of that vftable, _Ref_count_obj2::_Destroy (40 0x1262590
 * / 51 0x24c21e0, 1420 bytes, read in full): the Impl's members destroyed in reverse, all at block+0x10 and above;
 * it never reads the vptr or the counts and frees neither the block nor the Impl. So bdsx destroys its own Impl
 * by calling it on the Impl's address minus 0x10.
 */
import type { StaticPointer } from "../../core";
import { VoidPointer } from "../../core";
import { makefunc } from "../../makefunc";
import { void_t } from "../../nativetype";
import { engineSymbol } from "./deps";

const CTOR = engineSymbol("??0SerializedSkinImpl@@QEAA@XZ");
const DESTROY = engineSymbol("bdsx:std::_Ref_count_obj2<ThreadOwner<SerializedSkinImpl>>::_Destroy");
/** std::_Ref_count_obj2's object: after the vptr and the two 32-bit counts (MSVC's STL, both builds) */
const OBJECT_IN_BLOCK = 0x10;

let ctor: ((self: VoidPointer) => void) | null = null;
let destroy: ((block: VoidPointer) => void) | null = null;

/** SerializedSkinImpl::SerializedSkinImpl() */
export function serializedSkinConstruct(self: StaticPointer): void {
    if (ctor === null) {
        if (CTOR === null) throw Error("SerializedSkinImpl(): no address in this build");
        ctor = makefunc.js(CTOR, void_t, null, VoidPointer);
    }
    ctor(self);
}

/** SerializedSkinImpl::~SerializedSkinImpl(), through the make_shared control block's _Destroy */
export function serializedSkinDestruct(self: StaticPointer): void {
    if (destroy === null) {
        if (DESTROY === null) throw Error("the SerializedSkinImpl control block's _Destroy: no address in this build");
        destroy = makefunc.js(DESTROY, void_t, null, VoidPointer);
    }
    destroy(self.add(-OBJECT_IN_BLOCK, -1));
}

/** SerializedSkin's copy and move: no such constructor in 1.26 (see above) */
export function serializedSkinNotCopyable(): never {
    throw Error("SerializedSkin copy/move: not available on BDS 1.26 -- the engine shares a skin through SerializedSkinRef and never copies one");
}
