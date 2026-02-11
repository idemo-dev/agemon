import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { AgemonProfile } from "../src/engine/types.js";
import { hydrateProfilesWithLlmDesigner } from "../src/cli/designer-llm.js";
import { VISUAL_SPEC_VERSION } from "../src/pixel/visual-spec.js";

function makeProfile(overrides: Partial<AgemonProfile> = {}): AgemonProfile {
  return {
    id: "cmd:test",
    name: "test",
    displayName: "TestMon",
    scope: "project",
    source: "command",
    level: 8,
    xp: 460,
    types: ["guardian", "catalyst"],
    stats: {
      knowledge: 48,
      arsenal: 64,
      reflex: 56,
      mastery: 44,
      guard: 72,
      synergy: 39,
    },
    evolution: {
      stage: "teen",
      title: "Specialist",
      level: 8,
      xp: 460,
      nextLevelXp: 600,
    },
    moves: [],
    equipment: [],
    ...overrides,
  };
}

describe("designer-llm", () => {
  it("generates local visual specs without network requests", async () => {
    let called = false;
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-local-"));
    try {
      const profile = makeProfile();
      const result = await hydrateProfilesWithLlmDesigner([profile], projectPath, {
        env: {
          AGEMON_DESIGNER_PROVIDER: "local",
        },
        fetchImpl: async () => {
          called = true;
          throw new Error("should not be called");
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.provider).toBe("local");
      expect(called).toBe(false);
      expect(result.applied).toBe(1);
      expect(profile.visualSpec).toBeDefined();
      expect(profile.visualSpec?.bodyPlan).toBeTruthy();
      expect(Array.isArray(profile.visualSpec?.motifParts)).toBe(true);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("hydrates visual spec via OpenAI-compatible API and writes cache", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-openai-"));
    try {
      const profile = makeProfile();
      let requestCount = 0;
      const result = await hydrateProfilesWithLlmDesigner([profile], projectPath, {
        env: {
          AGEMON_DESIGNER_PROVIDER: "openai",
          AGEMON_DESIGNER_MODEL: "gpt-5-mini",
          OPENAI_API_KEY: "dummy-key",
          AGEMON_DESIGNER_BASE_URL: "https://api.openai.test/v1",
        },
        fetchImpl: async () => {
          requestCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      version: VISUAL_SPEC_VERSION,
                      modelVersion: "temporary-model",
                      designSeed: 12345,
                      archetype: "avian",
                      poseOffset: 1,
                    }),
                  },
                },
              ],
            }),
            text: async () => "",
          };
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.provider).toBe("openai");
      expect(result.requested).toBe(1);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);
      expect(requestCount).toBe(1);
      expect(profile.visualSpec).toBeDefined();
      expect(profile.visualSpec?.modelVersion).toBe("openai:gpt-5-mini");
      expect(profile.visualSpec?.archetype).toBe("avian");

      const cachePath = join(projectPath, ".agemon", "designer-spec-cache.json");
      const cacheRaw = await readFile(cachePath, "utf8");
      expect(cacheRaw).toContain("\"version\": 1");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("reuses on-disk cache and avoids repeated API requests", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-cache-"));
    try {
      const profile1 = makeProfile();
      const env = {
        AGEMON_DESIGNER_PROVIDER: "openai",
        AGEMON_DESIGNER_MODEL: "gpt-5-mini",
        OPENAI_API_KEY: "dummy-key",
      };

      await hydrateProfilesWithLlmDesigner([profile1], projectPath, {
        env,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    version: VISUAL_SPEC_VERSION,
                    modelVersion: "temporary-model",
                    designSeed: 777,
                    archetype: "brute",
                  }),
                },
              },
            ],
          }),
          text: async () => "",
        }),
      });

      const profile2 = makeProfile();
      let called = false;
      const result = await hydrateProfilesWithLlmDesigner([profile2], projectPath, {
        env,
        fetchImpl: async () => {
          called = true;
          throw new Error("should not fetch when cache exists");
        },
      });

      expect(called).toBe(false);
      expect(result.cached).toBe(1);
      expect(result.requested).toBe(0);
      expect(result.applied).toBe(1);
      expect(profile2.visualSpec?.archetype).toBe("brute");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("supports openrouter provider with dedicated API key and headers", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-openrouter-"));
    try {
      const profile = makeProfile();
      let capturedUrl = "";
      let capturedHeaders: HeadersInit | undefined;
      let capturedBody = "";

      const result = await hydrateProfilesWithLlmDesigner([profile], projectPath, {
        env: {
          AGEMON_DESIGNER_PROVIDER: "openrouter",
          AGEMON_DESIGNER_MODEL: "anthropic/claude-3.7-sonnet",
          OPENROUTER_API_KEY: "openrouter-dummy",
          AGEMON_DESIGNER_SITE_URL: "https://agemon.local",
          AGEMON_DESIGNER_APP_NAME: "Agemon Test",
          AGEMON_DESIGNER_EXPERIMENT_ROLE: "Pokemon designer role for experiment",
        },
        fetchImpl: async (input, init) => {
          capturedUrl = String(input);
          capturedHeaders = init?.headers;
          capturedBody = typeof init?.body === "string" ? init.body : "";
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      version: VISUAL_SPEC_VERSION,
                      modelVersion: "temporary-model",
                      designSeed: 99,
                      archetype: "slender",
                    }),
                  },
                },
              ],
            }),
            text: async () => "",
          };
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.provider).toBe("openrouter");
      expect(result.applied).toBe(1);
      expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
      const headers = normalizeHeaders(capturedHeaders);
      expect(headers.authorization).toBe("Bearer openrouter-dummy");
      expect(headers["http-referer"]).toBe("https://agemon.local");
      expect(headers["x-title"]).toBe("Agemon Test");
      expect(profile.visualSpec?.modelVersion).toBe("openrouter:anthropic/claude-3.7-sonnet");
      expect(capturedBody).toContain("Experimental role hint");
      expect(capturedBody).toContain("Pokemon designer role for experiment");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("normalizes loose remote visual spec values before validation", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-normalize-"));
    try {
      const profile = makeProfile();
      const result = await hydrateProfilesWithLlmDesigner([profile], projectPath, {
        env: {
          AGEMON_DESIGNER_PROVIDER: "openrouter",
          AGEMON_DESIGNER_MODEL: "openai/gpt-5-mini",
          OPENROUTER_API_KEY: "openrouter-dummy",
        },
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    version: "wrong-version",
                    modelVersion: "temporary-model",
                    designSeed: "-12.7",
                    archetype: "AVIAN",
                    silhouette: 9.8,
                    eyeStyle: "5",
                    motifParts: "crest, pack, unknown",
                    brief: {
                      creatureCore: "swift hawk",
                      combatRole: "flank striker",
                      temperament: "focused",
                      signatureFeature: "split crest",
                    },
                  }),
                },
              },
            ],
          }),
          text: async () => "",
        }),
      });

      expect(result.requested).toBe(1);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);
      expect(profile.visualSpec).toBeDefined();
      expect(profile.visualSpec?.modelVersion).toBe("openrouter:openai/gpt-5-mini");
      expect(profile.visualSpec?.designSeed).toBeGreaterThanOrEqual(0);
      expect(profile.visualSpec?.silhouette).toBeGreaterThanOrEqual(0);
      expect(profile.visualSpec?.silhouette).toBeLessThanOrEqual(2);
      expect(profile.visualSpec?.eyeStyle).toBeGreaterThanOrEqual(0);
      expect(profile.visualSpec?.eyeStyle).toBeLessThanOrEqual(3);
      expect(profile.visualSpec?.archetype).toBe("avian");
      expect(profile.visualSpec?.motifParts?.includes("crest")).toBe(true);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("enforces visual diversity for similar local profiles", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-llm-diversity-"));
    try {
      const profiles = [
        makeProfile({ id: "cmd:similar-1", name: "similar-1", displayName: "SimilarOne" }),
        makeProfile({ id: "cmd:similar-2", name: "similar-2", displayName: "SimilarTwo" }),
        makeProfile({ id: "cmd:similar-3", name: "similar-3", displayName: "SimilarThree" }),
      ];

      const result = await hydrateProfilesWithLlmDesigner(profiles, projectPath, {
        env: { AGEMON_DESIGNER_PROVIDER: "local" },
      });

      expect(result.applied).toBe(3);
      const plans = new Set(profiles.map((profile) => profile.visualSpec?.bodyPlan));
      expect(plans.size).toBeGreaterThanOrEqual(2);

      const motifSignatures = new Set(
        profiles.map((profile) => (profile.visualSpec?.motifParts ?? []).join("|")),
      );
      expect(motifSignatures.size).toBeGreaterThanOrEqual(2);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });
});

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([k, v]) => [k.toLowerCase(), String(v)]));
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );
}
