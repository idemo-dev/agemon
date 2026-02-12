import { describe, it, expect } from "vitest";
import {
  generateCommandMoves,
  generateMcpMoves,
  generatePluginMoves,
  generateReflexMoves,
  generatePassiveSkills,
  generateGuardMoves,
} from "../src/engine/moves.js";
import type {
  DetectedAgemon,
  McpServerInfo,
  HookInfo,
  BaseKnowledge,
  PermissionInfo,
} from "../src/engine/types.js";

function makeDetected(overrides: Partial<DetectedAgemon> = {}): DetectedAgemon {
  return {
    id: "cmd:test",
    name: "test",
    source: "command",
    sourceFile: "/test/test.md",
    scope: "project",
    ...overrides,
  };
}

describe("generateCommandMoves", () => {
  it("returns empty for command with no content", () => {
    const moves = generateCommandMoves(makeDetected());
    expect(moves).toHaveLength(0);
  });

  it("generates attack move from command content", () => {
    const detected = makeDetected({
      rawContent: "Review all code changes for quality and security issues",
    });
    const moves = generateCommandMoves(detected);
    expect(moves).toHaveLength(1);
    expect(moves[0].category).toBe("attack");
    expect(moves[0].type).toBe("mastery");
    expect(moves[0].power).toBeGreaterThan(0);
    expect(moves[0].status).toBe("active");
  });

  it("calculates higher power for richer content", () => {
    const simple = makeDetected({ rawContent: "Simple command" });
    const rich = makeDetected({
      rawContent: `# Review Guide\n\n- Check security\n- Check performance\n\n\`\`\`typescript\nconst x = 1;\n\`\`\`\n\nMore content here with many lines\nLine 1\nLine 2\nLine 3`,
    });
    const simpleMoves = generateCommandMoves(simple);
    const richMoves = generateCommandMoves(rich);
    expect(richMoves[0].power).toBeGreaterThan(simpleMoves[0].power);
  });
});

describe("generateMcpMoves", () => {
  it("generates support move for MCP server", () => {
    const server: McpServerInfo = {
      name: "github",
      scope: "global",
      type: "stdio",
      command: "gh-mcp",
    };
    const moves = generateMcpMoves(server, "global");
    expect(moves).toHaveLength(1);
    expect(moves[0].category).toBe("support");
    expect(moves[0].type).toBe("arsenal");
    expect(moves[0].scope).toBe("global");
  });

  it("increases power with more tools", () => {
    const few: McpServerInfo = {
      name: "fs",
      scope: "project",
      type: "stdio",
      tools: ["read", "write"],
    };
    const many: McpServerInfo = {
      name: "mega",
      scope: "project",
      type: "stdio",
      tools: Array.from({ length: 10 }, (_, i) => `tool-${i}`),
    };
    const fewMoves = generateMcpMoves(few, "project");
    const manyMoves = generateMcpMoves(many, "project");
    expect(manyMoves[0].power).toBeGreaterThan(fewMoves[0].power);
  });
});

describe("generatePluginMoves", () => {
  it("generates support move for plugin", () => {
    const detected = makeDetected({
      id: "plugin:feature-dev",
      name: "feature-dev",
      source: "plugin",
      sourceFile: "/test/settings.json",
    });
    const moves = generatePluginMoves(detected);
    expect(moves).toHaveLength(1);
    expect(moves[0].category).toBe("support");
    expect(moves[0].type).toBe("arsenal");
    expect(moves[0].power).toBe(45);
    expect(moves[0].description).toContain("feature-dev");
  });
});

describe("generateReflexMoves", () => {
  it("generates one reflex move per hook", () => {
    const hooks: HookInfo[] = [
      {
        event: "PreToolUse",
        type: "command",
        content: "echo hello",
        scope: "project",
        sourceFile: "/test",
      },
      {
        event: "PostToolUse",
        type: "script",
        content: "node validate.js",
        scope: "project",
        sourceFile: "/test",
      },
    ];
    const moves = generateReflexMoves(hooks);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.category === "reflex")).toBe(true);
  });
});

describe("generatePassiveSkills", () => {
  it("generates passive moves from knowledge sections", () => {
    const bk: BaseKnowledge = {
      claudeMd: {
        exists: true,
        charCount: 1000,
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
    };
    const moves = generatePassiveSkills(bk, "project");
    expect(moves).toHaveLength(3);
    expect(moves.every((m) => m.category === "passive")).toBe(true);
  });

  it("limits to 5 passive moves", () => {
    const bk: BaseKnowledge = {
      claudeMd: {
        exists: true,
        charCount: 5000,
        sectionCount: 10,
        sections: Array.from({ length: 10 }, (_, i) => `Section ${i}`),
        locations: ["/test/CLAUDE.md"],
      },
      agentsMd: {
        exists: false,
        charCount: 0,
        sectionCount: 0,
        sections: [],
        locations: [],
      },
    };
    const moves = generatePassiveSkills(bk, "project");
    expect(moves.length).toBeLessThanOrEqual(5);
  });
});

describe("generateGuardMoves", () => {
  it("generates guard moves from permissions", () => {
    const perms: PermissionInfo[] = [
      {
        allowedTools: ["Read", "Write"],
        deniedTools: ["Bash"],
        scope: "project",
      },
    ];
    const moves = generateGuardMoves(perms);
    expect(moves).toHaveLength(2); // one for denied, one for allowed
    expect(moves.every((m) => m.category === "guard")).toBe(true);
  });

  it("returns empty for no permissions", () => {
    const moves = generateGuardMoves([]);
    expect(moves).toHaveLength(0);
  });
});
