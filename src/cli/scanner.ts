import { resolve } from "node:path";
import type { AgemonScanResult, DashboardData } from "../engine/types.js";
import { scanBaseKnowledge } from "./scanners/base-knowledge.js";
import { scanCommands } from "./scanners/commands.js";
import { scanMcp } from "./scanners/mcp.js";
import { scanHooks } from "./scanners/hooks.js";
import { scanPermissions, scanGitHistory } from "./scanners/common.js";
import { buildAllProfiles } from "../engine/profile-builder.js";
import { buildTrainerProfile } from "../engine/trainer.js";
import { hydrateProfilesWithLlmDesigner } from "./designer-llm.js";
import type { LlmHydrationResult } from "./designer-llm.js";
import { hydrateProfilesWithLlmSprites } from "./sprite-llm.js";
import type { LlmSpriteHydrationResult } from "./sprite-llm.js";

/**
 * Orchestrate all scanners and produce a unified AgemonScanResult.
 * Runs all scanners in parallel for performance.
 */
export async function scan(projectPath?: string): Promise<AgemonScanResult> {
  const resolvedPath = resolve(projectPath ?? process.cwd());

  const [baseKnowledge, commandAgemon, mcpResult, hooks, permissions, gitHistory] =
    await Promise.all([
      scanBaseKnowledge(resolvedPath),
      scanCommands(resolvedPath),
      scanMcp(resolvedPath),
      scanHooks(resolvedPath),
      scanPermissions(resolvedPath),
      scanGitHistory(resolvedPath),
    ]);

  const detectedAgemon = [...commandAgemon, ...mcpResult.agemon];

  return {
    scanDate: new Date().toISOString(),
    projectPath: resolvedPath,
    baseKnowledge,
    detectedAgemon,
    hooks,
    permissions,
    mcpServers: mcpResult.servers,
    gitHistory,
  };
}

/**
 * Full pipeline: scan → build profiles → build trainer → DashboardData.
 */
export async function scanAndBuild(projectPath?: string): Promise<DashboardData> {
  const scanResult = await scan(projectPath);
  const profiles = buildAllProfiles(scanResult);
  const designerHydration = await hydrateProfilesWithLlmDesigner(
    profiles,
    scanResult.projectPath,
  );
  const spriteHydration = await hydrateProfilesWithLlmSprites(
    profiles,
    scanResult.projectPath,
  );
  maybeLogLlmHydration(designerHydration, spriteHydration);
  const trainer = await buildTrainerProfile(profiles);

  return {
    trainer,
    scan: scanResult,
    generatedAt: new Date().toISOString(),
  };
}

function maybeLogLlmHydration(
  designer: LlmHydrationResult,
  sprite: LlmSpriteHydrationResult,
): void {
  const trace = process.env.AGEMON_LLM_TRACE === "1";

  if (
    sprite.mode === "llm" &&
    sprite.applied === 0 &&
    sprite.skipped > 0
  ) {
    console.warn(
      "  [Agemon] Sprite LLM mode is enabled but skipped (missing API key or fetch unavailable).",
    );
  }

  if (!trace) return;

  console.log(
    `  [Agemon][designer] provider=${designer.provider} model=${designer.model} requested=${designer.requested} cached=${designer.cached} applied=${designer.applied} failed=${designer.failed}`,
  );
  console.log(
    `  [Agemon][sprite] mode=${sprite.mode} provider=${sprite.provider} model=${sprite.model} requested=${sprite.requested} cached=${sprite.cached} applied=${sprite.applied} failed=${sprite.failed} skipped=${sprite.skipped}`,
  );
}
