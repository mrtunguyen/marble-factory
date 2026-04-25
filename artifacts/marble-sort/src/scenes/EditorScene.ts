import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCK_SIZE,
  BLOCK_GAP,
  SCENE_MENU,
  SCENE_GAME,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_GRID_BG,
  BLOCK_COLORS,
  ALL_COLORS,
} from "../game/constants";
import { drawBlock } from "../game/draw";
import type { BlockColor, BlockKind, Cell, LevelDef } from "../game/types";
import { LEVELS } from "../game/levels";
import { buildGameState, isLost } from "../game/logic";

const COLOR_TO_CHAR: Record<BlockColor, string> = {
  red: "r", blue: "b", green: "g", yellow: "y",
  purple: "p", orange: "o", pink: "k", cyan: "c",
};

const KIND_TO_CHAR: Record<BlockKind, string> = {
  normal: "n",
  mystery: "m",
  counter: "3",
};

export class EditorScene extends Phaser.Scene {
  private cols = 4;
  private rows = 4;
  private cells: Cell[][] = [];
  private spriteRefs: (Phaser.GameObjects.Container | null)[][] = [];
  private currentColor: BlockColor = "red";
  private currentKind: BlockKind = "normal";
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private statusText!: Phaser.GameObjects.Text;
  private exportText!: Phaser.GameObjects.Text;

  constructor() {
    super("EditorScene");
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Top bar
    const barG = this.add.graphics();
    barG.fillStyle(0x4a328a, 0.4);
    barG.fillRect(0, 0, GAME_WIDTH, 60);
    this.makeIconButton(36, 30, "<", () => this.scene.start(SCENE_MENU));
    this.add
      .text(GAME_WIDTH / 2, 30, "LEVEL EDITOR", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Init cells
    this.initCells();
    this.drawGridPanel();
    this.buildSprites();

    // Color palette
    this.add
      .text(20, 460, "Color:", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 2,
      });
    ALL_COLORS.forEach((color, i) => {
      const x = 90 + i * 48;
      const y = 470;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(BLOCK_COLORS[color], 1);
      g.fillRoundedRect(-18, -18, 36, 36, 8);
      g.lineStyle(3, 0xffffff, 0.7);
      g.strokeRoundedRect(-18, -18, 36, 36, 8);
      c.add(g);
      c.setSize(36, 36);
      c.setInteractive({ useHandCursor: true });
      c.on("pointerdown", () => {
        this.currentColor = color;
        this.currentKind = "normal";
        this.flashStatus(`Color: ${color}`);
      });
      c.on("pointerover", () => c.setScale(1.1));
      c.on("pointerout", () => c.setScale(1));
    });

    // Kind buttons
    this.add
      .text(20, 510, "Kind:", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 2,
      });
    const kinds: { kind: BlockKind; label: string }[] = [
      { kind: "normal", label: "■" },
      { kind: "mystery", label: "?" },
      { kind: "counter", label: "3" },
    ];
    kinds.forEach((k, i) => {
      const x = 90 + i * 48;
      const y = 520;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.85);
      g.fillRoundedRect(-18, -18, 36, 36, 8);
      g.lineStyle(2, 0x5e2e91, 1);
      g.strokeRoundedRect(-18, -18, 36, 36, 8);
      c.add(g);
      const t = this.add
        .text(0, 0, k.label, {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "20px",
          color: "#5e2e91",
        })
        .setOrigin(0.5);
      c.add(t);
      c.setSize(36, 36);
      c.setInteractive({ useHandCursor: true });
      c.on("pointerdown", () => {
        this.currentKind = k.kind;
        this.flashStatus(`Kind: ${k.kind}`);
      });
      c.on("pointerover", () => c.setScale(1.1));
      c.on("pointerout", () => c.setScale(1));
    });

    // Action buttons
    this.makeButton(GAME_WIDTH / 2 - 130, 580, "CLEAR", 0xff5b6e, () => {
      this.initCells();
      this.rebuildSprites();
    });
    this.makeButton(GAME_WIDTH / 2 + 130, 580, "TEST", 0x6dd35f, () => {
      this.testLevel();
    });
    this.makeButton(GAME_WIDTH / 2, 640, "COPY JSON", 0x49b9ff, () => {
      this.exportLevel();
    });

    // Status / instructions
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 700, "Left click = place • Right click = erase", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#e8def8",
      })
      .setOrigin(0.5);

    this.exportText = this.add
      .text(GAME_WIDTH / 2, 730, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5, 0);

    // Disable browser context menu on right click
    this.input.mouse?.disableContextMenu();
  }

  private initCells(): void {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) row.push(null);
      this.cells.push(row);
    }
  }

  private drawGridPanel(): void {
    const panelW = this.cols * BLOCK_SIZE + (this.cols - 1) * BLOCK_GAP + 36;
    const panelH = this.rows * BLOCK_SIZE + (this.rows - 1) * BLOCK_GAP + 36;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = 100;
    const g = this.add.graphics();
    g.fillStyle(0x4a328a, 0.5);
    g.fillRoundedRect(panelX - 6, panelY - 6, panelW + 12, panelH + 12, 28);
    g.fillStyle(UI_GRID_BG, 1);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 22);

    this.gridOffsetX = panelX + 18 + BLOCK_SIZE / 2;
    this.gridOffsetY = panelY + 18 + BLOCK_SIZE / 2;
  }

  private cellPos(r: number, c: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + c * (BLOCK_SIZE + BLOCK_GAP),
      y: this.gridOffsetY + r * (BLOCK_SIZE + BLOCK_GAP),
    };
  }

  private buildSprites(): void {
    this.spriteRefs = [];
    for (let r = 0; r < this.rows; r++) {
      const row: (Phaser.GameObjects.Container | null)[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(this.makeCellInteract(r, c));
      }
      this.spriteRefs.push(row);
    }
  }

  private makeCellInteract(r: number, c: number): Phaser.GameObjects.Container {
    const { x, y } = this.cellPos(r, c);
    const container = this.add.container(x, y);

    // Empty cell hint (subtle outline)
    const hint = this.add.graphics();
    hint.fillStyle(0xffffff, 0.08);
    hint.fillRoundedRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE, 12);
    container.add(hint);

    const cell = this.cells[r][c];
    if (cell) {
      const g = this.add.graphics();
      drawBlock(g, BLOCK_SIZE, cell);
      container.add(g);
      if (cell.kind === "mystery") {
        const t = this.add
          .text(0, 0, "?", {
            fontFamily: "Arial Black, sans-serif",
            fontSize: "32px",
            color: "#ffffff",
            stroke: "#444444",
            strokeThickness: 5,
          })
          .setOrigin(0.5);
        container.add(t);
      } else if (cell.kind === "counter" && cell.counter) {
        const badge = this.add.graphics();
        badge.fillStyle(0x1a1a2e, 0.75);
        badge.fillRoundedRect(-BLOCK_SIZE / 2 + 4, -10, BLOCK_SIZE - 8, 20, 6);
        container.add(badge);
        const t = this.add
          .text(0, 0, `${cell.counter}`, {
            fontFamily: "Arial Black, sans-serif",
            fontSize: "20px",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        container.add(t);
      }
    }

    container.setSize(BLOCK_SIZE, BLOCK_SIZE);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cells[r][c] = null;
      } else {
        if (this.currentKind === "counter") {
          this.cells[r][c] = { color: this.currentColor, kind: "counter", counter: 3 };
        } else if (this.currentKind === "mystery") {
          this.cells[r][c] = { color: this.currentColor, kind: "mystery" };
        } else {
          this.cells[r][c] = { color: this.currentColor, kind: "normal" };
        }
      }
      this.rebuildCell(r, c);
    });
    return container;
  }

  private rebuildCell(r: number, c: number): void {
    const old = this.spriteRefs[r][c];
    if (old) old.destroy();
    this.spriteRefs[r][c] = this.makeCellInteract(r, c);
  }

  private rebuildSprites(): void {
    for (const row of this.spriteRefs) {
      for (const s of row) if (s) s.destroy();
    }
    this.buildSprites();
  }

  private serializeCells(): string[] {
    const out: string[] = [];
    for (let r = 0; r < this.rows; r++) {
      let row = "";
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell) {
          row += "..";
        } else if (cell.kind === "mystery") {
          row += "?m";
        } else if (cell.kind === "counter") {
          const k = cell.counter === 2 ? "2" : "3";
          row += COLOR_TO_CHAR[cell.color] + k;
        } else {
          row += COLOR_TO_CHAR[cell.color] + "n";
        }
      }
      out.push(row);
    }
    return out;
  }

  private exportLevel(): void {
    const def: LevelDef = {
      id: 99,
      name: "Custom",
      cols: this.cols,
      rows: this.rows,
      trayCapacity: 7,
      grid: this.serializeCells(),
    };
    const json = JSON.stringify(def, null, 2);
    // Try clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => this.flashStatus("Copied JSON to clipboard!"),
        () => this.exportText.setText(json)
      );
    } else {
      this.exportText.setText(json);
    }
    this.exportText.setText(json);
  }

  private testLevel(): void {
    const def: LevelDef = {
      id: 99,
      name: "Custom",
      cols: this.cols,
      rows: this.rows,
      trayCapacity: 7,
      grid: this.serializeCells(),
    };
    // Inject as last level temporarily and start
    const i = LEVELS.findIndex((l) => l.id === 99);
    if (i >= 0) LEVELS.splice(i, 1);
    LEVELS.push(def);
    this.scene.start(SCENE_GAME, { levelId: 99 });
  }

  private flashStatus(msg: string): void {
    this.statusText.setText(msg);
    this.statusText.setAlpha(1);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0.6,
      duration: 1500,
      delay: 600,
    });
  }

  private makeIconButton(x: number, y: number, label: string, cb: () => void): void {
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
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.1));
    c.on("pointerout", () => c.setScale(1));
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(-90, -22, 180, 44, 12);
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeRoundedRect(-90, -22, 180, 44, 12);
    const t = this.add
      .text(0, 0, label, {
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
