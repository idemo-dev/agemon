import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AgemonProfile } from "../engine/types.js";
import { buildVisualGenome } from "../pixel/genome.js";
import {
  buildDesignerPrompt,
  DESIGNER_AGENT_MODEL_VERSION,
  generateLocalVisualSpec,
  getVisualDesignCacheKey,
} from "../pixel/designer-agent.js";
import { createSeededRng, hashStringToUint32, randomInt } from "../pixel/seed.js";
import {
  type VisualSpec,
  VISUAL_SPEC_VERSION,
  VISUAL_BODY_PLANS,
  VISUAL_MOTIF_PARTS,
  validateVisualSpec,
} from "../pixel/visual-spec.js";

const CACHE_VERSION = 1;
const CACHE_RELATIVE_PATH = ".agemon/designer-spec-cache.json";
const MIN_SPEC_DISTANCE = 0.38;
const MIN_QUALITY_SCORE = 0.55;
const MAX_DIVERSIFY_ATTEMPTS = 6;

type DesignerProvider = "local" | "openai" | "openrouter";

interface LlmDesignerConfig {
  provider: DesignerProvider;
  model: string;
  apiKey: string | null;
  baseUrl: string;
  siteUrl: string | null;
  appName: string | null;
  experimentalRoleHint: string | null;
  timeoutMs: number;
  maxProfiles: number;
}

interface DesignerCacheFile {
  version: number;
  updatedAt: string;
  entries: Record<string, VisualSpec>;
}

export interface LlmHydrationResult {
  enabled: boolean;
  provider: DesignerProvider;
  model: string;
  requested: number;
  applied: number;
  cached: number;
  failed: number;
}

interface LlmHydrationOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export async function hydrateProfilesWithLlmDesigner(
  profiles: AgemonProfile[],
  projectPath: string,
  options: LlmHydrationOptions = {},
): Promise<LlmHydrationResult> {
  const config = readConfig(options.env ?? process.env);
  const trace = (options.env ?? process.env).AGEMON_LLM_TRACE === "1";
  const result: LlmHydrationResult = {
    enabled: true,
    provider: config.provider,
    model: config.model,
    requested: 0,
    applied: 0,
    cached: 0,
    failed: 0,
  };
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  const canUseRemote =
    config.provider !== "local" &&
    Boolean(config.apiKey) &&
    typeof fetchImpl === "function";
  const providerModelVersion = canUseRemote
    ? `${config.provider}:${config.model}`
    : DESIGNER_AGENT_MODEL_VERSION;

  const cachePath = resolve(projectPath, CACHE_RELATIVE_PATH);
  const cache = await loadDesignerCache(cachePath);
  let cacheDirty = false;
  const targets = profiles.slice(0, config.maxProfiles);
  const candidates: Array<{
    profile: AgemonProfile;
    baseGenome: ReturnType<typeof buildVisualGenome>;
    cacheKey: string;
    spec: VisualSpec;
  }> = [];

  for (const profile of targets) {
    const baseGenome = buildVisualGenome(profile);
    const cacheKey = getVisualDesignCacheKey(
      profile,
      baseGenome,
      providerModelVersion,
    );
    const cachedSpec = cache.entries[cacheKey];
    if (cachedSpec) {
      const validation = validateVisualSpec(cachedSpec);
      if (validation.ok && validation.spec) {
        result.cached++;
        candidates.push({
          profile,
          baseGenome,
          cacheKey,
          spec: cachedSpec,
        });
        continue;
      }
    }

    try {
      let raw: unknown;
      if (canUseRemote) {
        result.requested++;
        const prompt = buildDesignerPrompt(
          profile,
          baseGenome,
          providerModelVersion,
          { experimentalRoleHint: config.experimentalRoleHint ?? undefined },
        );
        raw = await requestProviderVisualSpec(fetchImpl as FetchLike, config, prompt);
        raw = normalizeRemoteVisualSpec(raw, {
          profileId: profile.id,
          profileName: profile.name,
          profileDisplayName: profile.displayName,
          baseSeed: baseGenome.seed,
          modelVersion: providerModelVersion,
        });
      } else {
        raw = generateLocalVisualSpec(profile, baseGenome, providerModelVersion);
      }

      let validation = validateVisualSpec(raw);
      if ((!validation.ok || !validation.spec) && canUseRemote) {
        // Remote generation may fail or return invalid JSON. Fall back to deterministic local design.
        result.failed++;
        if (trace) {
          console.warn(
            `  [Agemon][designer][${profile.displayName}] remote output invalid: ${validation.errors.slice(0, 3).join(" | ")}`,
          );
        }
        raw = generateLocalVisualSpec(profile, baseGenome, providerModelVersion);
        validation = validateVisualSpec(raw);
      }

      if (!validation.ok || !validation.spec) {
        result.failed++;
        continue;
      }

      const normalizedSpec: VisualSpec =
        validation.spec.modelVersion === providerModelVersion
          ? validation.spec
          : { ...validation.spec, modelVersion: providerModelVersion };

      candidates.push({
        profile,
        baseGenome,
        cacheKey,
        spec: normalizedSpec,
      });
    } catch (error) {
      if (canUseRemote) {
        result.failed++;
        if (trace) {
          const reason = error instanceof Error ? error.message : "LLM request failed";
          console.warn(
            `  [Agemon][designer][${profile.displayName}] request failed: ${reason}`,
          );
        }
      }

      const fallback = generateLocalVisualSpec(profile, baseGenome, providerModelVersion);
      const validation = validateVisualSpec(fallback);
      if (!validation.ok || !validation.spec) continue;
      candidates.push({
        profile,
        baseGenome,
        cacheKey,
        spec: validation.spec,
      });
    }
  }

  const acceptedSpecs: VisualSpec[] = [];
  for (const candidate of candidates) {
    const diversified = diversifySpecForPortfolio(
      candidate.profile,
      candidate.spec,
      acceptedSpecs,
    );
    candidate.profile.visualSpec = diversified;
    acceptedSpecs.push(diversified);

    const previous = cache.entries[candidate.cacheKey];
    if (!previous || JSON.stringify(previous) !== JSON.stringify(diversified)) {
      cache.entries[candidate.cacheKey] = diversified;
      cacheDirty = true;
    }
    result.applied++;
  }

  if (cacheDirty) {
    await saveDesignerCache(cachePath, cache);
  }

  return result;
}

function diversifySpecForPortfolio(
  profile: AgemonProfile,
  initialSpec: VisualSpec,
  acceptedSpecs: VisualSpec[],
): VisualSpec {
  let best = normalizeSpec(initialSpec);
  let bestDistance = minSpecDistance(best, acceptedSpecs);
  let bestQuality = calculateQualityScore(best);

  if (bestDistance >= MIN_SPEC_DISTANCE && bestQuality >= MIN_QUALITY_SCORE) {
    return best;
  }

  for (let attempt = 0; attempt < MAX_DIVERSIFY_ATTEMPTS; attempt++) {
    const mutated = mutateSpec(best, profile.id, attempt);
    const validation = validateVisualSpec(mutated);
    if (!validation.ok || !validation.spec) {
      continue;
    }

    const candidate = normalizeSpec(validation.spec);
    const distance = minSpecDistance(candidate, acceptedSpecs);
    const quality = calculateQualityScore(candidate);

    if (isCandidateBetter(distance, quality, bestDistance, bestQuality)) {
      best = candidate;
      bestDistance = distance;
      bestQuality = quality;
    }

    if (bestDistance >= MIN_SPEC_DISTANCE && bestQuality >= MIN_QUALITY_SCORE) {
      break;
    }
  }

  return best;
}

function mutateSpec(spec: VisualSpec, profileId: string, attempt: number): VisualSpec {
  const seed = hashStringToUint32(
    `${profileId}:${spec.designSeed}:${attempt}:${spec.modelVersion}`,
  );
  const rng = createSeededRng(seed);
  const motifParts = [...(spec.motifParts ?? ["crest", "tailSpike"])];
  const mutationType = attempt % 4;

  switch (mutationType) {
    case 0: {
      const current = spec.bodyPlan ?? VISUAL_BODY_PLANS[0];
      const index = VISUAL_BODY_PLANS.indexOf(current);
      const step = 1 + randomInt(rng, 0, 3);
      const next = VISUAL_BODY_PLANS[(Math.max(0, index) + step) % VISUAL_BODY_PLANS.length];
      spec = { ...spec, bodyPlan: next };
      break;
    }
    case 1: {
      const replaceIndex = motifParts.length === 0 ? 0 : randomInt(rng, 0, motifParts.length);
      const replacement = VISUAL_MOTIF_PARTS[randomInt(rng, 0, VISUAL_MOTIF_PARTS.length)];
      if (motifParts.length === 0) {
        motifParts.push(replacement);
      } else {
        motifParts[replaceIndex] = replacement;
      }
      spec = {
        ...spec,
        motifParts: dedupeMotifs(motifParts),
      };
      break;
    }
    case 2: {
      spec = {
        ...spec,
        silhouette: rotateEnum(spec.silhouette ?? 0, 3, randomInt(rng, 1, 3)) as 0 | 1 | 2,
        eyeStyle: rotateEnum(spec.eyeStyle ?? 0, 4, randomInt(rng, 1, 3)) as 0 | 1 | 2 | 3,
        mouthStyle: rotateEnum(spec.mouthStyle ?? 0, 4, randomInt(rng, 1, 3)) as 0 | 1 | 2 | 3,
        hornStyle: rotateEnum(spec.hornStyle ?? 0, 4, randomInt(rng, 1, 3)) as 0 | 1 | 2 | 3,
      };
      break;
    }
    case 3: {
      const paletteBias = spec.paletteBias ?? {};
      const composition = spec.composition ?? {};
      spec = {
        ...spec,
        paletteBias: {
          ...paletteBias,
          accentHueShift: clampNumber(
            (paletteBias.accentHueShift ?? 0) + randomInt(rng, -28, 29),
            -90,
            90,
          ),
          accentSatShift: clampNumber(
            (paletteBias.accentSatShift ?? 0) + randomInt(rng, -10, 11),
            -28,
            28,
          ),
          contrastBoost: clampNumber(
            (paletteBias.contrastBoost ?? 0) + randomInt(rng, 1, 7),
            0,
            24,
          ),
        },
        composition: {
          ...composition,
          headScale: round2(
            clampNumber((composition.headScale ?? 1) + randomBetween(rng, -0.1, 0.12), 0.82, 1.35),
          ),
          bodyScale: round2(
            clampNumber((composition.bodyScale ?? 1) + randomBetween(rng, -0.12, 0.1), 0.82, 1.35),
          ),
        },
      };
      break;
    }
  }

  return {
    ...spec,
    designSeed: hashStringToUint32(`${seed}:mutated`),
  };
}

function isCandidateBetter(
  distance: number,
  quality: number,
  currentDistance: number,
  currentQuality: number,
): boolean {
  const distanceGain = distance - currentDistance;
  const qualityGain = quality - currentQuality;
  const currentPenalty =
    Math.max(0, MIN_SPEC_DISTANCE - currentDistance) +
    Math.max(0, MIN_QUALITY_SCORE - currentQuality);
  const candidatePenalty =
    Math.max(0, MIN_SPEC_DISTANCE - distance) +
    Math.max(0, MIN_QUALITY_SCORE - quality);

  if (candidatePenalty < currentPenalty) {
    return true;
  }

  return distanceGain * 0.72 + qualityGain * 0.28 > 0.015;
}

function minSpecDistance(spec: VisualSpec, existing: VisualSpec[]): number {
  if (existing.length === 0) return 1;
  let min = 1;
  for (const current of existing) {
    min = Math.min(min, calculateSpecDistance(spec, current));
  }
  return min;
}

function calculateSpecDistance(a: VisualSpec, b: VisualSpec): number {
  const discreteKeys: Array<keyof VisualSpec> = [
    "bodyPlan",
    "archetype",
    "silhouette",
    "eyeStyle",
    "mouthStyle",
    "hornStyle",
    "patternStyle",
    "weaponStyle",
    "auraStyle",
    "poseOffset",
    "handedness",
  ];

  let discreteDiff = 0;
  for (const key of discreteKeys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) {
      discreteDiff++;
    }
  }
  const discreteScore = discreteDiff / discreteKeys.length;

  const motifScore = jaccardDistance(
    new Set(a.motifParts ?? []),
    new Set(b.motifParts ?? []),
  );

  const numericPairs: Array<[number, number, number]> = [
    [a.paletteBias?.baseHueShift ?? 0, b.paletteBias?.baseHueShift ?? 0, 90],
    [a.paletteBias?.accentHueShift ?? 0, b.paletteBias?.accentHueShift ?? 0, 180],
    [a.paletteBias?.accentSatShift ?? 0, b.paletteBias?.accentSatShift ?? 0, 56],
    [a.paletteBias?.contrastBoost ?? 0, b.paletteBias?.contrastBoost ?? 0, 24],
    [a.composition?.headScale ?? 1, b.composition?.headScale ?? 1, 0.53],
    [a.composition?.bodyScale ?? 1, b.composition?.bodyScale ?? 1, 0.53],
    [a.composition?.limbLengthBias ?? 0, b.composition?.limbLengthBias ?? 0, 4],
    [a.composition?.tailLengthBias ?? 0, b.composition?.tailLengthBias ?? 0, 6],
  ];
  const numericScore =
    numericPairs.reduce((acc, [x, y, range]) => {
      return acc + Math.min(1, Math.abs(x - y) / Math.max(0.001, range));
    }, 0) / numericPairs.length;

  return discreteScore * 0.6 + motifScore * 0.25 + numericScore * 0.15;
}

function calculateQualityScore(spec: VisualSpec): number {
  const motifCount = (spec.motifParts ?? []).length;
  const motifScore = clampNumber(motifCount / 3, 0, 1);
  const bodyPlanScore = spec.bodyPlan ? 1 : 0;
  const brief = spec.brief;
  const briefScore = brief
    ? [brief.creatureCore, brief.combatRole, brief.temperament, brief.signatureFeature].filter(
        (value) => typeof value === "string" && value.trim().length >= 4,
      ).length / 4
    : 0;
  const paletteScore = clampNumber(
    ((Math.abs(spec.paletteBias?.accentHueShift ?? 0) / 90) +
      ((spec.paletteBias?.contrastBoost ?? 0) / 24)) /
      2,
    0,
    1,
  );
  const compositionScore = clampNumber(
    (Math.abs((spec.composition?.headScale ?? 1) - (spec.composition?.bodyScale ?? 1)) / 0.35 +
      Math.abs(spec.composition?.tailLengthBias ?? 0) / 4) /
      2,
    0,
    1,
  );

  return (
    motifScore * 0.25 +
    bodyPlanScore * 0.2 +
    briefScore * 0.2 +
    paletteScore * 0.2 +
    compositionScore * 0.15
  );
}

function normalizeSpec(spec: VisualSpec): VisualSpec {
  const motifParts = dedupeMotifs(spec.motifParts ?? []);
  const bodyPlan =
    typeof spec.bodyPlan === "string" &&
    VISUAL_BODY_PLANS.includes(spec.bodyPlan as (typeof VISUAL_BODY_PLANS)[number])
      ? spec.bodyPlan
      : VISUAL_BODY_PLANS[0];

  return {
    ...spec,
    bodyPlan,
    motifParts,
    brief: {
      creatureCore: truncate(spec.brief?.creatureCore ?? "adaptive beast", 80),
      combatRole: truncate(spec.brief?.combatRole ?? "balanced skirmisher", 80),
      temperament: truncate(spec.brief?.temperament ?? "calm", 80),
      signatureFeature: truncate(spec.brief?.signatureFeature ?? motifParts.join(" + "), 80),
    },
  };
}

function dedupeMotifs(input: string[]): Array<(typeof VISUAL_MOTIF_PARTS)[number]> {
  const unique = input
    .filter((value): value is (typeof VISUAL_MOTIF_PARTS)[number] =>
      VISUAL_MOTIF_PARTS.includes(value as (typeof VISUAL_MOTIF_PARTS)[number]),
    )
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);

  if (unique.length === 0) {
    return ["crest"];
  }
  return unique;
}

function rotateEnum(value: number, modulo: number, delta: number): number {
  return ((value + delta) % modulo + modulo) % modulo;
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : 1 - intersection / union;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const VISUAL_ARCHETYPES = [
  "biped",
  "quadruped",
  "serpent",
  "avian",
  "brute",
  "slender",
] as const;

interface RemoteVisualNormalizeContext {
  profileId: string;
  profileName: string;
  profileDisplayName: string;
  baseSeed: number;
  modelVersion: string;
}

function normalizeRemoteVisualSpec(
  input: unknown,
  context: RemoteVisualNormalizeContext,
): unknown {
  const source = isRecord(input) ? input : {};
  const normalized: Record<string, unknown> = {
    version: VISUAL_SPEC_VERSION,
    modelVersion: readNonEmptyString(source.modelVersion) ?? context.modelVersion,
    designSeed: normalizeDesignSeed(source.designSeed, context),
  };

  const bodyPlan = readStringEnum(source.bodyPlan, VISUAL_BODY_PLANS);
  if (bodyPlan) {
    normalized.bodyPlan = bodyPlan;
  }

  const motifParts = readMotifParts(source.motifParts);
  if (motifParts.length > 0) {
    normalized.motifParts = motifParts;
  }

  const brief = readBrief(source.brief);
  if (brief) {
    normalized.brief = brief;
  }

  const archetype = readStringEnum(source.archetype, VISUAL_ARCHETYPES);
  if (archetype) {
    normalized.archetype = archetype;
  }

  setOptionalClampedInt(normalized, "silhouette", source.silhouette, 0, 2);
  setOptionalClampedInt(normalized, "eyeStyle", source.eyeStyle, 0, 3);
  setOptionalClampedInt(normalized, "mouthStyle", source.mouthStyle, 0, 3);
  setOptionalClampedInt(normalized, "hornStyle", source.hornStyle, 0, 3);
  setOptionalClampedInt(normalized, "patternStyle", source.patternStyle, 0, 4);
  setOptionalClampedInt(normalized, "weaponStyle", source.weaponStyle, 0, 3);
  setOptionalClampedInt(normalized, "auraStyle", source.auraStyle, 0, 3);
  setOptionalClampedInt(normalized, "poseOffset", source.poseOffset, -1, 1);
  setOptionalHandedness(normalized, source.handedness);
  setOptionalClampedInt(normalized, "armorLevel", source.armorLevel, 0, 5);
  setOptionalClampedInt(normalized, "patternDensity", source.patternDensity, 1, 4);

  const paletteBias = readNumericObject(source.paletteBias, {
    baseHueShift: [-45, 45],
    baseSatShift: [-24, 24],
    accentHueShift: [-90, 90],
    accentSatShift: [-28, 28],
    accentLightShift: [-16, 16],
    contrastBoost: [0, 24],
  });
  if (paletteBias) {
    normalized.paletteBias = paletteBias;
  }

  const compositionFloat = readNumericObject(source.composition, {
    headScale: [0.82, 1.35],
    bodyScale: [0.82, 1.35],
  });
  const compositionInt = readNumericObject(
    source.composition,
    {
      limbLengthBias: [-2, 2],
      tailLengthBias: [-2, 4],
    },
    true,
  );
  const composition = compositionFloat || compositionInt
    ? {
        ...(compositionFloat ?? {}),
        ...(compositionInt ?? {}),
      }
    : undefined;
  if (composition) {
    normalized.composition = composition;
  }

  return normalized;
}

function normalizeDesignSeed(
  value: unknown,
  context: RemoteVisualNormalizeContext,
): number {
  const parsed = readNumber(value);
  if (parsed !== null) {
    return normalizeUint32(parsed);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return hashStringToUint32(value.trim());
  }
  return hashStringToUint32(
    `${context.modelVersion}:${context.profileId}:${context.profileName}:${context.profileDisplayName}:${context.baseSeed}`,
  );
}

function normalizeUint32(value: number): number {
  const n = Math.round(value);
  return ((n % 0x100000000) + 0x100000000) % 0x100000000;
}

function readMotifParts(input: unknown): Array<(typeof VISUAL_MOTIF_PARTS)[number]> {
  const rawList: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string") {
        rawList.push(item);
      }
    }
  } else if (typeof input === "string") {
    rawList.push(...input.split(/[,\n|/]+/g));
  }

  const normalized = rawList
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => value.replace(/\s+/g, ""))
    .filter((value): value is (typeof VISUAL_MOTIF_PARTS)[number] =>
      VISUAL_MOTIF_PARTS.includes(value as (typeof VISUAL_MOTIF_PARTS)[number]),
    )
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);

  return normalized;
}

function readBrief(input: unknown): VisualSpec["brief"] | undefined {
  if (!isRecord(input)) return undefined;

  const creatureCore = normalizeBriefField(input.creatureCore);
  const combatRole = normalizeBriefField(input.combatRole);
  const temperament = normalizeBriefField(input.temperament);
  const signatureFeature = normalizeBriefField(input.signatureFeature);

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

function normalizeBriefField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 3) return null;
  return trimmed.slice(0, 80);
}

function readNumericObject(
  input: unknown,
  spec: Record<string, [number, number]>,
  roundIntegers: boolean = false,
): Record<string, number> | undefined {
  if (!isRecord(input)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, [min, max]] of Object.entries(spec)) {
    const parsed = readNumber(input[key]);
    if (parsed === null) continue;
    const next = roundIntegers ? Math.round(parsed) : parsed;
    out[key] = clampNumber(next, min, max);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function setOptionalClampedInt(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  min: number,
  max: number,
): void {
  const parsed = readNumber(value);
  if (parsed === null) return;
  target[key] = Math.round(clampNumber(parsed, min, max));
}

function setOptionalHandedness(
  target: Record<string, unknown>,
  value: unknown,
): void {
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (token === "left" || token === "l") {
      target.handedness = -1;
      return;
    }
    if (token === "right" || token === "r") {
      target.handedness = 1;
      return;
    }
  }
  setOptionalClampedInt(target, "handedness", value, -1, 1);
}

function readStringEnum<T extends string>(
  input: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof input !== "string") return undefined;
  const normalized = input.trim();
  if ((allowed as readonly string[]).includes(normalized)) {
    return normalized as T;
  }
  const lowered = normalized.toLowerCase();
  const hit = (allowed as readonly string[]).find((value) => value.toLowerCase() === lowered);
  return hit as T | undefined;
}

function readNonEmptyString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readConfig(env: Record<string, string | undefined>): LlmDesignerConfig {
  const providerRaw = (env.AGEMON_DESIGNER_PROVIDER ?? "local").trim().toLowerCase();
  const provider: DesignerProvider =
    providerRaw === "openai"
      ? "openai"
      : providerRaw === "openrouter"
        ? "openrouter"
        : "local";

  const isOpenRouter = provider === "openrouter";
  const apiKey = isOpenRouter
    ? (env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY ?? "").trim() || null
    : (env.OPENAI_API_KEY ?? "").trim() || null;
  const modelDefault = isOpenRouter ? "openai/gpt-5.2" : "gpt-5-mini";
  const baseUrlDefault = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1";

  return {
    provider,
    model: (env.AGEMON_DESIGNER_MODEL ?? modelDefault).trim(),
    apiKey,
    baseUrl: (env.AGEMON_DESIGNER_BASE_URL ?? baseUrlDefault).trim(),
    siteUrl: (env.AGEMON_DESIGNER_SITE_URL ?? "").trim() || null,
    appName: (env.AGEMON_DESIGNER_APP_NAME ?? "Agemon").trim() || null,
    experimentalRoleHint:
      (env.AGEMON_DESIGNER_EXPERIMENT_ROLE ?? "").trim() || null,
    timeoutMs: clampInteger(parseInteger(env.AGEMON_DESIGNER_TIMEOUT_MS), 0, 300000, 120000),
    maxProfiles: clampInteger(parseInteger(env.AGEMON_DESIGNER_MAX_PROFILES), 1, 200, 24),
  };
}

async function requestProviderVisualSpec(
  fetchImpl: FetchLike,
  config: LlmDesignerConfig,
  prompt: { system: string; user: string; outputSchema: string },
): Promise<unknown> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const controller = config.timeoutMs > 0 ? new AbortController() : null;
  const timeoutId =
    controller && config.timeoutMs > 0
      ? setTimeout(() => controller.abort(), config.timeoutMs)
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.provider === "openrouter") {
    if (config.siteUrl) {
      headers["HTTP-Referer"] = config.siteUrl;
    }
    if (config.appName) {
      headers["X-Title"] = config.appName;
    }
  }

  try {
    const requestBody: Record<string, unknown> = {
      model: config.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt.system },
        {
          role: "user",
          content: `${prompt.user}\n\nSchema:\n${prompt.outputSchema}`,
        },
      ],
    };
    if (config.provider === "openai") {
      requestBody.response_format = { type: "json_object" };
    }

    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(`Designer LLM request timed out after ${config.timeoutMs}ms`);
      }
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `${config.provider.toUpperCase()} HTTP ${response.status}: ${detail.slice(0, 220)}`,
      );
    }

    const payload = await response.json();
    const content = extractAssistantContent(payload);
    return parseJsonLenient(stripCodeFence(content));
  } catch (error) {
    if (isAbortError(error)) {
      const timeoutLabel = config.timeoutMs > 0 ? `${config.timeoutMs}ms` : "no-timeout mode";
      throw new Error(`Designer LLM request aborted (${timeoutLabel})`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function extractAssistantContent(payload: unknown): string {
  const choices = readPath(payload, ["choices"]);
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Missing choices");
  }

  const message = readPath(choices[0], ["message"]);
  const content = readPath(message, ["content"]);

  if (typeof content === "string" && content.trim().length > 0) {
    return content;
  }

  if (Array.isArray(content)) {
    const merged = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const text = readPath(part, ["text"]);
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim();

    if (merged.length > 0) return merged;
  }

  throw new Error("Missing assistant JSON content");
}

function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith("```")) return trimmed;

  const firstNewline = trimmed.indexOf("\n");
  const lastFence = trimmed.lastIndexOf("```");
  if (firstNewline === -1 || lastFence <= firstNewline) {
    return trimmed.replace(/```/g, "").trim();
  }
  return trimmed.slice(firstNewline + 1, lastFence).trim();
}

async function loadDesignerCache(path: string): Promise<DesignerCacheFile> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<DesignerCacheFile>;
    if (
      parsed.version === CACHE_VERSION &&
      parsed.entries &&
      typeof parsed.entries === "object"
    ) {
      return {
        version: CACHE_VERSION,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        entries: parsed.entries as Record<string, VisualSpec>,
      };
    }
  } catch {
    // Ignore cache read errors.
  }

  return {
    version: CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
}

async function saveDesignerCache(path: string, cache: DesignerCacheFile): Promise<void> {
  cache.updatedAt = new Date().toISOString();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cache, null, 2), "utf8");
}

function readPath(input: unknown, path: string[]): unknown {
  let current: unknown = input;
  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function clampInteger(
  value: number | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === null) return fallback;
  return Math.max(min, Math.min(max, value));
}

function parseJsonLenient(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(input.slice(start, end + 1));
    }
    throw new Error("Failed to parse assistant JSON payload");
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; code?: unknown; message?: unknown };
  const name = typeof e.name === "string" ? e.name : "";
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return (
    name === "AbortError" ||
    code === "ABORT_ERR" ||
    message.includes("operation was aborted") ||
    message.includes("aborted")
  );
}
