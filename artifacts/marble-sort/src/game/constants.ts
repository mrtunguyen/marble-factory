// Visual & layout constants for Marble Sort
import type { MarbleColor } from "./types";

// Game canvas
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 900;

// Grid tile visuals
export const TILE_SIZE = 64;
export const TILE_GAP = 8;
export const TILE_RADIUS = 12;

// Conveyor visuals
export const CONVEYOR_HEIGHT = 60;
export const CONVEYOR_MARGIN_X = 30;
export const CONVEYOR_MARBLE_RADIUS = 14;

// Tube visuals
export const TUBE_WIDTH = 56;
export const TUBE_GAP = 14;
export const TUBE_MARBLE_DIAMETER = 30;
export const TUBE_CAP_HEIGHT = 22;
export const TUBE_BOTTOM_HEIGHT = 18;
export const TUBE_PADDING = 6;

// Animation
export const MARBLE_ANIM_MS = 220;

// Default level numbers
export const DEFAULT_MARBLES_PER_BLOCK = 3;
export const DEFAULT_CONVEYOR_CAPACITY = 8;
export const DEFAULT_TICK_MS = 250;
export const DEFAULT_TUBE_CAPACITY = 6;

// Color palette — bright candy colors
export const MARBLE_COLORS: Record<MarbleColor, number> = {
  red: 0xff5b6e,
  blue: 0x49b9ff,
  green: 0x6dd35f,
  yellow: 0xffd84a,
  purple: 0xb472ff,
  orange: 0xff9c42,
  pink: 0xff7fb6,
  cyan: 0x42dfd0,
};

export const MARBLE_COLORS_DARK: Record<MarbleColor, number> = {
  red: 0xd83a52,
  blue: 0x2a8fd9,
  green: 0x49a83d,
  yellow: 0xd9b020,
  purple: 0x8e4dd9,
  orange: 0xd97520,
  pink: 0xd9588f,
  cyan: 0x20b3a8,
};

export const MARBLE_COLORS_LIGHT: Record<MarbleColor, number> = {
  red: 0xff8b9a,
  blue: 0x7ed0ff,
  green: 0x96e088,
  yellow: 0xffe58a,
  purple: 0xcfa1ff,
  orange: 0xffb978,
  pink: 0xffaccf,
  cyan: 0x7fefe2,
};

export const ALL_COLORS: MarbleColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan",
];

// Scene keys
export const SCENE_MENU = "MenuScene";
export const SCENE_GAME = "GameScene";
export const SCENE_COMPLETE = "LevelCompleteScene";
export const SCENE_GAMEOVER = "GameOverScene";
export const SCENE_EDITOR = "EditorScene";

// UI palette — muted purples, like the reference screenshot
export const UI_BG_TOP = 0xb39ddb;
export const UI_BG_BOTTOM = 0x9575cd;
export const UI_PANEL = 0xc4b3e0;
export const UI_GRID_BG = 0xc7b8e8;
export const UI_PIPE_BG = 0xede0ff;
export const UI_PIPE_BORDER = 0x7e57c2;
export const UI_TUBE_BG = 0xf3ecff;
export const UI_TUBE_BORDER = 0x7e57c2;
export const UI_TEXT_DARK = "#2d1b4e";
export const UI_TEXT_LIGHT = "#ffffff";
export const UI_ACCENT = 0xffa726;
