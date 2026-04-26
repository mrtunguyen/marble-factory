// Level 1 — Pure intro: tap blocks → marbles flow → 2 tubes fill.
import {
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
} from "../constants";
import type { LevelDef } from "../types";
import { B } from "./helpers";

export const LEVEL_1: LevelDef = {
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
  tubes: [
    { color: "red", capacity: 6 },
    { color: "blue", capacity: 6 },
  ],
  parTimeSec: 12,
  parTaps: 4,
};
