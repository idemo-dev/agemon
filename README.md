# AGEMON

**Visualize, Grow, and Evolve your AI Dev Environment**

Turn your Claude Code commands, MCP servers, hooks, and permissions into collectible pixel art monsters. Each config becomes an Agemon with unique stats, moves, types, and evolution paths.

![AGEMON Dashboard](docs/dashboard.png)

## Features

- **Auto-Detection** — Scans `.claude/commands/`, MCP servers, hooks, permissions, and CLAUDE.md
- **Unique Agemon** — Each command file and MCP server becomes its own monster
- **Trainer Profile** — You're the Trainer; your environment level grows with your config
- **Type System** — 6 types: Scholar, Arsenal, Sentinel, Artisan, Guardian, Catalyst
- **Moves & Stats** — Config capabilities become game techniques with power ratings
- **Pixel Art** — Procedurally generated sprites using a 16-color palette
- **Evolution** — Agemon evolve through stages: Baby → Rookie → Champion → Ultimate → Mega
- **Web Dashboard** — Interactive React UI with party view, search, and detail cards
- **Share Cards** — Export trainer and Agemon cards as PNG images

## Quick Start

```bash
npx agemon
```

This scans your current directory and opens an interactive dashboard in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `npx agemon` | Scan + open dashboard |
| `npx agemon scan` | Print summary to terminal |
| `npx agemon list` | List all detected Agemon |
| `npx agemon show <name>` | Show details for a specific Agemon |
| `npx agemon share` | Generate trainer card PNG |
| `npx agemon share <name>` | Generate Agemon card PNG |
| `npx agemon --json` | Output raw data as JSON |
| `npx agemon --port <port>` | Custom dashboard port (default: 3333) |

## Share Cards

Share cards require the `canvas` package (native dependency):

```bash
npm install canvas
npx agemon share           # Trainer card → agemon-trainer.png
npx agemon share ClaudeBot # Agemon card  → agemon-ClaudeBot.png
```

If `canvas` is not installed, all other features work normally.

## How It Works

```
Your Config Files          Agemon Engine              Dashboard
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ .claude/commands │───▶│ Scan & Score     │───▶│ Trainer Card    │
│ MCP servers      │    │ Generate Moves   │    │ Party Grid      │
│ Hooks            │    │ Assign Types     │    │ Agemon Detail   │
│ Permissions      │    │ Calculate XP     │    │ Move Search     │
│ CLAUDE.md        │    │ Determine Stage  │    │ Pixel Sprites   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

1. **Scan** — Reads config files from your project and global `~/.claude/` directory
2. **Profile** — Builds an Agemon profile for each command/MCP server with stats, moves, and types
3. **Visualize** — Renders pixel art sprites and serves an interactive React dashboard

## Development

```bash
git clone https://github.com/your-username/agemon.git
cd agemon
npm install

# Development
npm run dev:ui          # Vite dev server (port 3333)
npm run dev             # Run CLI in dev mode (tsx)

# Build
npm run build           # Build CLI (tsup) + UI (Vite)

# Test
npm run test            # Run all tests (Vitest)
npm run typecheck       # TypeScript type checking
```

## Requirements

- Node.js 18+
- `canvas` package (optional, for PNG share cards)

## License

MIT
