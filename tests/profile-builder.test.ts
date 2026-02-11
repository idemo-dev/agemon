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
