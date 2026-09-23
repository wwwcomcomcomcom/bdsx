/**
 * The Explosion object (engine layer; docs/findings-slots.md "levelExplode").
 *
 * 1.26's TNT, creepers and the like reach Level::explode(Explosion&) (Level vftable slot 120), not the nine-argument
 * overload bdsx hooked, so levelExplode reads its fields from the Explosion. Offsets are the ones the nine-argument
 * Level::explode writes when it builds one on its stack (40 0x739e80, 51 0x7d2630, the same code): position +0, power
 * +0xc, fire +0x50, breaking +0x51, allowUnderwater +0x52, the source's ActorUniqueID +0x60, the BlockSource* +0x68, the
 * maximum resistance +0x70.
 */
import type { StaticPointer } from "../../core";
import { engineLayout } from "./deps";

export const EXPLOSION_POS = engineLayout("Explosion", "pos", 0);
export const EXPLOSION_POWER = engineLayout("Explosion", "power", 0xc);
export const EXPLOSION_FIRE = engineLayout("Explosion", "fire", 0x50);
export const EXPLOSION_BREAKING = engineLayout("Explosion", "breaking", 0x51);
export const EXPLOSION_ALLOW_UNDERWATER = engineLayout("Explosion", "allowUnderwater", 0x52);
export const EXPLOSION_SOURCE_ID = engineLayout("Explosion", "sourceId", 0x60);
export const EXPLOSION_REGION = engineLayout("Explosion", "region", 0x68);
export const EXPLOSION_MAX_RESISTANCE = engineLayout("Explosion", "maxResistance", 0x70);

export interface ExplosionFields {
    power: number;
    causesFire: boolean;
    breaksBlocks: boolean;
    maxResistance: number;
    allowUnderwater: boolean;
}

export function readExplosion(e: StaticPointer): ExplosionFields {
    return {
        power: e.getFloat32(EXPLOSION_POWER),
        causesFire: e.getBoolean(EXPLOSION_FIRE),
        breaksBlocks: e.getBoolean(EXPLOSION_BREAKING),
        maxResistance: e.getFloat32(EXPLOSION_MAX_RESISTANCE),
        allowUnderwater: e.getBoolean(EXPLOSION_ALLOW_UNDERWATER),
    };
}

export function writeExplosion(e: StaticPointer, f: ExplosionFields): void {
    e.setFloat32(f.power, EXPLOSION_POWER);
    e.setBoolean(f.causesFire, EXPLOSION_FIRE);
    e.setBoolean(f.breaksBlocks, EXPLOSION_BREAKING);
    e.setFloat32(f.maxResistance, EXPLOSION_MAX_RESISTANCE);
    e.setBoolean(f.allowUnderwater, EXPLOSION_ALLOW_UNDERWATER);
}
