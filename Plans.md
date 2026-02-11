# Agemon - Implementation Plan (v2: Multi-Agemon Architecture)

> Redesigned from single-environment to multi-Agemon trainer system.
> Each command file and MCP server becomes an individual Agemon.

## Phase 1: Type Foundation + Scanner Restructure `cc:DONE`
- [x] New type system in `src/engine/types.ts`
  - DetectedAgemon, BaseKnowledge, HookInfo, McpServerInfo, PermissionInfo
  - AgemonScanResult, Move, AgemonProfile, TrainerProfile, DashboardData
  - SpriteDefinition, SpriteLayer (pixel art)
- [x] Scanner modules (`src/cli/scanners/`)
  - [x] `base-knowledge.ts` — CLAUDE.md + AGENTS.md detection
  - [x] `commands.ts` — .claude/commands/*.md -> DetectedAgemon[]
  - [x] `mcp.ts` — MCP servers -> DetectedAgemon[] + McpServerInfo[]
  - [x] `hooks.ts` — Hook configurations -> HookInfo[]
  - [x] `common.ts` — Git history + permissions scanning
- [x] Scanner orchestrator (`src/cli/scanner.ts`) with Promise.all parallel execution
- [x] Tests: scanner-commands.test.ts (4), scanner-mcp.test.ts (5)

## Phase 2: Scoring + Moves + Naming + Types `cc:DONE`
- [x] `src/engine/naming.ts` — Deterministic Agemon/Move naming
- [x] `src/engine/moves.ts` — Move generation from 5 sources
  - Command moves (attack), MCP moves (support), Hook moves (reflex)
  - CLAUDE.md passive skills, Permission guard moves
- [x] `src/engine/type-system.ts` — Compound type from top 2 stats
- [x] `src/engine/score.ts` — Per-Agemon XP and 6-stat calculation
- [x] `src/engine/evolution.ts` — Stage from XP (baby -> child -> teen -> adult -> ultimate)
- [x] `src/engine/profile-builder.ts` — Orchestrator: score + moves + naming + types + evolution
- [x] `src/engine/trainer.ts` — TrainerProfile aggregation
- [x] Tests: score (14), naming (9), moves (10), type-system (6), profile-builder (5), trainer (5)

## Phase 3: CLI Rebuild `cc:DONE`
- [x] `src/cli/scanner.ts` — scanAndBuild() pipeline (scan -> profiles -> trainer -> DashboardData)
- [x] `src/cli/index.ts` — 5 commands: default, scan, list, show, share
- [x] `src/cli/server.ts` — Express API server (/api/dashboard)
- [x] Terminal output formatting (trainer card, agemon list, detail view)

## Phase 4: Pixel Art System `cc:DONE`
- [x] `src/pixel/palette.ts` — 16-color palette + type color mapping
- [x] `src/pixel/parts.ts` — Body generators per evolution stage (baby 24x24 -> adult 48x48)
  - Weapon layer for teen+, aura layer for ultimate
- [x] `src/pixel/sprite-generator.ts` — Deterministic sprite generation
- [x] `src/pixel/renderer.ts` — Browser Canvas 2D API with pixelated rendering
- [x] `src/pixel/animation.ts` — 3-frame idle bounce animation
- [x] `src/pixel/visual-spec.ts` + `src/pixel/designer-agent.ts`
  - DesignerAgent prompt template (abstract role, no named IP)
  - VisualSpec schema validation + fallback to baseline deterministic genome
  - Reproducibility cache key: `profileHash + seed + modelVersion`
  - Palette/composition tuning wired into generator pipeline
- [x] Optional LLM Designer hydration (`src/cli/designer-llm.ts`)
  - Runs at scan/build time (not per-frame render), then stores `profile.visualSpec`
  - OpenAI-compatible Chat Completions JSON response integration
  - On-disk cache: `.agemon/designer-spec-cache.json`
- [x] Concept-driven variation + portfolio diversity filter
  - `VisualSpec` extended with `bodyPlan`, `motifParts`, `brief` (DesignBrief)
  - `parts.ts` applies body-plan geometry and motif layers (crest/antenna/mantle/etc.)
  - Similarity scoring (`calculateSpecDistance`) + quality scoring + deterministic mutation retry
  - Enforced diversity across a trainer party before assigning final `profile.visualSpec`
- [x] Tests: sprite-generator (10)

## Phase 5: Web UI Dashboard `cc:DONE`
- [x] `src/ui/theme.css` — CSS variables light theme (white background, pop & clean)
- [x] New components:
  - [x] PixelMonster.tsx — Canvas + requestAnimationFrame
  - [x] RadarChart.tsx — SVG hexagonal 6-axis radar chart
  - [x] MoveCard.tsx — Expandable move cards with flavor text
  - [x] MoveList.tsx — Category-grouped move list
  - [x] TrainerCard.tsx — Trainer profile card
  - [x] AgemonList.tsx — Mini-sprite agemon list
  - [x] AgemonDetail.tsx — Full detail view
  - [x] PartyTab.tsx — Main tab (trainer + global/project agemon)
  - [x] SearchTab.tsx — Cross-agemon move search
- [x] App.tsx — PARTY/SEARCH tabs, detail drill-down, /api/dashboard fetch
- [x] Vite proxy config for dev (UI:3333 -> API:3334)

## Phase 6: Share + Polish `cc:TODO`
- [x] `src/share/card-renderer.ts` — 1200x630px PNG generation (trainer + agemon cards)
- [x] `src/share/canvas.d.ts` — Type declarations for optional canvas module
- [x] CLI share command implementation
- [ ] Install and test node-canvas for actual PNG output
- [ ] CSS animation polish
- [ ] README with demo screenshots
- [ ] npm publish preparation

## Test Summary
- 9 test files, 68 tests total — all passing
- TypeScript strict mode — type check passing

## Architecture Decision Log
- **Egg stage removed**: Evolution starts from Baby (Rookie) — more engaging first experience
- **Multi-Agemon**: 1 command = 1 Agemon, 1 MCP server = 1 Agemon
- **Pixel art**: Canvas API, not SVG — programmatic generation from stats
- **Light theme**: White background for pixel art visibility and social sharing
