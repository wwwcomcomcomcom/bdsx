import { Register } from "../assembler";
import { Actor } from "../bds/actor";
import { BlockSource } from "../bds/block";
import { Vec3 } from "../bds/blockpos";
import { Level } from "../bds/level";
import { proc } from "../bds/symbols";
import { CANCEL } from "../common";
import { StaticPointer } from "../core";
import { decay } from "../decay";
import { events } from "../event";
import { _firstTickHook, bedrockServer } from "../launcher";
import { makefunc } from "../makefunc";
import { bool_t, float32_t, int32_t, void_t } from "../nativetype";
import { procHacker } from "../prochacker";
import { _tickCallback } from "../util";
import { EXPLOSION_POS, EXPLOSION_REGION, EXPLOSION_SOURCE_ID, readExplosion, writeExplosion } from "../bds/engine/explosion";

export class LevelExplodeEvent {
    constructor(
        public level: Level,
        public blockSource: BlockSource,
        public entity: Actor,
        public position: Vec3,
        /** The radius of the explosion in blocks and the amount of damage the explosion deals. */
        public power: number,
        /** If true, blocks in the explosion radius will be set on fire. */
        public causesFire: boolean,
        /** If true, the explosion will destroy blocks in the explosion radius. */
        public breaksBlocks: boolean,
        /** A blocks explosion resistance will be capped at this value when an explosion occurs. */
        public maxResistance: number,
        public allowUnderwater: boolean,
    ) {}
}

export class LevelSaveEvent {
    constructor(public level: Level) {}
}

export class LevelTickEvent {
    constructor(public level: Level) {}
}

export class LevelWeatherChangeEvent {
    constructor(public level: Level, public rainLevel: number, public rainTime: number, public lightningLevel: number, public lightningTime: number) {}
}

events.levelExplode.setInstaller(() => {
    function onLevelExplode(
        level: Level,
        blockSource: BlockSource,
        entity: Actor,
        position: Vec3,
        power: float32_t,
        causesFire: bool_t,
        breaksBlocks: bool_t,
        maxResistance: float32_t,
        allowUnderwater: bool_t,
    ): bool_t {
        const event = new LevelExplodeEvent(level, blockSource, entity, position, power, causesFire, breaksBlocks, maxResistance, allowUnderwater);
        const canceled = events.levelExplode.fire(event) === CANCEL;
        decay(level);
        decay(blockSource);
        if (!canceled) {
            return _onLevelExplode(
                event.level,
                event.blockSource,
                event.entity,
                event.position,
                event.power,
                event.causesFire,
                event.breaksBlocks,
                event.maxResistance,
                event.allowUnderwater,
            );
        }
        return false;
    }
    const _onLevelExplode = procHacker.hooking(
        "?explode@Level@@UEAA_NAEAVBlockSource@@PEAVActor@@AEBVVec3@@M_N3M3@Z",
        bool_t,
        null,
        Level,
        BlockSource,
        Actor,
        Vec3,
        float32_t,
        bool_t,
        bool_t,
        float32_t,
        bool_t,
    )(onLevelExplode);

    // 1.26's TNT, creepers and the like go through Level::explode(Explosion&) instead; the event is built from the
    // Explosion's fields and what the listener changes is written back before the explosion runs (engine/explosion.ts)
    if (!("?explode@Level@@UEAA_NAEAVExplosion@@@Z" in proc)) return;
    const _onLevelExplodeObject = procHacker.hooking("?explode@Level@@UEAA_NAEAVExplosion@@@Z", bool_t, null, Level, StaticPointer)(
        (level: Level, explosion: StaticPointer): boolean => {
            const f = readExplosion(explosion);
            const region = explosion.getNullablePointerAs(BlockSource, EXPLOSION_REGION);
            const sourceId = explosion.getBin64(EXPLOSION_SOURCE_ID);
            const source = sourceId === INVALID_ACTOR_UNIQUE_ID ? null : level.fetchEntity(sourceId as any, false);
            const position = Vec3.create(explosion.getFloat32(EXPLOSION_POS), explosion.getFloat32(EXPLOSION_POS + 4), explosion.getFloat32(EXPLOSION_POS + 8));
            const event = new LevelExplodeEvent(level, region!, source!, position, f.power, f.causesFire, f.breaksBlocks, f.maxResistance, f.allowUnderwater);
            if (events.levelExplode.fire(event) === CANCEL) return false;
            writeExplosion(explosion, event);
            explosion.setFloat32(event.position.x, EXPLOSION_POS);
            explosion.setFloat32(event.position.y, EXPLOSION_POS + 4);
            explosion.setFloat32(event.position.z, EXPLOSION_POS + 8);
            return _onLevelExplodeObject(level, explosion);
        },
    );
});
// ActorUniqueID -1: the source an Explosion carries when nothing caused it
const INVALID_ACTOR_UNIQUE_ID = "\uffff\uffff\uffff\uffff";

events.levelSave.setInstaller(() => {
    function onLevelSave(level: Level): void {
        const event = new LevelSaveEvent(level);
        const canceled = events.levelSave.fire(event) === CANCEL;
        decay(level);
        if (!canceled) {
            return _onLevelSave(event.level);
        }
    }
    const _onLevelSave = procHacker.hooking("?save@Level@@UEAAXXZ", void_t, null, Level)(onLevelSave);
});

function onLevelTick(level: Level): void {
    _firstTickHook(level); // serverOpen fallback when the startup symbol is missing (launcher.ts)
    const event = new LevelTickEvent(bedrockServer.level);
    events.levelTick.fire(event);
    _tickCallback();
}
procHacker.hookingRawWithCallOriginal("?tick@Level@@UEAAXXZ", makefunc.np(onLevelTick, void_t, null, Level), [Register.rcx], []);

events.levelWeatherChange.setInstaller(() => {
    function onLevelWeatherChange(level: Level, rainLevel: float32_t, rainTime: int32_t, lightningLevel: float32_t, lightningTime: int32_t): void {
        const event = new LevelWeatherChangeEvent(level, rainLevel, rainTime, lightningLevel, lightningTime);
        const canceled = events.levelWeatherChange.fire(event) === CANCEL;
        decay(level);
        if (!canceled) {
            return _onLevelWeatherChange(event.level, event.rainLevel, event.rainTime, event.lightningLevel, event.lightningTime);
        }
    }
    // 1.26: Level::updateWeather is a 12-byte forwarder to WeatherManager::updateWeather and cannot
    // take a hook, so the table ships the manager's function instead (it is what Endstone hooks
    // for the same event). Its receiver is the manager; the event still carries the level.
    if (!("?updateWeather@Level@@UEAAXMHMH@Z" in proc) && "?updateWeather@WeatherManager@@QEAAXMHMH@Z" in proc) {
        const original = procHacker.hooking(
            "?updateWeather@WeatherManager@@QEAAXMHMH@Z",
            void_t,
            null,
            StaticPointer,
            float32_t,
            int32_t,
            float32_t,
            int32_t,
        )((manager, rainLevel, rainTime, lightningLevel, lightningTime) => {
            // the level is the server's own long-lived object here, not a wrapper made for this call: never decayed
            const event = new LevelWeatherChangeEvent(bedrockServer.level, rainLevel, rainTime, lightningLevel, lightningTime);
            const canceled = events.levelWeatherChange.fire(event) === CANCEL;
            if (!canceled) return original(manager, event.rainLevel, event.rainTime, event.lightningLevel, event.lightningTime);
        });
        return;
    }
    const _onLevelWeatherChange = procHacker.hooking(
        "?updateWeather@Level@@UEAAXMHMH@Z",
        void_t,
        null,
        Level,
        float32_t,
        int32_t,
        float32_t,
        int32_t,
    )(onLevelWeatherChange);
});
