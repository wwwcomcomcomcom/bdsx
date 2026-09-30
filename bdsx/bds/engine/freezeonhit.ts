/**
 * FreezeOnHitSubcomponent::readfromJSON on 1.26.51 (engine layer; docs/findings-nbt.md section 22).
 *
 * 40 keeps 2024's virtual (slot 1, 0x1aedb80): `size` = json["size"] as a float (default 1.0), `snap_to_block` = the
 * member as a bool (default false), `shape` = the member's string, 1 when it is "sphere". Written to the 0x18-byte
 * object's +0xc (float), +0x10 (byte) and +0x8 (byte). 51's slot 1 is no longer a reader (it copies those three from a
 * SharedTypes::v1_26_50::FreezeOnHitSubcomponentDefinition), so bdsx does the same reading over the parsed value.
 */
import type { StaticPointer } from "../../core";
import type { JsonValue } from "../connreq";

export function freezeOnHitReadJson(self: StaticPointer, json: JsonValue): void {
    const v = json.value();
    const obj = v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    self.setFloat32(typeof obj.size === "number" ? obj.size : 1, 0xc);
    self.setUint8(obj.snap_to_block === true ? 1 : 0, 0x10);
    self.setUint8(obj.shape === "sphere" ? 1 : 0, 0x8);
}
