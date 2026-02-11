import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { GitHistory, PermissionInfo, AgemonScope } from "../../engine/types.js";

const execFileAsync = promisify(execFile);

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readFileText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Scan git history for config file age and commit count.
 */
export async function scanGitHistory(
  projectPath: string,
): Promise<GitHistory | undefined> {
  const gitDir = join(projectPath, ".git");
  if (!(await fileExists(gitDir))) {
    return undefined;
  }

  const configFiles = [
    "CLAUDE.md",
    ".claude/settings.json",
    "AGENTS.md",
    "codex.md",
    ".codex/",
  ];

  try {
    const { stdout: logOutput } = await execFileAsync(
      "git",
      [
        "log",
        "--all",
        "--format=%aI",
        "--diff-filter=A",
        "--reverse",
        "--",
        ...configFiles,
      ],
      { cwd: projectPath },
    );

    const dates = logOutput.trim().split("\n").filter(Boolean);
    if (dates.length === 0) {
      return undefined;
    }

    const { stdout: countOutput } = await execFileAsync(
      "git",
      ["log", "--all", "--oneline", "--", ...configFiles],
      { cwd: projectPath },
    );

    const totalCommits = countOutput.trim().split("\n").filter(Boolean).length;

    return {
      firstConfigCommit: dates[0],
      totalConfigCommits: totalCommits,
    };
  } catch {
    return undefined;
  }
}

/**
 * Scan permissions from settings files.
 */
export async function scanPermissions(
  projectPath: string,
): Promise<PermissionInfo[]> {
  const home = homedir();
  const permissions: PermissionInfo[] = [];

  const settingsPaths: { path: string; scope: AgemonScope }[] = [
    { path: join(projectPath, ".claude", "settings.json"), scope: "project" },
    {
      path: join(projectPath, ".claude", "settings.local.json"),
      scope: "project",
    },
    { path: join(home, ".claude", "settings.json"), scope: "global" },
  ];

  for (const { path, scope } of settingsPaths) {
    const content = await readFileText(path);
    if (!content) continue;

    try {
      const settings = JSON.parse(content);
      const allowedTools: string[] = Array.isArray(settings.allowedTools)
        ? settings.allowedTools
        : [];
      const deniedTools: string[] = Array.isArray(settings.deniedTools)
        ? settings.deniedTools
        : [];

      if (allowedTools.length > 0 || deniedTools.length > 0) {
        permissions.push({ allowedTools, deniedTools, scope });
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return permissions;
}
