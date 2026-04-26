// Level 5 — Merge Zone: introduces the physics merge mechanic.
//
// 4×3 grid, 4 colors, all small marbles. Tapping a tile drops smalls into a
// physics bowl above the conveyor. Same-color smalls colliding auto-merge into
// a large; different-color contact just bounces (with a sparkle).
//
// Per-color accounting:
//   - 3 tiles × marblesPerBlock=9 → 27 smalls per color released.
//   - holeSupply: 6 small + 6 large per color (= 12 holes/color = 4 MMCs).
//   - Player needs 6 merges/color (12 smalls → 6 larges, 6 smalls for small
//     holes). 12+6 = 18 consumed out of 27 → 9 smalls buffer (~33%). ✓
import { DEFAULT_CONVEYOR_CAPACITY, DEFAULT_TICK_MS } from "../constants";
import type { HoleSpec, LevelDef, MarbleColor, MarbleSize } from "../types";
import { Bs } from "./helpers";

const rep = (color: MarbleColor, size: MarbleSize, n: number): HoleSpec[] =>
  Array.from({ length: n }, () => ({ color, size }));

// Shuffle 12 tile slots (3 per color) into a random 4×3 grid each page load.
const COLORS: MarbleColor[] = ["red", "blue", "green", "yellow"];
const tileColors: MarbleColor[] = COLORS.flatMap(c => [c, c, c]);
for (let i = tileColors.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [tileColors[i], tileColors[j]] = [tileColors[j], tileColors[i]];
}
const randomTiles = [
  tileColors.slice(0, 4).map(c => Bs(c, "small")),
  tileColors.slice(4, 8).map(c => Bs(c, "small")),
  tileColors.slice(8, 12).map(c => Bs(c, "small")),
];

export const LEVEL_5: LevelDef = {
  id: 5,
  name: "Merge Zone",
  cols: 4,
  rows: 3,
  marblesPerBlock: 9,
  conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
  tickMs: DEFAULT_TICK_MS,
  tiles: randomTiles,
  tubes: [
    { color: "red",    capacity: 12 },
    { color: "blue",   capacity: 12 },
    { color: "green",  capacity: 12 },
    { color: "yellow", capacity: 12 },
  ],
  randomMmcLayout: true,
  useTileSizeScale: true,
  mergeZone: true,
  holeSupply: [
    ...rep("red",    "small", 6), ...rep("red",    "large", 6),
    ...rep("blue",   "small", 6), ...rep("blue",   "large", 6),
    ...rep("green",  "small", 6), ...rep("green",  "large", 6),
    ...rep("yellow", "small", 6), ...rep("yellow", "large", 6),
  ],
  parTimeSec: 150,
  parTaps: 12,
};
