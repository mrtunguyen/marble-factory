// Built-in level definitions for Marble Sort.
//
// Authoring notes:
//   - Each level uses four sorting tubes with a fixed capacity of four slots.
//   - tubeQueueDefs provide the visible starting stack for each tube,
//     ordered bottom → top.
//   - Locked tiles need at least one non-locked 4-neighbor that will be
//     consumed before them, so the lock can be opened.
import {
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
} from "./constants";
import type { LevelDef, LevelTile } from "./types";

// Helpers for compact level authoring.
const B = (color: LevelTile["color"]): LevelTile => ({ kind: "block", color });
const M = (color: LevelTile["color"]): LevelTile => ({
  kind: "mystery",
  color,
});
const C = (color: LevelTile["color"], n: number): LevelTile => ({
  kind: "counter",
  color,
  counter: n,
});
const L = (color: LevelTile["color"]): LevelTile => ({
  kind: "locked",
  color,
});

const STACK_TUBES = [
  { color: "yellow", capacity: 4 },
  { color: "pink", capacity: 4 },
  { color: "cyan", capacity: 4 },
  { color: "green", capacity: 4 },
] satisfies LevelDef["tubes"];

export const LEVELS: LevelDef[] = [
  // ───── Level 1 ─────  Prefilled stack puzzle: tubes start with mixed blocks.
  {
    id: 1,
    name: "Trickle Start",
    cols: 2,
    rows: 2,
    marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
    conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
    tickMs: DEFAULT_TICK_MS,
    tiles: [
      [B("red"), B("blue")],
      [B("blue"), B("red")],
    ],
    tubes: STACK_TUBES,
    tubeQueueDefs: [
      [["yellow", "pink", "pink", "cyan"]],
      [["pink", "cyan", "green", "yellow"]],
      [["green", "yellow", "cyan", "pink"]],
      [["cyan", "green", "yellow", "green"]],
    ],
  },

  // ───── Level 2 ─────  Counter twist: a single counter-2 tile.
  {
    id: 2,
    name: "Hold the Line",
    cols: 3,
    rows: 2,
    marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
    conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
    tickMs: DEFAULT_TICK_MS,
    tiles: [
      [B("red"), B("blue"), B("green")],
      [B("blue"), C("green", 2), B("red")],
    ],
    tubes: STACK_TUBES,
    tubeQueueDefs: [
      [["red", "blue", "green", "cyan"]],
      [["green", "red", "blue", "pink"]],
      [["blue", "green", "red", "yellow"]],
      [["yellow", "cyan", "pink", "green"]],
    ],
  },

  // ───── Level 3 ─────  Mystery twist: one tile's color is hidden.
  {
    id: 3,
    name: "Mystery Cargo",
    cols: 3,
    rows: 2,
    marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
    conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
    tickMs: DEFAULT_TICK_MS,
    tiles: [
      [B("red"), B("blue"), B("green")],
      [M("blue"), B("green"), B("red")],
    ],
    tubes: STACK_TUBES,
    tubeQueueDefs: [
      [["blue", "pink", "green", "cyan"]],
      [["green", "cyan", "blue", "red"]],
      [["red", "blue", "pink", "green"]],
      [["cyan", "green", "red", "pink"]],
    ],
  },

  // ───── Level 4 ─────  Locked twist: a tile waits for a neighbor to clear.
  // Locked red at (0,0) — neighbors are blue (0,1) and blue (1,0); the player
  // must consume at least one of them before red unlocks.
  {
    id: 4,
    name: "Padlock",
    cols: 3,
    rows: 2,
    marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
    conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
    tickMs: DEFAULT_TICK_MS,
    tiles: [
      [L("red"), B("blue"), B("green")],
      [B("blue"), B("green"), B("red")],
    ],
    tubes: STACK_TUBES,
    tubeQueueDefs: [
      [["red", "blue", "green", "yellow"]],
      [["blue", "green", "red", "cyan"]],
      [["green", "red", "blue", "pink"]],
      [["cyan", "pink", "yellow", "green"]],
    ],
  },

  // ───── Level 5 ─────  All twists: counter, mystery, locked, plus 4 colors.
  // Locked yellow at (0,3) — neighbor red (0,2 mystery) or red (1,3) clears
  // first; counter-3 green at (1,1).
  {
    id: 5,
    name: "Factory Rush",
    cols: 4,
    rows: 2,
    marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
    conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
    tickMs: 220,
    tiles: [
      [B("blue"), B("green"), M("red"), L("yellow")],
      [B("yellow"), C("green", 3), B("blue"), B("red")],
    ],
    tubes: STACK_TUBES,
    tubeQueueDefs: [
      [["blue", "yellow", "green", "red"]],
      [["yellow", "green", "red", "cyan"]],
      [["green", "blue", "yellow", "pink"]],
      [["red", "blue", "red", "green"]],
    ],
  },
];
