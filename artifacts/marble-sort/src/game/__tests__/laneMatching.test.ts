// Pure-logic tests for the size-matching mechanic. No Phaser, no DOM.
//
// Run with:  npx tsx src/game/__tests__/laneMatching.test.ts
// (tsx is not added as a dep — invoke manually from artifacts/marble-sort/.)
//
// Each case builds a minimal GameState in memory and exercises a single
// laneSystem function. `laneSlotIndex` is passed as the identity so lane i
// reads conveyor[i].

import {
  buildLanesFromTubes,
  buildRandomMmcLayout,
  pickupFromConveyor,
  shipFilledMMCs,
} from "../laneSystem";
import type {
  GameState,
  Hole,
  LevelTile,
  Marble,
  MarbleColor,
  MarbleSize,
  MMC,
  Tube,
  TubeSpec,
} from "../types";

const identity = (i: number) => i;

let nextId = 1;
function makeMarble(color: MarbleColor, size: MarbleSize): Marble {
  return { id: nextId++, color, size };
}
function makeHole(
  color: MarbleColor,
  size: MarbleSize,
  marble?: Marble,
): Hole {
  return { color, size, marble };
}
function makeMMC(id: number, holes: Hole[]): MMC {
  return { id, holes };
}

function makeState(
  conveyor: (Marble | null)[],
  lanes: { id: number; queue: MMC[]; shipped?: number }[],
): GameState {
  return {
    cols: 0,
    rows: 0,
    tiles: [],
    pendingEject: [],
    conveyor,
    tubes: [] as Tube[],
    lanes: lanes.map((l) => ({ id: l.id, queue: l.queue, shipped: l.shipped ?? 0 })),
    status: "playing",
    nextMarbleId: nextId,
    marblesPerBlock: 3,
    tickMs: 250,
    history: [],
  };
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
}

function runTests(): void {
  console.log("laneMatching tests");

  // 1. Color-only mismatch: red marble + blue/medium hole → no pickup.
  {
    const m = makeMarble("red", "medium");
    const mmc = makeMMC(1, [makeHole("blue", "medium")]);
    const state = makeState([m], [{ id: 0, queue: [mmc] }]);
    const ev = pickupFromConveyor(state, identity);
    check(
      "color-only mismatch is rejected",
      ev.length === 0 && state.conveyor[0] === m && mmc.holes[0].marble === undefined,
    );
  }

  // 2. Size-only mismatch: red small + red medium → no pickup.
  {
    const m = makeMarble("red", "small");
    const mmc = makeMMC(2, [makeHole("red", "medium")]);
    const state = makeState([m], [{ id: 0, queue: [mmc] }]);
    const ev = pickupFromConveyor(state, identity);
    check(
      "size-only mismatch is rejected",
      ev.length === 0 && state.conveyor[0] === m && mmc.holes[0].marble === undefined,
    );
  }

  // 3. Full match: red medium + red medium empty → pulled, hole filled.
  {
    const m = makeMarble("red", "medium");
    const mmc = makeMMC(3, [makeHole("red", "medium")]);
    const state = makeState([m], [{ id: 0, queue: [mmc] }]);
    const ev = pickupFromConveyor(state, identity);
    check(
      "full color+size match is accepted",
      ev.length === 1 &&
        state.conveyor[0] === null &&
        mmc.holes[0].marble?.id === m.id &&
        ev[0].holeIndex === 0,
    );
  }

  // 4. Hole already filled with matching (color, size): a second marble of the
  //    same kind cannot enter that hole and falls through.
  {
    const occupant = makeMarble("red", "medium");
    const m = makeMarble("red", "medium");
    const mmc = makeMMC(4, [makeHole("red", "medium", occupant)]);
    const state = makeState([m], [{ id: 0, queue: [mmc] }]);
    const ev = pickupFromConveyor(state, identity);
    check(
      "occupied matching hole is skipped",
      ev.length === 0 && state.conveyor[0] === m && mmc.holes[0].marble === occupant,
    );
  }

  // 5. Multiple holes — picks the first empty match for the marble's size.
  {
    const occupant = makeMarble("red", "medium");
    const m = makeMarble("red", "large");
    const mmc = makeMMC(5, [
      makeHole("red", "small"),               // empty but wrong size
      makeHole("red", "medium", occupant),    // filled
      makeHole("red", "large"),               // empty match
    ]);
    const state = makeState([m], [{ id: 0, queue: [mmc] }]);
    const ev = pickupFromConveyor(state, identity);
    check(
      "picks the first empty hole that matches color+size",
      ev.length === 1 &&
        ev[0].holeIndex === 2 &&
        mmc.holes[2].marble?.id === m.id &&
        mmc.holes[0].marble === undefined,
    );
  }

  // 6. Ship on full: an MMC with all 3 holes filled is popped from its lane.
  {
    const a = makeMarble("red", "small");
    const b = makeMarble("red", "medium");
    const c = makeMarble("red", "large");
    const full = makeMMC(6, [
      makeHole("red", "small", a),
      makeHole("red", "medium", b),
      makeHole("red", "large", c),
    ]);
    const next = makeMMC(7, [makeHole("red", "small")]);
    const state = makeState([], [{ id: 0, queue: [full, next] }]);
    const events = shipFilledMMCs(state);
    const lane = state.lanes![0];
    check(
      "full MMC ships and the next becomes active",
      events.length === 1 &&
        events[0].mmcId === 6 &&
        lane.shipped === 1 &&
        lane.queue.length === 1 &&
        lane.queue[0].id === 7,
    );
  }

  // 7. buildLanesFromTubes honors `mmcs` and skips shuffle.
  {
    const tubes: TubeSpec[] = [
      {
        color: "red",
        capacity: 6,
        mmcs: [
          { holes: [
            { color: "red", size: "small" },
            { color: "red", size: "medium" },
            { color: "red", size: "large" },
          ]},
          { holes: [
            { color: "red", size: "large" },
            { color: "red", size: "medium" },
            { color: "red", size: "small" },
          ]},
        ],
      },
      {
        color: "blue",
        capacity: 3,
        mmcs: [
          { holes: [
            { color: "blue", size: "small" },
            { color: "blue", size: "small" },
            { color: "blue", size: "small" },
          ]},
        ],
      },
    ];
    const { lanes } = buildLanesFromTubes(tubes, 100);

    const lane0 = lanes[0];
    const lane1 = lanes[1];

    const lane0OK =
      lane0.queue.length === 2 &&
      lane0.queue[0].holes.map((h) => h.size).join(",") === "small,medium,large" &&
      lane0.queue[1].holes.map((h) => h.size).join(",") === "large,medium,small" &&
      lane0.queue.every((m) => m.holes.every((h) => h.color === "red"));

    const lane1OK =
      lane1.queue.length === 1 &&
      lane1.queue[0].holes.every((h) => h.color === "blue" && h.size === "small");

    check(
      "buildLanesFromTubes honors explicit mmcs verbatim and per-lane",
      lane0OK && lane1OK,
    );
  }

  // 8. buildRandomMmcLayout balances supply and constrains holes to lane color.
  //    Uses a 3×2 tile grid (3 colors × 2 sizes: small + large) matching the
  //    level 4 shape.
  {
    const tiles: (LevelTile | null)[][] = [
      [
        { kind: "block", color: "red",   size: "small" },
        { kind: "block", color: "blue",  size: "small" },
        { kind: "block", color: "green", size: "small" },
      ],
      [
        { kind: "block", color: "red",   size: "large" },
        { kind: "block", color: "blue",  size: "large" },
        { kind: "block", color: "green", size: "large" },
      ],
    ];
    const mpb = 9;
    const laneCount = 3;
    const tubeColors: MarbleColor[] = ["red", "blue", "green"];
    const lanes = buildRandomMmcLayout(tiles, mpb, laneCount, tubeColors);

    // Tally holes across all generated MMCs.
    const tally: Record<string, number> = {};
    let totalHoles = 0;
    let totalMmcs = 0;
    for (const laneSpecs of lanes) {
      for (const mmc of laneSpecs) {
        totalMmcs++;
        for (const h of mmc.holes) {
          totalHoles++;
          const k = `${h.color}/${h.size}`;
          tally[k] = (tally[k] ?? 0) + 1;
        }
      }
    }

    // Each (color, size) appears exactly once in tiles → mpb (9) holes expected.
    const combos = [
      "red/small", "red/large",
      "blue/small", "blue/large",
      "green/small", "green/large",
    ];
    const allBalanced = combos.every((k) => tally[k] === mpb);
    const expectedTotal = combos.length * mpb;          // 54
    const expectedMmcs = expectedTotal / 3;             // 18
    const laneCounts = lanes.map((l) => l.length);
    const equalLanes = laneCounts.every((n) => n === expectedMmcs / laneCount);

    // Every hole in lane i must have color === tubeColors[i].
    const colorConstraintOk = lanes.every((laneSpecs, laneIdx) =>
      laneSpecs.every((mmc) => mmc.holes.every((h) => h.color === tubeColors[laneIdx])),
    );

    check(
      "buildRandomMmcLayout partitions holes by lane color and balances supply",
      allBalanced &&
        totalHoles === expectedTotal &&
        totalMmcs === expectedMmcs &&
        equalLanes &&
        colorConstraintOk,
      `holes=${totalHoles}, mmcs=${totalMmcs}, lanes=${laneCounts.join(",")}, colorOk=${colorConstraintOk}`,
    );
  }

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    if (typeof process !== "undefined") process.exit(1);
    throw new Error(`${failed} test(s) failed`);
  }
}

// Auto-run when invoked directly (tsx, ts-node, etc.). Safe under Vite import
// because import.meta.url is defined.
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;
if (isMain) runTests();

export { runTests };
