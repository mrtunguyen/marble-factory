// Core types for Marble Sort game

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
  color: MarbleColor;
}

export interface Tube {
  marbles: MarbleColor[]; // bottom to top order
  capacity: number;
  locked: boolean; // gameplay twist: locked tubes can't receive marbles for lockedTurns turns
  lockedTurns: number; // how many moves remain until unlock
}

export interface Level {
  id: number;
  name: string;
  tubes: TubeDef[];
  tubeCapacity: number;
}

export interface TubeDef {
  marbles: MarbleColor[]; // bottom to top
  locked?: boolean;
  lockedTurns?: number;
}

export interface Move {
  fromIndex: number;
  toIndex: number;
}

export interface GameState {
  tubes: Tube[];
  moveCount: number;
  history: Tube[][];
  selectedTubeIndex: number | null;
  levelComplete: boolean;
}
