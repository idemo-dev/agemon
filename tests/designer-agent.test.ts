import { describe, expect, it } from "vitest";
import type { AgemonProfile } from "../src/engine/types.js";
import {
  buildDesignerPrompt,
  clearDesignerCache,
  getDesignerCacheSize,
  resolveDesignedGenome,
  type DesignerAgent,
} from "../src/pixel/designer-agent.js";
import { buildVisualGenome } from "../src/pixel/genome.js";
import {
  BASELINE_DESIGN_MODEL_VERSION,
  VISUAL_SPEC_VERSION,
  mergeVisualSpecIntoGenome,
  validateVisualSpec,
} from "../src/pixel/visual-spec.js";

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

describe("designer-agent", () => {
  it("uses abstract role prompt without named IP", () => {
    const profile = makeProfile();
    const baseGenome = buildVisualGenome(profile);
    const prompt = buildDesignerPrompt(profile, baseGenome);

    expect(prompt.system.toLowerCase()).not.toContain("pokemon");
    expect(prompt.system).toContain("Retro Monster Pixel Art Director");
    expect(prompt.outputSchema).toContain(VISUAL_SPEC_VERSION);
    expect(prompt.outputSchema).toContain("bodyPlan");
    expect(prompt.outputSchema).toContain("motifParts");
  });

  it("injects experimental role hint when provided", () => {
    const profile = makeProfile();
    const baseGenome = buildVisualGenome(profile);
    const prompt = buildDesignerPrompt(
      profile,
      baseGenome,
      "designer-test",
      { experimentalRoleHint: "Pokemon designer mindset" },
    );

    expect(prompt.system).toContain("Experimental role hint");
    expect(prompt.system).toContain("Pokemon designer mindset");
  });

  it("is deterministic and reuses cache for same key", () => {
    clearDesignerCache();
    const profile = makeProfile();
    const baseGenome = buildVisualGenome(profile);

    const first = resolveDesignedGenome(profile, baseGenome);
    expect(first.usedFallback).toBe(false);
    expect(getDesignerCacheSize()).toBe(1);
    expect(first.genome.bodyPlan).toBeTruthy();
    expect(first.genome.motifParts.length).toBeGreaterThan(0);
    expect(first.genome.brief.creatureCore.length).toBeGreaterThan(2);

    const second = resolveDesignedGenome(profile, baseGenome);
    expect(getDesignerCacheSize()).toBe(1);
    expect(second.genome).toEqual(first.genome);
    expect(second.cacheKey).toBe(first.cacheKey);
  });

  it("falls back when visual spec is invalid", () => {
    clearDesignerCache();
    const profile = makeProfile();
    const baseGenome = buildVisualGenome(profile);

    const invalidAgent: DesignerAgent = {
      modelVersion: "designer-invalid-v1",
      design: () => ({
        version: VISUAL_SPEC_VERSION,
        modelVersion: "designer-invalid-v1",
        designSeed: 1,
        poseOffset: 99,
      }),
    };

    const resolved = resolveDesignedGenome(profile, baseGenome, invalidAgent);
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.validationErrors.length).toBeGreaterThan(0);
    expect(resolved.genome.archetype).toBe(baseGenome.archetype);
    expect(resolved.genome.designerModelVersion).toBe(BASELINE_DESIGN_MODEL_VERSION);
  });

  it("prefers embedded profile visualSpec when present", () => {
    clearDesignerCache();
    const profile = makeProfile({
      visualSpec: {
        version: VISUAL_SPEC_VERSION,
        modelVersion: "openai:gpt-5-mini",
        designSeed: 42,
        archetype: "serpent",
        poseOffset: -1,
        composition: {
          headScale: 0.9,
          bodyScale: 1.2,
        },
      },
    });
    const baseGenome = buildVisualGenome(profile);

    const resolved = resolveDesignedGenome(profile, baseGenome);
    expect(resolved.usedFallback).toBe(false);
    expect(resolved.genome.archetype).toBe("serpent");
    expect(resolved.genome.poseOffset).toBe(-1);
    expect(resolved.genome.designerModelVersion).toBe("openai:gpt-5-mini");
  });
});

describe("visual-spec", () => {
  it("validates and merges a valid spec", () => {
    const baseGenome = buildVisualGenome(makeProfile());
    const validation = validateVisualSpec({
      version: VISUAL_SPEC_VERSION,
      modelVersion: "designer-test-v1",
      designSeed: 12345,
      bodyPlan: "mystic",
      motifParts: ["orb", "scarf"],
      brief: {
        creatureCore: "runic chimera",
        combatRole: "midline support",
        temperament: "calm",
        signatureFeature: "orb + scarf",
      },
      archetype: "avian",
      poseOffset: 1,
      paletteBias: {
        baseHueShift: 12,
        accentHueShift: -24,
      },
      composition: {
        headScale: 1.18,
        limbLengthBias: 1,
      },
    });

    expect(validation.ok).toBe(true);
    expect(validation.spec).not.toBeNull();

    const merged = mergeVisualSpecIntoGenome(baseGenome, validation.spec);
    expect(merged.archetype).toBe("avian");
    expect(merged.bodyPlan).toBe("mystic");
    expect(merged.motifParts).toContain("orb");
    expect(merged.poseOffset).toBe(1);
    expect(merged.paletteBias.baseHueShift).toBe(12);
    expect(merged.paletteBias.accentHueShift).toBe(-24);
    expect(merged.composition.headScale).toBeCloseTo(1.18, 2);
    expect(merged.composition.limbLengthBias).toBe(1);
  });

  it("rejects out-of-range values", () => {
    const validation = validateVisualSpec({
      version: VISUAL_SPEC_VERSION,
      modelVersion: "designer-test-v1",
      designSeed: 12345,
      paletteBias: {
        accentHueShift: 999,
      },
    });

    expect(validation.ok).toBe(false);
    expect(validation.spec).toBeNull();
    expect(validation.errors.some((error) => error.includes("accentHueShift"))).toBe(true);
  });
});
