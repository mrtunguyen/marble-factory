// Visual & layout constants
import type { BlockColor } from "./types";

// Game canvas
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 800;

// Block visuals
export const BLOCK_SIZE = 56;
export const BLOCK_GAP = 6;
export const BLOCK_RADIUS = 12;

// Tray visuals
export const TRAY_SLOT_SIZE = 50;
export const TRAY_GAP = 4;
export const TRAY_HEIGHT = 80;

// Animation
export const TRAY_ANIM_MS = 240;
export const MATCH_ANIM_MS = 320;

// Match threshold — N same colors adjacent in tray clear
export const MATCH_COUNT = 3;

// Color palette — bright candy colors
export const BLOCK_COLORS: Record<BlockColor, number> = {
  red: 0xff5b6e,
  blue: 0x49b9ff,
  green: 0x6dd35f,
  yellow: 0xffd84a,
  purple: 0xb472ff,
  orange: 0xff9c42,
  pink: 0xff7fb6,
  cyan: 0x42dfd0,
};

// Slightly darker for inner pattern dots
export const BLOCK_COLORS_DARK: Record<BlockColor, number> = {
  red: 0xd83a52,
  blue: 0x2a8fd9,
  green: 0x49a83d,
  yellow: 0xd9b020,
  purple: 0x8e4dd9,
  orange: 0xd97520,
  pink: 0xd9588f,
  cyan: 0x20b3a8,
};

// Lighter for top highlight
export const BLOCK_COLORS_LIGHT: Record<BlockColor, number> = {
  red: 0xff8b9a,
  blue: 0x7ed0ff,
  green: 0x96e088,
  yellow: 0xffe58a,
  purple: 0xcfa1ff,
  orange: 0xffb978,
  pink: 0xffaccf,
  cyan: 0x7fefe2,
};

export const ALL_COLORS: BlockColor[] = [
  "red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan",
];

export const SCENE_MENU = "MenuScene";
export const SCENE_GAME = "GameScene";
export const SCENE_COMPLETE = "LevelCompleteScene";
export const SCENE_GAMEOVER = "GameOverScene";
export const SCENE_EDITOR = "EditorScene";

// UI palette
export const UI_BG_TOP = 0xb39ddb;
export const UI_BG_BOTTOM = 0x9575cd;
export const UI_PANEL = 0xc4b3e0;
export const UI_TRAY_BG = 0xede0ff;
export const UI_TRAY_BORDER = 0x7e57c2;
export const UI_GRID_BG = 0xc7b8e8;
export const UI_TEXT_DARK = "#2d1b4e";
export const UI_TEXT_LIGHT = "#ffffff";
export const UI_ACCENT = 0xffa726;
