import { describe, it, expect } from "vitest";
import { determineTypes, getTypeLabel } from "../src/engine/type-system.js";
import type { AgemonStats } from "../src/engine/types.js";

function makeStats(overrides: Partial<AgemonStats> = {}): AgemonStats {
  return {
    knowledge: 0,
    arsenal: 0,
    reflex: 0,
    mastery: 0,
    guard: 0,
    synergy: 0,
    ...overrides,
  };
}

describe("determineTypes", () => {
  it("returns scholar for all-zero stats", () => {
    const types = determineTypes(makeStats());
    expect(types).toEqual(["scholar"]);
  });

  it("returns single type when one stat dominates", () => {
    const types = determineTypes(makeStats({ knowledge: 80, arsenal: 20 }));
    expect(types).toEqual(["scholar"]);
  });

  it("returns compound type when two stats are close", () => {
    const types = determineTypes(makeStats({ knowledge: 60, arsenal: 50 }));
    expect(types).toHaveLength(2);
    expect(types).toContain("scholar");
    expect(types).toContain("arsenal");
  });

  it("maps each stat to correct type", () => {
    expect(determineTypes(makeStats({ knowledge: 100 }))).toContain("scholar");
    expect(determineTypes(makeStats({ arsenal: 100 }))).toContain("arsenal");
    expect(determineTypes(makeStats({ reflex: 100 }))).toContain("sentinel");
    expect(determineTypes(makeStats({ mastery: 100 }))).toContain("artisan");
    expect(determineTypes(makeStats({ guard: 100 }))).toContain("guardian");
    expect(determineTypes(makeStats({ synergy: 100 }))).toContain("catalyst");
  });

  it("returns single type when top is exactly 1.5x second", () => {
    const types = determineTypes(makeStats({ knowledge: 90, arsenal: 60 }));
    expect(types).toHaveLength(1);
  });
});

describe("getTypeLabel", () => {
  it("returns correct labels", () => {
    expect(getTypeLabel("scholar")).toBe("Scholar");
    expect(getTypeLabel("arsenal")).toBe("Arsenal");
    expect(getTypeLabel("guardian")).toBe("Guardian");
  });
});
