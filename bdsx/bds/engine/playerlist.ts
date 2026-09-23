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

// ---- PlayerListPacket's records (docs/findings-containers.md section 14) ----
// 1.26's packet no longer holds PlayerListEntry: its vector (layouts.PlayerListPacket.entries) holds 184-byte
// std::variant elements, index byte at +176 -- alternative 0 a removal {action 1 at +0, uuid +8}, alternative 1 an
// addition laid out as layouts.PlayerListPacketAddEntry -- and 2024's per-packet `action` byte became a constant.
const PACKET_ENTRIES = engineLayout("PlayerListPacket", "entries", 48);
const ELEMENT_SIZE = engineLayout("PlayerListPacket", "elementSize", 184);
const ELEMENT_INDEX = engineLayout("PlayerListPacket", "elementIndex", 176);
const ADD_UUID = engineLayout("PlayerListPacketAddEntry", "uuid", 8);
const ADD_ID = engineLayout("PlayerListPacketAddEntry", "id", 24);
const ADD_NAME = engineLayout("PlayerListPacketAddEntry", "name", 32);
const ADD_XUID = engineLayout("PlayerListPacketAddEntry", "xuid", 64);
const ADD_PLATFORM_ONLINE_ID = engineLayout("PlayerListPacketAddEntry", "platformOnlineId", 96);
const ADD_BUILD_PLATFORM = engineLayout("PlayerListPacketAddEntry", "buildPlatform", 128);
const ADD_IS_TEACHER = engineLayout("PlayerListPacketAddEntry", "isTeacher", 152);
const ADD_IS_HOST = engineLayout("PlayerListPacketAddEntry", "isHost", 153);
const ADD_IS_SUB_CLIENT = engineLayout("PlayerListPacketAddEntry", "isSubClient", 154);
const ADD_COLOR = engineLayout("PlayerListPacketAddEntry", "color", 156);

export interface PlayerListRecord {
    action: "add" | "remove";
    /** mce::UUID in bdsx's binary form (mce.UUID.toString prints it) */
    uuid: string;
    id?: string;
    name?: string;
    xuid?: string;
    platformOnlineId?: string;
    buildPlatform?: number;
    isTeacher?: boolean;
    isHost?: boolean;
    isSubClient?: boolean;
    color?: number;
}

export function readPlayerListRecords(packet: StaticPointer): PlayerListRecord[] {
    const begin = packet.getPointer(PACKET_ENTRIES);
    const end = packet.getPointer(PACKET_ENTRIES + 8);
    const bytes = end.subptr(begin);
    const out: PlayerListRecord[] = [];
    for (let off = 0; off + ELEMENT_SIZE <= bytes; off += ELEMENT_SIZE) {
        const e = begin.add(off);
        const index = e.getInt8(ELEMENT_INDEX);
        if (index === 0) {
            out.push({ action: "remove", uuid: e.getBin(8, ADD_UUID) });
        } else if (index === 1) {
            out.push({
                action: "add",
                uuid: e.getBin(8, ADD_UUID),
                id: e.getBin64(ADD_ID),
                name: e.getCxxString(ADD_NAME),
                xuid: e.getCxxString(ADD_XUID),
                platformOnlineId: e.getCxxString(ADD_PLATFORM_ONLINE_ID),
                buildPlatform: e.getInt32(ADD_BUILD_PLATFORM),
                isTeacher: e.getBoolean(ADD_IS_TEACHER),
                isHost: e.getBoolean(ADD_IS_HOST),
                isSubClient: e.getBoolean(ADD_IS_SUB_CLIENT),
                color: e.getInt32(ADD_COLOR),
            });
        }
    }
    return out;
}
