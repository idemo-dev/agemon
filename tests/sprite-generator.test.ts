import { describe, it, expect } from "vitest";
import { generateSprite, generateMiniSprite } from "../src/pixel/sprite-generator.js";
import { PALETTE, PIXEL_INDEX } from "../src/pixel/palette.js";
import { buildVisualGenome } from "../src/pixel/genome.js";
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
  it("uses embedded spriteAsset when valid", () => {
    const profile = makeProfile("baby", {
      spriteAsset: makeSpriteAsset(24, PIXEL_INDEX.accent),
    });
    const sprite = generateSprite(profile);
    expect(sprite.width).toBe(24);
    expect(sprite.height).toBe(24);
    expect(sprite.layers).toHaveLength(1);
    expect(sprite.layers[0].name).toBe("body");
    expect(sprite.layers[0].pixels[7][9]).toBe(PIXEL_INDEX.accent);
  });

  it("falls back to procedural sprite when spriteAsset is invalid", () => {
    const profile = makeProfile("baby", {
      spriteAsset: makeSpriteAsset(32, PIXEL_INDEX.accent),
    });
    const sprite = generateSprite(profile);
    expect(sprite.width).toBe(24);
    expect(sprite.height).toBe(24);
    expect(sprite.layers.some((layer) => layer.name === "body")).toBe(true);
  });

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

  it("generates a valid per-agent palette", () => {
    const sprite = generateSprite(makeProfile());
    expect(sprite.palette).toHaveLength(PALETTE.length);
    expect(sprite.palette[PIXEL_INDEX.transparent]).toBe("transparent");
    expect(sprite.palette[PIXEL_INDEX.baseMid]).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(sprite.palette[PIXEL_INDEX.accent]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("generates different palettes for different agent identities", () => {
    const a = generateSprite(makeProfile());
    const b = generateSprite(
      makeProfile("baby", {
        id: "cmd:legend",
        name: "legend-core",
        displayName: "LegendRex",
      }),
    );
    expect(a.palette).not.toEqual(b.palette);
  });

  it("is deterministic — same input gives same output", () => {
    const profile = makeProfile();
    const s1 = generateSprite(profile);
    const s2 = generateSprite(profile);
    expect(s1.layers[0].pixels).toEqual(s2.layers[0].pixels);
  });

  it("generates different visuals for different agent identities", () => {
    const base = makeProfile("child");
    const a = generateSprite(base);
    const b = generateSprite(
      makeProfile("child", {
        id: "cmd:deploy",
        name: "deploy",
        displayName: "DeployMon",
      }),
    );

    expect(a.layers.map((layer) => layer.pixels)).not.toEqual(
      b.layers.map((layer) => layer.pixels),
    );
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

    const weaponLayer = sprite.layers.find((layer) => layer.name === "weapon");
    expect(weaponLayer).toBeDefined();
    if (!weaponLayer) return;

    const weaponPixels = weaponLayer.pixels.flatMap((row) => row);
    const visibleCount = weaponPixels.filter((px) => px !== PIXEL_INDEX.transparent).length;
    expect(visibleCount).toBeGreaterThan(24);

    const brightWeaponCount = weaponPixels.filter(
      (px) => px === PIXEL_INDEX.spot || px === PIXEL_INDEX.spotLight || px === PIXEL_INDEX.highlight,
    ).length;
    expect(brightWeaponCount).toBeGreaterThanOrEqual(3);
  });

  it("uses visible accent colors, not only base body colors", () => {
    const sprite = generateSprite(
      makeProfile("child", {
        id: "cmd:toolsmith",
        name: "toolsmith-forge",
        displayName: "ToolsmKin",
        stats: {
          knowledge: 30,
          arsenal: 72,
          reflex: 35,
          mastery: 78,
          guard: 24,
          synergy: 45,
        },
      }),
    );

    const allPixels = sprite.layers.flatMap((layer) =>
      layer.pixels.flatMap((row) => row),
    );
    const visible = allPixels.filter((px) => px !== PIXEL_INDEX.transparent);
    const accentIndexes = new Set<number>([
      PIXEL_INDEX.accent,
      PIXEL_INDEX.accentLight,
      PIXEL_INDEX.accentDark,
      PIXEL_INDEX.spot,
      PIXEL_INDEX.spotLight,
      PIXEL_INDEX.rune,
      PIXEL_INDEX.runeLight,
    ]);
    const accentPx = visible.filter((px) => accentIndexes.has(px));

    const ratio = accentPx.length / Math.max(1, visible.length);
    expect(ratio).toBeGreaterThan(0.06);
  });

  it("has archetype diversity across different agent seeds", () => {
    const archetypes = new Set<string>();

    for (let i = 0; i < 20; i++) {
      const profile = makeProfile("child", {
        id: `cmd:seed-${i}`,
        name: `seed-${i}`,
        displayName: `Seed${i}Mon`,
      });
      archetypes.add(buildVisualGenome(profile).archetype);
    }

    expect(archetypes.size).toBeGreaterThanOrEqual(4);
  });

  it("applies asymmetric 3/4 pose composition", () => {
    const sprite = generateSprite(
      makeProfile("adult", {
        id: "cmd:pose-probe",
        name: "pose-probe",
        displayName: "PoseProbeMon",
      }),
    );

    const width = sprite.width;
    const height = sprite.height;
    const composite: number[][] = Array.from({ length: height }, () =>
      Array(width).fill(PIXEL_INDEX.transparent),
    );

    for (const layer of sprite.layers) {
      for (let y = 0; y < layer.pixels.length; y++) {
        for (let x = 0; x < (layer.pixels[y]?.length ?? 0); x++) {
          const px = layer.pixels[y][x];
          if (px === PIXEL_INDEX.transparent) continue;
          const gx = x + layer.offsetX;
          const gy = y + layer.offsetY;
          if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
            composite[gy][gx] = px;
          }
        }
      }
    }

    let mirrorDiff = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < Math.floor(width / 2); x++) {
        const left = composite[y][x];
        const right = composite[y][width - 1 - x];
        if (left !== right) mirrorDiff++;
      }
    }

    expect(mirrorDiff).toBeGreaterThan(30);
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

function makeSpriteAsset(size: number, color: number) {
  const palette = [...PALETTE];
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      if (x >= 7 && x <= 14 && y >= 5 && y <= 16) {
        return color;
      }
      if (x === 15 && y >= 8 && y <= 12) {
        return PIXEL_INDEX.highlight;
      }
      return PIXEL_INDEX.transparent;
    }),
  );

  return {
    width: size,
    height: size,
    palette,
    layers: [
      {
        name: "body",
        offsetX: 0,
        offsetY: 0,
        pixels,
      },
    ],
  };
}
