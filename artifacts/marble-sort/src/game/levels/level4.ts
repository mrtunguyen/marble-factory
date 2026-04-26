// Level 4 — Triple Sort: introduces the size-matching mechanic.
//
// 3×2 grid: 3 colors × 2 sizes (small, large). Each tile produces 9 marbles
// of its size. Tile graphics scale with size (`useTileSizeScale: true`).
//
// Tube layout is procedurally generated each play (`randomMmcLayout: true`):
// 18 MMCs of 3 holes each (6 per lane). Hole multiset equals the tile supply
// exactly (9 of each (color, size)), so the level is always winnable.
import { DEFAULT_CONVEYOR_CAPACITY, DEFAULT_TICK_MS } from "../constants";
import type { LevelDef, MarbleColor } from "../types";
import { Bs } from "./helpers";

// Shuffle each row independently so tile positions vary each page load while
// each color still appears exactly once per row (accounting stays balanced).
const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const ALL_COLORS: MarbleColor[] = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const COLORS = shuffle(ALL_COLORS).slice(0, 3);

export const LEVEL_4: LevelDef = {
  id: 4,
  name: "Triple Sort",
  cols: 3,
  rows: 2,
  conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
  tickMs: DEFAULT_TICK_MS,
  tiles: [
    shuffle(COLORS).map(c => Bs(c, "small")),
    shuffle(COLORS).map(c => Bs(c, "large")),
  ],
  tubes: COLORS.map(c => ({ color: c, capacity: 18 })),
  randomMmcLayout: true,
  useTileSizeScale: true,
  parTimeSec: 60,
  parTaps: 6,
};
