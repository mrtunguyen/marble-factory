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

export type MarbleSize = "small" | "medium" | "large";

export interface Marble {
  id: number;
  color: MarbleColor;
  size: MarbleSize;
}

export type TileKind = "block" | "mystery" | "counter" | "locked" | "mmc";

export interface GridTile {
  kind: TileKind;
  color: MarbleColor;       // for mystery: hidden until revealed
  size: MarbleSize;         // size of marbles released from this tile
  marblesLeft: number;      // marbles still to release from this tile
  counter?: number;         // remaining taps for counter tiles
  revealed?: boolean;       // mystery tile has been revealed
  unlocked?: boolean;       // locked tile has been unlocked
  enabled?: boolean;        // mystery tile is enabled (false = disabled until neighbor tapped)
}

export interface HoleSpec {
  color: MarbleColor;
  size: MarbleSize;
}

export interface MMCSpec {
  holes: HoleSpec[]; // length must be MMC_CAPACITY
  hidden?: boolean; // true if this MMC's color is hidden until it reaches the head
}

export interface TubeSpec {
  color: MarbleColor;
  capacity: number;
  // Optional explicit per-MMC hole layout. When present (on any tube), the
  // builder uses these verbatim and skips the random shuffle so authored
  // ordering is preserved.
  mmcs?: MMCSpec[];
}

export interface Tube {
  color: MarbleColor;
  capacity: number;
  marbles: Marble[]; // bottom → top
}

export interface Hole {
  color: MarbleColor;
  size: MarbleSize;
  marble?: Marble;
  hidden?: boolean; // true if this hole's color is hidden (grey) until revealed
}

export interface MMC {
  id: number;
  holes: Hole[]; // length = MMC_CAPACITY (3)
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
  size?: MarbleSize; // defaults to "medium" when omitted
  counter?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  cols: number;
  rows: number;
  marblesPerBlock?: number;
  conveyorCapacity: number;
  tickMs: number;
  // tiles[row][col] — null = empty cell
  tiles: (LevelTile | null)[][];
  tubes: TubeSpec[];
  parTimeSec?: number;
  parTaps?: number;
  // Visual: scale tile graphics by tile.size. Off by default — only level 4
  // currently opts in.
  useTileSizeScale?: boolean;
  // Logic: generate a balanced random MMC layout per play instead of using
  // explicit/legacy tube specs. Holes are a procedurally shuffled multiset
  // matching the tile supply, distributed round-robin across lanes.
  randomMmcLayout?: boolean;
  // Mechanic: tile-released marbles drop into a physics bowl above the
  // conveyor where same-color smalls auto-merge into larges. Only enters
  // pendingEject after physically crossing the merge-exit sensor.
  mergeZone?: boolean;
  // Override the tile-derived hole multiset for procedural MMC layout. Used
  // when the post-merge supply differs from the raw tile supply (level 5).
  holeSupply?: HoleSpec[];
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
