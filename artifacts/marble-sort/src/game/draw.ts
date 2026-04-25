// Shared drawing helpers — chunky candy block / marble / pipe / tube
import Phaser from "phaser";
import {
  MARBLE_COLORS,
  MARBLE_COLORS_DARK,
  MARBLE_COLORS_LIGHT,
  TILE_RADIUS,
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
  // Cap (colored lid)
  g.fillStyle(MARBLE_COLORS_DARK[capColor], 1);
  g.fillRoundedRect(x - 4, y, width + 8, capHeight, 8);
  g.fillStyle(MARBLE_COLORS[capColor], 1);
  g.fillRoundedRect(x - 2, y + 2, width + 4, capHeight - 4, 6);
  g.fillStyle(MARBLE_COLORS_LIGHT[capColor], 0.75);
  g.fillRoundedRect(x + 2, y + 4, width - 4, (capHeight - 8) / 2, 4);

  // Body
  const bodyY = y + capHeight;
  g.fillStyle(0x4a328a, 0.4);
  g.fillRect(x - 3, bodyY, width + 6, bodyHeight);
  g.fillStyle(0xede0ff, 0.85);
  g.fillRect(x, bodyY, width, bodyHeight);
  // Inner left/right shadow
  g.fillStyle(0x000000, 0.08);
  g.fillRect(x, bodyY, 4, bodyHeight);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(x + width - 3, bodyY, 3, bodyHeight);

  // Bottom (rounded base)
  const baseY = bodyY + bodyHeight;
  g.fillStyle(0x4a328a, 0.55);
  g.fillRoundedRect(x - 4, baseY - 4, width + 8, bottomHeight + 4, 10);
  g.fillStyle(0xc4b3e0, 1);
  g.fillRoundedRect(x - 2, baseY - 2, width + 4, bottomHeight, 8);
}
