// Level definitions for Block Match
import type { LevelDef } from "./types";

// Compact format: each cell is 2 chars
// Colors: r b g y p o k(pink) c(cyan)
// Kinds:  n(normal) m(mystery, color char ignored) 3(counter3) 2(counter2)
// Empty:  ".."
//
// Counter blocks count as ONE block of that color toward totals.
// To win, each color count should be divisible by MATCH_COUNT (3).

export const LEVELS: LevelDef[] = [
  // Level 1: 3x3 — 3 colors × 3 each. Pure intro.
  {
    id: 1,
    name: "Warm Up",
    cols: 3,
    rows: 3,
    trayCapacity: 7,
    grid: [
      "rnbngn",
      "bngnrn",
      "gnrnbn",
    ],
  },
  // Level 2: 4x3 — 4 colors × 3 each.
  {
    id: 2,
    name: "Color Mix",
    cols: 4,
    rows: 3,
    trayCapacity: 7,
    grid: [
      "rnbngnyn",
      "ynrnbngn",
      "gnynrnbn",
    ],
  },
  // Level 3: 4x3 with counter blocks — counters take 3 taps to release.
  {
    id: 3,
    name: "Locked In",
    cols: 4,
    rows: 3,
    trayCapacity: 7,
    grid: [
      "rnbngnyn",
      "ynr3bngn",
      "gnynbnr2",
    ],
  },
  // Level 4: Mystery drop. 3 colors × 3 normal + 3 mystery = 12 cells.
  // Mystery blocks resolve to a random color from remaining grid pool.
  {
    id: 4,
    name: "Mystery Drop",
    cols: 4,
    rows: 3,
    trayCapacity: 7,
    grid: [
      "rnbngn?m",
      "bngnrn?m",
      "gnrnbn?m",
    ],
  },
  // Level 5: Final blast. 6x3 — 6 colors × 3 each, with counter blocks.
  {
    id: 5,
    name: "Final Blast",
    cols: 6,
    rows: 3,
    trayCapacity: 8,
    grid: [
      "rnbngnynpnon",
      "onrnb3gnynpn",
      "pnonrnbngny3",
    ],
  },
];
