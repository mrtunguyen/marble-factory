// Shared level-authoring helpers and conventions.
//
// Authoring rules so every level is winnable:
//   - For each color, sum of marbles released by tiles of that color
//     (always = marblesPerBlock per tile, regardless of mystery/counter/locked
//     wrapping) must be EXACTLY divisible by, and totalled to, the matching
//     tubes' total capacity. (Exception: levels using `randomMmcLayout` rely
//     on the procedural builder to balance supply automatically.)
//   - Locked tiles need at least one non-locked 4-neighbor that will be
//     consumed before them, so the lock can be opened.
//   - Mystery tiles' hidden colors count toward the color totals.

import type { LevelTile, MarbleSize } from "../types";

export const B = (color: LevelTile["color"]): LevelTile => ({
  kind: "block",
  color,
});

export const M = (color: LevelTile["color"]): LevelTile => ({
  kind: "mystery",
  color,
});

export const C = (color: LevelTile["color"], n: number): LevelTile => ({
  kind: "counter",
  color,
  counter: n,
});

// Sized block — for the size-matching mechanic. `Bs("red", "small")` reads
// nicely at the call site.
export const Bs = (
  color: LevelTile["color"],
  size: MarbleSize,
): LevelTile => ({
  kind: "block",
  color,
  size,
});
