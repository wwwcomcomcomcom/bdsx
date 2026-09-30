/**
 * Small reads over the 1.26 world objects (docs/findings-inventory.md section 19): the gameplay user manager's vector
 * and a player's input mode.
 *
 * GameplayUserManager: 2024's `getActiveGameplayUsers` (0xb72f0) is `mov rax,rcx; ret` -- the vector<WeakEntityRef> is the first
 * member -- and `Level::getActiveUsers` (0xc964a0) is `_getGameplayUserManager()` followed by a jump to it. 1.26's
 * `Level::getActiveUsers` (40 0x73f3d0, 51 0x7d72c0, identical) is `mov 0x458(%rcx),%rax; add $8,%rax`: the manager is a
 * pointer at Level+0x458 and the vector sits at +8, behind the vtable Endstone's gameplay_user_manager.h gives it.
 *
 * PlayerMovement::getInputMode: 2024 (0x186b220) looks `struct PlayerInputModeComponent` (hash 0xf87b6d93; 1.26 spells it
 * `PlayerInputModeComponent`, 0xbd68c2e2) up in the EntityContext's registry and returns the int at the start of the 8-byte
 * element, 0 when the entity has none. 1.26 has no out-of-line copy, but a function that does read it (40 0x1f357e0) compares the
 * first int of the same 8-byte element with 2 (touch).
 */
import { StaticPointer } from "../../core";
import { componentHash, engineLayout } from "./deps";
import { enttComponentIn } from "./entt";
import { entityContextEntt, entityContextId } from "./entitycontext";

const LEVEL_GAMEPLAY_USER_MANAGER = engineLayout("Level", "gameplayUserManager", 0x458);
const GAMEPLAY_USER_MANAGER_USERS = engineLayout("GameplayUserManager", "activeUsers", 8);
const PLAYER_INPUT_MODE_HASH = componentHash("PlayerInputModeComponent");
const PLAYER_INPUT_MODE_SIZE = engineLayout("PlayerInputModeComponent", "size", 8);

/** the GameplayUserManager a Level holds */
export function levelGameplayUserManager(level: StaticPointer): StaticPointer {
    return level.getPointer(LEVEL_GAMEPLAY_USER_MANAGER);
}

/** `GameplayUserManager::getActiveGameplayUsers`: the `vector<WeakEntityRef>` inside the manager */
export function gameplayUserManagerUsers(manager: StaticPointer): StaticPointer {
    return manager.add(GAMEPLAY_USER_MANAGER_USERS);
}

/** `PlayerMovement::getInputMode`: the mode a player's PlayerInputModeComponent holds, 0 for an entity that has none */
export function playerInputMode(context: StaticPointer): number {
    const component = enttComponentIn(entityContextEntt(context), entityContextId(context), PLAYER_INPUT_MODE_HASH, PLAYER_INPUT_MODE_SIZE);
    return component === null ? 0 : component.getInt32(0);
}
