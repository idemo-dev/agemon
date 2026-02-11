import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanCommands } from "../src/cli/scanners/commands.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `agemon-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("scanCommands", () => {
  it("returns empty array when no commands directory exists", async () => {
    const result = await scanCommands(testDir);
    expect(result).toEqual([]);
  });

  it("detects .md files in .claude/commands/", async () => {
    const commandsDir = join(testDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(
      join(commandsDir, "review.md"),
      "Review the code for quality",
    );
    await writeFile(
      join(commandsDir, "deploy.md"),
      "Deploy to production",
    );

    const result = await scanCommands(testDir);
    expect(result).toHaveLength(2);

    const names = result.map((r) => r.name).sort();
    expect(names).toEqual(["deploy", "review"]);

    const review = result.find((r) => r.name === "review")!;
    expect(review.id).toBe("cmd:review");
    expect(review.source).toBe("command");
    expect(review.scope).toBe("project");
    expect(review.rawContent).toBe("Review the code for quality");
  });

  it("handles nested command directories", async () => {
    const commandsDir = join(testDir, ".claude", "commands", "sub");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(join(commandsDir, "nested.md"), "Nested command");

    const result = await scanCommands(testDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sub:nested");
    expect(result[0].id).toBe("cmd:sub:nested");
  });

  it("ignores non-.md files", async () => {
    const commandsDir = join(testDir, ".claude", "commands");
    await mkdir(commandsDir, { recursive: true });
    await writeFile(join(commandsDir, "valid.md"), "Valid command");
    await writeFile(join(commandsDir, "ignore.txt"), "Not a command");
    await writeFile(join(commandsDir, "ignore.json"), "{}");

    const result = await scanCommands(testDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid");
  });
});
