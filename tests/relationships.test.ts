import { describe, it, expect } from "vitest";
import { detectRelationships } from "../src/engine/relationships.js";
import type {
  AgemonProfile,
  AgemonScanResult,
  DetectedAgemon,
  HookInfo,
  AgemonRelationship,
} from "../src/engine/types.js";

// Helper to create minimal AgemonProfile for testing
function mockProfile(
  id: string,
  name: string,
  source: "command" | "mcp",
  scope: "global" | "project" = "project",
): AgemonProfile {
  return {
    id,
    name,
    displayName: `${name}Mon`,
    scope,
    source,
    level: 1,
    xp: 0,
    types: ["scholar"],
    stats: {
      knowledge: 50,
      arsenal: 50,
      reflex: 50,
      mastery: 50,
      guard: 50,
      synergy: 50,
    },
    evolution: {
      stage: "baby",
      title: "Hatchling",
      level: 1,
      xp: 0,
      nextLevelXp: 100,
    },
    moves: [],
    equipment: [],
  };
}

// Helper to create minimal DetectedAgemon
function mockDetected(
  id: string,
  name: string,
  source: "command" | "mcp",
  rawContent?: string,
): DetectedAgemon {
  return {
    id,
    name,
    source,
    sourceFile: `/fake/path/${name}`,
    scope: "project",
    rawContent,
  };
}

// Helper to create minimal HookInfo
function mockHook(
  event: string,
  matcher?: string,
): HookInfo {
  return {
    event,
    type: "command",
    matcher,
    content: "echo test",
    scope: "project",
    sourceFile: "/fake/hooks.json",
  };
}

// Helper to create minimal AgemonScanResult
function mockScan(
  detected: DetectedAgemon[],
  hooks: HookInfo[] = [],
): AgemonScanResult {
  return {
    scanDate: new Date().toISOString(),
    projectPath: "/fake/project",
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
    detectedAgemon: detected,
    hooks,
    permissions: [],
    mcpServers: [],
    plugins: [],
  };
}

describe("detectRelationships", () => {
  it("should detect trigger relationship from hook to command (matcher match)", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command");
    const detected = mockDetected("cmd:review", "review", "command");
    const hook = mockHook("PreToolUse", "review");

    const profiles = [reviewCmd];
    const scan = mockScan([detected], [hook]);

    const relationships = detectRelationships(profiles, scan);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      from: "cmd:review",
      to: "cmd:review",
      type: "trigger",
      strength: 80,
      interactions: [],
    });
    expect(relationships[0].reason).toContain("hook");
  });

  it("should detect trigger relationship from hook to MCP (matcher match)", () => {
    const slackMcp = mockProfile("mcp:slack", "slack", "mcp");
    const detected = mockDetected("mcp:slack", "slack", "mcp");
    const hook = mockHook("PostToolUse", "mcp__slack");

    const profiles = [slackMcp];
    const scan = mockScan([detected], [hook]);

    const relationships = detectRelationships(profiles, scan);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      from: "mcp:slack",
      to: "mcp:slack",
      type: "trigger",
      strength: 80,
      interactions: [],
    });
    expect(relationships[0].reason).toContain("hook");
  });

  it("should detect dependency relationship from command to MCP (content reference)", () => {
    const deployCmd = mockProfile("cmd:deploy", "deploy", "command");
    const githubMcp = mockProfile("mcp:github", "github", "mcp");

    const deployDetected = mockDetected(
      "cmd:deploy",
      "deploy",
      "command",
      "Use mcp__github__create_pr to create a pull request",
    );
    const githubDetected = mockDetected("mcp:github", "github", "mcp");

    const profiles = [deployCmd, githubMcp];
    const scan = mockScan([deployDetected, githubDetected]);

    const relationships = detectRelationships(profiles, scan);

    // Should have 1 dependency + 2 shared-scope (bidirectional)
    expect(relationships.length).toBeGreaterThanOrEqual(1);

    const dependencyRel = relationships.find(r => r.type === "dependency");
    expect(dependencyRel).toBeDefined();
    expect(dependencyRel).toMatchObject({
      from: "cmd:deploy",
      to: "mcp:github",
      type: "dependency",
      strength: 60,
    });
    expect(dependencyRel?.reason).toContain("references");
    expect(dependencyRel?.interactions).toBeDefined();
  });

  it("should detect dependency relationship from command to command (content reference)", () => {
    const deployCmd = mockProfile("cmd:deploy", "deploy", "command");
    const buildCmd = mockProfile("cmd:build", "build", "command");

    const deployDetected = mockDetected(
      "cmd:deploy",
      "deploy",
      "command",
      "First run /build then deploy",
    );
    const buildDetected = mockDetected("cmd:build", "build", "command");

    const profiles = [deployCmd, buildCmd];
    const scan = mockScan([deployDetected, buildDetected]);

    const relationships = detectRelationships(profiles, scan);

    // Should have 1 dependency + 2 shared-scope (bidirectional)
    expect(relationships.length).toBeGreaterThanOrEqual(1);

    const dependencyRel = relationships.find(r => r.type === "dependency");
    expect(dependencyRel).toBeDefined();
    expect(dependencyRel).toMatchObject({
      from: "cmd:deploy",
      to: "cmd:build",
      type: "dependency",
      strength: 60,
    });
    expect(dependencyRel?.reason).toContain("references");
    expect(dependencyRel?.interactions).toBeDefined();
  });

  it("should detect shared-scope relationship for same scope agemon", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command", "project");
    const testCmd = mockProfile("cmd:test", "test", "command", "project");

    const reviewDetected = mockDetected("cmd:review", "review", "command");
    const testDetected = mockDetected("cmd:test", "test", "command");

    const profiles = [reviewCmd, testCmd];
    const scan = mockScan([reviewDetected, testDetected]);

    const relationships = detectRelationships(profiles, scan);

    expect(relationships).toHaveLength(2);

    // Should have bidirectional shared-scope relationships
    const sharedScope = relationships.filter(r => r.type === "shared-scope");
    expect(sharedScope).toHaveLength(2);
    expect(sharedScope.every(r => r.strength === 20)).toBe(true);
    expect(sharedScope.every(r => Array.isArray(r.interactions))).toBe(true);
  });

  it("should not create relationships for unrelated agemon", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command");
    const githubMcp = mockProfile("mcp:github", "github", "mcp");

    const reviewDetected = mockDetected(
      "cmd:review",
      "review",
      "command",
      "Review code quality",
    );
    const githubDetected = mockDetected("mcp:github", "github", "mcp");

    const profiles = [reviewCmd, githubMcp];
    const scan = mockScan([reviewDetected, githubDetected]);

    const relationships = detectRelationships(profiles, scan);

    // Should only have shared-scope relationships (same project scope)
    const nonSharedScope = relationships.filter(r => r.type !== "shared-scope");
    expect(nonSharedScope).toHaveLength(0);
  });

  it("should calculate strength correctly: hook=80, content=60, shared-scope=20", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command");
    const deployCmd = mockProfile("cmd:deploy", "deploy", "command");

    const reviewDetected = mockDetected("cmd:review", "review", "command");
    const deployDetected = mockDetected(
      "cmd:deploy",
      "deploy",
      "command",
      "Run /review before deploying",
    );

    const hook = mockHook("PreToolUse", "review");

    const profiles = [reviewCmd, deployCmd];
    const scan = mockScan([reviewDetected, deployDetected], [hook]);

    const relationships = detectRelationships(profiles, scan);

    const triggerRel = relationships.find(r => r.type === "trigger");
    const dependencyRel = relationships.find(r => r.type === "dependency");
    const sharedScopeRel = relationships.find(r => r.type === "shared-scope");

    expect(triggerRel?.strength).toBe(80);
    expect(dependencyRel?.strength).toBe(60);
    expect(sharedScopeRel?.strength).toBe(20);
  });

  it("should not create duplicate relationships (bidirectional deduplication)", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command");
    const testCmd = mockProfile("cmd:test", "test", "command");

    const reviewDetected = mockDetected(
      "cmd:review",
      "review",
      "command",
      "Run /test after review",
    );
    const testDetected = mockDetected(
      "cmd:test",
      "test",
      "command",
      "Use /review before testing",
    );

    const profiles = [reviewCmd, testCmd];
    const scan = mockScan([reviewDetected, testDetected]);

    const relationships = detectRelationships(profiles, scan);

    // Should detect dependencies in both directions + shared-scope
    // dependency: review→test, test→review (2)
    // shared-scope: review↔test (bidirectional, 2)
    // Total: 4 relationships
    expect(relationships.length).toBeGreaterThanOrEqual(2);

    // No exact duplicates (same from, to, type)
    const unique = new Set(
      relationships.map(r => `${r.from}|${r.to}|${r.type}`)
    );
    expect(unique.size).toBe(relationships.length);
  });

  it("should prefer stronger relationships over weaker ones for same pair", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command");
    const reviewDetected = mockDetected(
      "cmd:review",
      "review",
      "command",
      "Review code",
    );
    const hook = mockHook("PreToolUse", "review");

    const profiles = [reviewCmd];
    const scan = mockScan([reviewDetected], [hook]);

    const relationships = detectRelationships(profiles, scan);

    // Should have trigger (80) but not shared-scope (20) for self
    const selfRelationships = relationships.filter(
      r => r.from === "cmd:review" && r.to === "cmd:review"
    );

    // Only trigger relationship should exist
    expect(selfRelationships).toHaveLength(1);
    expect(selfRelationships[0].type).toBe("trigger");
    expect(selfRelationships[0].strength).toBe(80);
  });

  it("should include interactions array in all relationships", () => {
    const reviewCmd = mockProfile("cmd:review", "review", "command", "project");
    const testCmd = mockProfile("cmd:test", "test", "command", "project");

    const reviewDetected = mockDetected("cmd:review", "review", "command");
    const testDetected = mockDetected("cmd:test", "test", "command");

    const profiles = [reviewCmd, testCmd];
    const scan = mockScan([reviewDetected, testDetected]);

    const relationships = detectRelationships(profiles, scan);

    for (const rel of relationships) {
      expect(rel).toHaveProperty("interactions");
      expect(Array.isArray(rel.interactions)).toBe(true);
    }
  });
});
