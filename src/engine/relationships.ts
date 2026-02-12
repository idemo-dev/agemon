import type {
  AgemonProfile,
  AgemonScanResult,
  AgemonRelationship,
  MoveInteraction,
  DetectedAgemon,
  HookInfo,
} from "./types.js";

/**
 * Detect relationships between Agemon based on their config data.
 *
 * Relationship types and strengths:
 * - trigger (80): Hook matcher matches Agemon name
 * - dependency (60): Content references another Agemon (mcp__NAME or /COMMAND)
 * - shared-scope (20): Agemon in same scope (only if no stronger relationship exists)
 *
 * After detecting relationships, enriches each with move-level interactions:
 * - trigger-chain: hook reflex move → target attack/support move
 * - tool-dependency: command content references MCP tools
 * - shared-knowledge: same passive move source across Agemon
 *
 * @param profiles - Array of AgemonProfile to analyze
 * @param scan - Full scan result containing hooks and raw content
 * @returns Array of detected relationships with move interactions
 */
export function detectRelationships(
  profiles: AgemonProfile[],
  scan: AgemonScanResult,
): AgemonRelationship[] {
  const relationships: AgemonRelationship[] = [];

  // Create a map for quick lookup of DetectedAgemon by id
  const detectedMap = new Map<string, DetectedAgemon>();
  for (const detected of scan.detectedAgemon) {
    detectedMap.set(detected.id, detected);
  }

  // Profile map for quick lookup
  const profileMap = new Map<string, AgemonProfile>();
  for (const p of profiles) {
    profileMap.set(p.id, p);
  }

  // 1. Hook → Agemon trigger relationships
  for (const hook of scan.hooks) {
    for (const profile of profiles) {
      if (isHookRelated(hook, profile, detectedMap)) {
        relationships.push({
          from: profile.id,
          to: profile.id,
          type: "trigger",
          strength: 80,
          reason: `hook "${hook.event}" triggers this Agemon via matcher "${hook.matcher || 'all'}"`,
          interactions: [],
        });
      }
    }
  }

  // 2. Content → MCP/Command dependency relationships
  for (const profile of profiles) {
    const detected = detectedMap.get(profile.id);
    if (!detected || !detected.rawContent) continue;

    const content = detected.rawContent;

    // Check for MCP references (mcp__NAME)
    for (const targetProfile of profiles) {
      if (targetProfile.source === "mcp" && profile.id !== targetProfile.id) {
        const mcpPattern = new RegExp(
          `mcp__${targetProfile.name}(?:__|\\b)`,
          "i",
        );
        if (mcpPattern.test(content)) {
          relationships.push({
            from: profile.id,
            to: targetProfile.id,
            type: "dependency",
            strength: 60,
            reason: `${profile.name} references MCP server "${targetProfile.name}"`,
            interactions: [],
          });
        }
      }
    }

    // Check for command references (/COMMAND_NAME or direct name mention)
    for (const targetProfile of profiles) {
      if (targetProfile.source === "command" && profile.id !== targetProfile.id) {
        const commandPattern = new RegExp(
          `(?:/|\\b)${targetProfile.name}\\b`,
          "i",
        );
        if (commandPattern.test(content)) {
          relationships.push({
            from: profile.id,
            to: targetProfile.id,
            type: "dependency",
            strength: 60,
            reason: `${profile.name} references command "${targetProfile.name}"`,
            interactions: [],
          });
        }
      }
    }
  }

  // 3. Shared scope relationships
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const profileA = profiles[i];
      const profileB = profiles[j];

      if (profileA.scope === profileB.scope) {
        // Add bidirectional shared-scope relationships
        relationships.push({
          from: profileA.id,
          to: profileB.id,
          type: "shared-scope",
          strength: 20,
          reason: `Both Agemon operate in "${profileA.scope}" scope`,
          interactions: [],
        });
        relationships.push({
          from: profileB.id,
          to: profileA.id,
          type: "shared-scope",
          strength: 20,
          reason: `Both Agemon operate in "${profileB.scope}" scope`,
          interactions: [],
        });
      }
    }
  }

  // Deduplicate exact matches (same from, to, type)
  const uniqueRelationships = deduplicateRelationships(relationships);

  // 4. Enrich relationships with move-level interactions
  for (const rel of uniqueRelationships) {
    const fromProfile = profileMap.get(rel.from);
    const toProfile = profileMap.get(rel.to);
    if (!fromProfile || !toProfile) continue;

    rel.interactions = detectMoveInteractions(rel, fromProfile, toProfile, scan);
  }

  return uniqueRelationships;
}

/**
 * Detect move-level interactions for a relationship.
 */
function detectMoveInteractions(
  rel: AgemonRelationship,
  fromProfile: AgemonProfile,
  toProfile: AgemonProfile,
  scan: AgemonScanResult,
): MoveInteraction[] {
  const interactions: MoveInteraction[] = [];

  // Skip self-references for trigger-chain (hooks trigger the same agemon)
  if (rel.from !== rel.to) {
    interactions.push(...detectTriggerChains(fromProfile, toProfile, scan));
    interactions.push(...detectToolDependencies(fromProfile, toProfile));
  }

  interactions.push(...detectSharedKnowledge(rel, fromProfile, toProfile));

  return interactions;
}

/**
 * trigger-chain: hook reflex moves in `from` that could trigger attack/support moves in `to`.
 * Matches hook event+matcher against target Agemon's name or MCP tools.
 */
function detectTriggerChains(
  fromProfile: AgemonProfile,
  toProfile: AgemonProfile,
  scan: AgemonScanResult,
): MoveInteraction[] {
  const interactions: MoveInteraction[] = [];

  for (let fi = 0; fi < fromProfile.moves.length; fi++) {
    const fromMove = fromProfile.moves[fi];
    if (fromMove.category !== "reflex") continue;

    // Find the hook that produced this reflex move
    const matchingHook = scan.hooks.find(
      (h) => h.event === fromMove.source,
    );
    if (!matchingHook) continue;

    // Check if this hook's matcher relates to the target agemon
    const matcher = matchingHook.matcher?.toLowerCase() ?? "";
    const targetName = toProfile.name.toLowerCase();
    const isTargetMatched =
      matcher.includes(targetName) ||
      matcher.includes(`mcp__${targetName}`);

    if (!isTargetMatched && matcher !== "") continue;
    // If matcher is empty, it applies to all tools — skip to avoid noise
    if (matcher === "") continue;

    // Pair with target's attack or support moves
    for (let ti = 0; ti < toProfile.moves.length; ti++) {
      const toMove = toProfile.moves[ti];
      if (toMove.category !== "attack" && toMove.category !== "support") continue;

      const matcherLabel = matchingHook.matcher || "all";
      interactions.push({
        fromMoveIndex: fi,
        toMoveIndex: ti,
        kind: "trigger-chain",
        description: `${fromMove.name} fires on ${matchingHook.event}[${matcherLabel}] → activates ${toMove.name}`,
        workflowOutcome: `${fromMove.name} validates before ${toMove.name} executes`,
      });
    }
  }

  return interactions;
}

/**
 * tool-dependency: attack moves in `from` whose capabilities/rawContent reference
 * MCP tools that exist in `to`'s support moves.
 */
function detectToolDependencies(
  fromProfile: AgemonProfile,
  toProfile: AgemonProfile,
): MoveInteraction[] {
  const interactions: MoveInteraction[] = [];

  for (let fi = 0; fi < fromProfile.moves.length; fi++) {
    const fromMove = fromProfile.moves[fi];
    if (fromMove.category !== "attack") continue;

    // Build a searchable text from the move's capabilities and description
    const searchText = [
      fromMove.description,
      ...fromMove.capabilities,
    ]
      .join(" ")
      .toLowerCase();

    for (let ti = 0; ti < toProfile.moves.length; ti++) {
      const toMove = toProfile.moves[ti];
      if (toMove.category !== "support") continue;

      // Check if the from move references the MCP server name
      const mcpName = toMove.source.toLowerCase();
      const mcpPattern = new RegExp(`mcp__${mcpName}(?:__|\\b)`, "i");
      if (!mcpPattern.test(searchText) && !searchText.includes(mcpName)) continue;

      // Find specific tool names that match
      const matchedTools = toMove.capabilities.filter((tool) =>
        searchText.includes(tool.toLowerCase()),
      );
      const toolsLabel =
        matchedTools.length > 0 ? matchedTools.join(", ") : mcpName;

      interactions.push({
        fromMoveIndex: fi,
        toMoveIndex: ti,
        kind: "tool-dependency",
        description: `${fromMove.name} calls ${toMove.source}: ${toolsLabel}`,
        workflowOutcome: `${fromMove.name} uses ${toMove.name} tools for execution`,
      });
    }
  }

  return interactions;
}

/**
 * shared-knowledge: passive moves in both Agemon that share the same source
 * (same CLAUDE.md section). Limited to 1 interaction per relationship.
 */
function detectSharedKnowledge(
  rel: AgemonRelationship,
  fromProfile: AgemonProfile,
  toProfile: AgemonProfile,
): MoveInteraction[] {
  // Only relevant for shared-scope relationships
  if (rel.type !== "shared-scope") return [];
  // Skip self-references
  if (rel.from === rel.to) return [];

  for (let fi = 0; fi < fromProfile.moves.length; fi++) {
    const fromMove = fromProfile.moves[fi];
    if (fromMove.category !== "passive") continue;

    for (let ti = 0; ti < toProfile.moves.length; ti++) {
      const toMove = toProfile.moves[ti];
      if (toMove.category !== "passive") continue;

      if (fromMove.source === toMove.source) {
        // Return only the first match (max 1 per relationship)
        return [
          {
            fromMoveIndex: fi,
            toMoveIndex: ti,
            kind: "shared-knowledge",
            description: `Both share "${fromMove.source}" knowledge`,
            workflowOutcome: `Shared "${fromMove.source}" knowledge strengthens both Agemon`,
          },
        ];
      }
    }
  }

  return [];
}

/**
 * Check if a hook is related to an Agemon.
 * Based on the existing isHookRelated logic in moves.ts and score.ts.
 */
function isHookRelated(
  hook: HookInfo,
  profile: AgemonProfile,
  detectedMap: Map<string, DetectedAgemon>,
): boolean {
  const detected = detectedMap.get(profile.id);
  if (!detected) return false;

  // If hook has a matcher, check if it matches the agemon name
  if (hook.matcher) {
    // Case-insensitive substring match
    return hook.matcher.toLowerCase().includes(detected.name.toLowerCase());
  }

  // Hooks without matchers apply to all Agemon (but we don't create relationships for these)
  return false;
}

/**
 * Remove duplicate relationships based on from, to, and type.
 */
function deduplicateRelationships(
  relationships: AgemonRelationship[],
): AgemonRelationship[] {
  const seen = new Set<string>();
  const unique: AgemonRelationship[] = [];

  for (const rel of relationships) {
    const key = `${rel.from}|${rel.to}|${rel.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rel);
    }
  }

  return unique;
}
