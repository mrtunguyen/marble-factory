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
  DEFAULT_TUBE_CAPACITY,
} from "../game/constants";
import { drawTile, drawMarble } from "../game/draw";
import type {
  GridTile,
  LevelDef,
  LevelTile,
  MarbleColor,
  TileKind,
  TubeSpec,
} from "../game/types";

interface PaintMode {
  kind: TileKind | "erase";
  color: MarbleColor;
  counter?: number;
}

const EDITOR_COLS = 4;
const EDITOR_ROWS = 4;
const CELL = 56;
const CELL_GAP = 6;

export class EditorScene extends Phaser.Scene {
  private tiles: (LevelTile | null)[][] = [];
  private tubes: TubeSpec[] = [];
  private mode: PaintMode = { kind: "block", color: "red" };
  private gridContainer!: Phaser.GameObjects.Container;
  private cellGfx: Phaser.GameObjects.Graphics[][] = [];
  private modeText!: Phaser.GameObjects.Text;
  private tubesContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("EditorScene");
  }

  create(): void {
    // Reset state on (re-)entry
    this.tiles = Array.from({ length: EDITOR_ROWS }, () =>
      new Array(EDITOR_COLS).fill(null),
    );
    this.tubes = [
      { color: "red", capacity: DEFAULT_TUBE_CAPACITY },
      { color: "blue", capacity: DEFAULT_TUBE_CAPACITY },
      { color: "green", capacity: DEFAULT_TUBE_CAPACITY },
      { color: "yellow", capacity: DEFAULT_TUBE_CAPACITY },
    ];
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

    // Tubes editor
    this.buildTubesEditor();

    // Action buttons
    this.makeButton(GAME_WIDTH / 2 - 105, GAME_HEIGHT - 60, "TEST PLAY", 0x6dd35f, () =>
      this.testPlay(),
    );
    this.makeButton(GAME_WIDTH / 2 + 105, GAME_HEIGHT - 60, "COPY JSON", 0x49b9ff, () =>
      this.copyJson(),
    );
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
      marblesLeft: DEFAULT_MARBLES_PER_BLOCK,
      counter: tile.counter,
      revealed: tile.kind === "mystery" ? false : undefined,
      unlocked: tile.kind === "locked" ? false : undefined,
    };
    drawTile(g, CELL, gridTile);
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
      };
    }
    this.redrawCell(r, c);
  }

  // ─────────── PALETTE ───────────
  private buildPalette(): void {
    const top = 405;
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
    else label = `${m.color} block`;
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

  // ─────────── TUBES EDITOR ───────────
  private buildTubesEditor(): void {
    const top = 625;
    this.add
      .text(GAME_WIDTH / 2, top, "TUBES (tap to cycle color, +/- to add/remove)", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "11px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);

    this.tubesContainer = this.add.container(0, top + 30);
    this.redrawTubes();

    // Add / remove tubes
    this.makePaletteButton(GAME_WIDTH / 2 - 44, top + 100, "+ tube", () => {
      if (this.tubes.length < 6) {
        this.tubes.push({ color: "red", capacity: DEFAULT_TUBE_CAPACITY });
        this.redrawTubes();
      }
    });
    this.makePaletteButton(GAME_WIDTH / 2 + 44, top + 100, "- tube", () => {
      if (this.tubes.length > 1) {
        this.tubes.pop();
        this.redrawTubes();
      }
    });
  }

  private redrawTubes(): void {
    this.tubesContainer.removeAll(true);
    const n = this.tubes.length;
    const slot = 56;
    const totalW = n * slot + (n - 1) * 6;
    const startX = (GAME_WIDTH - totalW) / 2 + slot / 2;
    this.tubes.forEach((tube, i) => {
      const x = startX + i * (slot + 6);
      const c = this.add.container(x, 0);
      const g = this.add.graphics();
      g.fillStyle(MARBLE_COLORS[tube.color], 1);
      g.fillRoundedRect(-22, -16, 44, 32, 8);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(-22, -16, 44, 32, 8);
      c.add(g);

      const mg = this.add.graphics();
      drawMarble(mg, 16, tube.color);
      mg.y = 0;
      c.add(mg);

      const lbl = this.add
        .text(0, 28, `cap ${tube.capacity}`, {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      c.add(lbl);

      c.setSize(44, 32);
      c.setInteractive({ useHandCursor: true });
      c.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          // cycle capacity 3 → 6 → 9 → 12
          tube.capacity =
            tube.capacity === DEFAULT_TUBE_CAPACITY ? 3 : tube.capacity + 3;
        } else {
          // cycle color
          const idx = ALL_COLORS.indexOf(tube.color);
          tube.color = ALL_COLORS[(idx + 1) % ALL_COLORS.length];
        }
        this.redrawTubes();
      });

      this.tubesContainer.add(c);
    });
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
      tubes: this.tubes.map((t) => ({ ...t })),
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
}
