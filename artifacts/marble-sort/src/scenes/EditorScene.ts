import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_MENU,
  SCENE_GAME,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_TEXT_LIGHT,
  ALL_COLORS,
  MARBLE_COLORS,
  DEFAULT_CONVEYOR_CAPACITY,
  DEFAULT_MARBLES_PER_BLOCK,
  DEFAULT_TICK_MS,
  TILE_SIZE_SCALE,
} from "../game/constants";
import { drawTile, drawMarble } from "../game/draw";
import type {
  GridTile,
  HoleSpec,
  LevelDef,
  LevelTile,
  MarbleColor,
  MarbleSize,
  MMCSpec,
  TileKind,
  TubeSpec,
} from "../game/types";

interface PaintMode {
  kind: TileKind | "erase";
  color: MarbleColor;
  counter?: number;
  size?: "small" | "medium" | "large";
}

const EDITOR_COLS = 4;
const EDITOR_ROWS = 3;
const CELL = 56;
const CELL_GAP = 6;

export class EditorScene extends Phaser.Scene {
  private tiles: (LevelTile | null)[][] = [];
  private mode: PaintMode = { kind: "block", color: "red" };
  private gridContainer!: Phaser.GameObjects.Container;
  private cellGfx: Phaser.GameObjects.Graphics[][] = [];
  private modeText!: Phaser.GameObjects.Text;
  private mysteryMMCCounter!: Phaser.GameObjects.Text;
  private mysteryMMCCount: number = 0;
  private maxMysteryMMCs: number = 0;

  constructor() {
    super("EditorScene");
  }

  create(): void {
    // Reset state on (re-)entry
    this.tiles = Array.from({ length: EDITOR_ROWS }, () =>
      new Array(EDITOR_COLS).fill(null),
    );
    this.mode = { kind: "block", color: "red" };

    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Top bar
    this.makeTopBar();

    // Title
    this.add
      .text(GAME_WIDTH / 2, 70, "LEVEL EDITOR", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "24px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // Grid panel
    this.buildGridPanel();

    // Palette
    this.buildPalette();

    // Action buttons
    this.makeButton(GAME_WIDTH / 2 - 105, GAME_HEIGHT - 60, "TEST PLAY", 0x6dd35f, () =>
      this.testPlay(),
    );
    this.makeButton(GAME_WIDTH / 2 + 105, GAME_HEIGHT - 60, "COPY JSON", 0x49b9ff, () =>
      this.copyJson(),
    );

    // Mystery MMC counter and controls (center bottom)
    const mysteryY = GAME_HEIGHT - 30;
    this.makeSmallButton(GAME_WIDTH / 2 - 70, mysteryY, "−", 0xff9800, () =>
      this.adjustMysteryCount(-1),
    );
    this.mysteryMMCCounter = this.add
      .text(GAME_WIDTH / 2, mysteryY, "", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "13px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);
    this.makeSmallButton(GAME_WIDTH / 2 + 70, mysteryY, "+", 0xff9800, () =>
      this.adjustMysteryCount(1),
    );
    this.updateMysteryCounter();
  }

  // ─────────── TOP BAR ───────────
  private makeTopBar(): void {
    const barH = 50;
    const barG = this.add.graphics();
    barG.fillStyle(0x4a328a, 0.4);
    barG.fillRect(0, 0, GAME_WIDTH, barH);

    // Back
    const c = this.add.container(36, barH / 2);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(-20, -20, 40, 40, 10);
    g.lineStyle(2, 0x5e2e91, 1);
    g.strokeRoundedRect(-20, -20, 40, 40, 10);
    const t = this.add
      .text(0, 0, "<", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "22px",
        color: "#5e2e91",
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(40, 40);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => this.scene.start(SCENE_MENU));
  }

  // ─────────── GRID ───────────
  private buildGridPanel(): void {
    const w = EDITOR_COLS * CELL + (EDITOR_COLS - 1) * CELL_GAP + 28;
    const h = EDITOR_ROWS * CELL + (EDITOR_ROWS - 1) * CELL_GAP + 28;
    const x = (GAME_WIDTH - w) / 2;
    const y = 110;

    const g = this.add.graphics();
    g.fillStyle(0x4a328a, 0.5);
    g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 18);
    g.fillStyle(0xc7b8e8, 1);
    g.fillRoundedRect(x, y, w, h, 14);

    this.gridContainer = this.add.container(x + 14 + CELL / 2, y + 14 + CELL / 2);
    this.cellGfx = [];
    for (let r = 0; r < EDITOR_ROWS; r++) {
      const row: Phaser.GameObjects.Graphics[] = [];
      for (let c = 0; c < EDITOR_COLS; c++) {
        const cellG = this.add.graphics();
        cellG.x = c * (CELL + CELL_GAP);
        cellG.y = r * (CELL + CELL_GAP);
        const hit = new Phaser.Geom.Rectangle(-CELL / 2, -CELL / 2, CELL, CELL);
        cellG.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
        cellG.on("pointerdown", () => this.applyPaint(r, c));
        this.gridContainer.add(cellG);
        row.push(cellG);
      }
      this.cellGfx.push(row);
    }
    this.redrawAllCells();
  }

  private redrawCell(r: number, c: number): void {
    const g = this.cellGfx[r][c];
    g.clear();
    const tile = this.tiles[r][c];
    if (!tile) {
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 8);
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 8);
      return;
    }
    const gridTile: GridTile = {
      kind: tile.kind,
      color: tile.color,
      size: tile.size ?? "medium",
      marblesLeft: DEFAULT_MARBLES_PER_BLOCK,
      counter: tile.counter,
      revealed: tile.kind === "mystery" ? false : undefined,
      unlocked: tile.kind === "locked" ? false : undefined,
    };
    drawTile(g, CELL, gridTile, DEFAULT_MARBLES_PER_BLOCK, TILE_SIZE_SCALE[gridTile.size]);
  }

  private redrawAllCells(): void {
    for (let r = 0; r < EDITOR_ROWS; r++) {
      for (let c = 0; c < EDITOR_COLS; c++) {
        this.redrawCell(r, c);
      }
    }
  }

  private applyPaint(r: number, c: number): void {
    if (this.mode.kind === "erase") {
      this.tiles[r][c] = null;
    } else {
      this.tiles[r][c] = {
        kind: this.mode.kind,
        color: this.mode.color,
        counter: this.mode.kind === "counter" ? (this.mode.counter ?? 2) : undefined,
        size: this.mode.size,
      };
    }
    this.redrawCell(r, c);
    this.updateMysteryCounter();
  }

  // ─────────── PALETTE ───────────
  private buildPalette(): void {
    const top = 380;
    this.add
      .text(GAME_WIDTH / 2, top, "PAINT", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "12px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);

    // Tile-kind row
    const kinds: { label: string; mode: PaintMode }[] = [
      { label: "Block", mode: { kind: "block", color: this.mode.color } },
      { label: "Small", mode: { kind: "block", color: this.mode.color, size: "small" } },
      { label: "?", mode: { kind: "mystery", color: this.mode.color } },
      { label: "C2", mode: { kind: "counter", color: this.mode.color, counter: 2 } },
      { label: "C3", mode: { kind: "counter", color: this.mode.color, counter: 3 } },
      { label: "🔒", mode: { kind: "locked", color: this.mode.color } },
      { label: "✕", mode: { kind: "erase", color: this.mode.color } },
    ];
    const buttonW = 56;
    const totalW = kinds.length * buttonW + (kinds.length - 1) * 8;
    const startX = (GAME_WIDTH - totalW) / 2 + buttonW / 2;
    kinds.forEach((k, i) => {
      const x = startX + i * (buttonW + 8);
      this.makePaletteButton(x, top + 30, k.label, () => {
        this.mode = { ...k.mode, color: this.mode.color };
        this.updateModeText();
      });
    });

    // Color row
    const cTop = top + 75;
    this.add
      .text(GAME_WIDTH / 2, cTop, "COLOR", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "12px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);
    const colors: MarbleColor[] = ["red", "blue", "green", "yellow", "purple", "orange"];
    const cw = colors.length * 36 + (colors.length - 1) * 6;
    const cx = (GAME_WIDTH - cw) / 2 + 18;
    colors.forEach((color, i) => {
      const x = cx + i * (36 + 6);
      const cb = this.add.container(x, cTop + 30);
      const g = this.add.graphics();
      g.fillStyle(MARBLE_COLORS[color], 1);
      g.fillCircle(0, 0, 16);
      g.lineStyle(2, 0xffffff, 0.7);
      g.strokeCircle(0, 0, 16);
      cb.add(g);
      cb.setSize(36, 36);
      cb.setInteractive({ useHandCursor: true });
      cb.on("pointerdown", () => {
        this.mode = { ...this.mode, color };
        this.updateModeText();
      });
    });

    // Mode display
    this.modeText = this.add
      .text(GAME_WIDTH / 2, cTop + 65, "", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "13px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);
    this.updateModeText();
  }

  private updateModeText(): void {
    const m = this.mode;
    let label: string;
    if (m.kind === "erase") label = "Erase";
    else if (m.kind === "counter") label = `Counter-${m.counter} ${m.color}`;
    else if (m.kind === "mystery") label = `Mystery (hidden ${m.color})`;
    else if (m.kind === "locked") label = `Locked ${m.color}`;
    else label = m.size ? `${m.size} ${m.color} block` : `${m.color} block`;
    this.modeText.setText(`Brush: ${label}`);
  }

  private makePaletteButton(
    x: number,
    y: number,
    label: string,
    cb: () => void,
  ): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(-22, -18, 44, 36, 8);
    g.lineStyle(2, 0x5e2e91, 1);
    g.strokeRoundedRect(-22, -18, 44, 36, 8);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "13px",
        color: "#5e2e91",
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(44, 36);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }

  // ─────────── MYSTERY MMC COUNTER ───────────
  private updateMysteryCounter(): void {
    const mmcs = this.generateAutoLanes();
    let totalMMCs = 0;

    for (const tube of mmcs) {
      totalMMCs += tube.mmcs?.length ?? 0;
    }

    this.maxMysteryMMCs = totalMMCs;
    this.mysteryMMCCount = Math.min(this.mysteryMMCCount, this.maxMysteryMMCs);

    this.mysteryMMCCounter.setText(
      `Mystery: ${this.mysteryMMCCount}/${this.maxMysteryMMCs}`,
    );
  }

  private adjustMysteryCount(delta: number): void {
    this.mysteryMMCCount = Math.max(
      0,
      Math.min(this.mysteryMMCCount + delta, this.maxMysteryMMCs),
    );
    this.mysteryMMCCounter.setText(
      `Mystery: ${this.mysteryMMCCount}/${this.maxMysteryMMCs}`,
    );
  }

  // ─────────── AUTO LANE GENERATION ───────────
  private generateAutoLanes(): TubeSpec[] {
    // Collect all unique colors from tiles
    const colors = new Set<string>();
    for (let r = 0; r < EDITOR_ROWS; r++) {
      for (let c = 0; c < EDITOR_COLS; c++) {
        const tile = this.tiles[r][c];
        if (tile && tile.kind !== "erase") {
          colors.add(tile.color);
        }
      }
    }

    const colorArray = Array.from(colors).sort();
    const allMMCs: { color: string; holes: HoleSpec[] }[] = [];

    // Build per-color MMCs — each color's marbles go into separate MMCs
    for (const color of colorArray) {
      const colorHoles: HoleSpec[] = [];

      // Collect all holes of this color
      for (let r = 0; r < EDITOR_ROWS; r++) {
        for (let c = 0; c < EDITOR_COLS; c++) {
          const tile = this.tiles[r][c];
          if (!tile || tile.kind === "erase" || tile.color !== color) continue;
          const size = tile.size ?? "medium";
          for (let k = 0; k < DEFAULT_MARBLES_PER_BLOCK; k++) {
            colorHoles.push({ color, size });
          }
        }
      }

      // Fisher–Yates shuffle within this color's pool
      for (let i = colorHoles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [colorHoles[i], colorHoles[j]] = [colorHoles[j], colorHoles[i]];
      }

      // Group into MMCs of capacity 3
      for (let i = 0; i + 3 <= colorHoles.length; i += 3) {
        allMMCs.push({
          color,
          holes: colorHoles.slice(i, i + 3),
        });
      }
    }

    // Fisher–Yates shuffle all MMCs to randomize across lanes
    for (let i = allMMCs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allMMCs[i], allMMCs[j]] = [allMMCs[j], allMMCs[i]];
    }

    // Randomly select which MMCs to mark as hidden/mystery
    const hiddenIndices = new Set<number>();
    if (this.mysteryMMCCount > 0 && allMMCs.length > 0) {
      const indices = Array.from({ length: allMMCs.length }, (_, i) => i);
      // Fisher–Yates shuffle, then take first mysteryMMCCount
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      // Mark the first N indices as hidden
      for (let k = 0; k < Math.min(this.mysteryMMCCount, allMMCs.length); k++) {
        hiddenIndices.add(indices[k]);
      }
    }

    // Deal MMCs round-robin across 3 lanes
    const laneQueues: { color: string; holes: HoleSpec[]; hidden: boolean }[][] = [[], [], []];
    allMMCs.forEach((mmc, idx) => {
      laneQueues[idx % 3].push({
        color: mmc.color,
        holes: mmc.holes,
        hidden: hiddenIndices.has(idx),
      });
    });

    // Build tubes — tube color is determined by head MMC of each lane
    const tubes: TubeSpec[] = [];
    for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
      const mmcs: MMCSpec[] = laneQueues[laneIdx].map((mmc) => ({
        holes: mmc.holes,
        hidden: mmc.hidden,
      }));
      const headColor = laneQueues[laneIdx][0]?.color ?? "red";
      tubes.push({
        color: headColor,
        capacity: 3,
        mmcs,
      });
    }

    return tubes;
  }

  // ─────────── ACTIONS ───────────
  private buildLevelDef(): LevelDef {
    return {
      id: 99,
      name: "Custom",
      cols: EDITOR_COLS,
      rows: EDITOR_ROWS,
      marblesPerBlock: DEFAULT_MARBLES_PER_BLOCK,
      conveyorCapacity: DEFAULT_CONVEYOR_CAPACITY,
      tickMs: DEFAULT_TICK_MS,
      tiles: this.tiles.map((row) =>
        row.map((t) => (t ? { ...t } : null)),
      ),
      tubes: this.generateAutoLanes(),
    };
  }

  private testPlay(): void {
    const level = this.buildLevelDef();
    this.scene.start(SCENE_GAME, { level });
  }

  private async copyJson(): Promise<void> {
    const json = JSON.stringify(this.buildLevelDef(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      this.flashStatus("Copied!");
    } catch {
      // Fallback: dump to console
      console.log("[Marble Sort Level JSON]\n" + json);
      this.flashStatus("Logged to console");
    }
  }

  private flashStatus(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 100, msg, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: GAME_HEIGHT - 130,
      duration: 1400,
      onComplete: () => t.destroy(),
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    cb: () => void,
  ): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-90, -22, 180, 44, 12);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-90, -25, 180, 44, 12);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(-90, -25, 180, 44, 12);
    const t = this.add
      .text(0, -3, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(180, 44);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.05));
    c.on("pointerout", () => c.setScale(1));
  }

  private makeSmallButton(
    x: number,
    y: number,
    label: string,
    color: number,
    cb: () => void,
  ): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(-18, -16, 36, 32, 8);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-18, -18, 36, 32, 8);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(-18, -18, 36, 32, 8);
    const t = this.add
      .text(0, -2, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(36, 32);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }
}
