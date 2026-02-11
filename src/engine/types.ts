// Core type definitions for Agemon v2 - SubAgent-based multi-Agemon system

// ─── Stat System ───

export type StatName =
  | "knowledge"
  | "arsenal"
  | "reflex"
  | "mastery"
  | "guard"
  | "synergy";

export interface AgemonStats {
  knowledge: number; // 0-100 — CLAUDE.md/AGENTS.md depth
  arsenal: number; // 0-100 — tool references / MCP tools count
  reflex: number; // 0-100 — related hooks
  mastery: number; // 0-100 — rawContent complexity
  guard: number; // 0-100 — related permissions
  synergy: number; // 0-100 — scope bonus + git age
}

// ─── Evolution ───

export type EvolutionStage =
  | "baby"
  | "child"
  | "teen"
  | "adult"
  | "ultimate";

export interface EvolutionInfo {
  stage: EvolutionStage;
  title: string;
  level: number;
  xp: number;
  nextLevelXp: number;
}

// ─── Agemon Types (compound type from stat distribution) ───

export type AgemonType =
  | "scholar" // knowledge dominant
  | "arsenal" // arsenal dominant
  | "sentinel" // reflex dominant
  | "artisan" // mastery dominant
  | "guardian" // guard dominant
  | "catalyst"; // synergy dominant

// ─── Detected Agemon (raw scanner output) ───

export type AgemonSource = "command" | "mcp";
export type AgemonScope = "global" | "project";

export interface DetectedAgemon {
  id: string; // unique identifier (e.g. "cmd:review" or "mcp:github")
  name: string; // display name (e.g. "review.md", "github")
  source: AgemonSource;
  sourceFile: string; // absolute path to source file/config
  scope: AgemonScope;
  rawContent?: string; // raw file content for commands
}

// ─── Base Knowledge (shared across all Agemon) ───

export interface MarkdownInfo {
  exists: boolean;
  charCount: number;
  sectionCount: number;
  sections: string[]; // heading names
  locations: string[]; // file paths where found
}

export interface BaseKnowledge {
  claudeMd: MarkdownInfo;
  agentsMd: MarkdownInfo;
}

// ─── Hooks ───

export interface HookInfo {
  event: string; // PreToolUse, PostToolUse, etc.
  type: "command" | "script";
  matcher?: string; // tool matcher pattern
  content: string; // command or script content
  scope: AgemonScope;
  sourceFile: string;
}

// ─── MCP Servers ───

export interface McpServerInfo {
  name: string;
  scope: AgemonScope;
  type: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  tools?: string[]; // known tool names if discoverable
}

// ─── Permissions ───

export interface PermissionInfo {
  allowedTools: string[];
  deniedTools: string[];
  scope: AgemonScope;
}

// ─── Git History ───

export interface GitHistory {
  firstConfigCommit: string; // ISO date
  totalConfigCommits: number;
}

// ─── Scan Result (new multi-Agemon format) ───

export interface AgemonScanResult {
  scanDate: string;
  projectPath: string;
  baseKnowledge: BaseKnowledge;
  detectedAgemon: DetectedAgemon[];
  hooks: HookInfo[];
  permissions: PermissionInfo[];
  mcpServers: McpServerInfo[];
  gitHistory?: GitHistory;
}

// ─── Moves (gamified capabilities) ───

export type MoveCategory =
  | "attack" // from commands
  | "support" // from MCP tools
  | "reflex" // from hooks
  | "passive" // from CLAUDE.md/AGENTS.md
  | "guard"; // from permissions

export interface Move {
  name: string;
  type: StatName; // which stat this move relates to
  category: MoveCategory;
  power: number; // 1-100
  description: string; // flavor text
  source: string; // where it came from
  capabilities: string[]; // what it can do
  status: "active" | "inactive";
  scope: AgemonScope;
}

// ─── Optional visual design payload ───

export interface StoredVisualSpec {
  version: string;
  modelVersion: string;
  designSeed: number;
  bodyPlan?: string;
  motifParts?: string[];
  brief?: {
    creatureCore?: string;
    combatRole?: string;
    temperament?: string;
    signatureFeature?: string;
  };
  archetype?: string;
  silhouette?: number;
  eyeStyle?: number;
  mouthStyle?: number;
  hornStyle?: number;
  patternStyle?: number;
  weaponStyle?: number;
  auraStyle?: number;
  poseOffset?: number;
  handedness?: number;
  armorLevel?: number;
  patternDensity?: number;
  paletteBias?: Record<string, unknown>;
  composition?: Record<string, unknown>;
}

export interface StoredSpriteAsset {
  width: number;
  height: number;
  layers: Array<{
    name: string;
    pixels: number[][];
    offsetX: number;
    offsetY: number;
  }>;
  palette: string[];
  modelVersion?: string;
  qualityScore?: number;
}

// ─── Agemon Profile (fully computed) ───

export interface AgemonProfile {
  id: string;
  name: string;
  displayName: string; // e.g. "ReviewMon"
  scope: AgemonScope;
  source: AgemonSource;
  level: number;
  xp: number;
  types: AgemonType[]; // 1-2 types
  stats: AgemonStats;
  evolution: EvolutionInfo;
  moves: Move[];
  equipment: McpServerInfo[]; // MCP servers used by this agemon
  visualSpec?: StoredVisualSpec; // optional designer-generated spec
  spriteAsset?: StoredSpriteAsset; // optional LLM-generated sprite asset
}

// ─── Trainer Profile ───

export interface TrainerProfile {
  name: string; // from git config
  level: number; // average across all agemon
  totalAgemon: number;
  totalMoves: number;
  totalEquipment: number;
  globalAgemon: AgemonProfile[];
  projectAgemon: AgemonProfile[];
}

// ─── Dashboard Data (API response) ───

export interface DashboardData {
  trainer: TrainerProfile;
  scan: AgemonScanResult;
  generatedAt: string;
}

// ─── Pixel Art ───

export interface SpriteLayer {
  name: string;
  pixels: number[][]; // 2D array of palette indices
  offsetX: number;
  offsetY: number;
}

export interface SpriteDefinition {
  width: number;
  height: number;
  layers: SpriteLayer[];
  palette: string[]; // hex color array
}
