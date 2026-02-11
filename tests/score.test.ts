import { describe, it, expect } from "vitest";
import {
  calculateAgemonXP,
  calculateAgemonStats,
  calculateLevel,
  xpForLevel,
} from "../src/engine/score.js";
import type {
  DetectedAgemon,
  BaseKnowledge,
  HookInfo,
  PermissionInfo,
} from "../src/engine/types.js";

function emptyBaseKnowledge(): BaseKnowledge {
  return {
    claudeMd: {
      exists: false,
      charCount: 0,
      sectionCount: 0,
      sections: [],
      locations: [],
    },
    agentsMd: {
      exists: false,
      charCount: 0,
      sectionCount: 0,
      sections: [],
      locations: [],
    },
  };
}

function makeDetected(
  overrides: Partial<DetectedAgemon> = {},
): DetectedAgemon {
  return {
    id: "cmd:test",
    name: "test",
    source: "command",
    sourceFile: "/test/.claude/commands/test.md",
    scope: "project",
    ...overrides,
  };
}

describe("calculateAgemonXP", () => {
  it("returns base XP for a command with no extras", () => {
    const xp = calculateAgemonXP(
      makeDetected(),
      emptyBaseKnowledge(),
      [],
      [],
    );
    // command base (100) + scope bonus (20) = 120
    expect(xp).toBe(120);
  });

  it("adds XP for raw content depth", () => {
    const detected = makeDetected({ rawContent: "x".repeat(500) });
    const xp = calculateAgemonXP(detected, emptyBaseKnowledge(), [], []);
    // 100 (base) + 10 (500/50=10) + 20 (scope) = 130
    expect(xp).toBe(130);
  });

  it("gives higher base XP for MCP source", () => {
    const detected = makeDetected({
      id: "mcp:github",
      name: "github",
      source: "mcp",
      scope: "global",
    });
    const xp = calculateAgemonXP(detected, emptyBaseKnowledge(), [], []);
    // 120 (MCP base), no scope bonus for global
    expect(xp).toBe(120);
  });

  it("adds XP for base knowledge", () => {
    const bk = emptyBaseKnowledge();
    bk.claudeMd.charCount = 2000;
    bk.agentsMd.charCount = 1000;
    const xp = calculateAgemonXP(makeDetected(), bk, [], []);
    // 10 (claude 2000/200) + 5 (agents 1000/200) + 100 + 20 = 135
    expect(xp).toBe(135);
  });

  it("adds XP for related hooks", () => {
    const hooks: HookInfo[] = [
      {
        event: "PreToolUse",
        type: "command",
        content: "echo hello",
        scope: "project",
        sourceFile: "/test/settings.json",
      },
    ];
    const xp = calculateAgemonXP(makeDetected(), emptyBaseKnowledge(), hooks, []);
    // 100 + 20 + 30 (hook with no matcher = applies to all) = 150
    expect(xp).toBe(150);
  });

  it("adds XP for permissions", () => {
    const perms: PermissionInfo[] = [
      {
        allowedTools: ["Read", "Write"],
        deniedTools: ["Bash"],
        scope: "project",
      },
    ];
    const xp = calculateAgemonXP(
      makeDetected(),
      emptyBaseKnowledge(),
      [],
      perms,
    );
    // 100 + 20 + 30 (3 permissions * 10) = 150
    expect(xp).toBe(150);
  });

  it("adds XP for git history age", () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const xp = calculateAgemonXP(
      makeDetected(),
      emptyBaseKnowledge(),
      [],
      [],
      {
        firstConfigCommit: oneYearAgo.toISOString(),
        totalConfigCommits: 10,
      },
    );
    // 100 + 20 + ~60 (12 months * 5 = 60) = 180
    expect(xp).toBeGreaterThanOrEqual(175);
    expect(xp).toBeLessThanOrEqual(185);
  });
});

describe("calculateLevel", () => {
  it("returns 0 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(0);
  });

  it("returns 5 for 250 XP", () => {
    expect(calculateLevel(250)).toBe(5);
  });

  it("returns 10 for 1000 XP", () => {
    expect(calculateLevel(1000)).toBe(10);
  });
});

describe("xpForLevel", () => {
  it("returns 0 for level 0", () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it("returns 250 for level 5", () => {
    expect(xpForLevel(5)).toBe(250);
  });
});

describe("calculateAgemonStats", () => {
  it("returns stats with base values for minimal agemon", () => {
    const stats = calculateAgemonStats(
      makeDetected(),
      emptyBaseKnowledge(),
      [],
      [],
    );
    expect(stats.knowledge).toBe(0);
    expect(stats.arsenal).toBeGreaterThan(0); // has base score
    expect(stats.reflex).toBe(0);
    expect(stats.mastery).toBeGreaterThan(0); // at least 1 line
    expect(stats.guard).toBe(0);
    expect(stats.synergy).toBeGreaterThan(0); // scope bonus
  });

  it("caps all stats at 100", () => {
    const bk = emptyBaseKnowledge();
    bk.claudeMd = {
      exists: true,
      charCount: 999999,
      sectionCount: 100,
      sections: [],
      locations: ["a", "b", "c"],
    };
    bk.agentsMd = {
      exists: true,
      charCount: 999999,
      sectionCount: 100,
      sections: [],
      locations: ["a"],
    };
    const hooks: HookInfo[] = Array.from({ length: 10 }, (_, i) => ({
      event: `hook-${i}`,
      type: "command" as const,
      content: "test",
      scope: "project" as const,
      sourceFile: "/test",
    }));
    const perms: PermissionInfo[] = [
      {
        allowedTools: Array.from({ length: 50 }, (_, i) => `tool-${i}`),
        deniedTools: [],
        scope: "project",
      },
    ];
    const detected = makeDetected({
      rawContent: "x\n".repeat(200) + "```code```\nif condition then do",
    });

    const stats = calculateAgemonStats(detected, bk, hooks, perms);
    expect(stats.knowledge).toBeLessThanOrEqual(100);
    expect(stats.arsenal).toBeLessThanOrEqual(100);
    expect(stats.reflex).toBeLessThanOrEqual(100);
    expect(stats.mastery).toBeLessThanOrEqual(100);
    expect(stats.guard).toBeLessThanOrEqual(100);
    expect(stats.synergy).toBeLessThanOrEqual(100);
  });
});
