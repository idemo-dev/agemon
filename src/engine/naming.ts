import type { DetectedAgemon, Move } from "./types.js";

const SUFFIXES = ["Mon", "Dex", "Bot", "Kin", "Rex"];

/**
 * Generate a display name for an Agemon from its raw name.
 * Command: "review" → "ReviewMon"
 * MCP: "github" → "GitMon"
 */
export function generateAgemonName(detected: DetectedAgemon): string {
  const base = detected.name.split(":").pop() ?? detected.name;

  // Clean and capitalize
  const cleaned = base
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

  // Shorten if too long (keep first 6 chars)
  const short = cleaned.length > 8 ? cleaned.slice(0, 6) : cleaned;

  // Pick suffix deterministically from name hash
  const hash = simpleHash(detected.id);
  const suffix = SUFFIXES[hash % SUFFIXES.length];

  return short + suffix;
}

/**
 * Generate a move name from source context.
 * Template: "{ActionVerb} {SourceHint}"
 */
export function generateMoveName(
  sourceName: string,
  category: Move["category"],
): string {
  const verbs: Record<Move["category"], string[]> = {
    attack: ["Strike", "Slash", "Blast", "Rush", "Surge"],
    support: ["Aid", "Boost", "Link", "Channel", "Sync"],
    reflex: ["Counter", "Dodge", "Parry", "React", "Guard"],
    passive: ["Aura", "Field", "Shield", "Veil", "Haze"],
    guard: ["Block", "Seal", "Lock", "Barrier", "Wall"],
  };

  const cleaned = sourceName
    .replace(/[-_./]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const hash = simpleHash(sourceName + category);
  const verbList = verbs[category];
  const verb = verbList[hash % verbList.length];

  return `${verb} ${cleaned}`.trim();
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
