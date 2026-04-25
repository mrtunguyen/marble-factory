// LaneSystem - vertical sorting lanes filled with mini marble containers (MMCs).
//
// Each lane has a queue of MMCs. The first MMC in the queue is active and only
// pulls compatible marbles from the conveyor slot beside that lane. Once it
// fills, it ships out and the next MMC becomes active.
//
// This module is intentionally decoupled from conveyorSystem.ts: it only reads
// from / writes to state.conveyor. The pickup step runs on its own tick phase.
import type { GameState, Lane, Marble, MMC, TubeSpec } from "./types";
import { MMC_CAPACITY } from "./constants";

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function randomContainer(state: GameState): MMC {
  const colors = state.tubes.map((tube) => tube.color);
  const color = colors[Math.floor(Math.random() * colors.length)] ?? "red";
  return {
    id: state.nextMarbleId++,
    color,
    capacity: MMC_CAPACITY,
    marbles: [],
  };
}

/** Build mixed lane queues from a level's tube specs. Each tube of capacity N
 * becomes `ceil(N / MMC_CAPACITY)` empty MMCs of that color, then MMCs are
 * shuffled and dealt round-robin across lanes so each tube gets a random stack. */
export function buildLanesFromTubes(
  tubes: TubeSpec[],
  startMMCId: number,
): { lanes: Lane[]; nextMMCId: number } {
  let nextId = startMMCId;
  const laneCount = Math.max(1, tubes.length);
  const lanes: Lane[] = Array.from({ length: laneCount }, (_, i) => ({
    id: i,
    queue: [],
    shipped: 0,
  }));
  const mmcs: MMC[] = [];

  tubes.forEach((spec) => {
    const count = Math.max(1, Math.ceil(spec.capacity / MMC_CAPACITY));
    for (let k = 0; k < count; k++) {
      mmcs.push({
        id: nextId++,
        color: spec.color,
        capacity: MMC_CAPACITY,
        marbles: [],
      });
    }
  });
  shuffleInPlace(mmcs);

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

/** For each lane, if the active MMC is full, pop it off the queue, append a
 * fresh random container at the bottom, and bump the shipped counter. Returns
 * ship events for the renderer to animate. */
export function shipFilledMMCs(state: GameState): ShipEvent[] {
  const events: ShipEvent[] = [];
  if (!state.lanes) return events;

  for (let i = 0; i < state.lanes.length; i++) {
    const lane = state.lanes[i];
    const mmc = activeMMC(lane);
    if (!mmc) continue;

    if (mmc.marbles.length >= mmc.capacity) {
      lane.queue.shift();
      lane.queue.push(randomContainer(state));
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
