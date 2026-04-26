// Shared drawing helpers — chunky candy block / marble / pipe / tube
import Phaser from "phaser";
import {
  MARBLE_COLORS,
  MARBLE_COLORS_DARK,
  MARBLE_COLORS_LIGHT,
  MARBLE_SIZE_SCALE,
  TILE_RADIUS,
} from "./constants";
import type { GridTile, Hole, MarbleColor } from "./types";

// Draw a chunky candy tile centered at (0, 0) on the given Graphics object.
// Used for grid blocks, mystery, counter, locked.
//
// `tileScale` (default 1) is a multiplier on the drawn tile's outer size; the
// inner marble grid scales with it because marble positions are derived from
// `size`. Used by levels with useTileSizeScale: small tiles render visibly
// smaller than large tiles in the same grid.
export function drawTile(
  g: Phaser.GameObjects.Graphics,
  size: number,
  tile: GridTile,
  marblesPerBlock = 9,
  tileScale = 1,
): void {
  size = size * tileScale;
  const r = TILE_RADIUS * (size / 56);
  const half = size / 2;

  // Drop shadow
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-half + 2, -half + 5, size, size, r);

  const isDisabled = tile.kind === "mystery" && !tile.enabled;
  const isHidden = tile.kind === "mystery" && !tile.revealed;
  const isLocked = tile.kind === "locked" && !tile.unlocked;

  // Resolve render colors
  const color = isDisabled
    ? 0x666666
    : isHidden
      ? 0x9e9e9e
      : isLocked
        ? 0x7a6a99
        : MARBLE_COLORS[tile.color];
  const colorDark = isDisabled
    ? 0x4a4a4a
    : isHidden
      ? 0x6e6e6e
      : isLocked
        ? 0x4f4373
        : MARBLE_COLORS_DARK[tile.color];
  const colorLight = isDisabled
    ? 0x888888
    : isHidden
      ? 0xc4c4c4
      : isLocked
        ? 0xa192c4
        : MARBLE_COLORS_LIGHT[tile.color];

  // Main body
  g.fillStyle(color, 1);
  g.fillRoundedRect(-half, -half, size, size, r);

  // Top highlight (lighter band)
  g.fillStyle(colorLight, 0.5);
  g.fillRoundedRect(-half + 3, -half + 3, size - 6, size * 0.28, r * 0.7);

  // 3×3 grid of 3D marbles showing marblesLeft out of marblesPerBlock
  const cols = 3;
  const rows = Math.ceil(marblesPerBlock / cols);
  const mr = size * 0.13;          // marble radius
  const spacing = size * 0.30;     // center-to-center spacing
  const gridW = (cols - 1) * spacing;
  const gridH = (rows - 1) * spacing;
  const ox = -gridW / 2;
  const oy = -gridH / 2 + size * 0.06; // slight downward offset from center

  for (let i = 0; i < marblesPerBlock; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ox + col * spacing;
    const cy = oy + row * spacing;
    const filled = i < tile.marblesLeft;

    if (filled) {
      // 3D marble: shadow → body → dark hemisphere → two highlights
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(cx + mr * 0.4, cy + mr * 0.5, mr * 0.85);
      g.fillStyle(color, 1);
      g.fillCircle(cx, cy, mr);
      g.fillStyle(colorDark, 0.45);
      g.fillCircle(cx + mr * 0.2, cy + mr * 0.2, mr * 0.6);
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(cx - mr * 0.3, cy - mr * 0.35, mr * 0.32);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx - mr * 0.38, cy - mr * 0.4, mr * 0.14);
    } else {
      // Empty socket: dark inset circle
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(cx, cy, mr);
      g.fillStyle(colorDark, 0.3);
      g.fillCircle(cx - mr * 0.2, cy - mr * 0.2, mr * 0.7);
    }
  }
}

// Draw a single marble centered at (0, 0). The optional `scale` is applied to
// the marble's radius (used for the size-matching mechanic where small/medium/
// large marbles share the same call site).
export function drawMarble(
  g: Phaser.GameObjects.Graphics,
  size: number,
  color: MarbleColor,
  scale = 1,
): void {
  const r = (size / 2) * scale;
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

/** Draw an empty hole socket at the given baseRadius scaled by the hole's size.
 *  Rendered as a 3D drilled hole: white rim, recessed dark interior with a top
 *  shadow and a faint bottom bounce-light. A subtle color tint inside keeps the
 *  hole's required color readable without overwhelming the white-rim look. */
export function drawHole(
  g: Phaser.GameObjects.Graphics,
  baseRadius: number,
  hole: Hole,
): void {
  const r = baseRadius * MARBLE_SIZE_SCALE[hole.size];

  // Outer drop shadow — implies the rim has thickness sitting on a surface.
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(0, 2, r * 1.05);

  // White rim disk.
  g.fillStyle(0xffffff, 1);
  g.fillCircle(0, 0, r);
  // Bottom-right shading on the rim so it reads as convex/raised.
  g.fillStyle(0xbfbfbf, 0.55);
  g.fillCircle(r * 0.18, r * 0.22, r * 0.96);
  // Top-left highlight on the rim.
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(-r * 0.22, -r * 0.28, r * 0.72);

  // Recessed interior — dark, with a faint color tint for the matching cue.
  const innerR = r * 0.74;
  g.fillStyle(0x111111, 1);
  g.fillCircle(0, 0, innerR);
  g.fillStyle(MARBLE_COLORS_DARK[hole.color], 0.45);
  g.fillCircle(0, 0, innerR);

  // Top inner shadow — the deepest part of the recess (light enters from above).
  g.fillStyle(0x000000, 0.6);
  g.fillCircle(0, -innerR * 0.18, innerR * 0.92);

  // Bottom inner bounce-light — soft tinted glow at the back wall.
  g.fillStyle(MARBLE_COLORS[hole.color], 0.28);
  g.fillCircle(0, innerR * 0.35, innerR * 0.5);

  // Crisp inner ring — sharpens the edge between rim and recess.
  g.lineStyle(1, 0x222222, 0.7);
  g.strokeCircle(0, 0, innerR);
  // Outer rim outline.
  g.lineStyle(1, 0x808080, 0.55);
  g.strokeCircle(0, 0, r);
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
