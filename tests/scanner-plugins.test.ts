import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanPlugins } from "../src/cli/scanners/plugins.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `agemon-test-plugins-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("scanPlugins", () => {
  it("returns no project-scoped plugins when no project settings file exists", async () => {
    const result = await scanPlugins(testDir);
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toEqual([]);
  });

  it("detects enabled plugins from project settings.json", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        enabledPlugins: {
          "claude-code-harness@publisher": true,
          "feature-dev@claude-plugins-official": true,
          "disabled-plugin@publisher": false,
        },
      }),
    );

    const result = await scanPlugins(testDir);
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toHaveLength(2);

    const harness = projectPlugins.find(
      (a) => a.name === "claude-code-harness",
    )!;
    expect(harness.id).toBe("plugin:claude-code-harness");
    expect(harness.source).toBe("plugin");
    expect(harness.scope).toBe("project");

    const projectPluginInfos = result.plugins.filter(
      (p) => p.scope === "project",
    );
    const harnessPlugin = projectPluginInfos.find(
      (p) => p.name === "claude-code-harness",
    )!;
    expect(harnessPlugin.publisher).toBe("publisher");
    expect(harnessPlugin.fullId).toBe("claude-code-harness@publisher");
    expect(harnessPlugin.enabled).toBe(true);
  });

  it("skips disabled plugins", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        enabledPlugins: {
          "disabled@publisher": false,
        },
      }),
    );

    const result = await scanPlugins(testDir);
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toEqual([]);
  });

  it("handles invalid JSON gracefully", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(join(claudeDir, "settings.json"), "not valid json{");

    const result = await scanPlugins(testDir);
    // Invalid project settings means no project plugins
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toEqual([]);
  });

  it("handles settings without enabledPlugins key", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({ mcpServers: {} }),
    );

    const result = await scanPlugins(testDir);
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toEqual([]);
  });

  it("skips entries without @ separator", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        enabledPlugins: {
          "no-at-sign": true,
          "valid@publisher": true,
        },
      }),
    );

    const result = await scanPlugins(testDir);
    const projectPlugins = result.agemon.filter((a) => a.scope === "project");
    expect(projectPlugins).toHaveLength(1);
    expect(projectPlugins[0].name).toBe("valid");
  });

  it("parses plugin name and publisher from fullId", async () => {
    const claudeDir = join(testDir, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await writeFile(
      join(claudeDir, "settings.json"),
      JSON.stringify({
        enabledPlugins: {
          "my-plugin@my-org": true,
        },
      }),
    );

    const result = await scanPlugins(testDir);
    const projectPlugins = result.plugins.filter(
      (p) => p.scope === "project",
    );
    expect(projectPlugins).toHaveLength(1);
    expect(projectPlugins[0].name).toBe("my-plugin");
    expect(projectPlugins[0].publisher).toBe("my-org");
    expect(projectPlugins[0].fullId).toBe("my-plugin@my-org");
  });
});
