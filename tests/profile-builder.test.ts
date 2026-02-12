import { describe, it, expect } from "vitest";
import {
  buildAgemonProfile,
  buildAllProfiles,
} from "../src/engine/profile-builder.js";
import type { AgemonScanResult } from "../src/engine/types.js";

function makeScanResult(
  overrides: Partial<AgemonScanResult> = {},
): AgemonScanResult {
  return {
    scanDate: new Date().toISOString(),
    projectPath: "/test",
    baseKnowledge: {
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
    },
    detectedAgemon: [],
    hooks: [],
    permissions: [],
    mcpServers: [],
    plugins: [],
    ...overrides,
  };
}

describe("buildAgemonProfile", () => {
  it("builds complete profile from detected command agemon", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "cmd:review",
          name: "review",
          source: "command",
          sourceFile: "/test/review.md",
          scope: "project",
          rawContent: "Review code for quality",
        },
      ],
    });

    const profile = buildAgemonProfile(scan.detectedAgemon[0], scan);

    expect(profile.id).toBe("cmd:review");
    expect(profile.name).toBe("review");
    expect(profile.displayName).toMatch(/(Mon|Dex|Bot|Kin|Rex)$/);
    expect(profile.source).toBe("command");
    expect(profile.scope).toBe("project");
    expect(profile.level).toBeGreaterThanOrEqual(0);
    expect(profile.xp).toBeGreaterThan(0);
    expect(profile.types.length).toBeGreaterThanOrEqual(1);
    expect(profile.stats).toBeDefined();
    expect(profile.evolution).toBeDefined();
    expect(profile.moves.length).toBeGreaterThan(0);
  });

  it("builds profile for MCP agemon with equipment", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "mcp:github",
          name: "github",
          source: "mcp",
          sourceFile: "/test/settings.json",
          scope: "global",
        },
      ],
      mcpServers: [
        {
          name: "github",
          scope: "global",
          type: "stdio",
          command: "gh-mcp",
        },
      ],
    });

    const profile = buildAgemonProfile(scan.detectedAgemon[0], scan);

    expect(profile.source).toBe("mcp");
    expect(profile.equipment).toHaveLength(1);
    expect(profile.equipment[0].name).toBe("github");
  });

  it("builds profile for plugin agemon", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "plugin:feature-dev",
          name: "feature-dev",
          source: "plugin",
          sourceFile: "/test/settings.json",
          scope: "global",
        },
      ],
    });

    const profile = buildAgemonProfile(scan.detectedAgemon[0], scan);

    expect(profile.source).toBe("plugin");
    expect(profile.id).toBe("plugin:feature-dev");
    expect(profile.displayName).toMatch(/(Mon|Dex|Bot|Kin|Rex)$/);
    expect(profile.xp).toBeGreaterThan(0);
    expect(profile.moves.length).toBeGreaterThan(0);
    expect(profile.equipment).toHaveLength(0);
  });

  it("builds profile for base agemon from CLAUDE.md", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "base:claude-md",
          name: "CLAUDE.md",
          source: "base",
          sourceFile: "/test/CLAUDE.md",
          scope: "project",
          rawContent: "Code Style\nTesting\nSecurity",
        },
      ],
      baseKnowledge: {
        claudeMd: {
          exists: true,
          charCount: 500,
          sectionCount: 3,
          sections: ["Code Style", "Testing", "Security"],
          locations: ["/test/CLAUDE.md"],
        },
        agentsMd: {
          exists: false,
          charCount: 0,
          sectionCount: 0,
          sections: [],
          locations: [],
        },
      },
    });

    const profile = buildAgemonProfile(scan.detectedAgemon[0], scan);

    expect(profile.source).toBe("base");
    expect(profile.id).toBe("base:claude-md");
    expect(profile.xp).toBeGreaterThan(0);
    // Base Agemon should have passive moves from CLAUDE.md sections
    const passiveMoves = profile.moves.filter((m) => m.category === "passive");
    expect(passiveMoves.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input gives same output", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "cmd:test",
          name: "test",
          source: "command",
          sourceFile: "/test/test.md",
          scope: "project",
          rawContent: "Test command",
        },
      ],
    });

    const p1 = buildAgemonProfile(scan.detectedAgemon[0], scan);
    const p2 = buildAgemonProfile(scan.detectedAgemon[0], scan);

    expect(p1.displayName).toBe(p2.displayName);
    expect(p1.xp).toBe(p2.xp);
    expect(p1.types).toEqual(p2.types);
  });
});

describe("buildAllProfiles", () => {
  it("builds profiles for all detected agemon", () => {
    const scan = makeScanResult({
      detectedAgemon: [
        {
          id: "cmd:review",
          name: "review",
          source: "command",
          sourceFile: "/test/review.md",
          scope: "project",
          rawContent: "Review code",
        },
        {
          id: "mcp:github",
          name: "github",
          source: "mcp",
          sourceFile: "/test/settings.json",
          scope: "global",
        },
      ],
      mcpServers: [
        { name: "github", scope: "global", type: "stdio" },
      ],
    });

    const profiles = buildAllProfiles(scan);
    expect(profiles).toHaveLength(2);
    expect(profiles[0].id).toBe("cmd:review");
    expect(profiles[1].id).toBe("mcp:github");
  });

  it("returns empty array for no agemon", () => {
    const profiles = buildAllProfiles(makeScanResult());
    expect(profiles).toHaveLength(0);
  });
});
