import { describe, it, expect } from "vitest";
import { generateSprite, generateMiniSprite } from "../src/pixel/sprite-generator.js";
import { PALETTE } from "../src/pixel/palette.js";
import type { AgemonProfile, EvolutionStage } from "../src/engine/types.js";

function makeProfile(
  stage: EvolutionStage = "baby",
  overrides: Partial<AgemonProfile> = {},
): AgemonProfile {
  return {
    id: "cmd:test",
    name: "test",
    displayName: "TestMon",
    scope: "project",
    source: "command",
    level: 5,
    xp: 250,
    types: ["scholar"],
    stats: {
      knowledge: 50,
      arsenal: 30,
      reflex: 20,
      mastery: 40,
      guard: 10,
      synergy: 25,
    },
    evolution: {
      stage,
      title: "Rookie",
      level: 5,
      xp: 250,
      nextLevelXp: 360,
    },
    moves: [],
    equipment: [],
    ...overrides,
  };
}

describe("generateSprite", () => {
  it("generates 24x24 sprite for baby stage", () => {
    const sprite = generateSprite(makeProfile("baby"));
    expect(sprite.width).toBe(24);
    expect(sprite.height).toBe(24);
  });

  it("generates 32x32 sprite for child stage", () => {
    const sprite = generateSprite(makeProfile("child"));
    expect(sprite.width).toBe(32);
    expect(sprite.height).toBe(32);
  });

  it("generates 48x48 sprite for adult stage", () => {
    const sprite = generateSprite(makeProfile("adult"));
    expect(sprite.width).toBe(48);
    expect(sprite.height).toBe(48);
  });

  it("generates 48x48 sprite for ultimate stage", () => {
    const sprite = generateSprite(makeProfile("ultimate"));
    expect(sprite.width).toBe(48);
    expect(sprite.height).toBe(48);
    // Ultimate should have aura layer
    const layerNames = sprite.layers.map((l) => l.name);
    expect(layerNames).toContain("aura");
  });

  it("uses the shared palette", () => {
    const sprite = generateSprite(makeProfile());
    expect(sprite.palette).toEqual(PALETTE);
  });

  it("is deterministic — same input gives same output", () => {
    const profile = makeProfile();
    const s1 = generateSprite(profile);
    const s2 = generateSprite(profile);
    expect(s1.layers[0].pixels).toEqual(s2.layers[0].pixels);
  });

  it("all pixel values are valid palette indices", () => {
    const stages: EvolutionStage[] = [
      "baby",
      "child",
      "teen",
      "adult",
      "ultimate",
    ];
    for (const stage of stages) {
      const sprite = generateSprite(makeProfile(stage));
      for (const layer of sprite.layers) {
        for (const row of layer.pixels) {
          for (const px of row) {
            expect(px).toBeGreaterThanOrEqual(0);
            expect(px).toBeLessThan(PALETTE.length);
          }
        }
      }
    }
  });

  it("adds weapon layer for teen+ with high arsenal", () => {
    const profile = makeProfile("teen", {
      stats: {
        knowledge: 20,
        arsenal: 80,
        reflex: 20,
        mastery: 30,
        guard: 10,
        synergy: 20,
      },
    });
    const sprite = generateSprite(profile);
    const layerNames = sprite.layers.map((l) => l.name);
    expect(layerNames).toContain("weapon");
  });
});

describe("generateMiniSprite", () => {
  it("generates 8x8 mini sprite", () => {
    const mini = generateMiniSprite(makeProfile());
    expect(mini.width).toBe(8);
    expect(mini.height).toBe(8);
    expect(mini.layers).toHaveLength(1);
    expect(mini.layers[0].pixels).toHaveLength(8);
    expect(mini.layers[0].pixels[0]).toHaveLength(8);
  });

  it("mini sprite pixel values are valid", () => {
    const mini = generateMiniSprite(makeProfile("adult"));
    for (const row of mini.layers[0].pixels) {
      for (const px of row) {
        expect(px).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThan(PALETTE.length);
      }
    }
  });
});
