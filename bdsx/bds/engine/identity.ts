/**
 * The login identity (engine layer; docs/findings-packets.md "Certificate").
 *
 * 2024's ConnectionRequest held a Certificate (the client's identity chain) and ExtendedCertificate read XUID,
 * displayName and identity out of its extraData. 1.26's BaseConnectionRequest (Endstone base_connection_request.h) keeps
 * the client-data WebToken and a RawGameServerToken instead: the latter is a JWT whose payload carries the same three
 * facts as `xid`, `xname` and `identity` (read off live logins on both builds, loginprobe), at
 * layouts.ConnectionRequest.gameServerToken (+0x90 on both builds; the authentication type follows at +0xb0).
 */
import type { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const CONNREQ_GAME_SERVER_TOKEN = engineLayout("ConnectionRequest", "gameServerToken", 0x90);
const CONNREQ_AUTHENTICATION_TYPE = engineLayout("ConnectionRequest", "authenticationType", 0xb0);

// the client-data WebToken is a std::optional<WebToken> at +0x8: WebToken is 0x80 bytes on Windows (header string,
// header Json::Value, data string, data Json::Value at +0x50, signature string), so the parsed payload (DeviceId,
// DeviceOS, skin, ...) is the Json::Value at +0x58 and the optional's engaged flag the byte at +0x88. -1: no such field
// (a 2024 table, whose ConnectionRequest held a Certificate instead). docs/findings-examples.md
const CONNREQ_CLIENT_DATA_JSON = engineLayout("ConnectionRequest", "clientDataJson", -1);
const CONNREQ_CLIENT_DATA_ENGAGED = engineLayout("ConnectionRequest", "clientDataEngaged", -1);

/**
 * the offset of the client data's parsed payload (a Json::Value) in the request, null when the request carries no
 * client data token, or undefined when this build's table does not describe one (2024: ConnectionRequest.something)
 */
export function clientDataJsonOffset(request: StaticPointer): number | null | undefined {
    if (CONNREQ_CLIENT_DATA_JSON < 0 || CONNREQ_CLIENT_DATA_ENGAGED < 0) return undefined;
    return request.getUint8(CONNREQ_CLIENT_DATA_ENGAGED) === 0 ? null : CONNREQ_CLIENT_DATA_JSON;
}

/** PlayerAuthenticationType: 0 Full, 1 Guest, 2 SelfSigned (Endstone player_authentication_info.h) */
export function authenticationType(request: StaticPointer): number {
    return request.getInt32(CONNREQ_AUTHENTICATION_TYPE);
}

export interface IdentityClaims {
    xid: string;
    xname: string;
    identity: string;
}

/** the payload claims of the request's game server token, or null when it holds none */
export function identityClaims(request: StaticPointer): IdentityClaims | null {
    const token = request.getCxxString(CONNREQ_GAME_SERVER_TOKEN);
    const seg = token.split(".");
    if (seg.length !== 3) return null;
    try {
        const payload = JSON.parse(Buffer.from(seg[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
        return { xid: String(payload.xid ?? ""), xname: String(payload.xname ?? ""), identity: String(payload.identity ?? "") };
    } catch {
        return null;
    }
}

/**
 * "e934ccd0-2624-82b4-..." into mce::UUID's memory form: each 64-bit half little-endian at +0 and +8, as bdsx's
 * mce.UUID (eight 16-bit words, lowest first) holds it -- the form the engine's own uuids have (PlayerListEntry.uuid)
 */
export function uuidFromString(text: string): string {
    const hex = text.replace(/-/g, "");
    if (!/^[0-9a-fA-F]{32}$/.test(hex)) return "\0\0\0\0\0\0\0\0";
    // each half is a big-endian 64-bit number; its 16-bit words go lowest first
    const words: number[] = [];
    for (const half of [hex.slice(0, 16), hex.slice(16)]) {
        for (let i = 3; i >= 0; i--) words.push(parseInt(half.slice(i * 4, i * 4 + 4), 16));
    }
    return String.fromCharCode(...words);
}
