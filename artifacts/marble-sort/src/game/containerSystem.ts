// ContainerSystem — accepts a marble emitted from the conveyor and routes it
// to the tube whose target color matches. Returns whether the routing
// succeeded; failure means the factory has jammed and the player loses.
import type { GameState, Marble, Tube } from "./types";

export interface RouteResult {
  ok: boolean;
  tubeIndex: number;
  reason?: "no-tube" | "tube-full";
}

/** Find the index of the first non-full tube whose color matches the marble. */
function findTargetTube(state: GameState, marble: Marble): number {
  for (let i = 0; i < state.tubes.length; i++) {
    const t = state.tubes[i];
    if (t.color === marble.color && t.marbles.length < t.capacity) {
      return i;
    }
  }
  return -1;
}

/** Push a marble into its target tube. Returns ok=false (with a reason) when
 *  no matching tube has space. */
export function routeMarble(state: GameState, marble: Marble): RouteResult {
  // Are there any tubes for this color at all?
  const hasAnyMatchingTube = state.tubes.some((t) => t.color === marble.color);
  if (!hasAnyMatchingTube) {
    return { ok: false, tubeIndex: -1, reason: "no-tube" };
  }

  const idx = findTargetTube(state, marble);
  if (idx === -1) {
    return { ok: false, tubeIndex: -1, reason: "tube-full" };
  }
  state.tubes[idx].marbles.push(marble);
  return { ok: true, tubeIndex: idx };
}

/** True when every tube is full and contains only its target color.
 *  (Tubes that can never overflow mismatching colors are checked anyway for
 *  defense in depth.) */
export function allTubesCorrect(state: GameState): boolean {
  return state.tubes.every(tubeIsFullAndCorrect);
}

function tubeIsFullAndCorrect(t: Tube): boolean {
  if (t.marbles.length !== t.capacity) return false;
  return t.marbles.every((m) => m.color === t.color);
}
