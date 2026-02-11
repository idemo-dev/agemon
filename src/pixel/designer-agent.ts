import type { AgemonProfile, AgemonStats, StatName } from "../engine/types.js";
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
import { buildVisualSeedInput, getVisualProfileHash } from "./genome.js";
import { createSeededRng, hashStringToUint32, randomInt } from "./seed.js";
import {
  type VisualBodyPlan,
  type VisualDesignBrief,
  type VisualMotifPart,
  VISUAL_BODY_PLANS,
  VISUAL_MOTIF_PARTS,
  type DesignedVisualGenome,
  type VisualSpec,
  VISUAL_SPEC_VERSION,
  mergeVisualSpecIntoGenome,
  validateVisualSpec,
} from "./visual-spec.js";

export const DESIGNER_AGENT_MODEL_VERSION = "designer-local-v1";

const DESIGN_QUALITY_RULES = [
  "Design original retro monster sprites only.",
  "Use a readable 3/4 composition and asymmetry.",
  "Keep silhouette clarity at 24px and 48px scales.",
  "Use coherent pixel clusters and avoid noisy single-pixel dithering.",
  "Favor 30-45 degree contour diagonals for lively stance.",
  "Favor 2-3 dominant masses with accent landmarks.",
  "Use contrast-driven color accents, not flat monochrome.",
];

export interface DesignerPromptBundle {
  system: string;
  user: string;
  outputSchema: string;
}

export interface DesignerPromptOptions {
  experimentalRoleHint?: string;
}

export interface DesignerAgent {
  readonly modelVersion: string;
  design(
    profile: AgemonProfile,
    baseGenome: VisualGenome,
    prompt: DesignerPromptBundle,
  ): unknown;
}

export interface DesignedGenomeResolution {
  genome: DesignedVisualGenome;
  usedFallback: boolean;
  cacheKey: string;
  validationErrors: string[];
}

type StyleVector = {
  silhouette: number;
  eye: number;
  mouth: number;
  horn: number;
  pattern: number;
  weapon: number;
  aura: number;
  pose: number;
};

const ARCHETYPE_BY_STAT: Record<StatName, BodyArchetype[]> = {
  knowledge: ["avian", "slender", "biped"],
  arsenal: ["brute", "biped", "quadruped"],
  reflex: ["avian", "quadruped", "slender"],
  mastery: ["serpent", "slender", "avian"],
  guard: ["brute", "quadruped", "biped"],
  synergy: ["serpent", "avian", "quadruped"],
};

const BODY_PLAN_BY_STAT: Record<StatName, VisualBodyPlan[]> = {
  knowledge: ["mystic", "trickster", "sprinter"],
  arsenal: ["bulwark", "colossus", "prowler"],
  reflex: ["sprinter", "prowler", "trickster"],
  mastery: ["mystic", "trickster", "prowler"],
  guard: ["bulwark", "colossus", "prowler"],
  synergy: ["trickster", "sprinter", "mystic"],
};

const MOTIF_POOL_BY_STAT: Record<StatName, VisualMotifPart[]> = {
  knowledge: ["orb", "antenna", "crest"],
  arsenal: ["pack", "claws", "mantle"],
  reflex: ["fins", "scarf", "tailSpike"],
  mastery: ["crest", "orb", "mantle"],
  guard: ["mantle", "pack", "claws"],
  synergy: ["tailSpike", "antenna", "fins"],
};

const BRIEF_CORE_BY_STAT: Record<StatName, string[]> = {
  knowledge: ["archive drake", "astral familiar", "cipher owl"],
  arsenal: ["forge beast", "siege chimera", "iron marauder"],
  reflex: ["wind raptor", "razor lynx", "flash serpent"],
  mastery: ["rune artisan", "echo chimera", "ritual hunter"],
  guard: ["aegis golem", "ward sentinel", "bastion wolf"],
  synergy: ["pulse spirit", "aether runner", "phase basilisk"],
};

const BRIEF_ROLE_BY_STAT: Record<StatName, string[]> = {
  knowledge: ["ranged controller", "analysis caster", "tactical support"],
  arsenal: ["frontline breaker", "weapon specialist", "siege vanguard"],
  reflex: ["hit-and-run striker", "counter skirmisher", "flank punisher"],
  mastery: ["pattern manipulator", "hybrid tactician", "setup specialist"],
  guard: ["zone defender", "shield anchor", "formation tank"],
  synergy: ["tempo disruptor", "combo enabler", "field coordinator"],
};

const BRIEF_TEMPERAMENT_BY_STAT: Record<StatName, string[]> = {
  knowledge: ["composed", "calculating", "reserved"],
  arsenal: ["aggressive", "unyielding", "driven"],
  reflex: ["restless", "focused", "predatory"],
  mastery: ["curious", "methodical", "crafty"],
  guard: ["stoic", "protective", "disciplined"],
  synergy: ["adaptive", "playful", "opportunistic"],
};

const STYLE_VECTOR_BY_STAT: Record<StatName, StyleVector> = {
  knowledge: {
    silhouette: -1,
    eye: 1,
    mouth: 0,
    horn: 2,
    pattern: 1,
    weapon: 0,
    aura: 1,
    pose: 0,
  },
  arsenal: {
    silhouette: 1,
    eye: 0,
    mouth: 1,
    horn: 0,
    pattern: 1,
    weapon: 2,
    aura: 0,
    pose: 1,
  },
  reflex: {
    silhouette: -1,
    eye: 2,
    mouth: 0,
    horn: 0,
    pattern: 1,
    weapon: 1,
    aura: 1,
    pose: 1,
  },
  mastery: {
    silhouette: 0,
    eye: 0,
    mouth: 1,
    horn: 1,
    pattern: 2,
    weapon: 0,
    aura: 0,
    pose: 0,
  },
  guard: {
    silhouette: 1,
    eye: 0,
    mouth: -1,
    horn: 1,
    pattern: 0,
    weapon: 1,
    aura: 0,
    pose: -1,
  },
  synergy: {
    silhouette: 0,
    eye: 1,
    mouth: 1,
    horn: 0,
    pattern: 1,
    weapon: 0,
    aura: 2,
    pose: 0,
  },
};

const designCache = new Map<string, VisualSpec | null>();

class LocalDesignerAgent implements DesignerAgent {
  readonly modelVersion = DESIGNER_AGENT_MODEL_VERSION;

  design(
    profile: AgemonProfile,
    baseGenome: VisualGenome,
    _prompt: DesignerPromptBundle,
  ): VisualSpec {
    return generateLocalVisualSpec(profile, baseGenome, this.modelVersion);
  }
}

const defaultDesignerAgent = new LocalDesignerAgent();

export function generateLocalVisualSpec(
  profile: AgemonProfile,
  baseGenome: VisualGenome,
  modelVersion: string = DESIGNER_AGENT_MODEL_VERSION,
): VisualSpec {
  const seed = hashStringToUint32(
    `${modelVersion}:${buildVisualSeedInput(profile)}:${baseGenome.seed}`,
  );
  const rng = createSeededRng(seed);
  const ranked = rankStats(profile.stats);
  const primary = ranked[0];
  const secondary = ranked[1] ?? primary;

  const archetypes = ARCHETYPE_BY_STAT[primary];
  const archetype = archetypes[randomInt(rng, 0, archetypes.length)];
  const bodyPlans = BODY_PLAN_BY_STAT[primary];
  const bodyPlan = bodyPlans[randomInt(rng, 0, bodyPlans.length)];

  const motifParts = pickMotifParts(primary, secondary, rng);
  const brief = buildDesignBrief(primary, secondary, motifParts, rng);

  const styleVector = mergeStyleVectors(primary, secondary);
  const styleJitter = randomInt(rng, -1, 2);

  const silhouette = wrapStyle(baseGenome.silhouette + styleVector.silhouette + styleJitter, 3) as
    | SilhouetteStyle;
  const eyeStyle = wrapStyle(baseGenome.eyeStyle + styleVector.eye + styleJitter, 4) as EyeStyle;
  const mouthStyle = wrapStyle(baseGenome.mouthStyle + styleVector.mouth, 4) as MouthStyle;
  const hornStyle = wrapStyle(baseGenome.hornStyle + styleVector.horn, 4) as HornStyle;
  const patternStyle = wrapStyle(baseGenome.patternStyle + styleVector.pattern, 5) as PatternStyle;
  const weaponStyle = wrapStyle(baseGenome.weaponStyle + styleVector.weapon, 4) as WeaponStyle;
  const auraStyle = wrapStyle(baseGenome.auraStyle + styleVector.aura, 4) as AuraStyle;
  const poseOffset = clamp(
    baseGenome.poseOffset + styleVector.pose + randomInt(rng, -1, 2),
    -1,
    1,
  ) as PoseOffset;

  const handedness = (
    rng() > (profile.stats.reflex >= profile.stats.guard ? 0.42 : 0.58) ? 1 : -1
  ) as Handedness;

  const armorLevel = clamp(
    Math.round(baseGenome.armorLevel + (profile.stats.guard - 50) / 25 + (rng() - 0.5)),
    0,
    5,
  );
  const patternDensity = clamp(
    Math.round(baseGenome.patternDensity + (profile.stats.mastery - 50) / 30 + (rng() - 0.5)),
    1,
    4,
  );

  const paletteBias = {
    baseHueShift: clamp(
      Math.round((profile.stats.mastery - profile.stats.guard) / 7) + randomInt(rng, -9, 10),
      -45,
      45,
    ),
    baseSatShift: clamp(
      Math.round((profile.stats.synergy - profile.stats.knowledge) / 8) + randomInt(rng, -6, 7),
      -24,
      24,
    ),
    accentHueShift: clamp(
      Math.round((profile.stats.reflex - profile.stats.knowledge) / 5) + randomInt(rng, -18, 19),
      -90,
      90,
    ),
    accentSatShift: clamp(
      Math.round((profile.stats.arsenal - 50) / 4) + randomInt(rng, -8, 9),
      -28,
      28,
    ),
    accentLightShift: clamp(
      Math.round((profile.stats.knowledge - profile.stats.mastery) / 10) + randomInt(rng, -4, 5),
      -16,
      16,
    ),
    contrastBoost: clamp(
      Math.round((profile.stats.reflex + profile.stats.guard) / 14) + randomInt(rng, -2, 3),
      0,
      24,
    ),
  };

  const composition = {
    headScale: clamp(
      roundTo(
        1 +
          (profile.stats.knowledge - profile.stats.arsenal) / 260 +
          randomBetween(rng, -0.08, 0.09),
        2,
      ),
      0.82,
      1.35,
    ),
    bodyScale: clamp(
      roundTo(
        1 +
          (profile.stats.guard - profile.stats.reflex) / 260 +
          randomBetween(rng, -0.08, 0.09),
        2,
      ),
      0.82,
      1.35,
    ),
    limbLengthBias: clamp(
      Math.round((profile.stats.reflex - profile.stats.guard) / 28 + randomBetween(rng, -0.9, 1)),
      -2,
      2,
    ),
    tailLengthBias: clamp(
      Math.round((profile.stats.synergy - profile.stats.knowledge) / 24 + randomBetween(rng, -1, 2)),
      -2,
      4,
    ),
  };

  return {
    version: VISUAL_SPEC_VERSION,
    modelVersion,
    designSeed: seed,
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
  };
}

export function getVisualDesignCacheKey(
  profile: AgemonProfile,
  baseGenome: VisualGenome,
  modelVersion: string,
): string {
  const profileHash = getVisualProfileHash(profile);
  return `${profileHash}:${baseGenome.seed}:${modelVersion}`;
}

export function buildDesignerPrompt(
  profile: AgemonProfile,
  baseGenome: VisualGenome,
  modelVersion: string = DESIGNER_AGENT_MODEL_VERSION,
  options: DesignerPromptOptions = {},
): DesignerPromptBundle {
  const roleHint = sanitizeRoleHint(options.experimentalRoleHint);
  const roleHintLine = roleHint
    ? `Experimental role hint (user-specified): ${roleHint}. Use only for quality direction, keep design original.`
    : null;

  const system = [
    "You are Agemon DesignerAgent.",
    "Role: Retro Monster Pixel Art Director.",
    "Never mimic named IP characters or trademarked designs.",
    ...(roleHintLine ? [roleHintLine] : []),
    ...DESIGN_QUALITY_RULES.map((rule) => `- ${rule}`),
  ].join("\n");

  const user = [
    `Target: ${profile.displayName} (${profile.id})`,
    `Source: ${profile.source}/${profile.scope}`,
    `Stage: ${profile.evolution.stage} Lv.${profile.level}`,
    `Types: ${profile.types.join(", ")}`,
    `Stats: knowledge=${Math.round(profile.stats.knowledge)}, arsenal=${Math.round(profile.stats.arsenal)}, reflex=${Math.round(profile.stats.reflex)}, mastery=${Math.round(profile.stats.mastery)}, guard=${Math.round(profile.stats.guard)}, synergy=${Math.round(profile.stats.synergy)}`,
    `BaseGenomeSeed: ${baseGenome.seed}`,
    `ModelVersion: ${modelVersion}`,
    `BodyPlanCatalog: ${VISUAL_BODY_PLANS.join(", ")}`,
    `MotifCatalog: ${VISUAL_MOTIF_PARTS.join(", ")}`,
    "Return only JSON that matches VisualSpec schema.",
  ].join("\n");

  const outputSchema = JSON.stringify(
    {
      version: VISUAL_SPEC_VERSION,
      modelVersion,
      designSeed: "uint32",
      bodyPlan: VISUAL_BODY_PLANS.join("|"),
      motifParts: "1..3 items from motif catalog",
      brief: {
        creatureCore: "string",
        combatRole: "string",
        temperament: "string",
        signatureFeature: "string",
      },
      archetype: "biped|quadruped|serpent|avian|brute|slender?",
      silhouette: "0|1|2?",
      eyeStyle: "0|1|2|3?",
      mouthStyle: "0|1|2|3?",
      hornStyle: "0|1|2|3?",
      patternStyle: "0|1|2|3|4?",
      weaponStyle: "0|1|2|3?",
      auraStyle: "0|1|2|3?",
      poseOffset: "-1|0|1?",
      handedness: "-1|1?",
      armorLevel: "0..5?",
      patternDensity: "1..4?",
      paletteBias: {
        baseHueShift: "-45..45?",
        baseSatShift: "-24..24?",
        accentHueShift: "-90..90?",
        accentSatShift: "-28..28?",
        accentLightShift: "-16..16?",
        contrastBoost: "0..24?",
      },
      composition: {
        headScale: "0.82..1.35?",
        bodyScale: "0.82..1.35?",
        limbLengthBias: "-2..2?",
        tailLengthBias: "-2..4?",
      },
    },
    null,
    2,
  );

  return { system, user, outputSchema };
}

export function resolveDesignedGenome(
  profile: AgemonProfile,
  baseGenome: VisualGenome,
  agent: DesignerAgent = defaultDesignerAgent,
): DesignedGenomeResolution {
  const embeddedSpec = resolveEmbeddedVisualSpec(profile);
  if (embeddedSpec) {
    const embeddedKey = getVisualDesignCacheKey(
      profile,
      baseGenome,
      embeddedSpec.modelVersion,
    );
    if (!designCache.has(embeddedKey)) {
      designCache.set(embeddedKey, embeddedSpec);
    }
    return {
      genome: mergeVisualSpecIntoGenome(baseGenome, embeddedSpec),
      usedFallback: false,
      cacheKey: embeddedKey,
      validationErrors: [],
    };
  }

  const cacheKey = getVisualDesignCacheKey(profile, baseGenome, agent.modelVersion);
  const cached = designCache.get(cacheKey);
  if (cached !== undefined) {
    return {
      genome: mergeVisualSpecIntoGenome(baseGenome, cached),
      usedFallback: cached === null,
      cacheKey,
      validationErrors: cached === null ? ["cached fallback"] : [],
    };
  }

  const prompt = buildDesignerPrompt(profile, baseGenome, agent.modelVersion);

  try {
    const rawSpec = agent.design(profile, baseGenome, prompt);
    const validation = validateVisualSpec(rawSpec);
    if (!validation.ok || !validation.spec) {
      designCache.set(cacheKey, null);
      return {
        genome: mergeVisualSpecIntoGenome(baseGenome, null),
        usedFallback: true,
        cacheKey,
        validationErrors: validation.errors,
      };
    }

    const finalSpec =
      validation.spec.modelVersion === agent.modelVersion
        ? validation.spec
        : { ...validation.spec, modelVersion: agent.modelVersion };

    designCache.set(cacheKey, finalSpec);
    return {
      genome: mergeVisualSpecIntoGenome(baseGenome, finalSpec),
      usedFallback: false,
      cacheKey,
      validationErrors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    designCache.set(cacheKey, null);
    return {
      genome: mergeVisualSpecIntoGenome(baseGenome, null),
      usedFallback: true,
      cacheKey,
      validationErrors: [`designer agent exception: ${message}`],
    };
  }
}

export function clearDesignerCache(): void {
  designCache.clear();
}

export function getDesignerCacheSize(): number {
  return designCache.size;
}

function resolveEmbeddedVisualSpec(profile: AgemonProfile): VisualSpec | null {
  const candidate = profile.visualSpec;
  if (!candidate || typeof candidate !== "object") return null;

  const validation = validateVisualSpec(candidate);
  if (!validation.ok || !validation.spec) return null;
  return validation.spec;
}

function rankStats(stats: AgemonStats): StatName[] {
  const values: [StatName, number][] = [
    ["knowledge", stats.knowledge],
    ["arsenal", stats.arsenal],
    ["reflex", stats.reflex],
    ["mastery", stats.mastery],
    ["guard", stats.guard],
    ["synergy", stats.synergy],
  ];

  values.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return values.map(([name]) => name);
}

function mergeStyleVectors(primary: StatName, secondary: StatName): StyleVector {
  const p = STYLE_VECTOR_BY_STAT[primary];
  const s = STYLE_VECTOR_BY_STAT[secondary];
  return {
    silhouette: Math.round(p.silhouette * 0.7 + s.silhouette * 0.3),
    eye: Math.round(p.eye * 0.7 + s.eye * 0.3),
    mouth: Math.round(p.mouth * 0.7 + s.mouth * 0.3),
    horn: Math.round(p.horn * 0.7 + s.horn * 0.3),
    pattern: Math.round(p.pattern * 0.7 + s.pattern * 0.3),
    weapon: Math.round(p.weapon * 0.7 + s.weapon * 0.3),
    aura: Math.round(p.aura * 0.7 + s.aura * 0.3),
    pose: Math.round(p.pose * 0.7 + s.pose * 0.3),
  };
}

function pickMotifParts(
  primary: StatName,
  secondary: StatName,
  rng: () => number,
): VisualMotifPart[] {
  const pool = [
    ...MOTIF_POOL_BY_STAT[primary],
    ...MOTIF_POOL_BY_STAT[secondary],
    ...VISUAL_MOTIF_PARTS,
  ];
  const result: VisualMotifPart[] = [];
  const targetCount = randomInt(rng, 2, 4);

  while (result.length < targetCount && pool.length > 0) {
    const index = randomInt(rng, 0, pool.length);
    const pick = pool[index];
    pool.splice(index, 1);
    if (!result.includes(pick)) {
      result.push(pick);
    }
  }

  if (result.length === 0) {
    return ["crest", "tailSpike"];
  }

  return result.slice(0, 3);
}

function buildDesignBrief(
  primary: StatName,
  secondary: StatName,
  motifParts: VisualMotifPart[],
  rng: () => number,
): VisualDesignBrief {
  const creatureCore = pickByStat(primary, secondary, BRIEF_CORE_BY_STAT, rng);
  const combatRole = pickByStat(primary, secondary, BRIEF_ROLE_BY_STAT, rng);
  const temperament = pickByStat(primary, secondary, BRIEF_TEMPERAMENT_BY_STAT, rng);
  const signatureFeature = motifParts.join(" + ");

  return {
    creatureCore,
    combatRole,
    temperament,
    signatureFeature,
  };
}

function pickByStat(
  primary: StatName,
  secondary: StatName,
  source: Record<StatName, string[]>,
  rng: () => number,
): string {
  const candidates = [...source[primary], ...source[secondary]];
  const index = randomInt(rng, 0, candidates.length);
  return candidates[index] ?? source[primary][0];
}

function wrapStyle(value: number, mod: number): number {
  return ((value % mod) + mod) % mod;
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function roundTo(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeRoleHint(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 3) return null;
  return trimmed.slice(0, 160);
}
