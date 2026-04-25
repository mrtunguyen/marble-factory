This file provides guidance to Claude Code (claude.ai/code) when working with
   code in this repository.

  ## Repository shape                                                          
  
  pnpm workspace monorepo. The primary deliverable here is the **Marble        
  Factory** Phaser 3 game in `artifacts/marble-sort/`; the rest of the       
  workspace (api-server, lib/db, lib/api-spec, lib/api-zod,                    
  lib/api-client-react, mockup-sandbox) is scaffolding inherited from the    
  Replit template and is not used by the game.

  Workspace packages (declared in `pnpm-workspace.yaml`): `artifacts/*`,       
  `lib/*`, `lib/integrations/*`, `scripts`. Shared dep versions live in the
  `catalog:` block — packages reference them as `"react": "catalog:"` rather   
  than pinning per-package.                                                  

  ## Commands

  Run from repo root unless noted:

  - `pnpm install` — install (must use pnpm; `preinstall` hook rejects         
  npm/yarn)
  - `pnpm run typecheck` — typecheck all packages (libs via project refs, then 
  artifacts/scripts)                                                           
  - `pnpm run build` — typecheck + build every workspace package that has a
  `build` script                                                               
  - `pnpm --filter @workspace/marble-sort run dev` — run the game locally    
  (Vite, default port 3000, override via `PORT=...`)                           
  - `pnpm --filter @workspace/marble-sort run build` — game-only build →
  `artifacts/marble-sort/dist/public/`                                         
  - `pnpm --filter @workspace/marble-sort run typecheck` — typecheck just the
  game                                                                         
  - `./run.sh` — push the built game to itch.io via `butler` (note: contains a
  hardcoded `BUTLER_API_KEY`; rotate if exposed and avoid widening its blast   
  radius)
                                                                               
  No test runner is configured. Don't claim a feature works without exercising 
  it in the browser via the dev server.
                                                                               
  ## Marble Factory architecture (`artifacts/marble-sort/`)                  

  Three-layer puzzle: GRID (top, tappable tiles holding marbles) → CONVEYOR    
  (middle, shifts right one slot per tick) → SORTING TUBES (bottom,
  color-targeted containers). Win when the grid is empty and every tube is full
   of its target color; lose ("FACTORY JAMMED!") when a marble exits the     
  conveyor with no matching open tube.

  ### Tick pipeline

  Logic is fully separated from rendering. Each tick (default 250ms, see       
  `game/constants.ts`) runs in fixed order:
                                                                               
  1. `gridManager.ts` — tap handler: reveals mystery tiles, decrements counter 
  tiles, releases marbles into `pendingEject`; `refreshLocks` reopens locked
  tiles whose 4-neighbor was just consumed.                                    
  2. `movementSystem.ts` — drains `pendingEject` into `conveyor[0]` if free. 
  3. `conveyorSystem.ts` — shifts conveyor right one slot, emits the rightmost
  marble.                                                                      
  4. `laneSystem.ts` / `containerSystem.ts` — routes the emitted marble into
  its target tube; if the matching tube is full or missing, the game ends.     
                                                                             
  `state.ts` owns `buildGameState`, the snapshot/restore stack used by the Undo
   button (one snapshot per tap), and the master tick driver. **Mutations    
  should always go through these systems** — scenes call in, never reach into  
  game logic ad hoc.                                                         

  ### Scenes

  `scenes/` files are pure Phaser scenes. `GameScene` wires input → grid       
  manager → tick loop → drawing helpers from `game/draw.ts`. `EditorScene` is a
   separate scene reachable via `?scene=editor` that paints tiles, configures  
  tubes, and copies the resulting `LevelDef` as JSON for pasting into        
  `game/levels.ts`.

  ### Deep links

  `PhaserGame.tsx` reads `?level=N` (jump into a built-in level) and           
  `?scene=editor` (open the editor) on game `ready`. Honor these when adding
  entry points.                                                                
                                                                             
  ### Adding a level                                                           
  
  Append a `LevelDef` to `game/levels.ts`. Tile kinds: `block`, `mystery` (gray
   until first tap), `counter` (N taps to release), `locked` (waits for a    
  4-neighbor to be consumed). Tube `color` must match at least one tile color  
  or the level is unwinnable.                                                

  ## TypeScript setup

  `tsconfig.base.json` is strict-ish (`strictNullChecks`, `noImplicitAny`,     
  `noImplicitReturns`) but intentionally leaves `strictFunctionTypes` and
  `noUnusedLocals` off. Root `tsconfig.json` is a project-references file      
  pointing at the lib packages; the game has its own `tsconfig.json` and isn't
  part of the project graph (it gets typechecked via the `pnpm -r` sweep in the
   root `typecheck` script).

  Module resolution uses `customConditions: ["workspace"]` — workspace packages
   can expose source files via the `workspace` export condition without a build
   step.                                                                       
                                                                             
  ## Supply-chain guardrail

  `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (24h). Do not lower or  
  remove it. If you need a fresher package, add it to
  `minimumReleaseAgeExclude` and remove the exclusion once 24h has elapsed.    
                                                                             
  ## itch.io deploy                                                            
  
  1. `pnpm --filter @workspace/marble-sort run build`                          
  2. Zip `artifacts/marble-sort/dist/public/`                                
  3. Upload to itch.io as HTML5, viewport 540×900 (canvas is FIT-scaled).
                                                                               
  `run.sh` automates the push via `butler`.
                                                                               
  One side note while reading: run.sh contains a hardcoded BUTLER_API_KEY. If  
  the repo is or will be public, that key should be rotated and moved out of
  source — happy to help wire it through env vars if you want. 