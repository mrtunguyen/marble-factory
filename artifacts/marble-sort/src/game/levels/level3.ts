// Level 3 — Mystery twist: one tile's color is hidden, plus mystery MMCs.
import {
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
} from "../constants";
import type { LevelDef, MMCSpec } from "../types";
import { B, M } from "./helpers";

// 2 tiles × 9 marbles each = 18 marbles per color
// MMCs hold 3 marbles, so: 6 MMCs per color
const redMMCs: MMCSpec[] = [
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: true },
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: true },
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: true },
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: false },
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: false },
  { holes: [{ color: "red", size: "medium" }, { color: "red", size: "medium" }, { color: "red", size: "medium" }], hidden: false },
];

const blueMMCs: MMCSpec[] = [
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: true },
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: true },
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: true },
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: false },
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: false },
  { holes: [{ color: "blue", size: "medium" }, { color: "blue", size: "medium" }, { color: "blue", size: "medium" }], hidden: false },
];

const greenMMCs: MMCSpec[] = [
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: true },
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: true },
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: true },
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: false },
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: false },
  { holes: [{ color: "green", size: "medium" }, { color: "green", size: "medium" }, { color: "green", size: "medium" }], hidden: false },
];

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
    [{ kind: "locked", color: "blue" }, B("green"), B("red")],
  ],
  tubes: [
    { color: "red", capacity: 6, mmcs: redMMCs },
    { color: "blue", capacity: 6, mmcs: blueMMCs },
    { color: "green", capacity: 6, mmcs: greenMMCs },
  ],
  parTimeSec: 22,
  parTaps: 6,
};
