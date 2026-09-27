import { abstract } from "../common";
import { VoidPointer } from "../core";
import { makefunc } from "../makefunc";
import { AbstractClass, nativeClass, NativeClass, nativeField, NativeStruct } from "../nativeclass";
import { bin64_t, bool_t, int32_t, uint16_t, void_t } from "../nativetype";
import { procHacker } from "../prochacker";

const portDelineator = "|".charCodeAt(0);

export namespace RakNet {
    @nativeClass(0x88)
    export class SystemAddress extends AbstractClass {
        @nativeField(uint16_t, 0x80)
        debugPort: uint16_t;
        @nativeField(uint16_t, 0x82)
        systemIndex: uint16_t;

        // void SystemAddress::ToString(bool writePort, char *dest, char portDelineator) const
        ToString(writePort: boolean, dest: Uint8Array, portDelineator: number): void {
            abstract();
        }

        toString(): string {
            const dest = Buffer.alloc(128);
            this.ToString(true, dest, portDelineator);
            const len = dest.indexOf(0);
            if (len === -1) throw Error("SystemAddress.ToString failed, null character not found");
            return dest.subarray(0, len).toString();
        }
    }

    @nativeClass()
    export class RakNetGUID extends NativeStruct {
        @nativeField(bin64_t)
        g: bin64_t;
        @nativeField(uint16_t)
        systemIndex: uint16_t;

        equals(other: VoidPointer | null): boolean {
            if (other instanceof RakNetGUID) {
                return this.g === other.g;
            }
            return false;
        }
    }

    @nativeClass()
    export class RakPeer extends AbstractClass {
        @nativeField(VoidPointer)
        vftable: VoidPointer;

        /**
         * The address of the connection whose GUID is given (UNASSIGNED_SYSTEM_ADDRESS when none has it).
         * 1.26 has no GetSystemAddressFromIndex: the slot is gone from RakPeer's table, between
         * GetIndexFromSystemAddress and GetGUIDFromIndex (docs/findings-packets.md "IP and ping").
         */
        GetSystemAddressFromGuid(guid: RakNetGUID): SystemAddress {
            abstract();
        }
        GetAveragePing(address: RakNet.AddressOrGUID): number {
            abstract();
        }
        GetLastPing(address: RakNet.AddressOrGUID): number {
            abstract();
        }
        GetLowestPing(address: RakNet.AddressOrGUID): number {
            abstract();
        }
    }

    export const UNASSIGNED_RAKNET_GUID = new RakNetGUID(true);
    UNASSIGNED_RAKNET_GUID.g = bin64_t.minus_one;
    UNASSIGNED_RAKNET_GUID.systemIndex = -1;

    @nativeClass()
    export class AddressOrGUID extends NativeClass {
        @nativeField(RakNetGUID)
        rakNetGuid: RakNetGUID;
        @nativeField(SystemAddress)
        systemAddress: SystemAddress;

        GetSystemIndex(): uint16_t {
            const rakNetGuid = this.rakNetGuid;
            if (rakNetGuid.g !== UNASSIGNED_RAKNET_GUID.g) {
                return rakNetGuid.systemIndex;
            } else {
                return this.systemAddress.systemIndex;
            }
        }
    }

    SystemAddress.prototype.ToString = procHacker.js(
        "?ToString@SystemAddress@RakNet@@QEBAX_NPEADD@Z",
        void_t,
        { this: RakNet.SystemAddress },
        bool_t,
        makefunc.Buffer,
        int32_t,
    );
    // SystemAddress GetSystemAddressFromGuid(const RakNetGUID input) const: rcx this, rdx the returned
    // SystemAddress (0x88), r8 a pointer to the caller's copy of the GUID (g at +0, systemIndex hint at +8).
    RakPeer.prototype.GetSystemAddressFromGuid = procHacker.jsv(
        "??_7RakPeer@RakNet@@6BRakPeerInterface@1@@",
        "?GetSystemAddressFromGuid@RakPeer@RakNet@@UEBA?AUSystemAddress@2@URakNetGUID@2@@Z",
        RakNet.SystemAddress,
        { this: RakNet.RakPeer, structureReturn: true },
        RakNet.RakNetGUID,
    );
}
