import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { BaseKnowledge, MarkdownInfo } from "../../engine/types.js";

async function readFileText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

function parseMarkdownSections(content: string): string[] {
  const headings = content.match(/^#{1,6}\s+(.+)$/gm);
  if (!headings) return [];
  return headings.map((h) => h.replace(/^#{1,6}\s+/, "").trim());
}

async function scanMarkdownFiles(
  paths: string[],
): Promise<MarkdownInfo> {
  let totalChars = 0;
  const allSections: string[] = [];
  const foundLocations: string[] = [];

  for (const path of paths) {
    const content = await readFileText(path);
    if (content) {
      foundLocations.push(path);
      totalChars += content.length;
      allSections.push(...parseMarkdownSections(content));
    }
  }

  return {
    exists: foundLocations.length > 0,
    charCount: totalChars,
    sectionCount: allSections.length,
    sections: allSections,
    locations: foundLocations,
  };
}

/**
 * Scan CLAUDE.md and AGENTS.md files to build BaseKnowledge.
 * These serve as shared knowledge that boosts all Agemon.
 */
export async function scanBaseKnowledge(
  projectPath: string,
): Promise<BaseKnowledge> {
  const home = homedir();

  const claudeMdPaths = [
    join(projectPath, "CLAUDE.md"),
    join(home, "CLAUDE.md"),
    join(home, ".claude", "CLAUDE.md"),
  ];

  const agentsMdPaths = [
    join(projectPath, "AGENTS.md"),
    join(home, "AGENTS.md"),
    join(projectPath, "codex.md"),
    join(home, "codex.md"),
  ];

  const [claudeMd, agentsMd] = await Promise.all([
    scanMarkdownFiles(claudeMdPaths),
    scanMarkdownFiles(agentsMdPaths),
  ]);

  return { claudeMd, agentsMd };
}
