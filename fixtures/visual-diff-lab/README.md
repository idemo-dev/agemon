# Visual Diff Lab

Deterministic comparison fixture for validating Agemon sprite diversity.

## What this fixture contains

- 6 project command agents in `project/.claude/commands/`
- 4 MCP agents in `project/.claude/settings.json`
- Hook configuration intentionally skewed so some agents have very different reflex/xp
- Minimal `CLAUDE.md` and `AGENTS.md` to avoid overpowering all stats with shared knowledge

## Run

1. Start fixture API server:
   - `npm run dev:visual-lab`
2. Start UI in another terminal:
   - `npm run dev:ui`
3. Open dashboard:
   - `http://localhost:3333`

By default, fixture API runs on `http://localhost:3334`.
Vite UI on `3333` proxies `/api` to `3334`.

## Visual Check List

1. Confirm multiple body silhouettes appear in PARTY list.
2. Confirm eye/mouth/horn/pattern variations are visible between similar stages.
3. Confirm at least one higher stage (teen) appears with noticeably different proportions.
4. Confirm weapon style differs across teen+ agents.
5. Confirm refreshing the page does not change any sprite for the same agent.

## Optional: custom port

- `npx tsx src/cli/visual-lab.ts 3350`
