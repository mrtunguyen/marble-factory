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

### Marble Sort (`artifacts/marble-sort`)
- **Type**: react-vite (Phaser 3 browser game)
- **Preview path**: `/`
- **Stack**: Phaser 3 + TypeScript + Vite
- **Build output**: `dist/public/` — static bundle ready for itch.io

#### Game Features
- 5 levels with increasing difficulty
- Marble sorting mechanic: click tube to select, click another to move top marble
- Locked tubes gameplay twist: tubes locked for N moves
- Undo/Restart support
- Level Editor with JSON import/export
- Animated marble movement with arc tweens
- Star rating on completion

#### File Structure
```
src/
  game/
    types.ts       — TypeScript interfaces
    logic.ts       — Pure game logic (canMove, applyMove, isLevelComplete, etc.)
    levels.ts      — Level definitions (JSON format)
    constants.ts   — Colors, sizes, scene keys
  scenes/
    MenuScene.ts         — Main menu with level selection
    GameScene.ts         — Main gameplay
    LevelCompleteScene.ts — Win screen with confetti
    EditorScene.ts       — Level editor
  PhaserGame.tsx   — Phaser game bootstrap in React
  App.tsx          — Root React component
```

#### itch.io Deployment
1. Run `pnpm --filter @workspace/marble-sort run build`
2. Zip `artifacts/marble-sort/dist/public/`
3. Upload the zip to itch.io as an HTML5 game
4. Set viewport to 640x700
