// Pure game logic — no Phaser, no side effects
import type { Tube, Level, TubeDef, GameState, MarbleColor } from "./types";

// Build initial game state from a level definition
export function buildGameState(level: Level): GameState {
  const tubes: Tube[] = level.tubes.map((def: TubeDef) => ({
    marbles: [...def.marbles],
    capacity: level.tubeCapacity,
    locked: def.locked ?? false,
    lockedTurns: def.lockedTurns ?? 0,
  }));

  return {
    tubes,
    moveCount: 0,
    history: [],
    selectedTubeIndex: null,
    levelComplete: false,
  };
}

// Deep clone tubes array
export function cloneTubes(tubes: Tube[]): Tube[] {
  return tubes.map((t) => ({
    ...t,
    marbles: [...t.marbles],
  }));
}

// Get the top marble of a tube (or null if empty)
export function topMarble(tube: Tube): MarbleColor | null {
  if (tube.marbles.length === 0) return null;
  return tube.marbles[tube.marbles.length - 1];
}

// Check if a tube is complete (all marbles same color and full OR all marbles same color)
export function isTubeComplete(tube: Tube): boolean {
  if (tube.marbles.length === 0) return true; // empty = done
  if (tube.marbles.length !== tube.capacity) return false;
  const color = tube.marbles[0];
  return tube.marbles.every((m) => m === color);
}

// Check if the whole puzzle is solved
export function isLevelComplete(tubes: Tube[]): boolean {
  return tubes.every((tube) => isTubeComplete(tube));
}

// Check if a marble can be moved from `from` to `to`
export function canMove(tubes: Tube[], fromIdx: number, toIdx: number): boolean {
  const from = tubes[fromIdx];
  const to = tubes[toIdx];

  if (from.marbles.length === 0) return false; // nothing to move
  if (to.locked) return false; // destination is locked

  // Destination must have space
  if (to.marbles.length >= to.capacity) return false;

  // Destination must be empty OR have matching top color
  const fromTop = topMarble(from)!;
  const toTop = topMarble(to);
  if (toTop !== null && toTop !== fromTop) return false;

  return true;
}

// Apply a move — returns new tubes state
export function applyMove(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  const newTubes = cloneTubes(tubes);
  const marble = newTubes[fromIdx].marbles.pop()!;
  newTubes[toIdx].marbles.push(marble);

  // Decrement lock timers on all locked tubes
  newTubes.forEach((tube) => {
    if (tube.locked && tube.lockedTurns > 0) {
      tube.lockedTurns -= 1;
      if (tube.lockedTurns === 0) {
        tube.locked = false;
      }
    }
  });

  return newTubes;
}

// Count how many marbles of matching color are stacked on top
export function topRunLength(tube: Tube): number {
  if (tube.marbles.length === 0) return 0;
  const color = topMarble(tube)!;
  let count = 0;
  for (let i = tube.marbles.length - 1; i >= 0; i--) {
    if (tube.marbles[i] === color) count++;
    else break;
  }
  return count;
}
