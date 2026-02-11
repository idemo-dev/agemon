import type { AgemonProfile } from "../engine/types.js";
import { createSeededRng, hashStringToUint32, randomInt } from "./seed.js";

export type SilhouetteStyle = 0 | 1 | 2;
export type EyeStyle = 0 | 1 | 2 | 3;
export type MouthStyle = 0 | 1 | 2 | 3;
export type HornStyle = 0 | 1 | 2 | 3;
export type PatternStyle = 0 | 1 | 2 | 3 | 4;
export type WeaponStyle = 0 | 1 | 2 | 3;
export type AuraStyle = 0 | 1 | 2 | 3;
export type PoseOffset = -1 | 0 | 1;
export type Handedness = -1 | 1;
export type BodyArchetype =
  | "biped"
  | "quadruped"
  | "serpent"
  | "avian"
  | "brute"
  | "slender";

export interface VisualGenome {
  seed: number;
  archetype: BodyArchetype;
  silhouette: SilhouetteStyle;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  hornStyle: HornStyle;
  patternStyle: PatternStyle;
  weaponStyle: WeaponStyle;
  auraStyle: AuraStyle;
  poseOffset: PoseOffset;
  handedness: Handedness;
  armorLevel: number;
  patternDensity: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeStat(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

export function buildVisualSeedInput(profile: AgemonProfile): string {
  const moves = profile.moves
    .map((move) => move.name)
    .sort()
    .join("|");
  const equipment = profile.equipment
    .map((item) => item.name)
    .sort()
    .join("|");
  const stats = [
    normalizeStat(profile.stats.knowledge),
    normalizeStat(profile.stats.arsenal),
    normalizeStat(profile.stats.reflex),
    normalizeStat(profile.stats.mastery),
    normalizeStat(profile.stats.guard),
    normalizeStat(profile.stats.synergy),
  ].join(",");

  return [
    profile.id,
    profile.name,
    profile.displayName,
    profile.source,
    profile.scope,
    profile.types.join(","),
    profile.level,
    profile.xp,
    stats,
    moves,
    equipment,
  ].join("::");
}

export function buildVisualGenome(profile: AgemonProfile): VisualGenome {
  const seedInput = buildVisualSeedInput(profile);
  const seed = hashStringToUint32(seedInput);
  const rng = createSeededRng(seed);

  const knowledgeBias = Math.floor(normalizeStat(profile.stats.knowledge) / 34);
  const arsenalBias = Math.floor(normalizeStat(profile.stats.arsenal) / 34);
  const reflexBias = Math.floor(normalizeStat(profile.stats.reflex) / 34);
  const masteryBias = Math.floor(normalizeStat(profile.stats.mastery) / 34);
  const guardBias = Math.floor(normalizeStat(profile.stats.guard) / 34);
  const synergyBias = Math.floor(normalizeStat(profile.stats.synergy) / 34);

  const archetypePool: BodyArchetype[] = [
    "biped",
    "quadruped",
    "serpent",
    "avian",
    "brute",
    "slender",
  ];
  const archetype = archetypePool[randomInt(rng, 0, archetypePool.length)];

  const silhouette = ((randomInt(rng, 0, 3) + guardBias) % 3) as SilhouetteStyle;
  const eyeStyle = ((randomInt(rng, 0, 4) + reflexBias) % 4) as EyeStyle;
  const mouthStyle = ((randomInt(rng, 0, 4) + masteryBias) % 4) as MouthStyle;
  const hornStyle = ((randomInt(rng, 0, 4) + knowledgeBias + guardBias) % 4) as HornStyle;
  const patternStyle = ((randomInt(rng, 0, 5) + masteryBias) % 5) as PatternStyle;
  const weaponStyle = ((randomInt(rng, 0, 4) + arsenalBias) % 4) as WeaponStyle;
  const auraStyle = ((randomInt(rng, 0, 4) + synergyBias) % 4) as AuraStyle;
  const poseOffset = (randomInt(rng, 0, 3) - 1) as PoseOffset;
  const handedness = (randomInt(rng, 0, 2) === 0 ? -1 : 1) as Handedness;

  return {
    seed,
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
    armorLevel: clamp(Math.floor(normalizeStat(profile.stats.guard) / 20), 0, 5),
    patternDensity: clamp(1 + Math.floor(normalizeStat(profile.stats.mastery) / 25), 1, 4),
  };
}

export function getVisualProfileHash(profile: AgemonProfile): string {
  return hashStringToUint32(buildVisualSeedInput(profile))
    .toString(16)
    .padStart(8, "0");
}
