// Pure game logic for Block Match
import type {
  Block,
  BlockColor,
  Cell,
  GameState,
  GameStateSnapshot,
  LevelDef,
} from "./types";
import { ALL_COLORS, MATCH_COUNT } from "./constants";

const COLOR_MAP: Record<string, BlockColor> = {
  r: "red",
  b: "blue",
  g: "green",
  y: "yellow",
  p: "purple",
  o: "orange",
  k: "pink",
  c: "cyan",
};

// Parse a level definition into game state
export function buildGameState(def: LevelDef): GameState {
  const cells: Cell[][] = [];
  for (let r = 0; r < def.rows; r++) {
    const row: Cell[] = [];
    const rowStr = def.grid[r] ?? "";
    for (let c = 0; c < def.cols; c++) {
      const tok = rowStr.slice(c * 2, c * 2 + 2);
      row.push(parseToken(tok));
    }
    cells.push(row);
  }

  const collected: Record<BlockColor, number> = {
    red: 0, blue: 0, green: 0, yellow: 0,
    purple: 0, orange: 0, pink: 0, cyan: 0,
  };

  return {
    cols: def.cols,
    rows: def.rows,
    cells,
    tray: [],
    trayCapacity: def.trayCapacity,
    collected,
    history: [],
    status: "playing",
  };
}

function parseToken(tok: string): Cell {
  if (!tok || tok === "..") return null;
  const colorChar = tok[0];
  const kindChar = tok[1];
  if (kindChar === "m") {
    return { color: "red", kind: "mystery" }; // color picked on tap
  }
  if (kindChar === "3" || kindChar === "2") {
    const color = COLOR_MAP[colorChar];
    if (!color) return null;
    return { color, kind: "counter", counter: kindChar === "3" ? 3 : 2 };
  }
  // normal "n"
  const color = COLOR_MAP[colorChar];
  if (!color) return null;
  return { color, kind: "normal" };
}

// Snapshot game state for undo
export function snapshot(state: GameState): GameStateSnapshot {
  return {
    cells: state.cells.map((row) => row.map((c) => (c ? { ...c } : null))),
    tray: state.tray.map((b) => ({ ...b })),
    collected: { ...state.collected },
  };
}

// Restore from snapshot
export function restoreSnapshot(state: GameState, snap: GameStateSnapshot): void {
  state.cells = snap.cells.map((row) => row.map((c) => (c ? { ...c } : null)));
  state.tray = snap.tray.map((b) => ({ ...b }));
  state.collected = { ...snap.collected };
  state.status = "playing";
}

// Get all colors present in the grid (non-mystery)
export function gridColorPool(state: GameState): BlockColor[] {
  const set = new Set<BlockColor>();
  for (const row of state.cells) {
    for (const c of row) {
      if (c && c.kind !== "mystery") set.add(c.color);
    }
  }
  if (set.size === 0) return [...ALL_COLORS];
  return [...set];
}

// Resolve a mystery block: pick random color from grid pool
export function resolveMysteryColor(state: GameState): BlockColor {
  const pool = gridColorPool(state);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Check if block is "removable" — i.e., counter has reached 1 (next tap removes)
// Counter blocks need multiple taps before being moved to tray
// Returns whether this tap moves to tray, or just decrements
export interface TapResult {
  movedToTray: boolean;
  block: Block | null;
}

export function tapCell(state: GameState, r: number, c: number): TapResult {
  const cell = state.cells[r][c];
  if (!cell) return { movedToTray: false, block: null };

  if (state.tray.length >= state.trayCapacity) {
    return { movedToTray: false, block: null };
  }

  if (cell.kind === "counter" && cell.counter && cell.counter > 1) {
    // Decrement counter only
    cell.counter -= 1;
    return { movedToTray: false, block: null };
  }

  // Resolve color
  let resolved: Block;
  if (cell.kind === "mystery") {
    resolved = { color: resolveMysteryColor(state), kind: "normal" };
  } else {
    resolved = { color: cell.color, kind: "normal" };
  }

  // Remove from grid
  state.cells[r][c] = null;

  // Insert into tray, grouped by color
  insertIntoTray(state.tray, resolved);

  return { movedToTray: true, block: resolved };
}

// Insert a block into tray, keeping same colors grouped together
// Algorithm: find the rightmost block of the same color, insert right after it.
// If no same color exists, append to end.
export function insertIntoTray(tray: Block[], block: Block): void {
  let insertAt = tray.length;
  for (let i = tray.length - 1; i >= 0; i--) {
    if (tray[i].color === block.color) {
      insertAt = i + 1;
      break;
    }
  }
  tray.splice(insertAt, 0, block);
}

// Find a run of MATCH_COUNT or more same-color blocks in tray
// Returns [startIndex, length] or null
export function findMatch(tray: Block[]): { start: number; length: number } | null {
  let i = 0;
  while (i < tray.length) {
    let j = i + 1;
    while (j < tray.length && tray[j].color === tray[i].color) j++;
    const len = j - i;
    if (len >= MATCH_COUNT) {
      return { start: i, length: len };
    }
    i = j;
  }
  return null;
}

// Remove a run from tray and update collected count
export function clearMatch(
  state: GameState,
  match: { start: number; length: number }
): BlockColor {
  const color = state.tray[match.start].color;
  state.tray.splice(match.start, match.length);
  state.collected[color] += match.length;
  return color;
}

// Check whether the player has won (grid empty)
export function isGridEmpty(state: GameState): boolean {
  for (const row of state.cells) {
    for (const c of row) {
      if (c) return false;
    }
  }
  return true;
}

// Check whether the player has lost (tray full and no immediate match possible)
export function isLost(state: GameState): boolean {
  if (state.tray.length < state.trayCapacity) return false;
  // Tray full and no match — game over
  return findMatch(state.tray) === null;
}
