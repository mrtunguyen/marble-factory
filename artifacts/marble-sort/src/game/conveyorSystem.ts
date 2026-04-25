// ConveyorSystem — shifts marbles right one slot per tick.
// The rightmost slot, if occupied, is "emitted" and returned for the
// ContainerSystem to route into a tube.
import type { GameState, Marble } from "./types";

/** Advance the conveyor by one tick. Returns the marble (if any) that just
 *  fell off the right end. The caller should hand it to ContainerSystem. */
export function tickConveyor(state: GameState): Marble | null {
  const c = state.conveyor;
  const last = c.length - 1;
  const emitted = c[last];
  for (let i = last; i > 0; i--) {
    c[i] = c[i - 1];
  }
  c[0] = null;
  return emitted ?? null;
}

/** True when the conveyor has no marbles in it (used as a "factory idle"
 *  predicate alongside an empty pendingEject). */
export function isConveyorEmpty(state: GameState): boolean {
  return state.conveyor.every((s) => s === null);
}
