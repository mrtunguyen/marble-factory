// Marble Sort: factory data model
//
// Three layers:
//   1. GRID    — chunky candy-block tiles that decompose into marbles when tapped
//   2. CONVEYOR — 16-slot loop, marbles advance by logic one slot per tick
//   3. TUBES    — vertical sorting containers, each capped with a target color

export type MarbleColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "pink"
  | "cyan";

export interface Marble {
  id: number;
  color: MarbleColor;
}

export type TileKind = "block" | "mystery" | "counter" | "locked";

export interface GridTile {
  kind: TileKind;
  color: MarbleColor;       // for mystery: hidden until revealed
  marblesLeft: number;      // marbles still to release from this tile
  counter?: number;         // remaining taps for counter tiles
  revealed?: boolean;       // mystery tile has been revealed
  unlocked?: boolean;       // locked tile has been unlocked
}

export interface TubeSpec {
  color: MarbleColor;
  capacity: number;
}

export interface Tube {
  color: MarbleColor;
  capacity: number;
  marbles: Marble[]; // bottom → top
}

export interface MMC {
  id: number;
  color: MarbleColor;
  capacity: number;
  marbles: Marble[];
}

export interface Lane {
  id: number;
  queue: MMC[];
  shipped: number;
}

// Authoring format — used by built-in levels and the editor
export interface LevelTile {
  kind: TileKind;
  color: MarbleColor;
  counter?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  cols: number;
  rows: number;
  marblesPerBlock: number;
  conveyorCapacity: number;
  tickMs: number;
  // tiles[row][col] — null = empty cell
  tiles: (LevelTile | null)[][];
  tubes: TubeSpec[];
  parTimeSec?: number;
  parTaps?: number;
}

export interface GameState {
  cols: number;
  rows: number;
  tiles: (GridTile | null)[][];
  pendingEject: Marble[];          // marbles waiting to enter conveyor
  conveyor: (Marble | null)[];     // index 0 = entry, last index = sorting exit
  tubes: Tube[];
  lanes?: Lane[];
  status: "playing" | "won" | "lost";
  nextMarbleId: number;
  marblesPerBlock: number;
  tickMs: number;
  history: GameStateSnapshot[];
}

export interface GameStateSnapshot {
  tiles: (GridTile | null)[][];
  pendingEject: Marble[];
  conveyor: (Marble | null)[];
  tubes: Tube[];
  lanes?: Lane[];
  nextMarbleId: number;
}
