import type {
  DetectedAgemon,
  BaseKnowledge,
  HookInfo,
  PermissionInfo,
  McpServerInfo,
  Move,
  AgemonScope,
} from "./types.js";
import { generateMoveName } from "./naming.js";

/**
 * Generate all moves for a detected Agemon.
 */
export function generateMoves(
  detected: DetectedAgemon,
  baseKnowledge: BaseKnowledge,
  hooks: HookInfo[],
  permissions: PermissionInfo[],
  mcpServers: McpServerInfo[],
): Move[] {
  const moves: Move[] = [];

  if (detected.source === "command") {
    moves.push(...generateCommandMoves(detected));
  } else if (detected.source === "mcp") {
    const server = mcpServers.find((s) => s.name === detected.name);
    if (server) {
      moves.push(...generateMcpMoves(server, detected.scope));
    }
  } else if (detected.source === "plugin") {
    moves.push(...generatePluginMoves(detected));
  } else if (detected.source === "base") {
    // Base Agemon gets no primary attack/support moves —
    // it relies entirely on passive, reflex, and guard moves below
  }

  // Reflex moves from related hooks
  const relatedHooks = hooks.filter((h) => isHookRelated(h, detected));
  moves.push(...generateReflexMoves(relatedHooks));

  // Passive skills from base knowledge
  moves.push(...generatePassiveSkills(baseKnowledge, detected.scope));

  // Guard moves from permissions
  moves.push(...generateGuardMoves(permissions));

  return moves;
}

/**
 * Generate attack moves from command file content.
 */
export function generateCommandMoves(detected: DetectedAgemon): Move[] {
  const content = detected.rawContent ?? "";
  if (!content) return [];

  const lines = content.split("\n").filter((l) => l.trim());
  const power = calculateContentPower(content);
  const capabilities = extractCapabilities(content);

  return [
    {
      name: generateMoveName(detected.name, "attack"),
      type: "mastery",
      category: "attack",
      power,
      description: lines[0]?.slice(0, 80) ?? "Custom command technique",
      source: detected.name,
      capabilities,
      status: "active",
      scope: detected.scope,
    },
  ];
}

/**
 * Generate support moves from MCP server tools.
 */
export function generateMcpMoves(
  server: McpServerInfo,
  scope: AgemonScope,
): Move[] {
  const moves: Move[] = [];

  // Main support move for the server
  const power = Math.min(100, 40 + (server.tools?.length ?? 0) * 5);
  moves.push({
    name: generateMoveName(server.name, "support"),
    type: "arsenal",
    category: "support",
    power,
    description: `Channel the power of ${server.name}`,
    source: server.name,
    capabilities: server.tools ?? [server.command ?? server.name],
    status: "active",
    scope,
  });

  return moves;
}

/**
 * Generate support moves from a plugin.
 * Plugins are similar to MCP servers — they extend agent capabilities.
 */
export function generatePluginMoves(detected: DetectedAgemon): Move[] {
  return [
    {
      name: generateMoveName(detected.name, "support"),
      type: "arsenal",
      category: "support",
      power: 45,
      description: `Extend capabilities via ${detected.name} plugin`,
      source: detected.name,
      capabilities: [detected.name],
      status: "active",
      scope: detected.scope,
    },
  ];
}

/**
 * Generate reflex moves from hooks.
 */
export function generateReflexMoves(hooks: HookInfo[]): Move[] {
  return hooks.map((hook) => ({
    name: generateMoveName(hook.event, "reflex"),
    type: "reflex" as const,
    category: "reflex" as const,
    power: Math.min(100, 30 + hook.content.length / 10),
    description: `Auto-reacts on ${hook.event}`,
    source: hook.event,
    capabilities: [hook.content.slice(0, 50)],
    status: "active" as const,
    scope: hook.scope,
  }));
}

/**
 * Generate passive skills from base knowledge sections.
 */
export function generatePassiveSkills(
  baseKnowledge: BaseKnowledge,
  scope: AgemonScope,
): Move[] {
  const moves: Move[] = [];
  const sections = [
    ...baseKnowledge.claudeMd.sections,
    ...baseKnowledge.agentsMd.sections,
  ];

  // Generate one passive per knowledge section (up to 5)
  const topSections = sections.slice(0, 5);
  for (const section of topSections) {
    moves.push({
      name: generateMoveName(section, "passive"),
      type: "knowledge",
      category: "passive",
      power: 20,
      description: `Wisdom from ${section}`,
      source: section,
      capabilities: [section],
      status: "active",
      scope,
    });
  }

  return moves;
}

/**
 * Generate guard moves from permissions.
 */
export function generateGuardMoves(permissions: PermissionInfo[]): Move[] {
  const moves: Move[] = [];

  for (const perm of permissions) {
    if (perm.deniedTools.length > 0) {
      moves.push({
        name: generateMoveName("deny", "guard"),
        type: "guard",
        category: "guard",
        power: Math.min(100, perm.deniedTools.length * 15),
        description: "Blocks unauthorized tool access",
        source: "permissions",
        capabilities: perm.deniedTools.slice(0, 5),
        status: "active",
        scope: perm.scope,
      });
    }
    if (perm.allowedTools.length > 0) {
      moves.push({
        name: generateMoveName("allow", "guard"),
        type: "guard",
        category: "guard",
        power: Math.min(100, perm.allowedTools.length * 10),
        description: "Grants selective tool access",
        source: "permissions",
        capabilities: perm.allowedTools.slice(0, 5),
        status: "active",
        scope: perm.scope,
      });
    }
  }

  return moves;
}

function calculateContentPower(content: string): number {
  const lines = content.split("\n").length;
  const hasCodeBlocks = content.includes("```");
  const hasLists = /^[\s]*[-*]\s/m.test(content);
  const charCount = content.length;

  let power = 20; // base
  power += Math.min(30, lines * 2);
  power += Math.min(20, charCount / 100);
  if (hasCodeBlocks) power += 15;
  if (hasLists) power += 10;

  return Math.min(100, Math.round(power));
}

function extractCapabilities(content: string): string[] {
  const caps: string[] = [];
  const headings = content.match(/^#{1,3}\s+(.+)$/gm);
  if (headings) {
    caps.push(...headings.slice(0, 3).map((h) => h.replace(/^#+\s+/, "")));
  }
  if (caps.length === 0) {
    const firstLine = content.split("\n")[0]?.trim();
    if (firstLine) caps.push(firstLine.slice(0, 50));
  }
  return caps;
}

function isHookRelated(hook: HookInfo, detected: DetectedAgemon): boolean {
  if (hook.matcher) {
    return hook.matcher.toLowerCase().includes(detected.name.toLowerCase());
  }
  return true;
}
