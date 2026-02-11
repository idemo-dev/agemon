import { readFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { DetectedAgemon } from "../../engine/types.js";

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
 * Scan command files (*.md) in .claude/commands/ directories.
 * Each command file becomes a DetectedAgemon with source="command".
 */
export async function scanCommands(
  projectPath: string,
): Promise<DetectedAgemon[]> {
  const home = homedir();
  const agemon: DetectedAgemon[] = [];

  const commandDirs: { path: string; scope: DetectedAgemon["scope"] }[] = [
    { path: join(projectPath, ".claude", "commands"), scope: "project" },
    { path: join(home, ".claude", "commands"), scope: "global" },
  ];

  for (const { path: dirPath, scope } of commandDirs) {
    if (!(await fileExists(dirPath))) continue;

    try {
      const files = await readdir(dirPath, { recursive: true });
      for (const file of files) {
        if (typeof file !== "string" || !file.endsWith(".md")) continue;

        const filePath = join(dirPath, file);
        const content = await readFileText(filePath);
        const baseName = file.replace(/\.md$/, "").replace(/\//g, ":");

        agemon.push({
          id: `cmd:${baseName}`,
          name: baseName,
          source: "command",
          sourceFile: filePath,
          scope,
          rawContent: content ?? undefined,
        });
      }
    } catch {
      // Directory read error, skip
    }
  }

  return agemon;
}
