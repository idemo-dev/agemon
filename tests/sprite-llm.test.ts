import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import type { AgemonProfile } from "../src/engine/types.js";
import { hydrateProfilesWithLlmSprites } from "../src/cli/sprite-llm.js";
import { PALETTE } from "../src/pixel/palette.js";

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
      stage: "baby",
      title: "Rookie",
      level: 4,
      xp: 173,
      nextLevelXp: 250,
    },
    moves: [],
    equipment: [],
    ...overrides,
  };
}

describe("sprite-llm", () => {
  it("stays disabled in procedural mode", async () => {
    const profile = makeProfile();
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-sprite-local-"));
    try {
      let called = false;
      const result = await hydrateProfilesWithLlmSprites([profile], projectPath, {
        env: { AGEMON_SPRITE_MODE: "procedural" },
        fetchImpl: async () => {
          called = true;
          throw new Error("should not fetch");
        },
      });

      expect(result.enabled).toBe(false);
      expect(called).toBe(false);
      expect(profile.spriteAsset).toBeUndefined();
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("hydrates sprite asset via OpenRouter-compatible API", async () => {
    const profile = makeProfile();
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-sprite-remote-"));

    try {
      let capturedUrl = "";
      let capturedBody = "";

      const result = await hydrateProfilesWithLlmSprites([profile], projectPath, {
        env: {
          AGEMON_SPRITE_MODE: "llm",
          AGEMON_SPRITE_PROVIDER: "openrouter",
          AGEMON_SPRITE_MODEL: "openai/gpt-5-mini",
          OPENROUTER_API_KEY: "dummy-key",
        },
        fetchImpl: async (input, init) => {
          capturedUrl = String(input);
          capturedBody = typeof init?.body === "string" ? init.body : "";
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify(makeValidDsl(24)),
                  },
                },
              ],
            }),
            text: async () => "",
          };
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.mode).toBe("llm");
      expect(result.provider).toBe("openrouter");
      expect(result.requested).toBeGreaterThanOrEqual(1);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);
      expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(capturedBody).toContain("left-facing 3/4 pose");
      expect(capturedBody).toContain("return DSL format");
      expect(capturedBody).toContain("symbols");

      expect(profile.spriteAsset).toBeDefined();
      expect(profile.spriteAsset?.width).toBe(24);
      expect(profile.spriteAsset?.height).toBe(24);
      expect(profile.spriteAsset?.modelVersion).toBe("openrouter:openai/gpt-5-mini");

      const cacheRaw = await readFile(
        join(projectPath, ".agemon", "llm-sprite-cache.json"),
        "utf8",
      );
      expect(cacheRaw).toContain("openrouter:openai/gpt-5-mini");
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it("reuses sprite cache and skips repeated API calls", async () => {
    const projectPath = await mkdtemp(join(tmpdir(), "agemon-sprite-cache-"));

    try {
      const env = {
        AGEMON_SPRITE_MODE: "llm",
        AGEMON_SPRITE_PROVIDER: "openrouter",
        AGEMON_SPRITE_MODEL: "openai/gpt-5-mini",
        OPENROUTER_API_KEY: "dummy-key",
      };

      await hydrateProfilesWithLlmSprites([makeProfile()], projectPath, {
        env,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(makeValidDsl(24)),
                },
              },
            ],
          }),
          text: async () => "",
        }),
      });

      let called = false;
      const profile = makeProfile();
      const result = await hydrateProfilesWithLlmSprites([profile], projectPath, {
        env,
        fetchImpl: async () => {
          called = true;
          throw new Error("should not be called when cache exists");
        },
      });

      expect(called).toBe(false);
      expect(result.cached).toBe(1);
      expect(result.requested).toBe(0);
      expect(result.applied).toBe(1);
      expect(profile.spriteAsset).toBeDefined();
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });
});

function makeValidDsl(size: number) {
  const rows = Array.from({ length: size }, (_, y) => {
    const chars: string[] = [];
    for (let x = 0; x < size; x++) {
      if (x >= 8 && x <= 14 && y >= 5 && y <= 17) {
        chars.push("B");
      } else if (x >= 10 && x <= 12 && y >= 2 && y <= 5) {
        chars.push("H");
      } else if (x >= 14 && x <= 16 && y >= 10 && y <= 13) {
        chars.push("A");
      } else if (x >= 6 && x <= 7 && y >= 12 && y <= 14) {
        chars.push("S");
      } else {
        chars.push(".");
      }
    }
    return chars.join("");
  });

  return {
    width: size,
    height: size,
    palette: [...PALETTE],
    symbols: {
      ".": 0,
      B: 3,
      H: 4,
      A: 6,
      S: 9,
    },
    rows,
    overlays: [
      { x: 17, y: 11, ch: "A" },
      { x: 17, y: 12, ch: "A" },
    ],
  };
}
