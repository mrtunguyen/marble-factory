// State construction, snapshot/restore, and the master tick driver.
import type {
  GameState,
  GameStateSnapshot,
  GridTile,
  LevelDef,
  Marble,
  Tube,
} from "./types";
import { refreshLocks, isGridEmpty } from "./gridManager";
import { injectFromQueue } from "./movementSystem";
import { tickConveyor, isConveyorEmpty } from "./conveyorSystem";
import { MAX_CONVEYOR_CAPACITY } from "./constants";
import {
  routeMarble,
  allTubesCorrect,
  allQueuesExhausted,
  type RouteResult,
} from "./containerSystem";

/** Build a fresh GameState from a level definition. */
export function buildGameState(def: LevelDef): GameState {
  const tiles: (GridTile | null)[][] = [];
  for (let r = 0; r < def.rows; r++) {
    const row: (GridTile | null)[] = [];
    for (let c = 0; c < def.cols; c++) {
      const lt = def.tiles[r]?.[c] ?? null;
      if (!lt) {
        row.push(null);
        continue;
      }
      const t: GridTile = {
        kind: lt.kind,
        color: lt.color,
        marblesLeft: def.marblesPerBlock,
        counter: lt.kind === "counter" ? (lt.counter ?? 2) : undefined,
        revealed: lt.kind === "mystery" ? false : undefined,
        unlocked: lt.kind === "locked" ? false : undefined,
      };
      row.push(t);
    }
    tiles.push(row);
  }

  const conveyorCapacity = Math.min(
    def.conveyorCapacity,
    MAX_CONVEYOR_CAPACITY,
  );

  // The first stack definition becomes the visible active tube. Remaining
  // definitions are queued behind it for the pop-and-advance mechanic.
  let nextId = 1;
  const tubes: Tube[] = def.tubes.map((spec, colIdx) => {
    const activeColors = def.tubeQueueDefs?.[colIdx]?.[0] ?? [];
    return {
      color: spec.color,
      capacity: spec.capacity,
      marbles: activeColors.map((color) => ({ id: nextId++, color })),
    };
  });
  const tubeQueues: Tube[][] = def.tubes.map((spec, colIdx) => {
    const colDefs = def.tubeQueueDefs?.[colIdx]?.slice(1) ?? [];
    return colDefs.map((colors) => ({
      color: spec.color,
      capacity: spec.capacity,
      marbles: colors.map((color) => ({ id: nextId++, color })),
    }));
  });

  const state: GameState = {
    cols: def.cols,
    rows: def.rows,
    tiles,
    pendingEject: [],
    conveyor: new Array(conveyorCapacity).fill(null),
    tubes,
    tubeQueues,
    status: "playing",
    nextMarbleId: nextId,
    marblesPerBlock: def.marblesPerBlock,
    tickMs: def.tickMs,
    history: [],
  };
  refreshLocks(state);
  return state;
}

/** Deep-copy snapshot for undo. History stays out of the snapshot itself. */
export function snapshot(state: GameState): GameStateSnapshot {
  return {
    tiles: state.tiles.map((row) =>
      row.map((t) => (t ? { ...t } : null)),
    ),
    pendingEject: state.pendingEject.map((m) => ({ ...m })),
    conveyor: state.conveyor.map((m) => (m ? { ...m } : null)),
    tubes: state.tubes.map((t) => ({
      color: t.color,
      capacity: t.capacity,
      marbles: t.marbles.map((m) => ({ ...m })),
    })),
    tubeQueues: state.tubeQueues.map((q) =>
      q.map((t) => ({
        color: t.color,
        capacity: t.capacity,
        marbles: t.marbles.map((m) => ({ ...m })),
      })),
    ),
    nextMarbleId: state.nextMarbleId,
  };
}

export function restoreSnapshot(
  state: GameState,
  snap: GameStateSnapshot,
): void {
  state.tiles = snap.tiles.map((row) => row.map((t) => (t ? { ...t } : null)));
  state.pendingEject = snap.pendingEject.map((m) => ({ ...m }));
  state.conveyor = snap.conveyor.map((m) => (m ? { ...m } : null));
  state.tubes = snap.tubes.map((t) => ({
    color: t.color,
    capacity: t.capacity,
    marbles: t.marbles.map((m) => ({ ...m })),
  }));
  state.tubeQueues = snap.tubeQueues.map((q) =>
    q.map((t) => ({
      color: t.color,
      capacity: t.capacity,
      marbles: t.marbles.map((m) => ({ ...m })),
    })),
  );
  state.nextMarbleId = snap.nextMarbleId;
  state.status = "playing";
  refreshLocks(state);
}

/** Result of one simulation tick. The renderer uses these events to animate
 *  the corresponding visuals. */
export interface TickResult {
  injected: Marble | null;       // marble that entered conveyor[0] this tick
  emitted: Marble | null;        // marble that reached the sorting exit
  routed: RouteResult | null;    // routing outcome for the emitted marble
  statusChanged: boolean;        // status moved from "playing" to won/lost
}

/** Advance one tick. The renderer should call this on a fixed cadence
 *  (state.tickMs) while state.status === "playing". */
export function tick(state: GameState): TickResult {
  if (state.status !== "playing") {
    return { injected: null, emitted: null, routed: null, statusChanged: false };
  }

  // 1. Drain the sorting exit before shifting so we don't lose it.
  const emitted = tickConveyor(state);

  // 2. Inject from pending-eject queue into the entry slot.
  const injected = injectFromQueue(state);

  // 3. Route the emitted marble (if any) into a tube.
  let routed: RouteResult | null = null;
  if (emitted) {
    routed = routeMarble(state, emitted);
    if (!routed.ok) {
      state.status = "lost";
      return { injected, emitted, routed, statusChanged: true };
    }
  }

  // 4. Win check: grid empty, queue empty, conveyor empty, all tubes correct,
  //    and all per-column tube queues exhausted.
  if (
    isGridEmpty(state) &&
    state.pendingEject.length === 0 &&
    isConveyorEmpty(state) &&
    allTubesCorrect(state) &&
    allQueuesExhausted(state)
  ) {
    state.status = "won";
    return { injected, emitted, routed, statusChanged: true };
  }

  return { injected, emitted, routed, statusChanged: false };
}

export { isGridEmpty } from "./gridManager";
export { allTubesCorrect, allQueuesExhausted } from "./containerSystem";
