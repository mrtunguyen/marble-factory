import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_GAP,
  CONVEYOR_HEIGHT,
  CONVEYOR_MARGIN_X,
  CONVEYOR_MARBLE_RADIUS,
  TUBE_WIDTH,
  TUBE_GAP,
  MARBLE_COLORS,
  MARBLE_SIZE_SCALE,
  TILE_SIZE_SCALE,
  SCENE_MENU,
  SCENE_GAMEOVER,
  SCENE_CONQUEST,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_GRID_BG,
  UI_GRID_PANEL_BORDER,
  UI_FUNNEL,
  UI_FUNNEL_DARK,
  UI_PIPE_BG,
  UI_PIPE_BORDER,
  UI_PIPE_TRACK,
  UI_TUBE_SLOT_EMPTY,
  UI_TUBE_SLOT_BORDER,
  MMC_CAPACITY,
  MMC_WIDTH_PADDING,
  MMC_HEIGHT,
  MMC_QUEUE_GAP,
  MMC_HOLE_RADIUS,
  TAP_PARTICLE_COUNT,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import { markCompleted, unlockLevel, recordRun } from "../game/progression";
import { computeScore } from "../game/score";
import { drawTile, drawMarble, drawConveyorPipe, drawHole } from "../game/draw";
import {
  buildGameState,
  snapshot,
  restoreSnapshot,
  tick,
} from "../game/state";
import { tapTile } from "../game/gridManager";
import type { GameState, GridTile, LevelDef, Marble } from "../game/types";
import type { ShipEvent } from "../game/laneSystem";

interface TileSprite {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  text?: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Graphics;
  lockIcon?: Phaser.GameObjects.Text;
  r: number;
  c: number;
}

interface MarbleSprite {
  container: Phaser.GameObjects.Container;
  marble: Marble;
  physicsBody?: MatterJS.BodyType; // only for pending-eject marbles in the funnel
  scale: number; // track marble's actual size
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private level!: LevelDef;
  private tileSprites: (TileSprite | null)[][] = [];
  private marbleSprites: Map<number, MarbleSprite> = new Map();
  private marbleScales: Map<number, number> = new Map(); // track each marble's actual scale
  private isAnimating = false; // blocks taps during snapshot animations
  private lastTickAt = 0;
  private statusText!: Phaser.GameObjects.Text;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private conveyorX = 0; // left edge of inner pipe
  private conveyorY = 0; // top edge of inner pipe
  private conveyorWidth = 0;
  private lanesY = 0;
  private shippingLaneIds: Set<number> = new Set();
  private mmcExitDepth = 20;

  // Funnel physics geometry (computed in drawGridPanel, used by createFunnelColliders)
  private funnelPanelX = 0;
  private funnelPanelW = 0;
  private funnelPanelBottom = 0;
  private physicsDebugOn = false;
  private fromMap = false;
  private startedAt = 0;
  private tapCount = 0;

  constructor() {
    super("GameScene");
  }

  init(data: { levelId?: number; level?: LevelDef; fromMap?: boolean }): void {
    if (data?.level) {
      this.level = data.level;
    } else {
      const id = data?.levelId ?? 1;
      const found = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
      this.level = found;
    }
    this.fromMap = data?.fromMap ?? false;
    this.state = buildGameState(this.level);
    this.tileSprites = [];
    this.marbleSprites = new Map();
    this.marbleScales = new Map();
    this.isAnimating = false;
    this.lastTickAt = 0;
    this.shippingLaneIds = new Set();
    this.mmcExitDepth = 20;
    this.tapCount = 0;
    this.startedAt = 0;
  }

  preload(): void {
    this.load.audio("pop-sound", "assets/sounds/pop sound.ogg");
    this.load.audio("level-completed", "assets/sounds/level completed sound.mp3");
  }

  create(): void {
    this.startedAt = this.time.now;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawTopBar();
    this.drawGridPanel();
    this.buildGrid();
    this.drawConveyor();
    this.drawMMCLanes();
    this.createFunnelColliders();

    // Collision events for marble bounces
    this.matter.world.on("collisionstart", (event: any) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        if (bodyA.label.startsWith("marble-") || bodyB.label.startsWith("marble-")) {
          const marbleBody = bodyA.label.startsWith("marble-") ? bodyA : bodyB;
          const bounceForce = 0.015;
          (marbleBody as any).force = { x: 0, y: -bounceForce };
        }
      }
    });

    // Start with physics debug off; press D to toggle
    this.matter.world.drawDebug = false;
    this.input.keyboard?.on("keydown-D", () => {
      this.physicsDebugOn = !this.physicsDebugOn;
      this.matter.world.drawDebug = this.physicsDebugOn;
      if (!this.physicsDebugOn) {
        (this.matter.world as any).debugGraphic?.clear();
      }
    });

    // Status banner just below the top bar
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 64, "", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0);
  }

  // ─────────────────────────── TOP BAR ───────────────────────────
  private drawTopBar(): void {
    const barH = 56;
    const barG = this.add.graphics();
    barG.fillStyle(0x4a328a, 0.4);
    barG.fillRect(0, 0, GAME_WIDTH, barH);

    this.makeIconButton(36, barH / 2, "<", () => {
      this.scene.start(SCENE_MENU);
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        barH / 2,
        `Lv ${this.level.id} — ${this.level.name}`,
        {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
          stroke: "#5e2e91",
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5);

    this.makeIconButton(GAME_WIDTH - 88, barH / 2, "↶", () => this.handleUndo());
    this.makeIconButton(GAME_WIDTH - 36, barH / 2, "↻", () =>
      this.handleRestart(),
    );
  }

  private makeIconButton(
    x: number,
    y: number,
    label: string,
    cb: () => void,
  ): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(-20, -20, 40, 40, 10);
    g.lineStyle(2, 0x5e2e91, 1);
    g.strokeRoundedRect(-20, -20, 40, 40, 10);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "22px",
        color: "#5e2e91",
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(40, 40);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => cb());
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }

  // ─────────────────────────── GRID PANEL ───────────────────────────
  private drawGridPanel(): void {
    const gridW =
      this.level.cols * TILE_SIZE +
      (this.level.cols - 1) * TILE_GAP;
    const gridH =
      this.level.rows * TILE_SIZE +
      (this.level.rows - 1) * TILE_GAP;
    const panelW = Math.max(gridW + 72, 420);
    const panelH = Math.max(gridH + 58, 270);
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = 76;
    const panelBottom = panelY + panelH;
    const funnelBottomY = 382;
    const throatW = 82;

    this.funnelPanelX = panelX;
    this.funnelPanelW = panelW;
    this.funnelPanelBottom = panelBottom;

    const g = this.add.graphics();

    // Main grid chassis with stepped shoulders like the reference machine.
    g.fillStyle(UI_GRID_PANEL_BORDER, 1);
    g.fillRoundedRect(panelX - 7, panelY - 7, panelW + 14, panelH + 14, 24);
    g.fillStyle(UI_GRID_BG, 1);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 20);

    // Bottom connector: marbles leave the grid through this funnel into the belt.
    this.drawGridFunnel(
      g,
      panelX,
      panelBottom - 30,
      panelW,
      funnelBottomY,
      throatW,
      UI_FUNNEL_DARK,
      10,
    );
    this.drawGridFunnel(
      g,
      panelX + 8,
      panelBottom - 26,
      panelW - 16,
      funnelBottomY - 4,
      throatW - 16,
      UI_FUNNEL,
      0,
    );

    // Small dark mouth above the conveyor where logic-controlled marbles enter.
    g.fillStyle(0x2c5c5e, 0.38);
    g.fillRoundedRect(
      GAME_WIDTH / 2 - throatW / 2 + 7,
      funnelBottomY - 10,
      throatW - 14,
      18,
      9,
    );

    // Pale empty slots make the playfield read as a grid even after blocks clear.
    const slotOriginX = panelX + (panelW - gridW) / 2;
    const slotOriginY = panelY + 22 + (panelH - 44 - gridH) / 2;
    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const sx = slotOriginX + c * (TILE_SIZE + TILE_GAP);
        const sy = slotOriginY + r * (TILE_SIZE + TILE_GAP);
        g.fillStyle(UI_TUBE_SLOT_BORDER, 0.28);
        g.fillRoundedRect(sx - 2, sy + 3, TILE_SIZE + 4, TILE_SIZE + 4, 12);
        g.fillStyle(UI_TUBE_SLOT_EMPTY, 0.92);
        g.fillRoundedRect(sx, sy, TILE_SIZE, TILE_SIZE, 12);
        g.fillStyle(0xffffff, 0.35);
        g.fillRoundedRect(sx + 5, sy + 5, TILE_SIZE - 10, 14, 8);
      }
    }

    this.gridOriginX = slotOriginX + TILE_SIZE / 2;
    this.gridOriginY = slotOriginY + TILE_SIZE / 2;
  }

  private drawGridFunnel(
    g: Phaser.GameObjects.Graphics,
    panelX: number,
    topY: number,
    panelW: number,
    bottomY: number,
    throatW: number,
    color: number,
    shadowOffset: number,
  ): void {
    const centerX = GAME_WIDTH / 2;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(panelX + shadowOffset, topY);
    g.lineTo(panelX + panelW * 0.32, topY + 18);
    g.lineTo(centerX - throatW / 2, bottomY);
    g.lineTo(centerX + throatW / 2, bottomY);
    g.lineTo(panelX + panelW * 0.68, topY + 18);
    g.lineTo(panelX + panelW - shadowOffset, topY);
    g.lineTo(panelX + panelW - shadowOffset, topY + 48);
    g.lineTo(centerX + throatW / 2 + shadowOffset, bottomY + 14);
    g.lineTo(centerX - throatW / 2 - shadowOffset, bottomY + 14);
    g.lineTo(panelX + shadowOffset, topY + 48);
    g.closePath();
    g.fillPath();
  }

  private createFunnelColliders(): void {
    const T = 20;
    const cx = GAME_WIDTH / 2;
    const px = this.funnelPanelX;
    const pw = this.funnelPanelW;
    const panelY = 76;
    const fbY = this.conveyorY;
    const tw = 82;

    const Tau = 2 * Math.PI
    // Single ramp per side: panel top-corner → throat
    const lx1 = px, ly1 = panelY, lx2 = cx - tw / 2, ly2 = fbY;
    const lLen = Math.hypot(lx2 - lx1, ly2 - ly1);
    this.matter.add.rectangle((lx1 + lx2) / 2 -20+20, 400-100+50-10, 200, T,
      { isStatic: true, angle: Tau/15, label: "ramp-left" });

    const rx1 = px + pw, ry1 = panelY, rx2 = cx + tw / 2, ry2 = fbY;
    const rLen = Math.hypot(rx2 - rx1, ry2 - ry1);
    this.matter.add.rectangle((rx1 + rx2) / 2 +50-20-20-5, 400-100+50-10, 200, T,
      { isStatic: true, angle:-Tau/15, label: "ramp-right" });

    this.matter.add.rectangle(40, 200, 50, 300, {isStatic : true, angle : 0})
    this.matter.add.rectangle(400+40+40, 200, 50, 300, {isStatic : true, angle : 0})

    // Top cap
    this.matter.add.rectangle(cx, panelY - T / 2, pw + T * 2, T, { isStatic: true, label: "wall-top" });

    // Barrier at conveyor top
    this.matter.add.rectangle(cx, fbY -10, tw, T, { isStatic: true, label: "funnel-barrier" });

    // Screen-edge guards
    this.matter.add.rectangle(-T / 2, GAME_HEIGHT / 2, T, GAME_HEIGHT, { isStatic: true, label: "bound-left" });
    this.matter.add.rectangle(GAME_WIDTH + T / 2, GAME_HEIGHT / 2, T, GAME_HEIGHT, { isStatic: true, label: "bound-right" });
  }

  private tilePos(r: number, c: number): { x: number; y: number } {
    return {
      x: this.gridOriginX + c * (TILE_SIZE + TILE_GAP),
      y: this.gridOriginY + r * (TILE_SIZE + TILE_GAP),
    };
  }

  private buildGrid(): void {
    this.tileSprites = [];
    for (let r = 0; r < this.state.rows; r++) {
      const row: (TileSprite | null)[] = [];
      for (let c = 0; c < this.state.cols; c++) {
        const t = this.state.tiles[r][c];
        if (!t) {
          row.push(null);
          continue;
        }
        row.push(this.makeTileSprite(r, c, t));
      }
      this.tileSprites.push(row);
    }
  }

  private makeTileSprite(r: number, c: number, tile: GridTile): TileSprite {
    const { x, y } = this.tilePos(r, c);
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    const tileScale = this.level.useTileSizeScale ? TILE_SIZE_SCALE[tile.size] : 1;
    drawTile(graphics, TILE_SIZE, tile, this.state.marblesPerBlock, tileScale);
    container.add(graphics);

    let text: Phaser.GameObjects.Text | undefined;
    let badge: Phaser.GameObjects.Graphics | undefined;
    let lockIcon: Phaser.GameObjects.Text | undefined;

    if (tile.kind === "mystery" && !tile.revealed) {
      text = this.add
        .text(0, 0, "?", {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "34px",
          color: "#ffffff",
          stroke: "#444444",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      container.add(text);
    } else if (tile.kind === "counter" && tile.counter && tile.counter > 0) {
      badge = this.add.graphics();
      badge.fillStyle(0x1a1a2e, 0.78);
      badge.fillRoundedRect(-TILE_SIZE / 2 + 6, -12, TILE_SIZE - 12, 24, 6);
      container.add(badge);
      text = this.add
        .text(0, 0, `${tile.counter}`, {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      container.add(text);
    } else if (tile.kind === "locked" && !tile.unlocked) {
      lockIcon = this.add
        .text(0, 0, "🔒", {
          fontFamily: "Arial",
          fontSize: "32px",
        })
        .setOrigin(0.5);
      container.add(lockIcon);
    }

    container.setSize(TILE_SIZE, TILE_SIZE);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", () => this.handleTileTap(r, c));
    container.on("pointerover", () => container.setScale(1.05));
    container.on("pointerout", () => container.setScale(1));

    return { container, graphics, text, badge, lockIcon, r, c };
  }

  private redrawTile(r: number, c: number): void {
    const old = this.tileSprites[r][c];
    if (old) {
      old.container.destroy();
      this.tileSprites[r][c] = null;
    }
    const tile = this.state.tiles[r][c];
    if (tile) {
      this.tileSprites[r][c] = this.makeTileSprite(r, c, tile);
    }
  }

  private redrawAllTiles(): void {
    for (let r = 0; r < this.state.rows; r++) {
      for (let c = 0; c < this.state.cols; c++) {
        this.redrawTile(r, c);
      }
    }
  }

  // ─────────────────────────── CONVEYOR ───────────────────────────
  private drawConveyor(): void {
    const innerW = GAME_WIDTH - CONVEYOR_MARGIN_X * 2;
    const x = CONVEYOR_MARGIN_X;
    const y = 392;
    this.conveyorX = x;
    this.conveyorY = y;
    this.conveyorWidth = innerW;

    const g = this.add.graphics();
    drawConveyorPipe(g, x, y, innerW, CONVEYOR_HEIGHT, UI_PIPE_BG, UI_PIPE_BORDER);

    // Inner oval track: marbles follow these logical slots, not a physics body.
    g.lineStyle(10, UI_PIPE_TRACK, 0.9);
    g.strokeEllipse(
      x + innerW / 2,
      y + CONVEYOR_HEIGHT / 2,
      innerW - CONVEYOR_MARBLE_RADIUS * 2,
      CONVEYOR_HEIGHT - CONVEYOR_MARBLE_RADIUS,
    );

    // Slot indicators (faint dots)
    for (let i = 0; i < this.state.conveyor.length; i++) {
      const { x: sx, y: sy } = this.conveyorSlotPos(i);
      g.fillStyle(0x000000, 0.05);
      g.fillCircle(sx, sy, CONVEYOR_MARBLE_RADIUS - 2);
    }

    // Direction arrow on the loop.
    g.fillStyle(0x7e57c2, 0.6);
    const ax = x + innerW - 36;
    const ay = y + CONVEYOR_HEIGHT / 2 - 20;
    g.fillTriangle(ax - 10, ay - 6, ax + 10, ay - 6, ax, ay + 10);
  }

  private conveyorSlotPos(idx: number): { x: number; y: number } {
    const count = Math.max(1, this.state.conveyor.length);
    const angle = -Math.PI / 2 + (idx / count) * Math.PI * 2;
    const rx = this.conveyorWidth / 2 - CONVEYOR_MARBLE_RADIUS - 8;
    const ry = CONVEYOR_HEIGHT / 2 - CONVEYOR_MARBLE_RADIUS / 2;
    return {
      x: this.conveyorX + this.conveyorWidth / 2 + Math.cos(angle) * rx,
      y: this.conveyorY + CONVEYOR_HEIGHT / 2 + Math.sin(angle) * ry,
    };
  }


  // ─────────────────────────── TUBES ───────────────────────────
  private drawMMCLanes(): void {
    const lanes = this.state.lanes ?? [];
    if (lanes.length === 0) return;

    this.lanesY = 520;
    const panelG = this.add.graphics();
    panelG.fillStyle(0x4a328a, 0.28);
    panelG.fillRoundedRect(20, this.lanesY - 16, GAME_WIDTH - 40, 280, 24);

    for (let i = 0; i < lanes.length; i++) {
      this.drawMMCLane(i);
    }
  }

  private drawMMCLane(i: number): void {
    const lane = this.state.lanes?.[i];
    if (!lane) return;

    this.children.getByName(`lane-${i}`)?.destroy();
    const container = this.add.container(0, 0).setName(`lane-${i}`);
    const x = this.laneX(i);
    const y = this.lanesY;
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(0xffffff, 0.7);
    g.fillRoundedRect(x - TUBE_WIDTH / 2, y, TUBE_WIDTH, 214, 14);
    g.lineStyle(3, UI_TUBE_SLOT_BORDER, 0.9);
    g.strokeRoundedRect(x - TUBE_WIDTH / 2, y, TUBE_WIDTH, 214, 14);

    const holeRadius = MMC_HOLE_RADIUS;

    const mmcW = TUBE_WIDTH - MMC_WIDTH_PADDING;
    const mmcH = MMC_HEIGHT;
    lane.queue.slice(0, 4).forEach((mmc, queueIndex) => {
      const py = y + 24 + queueIndex * (mmcH + MMC_QUEUE_GAP);
      const isActive = queueIndex === 0;
      const shellColor = mmc.holes[0]?.color ?? "red";
      g.fillStyle(MARBLE_COLORS[shellColor], isActive ? 1 : 0.42);
      g.fillRoundedRect(x - mmcW / 2, py - mmcH / 2, mmcW, mmcH, 8);
      g.lineStyle(2, 0xffffff, isActive ? 0.95 : 0.45);
      g.strokeRoundedRect(x - mmcW / 2, py - mmcH / 2, mmcW, mmcH, 8);

      if (isActive) {
        for (let j = 0; j < MMC_CAPACITY; j++) {
          const p = this.mmcMarblePos(i, j);
          const hole = mmc.holes[j];
          if (!hole) continue;
          if (hole.marble) {
            g.lineStyle(1, 0x2c5c5e, 0.18);
            g.strokeCircle(
              p.x,
              p.y,
              holeRadius * MARBLE_SIZE_SCALE[hole.size],
            );
          } else {
            const holeG = this.add.graphics();
            holeG.x = p.x;
            holeG.y = p.y;
            drawHole(holeG, holeRadius, hole);
            container.add(holeG);
          }
        }
      }
    });
  }

  private laneX(i: number): number {
    const n = Math.max(1, this.state.lanes?.length ?? 1);
    const totalW = n * TUBE_WIDTH + (n - 1) * TUBE_GAP;
    const startX = (GAME_WIDTH - totalW) / 2 + TUBE_WIDTH / 2;
    return startX + i * (TUBE_WIDTH + TUBE_GAP);
  }

  private laneSlotIndex(i: number): number {
    const laneX = this.laneX(i);
    const bottomY = this.conveyorY + CONVEYOR_HEIGHT / 2;
    let bestSlot = 0;
    let bestDist = Infinity;

    for (let slot = 0; slot < this.state.conveyor.length; slot++) {
      const p = this.conveyorSlotPos(slot);
      if (p.y < bottomY) continue;

      const dist = Math.abs(p.x - laneX);
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    }

    return bestSlot;
  }

  private mmcMarblePos(laneIdx: number, j: number): { x: number; y: number } {
    const holePadding = 10;
    const mmcWidth = TUBE_WIDTH - MMC_WIDTH_PADDING;
    const availableWidth = mmcWidth - holePadding * 2;
    const step = availableWidth / Math.max(1, MMC_CAPACITY - 1);
    return {
      x: this.laneX(laneIdx) - mmcWidth / 2 + holePadding + j * step,
      y: this.lanesY + 24,
    };
  }

  private animateMMCExit(ship: ShipEvent): void {
    const laneX = this.laneX(ship.laneIndex);
    const shellY = this.lanesY + 24;
    const side = this.mmcExitSide(laneX);
    const exitX = side === "left" ? -70 : GAME_WIDTH + 70;
    const depth = ++this.mmcExitDepth;

    const mmcW = TUBE_WIDTH - MMC_WIDTH_PADDING;
    const mmcH = MMC_HEIGHT;
    const shell = this.add.container(laneX, shellY).setDepth(depth);
    const g = this.add.graphics();
    g.fillStyle(MARBLE_COLORS[ship.color], 1);
    g.fillRoundedRect(-mmcW / 2, -mmcH / 2, mmcW, mmcH, 8);
    g.lineStyle(2, 0xffffff, 0.95);
    g.strokeRoundedRect(-mmcW / 2, -mmcH / 2, mmcW, mmcH, 8);
    shell.add(g);

    this.shippingLaneIds.delete(ship.laneIndex);
    this.drawMMCLane(ship.laneIndex);

    this.tweens.add({
      targets: shell,
      x: exitX,
      duration: 460,
      ease: "Cubic.inOut",
      onComplete: () => shell.destroy(),
    });

    const deltaX = exitX - laneX;
    ship.marbles.forEach((m) => {
      const spr = this.marbleSprites.get(m.id);
      if (!spr) return;

      spr.container.setDepth(depth + 1);
      this.tweens.killTweensOf(spr.container);
      this.tweens.add({
        targets: spr.container,
        x: spr.container.x + deltaX,
        duration: 460,
        ease: "Cubic.inOut",
        onComplete: () => this.destroyMarbleSprite(m.id),
      });
    });
  }

  private mmcExitSide(x: number): "left" | "right" {
    const center = GAME_WIDTH / 2;
    if (Math.abs(x - center) < 1) {
      return Phaser.Math.Between(0, 1) === 0 ? "left" : "right";
    }
    return x < center ? "left" : "right";
  }

  // ─────────────────────────── MARBLE SPRITES ───────────────────────────

  private spawnMarbleSprite(
    marble: Marble,
    x: number,
    y: number,
    usePhysics = false,
    physicsRadius = CONVEYOR_MARBLE_RADIUS,
    scale = 1,
  ): MarbleSprite {
    const g = this.add.graphics();
    drawMarble(g, CONVEYOR_MARBLE_RADIUS * 2, marble.color);
    const c = this.add.container(x, y, [g]);
    c.setDepth(10);
    c.setScale(scale);

    let physicsBody: MatterJS.BodyType | undefined;
    if (usePhysics) {
      physicsBody = this.matter.add.circle(x, y, physicsRadius, {
        restitution: 0.15,
        friction: 0.05,
        frictionStatic: 0.08,
        frictionAir: 0.005,
        label: `marble-${marble.id}`,
      }) as MatterJS.BodyType;

      // Downward force proportional to marble size (heavier → falls faster)
      const sizeRatio = physicsRadius / CONVEYOR_MARBLE_RADIUS;
      const downForce = 0.0008 * sizeRatio;
      (physicsBody as any).force = { x: 0, y: downForce };

      // Small random horizontal velocity for visual separation
      const randomVx = Phaser.Math.Between(-2, 2);
      // Slight upward bounce on spawn
      const bounceVy = -3;
      (physicsBody as any).velocity = { x: randomVx, y: bounceVy };
    }

    const spr: MarbleSprite = { container: c, marble, physicsBody, scale };
    this.marbleSprites.set(marble.id, spr);
    return spr;
  }

  private destroyMarbleSprite(id: number): void {
    const spr = this.marbleSprites.get(id);
    if (spr) {
      if (spr.physicsBody) {
        this.matter.world.remove(spr.physicsBody as any, true);
        spr.physicsBody = undefined;
      }
      spr.container.destroy();
      this.marbleSprites.delete(id);
    }
  }

  // ─────────────────────────── INTERACTION ───────────────────────────
  private handleTileTap(r: number, c: number): void {
    if (this.state.status !== "playing") return;
    const tile = this.state.tiles[r][c];
    if (!tile) return;
    // Quick guard for locked
    if (tile.kind === "locked" && !tile.unlocked) {
      // Will the locks-satisfied check pass?
      // (Pre-check for friendlier feedback)
    }

    // Snapshot for undo BEFORE mutation.
    const snap = snapshot(this.state);
    const before = this.state.pendingEject.length;
    const outcome = tapTile(this.state, r, c);

    if (outcome.kind === "noop") {
      // Locked still locked, or empty — flash a wiggle.
      const spr = this.tileSprites[r][c];
      if (spr) {
        this.tweens.add({
          targets: spr.container,
          x: { from: spr.container.x - 4, to: spr.container.x },
          duration: 80,
          yoyo: true,
          repeat: 1,
        });
      }
      this.flashStatus("Locked!");
      return;
    }

    // Push snapshot to history
    this.state.history.push(snap);
    this.tapCount++;

    // Animate the tile change
    this.redrawTile(r, c);

    // If the tile is now empty, refreshing locks may have flipped neighbors.
    // Redraw everything for safety.
    this.redrawAllTiles();

    // If marbles were released, spawn with physics and pop-in animation.
    if (outcome.kind === "released" && outcome.releasedCount > 0) {
      const tilePos = this.tilePos(r, c);
      const newCount = this.state.pendingEject.length - before;

      // Screen shake on release
      this.cameras.main.shake(150, 0.01);

      // Particle burst - bright yellow dots
      for (let i = 0; i < TAP_PARTICLE_COUNT; i++) {
        const angle = (i / TAP_PARTICLE_COUNT) * Math.PI * 2;
        const vx = Math.cos(angle) * 60;
        const vy = Math.sin(angle) * 60 - 50;
        const dot = this.add.graphics();
        dot.fillStyle(0xffff00);
        dot.fillCircle(tilePos.x, tilePos.y, 4);
        this.tweens.add({
          targets: dot,
          x: tilePos.x + vx,
          y: tilePos.y + vy,
          scale: 0,
          duration: 400,
          ease: "Quad.out",
          onComplete: () => dot.destroy(),
        });
      }

      for (let k = 0; k < newCount; k++) {
        const m = this.state.pendingEject[before + k];
        const targetScale = MARBLE_SIZE_SCALE[m.size];
        const physicsRadius = CONVEYOR_MARBLE_RADIUS * targetScale;
        const offsetX = (k % 3 - 1) * (CONVEYOR_MARBLE_RADIUS * 0.6);
        const spr = this.spawnMarbleSprite(m, tilePos.x + offsetX, tilePos.y, true, physicsRadius, 0);
        this.marbleScales.set(m.id, targetScale);
        this.tweens.add({
          targets: spr.container,
          scale: targetScale,
          duration: 100,
          ease: "Back.Out",
          delay: 0,
          onComplete: () => { spr.scale = targetScale; },
        });
      }
    }

    // Status banner clear
    this.statusText.setText("");
  }

  private handleUndo(): void {
    if (this.state.history.length === 0) return;
    const snap = this.state.history.pop()!;
    restoreSnapshot(this.state, snap);
    this.fullRebuild();
  }

  private handleRestart(): void {
    this.state = buildGameState(this.level);
    this.fullRebuild();
  }

  private fullRebuild(): void {
    // Clear all marble sprites (also removes any physics bodies)
    const ids = [...this.marbleSprites.keys()];
    for (const id of ids) this.destroyMarbleSprite(id);

    // Rebuild tiles
    for (const row of this.tileSprites) {
      for (const s of row) {
        if (s) s.container.destroy();
      }
    }
    this.buildGrid();

    // Re-spawn pending marbles with physics, spread across the funnel area
    this.state.pendingEject.forEach((m, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const targetScale = MARBLE_SIZE_SCALE[m.size];
      const physicsRadius = CONVEYOR_MARBLE_RADIUS * targetScale;
      const x = GAME_WIDTH / 2 + (col - 1.5) * (CONVEYOR_MARBLE_RADIUS * 2 + 4);
      const y = this.funnelPanelBottom - 80 - row * (CONVEYOR_MARBLE_RADIUS * 2 + 4);
      this.spawnMarbleSprite(m, x, y, true, physicsRadius, targetScale);
      this.marbleScales.set(m.id, targetScale);
    });
    this.state.conveyor.forEach((m, i) => {
      if (!m) return;
      const p = this.conveyorSlotPos(i);
      const scale = this.marbleScales.get(m.id) ?? 1;
      const spr = this.spawnMarbleSprite(m, p.x, p.y, false, CONVEYOR_MARBLE_RADIUS, scale);
      spr.scale = scale;
    });
    const baseHoleScale = MMC_HOLE_RADIUS / CONVEYOR_MARBLE_RADIUS;
    this.state.lanes?.forEach((lane, i) => {
      const mmc = lane.queue[0];
      mmc?.holes.forEach((h, j) => {
        if (!h.marble) return;
        const p = this.mmcMarblePos(i, j);
        const scale = baseHoleScale * MARBLE_SIZE_SCALE[h.size];
        const spr = this.spawnMarbleSprite(
          h.marble,
          p.x,
          p.y,
          false,
          CONVEYOR_MARBLE_RADIUS,
          scale,
        );
        spr.scale = scale;
      });
      this.drawMMCLane(i);
    });

    this.statusText.setText("");
  }

  private flashStatus(msg: string): void {
    this.statusText.setText(msg);
    this.tweens.killTweensOf(this.statusText);
    this.statusText.setAlpha(1);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 800,
      delay: 600,
    });
  }

  // ─────────────────────────── TICK LOOP ───────────────────────────
  update(time: number): void {
    // Sync physics marble containers to their Matter bodies every frame
    for (const [, spr] of this.marbleSprites) {
      if (spr.physicsBody) {
        spr.container.setPosition(
          (spr.physicsBody as any).position.x,
          (spr.physicsBody as any).position.y,
        );
      }
    }

    if (this.state.status !== "playing") return;
    if (this.lastTickAt === 0) this.lastTickAt = time;
    if (time - this.lastTickAt < this.state.tickMs) return;
    this.lastTickAt = time;
    this.runTick();
  }

  private runTick(): void {
    // Snapshot conveyor's previous marbles by id → previous slot index
    const prevConveyor = this.state.conveyor.slice();

    const result = tick(this.state, (laneIdx) => this.laneSlotIndex(laneIdx));

    // 1. Animate conveyor shift: every marble that survived advances to its
    //    next logical slot on the oval path.
    for (let i = 0; i < this.state.conveyor.length; i++) {
      const m = this.state.conveyor[i];
      if (!m) continue;
      const spr = this.marbleSprites.get(m.id);
      if (!spr) continue;
      const p = this.conveyorSlotPos(i);
      this.tweens.killTweensOf(spr.container);
      this.tweens.add({
        targets: spr.container,
        x: p.x,
        y: p.y,
        duration: this.state.tickMs - 20,
        ease: "Linear",
      });
    }

    // 2. New marble injected at slot 0 from pendingEject — remove its physics
    //    body and tween the container onto the conveyor.
    if (result.injected) {
      const spr = this.marbleSprites.get(result.injected.id);
      if (spr) {
        if (spr.physicsBody) {
          this.matter.world.remove(spr.physicsBody as any, true);
          spr.physicsBody = undefined;
        }
        const p = this.conveyorSlotPos(0);
        const scale = this.marbleScales.get(result.injected.id) ?? 1;
        this.tweens.killTweensOf(spr.container);
        this.tweens.add({
          targets: spr.container,
          x: p.x,
          y: p.y,
          scale: scale,
          duration: this.state.tickMs - 20,
          ease: "Cubic.out",
        });
      }
    }

    // Step 3 (re-position pending queue sprites) removed — physics handles positioning.

    const baseHoleScale = MMC_HOLE_RADIUS / CONVEYOR_MARBLE_RADIUS;
    result.pickups.forEach((pickup) => {
      const spr = this.marbleSprites.get(pickup.marble.id);
      const target = this.mmcMarblePos(pickup.laneIndex, pickup.holeIndex);
      const targetScale = baseHoleScale * MARBLE_SIZE_SCALE[pickup.marble.size];

      this.sound.play("pop-sound");

      if (spr) {
        this.tweens.killTweensOf(spr.container);
        this.tweens.add({
          targets: spr.container,
          x: target.x,
          y: target.y,
          scale: targetScale,
          duration: 220,
          ease: "Cubic.out",
          onComplete: () => {
            spr.scale = targetScale;
            if (!this.shippingLaneIds.has(pickup.laneIndex)) {
              this.drawMMCLane(pickup.laneIndex);
            }
          },
        });
      } else {
        this.drawMMCLane(pickup.laneIndex);
      }
    });

    result.shipped.forEach((ship) => {
      this.shippingLaneIds.add(ship.laneIndex);
      this.time.delayedCall(240, () => {
        this.animateMMCExit(ship);
      });
    });

    // 4. Emitted marbles are now looped back to conveyor[0], so they're
    //    animated by the normal conveyor shift loop above (no special exit animation).

    // 5. Status transitions
    if (result.statusChanged) {
      this.time.delayedCall(700, () => {
        if (this.state.status === "won") {
          this.sound.play("level-completed");
          const timeSec = (this.time.now - this.startedAt) / 1000;
          const par = {
            time: this.level.parTimeSec ?? 30,
            taps: this.level.parTaps ?? 8,
          };
          const { score, stars } = computeScore(
            { timeSec, taps: this.tapCount },
            par,
          );
          recordRun(this.level.id, {
            score,
            stars,
            timeSec,
            taps: this.tapCount,
          });
          markCompleted(this.level.id);
          const idx = LEVELS.findIndex((l) => l.id === this.level.id);
          const nextId =
            idx >= 0 && idx + 1 < LEVELS.length ? LEVELS[idx + 1].id : undefined;
          if (nextId !== undefined) unlockLevel(nextId);
          this.scene.start(SCENE_CONQUEST, {
            levelId: this.level.id,
            score,
            stars,
            timeSec,
            taps: this.tapCount,
            par,
            fromMap: this.fromMap,
            justUnlocked: nextId,
          });
        } else if (this.state.status === "lost") {
          this.scene.start(SCENE_GAMEOVER, { levelId: this.level.id, fromMap: this.fromMap });
        }
      });
    }

    // Avoid unused-var warning; prevConveyor is kept for potential debug.
    void prevConveyor;
  }
}
