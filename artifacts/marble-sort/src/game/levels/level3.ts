// Level 3 — Mystery twist: one tile's color is hidden.
import {
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
} from "../constants";
import type { LevelDef } from "../types";
import { B, M } from "./helpers";

export const LEVEL_3: LevelDef = {
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
  tubes: [
    { color: "red", capacity: 6 },
    { color: "blue", capacity: 6 },
    { color: "green", capacity: 6 },
  ],
  parTimeSec: 22,
  parTaps: 6,
};
