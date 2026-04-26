// LaneSystem - vertical sorting lanes filled with mini marble containers (MMCs).
//
// Each lane has a queue of MMCs. The first MMC in the queue is active and only
// pulls compatible marbles from the conveyor slot beside that lane. Compatible
// means there is an empty hole on the active MMC whose (color, size) matches
// the marble. Once every hole is filled, the MMC ships and the next becomes
// active.
//
// This module is intentionally decoupled from conveyorSystem.ts: it only reads
// from / writes to state.conveyor. The pickup step runs on its own tick phase.
import type {
  GameState,
  Hole,
  HoleSpec,
  Lane,
  LevelTile,
  Marble,
  MarbleColor,
  MMC,
  MMCSpec,
  TubeSpec,
} from "./types";
import { MMC_CAPACITY } from "./constants";

/** Build a balanced random MMC layout from tile supply.
 *
 * Returns one `MMCSpec[]` per lane. The flattened pool of holes is exactly the
 * multiset of `(color, size)` pairs released by the level's tiles, so global
 * supply equals demand and the level is winnable. Hole order is randomized;
 * MMCs are dealt round-robin across lanes for a similar mix of color/size at
 * every queue depth.
 *
 * Caller must pass `tileColors` to constrain which tiles count (typically the
 * tube colors — others are dropped so they don't pollute the pool).
 */
export function buildRandomMmcLayout(
  tiles: (LevelTile | null)[][],
  marblesPerBlock: number,
  laneCount: number,
  tubeColors: MarbleColor[],
): MMCSpec[][] {
  const lanes: MMCSpec[][] = Array.from({ length: laneCount }, () => []);

  for (let laneIdx = 0; laneIdx < laneCount; laneIdx++) {
    const color = tubeColors[laneIdx];
    if (!color) continue;

    // Collect only tiles of this lane's color.
    const pool: HoleSpec[] = [];
    for (const row of tiles) {
      for (const tile of row) {
        if (!tile || tile.color !== color) continue;
        const size = tile.size ?? "medium";
        for (let k = 0; k < marblesPerBlock; k++) {
          pool.push({ color, size });
        }
      }
    }

    // Fisher–Yates shuffle within this lane's pool.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Group into MMCs of MMC_CAPACITY holes each.
    for (let i = 0; i + MMC_CAPACITY <= pool.length; i += MMC_CAPACITY) {
      lanes[laneIdx].push({ holes: pool.slice(i, i + MMC_CAPACITY) });
    }
  }

  return lanes;
}

/** Build mixed lane queues from a level's tubes and tiles.
 *
 * Two paths:
 *   - If ANY tube provides explicit `mmcs`, every tube must (and is treated as
 *     authoritative). MMCs are built from those specs verbatim, dealt
 *     round-robin to lanes WITHOUT shuffling so authored order is preserved.
 *   - Otherwise (legacy path), MMCs are generated from total marble counts
 *     per color, all holes set to that tube's color at "medium" size, and
 *     the resulting list is shuffled across lanes for color variety.
 */
export function buildLanesFromTubes(
  tubes: TubeSpec[],
  startMMCId: number,
  tiles?: (LevelTile | null)[][],
  marblesPerBlock?: number,
): { lanes: Lane[]; nextMMCId: number } {
  let nextId = startMMCId;
  const laneCount = Math.max(1, tubes.length);
  const lanes: Lane[] = Array.from({ length: laneCount }, (_, i) => ({
    id: i,
    queue: [],
    shipped: 0,
  }));

  const useExplicit = tubes.some((t) => t.mmcs && t.mmcs.length > 0);

  if (useExplicit) {
    // Per-lane assignment matches tube index — preserves authored ordering.
    tubes.forEach((spec, laneIdx) => {
      const specs = spec.mmcs ?? [];
      for (const m of specs) {
        const holes: Hole[] = m.holes.map((h) => ({
          color: h.color,
          size: h.size,
        }));
        const mmc: MMC = { id: nextId++, holes };
        lanes[laneIdx % laneCount].queue.push(mmc);
      }
    });
    return { lanes, nextMMCId: nextId };
  }

  // Legacy path: count marbles per color from tiles.
  const marbleCountByColor: Record<string, number> = {};
  tubes.forEach((spec) => {
    marbleCountByColor[spec.color] = 0;
  });
  if (tiles && marblesPerBlock) {
    for (const row of tiles) {
      for (const tile of row) {
        if (tile && marbleCountByColor.hasOwnProperty(tile.color)) {
          marbleCountByColor[tile.color] += marblesPerBlock;
        }
      }
    }
  }

  const mmcs: MMC[] = [];
  tubes.forEach((spec) => {
    const totalMarbles = marbleCountByColor[spec.color] || 0;
    const count = Math.max(1, Math.ceil(totalMarbles / MMC_CAPACITY));
    for (let k = 0; k < count; k++) {
      const holes: Hole[] = [];
      for (let h = 0; h < MMC_CAPACITY; h++) {
        holes.push({ color: spec.color, size: "medium" });
      }
      mmcs.push({ id: nextId++, holes });
    }
  });

  // Shuffle for color variety across lanes.
  for (let i = mmcs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mmcs[i], mmcs[j]] = [mmcs[j], mmcs[i]];
  }

  mmcs.forEach((mmc, i) => {
    lanes[i % laneCount].queue.push(mmc);
  });

  return { lanes, nextMMCId: nextId };
}

/** The active first MMC of a lane, or undefined if the lane has no more. */
export function activeMMC(lane: Lane): MMC | undefined {
  return lane.queue[0];
}

/** True iff every hole in `mmc` has been filled. */
export function isMMCFull(mmc: MMC): boolean {
  return mmc.holes.every((h) => h.marble !== undefined);
}

/** Find the index of the first empty hole in `mmc` matching the given marble's
 *  color & size, or -1 if no such hole exists. */
export function findMatchingHole(mmc: MMC, marble: Marble): number {
  return mmc.holes.findIndex(
    (h) =>
      h.marble === undefined &&
      h.color === marble.color &&
      h.size === marble.size,
  );
}

/** True iff the active MMC of any lane has an empty hole that matches `marble`'s
 *  (color, size). Used by the deadlock check. */
export function anyActiveMMCAccepts(state: GameState, marble: Marble): boolean {
  if (!state.lanes) return false;
  for (const lane of state.lanes) {
    const mmc = activeMMC(lane);
    if (!mmc) continue;
    if (findMatchingHole(mmc, marble) >= 0) return true;
  }
  return false;
}

export interface PickupEvent {
  laneIndex: number;
  mmcId: number;
  fromSlot: number;
  holeIndex: number;
  marble: Marble;
}

/** Each lane checks the conveyor slot beside it. If that slot has a marble
 *  whose (color, size) matches an empty hole on the active MMC, the marble is
 *  pulled in and the hole is filled. */
export function pickupFromConveyor(
  state: GameState,
  laneSlotIndex: (laneIdx: number) => number,
): PickupEvent[] {
  const events: PickupEvent[] = [];
  if (!state.lanes) return events;

  for (let i = state.lanes.length - 1; i >= 0; i--) {
    const lane = state.lanes[i];
    const mmc = activeMMC(lane);
    if (!mmc) continue;
    if (isMMCFull(mmc)) continue;

    const slot = laneSlotIndex(i);
    if (slot < 0 || slot >= state.conveyor.length) continue;

    const marble = state.conveyor[slot];
    if (!marble) continue;

    const holeIndex = findMatchingHole(mmc, marble);
    if (holeIndex < 0) continue;

    mmc.holes[holeIndex].marble = marble;
    state.conveyor[slot] = null;

    events.push({
      laneIndex: i,
      mmcId: mmc.id,
      fromSlot: slot,
      holeIndex,
      marble,
    });
  }

  return events;
}

export interface ShipEvent {
  laneIndex: number;
  mmcId: number;
  // Primary color of the shipped MMC — taken from its first hole. Used for
  // the exit-shell color tween.
  color: MarbleColor;
  marbles: Marble[];
}

/** For each lane, if the active MMC is full, pop it off the queue and bump the
 *  shipped counter. Returns ship events for the renderer to animate. */
export function shipFilledMMCs(state: GameState): ShipEvent[] {
  const events: ShipEvent[] = [];
  if (!state.lanes) return events;

  for (let i = 0; i < state.lanes.length; i++) {
    const lane = state.lanes[i];
    const mmc = activeMMC(lane);
    if (!mmc) continue;

    if (isMMCFull(mmc)) {
      lane.queue.shift();
      lane.shipped += 1;
      const marbles = mmc.holes
        .map((h) => h.marble)
        .filter((m): m is Marble => m !== undefined)
        .map((m) => ({ ...m }));
      events.push({
        laneIndex: i,
        mmcId: mmc.id,
        color: mmc.holes[0]?.color ?? marbles[0]?.color ?? ("red" as MarbleColor),
        marbles,
      });
    }
  }

  return events;
}

/** True when every lane's queue is empty. */
export function allLanesComplete(state: GameState): boolean {
  return state.lanes?.every((l) => l.queue.length === 0) ?? true;
}
