import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgemonProfile, TrainerProfile } from "./types.js";

const execFileAsync = promisify(execFile);

/**
 * Get git user name from config.
 */
async function getGitUserName(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["config", "user.name"]);
    return stdout.trim() || "Trainer";
  } catch {
    return "Trainer";
  }
}

/**
 * Build a TrainerProfile from Agemon profiles.
 */
export async function buildTrainerProfile(
  profiles: AgemonProfile[],
  userName?: string,
): Promise<TrainerProfile> {
  const name = userName ?? (await getGitUserName());

  const globalAgemon = profiles.filter((p) => p.scope === "global");
  const projectAgemon = profiles.filter((p) => p.scope === "project");

  const avgLevel =
    profiles.length > 0
      ? Math.floor(profiles.reduce((sum, p) => sum + p.level, 0) / profiles.length)
      : 0;

  const totalMoves = profiles.reduce((sum, p) => sum + p.moves.length, 0);
  const totalEquipment = profiles.reduce(
    (sum, p) => sum + p.equipment.length,
    0,
  );

  return {
    name,
    level: avgLevel,
    totalAgemon: profiles.length,
    totalMoves,
    totalEquipment,
    globalAgemon,
    projectAgemon,
  };
}
