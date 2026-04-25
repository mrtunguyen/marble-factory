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
import { buildLanesFromTubes, pickupFromConveyor, shipFilledMMCs, type PickupEvent, type ShipEvent } from "./laneSystem";

function shuffledTubes(def: LevelDef): Tube[] {
  const tubes: Tube[] = def.tubes.map((s) => ({
    color: s.color,
    capacity: s.capacity,
    marbles: [],
  }));
  for (let i = tubes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tubes[i], tubes[j]] = [tubes[j], tubes[i]];
  }
  return tubes;
}

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

  const tubes = shuffledTubes(def);

  const conveyorCapacity = Math.min(
    def.conveyorCapacity,
    MAX_CONVEYOR_CAPACITY,
  );
  const laneBuild = buildLanesFromTubes(tubes, 1);

  const state: GameState = {
    cols: def.cols,
    rows: def.rows,
    tiles,
    pendingEject: [],
    conveyor: new Array(conveyorCapacity).fill(null),
    tubes,
    lanes: laneBuild.lanes,
    status: "playing",
    nextMarbleId: laneBuild.nextMMCId,
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
    lanes: state.lanes?.map((lane) => ({
      id: lane.id,
      shipped: lane.shipped,
      queue: lane.queue.map((mmc) => ({
        id: mmc.id,
        color: mmc.color,
        capacity: mmc.capacity,
        marbles: mmc.marbles.map((m) => ({ ...m })),
      })),
    })),
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
  state.lanes = snap.lanes?.map((lane) => ({
    id: lane.id,
    shipped: lane.shipped,
    queue: lane.queue.map((mmc) => ({
      id: mmc.id,
      color: mmc.color,
      capacity: mmc.capacity,
      marbles: mmc.marbles.map((m) => ({ ...m })),
    })),
  }));
  state.nextMarbleId = snap.nextMarbleId;
  state.status = "playing";
  refreshLocks(state);
}

/** Result of one simulation tick. The renderer uses these events to animate
 *  the corresponding visuals. */
export interface TickResult {
  injected: Marble | null;       // marble that entered conveyor[0] this tick
  emitted: Marble | null;        // marble that reached the sorting exit
  pickups: PickupEvent[];
  shipped: ShipEvent[];
  statusChanged: boolean;        // status moved from "playing" to won/lost
}

/** Advance one tick. The renderer should call this on a fixed cadence
 *  (state.tickMs) while state.status === "playing". */
export function tick(
  state: GameState,
  laneSlotIndex: (laneIdx: number) => number = (laneIdx) => laneIdx,
): TickResult {
  if (state.status !== "playing") {
    return { injected: null, emitted: null, pickups: [], shipped: [], statusChanged: false };
  }

  // 1. Advance the conveyor loop. A marble that misses its current container
  // wraps back to the entry slot and can be picked up on a later pass.
  const emitted = tickConveyor(state);
  if (emitted) {
    state.conveyor[0] = emitted;
  }

  // 2. Inject from pending-eject queue into the entry slot.
  const injected = injectFromQueue(state);

  // 3. MMCs can only take marbles from their adjacent conveyor slot.
  const pickups = pickupFromConveyor(state, laneSlotIndex);
  const shipped = shipFilledMMCs(state);

  // 4. Win check: containers are replenished forever, so completion only
  // depends on all released marbles being sorted and no tiles remaining.
  if (
    isGridEmpty(state) &&
    state.pendingEject.length === 0 &&
    isConveyorEmpty(state)
  ) {
    state.status = "won";
    return { injected, emitted, pickups, shipped, statusChanged: true };
  }

  return { injected, emitted, pickups, shipped, statusChanged: false };
}

export { isGridEmpty } from "./gridManager";
export { allLanesComplete } from "./laneSystem";
