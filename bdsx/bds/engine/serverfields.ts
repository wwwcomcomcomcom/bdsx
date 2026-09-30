/**
 * Field reads of the server objects whose getters 1.26 no longer has (docs/findings-inventory.md section 18).
 *
 * - `MinecraftCommands::getRegistry`: 2024 0x4998d0 `mov 0x10(%rcx),%rax`. Endstone's MinecraftCommands is { vftable,
 *   context_provider_ +8, registry_ +0x10, output_sender_ +0x18 }, and +0x18 is the member launcher.ts already reads on 1.26.
 * - `ChunkSource::getLevel`: 2024 0x6e2940 `mov 0x20(%rcx),%rax`. Endstone: EnableNonOwnerReferences base (0x18 bytes),
 *   chunk_side_ +0x18, level_ +0x20.
 * - `Minecraft::getLevel`: 2024 0x17f8550 walked game_session_ (+0xc0): the session's level_entity_ storage must hold a value (the
 *   flag at session +0x10 +0x18), then level_ (a Bedrock::NonOwnerPointer<Level>, session +0x30) holds the Level.
 *   1.26's NonOwnerPointer is 24 bytes { control +0, count block +8, object +16 } (findings-nbt.md section 17), so the Level is at
 *   session +0x40: read off the live session on both builds, where exactly that word was the Level (2024's 16-byte pointer was
 *   followed through one more load).
 *   game_session_ is the member after commands_, so its offset is `Minecraft.commands + 8`.
 * - `ServerPlayer::_nextContainerCounter`: 2024 0xcc08d0 increments a byte at +0x1e40 and wraps 100 -> 1, returning it. 1.26
 *   inlines exactly that (40 0x6931c0 / 51 0x756800, ServerPlayer::openInventory: `movzbl 0xd98; incb; cmpb $0x64; cmovl 1`).
 */
import { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

const COMMANDS_REGISTRY = engineLayout("MinecraftCommands", "registry", 0x10);
const CHUNK_SOURCE_LEVEL = engineLayout("ChunkSource", "level", 0x20);
const MINECRAFT_GAME_SESSION = engineLayout("Minecraft", "gameSession", 0xc0);
const SESSION_LEVEL_ENTITY_ENGAGED = engineLayout("GameSession", "levelEntityEngaged", 0x28);
const SESSION_LEVEL = engineLayout("GameSession", "level", 0x30);
const SESSION_LEVEL_OBJECT = engineLayout("GameSession", "levelObject", 16);
const SERVER_PLAYER_CONTAINER_COUNTER = engineLayout("ServerPlayer", "containerCounter", 0x1e40);
const CONTAINER_COUNTER_WRAP = 100;

export function minecraftCommandsRegistry(commands: StaticPointer): StaticPointer {
    return commands.getPointer(COMMANDS_REGISTRY);
}

export function chunkSourceLevel(source: StaticPointer): StaticPointer {
    return source.getPointer(CHUNK_SOURCE_LEVEL);
}

/** the Level of the running game session, or null when there is no session or no level yet */
export function minecraftLevel(minecraft: StaticPointer): StaticPointer | null {
    const session = minecraft.getNullablePointer(MINECRAFT_GAME_SESSION);
    if (session === null) return null;
    if (session.getUint8(SESSION_LEVEL_ENTITY_ENGAGED) === 0) return null;
    return session.getNullablePointer(SESSION_LEVEL + SESSION_LEVEL_OBJECT);
}

/** 2024 `_nextContainerCounter`: the byte after one more, 100 wrapping to 1 */
export function serverPlayerNextContainerCounter(player: StaticPointer): number {
    let next = (player.getUint8(SERVER_PLAYER_CONTAINER_COUNTER) + 1) & 0xff;
    if (next >= CONTAINER_COUNTER_WRAP) next = 1;
    player.setUint8(next, SERVER_PLAYER_CONTAINER_COUNTER);
    return next;
}
