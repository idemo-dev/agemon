import type {
  DetectedAgemon,
  AgemonScanResult,
  AgemonProfile,
  McpServerInfo,
} from "./types.js";
import { calculateAgemonXP, calculateAgemonStats } from "./score.js";
import { getEvolutionInfo } from "./evolution.js";
import { generateMoves } from "./moves.js";
import { generateAgemonName } from "./naming.js";
import { determineTypes } from "./type-system.js";

/**
 * Build a full AgemonProfile from a DetectedAgemon and scan result.
 * Orchestrates score, moves, naming, type-system, and evolution.
 */
export function buildAgemonProfile(
  detected: DetectedAgemon,
  scan: AgemonScanResult,
): AgemonProfile {
  const xp = calculateAgemonXP(
    detected,
    scan.baseKnowledge,
    scan.hooks,
    scan.permissions,
    scan.gitHistory,
  );

  const stats = calculateAgemonStats(
    detected,
    scan.baseKnowledge,
    scan.hooks,
    scan.permissions,
  );

  const evolution = getEvolutionInfo(xp);

  const moves = generateMoves(
    detected,
    scan.baseKnowledge,
    scan.hooks,
    scan.permissions,
    scan.mcpServers,
  );

  const displayName = generateAgemonName(detected);
  const types = determineTypes(stats);

  // Equipment: MCP servers associated with this agemon
  const equipment: McpServerInfo[] =
    detected.source === "mcp"
      ? scan.mcpServers.filter((s) => s.name === detected.name)
      : [];

  return {
    id: detected.id,
    name: detected.name,
    displayName,
    scope: detected.scope,
    source: detected.source,
    level: evolution.level,
    xp,
    types,
    stats,
    evolution,
    moves,
    equipment,
  };
}

/**
 * Build profiles for all detected Agemon in a scan result.
 */
export function buildAllProfiles(scan: AgemonScanResult): AgemonProfile[] {
  return scan.detectedAgemon.map((detected) =>
    buildAgemonProfile(detected, scan),
  );
}
