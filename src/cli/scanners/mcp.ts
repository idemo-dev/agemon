import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type {
  DetectedAgemon,
  McpServerInfo,
  AgemonScope,
} from "../../engine/types.js";

async function readFileText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

interface McpScanResult {
  agemon: DetectedAgemon[];
  servers: McpServerInfo[];
}

/**
 * Scan MCP server configurations from settings files.
 * Each MCP server becomes a DetectedAgemon with source="mcp".
 */
export async function scanMcp(projectPath: string): Promise<McpScanResult> {
  const home = homedir();
  const agemon: DetectedAgemon[] = [];
  const servers: McpServerInfo[] = [];

  const settingsPaths: { path: string; scope: AgemonScope }[] = [
    { path: join(projectPath, ".claude", "settings.json"), scope: "project" },
    {
      path: join(projectPath, ".claude", "settings.local.json"),
      scope: "project",
    },
    { path: join(home, ".claude", "settings.json"), scope: "global" },
  ];

  const seenServers = new Set<string>();

  for (const { path, scope } of settingsPaths) {
    const content = await readFileText(path);
    if (!content) continue;

    try {
      const settings = JSON.parse(content);

      if (!settings.mcpServers || typeof settings.mcpServers !== "object") {
        continue;
      }

      for (const [name, config] of Object.entries(settings.mcpServers)) {
        const serverConfig = config as Record<string, unknown>;
        const serverKey = `${scope}:${name}`;

        // Skip duplicates (project-level overrides global)
        if (seenServers.has(serverKey)) continue;
        seenServers.add(serverKey);

        const serverInfo: McpServerInfo = {
          name,
          scope,
          type: (serverConfig.type as McpServerInfo["type"]) ?? "stdio",
          command: serverConfig.command as string | undefined,
          args: serverConfig.args as string[] | undefined,
        };
        servers.push(serverInfo);

        agemon.push({
          id: `mcp:${name}`,
          name,
          source: "mcp",
          sourceFile: path,
          scope,
        });
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return { agemon, servers };
}
