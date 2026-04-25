import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BLOCK_SIZE,
  BLOCK_GAP,
  TRAY_SLOT_SIZE,
  TRAY_GAP,
  TRAY_HEIGHT,
  SCENE_MENU,
  SCENE_COMPLETE,
  SCENE_GAMEOVER,
  TRAY_ANIM_MS,
  MATCH_ANIM_MS,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_GRID_BG,
  UI_TRAY_BG,
  UI_TRAY_BORDER,
  UI_TEXT_DARK,
  UI_TEXT_LIGHT,
  UI_ACCENT,
  BLOCK_COLORS,
  ALL_COLORS,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import {
  buildGameState,
  tapCell,
  findMatch,
  clearMatch,
  isGridEmpty,
  isLost,
  snapshot,
  restoreSnapshot,
} from "../game/logic";
import type { Block, BlockColor, GameState, LevelDef } from "../game/types";
import { drawBlock, drawMarble, drawTrayPipe } from "../game/draw";

interface CellSprite {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  text?: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Graphics;
}

interface TraySprite {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  block: Block;
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private level!: LevelDef;
  private cellSprites: (CellSprite | null)[][] = [];
  private traySprites: TraySprite[] = [];
  private collectedTexts: Map<BlockColor, Phaser.GameObjects.Text> = new Map();
  private collectedColumns: Map<BlockColor, Phaser.GameObjects.Container> =
    new Map();
  private isAnimating = false;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private trayY = 0;
  private trayCenterX = 0;
  private trayInnerWidth = 0;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  init(data: { levelId: number }): void {
    const id = data?.levelId ?? 1;
    const found = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
    this.level = found;
    this.state = buildGameState(found);
    this.cellSprites = [];
    this.traySprites = [];
    this.collectedTexts = new Map();
    this.collectedColumns = new Map();
    this.isAnimating = false;
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Top bar
    this.drawTopBar();

    // Grid background panel
    this.drawGridPanel();

    // Build grid sprites
    this.buildGrid();

    // Tray
    this.buildTray();

    // Collected (marble columns at bottom)
    this.buildCollected();

    // Status text
    this.statusText = this.add
      .text(GAME_WIDTH / 2, this.trayY - 20, "", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  // ------------- TOP BAR (back, level name, undo, restart) -------------
  private drawTopBar(): void {
    const barH = 60;
    const barG = this.add.graphics();
    barG.fillStyle(0x4a328a, 0.4);
    barG.fillRect(0, 0, GAME_WIDTH, barH);

    // Back button
    this.makeIconButton(36, barH / 2, "<", () => {
      this.scene.start(SCENE_MENU);
    });

    // Level name
    this.add
      .text(GAME_WIDTH / 2, barH / 2, `Level ${this.level.id} — ${this.level.name}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Undo button
    this.makeIconButton(GAME_WIDTH - 88, barH / 2, "↶", () => {
      this.handleUndo();
    });

    // Restart button
    this.makeIconButton(GAME_WIDTH - 36, barH / 2, "↻", () => {
      this.handleRestart();
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
    c.on("pointerdown", () => {
      if (!this.isAnimating) cb();
    });
    c.on("pointerover", () => c.setScale(1.1));
    c.on("pointerout", () => c.setScale(1));
  }

  // ------------- GRID PANEL -------------
  private drawGridPanel(): void {
    const panelW = this.level.cols * BLOCK_SIZE + (this.level.cols - 1) * BLOCK_GAP + 36;
    const panelH = this.level.rows * BLOCK_SIZE + (this.level.rows - 1) * BLOCK_GAP + 36;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = 80;

    const g = this.add.graphics();
    // Outer panel
    g.fillStyle(0x4a328a, 0.5);
    g.fillRoundedRect(panelX - 6, panelY - 6, panelW + 12, panelH + 12, 28);
    g.fillStyle(UI_GRID_BG, 1);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 22);

    this.gridOffsetX = panelX + 18 + BLOCK_SIZE / 2;
    this.gridOffsetY = panelY + 18 + BLOCK_SIZE / 2;
  }

  // ------------- GRID -------------
  private buildGrid(): void {
    this.cellSprites = [];
    for (let r = 0; r < this.state.rows; r++) {
      const row: (CellSprite | null)[] = [];
      for (let c = 0; c < this.state.cols; c++) {
        const block = this.state.cells[r][c];
        if (!block) {
          row.push(null);
          continue;
        }
        const spr = this.makeCellSprite(r, c, block);
        row.push(spr);
      }
      this.cellSprites.push(row);
    }
  }

  private cellPos(r: number, c: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + c * (BLOCK_SIZE + BLOCK_GAP),
      y: this.gridOffsetY + r * (BLOCK_SIZE + BLOCK_GAP),
    };
  }

  private makeCellSprite(r: number, c: number, block: Block): CellSprite {
    const { x, y } = this.cellPos(r, c);
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    drawBlock(graphics, BLOCK_SIZE, block);
    container.add(graphics);

    let text: Phaser.GameObjects.Text | undefined;
    let badge: Phaser.GameObjects.Graphics | undefined;

    if (block.kind === "mystery") {
      text = this.add
        .text(0, 0, "?", {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "32px",
          color: "#ffffff",
          stroke: "#444444",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      container.add(text);
    } else if (block.kind === "counter" && block.counter) {
      // Dark badge across middle
      badge = this.add.graphics();
      badge.fillStyle(0x1a1a2e, 0.75);
      badge.fillRoundedRect(-BLOCK_SIZE / 2 + 4, -10, BLOCK_SIZE - 8, 20, 6);
      container.add(badge);
      text = this.add
        .text(0, 0, `${block.counter}`, {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      container.add(text);
    }

    container.setSize(BLOCK_SIZE, BLOCK_SIZE);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", () => this.handleCellTap(r, c));
    container.on("pointerover", () => {
      if (!this.isAnimating) container.setScale(1.05);
    });
    container.on("pointerout", () => container.setScale(1));

    return { container, graphics, text, badge };
  }

  private redrawCell(r: number, c: number): void {
    const block = this.state.cells[r][c];
    const old = this.cellSprites[r][c];
    if (old) {
      old.container.destroy();
      this.cellSprites[r][c] = null;
    }
    if (block) {
      this.cellSprites[r][c] = this.makeCellSprite(r, c, block);
    }
  }

  // ------------- TRAY -------------
  private buildTray(): void {
    const cap = this.state.trayCapacity;
    const innerW = cap * TRAY_SLOT_SIZE + (cap - 1) * TRAY_GAP + 24;
    const innerH = TRAY_HEIGHT;
    const x = (GAME_WIDTH - innerW) / 2;
    const y = 80 + this.level.rows * BLOCK_SIZE + (this.level.rows - 1) * BLOCK_GAP + 80;

    this.trayY = y;
    this.trayCenterX = x + innerW / 2;
    this.trayInnerWidth = innerW;

    // Pipe-style background
    const g = this.add.graphics();
    drawTrayPipe(g, x, y, innerW, innerH, UI_TRAY_BG, UI_TRAY_BORDER);

    // Slot indicators (faint dots)
    for (let i = 0; i < cap; i++) {
      const sx = this.traySlotX(i);
      g.fillStyle(0x000000, 0.05);
      g.fillCircle(sx, y + innerH / 2, TRAY_SLOT_SIZE / 2 - 4);
    }
  }

  private traySlotX(idx: number): number {
    const cap = this.state.trayCapacity;
    const innerW = cap * TRAY_SLOT_SIZE + (cap - 1) * TRAY_GAP + 24;
    const startX = (GAME_WIDTH - innerW) / 2 + 12 + TRAY_SLOT_SIZE / 2;
    return startX + idx * (TRAY_SLOT_SIZE + TRAY_GAP);
  }

  // ------------- COLLECTED MARBLES -------------
  private buildCollected(): void {
    // Row of color stacks at the bottom showing collected marbles per color
    const colors = this.gridColors();
    const numCols = colors.length;
    const colW = 50;
    const gap = 8;
    const totalW = numCols * colW + (numCols - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + colW / 2;
    const y = GAME_HEIGHT - 90;

    // Panel background
    const panelG = this.add.graphics();
    panelG.fillStyle(0x4a328a, 0.4);
    panelG.fillRoundedRect(20, y - 50, GAME_WIDTH - 40, 120, 20);

    this.add
      .text(GAME_WIDTH / 2, y - 35, "COLLECTED", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "12px",
        color: "#e8def8",
      })
      .setOrigin(0.5);

    colors.forEach((color, i) => {
      const x = startX + i * (colW + gap);
      const c = this.add.container(x, y);

      const bg = this.add.graphics();
      bg.fillStyle(BLOCK_COLORS[color], 0.25);
      bg.fillRoundedRect(-colW / 2, -10, colW, 60, 10);
      bg.lineStyle(2, BLOCK_COLORS[color], 0.6);
      bg.strokeRoundedRect(-colW / 2, -10, colW, 60, 10);

      const marbleG = this.add.graphics();
      drawMarble(marbleG, 22, color);
      marbleG.y = 8;

      const txt = this.add
        .text(0, 36, "0", {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          stroke: "#5e2e91",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      c.add([bg, marbleG, txt]);
      this.collectedTexts.set(color, txt);
      this.collectedColumns.set(color, c);
    });
  }

  private gridColors(): BlockColor[] {
    // All distinct colors that appear in the level (treat mystery as "all")
    const set = new Set<BlockColor>();
    for (const row of this.level.grid) {
      for (let c = 0; c < this.level.cols; c++) {
        const tok = row.slice(c * 2, c * 2 + 2);
        if (!tok || tok === "..") continue;
        const colorChar = tok[0];
        const kindChar = tok[1];
        const map: Record<string, BlockColor> = {
          r: "red", b: "blue", g: "green", y: "yellow",
          p: "purple", o: "orange", k: "pink", c: "cyan",
        };
        const color = map[colorChar];
        if (color && kindChar !== "m") set.add(color);
      }
    }
    if (set.size === 0) return ALL_COLORS.slice(0, 4);
    return [...set];
  }

  // ------------- INTERACTION -------------
  private handleCellTap(r: number, c: number): void {
    if (this.isAnimating || this.state.status !== "playing") return;
    const cell = this.state.cells[r][c];
    if (!cell) return;

    // Snapshot for undo BEFORE mutation
    const snap = snapshot(this.state);

    const result = tapCell(this.state, r, c);

    if (!result.movedToTray) {
      // Counter decremented or tray full
      if (this.state.tray.length >= this.state.trayCapacity && cell.kind !== "counter") {
        this.flashStatus("Tray full!");
        return;
      }
      // Update visual for counter decrement
      this.redrawCell(r, c);
      this.tweens.add({
        targets: this.cellSprites[r][c]?.container,
        scale: { from: 1.1, to: 1 },
        duration: 150,
        ease: "Back.out",
      });
      this.state.history.push(snap);
      return;
    }

    // Block moved to tray — animate
    this.state.history.push(snap);
    this.isAnimating = true;
    this.animateBlockToTray(r, c, result.block!);
  }

  private animateBlockToTray(r: number, c: number, block: Block): void {
    const sprite = this.cellSprites[r][c];
    // Note: state.cells[r][c] is already null, but sprite still exists
    const startContainer = sprite?.container;
    if (!sprite || !startContainer) {
      this.isAnimating = false;
      this.checkResolutions();
      return;
    }
    this.cellSprites[r][c] = null;

    // Find tray index where this block was inserted
    const trayIdx = this.findInsertedTrayIndex(block);

    // Create a temporary "flying" sprite styled like the resolved block
    const flyG = this.add.graphics();
    drawBlock(flyG, BLOCK_SIZE, block);
    const fly = this.add.container(startContainer.x, startContainer.y, [flyG]);
    fly.setScale(1);
    startContainer.destroy();

    const targetX = this.traySlotX(trayIdx);
    const targetY = this.trayY + TRAY_HEIGHT / 2;
    const targetScale = TRAY_SLOT_SIZE / BLOCK_SIZE;

    this.tweens.add({
      targets: fly,
      x: targetX,
      y: targetY,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: TRAY_ANIM_MS,
      ease: "Cubic.in",
      onComplete: () => {
        fly.destroy();
        this.rebuildTraySprites();
        this.checkResolutions();
      },
    });
  }

  private findInsertedTrayIndex(block: Block): number {
    // Walk from the right; the inserted block is the rightmost of its color.
    for (let i = this.state.tray.length - 1; i >= 0; i--) {
      if (this.state.tray[i].color === block.color) return i;
    }
    return this.state.tray.length - 1;
  }

  private rebuildTraySprites(): void {
    // Clear old
    for (const s of this.traySprites) s.container.destroy();
    this.traySprites = [];

    const targetY = this.trayY + TRAY_HEIGHT / 2;
    const targetScale = TRAY_SLOT_SIZE / BLOCK_SIZE;
    this.state.tray.forEach((b, idx) => {
      const g = this.add.graphics();
      drawBlock(g, BLOCK_SIZE, b);
      const c = this.add.container(this.traySlotX(idx), targetY, [g]);
      c.setScale(targetScale);
      this.traySprites.push({ container: c, graphics: g, block: b });
    });
  }

  private checkResolutions(): void {
    const match = findMatch(this.state.tray);
    if (match) {
      this.animateMatchClear(match);
      return;
    }

    // No match — finalize turn
    this.isAnimating = false;
    if (isGridEmpty(this.state)) {
      this.state.status = "won";
      this.time.delayedCall(300, () => {
        this.scene.start(SCENE_COMPLETE, { levelId: this.level.id });
      });
      return;
    }
    if (isLost(this.state)) {
      this.state.status = "lost";
      this.time.delayedCall(300, () => {
        this.scene.start(SCENE_GAMEOVER, { levelId: this.level.id });
      });
    }
  }

  private animateMatchClear(match: { start: number; length: number }): void {
    const color = this.state.tray[match.start].color;
    const sprites = this.traySprites.slice(match.start, match.start + match.length);

    // Pop animation
    sprites.forEach((s, i) => {
      this.tweens.add({
        targets: s.container,
        scale: { from: TRAY_SLOT_SIZE / BLOCK_SIZE, to: (TRAY_SLOT_SIZE / BLOCK_SIZE) * 1.3 },
        alpha: { from: 1, to: 0 },
        duration: MATCH_ANIM_MS,
        delay: i * 50,
        ease: "Back.in",
      });
    });

    // After pop, send marbles to collected column
    this.time.delayedCall(MATCH_ANIM_MS + match.length * 50, () => {
      // Update logic state
      clearMatch(this.state, match);
      // Animate marbles flying to collected column
      const targetCol = this.collectedColumns.get(color);
      if (targetCol) {
        sprites.forEach((s, i) => {
          const marbleG = this.add.graphics();
          drawMarble(marbleG, 18, color);
          const m = this.add.container(s.container.x, s.container.y, [marbleG]);
          this.tweens.add({
            targets: m,
            x: targetCol.x,
            y: targetCol.y + 8,
            scale: 0.7,
            duration: 360,
            delay: i * 40,
            ease: "Cubic.in",
            onComplete: () => {
              m.destroy();
            },
          });
        });
      }
      this.time.delayedCall(360 + match.length * 40, () => {
        this.rebuildTraySprites();
        this.updateCollectedTexts();
        // Recurse — there may be cascading matches (rare, but safe)
        this.checkResolutions();
      });
    });
  }

  private updateCollectedTexts(): void {
    for (const [color, txt] of this.collectedTexts.entries()) {
      txt.setText(`${this.state.collected[color]}`);
    }
  }

  private flashStatus(msg: string): void {
    this.statusText.setText(msg);
    this.statusText.setAlpha(1);
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 1200,
      delay: 400,
    });
  }

  // ------------- UNDO / RESTART -------------
  private handleUndo(): void {
    if (this.state.history.length === 0) {
      this.flashStatus("Nothing to undo");
      return;
    }
    const snap = this.state.history.pop()!;
    restoreSnapshot(this.state, snap);
    this.rebuildAllSprites();
  }

  private handleRestart(): void {
    this.state = buildGameState(this.level);
    this.rebuildAllSprites();
  }

  private rebuildAllSprites(): void {
    // Wipe existing
    for (const row of this.cellSprites) {
      for (const s of row) {
        if (s) s.container.destroy();
      }
    }
    this.cellSprites = [];
    for (const s of this.traySprites) s.container.destroy();
    this.traySprites = [];

    this.buildGrid();
    this.rebuildTraySprites();
    this.updateCollectedTexts();
    this.statusText.setText("");
    this.isAnimating = false;
  }
}
