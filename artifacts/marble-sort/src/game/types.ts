// Marble Sort: factory data model
//
// Three layers:
//   1. GRID    — chunky candy-block tiles that decompose into marbles when tapped
//   2. CONVEYOR — 16-slot loop, marbles advance by logic one slot per tick
//   3. TUBES    — vertical stack containers, each storing blocks bottom → top

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
  color: MarbleColor; // cap/visual color
  capacity: number;
  marbles: Marble[]; // bottom → top
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
  // Optional pre-filled tube stacks per column. The first stack is visible at
  // level start; remaining stacks wait behind it (each bottom→top).
  tubeQueueDefs?: MarbleColor[][][];
}

export interface GameState {
  cols: number;
  rows: number;
  tiles: (GridTile | null)[][];
  pendingEject: Marble[];          // marbles waiting to enter conveyor
  conveyor: (Marble | null)[];     // index 0 = entry, last index = sorting exit
  tubes: Tube[];
  // Queue of upcoming tube-containers per column. tubeQueues[i][0] is the
  // next tube to become active for column i when the current one is popped.
  tubeQueues: Tube[][];
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
  tubeQueues: Tube[][];
  nextMarbleId: number;
}
