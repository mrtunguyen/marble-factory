// ContainerSystem — stack rules for the vertical sorting tubes.
import type { GameState, Marble, Tube } from "./types";

export interface RouteResult {
  ok: boolean;
  tubeIndex: number;
  reason?: "no-compatible-tube" | "tube-full";
}

export interface MoveResult {
  ok: boolean;
  moved: Marble[];
  sourceIndex: number;
  destIndex: number;
  reason?: "same-tube" | "empty-source" | "color-mismatch" | "not-enough-room";
}

/** Push one emitted marble into a compatible stack:
 *  same top color first, otherwise the first empty tube. */
export function routeMarble(state: GameState, marble: Marble): RouteResult {
  const sameColorIdx = state.tubes.findIndex((tube) => {
    const top = getTubeTop(tube);
    return (
      top?.color === marble.color && tube.marbles.length < tube.capacity
    );
  });
  const emptyIdx = state.tubes.findIndex(
    (tube) => tube.marbles.length === 0 && tube.marbles.length < tube.capacity,
  );
  const idx = sameColorIdx !== -1 ? sameColorIdx : emptyIdx;

  if (idx === -1) {
    const hasSpace = state.tubes.some((tube) => tube.marbles.length < tube.capacity);
    return {
      ok: false,
      tubeIndex: -1,
      reason: hasSpace ? "no-compatible-tube" : "tube-full",
    };
  }

  state.tubes[idx].marbles.push(marble);
  return { ok: true, tubeIndex: idx };
}

export function getTopGroup(tube: Tube): Marble[] {
  const top = getTubeTop(tube);
  if (!top) return [];

  let start = tube.marbles.length - 1;
  while (
    start > 0 &&
    tube.marbles[start - 1].color === top.color
  ) {
    start--;
  }

  return tube.marbles.slice(start);
}

export function moveTopGroup(
  state: GameState,
  sourceIndex: number,
  destIndex: number,
): MoveResult {
  if (sourceIndex === destIndex) {
    return { ok: false, moved: [], sourceIndex, destIndex, reason: "same-tube" };
  }

  const source = state.tubes[sourceIndex];
  const dest = state.tubes[destIndex];
  const moving = getTopGroup(source);

  if (moving.length === 0) {
    return {
      ok: false,
      moved: [],
      sourceIndex,
      destIndex,
      reason: "empty-source",
    };
  }

  const destTop = getTubeTop(dest);
  if (destTop && destTop.color !== moving[0].color) {
    return {
      ok: false,
      moved: [],
      sourceIndex,
      destIndex,
      reason: "color-mismatch",
    };
  }

  if (dest.capacity - dest.marbles.length < moving.length) {
    return {
      ok: false,
      moved: [],
      sourceIndex,
      destIndex,
      reason: "not-enough-room",
    };
  }

  source.marbles.splice(source.marbles.length - moving.length, moving.length);
  dest.marbles.push(...moving);

  return { ok: true, moved: moving, sourceIndex, destIndex };
}

/** True when every non-empty tube is full and contains one color. Empty tubes
 *  are allowed as spare containers. */
export function allTubesCorrect(state: GameState): boolean {
  return state.tubes.every((tube) => tube.marbles.length === 0 || tubeIsComplete(tube));
}

/** True when all per-column queues are empty (no more tubes left to sort). */
export function allQueuesExhausted(state: GameState): boolean {
  return state.tubeQueues.every((q) => q.length === 0);
}

/**
 * If the active tube at colIdx is complete, pop it and replace it with the
 * next tube from the queue. Returns the popped tube (for animation) or null
 * if the tube was not complete.
 */
export function popActiveTube(state: GameState, colIdx: number): Tube | null {
  const active = state.tubes[colIdx];
  if (!tubeIsComplete(active)) return null;

  const popped = active;
  const queue = state.tubeQueues[colIdx];

  if (queue.length > 0) {
    state.tubes[colIdx] = queue.shift()!;
  } else {
    // No more queued tubes — leave an empty buffer tube so the column persists.
    state.tubes[colIdx] = {
      color: active.color,
      capacity: active.capacity,
      marbles: [],
    };
  }

  return popped;
}

export function tubeIsComplete(t: Tube): boolean {
  if (t.marbles.length !== t.capacity) return false;
  const first = t.marbles[0];
  if (!first) return false;
  return t.marbles.every((m) => m.color === first.color);
}

function getTubeTop(tube: Tube): Marble | null {
  return tube.marbles[tube.marbles.length - 1] ?? null;
}
