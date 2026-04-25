// Visual & layout constants for Marble Factory
import type { MarbleColor } from "./types";

// Game canvas
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 900;

// Grid tile visuals
export const TILE_SIZE = 64;
export const TILE_GAP = 8;
export const TILE_RADIUS = 14;
export const COUNTER_TAB_WIDTH = 28;
export const COUNTER_TAB_HEIGHT = 18;
export const LOCK_BADGE_SIZE = 22;

// Conveyor visuals
export const CONVEYOR_HEIGHT = 78;
export const CONVEYOR_MARGIN_X = 28;
export const CONVEYOR_MARBLE_RADIUS = 14;
export const CONVEYOR_DROP_RADIUS = 18;

// Tube visuals (stacked-pill rack design)
export const TUBE_WIDTH = 60;
export const TUBE_GAP = 12;
export const TUBE_SLOT_HEIGHT = 28; // height of one pill slot
export const TUBE_SLOT_GAP = 2; // vertical spacing between pill slots
export const TUBE_RACK_PADDING = 12; // inner padding of the rack panel
export const TUBE_TOP_PADDING = 14;

// Animation
export const MARBLE_ANIM_MS = 220;

// Default level numbers
export const DEFAULT_MARBLES_PER_BLOCK = 3;
export const MAX_CONVEYOR_CAPACITY = 16;
export const DEFAULT_CONVEYOR_CAPACITY = MAX_CONVEYOR_CAPACITY;
export const DEFAULT_TICK_MS = 250;
export const MMC_CAPACITY = 3;
export const DEFAULT_TUBE_CONTAINER_COUNT = 4;
export const DEFAULT_TUBE_CAPACITY =
  MMC_CAPACITY * DEFAULT_TUBE_CONTAINER_COUNT;

// Marble colors — bright candy palette
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

// UI palette — teal/cyan factory chassis (per reference screenshot)
export const UI_CHASSIS = 0x6dc5c8; // main background
export const UI_CHASSIS_DARK = 0x4ea9ad; // shadow / vignette edge
export const UI_CHASSIS_LIGHT = 0x9adcde; // highlight on raised panels
export const UI_GRID_PANEL = 0x9adcde; // grid silhouette fill (inner)
export const UI_GRID_PANEL_BORDER = 0x4ea9ad; // grid silhouette outline / shadow
export const UI_FUNNEL = 0x9adcde;
export const UI_FUNNEL_DARK = 0x4ea9ad;
export const UI_PIPE_BG = 0xeefafb; // conveyor inner channel
export const UI_PIPE_BORDER = 0x4ea9ad; // conveyor outer casing
export const UI_PIPE_TRACK = 0xc7e8ea; // conveyor inner track tint
export const UI_DROP_HOLE = 0x2c5c5e; // dark drop hole
export const UI_TUBE_RACK = 0x9adcde; // tubes panel
export const UI_TUBE_RACK_BORDER = 0x4ea9ad;
export const UI_TUBE_SLOT_EMPTY = 0xd1ecee; // empty pill slot fill
export const UI_TUBE_SLOT_BORDER = 0x4ea9ad; // pill slot outline
export const UI_TEXT_DARK = "#1f3d3f";
export const UI_TEXT_LIGHT = "#ffffff";
export const UI_ACCENT = 0xffa726;
export const UI_TAB_DARK = 0x1f3a73; // counter tab base color (deep blue)
export const UI_TAB_HIGHLIGHT = 0x3a5cb8;

// Legacy aliases kept so MenuScene/EditorScene keep compiling. They map onto
// the new chassis palette.
export const UI_BG_TOP = UI_CHASSIS_LIGHT;
export const UI_BG_BOTTOM = UI_CHASSIS;
export const UI_PANEL = UI_GRID_PANEL;
export const UI_GRID_BG = UI_GRID_PANEL;
export const UI_TUBE_BG = UI_TUBE_SLOT_EMPTY;
export const UI_TUBE_BORDER = UI_TUBE_RACK_BORDER;

// Removed (no longer used by the new design): TUBE_CAP_HEIGHT,
// TUBE_BOTTOM_HEIGHT, TUBE_PADDING, TUBE_MARBLE_DIAMETER. Kept as 0 below for
// any straggler imports — should be cleaned up in follow-up.
export const TUBE_CAP_HEIGHT = 0;
export const TUBE_BOTTOM_HEIGHT = 0;
export const TUBE_PADDING = 0;
export const TUBE_MARBLE_DIAMETER = TUBE_SLOT_HEIGHT;
