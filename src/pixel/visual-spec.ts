import type {
  AuraStyle,
  BodyArchetype,
  EyeStyle,
  Handedness,
  HornStyle,
  MouthStyle,
  PatternStyle,
  PoseOffset,
  SilhouetteStyle,
  VisualGenome,
  WeaponStyle,
} from "./genome.js";
import { hashStringToUint32 } from "./seed.js";

export const VISUAL_SPEC_VERSION = "visual-spec-v1" as const;
export const BASELINE_DESIGN_MODEL_VERSION = "deterministic-baseline-v1" as const;

export const VISUAL_BODY_PLANS = [
  "sprinter",
  "bulwark",
  "mystic",
  "prowler",
  "colossus",
  "trickster",
] as const;
export type VisualBodyPlan = (typeof VISUAL_BODY_PLANS)[number];

export const VISUAL_MOTIF_PARTS = [
  "crest",
  "antenna",
  "mantle",
  "fins",
  "claws",
  "tailSpike",
  "orb",
  "pack",
  "scarf",
] as const;
export type VisualMotifPart = (typeof VISUAL_MOTIF_PARTS)[number];

export interface VisualDesignBrief {
  creatureCore: string;
  combatRole: string;
  temperament: string;
  signatureFeature: string;
}

export interface VisualPaletteBias {
  baseHueShift: number; // -45 .. 45
  baseSatShift: number; // -24 .. 24
  accentHueShift: number; // -90 .. 90
  accentSatShift: number; // -28 .. 28
  accentLightShift: number; // -16 .. 16
  contrastBoost: number; // 0 .. 24
}

export interface VisualComposition {
  headScale: number; // 0.82 .. 1.35
  bodyScale: number; // 0.82 .. 1.35
  limbLengthBias: number; // -2 .. 2
  tailLengthBias: number; // -2 .. 4
}

export interface VisualSpec {
  version: typeof VISUAL_SPEC_VERSION;
  modelVersion: string;
  designSeed: number;
  bodyPlan?: VisualBodyPlan;
  motifParts?: VisualMotifPart[];
  brief?: VisualDesignBrief;
  archetype?: BodyArchetype;
  silhouette?: SilhouetteStyle;
  eyeStyle?: EyeStyle;
  mouthStyle?: MouthStyle;
  hornStyle?: HornStyle;
  patternStyle?: PatternStyle;
  weaponStyle?: WeaponStyle;
  auraStyle?: AuraStyle;
  poseOffset?: PoseOffset;
  handedness?: Handedness;
  armorLevel?: number;
  patternDensity?: number;
  paletteBias?: Partial<VisualPaletteBias>;
  composition?: Partial<VisualComposition>;
}

export interface VisualSpecValidationResult {
  ok: boolean;
  errors: string[];
  spec: VisualSpec | null;
}

export interface DesignedVisualGenome extends VisualGenome {
  paletteBias: VisualPaletteBias;
  composition: VisualComposition;
  bodyPlan: VisualBodyPlan;
  motifParts: VisualMotifPart[];
  brief: VisualDesignBrief;
  designerModelVersion: string;
  designerSpecHash: string;
}

export const DEFAULT_VISUAL_PALETTE_BIAS: VisualPaletteBias = {
  baseHueShift: 0,
  baseSatShift: 0,
  accentHueShift: 0,
  accentSatShift: 0,
  accentLightShift: 0,
  contrastBoost: 0,
};

export const DEFAULT_VISUAL_COMPOSITION: VisualComposition = {
  headScale: 1,
  bodyScale: 1,
  limbLengthBias: 0,
  tailLengthBias: 0,
};

export const DEFAULT_VISUAL_DESIGN_BRIEF: VisualDesignBrief = {
  creatureCore: "adaptive beast",
  combatRole: "balanced skirmisher",
  temperament: "calm",
  signatureFeature: "asymmetric crest",
};

export function validateVisualSpec(input: unknown): VisualSpecValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ["VisualSpec must be an object"], spec: null };
  }

  const version = input.version;
  if (version !== VISUAL_SPEC_VERSION) {
    errors.push(`version must be '${VISUAL_SPEC_VERSION}'`);
  }

  const modelVersion = input.modelVersion;
  if (typeof modelVersion !== "string" || modelVersion.trim().length === 0) {
    errors.push("modelVersion must be a non-empty string");
  }
  const safeModelVersion = typeof modelVersion === "string" ? modelVersion.trim() : "";

  const designSeed = input.designSeed;
  if (
    typeof designSeed !== "number" ||
    !Number.isInteger(designSeed) ||
    designSeed < 0 ||
    designSeed > 0xffffffff
  ) {
    errors.push("designSeed must be an unsigned 32-bit integer");
  }
  const safeDesignSeed =
    typeof designSeed === "number" && Number.isInteger(designSeed) ? designSeed : 0;

  const bodyPlan = readOptionalStringEnum(
    input,
    "bodyPlan",
    [...VISUAL_BODY_PLANS],
    errors,
  ) as VisualBodyPlan | undefined;
  const motifParts = readMotifParts(input.motifParts, errors);
  const brief = readDesignBrief(input.brief, errors);

  const archetype = readOptionalStringEnum(
    input,
    "archetype",
    ["biped", "quadruped", "serpent", "avian", "brute", "slender"],
    errors,
  ) as BodyArchetype | undefined;
  const silhouette = readOptionalIntegerEnum(input, "silhouette", 0, 2, errors) as
    | SilhouetteStyle
    | undefined;
  const eyeStyle = readOptionalIntegerEnum(input, "eyeStyle", 0, 3, errors) as
    | EyeStyle
    | undefined;
  const mouthStyle = readOptionalIntegerEnum(input, "mouthStyle", 0, 3, errors) as
    | MouthStyle
    | undefined;
  const hornStyle = readOptionalIntegerEnum(input, "hornStyle", 0, 3, errors) as
    | HornStyle
    | undefined;
  const patternStyle = readOptionalIntegerEnum(input, "patternStyle", 0, 4, errors) as
    | PatternStyle
    | undefined;
  const weaponStyle = readOptionalIntegerEnum(input, "weaponStyle", 0, 3, errors) as
    | WeaponStyle
    | undefined;
  const auraStyle = readOptionalIntegerEnum(input, "auraStyle", 0, 3, errors) as
    | AuraStyle
    | undefined;
  const poseOffset = readOptionalIntegerEnum(input, "poseOffset", -1, 1, errors) as
    | PoseOffset
    | undefined;
  const handedness = readOptionalIntegerEnum(input, "handedness", -1, 1, errors) as
    | Handedness
    | undefined;
  const armorLevel = readOptionalIntegerEnum(input, "armorLevel", 0, 5, errors);
  const patternDensity = readOptionalIntegerEnum(input, "patternDensity", 1, 4, errors);

  const paletteBias = readPaletteBias(input.paletteBias, errors);
  const composition = readComposition(input.composition, errors);

  if (errors.length > 0) {
    return { ok: false, errors, spec: null };
  }

  return {
    ok: true,
    errors,
    spec: {
      version: VISUAL_SPEC_VERSION,
      modelVersion: safeModelVersion,
      designSeed: safeDesignSeed,
      bodyPlan,
      motifParts,
      brief,
      archetype,
      silhouette,
      eyeStyle,
      mouthStyle,
      hornStyle,
      patternStyle,
      weaponStyle,
      auraStyle,
      poseOffset,
      handedness,
      armorLevel,
      patternDensity,
      paletteBias,
      composition,
    },
  };
}

export function mergeVisualSpecIntoGenome(
  baseGenome: VisualGenome,
  spec: VisualSpec | null,
): DesignedVisualGenome {
  const paletteBias = {
    ...DEFAULT_VISUAL_PALETTE_BIAS,
    ...(spec?.paletteBias ?? {}),
  };
  const composition = {
    ...DEFAULT_VISUAL_COMPOSITION,
    ...(spec?.composition ?? {}),
  };
  const bodyPlan = spec?.bodyPlan ?? getDefaultBodyPlan(baseGenome.archetype);
  const motifParts = sanitizeMotifParts(
    spec?.motifParts ?? getDefaultMotifsForBodyPlan(bodyPlan),
  );
  const brief = sanitizeDesignBrief(spec?.brief ?? DEFAULT_VISUAL_DESIGN_BRIEF);

  return {
    ...baseGenome,
    bodyPlan,
    motifParts,
    brief,
    archetype: spec?.archetype ?? baseGenome.archetype,
    silhouette: spec?.silhouette ?? baseGenome.silhouette,
    eyeStyle: spec?.eyeStyle ?? baseGenome.eyeStyle,
    mouthStyle: spec?.mouthStyle ?? baseGenome.mouthStyle,
    hornStyle: spec?.hornStyle ?? baseGenome.hornStyle,
    patternStyle: spec?.patternStyle ?? baseGenome.patternStyle,
    weaponStyle: spec?.weaponStyle ?? baseGenome.weaponStyle,
    auraStyle: spec?.auraStyle ?? baseGenome.auraStyle,
    poseOffset: spec?.poseOffset ?? baseGenome.poseOffset,
    handedness: spec?.handedness ?? baseGenome.handedness,
    armorLevel: clamp(spec?.armorLevel ?? baseGenome.armorLevel, 0, 5),
    patternDensity: clamp(spec?.patternDensity ?? baseGenome.patternDensity, 1, 4),
    paletteBias: {
      baseHueShift: clamp(paletteBias.baseHueShift, -45, 45),
      baseSatShift: clamp(paletteBias.baseSatShift, -24, 24),
      accentHueShift: clamp(paletteBias.accentHueShift, -90, 90),
      accentSatShift: clamp(paletteBias.accentSatShift, -28, 28),
      accentLightShift: clamp(paletteBias.accentLightShift, -16, 16),
      contrastBoost: clamp(paletteBias.contrastBoost, 0, 24),
    },
    composition: {
      headScale: clamp(composition.headScale, 0.82, 1.35),
      bodyScale: clamp(composition.bodyScale, 0.82, 1.35),
      limbLengthBias: clamp(Math.round(composition.limbLengthBias), -2, 2),
      tailLengthBias: clamp(Math.round(composition.tailLengthBias), -2, 4),
    },
    designerModelVersion: spec?.modelVersion ?? BASELINE_DESIGN_MODEL_VERSION,
    designerSpecHash: spec ? hashVisualSpec(spec) : "fallback",
  };
}

function readPaletteBias(
  input: unknown,
  errors: string[],
): Partial<VisualPaletteBias> | undefined {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    errors.push("paletteBias must be an object");
    return undefined;
  }

  const baseHueShift = readOptionalFinite(input, "baseHueShift", -45, 45, errors);
  const baseSatShift = readOptionalFinite(input, "baseSatShift", -24, 24, errors);
  const accentHueShift = readOptionalFinite(input, "accentHueShift", -90, 90, errors);
  const accentSatShift = readOptionalFinite(input, "accentSatShift", -28, 28, errors);
  const accentLightShift = readOptionalFinite(
    input,
    "accentLightShift",
    -16,
    16,
    errors,
  );
  const contrastBoost = readOptionalFinite(input, "contrastBoost", 0, 24, errors);

  return compactObject({
    baseHueShift,
    baseSatShift,
    accentHueShift,
    accentSatShift,
    accentLightShift,
    contrastBoost,
  });
}

function readComposition(
  input: unknown,
  errors: string[],
): Partial<VisualComposition> | undefined {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    errors.push("composition must be an object");
    return undefined;
  }

  const headScale = readOptionalFinite(input, "headScale", 0.82, 1.35, errors);
  const bodyScale = readOptionalFinite(input, "bodyScale", 0.82, 1.35, errors);
  const limbLengthBias = readOptionalIntegerEnum(input, "limbLengthBias", -2, 2, errors);
  const tailLengthBias = readOptionalIntegerEnum(input, "tailLengthBias", -2, 4, errors);

  return compactObject({
    headScale,
    bodyScale,
    limbLengthBias,
    tailLengthBias,
  });
}

function readMotifParts(
  input: unknown,
  errors: string[],
): VisualMotifPart[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    errors.push("motifParts must be an array");
    return undefined;
  }
  if (input.length === 0 || input.length > 3) {
    errors.push("motifParts must contain 1..3 items");
    return undefined;
  }

  const parsed: VisualMotifPart[] = [];
  for (const value of input) {
    if (typeof value !== "string" || !VISUAL_MOTIF_PARTS.includes(value as VisualMotifPart)) {
      errors.push(`motifParts contains unsupported value: ${String(value)}`);
      continue;
    }
    if (!parsed.includes(value as VisualMotifPart)) {
      parsed.push(value as VisualMotifPart);
    }
  }
  if (parsed.length === 0) {
    errors.push("motifParts must include at least one supported motif");
    return undefined;
  }
  return parsed.slice(0, 3);
}

function readDesignBrief(
  input: unknown,
  errors: string[],
): VisualDesignBrief | undefined {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    errors.push("brief must be an object");
    return undefined;
  }

  const creatureCore = readRequiredBriefField(input, "creatureCore", errors);
  const combatRole = readRequiredBriefField(input, "combatRole", errors);
  const temperament = readRequiredBriefField(input, "temperament", errors);
  const signatureFeature = readRequiredBriefField(input, "signatureFeature", errors);

  if (!creatureCore || !combatRole || !temperament || !signatureFeature) {
    return undefined;
  }

  return {
    creatureCore,
    combatRole,
    temperament,
    signatureFeature,
  };
}

function readOptionalStringEnum(
  record: Record<string, unknown>,
  key: string,
  allowed: string[],
  errors: string[],
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${key} must be one of: ${allowed.join(", ")}`);
    return undefined;
  }
  return value;
}

function readOptionalIntegerEnum(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  errors: string[],
): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    errors.push(`${key} must be an integer in [${min}, ${max}]`);
    return undefined;
  }
  return value;
}

function readOptionalFinite(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  errors: string[],
): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${key} must be a finite number in [${min}, ${max}]`);
    return undefined;
  }
  return value;
}

function compactObject<T extends Record<string, number | undefined>>(
  input: T,
): Partial<T> | undefined {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Partial<T>;
}

function readRequiredBriefField(
  record: Record<string, unknown>,
  key: keyof VisualDesignBrief,
  errors: string[],
): string | null {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length < 3) {
    errors.push(`brief.${key} must be a string with length >= 3`);
    return null;
  }
  return value.trim().slice(0, 80);
}

function sanitizeMotifParts(input: VisualMotifPart[]): VisualMotifPart[] {
  const unique = input.filter((value, index) => input.indexOf(value) === index);
  const supported = unique.filter((value) => VISUAL_MOTIF_PARTS.includes(value));
  return supported.slice(0, 3);
}

function sanitizeDesignBrief(input: VisualDesignBrief): VisualDesignBrief {
  return {
    creatureCore: input.creatureCore.trim().slice(0, 80) || DEFAULT_VISUAL_DESIGN_BRIEF.creatureCore,
    combatRole: input.combatRole.trim().slice(0, 80) || DEFAULT_VISUAL_DESIGN_BRIEF.combatRole,
    temperament: input.temperament.trim().slice(0, 80) || DEFAULT_VISUAL_DESIGN_BRIEF.temperament,
    signatureFeature:
      input.signatureFeature.trim().slice(0, 80) ||
      DEFAULT_VISUAL_DESIGN_BRIEF.signatureFeature,
  };
}

function getDefaultBodyPlan(archetype: BodyArchetype): VisualBodyPlan {
  switch (archetype) {
    case "brute":
      return "colossus";
    case "serpent":
      return "trickster";
    case "avian":
      return "sprinter";
    case "quadruped":
      return "prowler";
    case "slender":
      return "mystic";
    case "biped":
    default:
      return "bulwark";
  }
}

function getDefaultMotifsForBodyPlan(bodyPlan: VisualBodyPlan): VisualMotifPart[] {
  switch (bodyPlan) {
    case "sprinter":
      return ["fins", "scarf"];
    case "bulwark":
      return ["mantle", "claws"];
    case "mystic":
      return ["orb", "antenna"];
    case "prowler":
      return ["claws", "tailSpike"];
    case "colossus":
      return ["pack", "crest"];
    case "trickster":
      return ["tailSpike", "antenna"];
  }
}

function hashVisualSpec(spec: VisualSpec): string {
  return hashStringToUint32(JSON.stringify(spec)).toString(16).padStart(8, "0");
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
