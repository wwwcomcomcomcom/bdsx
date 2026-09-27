import { CxxVector } from "../cxxvector";
import { mce } from "../mce";
import { NativeClass, nativeClass, nativeField } from "../nativeclass";
import type { StaticPointer } from "../core";
import { bool_t, CxxString, float32_t, int16_t, int32_t, NativeType, uint16_t, uint32_t, uint8_t, void_t } from "../nativetype";
import { procHacker } from "../prochacker";
import { JsonValue } from "./connreq";
import { engineLayout } from "./engine/deps";
import { serializedSkinConstruct, serializedSkinDestruct, serializedSkinNotCopyable } from "./engine/serializedskin";
import { derived } from "./symbols";

export enum TrustedSkinFlag {
    Unset,
    False,
    True,
}

export enum PersonaAnimatedTextureType {
    None,
    Face,
    Body32x32,
    Body128x128,
}

export enum PersonaPieceType {
    Unknown,
    Skeleton,
    Body,
    Skin,
    Bottom,
    Feet,
    Dress,
    Top,
    HighPants,
    Hands,
    Outerwear,
    Back,
    FacialHair,
    Mouth,
    Eyes,
    Hair,
    FaceAccessory,
    Head,
    Legs,
    LeftLeg,
    RightLeg,
    Arms,
    LeftArm,
    RightArm,
    Capes,
    ClassicSkin,
}

@nativeClass(0x40)
export class AnimatedImageData extends NativeClass {
    @nativeField(uint32_t)
    type: PersonaAnimatedTextureType;
    /** persona::AnimationExpression (Linear 0, Blinking 1); in the padding 2024 left after `type` */
    @nativeField(uint32_t)
    animationExpression: uint32_t;
    @nativeField(mce.Image)
    image: mce.Image;
    @nativeField(float32_t)
    frames: float32_t;
}

@nativeClass()
export class SerializedPersonaPieceHandle extends NativeClass {
    @nativeField(CxxString)
    pieceId: CxxString;
    @nativeField(uint32_t)
    pieceType: uint32_t;
    @nativeField(mce.UUID, 0x28)
    packId: mce.UUID;
    @nativeField(bool_t)
    isDefaultPiece: bool_t;
    @nativeField(CxxString, 0x40)
    productId: CxxString;
}

/**
 * persona::ArmSize::Type
 */
enum ArmSizeType {
    Slim = 0,
    Wide = 1,
}

/**
 * 1.26's MinEngineVersion, which replaced 2024's SemVersion member: a 24-byte SemVersion (major, minor, patch, then
 * the pre-release and build-meta strings as Bedrock::StaticOptimizedString, which bdsx does not read), the
 * CurrentCmdVersion and the MolangVersion. SerializedSkinImpl() stores the build's latest command version
 * (50 on 1.26.40.8, 52 on 1.26.51.1) and molang -1.
 */
@nativeClass(0x20)
export class MinEngineVersion extends NativeClass {
    @nativeField(uint16_t)
    major: uint16_t;
    @nativeField(uint16_t)
    minor: uint16_t;
    @nativeField(uint16_t)
    patch: uint16_t;
    @nativeField(int32_t, 0x18)
    commandVersion: int32_t;
    @nativeField(int16_t, 0x1c)
    molangVersion: int16_t;
}

/**
 * The skin itself: 1.26's SerializedSkinImpl, the object a SerializedSkinRef (std::shared_ptr) points at --
 * Player.getSkin(), PlayerListEntry.skin and PlayerSkinPacket.skin all follow that pointer. Its members are 2024's
 * SerializedSkin members in 2024's order, but the version member shrank from 0x70 to 0x20 (MinEngineVersion) and
 * everything after it moved; two members are new. The offsets are this build's (symbols.json layouts.SerializedSkin,
 * docs/findings-layouts.md "SerializedSkin"); the fallbacks are 2024's.
 */
@nativeClass(engineLayout("SerializedSkin", "size", 0x260))
export class SerializedSkin extends NativeClass {
    /** @deprecated Use {@link id} instead */
    @nativeField(CxxString, { ghost: true })
    skinId: CxxString;
    @nativeField(CxxString)
    id: CxxString;
    @nativeField(CxxString)
    playFabId: CxxString;
    @nativeField(CxxString)
    fullId: CxxString;
    @nativeField(CxxString)
    resourcePatch: CxxString;
    @nativeField(CxxString)
    defaultGeometryName: CxxString;
    @nativeField(mce.Image)
    skinImage: mce.Image;
    @nativeField(mce.Image)
    capeImage: mce.Image;
    @nativeField(CxxVector.make(AnimatedImageData))
    skinAnimatedImages: CxxVector<AnimatedImageData>;
    @nativeField(JsonValue)
    geometryData: JsonValue;
    /** 2024 held a SemVersion here; 1.26 a MinEngineVersion */
    @nativeField(MinEngineVersion, engineLayout("SerializedSkin", "geometryDataEngineVersion", 0x128))
    geometryDataEngineVersion: MinEngineVersion;
    @nativeField(JsonValue, engineLayout("SerializedSkin", "geometryDataMutable", 0x198))
    geometryDataMutable: JsonValue;
    @nativeField(CxxString, engineLayout("SerializedSkin", "animationData", 0x1a8))
    animationData: CxxString;
    @nativeField(CxxString, engineLayout("SerializedSkin", "capeId", 0x1c8))
    capeId: CxxString;
    @nativeField(CxxVector.make(SerializedPersonaPieceHandle), engineLayout("SerializedSkin", "personaPieces", 0x1e8))
    personaPieces: CxxVector<SerializedPersonaPieceHandle>;
    /** persona::ArmSize::Type, a uint8_t enum */
    @nativeField(uint8_t, engineLayout("SerializedSkin", "armSizeType", 0x200))
    armSizeType: uint8_t;
    /**
     * analyzed from static persona::ArmSize::getTypeFromString
     * SerializedSkin::SerializedSkin calls it.
     */
    get armSize(): string {
        return this.armSizeType === ArmSizeType.Slim ? "slim" : "wide";
    }
    // pieceTintColors: std::unordered_map<persona::PieceType, TintMapColor> at layouts.SerializedSkin.pieceTintColors
    @nativeField(mce.Color, engineLayout("SerializedSkin", "skinColor", 0x248))
    skinColor: mce.Color;
    @nativeField(uint8_t, engineLayout("SerializedSkin", "isTrustedSkin", 0x258))
    isTrustedSkin: TrustedSkinFlag;
    @nativeField(bool_t, engineLayout("SerializedSkin", "isPremium", 0x259))
    isPremium: bool_t;
    @nativeField(bool_t, engineLayout("SerializedSkin", "isPersona", 0x25a))
    isPersona: bool_t;
    /** @deprecated Use {@link isPersonaCapeOnClassicSkin} instead */
    @nativeField(bool_t, { ghost: true, offset: engineLayout("SerializedSkin", "isPersonaCapeOnClassicSkin", 0x25b) })
    isCapeOnClassicSkin: bool_t;
    @nativeField(bool_t, engineLayout("SerializedSkin", "isPersonaCapeOnClassicSkin", 0x25b))
    isPersonaCapeOnClassicSkin: bool_t;
    @nativeField(bool_t, engineLayout("SerializedSkin", "isPrimaryUser", 0x25c))
    isPrimaryUser: bool_t;
    /** the login's "OverrideSkin" */
    @nativeField(bool_t, engineLayout("SerializedSkin", "overridesPlayerAppearance", 0x25d))
    overridesPlayerAppearance: bool_t;
    /** the login's "ProfileHash"; new in 1.26, so a table without the layout has none */
    get profileHash(): string {
        const off = engineLayout("SerializedSkin", "profileHash", -1);
        if (off < 0) throw Error("SerializedSkin.profileHash: this build's symbols.json has no layouts.SerializedSkin.profileHash");
        return (this as unknown as StaticPointer).getCxxString(off);
    }
}

// 1.26 keeps SerializedSkinImpl's default constructor out of line and inlines its destructor into the make_shared
// control block's _Destroy; it has no copy or move constructor at all (engine/serializedskin.ts).
SerializedSkin.prototype[NativeType.ctor] = derived(
    "??0SerializedSkin@@QEAA@XZ",
    function (this: SerializedSkin): void {
        serializedSkinConstruct(this as unknown as StaticPointer);
    },
    () => procHacker.js("??0SerializedSkin@@QEAA@XZ", void_t, { this: SerializedSkin }),
);
SerializedSkin.prototype[NativeType.dtor] = derived(
    "??1SerializedSkin@@QEAA@XZ",
    function (this: SerializedSkin): void {
        serializedSkinDestruct(this as unknown as StaticPointer);
    },
    () => procHacker.js("??1SerializedSkin@@QEAA@XZ", void_t, { this: SerializedSkin }),
);
SerializedSkin.prototype[NativeType.ctor_copy] = serializedSkinNotCopyable;
SerializedSkin.prototype[NativeType.ctor_move] = serializedSkinNotCopyable;
