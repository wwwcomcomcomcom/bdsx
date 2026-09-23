/**
 * PlayerListEntry construction (engine layer; docs/findings-containers.md section 14, "the two constructors").
 *
 * 1.26 keeps neither PlayerListEntry's default constructor nor its UUID one: every entry the engine makes comes from
 * the Player constructor or is assembled member by member. 2024's UUID constructor (0x1862ff0) writes id -1, the uuid,
 * three empty strings, platform -1, a default skin and three false bools; in 1.26's 168-byte entry the skin is a
 * shared_ptr (null here) and the colour at +144 is new (zero here). The destructor bdsx binds (the 1.26 address) frees
 * exactly what this leaves: SSO strings and a null control block.
 */
import type { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const SIZE = engineLayout("PlayerListEntry", "size", 0x2e8);
const ID = engineLayout("PlayerListEntry", "id", 0);
const UUID = engineLayout("PlayerListEntry", "uuid", 8);
const NAME = engineLayout("PlayerListEntry", "name", 24);
const XUID = engineLayout("PlayerListEntry", "xuid", 56);
const PLATFORM_ONLINE_ID = engineLayout("PlayerListEntry", "platformOnlineId", 88);
const BUILD_PLATFORM = engineLayout("PlayerListEntry", "buildPlatform", 120);

/** PlayerListEntry(mce::UUID) -- or the default constructor, when `uuid` is null (a zero uuid) */
export function constructPlayerListEntry(self: StaticPointer, uuid: StaticPointer | null): void {
    self.fill(0, SIZE);
    self.setInt32(-1, ID);
    self.setInt32(-1, ID + 4);
    if (uuid !== null) {
        for (let i = 0; i < 16; i += 4) self.setInt32(uuid.getInt32(i), UUID + i);
    }
    for (const off of [NAME, XUID, PLATFORM_ONLINE_ID]) self.setInt32(15, off + 24); // empty SSO string: size 0, capacity 15
    self.setInt32(-1, BUILD_PLATFORM);
}
