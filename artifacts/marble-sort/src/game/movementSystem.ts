// MovementSystem — drains the pending-eject queue into the conveyor entry
// conveyor slot, one marble per tick. Called once per simulation tick, BEFORE
// the conveyor itself shifts.
import type { GameState, Marble } from "./types";

/** Push the next pending-eject marble onto the conveyor entry slot.
 *  Returns the marble that was placed (or null if nothing happened). */
export function injectFromQueue(state: GameState): Marble | null {
  if (state.pendingEject.length === 0) return null;
  if (state.conveyor[0] !== null) return null; // entry slot occupied
  const marble = state.pendingEject.shift()!;
  state.conveyor[0] = marble;
  return marble;
}
