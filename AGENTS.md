# Agemon - Agent Instructions

## Project Context
Agemon (AgentMonster) is a CLI tool that scans AI development environment configs and visualizes them as pixel art monster characters. Each command file (`.claude/commands/*.md`) and MCP server becomes an individual Agemon. Users act as "Trainers" managing a party of Agemon.

See `agemon-design-doc.docx` for original specification. See `Plans.md` for current implementation status.

## Architecture Overview

```
src/
  engine/           # Pure logic layer (no I/O)
    types.ts        # Single source of truth for all types
    score.ts        # Per-Agemon XP and 6-stat calculation
    evolution.ts    # Stage determination from XP (baby->child->teen->adult->ultimate)
    naming.ts       # Deterministic Agemon/Move name generation
    moves.ts        # Move generation from 5 sources (command/mcp/hook/passive/guard)
    type-system.ts  # Compound type from stat distribution (1-2 types)
    profile-builder.ts  # Orchestrator: scan -> AgemonProfile
    trainer.ts      # TrainerProfile aggregation across all Agemon

  cli/              # I/O layer (filesystem, network)
    index.ts        # CLI entry (commander.js): scan, list, show, share
    scanner.ts      # Orchestrator: runs all scanners, builds DashboardData
    server.ts       # Express server (/api/dashboard endpoint)
    scanners/
      base-knowledge.ts  # CLAUDE.md + AGENTS.md detection
      commands.ts        # .claude/commands/*.md -> DetectedAgemon[]
      mcp.ts             # MCP servers -> DetectedAgemon[] + McpServerInfo[]
      hooks.ts           # Hook configs -> HookInfo[]
      common.ts          # Git history + permissions scanning

  pixel/            # Pixel art rendering
    palette.ts      # 16-color palette with type-based colors
    parts.ts        # Body/weapon/aura generators per evolution stage
    sprite-generator.ts  # stats + types + stage -> SpriteDefinition
    renderer.ts     # Browser Canvas 2D API rendering
    animation.ts    # 3-frame idle bounce animation

  share/            # Social sharing
    card-renderer.ts  # 1200x630px PNG card generation (optional node-canvas)

  ui/               # React dashboard (Vite-served)
    App.tsx         # PARTY/SEARCH tabs, agemon detail drill-down
    theme.css       # CSS variable light theme
    components/     # PartyTab, SearchTab, AgemonList, AgemonDetail,
                    # PixelMonster, RadarChart, MoveCard, MoveList,
                    # TrainerCard, Evolution, Equipment, etc.

tests/              # Vitest (68 tests across 9 files)
```

## Key Design Rules

1. **Types first**: All data shapes defined in `src/engine/types.ts` before implementation
2. **Scanners are pure**: `(projectPath: string) => Promise<T>` — handle missing files gracefully
3. **Engine is deterministic**: Same input always produces same output (no randomness)
4. **Read-only**: Never modify user config files
5. **One Agemon per source**: Each command file = 1 Agemon, each MCP server = 1 Agemon
6. **Base knowledge is shared**: CLAUDE.md/AGENTS.md boost all Agemon's Knowledge stat
7. **Hooks distribute**: Hook moves go to related Agemon by matcher, or to all if no matcher

## Data Flow

```
Filesystem scan (scanners/)
  -> AgemonScanResult
    -> buildAllProfiles (profile-builder.ts)
      -> For each DetectedAgemon:
         score.ts (XP, stats) + naming.ts + moves.ts + type-system.ts + evolution.ts
         -> AgemonProfile
    -> buildTrainerProfile (trainer.ts)
      -> TrainerProfile
        -> DashboardData { trainer, scan, generatedAt }
          -> CLI output OR /api/dashboard JSON -> React UI
```

## Evolution Stages (no egg — starts from baby)
| Stage    | Title      | Min Level | Sprite Size |
|----------|------------|-----------|-------------|
| baby     | Rookie     | 0         | 24x24       |
| child    | Apprentice | 5         | 32x32       |
| teen     | Specialist | 10        | 32x32       |
| adult    | Expert     | 15        | 48x48       |
| ultimate | Legendary  | 20        | 48x48       |

## Stat System (6 axes, 0-100 each)
| Stat      | Source                           |
|-----------|----------------------------------|
| knowledge | CLAUDE.md/AGENTS.md depth        |
| arsenal   | Tool references / MCP tools count|
| reflex    | Related hooks count              |
| mastery   | rawContent complexity            |
| guard     | Related permissions count        |
| synergy   | Scope bonus + git age            |

## Move Categories
| Category | Source            | Example                    |
|----------|-------------------|----------------------------|
| attack   | Command content   | "Deploy Strike" from deploy.md |
| support  | MCP tools         | "GitHub Fetch" from MCP server |
| reflex   | Hooks             | "Pre-commit Shield"        |
| passive  | CLAUDE.md sections| "Knowledge Aura"           |
| guard    | Permissions       | "Tool Barrier"             |

## Dev Workflow
```bash
npm run test        # Vitest (68 tests)
npm run typecheck   # TypeScript strict mode
npm run dev:ui      # Vite on :3333 (proxy /api -> :3334)
npx tsx src/cli/index.ts --port 3334  # API server
npx tsx src/cli/index.ts scan         # Terminal output
```

## Testing
- Tests in `tests/` directory using Vitest
- Mock filesystem for scanner tests (no real file access)
- Edge case coverage for scoring (0 XP, max XP, boundary levels)
- Determinism tests for sprite generation
- Run: `npm run test`
