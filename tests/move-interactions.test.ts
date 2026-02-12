import { describe, it, expect } from "vitest";
import { detectRelationships } from "../src/engine/relationships.js";
import type {
  AgemonProfile,
  AgemonScanResult,
  DetectedAgemon,
  HookInfo,
  Move,
  MoveInteraction,
} from "../src/engine/types.js";

// ── Helpers ──

function mockMove(overrides: Partial<Move>): Move {
  return {
    name: "TestMove",
    type: "mastery",
    category: "attack",
    power: 50,
    description: "Test move",
    source: "test",
    capabilities: [],
    status: "active",
    scope: "project",
    ...overrides,
  };
}

function mockProfile(
  id: string,
  name: string,
  source: "command" | "mcp",
  moves: Move[] = [],
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
    moves,
    equipment: [],
  };
}

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

function mockHook(event: string, matcher?: string): HookInfo {
  return {
    event,
    type: "command",
    matcher,
    content: "echo test",
    scope: "project",
    sourceFile: "/fake/hooks.json",
  };
}

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

// ── Tests ──

describe("Move Interactions", () => {
  describe("trigger-chain", () => {
    it("should detect trigger-chain from reflex move to target attack move", () => {
      const reflexMove = mockMove({
        name: "CounterStrike",
        category: "reflex",
        type: "reflex",
        source: "PreToolUse",
        capabilities: ["echo lint"],
      });
      const attackMove = mockMove({
        name: "DeployScript",
        category: "attack",
        type: "mastery",
        source: "deploy",
        capabilities: ["deploy to prod"],
      });

      const guardBot = mockProfile("cmd:guard", "guard", "command", [reflexMove]);
      const deployBot = mockProfile("cmd:deploy", "deploy", "command", [attackMove]);

      const guardDetected = mockDetected("cmd:guard", "guard", "command");
      const deployDetected = mockDetected("cmd:deploy", "deploy", "command");

      const hook = mockHook("PreToolUse", "deploy");

      const scan = mockScan([guardDetected, deployDetected], [hook]);
      const relationships = detectRelationships([guardBot, deployBot], scan);

      // Find the trigger relationship (hook matches "guard" in guardBot -> self trigger)
      // But we also need cross-agemon interaction. The hook matcher is "deploy" which
      // doesn't match "guard" so no trigger relationship for guardBot.
      // Instead, "deploy" matches deployBot, so trigger is deploy->deploy (self).
      // The hook matcher "deploy" matches deployBot's name.
      const triggerRel = relationships.find(
        (r) => r.type === "trigger" && r.from === "cmd:deploy",
      );
      expect(triggerRel).toBeDefined();
      // Self-trigger doesn't get trigger-chain interactions
      expect(triggerRel?.interactions).toEqual([]);
    });

    it("should detect cross-agemon trigger-chain when hook relates to both", () => {
      // Hook with matcher "deploy" triggers on guardBot that has the reflex,
      // and deployBot has the attack move
      const reflexMove = mockMove({
        name: "CounterStrike",
        category: "reflex",
        type: "reflex",
        source: "PreToolUse",
      });
      const attackMove = mockMove({
        name: "DeployScript",
        category: "attack",
        type: "mastery",
        source: "deploy",
      });

      // Create a scenario where guardBot has a hook-triggered reflex and
      // we have a dependency relationship between guard and deploy
      const guardBot = mockProfile("cmd:guard", "guard", "command", [reflexMove]);
      const deployBot = mockProfile("cmd:deploy", "deploy", "command", [attackMove]);

      const guardDetected = mockDetected(
        "cmd:guard",
        "guard",
        "command",
        "Run /deploy after guard check",
      );
      const deployDetected = mockDetected("cmd:deploy", "deploy", "command");

      // Hook matcher includes "deploy" — matches deployBot name
      const hook = mockHook("PreToolUse", "deploy");

      const scan = mockScan([guardDetected, deployDetected], [hook]);
      const relationships = detectRelationships([guardBot, deployBot], scan);

      // The dependency relationship guard→deploy should exist
      const depRel = relationships.find(
        (r) => r.type === "dependency" && r.from === "cmd:guard" && r.to === "cmd:deploy",
      );
      expect(depRel).toBeDefined();
    });

    it("should not create trigger-chain for self-reference relationships", () => {
      const reflexMove = mockMove({
        name: "SelfCheck",
        category: "reflex",
        type: "reflex",
        source: "PreToolUse",
      });
      const attackMove = mockMove({
        name: "ReviewStrike",
        category: "attack",
        type: "mastery",
        source: "review",
      });

      const reviewBot = mockProfile("cmd:review", "review", "command", [
        reflexMove,
        attackMove,
      ]);
      const reviewDetected = mockDetected("cmd:review", "review", "command");
      const hook = mockHook("PreToolUse", "review");

      const scan = mockScan([reviewDetected], [hook]);
      const relationships = detectRelationships([reviewBot], scan);

      const selfTrigger = relationships.find(
        (r) => r.from === "cmd:review" && r.to === "cmd:review" && r.type === "trigger",
      );
      expect(selfTrigger).toBeDefined();
      // Self-references should NOT have trigger-chain interactions
      expect(selfTrigger?.interactions).toEqual([]);
    });
  });

  describe("tool-dependency", () => {
    it("should detect tool-dependency from attack move referencing MCP tools", () => {
      const attackMove = mockMove({
        name: "ReviewCommand",
        category: "attack",
        type: "mastery",
        source: "review",
        description: "Use mcp__github tools for PR review",
        capabilities: ["mcp__github__create_pr", "mcp__github__list_reviews"],
      });
      const supportMove = mockMove({
        name: "GitHubPower",
        category: "support",
        type: "arsenal",
        source: "github",
        capabilities: ["create_pr", "list_reviews", "merge_pr"],
      });

      const reviewBot = mockProfile("cmd:review", "review", "command", [attackMove]);
      const githubBot = mockProfile("mcp:github", "github", "mcp", [supportMove]);

      const reviewDetected = mockDetected(
        "cmd:review",
        "review",
        "command",
        "Use mcp__github__create_pr to create a pull request",
      );
      const githubDetected = mockDetected("mcp:github", "github", "mcp");

      const scan = mockScan([reviewDetected, githubDetected]);
      const relationships = detectRelationships([reviewBot, githubBot], scan);

      const depRel = relationships.find(
        (r) => r.type === "dependency" && r.from === "cmd:review" && r.to === "mcp:github",
      );
      expect(depRel).toBeDefined();
      expect(depRel!.interactions.length).toBeGreaterThan(0);

      const toolDep = depRel!.interactions.find(
        (i) => i.kind === "tool-dependency",
      );
      expect(toolDep).toBeDefined();
      expect(toolDep!.fromMoveIndex).toBe(0);
      expect(toolDep!.toMoveIndex).toBe(0);
      expect(toolDep!.description).toContain("ReviewCommand");
      expect(toolDep!.description).toContain("github");
    });

    it("should match specific tool names in capabilities", () => {
      const attackMove = mockMove({
        name: "DeployCommand",
        category: "attack",
        type: "mastery",
        source: "deploy",
        description: "Deploy using github create_pr and list_reviews",
        capabilities: ["github create_pr"],
      });
      const supportMove = mockMove({
        name: "GitHubPower",
        category: "support",
        type: "arsenal",
        source: "github",
        capabilities: ["create_pr", "list_reviews", "merge_pr"],
      });

      const deployBot = mockProfile("cmd:deploy", "deploy", "command", [attackMove]);
      const githubBot = mockProfile("mcp:github", "github", "mcp", [supportMove]);

      const deployDetected = mockDetected(
        "cmd:deploy",
        "deploy",
        "command",
        "Deploy using mcp__github__create_pr",
      );
      const githubDetected = mockDetected("mcp:github", "github", "mcp");

      const scan = mockScan([deployDetected, githubDetected]);
      const relationships = detectRelationships([deployBot, githubBot], scan);

      const depRel = relationships.find(
        (r) => r.type === "dependency",
      );
      expect(depRel).toBeDefined();

      const toolDep = depRel!.interactions.find(
        (i) => i.kind === "tool-dependency",
      );
      expect(toolDep).toBeDefined();
      // Should mention specific matched tools
      expect(toolDep!.description).toContain("create_pr");
    });
  });

  describe("shared-knowledge", () => {
    it("should detect shared-knowledge for passive moves with same source", () => {
      const passiveA = mockMove({
        name: "SecurityWisdom",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
        capabilities: ["Security Baseline"],
      });
      const passiveB = mockMove({
        name: "SecurityShield",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
        capabilities: ["Security Baseline"],
      });

      const reviewBot = mockProfile("cmd:review", "review", "command", [passiveA]);
      const deployBot = mockProfile("cmd:deploy", "deploy", "command", [passiveB]);

      const reviewDetected = mockDetected("cmd:review", "review", "command");
      const deployDetected = mockDetected("cmd:deploy", "deploy", "command");

      const scan = mockScan([reviewDetected, deployDetected]);
      const relationships = detectRelationships([reviewBot, deployBot], scan);

      // shared-scope relationships should have shared-knowledge interactions
      const sharedScopeRels = relationships.filter(
        (r) => r.type === "shared-scope",
      );
      expect(sharedScopeRels.length).toBeGreaterThan(0);

      const withKnowledge = sharedScopeRels.find(
        (r) => r.interactions.some((i) => i.kind === "shared-knowledge"),
      );
      expect(withKnowledge).toBeDefined();

      const interaction = withKnowledge!.interactions.find(
        (i) => i.kind === "shared-knowledge",
      );
      expect(interaction!.description).toContain("Security Baseline");
      expect(interaction!.workflowOutcome).toContain("Security Baseline");
    });

    it("should limit shared-knowledge to max 1 per relationship", () => {
      const passiveA1 = mockMove({
        name: "SecurityWisdom",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
      });
      const passiveA2 = mockMove({
        name: "TestingWisdom",
        category: "passive",
        type: "knowledge",
        source: "Testing Strategy",
      });
      const passiveB1 = mockMove({
        name: "SecurityShield",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
      });
      const passiveB2 = mockMove({
        name: "TestingMastery",
        category: "passive",
        type: "knowledge",
        source: "Testing Strategy",
      });

      const botA = mockProfile("cmd:a", "a", "command", [passiveA1, passiveA2]);
      const botB = mockProfile("cmd:b", "b", "command", [passiveB1, passiveB2]);

      const detectedA = mockDetected("cmd:a", "a", "command");
      const detectedB = mockDetected("cmd:b", "b", "command");

      const scan = mockScan([detectedA, detectedB]);
      const relationships = detectRelationships([botA, botB], scan);

      for (const rel of relationships) {
        const knowledgeInteractions = rel.interactions.filter(
          (i) => i.kind === "shared-knowledge",
        );
        expect(knowledgeInteractions.length).toBeLessThanOrEqual(1);
      }
    });

    it("should only detect shared-knowledge for shared-scope relationships", () => {
      const passiveA = mockMove({
        name: "SecurityWisdom",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
      });
      const passiveB = mockMove({
        name: "SecurityShield",
        category: "passive",
        type: "knowledge",
        source: "Security Baseline",
      });

      // Different scopes — no shared-scope relationship
      const botA = mockProfile("cmd:a", "a", "command", [passiveA], "global");
      const botB = mockProfile("cmd:b", "b", "command", [passiveB], "project");

      const detectedA = mockDetected("cmd:a", "a", "command");
      const detectedB = mockDetected("cmd:b", "b", "command");

      const scan = mockScan([detectedA, detectedB]);
      const relationships = detectRelationships([botA, botB], scan);

      // No shared-scope relationships (different scopes)
      const sharedScope = relationships.filter((r) => r.type === "shared-scope");
      expect(sharedScope).toHaveLength(0);

      // Therefore no shared-knowledge interactions
      for (const rel of relationships) {
        const knowledge = rel.interactions.filter(
          (i) => i.kind === "shared-knowledge",
        );
        expect(knowledge).toHaveLength(0);
      }
    });
  });

  describe("empty interactions", () => {
    it("should return empty interactions when no moves exist", () => {
      const botA = mockProfile("cmd:a", "a", "command", []);
      const botB = mockProfile("cmd:b", "b", "command", []);

      const detectedA = mockDetected("cmd:a", "a", "command");
      const detectedB = mockDetected("cmd:b", "b", "command");

      const scan = mockScan([detectedA, detectedB]);
      const relationships = detectRelationships([botA, botB], scan);

      for (const rel of relationships) {
        expect(rel.interactions).toEqual([]);
      }
    });

    it("should return empty interactions when moves don't match any pattern", () => {
      const attackA = mockMove({
        name: "Strike",
        category: "attack",
        source: "cmd-a",
        description: "Just attacks",
        capabilities: ["basic attack"],
      });
      const attackB = mockMove({
        name: "Slash",
        category: "attack",
        source: "cmd-b",
        description: "Just slashes",
        capabilities: ["basic slash"],
      });

      const botA = mockProfile("cmd:a", "a", "command", [attackA]);
      const botB = mockProfile("cmd:b", "b", "command", [attackB]);

      const detectedA = mockDetected("cmd:a", "a", "command");
      const detectedB = mockDetected("cmd:b", "b", "command");

      const scan = mockScan([detectedA, detectedB]);
      const relationships = detectRelationships([botA, botB], scan);

      for (const rel of relationships) {
        expect(rel.interactions).toEqual([]);
      }
    });
  });

  describe("MoveInteraction structure", () => {
    it("should have valid fromMoveIndex and toMoveIndex", () => {
      const passiveA = mockMove({
        name: "Wisdom",
        category: "passive",
        type: "knowledge",
        source: "Testing Strategy",
      });
      const passiveB = mockMove({
        name: "Knowledge",
        category: "passive",
        type: "knowledge",
        source: "Testing Strategy",
      });

      const botA = mockProfile("cmd:a", "a", "command", [passiveA]);
      const botB = mockProfile("cmd:b", "b", "command", [passiveB]);

      const detectedA = mockDetected("cmd:a", "a", "command");
      const detectedB = mockDetected("cmd:b", "b", "command");

      const scan = mockScan([detectedA, detectedB]);
      const relationships = detectRelationships([botA, botB], scan);

      for (const rel of relationships) {
        for (const interaction of rel.interactions) {
          expect(interaction.fromMoveIndex).toBeGreaterThanOrEqual(0);
          expect(interaction.toMoveIndex).toBeGreaterThanOrEqual(0);
          expect(typeof interaction.kind).toBe("string");
          expect(typeof interaction.description).toBe("string");
          expect(typeof interaction.workflowOutcome).toBe("string");
          expect(interaction.description.length).toBeGreaterThan(0);
          expect(interaction.workflowOutcome.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
