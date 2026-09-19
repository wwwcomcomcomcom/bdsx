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
});

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
