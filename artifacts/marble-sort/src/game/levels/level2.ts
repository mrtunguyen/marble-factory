// Level 2 — Counter twist: a single counter-2 tile.
import {
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
} from "../constants";
import type { LevelDef } from "../types";
import { B, C } from "./helpers";

export const LEVEL_2: LevelDef = {
  id: 2,
  name: "Hold the Line",
  cols: 3,
  rows: 2,
  marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
  conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
  tickMs: DEFAULT_TICK_MS,
  tiles: [
    [B("red"), B("blue"), B("green")],
    [B("blue"), B("green"), B("red")],
  ],
  tubes: [
    { color: "red", capacity: 6 },
    { color: "blue", capacity: 6 },
    { color: "green", capacity: 6 },
  ],
  parTimeSec: 20,
  parTaps: 6,
};
