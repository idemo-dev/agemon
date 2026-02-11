import type {
  DetectedAgemon,
  BaseKnowledge,
  HookInfo,
  PermissionInfo,
  GitHistory,
  AgemonStats,
} from "./types.js";

/**
 * Calculate XP for a single Agemon.
 */
export function calculateAgemonXP(
  detected: DetectedAgemon,
  baseKnowledge: BaseKnowledge,
  hooks: HookInfo[],
  permissions: PermissionInfo[],
  gitHistory?: GitHistory,
): number {
  let xp = 0;

  // Base knowledge contribution (shared)
  xp += Math.min(Math.floor(baseKnowledge.claudeMd.charCount / 200), 30);
  xp += Math.min(Math.floor(baseKnowledge.agentsMd.charCount / 200), 20);

  // Source-specific XP
  if (detected.source === "command") {
    const contentLength = detected.rawContent?.length ?? 0;
    xp += 100; // base for existing
    xp += Math.min(Math.floor(contentLength / 50), 80); // content depth
  } else if (detected.source === "mcp") {
    xp += 120; // MCP servers are powerful
  }

  // Scope bonus
  if (detected.scope === "project") {
    xp += 20; // project-scoped = more intentional
  }

  // Related hooks bonus
  const relatedHooks = hooks.filter((h) => isHookRelated(h, detected));
  xp += relatedHooks.length * 30;

  // Related permissions bonus
  const totalPermissions = permissions.reduce(
    (sum, p) => sum + p.allowedTools.length + p.deniedTools.length,
    0,
  );
  xp += Math.min(totalPermissions * 10, 50);

  // Git age bonus
  if (gitHistory) {
    const firstCommit = new Date(gitHistory.firstConfigCommit);
    const now = new Date();
    const months =
      (now.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24 * 30);
    xp += Math.min(Math.floor(months) * 5, 60);
  }

  return xp;
}

/**
 * Calculate the 6 stats (0-100 each) for a single Agemon.
 */
export function calculateAgemonStats(
  detected: DetectedAgemon,
  baseKnowledge: BaseKnowledge,
  hooks: HookInfo[],
  permissions: PermissionInfo[],
): AgemonStats {
  const relatedHooks = hooks.filter((h) => isHookRelated(h, detected));
  const totalPermissions = permissions.reduce(
    (sum, p) => sum + p.allowedTools.length + p.deniedTools.length,
    0,
  );

  return {
    // Knowledge: shared base knowledge depth
    knowledge: Math.min(
      100,
      baseKnowledge.claudeMd.sectionCount * 5 +
        Math.min(baseKnowledge.claudeMd.charCount / 100, 30) +
        baseKnowledge.agentsMd.sectionCount * 4 +
        Math.min(baseKnowledge.agentsMd.charCount / 100, 20),
    ),

    // Arsenal: tool references (command content) or MCP tools count
    arsenal: Math.min(100, calculateArsenal(detected)),

    // Reflex: related hooks
    reflex: Math.min(100, relatedHooks.length * 25),

    // Mastery: rawContent complexity
    mastery: Math.min(100, calculateMastery(detected)),

    // Guard: related permissions
    guard: Math.min(100, totalPermissions * 10),

    // Synergy: scope + global/project coexistence
    synergy: Math.min(
      100,
      (detected.scope === "project" ? 40 : 20) +
        (baseKnowledge.claudeMd.locations.length > 1 ? 30 : 0) +
        (baseKnowledge.agentsMd.exists ? 20 : 0),
    ),
  };
}

function calculateArsenal(detected: DetectedAgemon): number {
  if (detected.source === "mcp") {
    return 50; // Base score for MCP (tools discovery adds more in Phase 2)
  }
  // Count tool-like references in command content
  const content = detected.rawContent ?? "";
  const toolPatterns = /\b(tool|mcp|api|server|plugin|extension)\b/gi;
  const matches = content.match(toolPatterns);
  return Math.min(100, (matches?.length ?? 0) * 10 + 10);
}

function calculateMastery(detected: DetectedAgemon): number {
  if (detected.source === "mcp") {
    return 30; // MCP servers have moderate mastery
  }
  const content = detected.rawContent ?? "";
  const lines = content.split("\n").length;
  const hasCodeBlocks = content.includes("```");
  const hasConditionals = /\b(if|when|unless|otherwise)\b/i.test(content);

  return Math.min(
    100,
    lines * 2 +
      (hasCodeBlocks ? 20 : 0) +
      (hasConditionals ? 15 : 0),
  );
}

/**
 * Check if a hook is related to a detected Agemon.
 */
function isHookRelated(hook: HookInfo, detected: DetectedAgemon): boolean {
  // If hook has a matcher, check if it matches the agemon
  if (hook.matcher) {
    if (detected.source === "mcp") {
      return hook.matcher.toLowerCase().includes(detected.name.toLowerCase());
    }
    return hook.matcher.toLowerCase().includes(detected.name.toLowerCase());
  }
  // Hooks without matchers apply to all Agemon
  return true;
}

// Keep backward-compatible helpers for evolution.ts
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 10));
}

export function xpForLevel(level: number): number {
  return level * level * 10;
}
