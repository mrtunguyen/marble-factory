// Level 4 — Triple Sort: introduces the size-matching mechanic.
//
// 3×2 grid: 3 colors × 2 sizes (small, large). Each tile produces 9 marbles
// of its size. Tile graphics scale with size (`useTileSizeScale: true`).
//
// Tube layout is procedurally generated each play (`randomMmcLayout: true`):
// 18 MMCs of 3 holes each (6 per lane). Hole multiset equals the tile supply
// exactly (9 of each (color, size)), so the level is always winnable.
import { DEFAULT_CONVEYOR_CAPACITY, DEFAULT_TICK_MS } from "../constants";
import type { LevelDef } from "../types";
import { Bs } from "./helpers";

export const LEVEL_4: LevelDef = {
  id: 4,
  name: "Triple Sort",
  cols: 3,
  rows: 2,
  conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
  tickMs: DEFAULT_TICK_MS,
  tiles: [
    [Bs("red", "small"),  Bs("blue", "small"),  Bs("green", "small")],
    [Bs("red", "large"),  Bs("blue", "large"),  Bs("green", "large")],
  ],
  tubes: [
    { color: "red",   capacity: 18 },
    { color: "blue",  capacity: 18 },
    { color: "green", capacity: 18 },
  ],
  randomMmcLayout: true,
  useTileSizeScale: true,
  parTimeSec: 60,
  parTaps: 6,
};
