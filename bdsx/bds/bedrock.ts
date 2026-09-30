import { mangle } from "../mangle";
import { AbstractClass, nativeClass, NativeClass, NativeClassType, nativeField } from "../nativeclass";
import { bool_t, NativeType } from "../nativetype";
import { CxxSharedPtr } from "../sharedpointer";
import { Singleton } from "../singleton";

export namespace Bedrock {
    export type NonOwnerPointerType<T extends NativeClass> = NativeClassType<NonOwnerPointer<T>>;

    /**
     * What a NonOwnerPointer's shared_ptr holds: EnableNonOwnerReferences::ControlBlock, whose first byte says whether
     * the object is still alive.
     */
    @nativeClass()
    export class NonOwnerControlBlock extends NativeClass {
        @nativeField(bool_t)
        isValid: bool_t;
    }

    /**
     * Bedrock::NonOwnerPointer<T> as 1.26 lays it out: 24 bytes
     * { std::shared_ptr<EnableNonOwnerReferences::ControlBlock> (element +0, count block +8), T* +0x10 }
     * (Endstone's non_owner_pointer.h; Level::getStructureManager and ILevel's virtual +0xa48 copy exactly these three
     * words, docs/findings-nbt.md "NonOwnerPointer"). bdsx's 2024 shape was a 16-byte shared_ptr to a wrapper: a call
     * returning one through it wrote 8 bytes past bdsx's buffer and get() read the count block.
     */
    @nativeClass()
    export class NonOwnerPointer<T extends NativeClass> extends NativeClass {
        control: CxxSharedPtr<NonOwnerControlBlock>;
        pointer: T | null;

        [NativeType.ctor](): void {
            this.pointer = null; // the generated constructor empties the shared_ptr, not the raw T*
        }

        /** the object, or null when the pointer is empty or the object is gone (the control block's flag) */
        get(): T | null {
            const block = this.control.p;
            if (block === null || !block.isValid) return null;
            return this.pointer;
        }

        /** a copy: takes a use on value's count block and drops the one this held */
        assign(value: NonOwnerPointer<T>): void {
            this.control.assign(value.control);
            this.pointer = value.pointer;
        }

        /** drops this pointer's use and empties it */
        dispose(): void {
            this.control.dispose();
            this.pointer = null;
        }

        static make<T extends NativeClass>(v: new () => T): NonOwnerPointerType<T> {
            const clazz = v as NativeClassType<T>;
            return Singleton.newInstance(NonOwnerPointer, clazz, () => {
                class Class extends NonOwnerPointer<T> {}
                Class.define({
                    control: CxxSharedPtr.make(NonOwnerControlBlock),
                    pointer: clazz.ref(),
                } as any);
                Object.defineProperties(Class, {
                    name: { value: `NonOwnerPointer<${clazz.name}>` },
                    symbol: {
                        value: mangle.templateClass("NonOwnerPointer", clazz),
                    },
                });
                return Class;
            });
        }
    }

    /**
     * stub implement of Bedrock::Result<void, std::error_code>
     */
    @nativeClass(0x48, 8)
    export class VoidErrorCodeResult extends AbstractClass {
        /**
         * the value flag: 1.26's ReadOnlyBinaryStream::read writes `1` at +0x40 on success (its zeroed
         * error info is 0x40 bytes) and the error path leaves it 0 (docs/findings-inventory.md section 22)
         */
        isOk(): boolean {
            return this.getUint8(0x40) !== 0;
        }
    }
}
