import { derived } from "./bds/symbols";
import { capi } from "./capi";
import { NativePointer, StaticPointer } from "./core";
import { uint64_as_float_t } from "./nativetype";
import { procHacker } from "./prochacker";

const _Big_allocation_threshold = 4096;
const _Big_allocation_alignment = 32;
/** what an over-aligned block costs: the pointer kept at [-8], plus the alignment slack */
const _Non_user_size = 8 + _Big_allocation_alignment - 1;

const _AllocateKey = "??$_Allocate@$0BA@U_Default_allocate_traits@std@@$0A@@std@@YAPEAX_K@Z";

export namespace msAlloc {
    /**
     * `std::_Allocate<16, _Default_allocate_traits, 0>`.
     *
     * Every allocation bdsx makes for BDS goes through here -- CxxVector's growth, CxxString's
     * resize, and so every packet built from JS -- and BDS frees it with its own `operator delete`,
     * so this has to be BDS's heap and not merely *a* heap.
     *
     * 1.26 has no address for the name: the 2024 body starts no function in either build (the
     * inliner took it), and the assertion strings that would anchor `operator new` exactly were
     * stripped. But the heap is knowable from the import table, which is exact.
     * `operator new` -> `Bedrock::Memory::getDefaultAllocator()` -> `InternalHeapAllocator::allocate`,
     * which is `size = max(size, 1); jmp [malloc]` against the imported
     * api-ms-win-crt-heap malloc -- the same `malloc` `dll.ucrtbase` binds, in 2024 and in both
     * 1.26 builds. `deallocate` below has always relied on that: it calls `capi.free` on memory
     * BDS allocated. So the body is written here over `capi.malloc`, unchanged otherwise.
     * (docs/findings-utils.md, "std::_Allocate and the heap underneath BDS")
     */
    export const allocate: (bytes: number) => NativePointer = derived<(bytes: number) => NativePointer>(
        _AllocateKey,
        function allocate(bytes: number): NativePointer {
            if (bytes >= _Big_allocation_threshold) {
                // _Allocate_manually_vector_aligned: over-allocate, hand back a 32-byte aligned
                // pointer, and keep the real one at [-8] for deallocate to find
                const block = capi.malloc(bytes + _Non_user_size);
                if (block.isNull()) throw Error(`msAlloc.allocate: out of memory (${bytes + _Non_user_size} bytes)`);
                // (block + _Non_user_size) & ~(_Big_allocation_alignment - 1), in the low bits only:
                // the offset is between 8 and _Non_user_size, so the stored pointer always fits
                const offset = _Non_user_size - (((block.getAddressLow() >>> 0) + _Non_user_size) & (_Big_allocation_alignment - 1));
                const user = block.add(offset);
                user.setPointer(block, -8);
                return user;
            }
            const ptr = capi.malloc(bytes);
            // std::_Allocate hands back nullptr for a zero-size request; a zero-size malloc is a
            // freeable pointer, which is the safer of the two for a caller that does not check
            if (ptr.isNull() && bytes !== 0) throw Error(`msAlloc.allocate: out of memory (${bytes} bytes)`);
            return ptr;
        },
        () => procHacker.js(_AllocateKey, NativePointer, null, uint64_as_float_t),
    );
    export function deallocate(ptr: StaticPointer, bytes: number): void {
        if (bytes >= _Big_allocation_threshold) {
            ptr = ptr.getPointer(-8);
        }
        capi.free(ptr);
    }
}
