import { describe, it, expect } from "vitest";
import { generateAgemonName, generateMoveName } from "../src/engine/naming.js";
import type { DetectedAgemon } from "../src/engine/types.js";

function makeDetected(overrides: Partial<DetectedAgemon> = {}): DetectedAgemon {
  return {
    id: "cmd:review",
    name: "review",
    source: "command",
    sourceFile: "/test/review.md",
    scope: "project",
    ...overrides,
  };
}

describe("generateAgemonName", () => {
  it("generates name with suffix for command", () => {
    const name = generateAgemonName(makeDetected());
    expect(name).toMatch(/^Review(Mon|Dex|Bot|Kin|Rex)$/);
  });

  it("generates different names for different ids", () => {
    const name1 = generateAgemonName(makeDetected({ id: "cmd:review" }));
    const name2 = generateAgemonName(makeDetected({ id: "cmd:deploy", name: "deploy" }));
    expect(name1).not.toBe(name2);
  });

  it("generates name for MCP source", () => {
    const name = generateAgemonName(
      makeDetected({ id: "mcp:github", name: "github", source: "mcp" }),
    );
    expect(name).toMatch(/^Github(Mon|Dex|Bot|Kin|Rex)$/);
  });

  it("is deterministic — same input gives same output", () => {
    const detected = makeDetected();
    const name1 = generateAgemonName(detected);
    const name2 = generateAgemonName(detected);
    expect(name1).toBe(name2);
  });

  it("handles hyphenated names", () => {
    const name = generateAgemonName(
      makeDetected({ id: "cmd:code-review", name: "code-review" }),
    );
    expect(name).toMatch(/(Mon|Dex|Bot|Kin|Rex)$/);
  });
});

describe("generateMoveName", () => {
  it("generates attack move name", () => {
    const name = generateMoveName("review", "attack");
    expect(name).toMatch(/^(Strike|Slash|Blast|Rush|Surge) Review$/);
  });

  it("generates support move name", () => {
    const name = generateMoveName("github", "support");
    expect(name).toMatch(/^(Aid|Boost|Link|Channel|Sync) Github$/);
  });

  it("generates reflex move name", () => {
    const name = generateMoveName("PreToolUse", "reflex");
    expect(name).toMatch(/^(Counter|Dodge|Parry|React|Guard) Pretooluse$/);
  });

  it("is deterministic", () => {
    const name1 = generateMoveName("test", "attack");
    const name2 = generateMoveName("test", "attack");
    expect(name1).toBe(name2);
  });
});
