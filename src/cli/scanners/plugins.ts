import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type {
  DetectedAgemon,
  PluginInfo,
  AgemonScope,
} from "../../engine/types.js";

async function readFileText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

interface PluginScanResult {
  agemon: DetectedAgemon[];
  plugins: PluginInfo[];
}

/**
 * Scan enabled plugins from settings files.
 * Each enabled plugin becomes a DetectedAgemon with source="plugin".
 *
 * Settings format:
 * "enabledPlugins": {
 *   "name@publisher": true,
 *   ...
 * }
 */
export async function scanPlugins(
  projectPath: string,
): Promise<PluginScanResult> {
  const home = homedir();
  const agemon: DetectedAgemon[] = [];
  const plugins: PluginInfo[] = [];

  const settingsPaths: { path: string; scope: AgemonScope }[] = [
    { path: join(projectPath, ".claude", "settings.json"), scope: "project" },
    {
      path: join(projectPath, ".claude", "settings.local.json"),
      scope: "project",
    },
    { path: join(home, ".claude", "settings.json"), scope: "global" },
  ];

  const seenPlugins = new Set<string>();

  for (const { path, scope } of settingsPaths) {
    const content = await readFileText(path);
    if (!content) continue;

    try {
      const settings = JSON.parse(content);

      if (
        !settings.enabledPlugins ||
        typeof settings.enabledPlugins !== "object"
      ) {
        continue;
      }

      for (const [fullId, enabled] of Object.entries(
        settings.enabledPlugins,
      )) {
        if (!enabled) continue;

        // Parse "name@publisher" format
        const atIndex = fullId.indexOf("@");
        if (atIndex === -1) continue;

        const name = fullId.slice(0, atIndex);
        const publisher = fullId.slice(atIndex + 1);

        const pluginKey = `${scope}:${name}`;
        if (seenPlugins.has(pluginKey)) continue;
        seenPlugins.add(pluginKey);

        const pluginInfo: PluginInfo = {
          name,
          publisher,
          fullId,
          enabled: true,
          scope,
        };
        plugins.push(pluginInfo);

        agemon.push({
          id: `plugin:${name}`,
          name,
          source: "plugin",
          sourceFile: path,
          scope,
        });
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return { agemon, plugins };
}
