# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Marble Factory — formerly Marble Sort (`artifacts/marble-sort`)
- **Type**: react-vite (Phaser 3 browser game), 540×900 canvas
- **Preview path**: `/`
- **Stack**: Phaser 3 + TypeScript + Vite
- **Build output**: `dist/public/` — static bundle ready for itch.io

#### Game Concept
Three-layer marble factory:
1. **GRID (top)** — chunky candy-colored block tiles. Tap a block to release its marbles.
2. **CONVEYOR (middle)** — horizontal pipe with N slots. Marbles shift one slot to the right per tick.
3. **SORTING TUBES (bottom)** — vertical containers, each capped with a target color. Marbles emerging from the conveyor auto-route into their matching color tube.

Tile types:
- **Block** — standard candy tile, releases all its marbles on a single tap.
- **Mystery `?`** — gray tile that reveals a hidden color on first tap, releases marbles on the second tap.
- **Counter `N`** — block with a dark badge showing N taps remaining; releases marbles when the counter hits zero.
- **Locked 🔒** — padlocked tile that cannot be tapped until any 4-neighbor tile is consumed.

Win: every block consumed and every tube full of its target color.
Lose ("FACTORY JAMMED!"): a marble exits the conveyor and the matching tube is full / missing.

#### Game Features
- 5 hand-tuned levels (Trickle Start, Hold the Line, Mystery Cargo, Padlock, Factory Rush) — each introducing one new mechanic.
- Tick-driven simulation (default 250 ms/tick), pure logic separated from rendering.
- Undo (per-tap snapshot) and Restart icon buttons in the top bar.
- Level Editor: paint tile types, configure tube colors and capacities, copy level as JSON, test-play.
- Deep-link query params: `/?level=N` jumps straight into a level, `/?scene=editor` opens the editor.

#### File Structure
```
src/
  game/
    types.ts            — Marble, GridTile, Tube, LevelDef, GameState, etc.
    constants.ts        — Canvas, palette, layout & timing constants
    draw.ts             — Shared chunky-candy/marble/pipe/tube drawing helpers
    gridManager.ts      — Tap → reveal/decrement/release; locked-by-neighbor rule
    movementSystem.ts   — Drains pendingEject queue into conveyor[0]
    conveyorSystem.ts   — Shifts conveyor right one slot; emits rightmost
    containerSystem.ts  — Routes emitted marble into target tube; overflow check
    state.ts            — buildGameState, snapshot/restore (undo), tick driver
    levels.ts           — 5 built-in level definitions
  scenes/
    MenuScene.ts            — Main menu with level select & tube color preview
    GameScene.ts            — 3-layer rendering + tick loop + input wiring
    LevelCompleteScene.ts   — "TUBES SORTED!" + confetti + Next/Replay/Menu
    GameOverScene.ts        — "FACTORY JAMMED!" + Retry/Menu
    EditorScene.ts          — Level editor (paint, tubes, copy-JSON, test-play)
  PhaserGame.tsx     — Phaser bootstrap in React; supports ?level=N deep link
  App.tsx            — Root React component
```

#### itch.io Deployment
1. Run `pnpm --filter @workspace/marble-sort run build`
2. Zip `artifacts/marble-sort/dist/public/`
3. Upload the zip to itch.io as an HTML5 game
4. Set viewport to 540×900 (the canvas is FIT-scaled, so it adapts to the iframe)
