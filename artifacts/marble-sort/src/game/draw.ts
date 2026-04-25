// Shared drawing helpers — chunky candy block style
import Phaser from "phaser";
import {
  BLOCK_COLORS,
  BLOCK_COLORS_DARK,
  BLOCK_COLORS_LIGHT,
  BLOCK_RADIUS,
} from "./constants";
import type { Block, BlockColor } from "./types";

// Draw a chunky candy block centered at (0, 0) on the given Graphics object.
// The block is the look from the screenshot — rounded square, gradient,
// with a dot pattern inside (like bubble wrap).
export function drawBlock(
  g: Phaser.GameObjects.Graphics,
  size: number,
  block: Block,
  options: { mysteryLabel?: boolean } = {}
): void {
  const r = BLOCK_RADIUS * (size / 56);
  const half = size / 2;

  // Drop shadow
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-half + 2, -half + 5, size, size, r);

  // Resolve render color (mystery shows gray)
  const color =
    block.kind === "mystery"
      ? 0x9e9e9e
      : BLOCK_COLORS[block.color];
  const colorDark =
    block.kind === "mystery"
      ? 0x6e6e6e
      : BLOCK_COLORS_DARK[block.color];
  const colorLight =
    block.kind === "mystery"
      ? 0xc4c4c4
      : BLOCK_COLORS_LIGHT[block.color];

  // Main body
  g.fillStyle(color, 1);
  g.fillRoundedRect(-half, -half, size, size, r);

  // Top highlight (lighter band)
  g.fillStyle(colorLight, 0.6);
  g.fillRoundedRect(-half + 3, -half + 3, size - 6, size * 0.35, r * 0.7);

  // Dot pattern (3x3 grid of dots) — like bubble wrap
  const dotR = size * 0.07;
  const dotSpacing = size * 0.22;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const dx = dc * dotSpacing;
      const dy = dr * dotSpacing;
      // Shadow side of dot
      g.fillStyle(colorDark, 0.55);
      g.fillCircle(dx + 1, dy + 1, dotR);
      // Highlight side of dot
      g.fillStyle(colorLight, 0.9);
      g.fillCircle(dx - 1, dy - 1, dotR * 0.6);
    }
  }

  // Special block overlays
  if (block.kind === "mystery" && options.mysteryLabel !== false) {
    // Rendering of "?" handled by separate text object in scene
  }
}

// Draw counter overlay (the "3" or "2" badge on a counter block)
export function drawCounterBadge(
  g: Phaser.GameObjects.Graphics,
  size: number
): void {
  const half = size / 2;
  // Dark band across the middle for the number to sit on
  g.fillStyle(0x1a1a2e, 0.7);
  g.fillRoundedRect(-half + 4, -half * 0.25, size - 8, size * 0.4, 6);
}

// Draw a small marble (used in tray and collection bar)
export function drawMarble(
  g: Phaser.GameObjects.Graphics,
  size: number,
  color: BlockColor
): void {
  const r = size / 2;
  // Shadow
  g.fillStyle(0x000000, 0.2);
  g.fillCircle(2, 3, r);
  // Body
  g.fillStyle(BLOCK_COLORS[color], 1);
  g.fillCircle(0, 0, r);
  // Highlight
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(-r * 0.3, -r * 0.3, r * 0.35);
}

// Draw a stylized "tray pipe" — like the curved channel in the screenshot
export function drawTrayPipe(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: number,
  borderColor: number
): void {
  const r = height / 2;
  // Outer pill
  g.fillStyle(borderColor, 1);
  g.fillRoundedRect(x - 3, y - 3, width + 6, height + 6, r + 3);
  // Inner pill
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(x, y, width, height, r);
  // Inner shadow at top
  g.fillStyle(0x000000, 0.08);
  g.fillRoundedRect(x + 4, y + 3, width - 8, height * 0.3, r * 0.5);
}
