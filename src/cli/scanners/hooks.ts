import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { HookInfo, AgemonScope } from "../../engine/types.js";

async function readFileText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Scan hook configurations from settings files.
 * Hooks are distributed as reflex-type moves to related Agemon.
 */
export async function scanHooks(projectPath: string): Promise<HookInfo[]> {
  const home = homedir();
  const hooks: HookInfo[] = [];

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

      if (!settings.hooks || typeof settings.hooks !== "object") {
        continue;
      }

      for (const [event, hookList] of Object.entries(settings.hooks)) {
        if (!Array.isArray(hookList)) continue;

        for (const hook of hookList) {
          const hookConfig = hook as Record<string, unknown>;
          const type = hookConfig.command ? "command" : "script";
          const hookContent =
            type === "command"
              ? String(hookConfig.command ?? "")
              : String(hookConfig.script ?? "");

          hooks.push({
            event,
            type,
            matcher: hookConfig.matcher
              ? String(hookConfig.matcher)
              : undefined,
            content: hookContent,
            scope,
            sourceFile: path,
          });
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return hooks;
}
