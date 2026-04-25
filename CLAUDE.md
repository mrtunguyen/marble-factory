# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

pnpm workspace monorepo. The active artifact is the **Marble Factory** browser game at `artifacts/marble-sort/`. Other workspaces (`artifacts/api-server`, `lib/db`, `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`) are scaffolded backend/codegen packages from a Replit template — they exist but the game does not currently use them.

`pnpm` is enforced via a `preinstall` script that fails on `npm`/`yarn`. `pnpm-workspace.yaml` enforces a 1-day `minimumReleaseAge` on dependencies as supply-chain defense — do not lower or remove this without an explicit reason; add to `minimumReleaseAgeExclude` only for packages from trusted publishers.

## Common commands

Root:
- `pnpm run typecheck` — typechecks all `lib/*` (project-references build) plus every workspace with a `typecheck` script.
- `pnpm run build` — typecheck + run each workspace's build.

Marble game (`artifacts/marble-sort/`):
- `pnpm --filter @workspace/marble-sort run dev` — Vite dev server on `0.0.0.0`.
- `pnpm --filter @workspace/marble-sort run build` — outputs `dist/public/` (the artifact you zip for itch.io).
- `pnpm --filter @workspace/marble-sort run typecheck` — `tsc --noEmit` for just this package.

Backend scaffolding (only relevant if working on those packages):
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas from `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes (dev only).
- `pnpm --filter @workspace/api-server run dev` — local API server.

There is no test runner or linter wired up at the workspace level — typecheck is the only gate.

## Marble Factory architecture

Three-layer factory game; the code mirrors that vertical structure. **Pure logic is fully decoupled from rendering** — `src/game/` has no Phaser imports; `src/scenes/` consumes the logic and animates events.

### Layered simulation (`src/game/`)

The world is a single `GameState` ([types.ts](artifacts/marble-sort/src/game/types.ts)) that flows top-to-bottom each tick:

1. **Grid** ([gridManager.ts](artifacts/marble-sort/src/game/gridManager.ts)) — chunky candy tiles. Tap handlers for the four `TileKind`s (`block`, `mystery`, `counter`, `locked`). Tapping a finished tile pushes its marbles into `pendingEject`. `refreshLocks` re-evaluates locked tiles whenever a 4-neighbor is consumed.
2. **Conveyor** ([conveyorSystem.ts](artifacts/marble-sort/src/game/conveyorSystem.ts), [movementSystem.ts](artifacts/marble-sort/src/game/movementSystem.ts)) — fixed-length array (capped at `MAX_CONVEYOR_CAPACITY = 16`). Each tick, the rightmost slot is emitted, the entry slot is filled from `pendingEject`, and emitted marbles wrap back to slot 0 (looping conveyor — see `tick` in [state.ts](artifacts/marble-sort/src/game/state.ts:158)).
3. **Lanes** ([laneSystem.ts](artifacts/marble-sort/src/game/laneSystem.ts)) — vertical sorting lanes hold a queue of MMCs (mini marble containers). Only the **head** MMC of each lane is active; it pulls compatible-color marbles from the conveyor slot adjacent to that lane, via `laneSlotIndex(laneIdx)` injected by the renderer. Filled MMCs ship out; the next in queue activates. `state.tubes` is legacy authoring/UI data — runtime logic uses `state.lanes`.

The master tick driver in [state.ts](artifacts/marble-sort/src/game/state.ts:149) runs phases in order: emit → inject → pickup → ship → deadlock check → win check. Returns a `TickResult` of events for the renderer to animate. Status transitions to `"won"` when grid/queue/conveyor are empty and all lanes complete; `"lost"` on conveyor deadlock (full conveyor with no color matching any active MMC head).

Undo is per-tap snapshots pushed onto `state.history` ([state.ts:72](artifacts/marble-sort/src/game/state.ts#L72)). Snapshots are deep copies of mutable state; history is excluded from the snapshot itself.

### Rendering and scenes (`src/scenes/`)

Phaser 3 with Matter physics enabled (`gravity { x: 0, y: 2 }`, debug toggleable at runtime via D key — see [PhaserGame.tsx](artifacts/marble-sort/src/PhaserGame.tsx:36)). Five scenes: `MenuScene`, `GameScene` (3-layer rendering + tick loop wiring + tap input), `LevelCompleteScene`, `GameOverScene`, `EditorScene`.

[PhaserGame.tsx](artifacts/marble-sort/src/PhaserGame.tsx) is the React → Phaser bootstrap. It reads URL params on `ready`:
- `?level=N` — jump straight into level N.
- `?scene=editor` — open the level editor.

Canvas is fixed `540×900` ([constants.ts](artifacts/marble-sort/src/game/constants.ts)) with `Phaser.Scale.FIT` so iframes adapt automatically. All visual constants (palette, tile sizes, animation timing) live in [constants.ts](artifacts/marble-sort/src/game/constants.ts) — most rendering files import from there rather than hard-coding values.

### Levels

Five built-in levels in [levels.ts](artifacts/marble-sort/src/game/levels.ts), each introducing one mechanic. The `EditorScene` produces JSON in the same `LevelDef` shape — paint tiles, configure tubes, copy-JSON, and test-play.

## Conventions worth knowing

- TypeScript is strict-ish (`strictNullChecks`, `noImplicitAny`, `noImplicitReturns`) but `strictFunctionTypes` and `noUnusedLocals` are off — see [tsconfig.base.json](tsconfig.base.json).
- TS project references resolve workspace packages; the root `tsconfig.json` references `lib/db`, `lib/api-client-react`, `lib/api-zod` via `customConditions: ["workspace"]`.
- The game's pure-logic modules in `src/game/` must stay free of Phaser/DOM imports — keep that separation when adding features.
- itch.io shipping flow: `pnpm --filter @workspace/marble-sort run build`, then zip `artifacts/marble-sort/dist/public/` and upload as HTML5.
