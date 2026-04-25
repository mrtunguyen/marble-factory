// Level definitions for Marble Sort
import type { Level } from "./types";

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "Warm Up",
    tubeCapacity: 4,
    tubes: [
      { marbles: ["red", "blue", "red", "blue"] },
      { marbles: ["blue", "red", "blue", "red"] },
      { marbles: [] },
    ],
  },
  {
    id: 2,
    name: "Three Colors",
    tubeCapacity: 4,
    tubes: [
      { marbles: ["red", "green", "blue", "red"] },
      { marbles: ["blue", "red", "green", "blue"] },
      { marbles: ["green", "blue", "red", "green"] },
      { marbles: [] },
      { marbles: [] },
    ],
  },
  {
    id: 3,
    name: "Locked Chamber",
    tubeCapacity: 4,
    tubes: [
      { marbles: ["red", "blue", "red", "blue"] },
      { marbles: ["blue", "red", "blue", "red"] },
      { marbles: [], locked: true, lockedTurns: 2 }, // locked for 2 moves
      { marbles: [] },
    ],
  },
  {
    id: 4,
    name: "Four Colors",
    tubeCapacity: 4,
    tubes: [
      { marbles: ["red", "yellow", "green", "blue"] },
      { marbles: ["green", "red", "blue", "yellow"] },
      { marbles: ["blue", "green", "yellow", "red"] },
      { marbles: ["yellow", "blue", "red", "green"] },
      { marbles: [] },
      { marbles: [] },
    ],
  },
  {
    id: 5,
    name: "Double Lock",
    tubeCapacity: 4,
    tubes: [
      { marbles: ["red", "purple", "red", "purple"] },
      { marbles: ["purple", "red", "purple", "red"] },
      { marbles: ["orange", "cyan", "orange", "cyan"] },
      { marbles: ["cyan", "orange", "cyan", "orange"] },
      { marbles: [], locked: true, lockedTurns: 3 },
      { marbles: [], locked: true, lockedTurns: 3 },
      { marbles: [] },
    ],
  },
];

// Load a level from JSON (for level editor export)
export function loadLevelFromJSON(json: string): Level | null {
  try {
    const data = JSON.parse(json) as Level;
    if (!data.tubes || !data.tubeCapacity) return null;
    return data;
  } catch {
    return null;
  }
}
