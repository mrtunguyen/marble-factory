// Shared drawing helpers — chunky candy block / marble / pipe / tube
import Phaser from "phaser";
import {
  MARBLE_COLORS,
  MARBLE_COLORS_DARK,
  MARBLE_COLORS_LIGHT,
  TILE_RADIUS,
  TUBE_SLOT_GAP,
  TUBE_SLOT_HEIGHT,
  UI_TUBE_SLOT_BORDER,
  UI_TUBE_SLOT_EMPTY,
} from "./constants";
import type { GridTile, MarbleColor } from "./types";

// Draw a chunky candy tile centered at (0, 0) on the given Graphics object.
// Used for grid blocks, mystery, counter, locked.
export function drawTile(
  g: Phaser.GameObjects.Graphics,
  size: number,
  tile: GridTile,
): void {
  const r = TILE_RADIUS * (size / 56);
  const half = size / 2;

  // Drop shadow
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-half + 2, -half + 5, size, size, r);

  const isHidden = tile.kind === "mystery" && !tile.revealed;
  const isLocked = tile.kind === "locked" && !tile.unlocked;

  // Resolve render colors
  const color = isHidden
    ? 0x9e9e9e
    : isLocked
      ? 0x7a6a99
      : MARBLE_COLORS[tile.color];
  const colorDark = isHidden
    ? 0x6e6e6e
    : isLocked
      ? 0x4f4373
      : MARBLE_COLORS_DARK[tile.color];
  const colorLight = isHidden
    ? 0xc4c4c4
    : isLocked
      ? 0xa192c4
      : MARBLE_COLORS_LIGHT[tile.color];

  // Main body
  g.fillStyle(color, 1);
  g.fillRoundedRect(-half, -half, size, size, r);

  // Top highlight (lighter band)
  g.fillStyle(colorLight, 0.6);
  g.fillRoundedRect(-half + 3, -half + 3, size - 6, size * 0.32, r * 0.7);

  // Dot pattern (3x3 grid of dots) — like bubble wrap
  const dotR = size * 0.07;
  const dotSpacing = size * 0.22;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const dx = dc * dotSpacing;
      const dy = dr * dotSpacing;
      g.fillStyle(colorDark, 0.5);
      g.fillCircle(dx + 1, dy + 1, dotR);
      g.fillStyle(colorLight, 0.85);
      g.fillCircle(dx - 1, dy - 1, dotR * 0.6);
    }
  }
}

// Draw a single marble centered at (0, 0)
export function drawMarble(
  g: Phaser.GameObjects.Graphics,
  size: number,
  color: MarbleColor,
): void {
  const r = size / 2;
  // Shadow
  g.fillStyle(0x000000, 0.25);
  g.fillCircle(2, 3, r);
  // Body
  g.fillStyle(MARBLE_COLORS[color], 1);
  g.fillCircle(0, 0, r);
  // Mid tone
  g.fillStyle(MARBLE_COLORS_DARK[color], 0.5);
  g.fillCircle(r * 0.25, r * 0.25, r * 0.55);
  // Highlight
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(-r * 0.32, -r * 0.36, r * 0.32);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(-r * 0.4, -r * 0.42, r * 0.16);
}

// Draw one wide rounded slot fill for the sorting columns.
export function drawTubeMarble(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  color: MarbleColor,
): void {
  const x = -width / 2;
  const y = -height / 2;
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(x + 2, y + 4, width, height, 13);
  g.fillStyle(MARBLE_COLORS_DARK[color], 1);
  g.fillRoundedRect(x, y, width, height, 13);
  g.fillStyle(MARBLE_COLORS[color], 1);
  g.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, 11);
  g.fillStyle(MARBLE_COLORS_LIGHT[color], 0.62);
  g.fillRoundedRect(x + 4, y + 4, width - 8, height * 0.38, 9);
}

// Draw a horizontal conveyor pipe with rivets
export function drawConveyorPipe(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: number,
  borderColor: number,
): void {
  const r = height / 2;
  // Outer border (the pipe casing)
  g.fillStyle(borderColor, 1);
  g.fillRoundedRect(x - 4, y - 4, width + 8, height + 8, r + 4);
  // Inner channel
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(x, y, width, height, r);
  // Inner shadow at top
  g.fillStyle(0x000000, 0.12);
  g.fillRoundedRect(x + 6, y + 4, width - 12, height * 0.28, r * 0.5);
  // Rivets along the casing
  const rivetCount = Math.floor(width / 32);
  const rivetSpacing = width / rivetCount;
  for (let i = 0; i <= rivetCount; i++) {
    const rx = x + i * rivetSpacing;
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(rx, y - 2, 2.5);
    g.fillCircle(rx, y + height + 2, 2.5);
  }
}

// Draw a vertical sorting tube (cap + body + bottom)
// Tube is anchored at its TOP-LEFT (x, y).
// `bodyHeight` is the inner stack region height; the tube also draws cap and base.
export function drawTube(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  bodyHeight: number,
  capHeight: number,
  bottomHeight: number,
  capColor: MarbleColor,
): void {
  const capacity = Math.max(
    1,
    Math.round((bodyHeight + TUBE_SLOT_GAP) / (TUBE_SLOT_HEIGHT + TUBE_SLOT_GAP)),
  );
  const totalHeight = capHeight + bodyHeight + bottomHeight;

  // Strong outside silhouette, like the reference game's outlined columns.
  g.fillStyle(0x11131f, 0.92);
  g.fillRoundedRect(x - 5, y - 5, width + 10, totalHeight + 10, 15);
  g.fillStyle(0xffffff, 0.92);
  g.fillRoundedRect(x - 2, y - 2, width + 4, totalHeight + 4, 13);

  // Header cap with three darker circular holes.
  g.fillStyle(MARBLE_COLORS_DARK[capColor], 1);
  g.fillRoundedRect(x, y, width, capHeight, 13);
  g.fillStyle(MARBLE_COLORS[capColor], 1);
  g.fillRoundedRect(x + 3, y + 3, width - 6, capHeight - 6, 11);
  g.fillStyle(MARBLE_COLORS_LIGHT[capColor], 0.68);
  g.fillRoundedRect(x + 5, y + 5, width - 10, capHeight * 0.4, 9);

  const dotY = y + capHeight * 0.46;
  const dotR = Math.min(12, width * 0.12);
  const dotGap = width * 0.26;
  for (let i = -1; i <= 1; i++) {
    g.fillStyle(MARBLE_COLORS_DARK[capColor], 0.62);
    g.fillCircle(x + width / 2 + i * dotGap, dotY + 1, dotR);
    g.fillStyle(MARBLE_COLORS_LIGHT[capColor], 0.28);
    g.fillCircle(x + width / 2 + i * dotGap - 2, dotY - 2, dotR * 0.55);
  }

  // Body made of individual rounded pill slots.
  const bodyY = y + capHeight;
  for (let i = 0; i < capacity; i++) {
    const slotY = bodyY + i * (TUBE_SLOT_HEIGHT + TUBE_SLOT_GAP);
    g.fillStyle(UI_TUBE_SLOT_BORDER, 0.32);
    g.fillRoundedRect(x, slotY + 2, width, TUBE_SLOT_HEIGHT + 2, 12);
    g.fillStyle(UI_TUBE_SLOT_EMPTY, 1);
    g.fillRoundedRect(x + 2, slotY, width - 4, TUBE_SLOT_HEIGHT, 12);
    g.fillStyle(0xffffff, 0.44);
    g.fillRoundedRect(x + 7, slotY + 5, width - 14, TUBE_SLOT_HEIGHT * 0.34, 9);
  }
}
