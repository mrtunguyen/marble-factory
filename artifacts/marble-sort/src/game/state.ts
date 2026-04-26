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
  allLanesComplete,
  anyActiveMMCAccepts,
  buildLanesFromTubes,
  buildRandomMmcLayout,
  pickupFromConveyor,
  revealHiddenMMCs,
  shipFilledMMCs,
  type PickupEvent,
  type ShipEvent,
} from "./laneSystem";
import { DEFAULT_MARBLES_PER_BLOCK } from "./constants";

/** Build a fresh GameState from a level definition. */
export function buildGameState(def: LevelDef): GameState {
  const marblesPerBlock = def.marblesPerBlock ?? DEFAULT_MARBLES_PER_BLOCK;
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
        size: lt.size ?? "medium",
        marblesLeft: marblesPerBlock,
        counter: lt.kind === "counter" ? (lt.counter ?? 2) : undefined,
        revealed: lt.kind === "mystery" ? false : undefined,
        unlocked: lt.kind === "locked" ? false : undefined,
      };
      row.push(t);
    }
    tiles.push(row);
  }

  const tubes: Tube[] = def.tubes.map((s) => ({
    color: s.color,
    capacity: s.capacity,
    marbles: [],
  }));

  const conveyorCapacity = Math.min(
    def.conveyorCapacity,
    MAX_CONVEYOR_CAPACITY,
  );

  // If randomMmcLayout is requested, generate a balanced random per-lane MMC
  // spec from the tile supply and slot it into a copy of the tube specs so
  // buildLanesFromTubes treats it as authoritative (verbatim, no shuffle).
  let tubeSpecs = def.tubes;
  if (def.randomMmcLayout) {
    const tubeColors = def.tubes.map((t) => t.color);
    const perLane = buildRandomMmcLayout(
      def.tiles,
      marblesPerBlock,
      def.tubes.length,
      tubeColors,
      def.holeSupply,
    );
    tubeSpecs = def.tubes.map((t, i) => ({
      ...t,
      mmcs: perLane[i] ?? [],
    }));
  }

  const laneBuild = buildLanesFromTubes(tubeSpecs, 1, def.tiles, marblesPerBlock);

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
    marblesPerBlock,
    tickMs: def.tickMs,
    history: [],
  };
  refreshLocks(state);
  revealHiddenMMCs(state);
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
        holes: mmc.holes.map((h) => ({
          color: h.color,
          size: h.size,
          marble: h.marble ? { ...h.marble } : undefined,
        })),
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
      holes: mmc.holes.map((h) => ({
        color: h.color,
        size: h.size,
        marble: h.marble ? { ...h.marble } : undefined,
      })),
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

/** Check if conveyor is full and no marble (color, size) matches an empty hole
 *  on any active MMC head. */
function isConveyorDeadlock(state: GameState): boolean {
  if (state.conveyor.some((s) => s === null)) return false; // not full
  const hasAnyActive = (state.lanes ?? []).some((l) => l.queue.length > 0);
  if (!hasAnyActive) return false; // all lanes done; win check handles it
  return !state.conveyor.some((m) => m && anyActiveMMCAccepts(state, m));
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

  // 1. Drain the sorting exit and loop it back to the entry.
  const emitted = tickConveyor(state);
  if (emitted) {
    state.conveyor[0] = emitted; // wrap marble back to entry
  }

  // 2. Inject from pending-eject queue into the entry slot (no-op if occupied).
  const injected = injectFromQueue(state);

  // 3. MMCs can only take marbles from their adjacent conveyor slot.
  const pickups = pickupFromConveyor(state, laneSlotIndex);
  const shipped = shipFilledMMCs(state);
  revealHiddenMMCs(state);

  // 4. Deadlock check: conveyor full with no matching colors for active MMCs.
  if (isConveyorDeadlock(state)) {
    state.status = "lost";
    return { injected, emitted, pickups, shipped, statusChanged: true };
  }

  // 5. Win check: grid empty, queue empty, conveyor empty, all MMCs complete.
  if (
    isGridEmpty(state) &&
    state.pendingEject.length === 0 &&
    isConveyorEmpty(state) &&
    allLanesComplete(state)
  ) {
    state.status = "won";
    return { injected, emitted, pickups, shipped, statusChanged: true };
  }

  return { injected, emitted, pickups, shipped, statusChanged: false };
}

export { isGridEmpty } from "./gridManager";
export { allLanesComplete } from "./laneSystem";
