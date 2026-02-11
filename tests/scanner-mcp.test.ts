import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanMcp } from "../src/cli/scanners/mcp.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `agemon-test-mcp-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("scanMcp", () => {
  it("returns empty when no settings file exists", async () => {
    const result = await scanMcp(testDir);
    expect(result.agemon).toEqual([]);
    expect(result.servers).toEqual([]);
  });

  it("detects MCP servers from settings.json", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        mcpServers: {
          github: {
            type: "stdio",
            command: "gh-mcp",
            args: ["--token", "xxx"],
          },
          filesystem: {
            type: "stdio",
            command: "fs-mcp",
          },
        },
      }),
    );

    const result = await scanMcp(testDir);
    expect(result.agemon).toHaveLength(2);
    expect(result.servers).toHaveLength(2);

    const github = result.agemon.find((a) => a.name === "github")!;
    expect(github.id).toBe("mcp:github");
    expect(github.source).toBe("mcp");
    expect(github.scope).toBe("project");

    const ghServer = result.servers.find((s) => s.name === "github")!;
    expect(ghServer.type).toBe("stdio");
    expect(ghServer.command).toBe("gh-mcp");
    expect(ghServer.args).toEqual(["--token", "xxx"]);
  });

  it("handles invalid JSON gracefully", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, "settings.json"), "not valid json{");

    const result = await scanMcp(testDir);
    expect(result.agemon).toEqual([]);
    expect(result.servers).toEqual([]);
  });

  it("handles settings without mcpServers key", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({ allowedTools: ["Read"] }),
    );

    const result = await scanMcp(testDir);
    expect(result.agemon).toEqual([]);
    expect(result.servers).toEqual([]);
  });

  it("defaults type to stdio", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        mcpServers: {
          simple: { command: "simple-mcp" },
        },
      }),
    );

    const result = await scanMcp(testDir);
    expect(result.servers[0].type).toBe("stdio");
  });
});
