import type { EvolutionInfo, EvolutionStage } from "./types.js";
import { calculateLevel, xpForLevel } from "./score.js";

interface StageConfig {
  stage: EvolutionStage;
  title: string;
  minLevel: number;
}

const STAGES: StageConfig[] = [
  { stage: "baby", title: "Rookie", minLevel: 0 },
  { stage: "child", title: "Apprentice", minLevel: 5 },
  { stage: "teen", title: "Specialist", minLevel: 10 },
  { stage: "adult", title: "Expert", minLevel: 15 },
  { stage: "ultimate", title: "Legendary", minLevel: 20 },
];

/**
 * Determine evolution stage from level.
 */
export function getEvolutionStage(level: number): StageConfig {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (level >= STAGES[i].minLevel) {
      return STAGES[i];
    }
  }
  return STAGES[0];
}

/**
 * Build full evolution info from XP value.
 * Decoupled from scan — takes raw XP.
 */
export function getEvolutionInfo(xp: number): EvolutionInfo {
  const level = calculateLevel(xp);
  const stageConfig = getEvolutionStage(level);
  const nextLevelXp = xpForLevel(level + 1);

  return {
    stage: stageConfig.stage,
    title: stageConfig.title,
    level,
    xp,
    nextLevelXp,
  };
}

/**
 * Get all evolution stages for display.
 */
export function getAllStages(): StageConfig[] {
  return [...STAGES];
}
