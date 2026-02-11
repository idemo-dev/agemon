import { resolve } from "node:path";
import type { AgemonScanResult, DashboardData } from "../engine/types.js";
import { scanBaseKnowledge } from "./scanners/base-knowledge.js";
import { scanCommands } from "./scanners/commands.js";
import { scanMcp } from "./scanners/mcp.js";
import { scanHooks } from "./scanners/hooks.js";
import { scanPermissions, scanGitHistory } from "./scanners/common.js";
import { buildAllProfiles } from "../engine/profile-builder.js";
import { buildTrainerProfile } from "../engine/trainer.js";

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
  const trainer = await buildTrainerProfile(profiles);

  return {
    trainer,
    scan: scanResult,
    generatedAt: new Date().toISOString(),
  };
}
