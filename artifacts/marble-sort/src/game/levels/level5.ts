// Level 5 — Mystery + counter mix across 4 colors.
// Colors: red×2, blue×2, green×2, yellow×2  →  4 tubes capacity 6.
import { DEFAULT_CONVEYOR_CAPACITY, DEFAULT_MARBLES_PER_BLOCK } from "../constants";
import type { LevelDef } from "../types";
import { B, C, M } from "./helpers";

export const LEVEL_5: LevelDef = {
  id: 5,
  name: "Factory Rush",
  cols: 4,
  rows: 2,
  marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
  conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
  tickMs: 220,
  tiles: [
    [B("blue"), B("green"), M("red"), B("yellow")],
    [B("yellow"), C("green", 3), B("blue"), B("red")],
  ],
  tubes: [
    { color: "red", capacity: 6 },
    { color: "blue", capacity: 6 },
    { color: "green", capacity: 6 },
    { color: "yellow", capacity: 6 },
  ],
  parTimeSec: 35,
  parTaps: 9,
};
