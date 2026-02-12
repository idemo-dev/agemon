# Agemon - Implementation Plan (v2: Multi-Agemon Architecture)

> Redesigned from single-environment to multi-Agemon trainer system.
> Each command file, MCP server, and plugin becomes an individual Agemon.

## Completed Phases (1-6) `cc:DONE`

- **Phase 1**: Type system + scanner modules (commands, mcp, hooks, base-knowledge, common)
- **Phase 2**: Scoring, moves, naming, type-system, evolution, profile-builder, trainer
- **Phase 3**: CLI rebuild (5 commands, Express API server, terminal formatting)
- **Phase 4**: Pixel art (16-color palette, sprite generator, Canvas renderer, animation, LLM designer hydration, diversity filter)
- **Phase 5**: Web UI dashboard (12 React components, PARTY/SEARCH tabs, Vite proxy)
- **Phase 5.5**: Dashboard UX overhaul (move dedup, grid layout, search→detail nav, radar labels)
- **Phase 6**: Share cards (PNG export), CSS polish, README, npm publish prep

## Phase 7: Synergy Map — Agemon 関係性可視化 `cc:DONE`

- [x] Relationship engine: dependency / trigger / shared-scope detection (config-based analysis)
- [x] Scanner integration: `detectRelationships()` in scanAndBuild pipeline
- [x] SynergyMap UI: card-centric design (replaced d3-force Canvas graph)
  - RelationshipCard with mini sprites, type badge, strength, interactions
  - Bidirectional deduplication for shared-scope

## Phase 7.5: Move-level Workflow Visualization `cc:DONE`

> Agemon-to-Agemon の関係を Move-to-Move レベルに深化させ、ワークフローチェーンとして UI に表示。

### Task 1: 型定義 — MoveInteraction + AgemonRelationship 拡張
- [x] `InteractionKind` 型追加: `"trigger-chain" | "tool-dependency" | "shared-knowledge"`
- [x] `MoveInteraction` インターフェース追加 (fromMoveIndex, toMoveIndex, kind, description, workflowOutcome)
- [x] `AgemonRelationship` に `interactions: MoveInteraction[]` フィールド追加

### Task 2: ムーブインタラクション検出エンジン
- [x] `detectMoveInteractions()` — 3パターンの検出ロジック
  - trigger-chain: reflex ムーブ (hook) → target attack/support ペアリング
  - tool-dependency: attack capabilities 内 MCP 参照 → support ムーブマッチング
  - shared-knowledge: 同一 passive source ペアリング (max 1 per relationship)
- [x] Self-reference exclusion for trigger-chain

### Task 3: テスト
- [x] `tests/relationships.test.ts` — 既存テストに `interactions: []` 期待値追加
- [x] `tests/move-interactions.test.ts` — 新規 11 tests (TDD)

### Task 4-5: SynergyMap UI 統合 (Card-centric redesign)
- [x] d3-force Canvas グラフ → カードベースデザインに全面書き換え
  - 各 RelationshipCard にミニスプライト2体 + 矢印 + 関係タイプバッジ + STR + interactions
  - Bidirectional deduplication (shared-scope A↔B shown once)
  - d3-force 依存削除 (バンドルサイズ 287KB → 268KB)
- [x] `WorkflowChainList.tsx` は SynergyMap に統合 (ファイル削除済み)

## Phase 8: Plugin Scanning + CLAUDE.md Fallback `cc:DONE`

> コマンドや MCP がないプロジェクトでも Agemon が検出されるように拡張。
> Plugin ベースのプロジェクト (mosAI 等) でも Agemon を生成。

### Task 1: 型拡張
- [x] `AgemonSource` に `"plugin"` と `"base"` を追加
- [x] `PluginInfo` インターフェース追加 (name, publisher, fullId, enabled, scope)
- [x] `AgemonScanResult` に `plugins: PluginInfo[]` フィールド追加

### Task 2: Plugin Scanner
- [x] `src/cli/scanners/plugins.ts` — 新規
  - `enabledPlugins` を settings.json (プロジェクト + グローバル) から読み取り
  - `"name@publisher": true` 形式をパース
  - 各有効プラグイン = 1 DetectedAgemon (source: "plugin")
- [x] `tests/scanner-plugins.test.ts` — 7 tests

### Task 3: CLAUDE.md Fallback
- [x] `src/cli/scanner.ts` — コマンド/MCP/プラグイン全て 0体の場合、CLAUDE.md から base Agemon を1体生成

### Task 4: Engine + UI 対応
- [x] `moves.ts` — `generatePluginMoves()` 追加 (support, power 45)
- [x] `score.ts` — plugin XP=100, base XP=60, arsenal/mastery 計算対応
- [x] AgemonList.tsx, AgemonDetail.tsx — SOURCE_BADGE マップ (CMD/MCP/PLG/BASE)
- [x] CLI index.ts — ターミナル出力も PLG/BASE ラベル対応
- [x] Evolution.tsx — Egg ステージ削除 (Baby から開始)

### 検証結果
- mosAI プロジェクト: 0体 → 7体 (7 PLG) に改善
- agemon プロジェクト: 3体 → 10体 (7 PLG + 3 CMD) に拡張

## Test Summary
- 18 test files, 131 tests total — all passing
- TypeScript strict mode — type check passing

## Architecture Decision Log
- **Egg stage removed**: Evolution starts from Baby (Rookie) — more engaging first experience
- **Multi-Agemon**: 1 command = 1 Agemon, 1 MCP server = 1 Agemon, 1 plugin = 1 Agemon
- **Plugin scanning**: Each enabled plugin in `enabledPlugins` settings becomes an Agemon (source: "plugin")
- **CLAUDE.md fallback**: When no other Agemon sources exist, CLAUDE.md becomes a base Agemon (source: "base")
- **Pixel art**: Canvas API, not SVG — programmatic generation from stats
- **Light theme**: White background for pixel art visibility and social sharing
- **Synergy Map viz**: Card-centric design over Canvas force graph — each relationship is a self-contained card with mini sprites
- **Relationship detection**: Real dependency-based (config analysis), not type-affinity-based — user preference for actual workflows
- **Move interactions**: 3 patterns (trigger-chain, tool-dependency, shared-knowledge) detected from move metadata
