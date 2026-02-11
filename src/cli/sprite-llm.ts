import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AgemonProfile, StoredSpriteAsset } from "../engine/types.js";
import { STAGE_SIZES } from "../pixel/parts.js";
import {
  evaluateSpriteAssetQuality,
  validateSpriteAsset,
} from "../pixel/sprite-asset.js";
import { compileSpriteDsl } from "../pixel/sprite-dsl.js";
import { generateProceduralSprite } from "../pixel/sprite-generator.js";

const CACHE_VERSION = 1;
const CACHE_RELATIVE_PATH = ".agemon/llm-sprite-cache.json";
const DEFAULT_SPRITE_MAX_RETRIES = 2;
const DEFAULT_SPRITE_MIN_QUALITY = 0.65;

type SpriteMode = "procedural" | "llm";
type SpriteProvider = "openai" | "openrouter";

interface LlmSpriteConfig {
  mode: SpriteMode;
  provider: SpriteProvider;
  model: string;
  apiKey: string | null;
  baseUrl: string;
  siteUrl: string | null;
  appName: string | null;
  experimentalRoleHint: string | null;
  timeoutMs: number;
  maxProfiles: number;
  maxRetries: number;
  minQuality: number;
}

interface SpriteCacheFile {
  version: number;
  updatedAt: string;
  entries: Record<string, StoredSpriteAsset>;
}

export interface LlmSpriteHydrationResult {
  enabled: boolean;
  mode: SpriteMode;
  provider: SpriteProvider;
  model: string;
  requested: number;
  applied: number;
  cached: number;
  failed: number;
  skipped: number;
}

interface LlmSpriteHydrationOptions {
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

export async function hydrateProfilesWithLlmSprites(
  profiles: AgemonProfile[],
  projectPath: string,
  options: LlmSpriteHydrationOptions = {},
): Promise<LlmSpriteHydrationResult> {
  const config = readConfig(options.env ?? process.env);
  const trace = (options.env ?? process.env).AGEMON_LLM_TRACE === "1";
  const result: LlmSpriteHydrationResult = {
    enabled: config.mode === "llm",
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    requested: 0,
    applied: 0,
    cached: 0,
    failed: 0,
    skipped: 0,
  };

  if (config.mode !== "llm") {
    return result;
  }

  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  const canUseRemote = Boolean(config.apiKey) && typeof fetchImpl === "function";
  const providerModelVersion = `${config.provider}:${config.model}`;

  const targets = profiles.slice(0, config.maxProfiles);
  if (!canUseRemote) {
    result.skipped = targets.length;
    return result;
  }

  const cachePath = resolve(projectPath, CACHE_RELATIVE_PATH);
  const cache = await loadSpriteCache(cachePath);
  let cacheDirty = false;

  for (const profile of targets) {
    const expectedSize = STAGE_SIZES[profile.evolution.stage];
    const procedural = generateProceduralSprite(profile);
    const cacheKey = getSpriteCacheKey(profile, providerModelVersion);

    const cachedAsset = cache.entries[cacheKey];
    if (cachedAsset) {
      const validated = validateSpriteAsset(cachedAsset, expectedSize);
      if (validated.ok && validated.asset) {
        const quality =
          typeof cachedAsset.qualityScore === "number"
            ? cachedAsset.qualityScore
            : evaluateSpriteAssetQuality(validated.asset).score;
        if (quality >= config.minQuality) {
          profile.spriteAsset = {
            ...validated.asset,
            modelVersion: cachedAsset.modelVersion ?? providerModelVersion,
            qualityScore: quality,
          };
          result.cached++;
          result.applied++;

          if (
            cachedAsset.qualityScore !== quality ||
            cachedAsset.modelVersion !== profile.spriteAsset.modelVersion
          ) {
            cache.entries[cacheKey] = profile.spriteAsset;
            cacheDirty = true;
          }
          continue;
        }
      }
    }

    let accepted: StoredSpriteAsset | null = null;
    let feedback: string[] = [];

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        result.requested++;
        const prompt = buildSpritePrompt(profile, {
          expectedSize,
          palette: procedural.palette,
          modelVersion: providerModelVersion,
          roleHint: config.experimentalRoleHint,
          attempt,
          feedback,
        });
        const raw = await requestProviderSpriteAsset(fetchImpl as FetchLike, config, prompt);
        const decoded = decodeSpritePayload(raw, expectedSize, procedural.palette);
        if (!decoded.ok || !decoded.asset) {
          feedback = decoded.errors;
          if (trace) {
            console.warn(
              `  [Agemon][sprite][${profile.displayName}] attempt=${attempt + 1} decode failed: ${feedback.slice(0, 3).join(" | ")}`,
            );
          }
          continue;
        }

        const quality = evaluateSpriteAssetQuality(decoded.asset);
        if (quality.score < config.minQuality) {
          feedback = quality.issues;
          if (trace) {
            console.warn(
              `  [Agemon][sprite][${profile.displayName}] attempt=${attempt + 1} quality low (${quality.score.toFixed(2)}): ${feedback.slice(0, 3).join(" | ")}`,
            );
          }
          continue;
        }

        accepted = {
          ...decoded.asset,
          modelVersion: providerModelVersion,
          qualityScore: quality.score,
        };
        break;
      } catch (error) {
        feedback = [error instanceof Error ? error.message : "LLM request failed"];
        if (trace) {
          console.warn(
            `  [Agemon][sprite][${profile.displayName}] attempt=${attempt + 1} request failed: ${feedback[0]}`,
          );
        }
      }
    }

    if (!accepted) {
      result.failed++;
      continue;
    }

    profile.spriteAsset = accepted;
    cache.entries[cacheKey] = accepted;
    cacheDirty = true;
    result.applied++;
  }

  if (cacheDirty) {
    await saveSpriteCache(cachePath, cache);
  }

  return result;
}

function getSpriteCacheKey(profile: AgemonProfile, providerModelVersion: string): string {
  const statSignature = [
    profile.stats.knowledge,
    profile.stats.arsenal,
    profile.stats.reflex,
    profile.stats.mastery,
    profile.stats.guard,
    profile.stats.synergy,
  ].join(":");
  const visualSignature = profile.visualSpec
    ? `${profile.visualSpec.modelVersion}:${profile.visualSpec.designSeed}`
    : "no-visual-spec";
  const seedInput = [
    providerModelVersion,
    profile.id,
    profile.name,
    profile.displayName,
    profile.evolution.stage,
    profile.level,
    profile.types.join(","),
    statSignature,
    visualSignature,
  ].join("|");

  return seedInput;
}

function buildSpritePrompt(
  profile: AgemonProfile,
  options: {
    expectedSize: number;
    palette: string[];
    modelVersion: string;
    roleHint: string | null;
    attempt: number;
    feedback: string[];
  },
): { system: string; user: string; outputSchema: string } {
  const { expectedSize, palette, modelVersion, roleHint, attempt, feedback } = options;
  const brief = profile.visualSpec?.brief;
  const motifParts = profile.visualSpec?.motifParts?.join(", ") || "none";
  const feedbackLine =
    feedback.length > 0
      ? `Fix previous issues: ${feedback.slice(0, 5).join("; ")}`
      : "No previous issues.";

  const system = [
    "You generate original pixel-art monster sprites for a game.",
    "Output strict JSON only. No markdown or explanations.",
    "Keep a clear silhouette and contiguous pixel clusters.",
    "Use a left-facing 3/4 pose with strong asymmetry.",
    "Avoid one-pixel noise and avoid mirrored full-front poses.",
  ].join(" ");

  const user = [
    `Model version: ${modelVersion}`,
    `Target sprite size: ${expectedSize}x${expectedSize}`,
    `Agemon: ${profile.displayName} (${profile.source.toUpperCase()} / ${profile.name})`,
    `Evolution: ${profile.evolution.stage}, Level ${profile.level}`,
    `Types: ${profile.types.join(", ")}`,
    `Stats: knowledge=${profile.stats.knowledge}, arsenal=${profile.stats.arsenal}, reflex=${profile.stats.reflex}, mastery=${profile.stats.mastery}, guard=${profile.stats.guard}, synergy=${profile.stats.synergy}`,
    `Design brief: core=${brief?.creatureCore ?? "adaptive monster"}, role=${brief?.combatRole ?? "balanced skirmisher"}, temperament=${brief?.temperament ?? "focused"}, signature=${brief?.signatureFeature ?? motifParts}`,
    `Motifs: ${motifParts}`,
    `Attempt: ${attempt + 1}`,
    feedbackLine,
    "Palette rule: use exactly this palette array as-is (same order, same values).",
    JSON.stringify(palette),
    "Sprite constraints:",
    "- width and height must match target size",
    "- return DSL format (symbols + rows), not numeric pixel matrix",
    "- symbols must include '.' => 0",
    "- rows must be string[] with exactly target size rows and width",
    "- overlays optional for local edits: [{ x, y, ch, layer? }]",
    "- include readable head/body/limb separation",
    "- if arsenal >= 55, include a clearly visible held tool or weapon silhouette",
  ].join("\n");

  if (roleHint) {
    return {
      system: `${system}\n\nExperimental role hint: ${roleHint}`,
      user,
      outputSchema: buildOutputSchema(expectedSize),
    };
  }

  return {
    system,
    user,
    outputSchema: buildOutputSchema(expectedSize),
  };
}

function buildOutputSchema(size: number): string {
  return [
    "Return JSON object with fields:",
    `- width: ${size}`,
    `- height: ${size}`,
    "- palette: string[16]",
    "- symbols: object mapping one-char symbol -> palette index (0..15), must contain '.' as 0",
    `- rows: string[${size}] where each string length is ${size}`,
    "- overlays (optional): array of { x: number, y: number, ch: string, layer?: string }",
    "- or, instead of rows, layers: [{ name, offsetX, offsetY, rows: string[size] }]",
  ].join("\n");
}

function decodeSpritePayload(
  raw: unknown,
  expectedSize: number,
  fallbackPalette: string[],
): { ok: boolean; asset: StoredSpriteAsset | null; errors: string[] } {
  const direct = validateSpriteAsset(raw, expectedSize);
  if (direct.ok && direct.asset) {
    return { ok: true, asset: direct.asset, errors: [] };
  }

  const compiled = compileSpriteDsl(raw, {
    expectedSize,
    fallbackPalette,
  });
  if (!compiled.ok || !compiled.asset) {
    return {
      ok: false,
      asset: null,
      errors: dedupeErrors([...direct.errors, ...compiled.errors]),
    };
  }

  const validation = validateSpriteAsset(compiled.asset, expectedSize);
  if (!validation.ok || !validation.asset) {
    return {
      ok: false,
      asset: null,
      errors: dedupeErrors([...direct.errors, ...validation.errors]),
    };
  }

  return { ok: true, asset: validation.asset, errors: [] };
}

async function requestProviderSpriteAsset(
  fetchImpl: FetchLike,
  config: LlmSpriteConfig,
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
    if (config.siteUrl) headers["HTTP-Referer"] = config.siteUrl;
    if (config.appName) headers["X-Title"] = config.appName;
  }

  try {
    const requestBody: Record<string, unknown> = {
      model: config.model,
      temperature: 0.45,
      max_tokens: 4096,
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
        throw new Error(`Sprite LLM request timed out after ${config.timeoutMs}ms`);
      }
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `${config.provider.toUpperCase()} HTTP ${response.status}: ${detail.slice(0, 260)}`,
      );
    }

    const payload = await response.json();
    const content = extractAssistantContent(payload);
    return parseJsonLenient(stripCodeFence(content));
  } catch (error) {
    if (isAbortError(error)) {
      const timeoutLabel = config.timeoutMs > 0 ? `${config.timeoutMs}ms` : "no-timeout mode";
      throw new Error(`Sprite LLM request aborted (${timeoutLabel})`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function readConfig(env: Record<string, string | undefined>): LlmSpriteConfig {
  const modeRaw = (env.AGEMON_SPRITE_MODE ?? "procedural").trim().toLowerCase();
  const mode: SpriteMode = modeRaw === "llm" ? "llm" : "procedural";

  const providerRaw = (env.AGEMON_SPRITE_PROVIDER ?? env.AGEMON_DESIGNER_PROVIDER ?? "openrouter")
    .trim()
    .toLowerCase();
  const provider: SpriteProvider = providerRaw === "openai" ? "openai" : "openrouter";

  const isOpenRouter = provider === "openrouter";
  const baseUrlDefault = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1";
  const modelDefault = isOpenRouter ? "openai/gpt-5-mini" : "gpt-5-mini";

  const apiKey = isOpenRouter
    ? (env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY ?? "").trim() || null
    : (env.OPENAI_API_KEY ?? "").trim() || null;

  return {
    mode,
    provider,
    model: (env.AGEMON_SPRITE_MODEL ?? modelDefault).trim(),
    apiKey,
    baseUrl: (env.AGEMON_SPRITE_BASE_URL ?? baseUrlDefault).trim(),
    siteUrl: (env.AGEMON_SPRITE_SITE_URL ?? env.AGEMON_DESIGNER_SITE_URL ?? "").trim() || null,
    appName: (env.AGEMON_SPRITE_APP_NAME ?? env.AGEMON_DESIGNER_APP_NAME ?? "Agemon").trim() || null,
    experimentalRoleHint:
      (env.AGEMON_SPRITE_EXPERIMENT_ROLE ?? env.AGEMON_DESIGNER_EXPERIMENT_ROLE ?? "").trim() ||
      null,
    timeoutMs: clampInteger(parseInteger(env.AGEMON_SPRITE_TIMEOUT_MS), 0, 300000, 120000),
    maxProfiles: clampInteger(parseInteger(env.AGEMON_SPRITE_MAX_PROFILES), 1, 200, 24),
    maxRetries: clampInteger(
      parseInteger(env.AGEMON_SPRITE_MAX_RETRIES),
      0,
      5,
      DEFAULT_SPRITE_MAX_RETRIES,
    ),
    minQuality: clampNumber(
      parseFloatSafe(env.AGEMON_SPRITE_MIN_QUALITY),
      0.2,
      0.95,
      DEFAULT_SPRITE_MIN_QUALITY,
    ),
  };
}

async function loadSpriteCache(path: string): Promise<SpriteCacheFile> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<SpriteCacheFile>;
    if (parsed.version === CACHE_VERSION && parsed.entries && typeof parsed.entries === "object") {
      return {
        version: CACHE_VERSION,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        entries: parsed.entries as Record<string, StoredSpriteAsset>,
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

async function saveSpriteCache(path: string, cache: SpriteCacheFile): Promise<void> {
  cache.updatedAt = new Date().toISOString();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cache, null, 2), "utf8");
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

    if (merged.length > 0) {
      return merged;
    }
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

function parseFloatSafe(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
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

function clampNumber(
  value: number | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === null) return fallback;
  return Math.max(min, Math.min(max, value));
}

function dedupeErrors(errors: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const item of errors) {
    const normalized = item.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    list.push(normalized);
  }
  return list;
}

function parseJsonLenient(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    const start = input.indexOf("{");
    const end = input.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = input.slice(start, end + 1);
      return JSON.parse(sliced);
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
