// GridManager — pure logic for the grid layer.
//
// Responsibilities:
//   - Tap a tile and decide what happens (reveal mystery, decrement counter,
//     unlock-aware check, or release marbles into the pending-eject queue).
//   - Manage the locked-by-neighbor rule.
//
// No Phaser imports. All functions mutate the GameState in place and the caller
// is responsible for snapshotting before mutation if undo is needed.

import type { GameState, GridTile } from "./types";

/** Result of attempting to tap a grid tile. */
export interface TapOutcome {
  kind:
    | "noop"          // tile is empty / locked / unknown
    | "revealed"      // mystery tile revealed its color
    | "counter"       // counter decremented but not yet unlocked
    | "released";     // marbles were released into pendingEject
  releasedCount: number;
  tile: GridTile | null;
}

/** True when (r, c) is in bounds and the tile there is empty. */
function isEmpty(state: GameState, r: number, c: number): boolean {
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false;
  return state.tiles[r][c] === null;
}

/** A locked tile is unlocked when at least one of its 4-neighbors is empty. */
export function locksSatisfied(
  state: GameState,
  r: number,
  c: number,
): boolean {
  return (
    isEmpty(state, r - 1, c) ||
    isEmpty(state, r + 1, c) ||
    isEmpty(state, r, c - 1) ||
    isEmpty(state, r, c + 1)
  );
}

/** Walk the grid and flip `unlocked` flags for any locked tile whose neighbor
 *  has been emptied. Idempotent — safe to call after every grid mutation. */
export function refreshLocks(state: GameState): void {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const t = state.tiles[r][c];
      if (t && t.kind === "locked" && !t.unlocked && locksSatisfied(state, r, c)) {
        t.unlocked = true;
      }
    }
  }
}

/** Tap the tile at (r, c) and apply the appropriate transition.
 *  Returns a description of what happened. */
export function tapTile(state: GameState, r: number, c: number): TapOutcome {
  if (state.status !== "playing") {
    return { kind: "noop", releasedCount: 0, tile: null };
  }
  const tile = state.tiles[r][c];
  if (!tile) return { kind: "noop", releasedCount: 0, tile: null };

  // Locked: must be unlocked first.
  if (tile.kind === "locked" && !tile.unlocked) {
    if (!locksSatisfied(state, r, c)) {
      return { kind: "noop", releasedCount: 0, tile };
    }
    tile.unlocked = true;
    // First tap on a locked tile just opens the lock — releases nothing.
    return { kind: "revealed", releasedCount: 0, tile };
  }

  // Mystery: first tap reveals.
  if (tile.kind === "mystery" && !tile.revealed) {
    tile.revealed = true;
    return { kind: "revealed", releasedCount: 0, tile };
  }

  // Counter: decrement until 0.
  if (tile.kind === "counter" && tile.counter && tile.counter > 1) {
    tile.counter -= 1;
    return { kind: "counter", releasedCount: 0, tile };
  }
  if (tile.kind === "counter" && tile.counter === 1) {
    // About to release on this tap.
    tile.counter = 0;
  }

  // Release ALL the tile's marbles into the pending-eject queue at once.
  return releaseAllMarbles(state, r, c, tile);
}

function releaseAllMarbles(
  state: GameState,
  r: number,
  c: number,
  tile: GridTile,
): TapOutcome {
  if (tile.marblesLeft <= 0) {
    state.tiles[r][c] = null;
    refreshLocks(state);
    return { kind: "noop", releasedCount: 0, tile: null };
  }
  const count = tile.marblesLeft;
  for (let i = 0; i < count; i++) {
    state.pendingEject.push({
      id: state.nextMarbleId++,
      color: tile.color,
      size: tile.size,
    });
  }
  tile.marblesLeft = 0;
  state.tiles[r][c] = null;
  refreshLocks(state);
  return { kind: "released", releasedCount: count, tile: null };
}

/** True when every grid tile is null (all blocks consumed). */
export function isGridEmpty(state: GameState): boolean {
  for (const row of state.tiles) {
    for (const t of row) {
      if (t) return false;
    }
  }
  return true;
}
