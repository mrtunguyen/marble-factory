// Visual constants for the game
import type { MarbleColor } from "./types";

export const MARBLE_RADIUS = 26;
export const TUBE_WIDTH = 64;
export const TUBE_SPACING = 90;
export const TUBE_PADDING_BOTTOM = 14;
export const MARBLE_SPACING = 58; // vertical space per marble slot
export const ANIMATION_DURATION = 180; // ms for marble tween

// Color palette — each marble color maps to a hex color
export const MARBLE_COLORS: Record<MarbleColor, number> = {
  red: 0xe74c3c,
  blue: 0x3498db,
  green: 0x27ae60,
  yellow: 0xf1c40f,
  purple: 0x9b59b6,
  orange: 0xe67e22,
  pink: 0xe91e8c,
  cyan: 0x00bcd4,
};

// CSS string versions for the editor UI
export const MARBLE_COLORS_CSS: Record<MarbleColor, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#27ae60",
  yellow: "#f1c40f",
  purple: "#9b59b6",
  orange: "#e67e22",
  pink: "#e91e8c",
  cyan: "#00bcd4",
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

export const SCENE_GAME = "GameScene";
export const SCENE_MENU = "MenuScene";
export const SCENE_COMPLETE = "LevelCompleteScene";
export const SCENE_EDITOR = "EditorScene";
