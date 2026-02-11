import { describe, it, expect } from "vitest";
import { buildTrainerProfile } from "../src/engine/trainer.js";
import type { AgemonProfile } from "../src/engine/types.js";

function makeProfile(overrides: Partial<AgemonProfile> = {}): AgemonProfile {
  return {
    id: "cmd:test",
    name: "test",
    displayName: "TestMon",
    scope: "project",
    source: "command",
    level: 5,
    xp: 250,
    types: ["artisan"],
    stats: {
      knowledge: 30,
      arsenal: 20,
      reflex: 10,
      mastery: 50,
      guard: 15,
      synergy: 25,
    },
    evolution: {
      stage: "baby",
      title: "Rookie",
      level: 5,
      xp: 250,
      nextLevelXp: 360,
    },
    moves: [
      {
        name: "Strike Test",
        type: "mastery",
        category: "attack",
        power: 40,
        description: "Test move",
        source: "test",
        capabilities: ["testing"],
        status: "active",
        scope: "project",
      },
    ],
    equipment: [],
    ...overrides,
  };
}

describe("buildTrainerProfile", () => {
  it("builds trainer profile with explicit name", async () => {
    const profiles = [makeProfile()];
    const trainer = await buildTrainerProfile(profiles, "TestUser");

    expect(trainer.name).toBe("TestUser");
    expect(trainer.totalAgemon).toBe(1);
    expect(trainer.level).toBe(5);
    expect(trainer.totalMoves).toBe(1);
  });

  it("calculates average level across agemon", async () => {
    const profiles = [
      makeProfile({ level: 10 }),
      makeProfile({ id: "cmd:other", level: 6 }),
    ];
    const trainer = await buildTrainerProfile(profiles, "User");

    expect(trainer.level).toBe(8); // floor((10 + 6) / 2)
  });

  it("separates global and project agemon", async () => {
    const profiles = [
      makeProfile({ scope: "global" }),
      makeProfile({ id: "cmd:proj", scope: "project" }),
    ];
    const trainer = await buildTrainerProfile(profiles, "User");

    expect(trainer.globalAgemon).toHaveLength(1);
    expect(trainer.projectAgemon).toHaveLength(1);
  });

  it("handles empty profiles", async () => {
    const trainer = await buildTrainerProfile([], "User");

    expect(trainer.totalAgemon).toBe(0);
    expect(trainer.level).toBe(0);
    expect(trainer.totalMoves).toBe(0);
  });

  it("sums total moves and equipment", async () => {
    const profiles = [
      makeProfile({
        moves: [
          {
            name: "Move1",
            type: "mastery",
            category: "attack",
            power: 30,
            description: "",
            source: "",
            capabilities: [],
            status: "active",
            scope: "project",
          },
          {
            name: "Move2",
            type: "reflex",
            category: "reflex",
            power: 20,
            description: "",
            source: "",
            capabilities: [],
            status: "active",
            scope: "project",
          },
        ],
        equipment: [{ name: "github", scope: "global", type: "stdio" }],
      }),
    ];
    const trainer = await buildTrainerProfile(profiles, "User");

    expect(trainer.totalMoves).toBe(2);
    expect(trainer.totalEquipment).toBe(1);
  });
});
