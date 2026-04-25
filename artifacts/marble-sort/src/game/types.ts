// Block Match puzzle game types

export type BlockColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "pink"
  | "cyan";

export type BlockKind = "normal" | "mystery" | "counter";

export interface Block {
  color: BlockColor; // for mystery: random color picked on tap
  kind: BlockKind;
  counter?: number; // for counter blocks: taps remaining
}

// A grid cell is either empty (null) or holds a block
export type Cell = Block | null;

export interface LevelDef {
  id: number;
  name: string;
  cols: number;
  rows: number;
  trayCapacity: number;
  // Compact grid string, row by row, top to bottom
  // Each cell is 2 chars: color + kind
  // Color: r=red, b=blue, g=green, y=yellow, p=purple, o=orange, k=pink, c=cyan
  // Kind: n=normal, m=mystery (color ignored, set to '?'), 3=counter3, 2=counter2
  // ".." = empty cell
  grid: string[];
}

export interface GameState {
  cols: number;
  rows: number;
  cells: Cell[][];
  tray: Block[];
  trayCapacity: number;
  collected: Record<BlockColor, number>;
  history: GameStateSnapshot[];
  status: "playing" | "won" | "lost";
}

export interface GameStateSnapshot {
  cells: Cell[][];
  tray: Block[];
  collected: Record<BlockColor, number>;
}
