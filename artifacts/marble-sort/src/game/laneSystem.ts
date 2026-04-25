// LaneSystem - vertical sorting lanes filled with mini marble containers (MMCs).
//
// Each lane has a queue of MMCs. The first MMC in the queue is active and only
// pulls compatible marbles from the conveyor slot beside that lane. Once it
// fills, it ships out and the next MMC becomes active.
//
// This module is intentionally decoupled from conveyorSystem.ts: it only reads
// from / writes to state.conveyor. The pickup step runs on its own tick phase.
import type { GameState, GridTile, Lane, LevelTile, Marble, MMC, TubeSpec } from "./types";
import { MMC_CAPACITY } from "./constants";

/** Build mixed lane queues from a level's tubes and tiles. MMCs are created
 * based on the total count of marbles per color in the grid (not tube capacity).
 * MMCs are dealt round-robin across lanes so lanes are not color-sorted. */
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
  const mmcs: MMC[] = [];

  // Count marbles per color from tiles
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

  // Create MMCs based on total marble count per color
  tubes.forEach((spec) => {
    const totalMarbles = marbleCountByColor[spec.color] || 0;
    const count = Math.max(1, Math.ceil(totalMarbles / MMC_CAPACITY));
    for (let k = 0; k < count; k++) {
      mmcs.push({
        id: nextId++,
        color: spec.color,
        capacity: MMC_CAPACITY,
        marbles: [],
      });
    }
  });

  mmcs.forEach((mmc, i) => {
    lanes[i % laneCount].queue.push(mmc);
  });

  return { lanes, nextMMCId: nextId };
}

/** The active first MMC of a lane, or undefined if the lane has no more. */
export function activeMMC(lane: Lane): MMC | undefined {
  return lane.queue[0];
}

export interface PickupEvent {
  laneIndex: number;
  mmcId: number;
  fromSlot: number;
  holeIndex: number;
  marble: Marble;
}

/** Each lane checks the conveyor slot beside it. If that slot has a compatible
 * marble and the active MMC has space, it pulls that marble in. */
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
    if (mmc.marbles.length >= mmc.capacity) continue;

    const slot = laneSlotIndex(i);
    if (slot < 0 || slot >= state.conveyor.length) continue;

    const marble = state.conveyor[slot];
    if (!marble || marble.color !== mmc.color) continue;

    const holeIndex = mmc.marbles.length;
    state.conveyor[slot] = null;
    mmc.marbles.push(marble);
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
  color: Marble["color"];
  marbles: Marble[];
}

/** For each lane, if the active MMC is full, pop it off the queue and bump the
 * shipped counter. Returns ship events for the renderer to animate. */
export function shipFilledMMCs(state: GameState): ShipEvent[] {
  const events: ShipEvent[] = [];
  if (!state.lanes) return events;

  for (let i = 0; i < state.lanes.length; i++) {
    const lane = state.lanes[i];
    const mmc = activeMMC(lane);
    if (!mmc) continue;

    if (mmc.marbles.length >= mmc.capacity) {
      lane.queue.shift();
      lane.shipped += 1;
      events.push({
        laneIndex: i,
        mmcId: mmc.id,
        color: mmc.color,
        marbles: mmc.marbles.map((m) => ({ ...m })),
      });
    }
  }

  return events;
}

/** True when every lane's queue is empty. */
export function allLanesComplete(state: GameState): boolean {
  return state.lanes?.every((l) => l.queue.length === 0) ?? true;
}
