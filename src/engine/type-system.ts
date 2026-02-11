import type { AgemonStats, AgemonType, StatName } from "./types.js";

const STAT_TO_TYPE: Record<StatName, AgemonType> = {
  knowledge: "scholar",
  arsenal: "arsenal",
  reflex: "sentinel",
  mastery: "artisan",
  guard: "guardian",
  synergy: "catalyst",
};

export const TYPE_COLORS: Record<AgemonType, { primary: string; secondary: string }> = {
  scholar: { primary: "#4A90D9", secondary: "#7CB3E8" },
  arsenal: { primary: "#E74C3C", secondary: "#F1948A" },
  sentinel: { primary: "#F39C12", secondary: "#F7DC6F" },
  artisan: { primary: "#9B59B6", secondary: "#C39BD3" },
  guardian: { primary: "#27AE60", secondary: "#82E0AA" },
  catalyst: { primary: "#1ABC9C", secondary: "#76D7C4" },
};

/**
 * Determine 1-2 Agemon types from stat distribution.
 * Takes top 2 stats; if one is significantly dominant, returns single type.
 */
export function determineTypes(stats: AgemonStats): AgemonType[] {
  const entries = Object.entries(stats) as [StatName, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  const [top, second] = sorted;

  // If top stat is 0, return default type
  if (top[1] === 0) {
    return ["scholar"];
  }

  // If top stat is significantly higher (>= 1.5x second), single type
  if (second[1] === 0 || top[1] >= second[1] * 1.5) {
    return [STAT_TO_TYPE[top[0]]];
  }

  // Otherwise, compound type (top 2)
  return [STAT_TO_TYPE[top[0]], STAT_TO_TYPE[second[0]]];
}

/**
 * Get display label for an Agemon type.
 */
export function getTypeLabel(type: AgemonType): string {
  const labels: Record<AgemonType, string> = {
    scholar: "Scholar",
    arsenal: "Arsenal",
    sentinel: "Sentinel",
    artisan: "Artisan",
    guardian: "Guardian",
    catalyst: "Catalyst",
  };
  return labels[type];
}
