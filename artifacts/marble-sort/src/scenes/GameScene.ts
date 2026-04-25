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
  TUBE_MARBLE_DIAMETER,
  TUBE_CAP_HEIGHT,
  TUBE_BOTTOM_HEIGHT,
  TUBE_PADDING,
  MARBLE_ANIM_MS,
  MARBLE_COLORS,
  SCENE_MENU,
  SCENE_COMPLETE,
  SCENE_GAMEOVER,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_GRID_BG,
  UI_PIPE_BG,
  UI_PIPE_BORDER,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import { drawTile, drawMarble, drawConveyorPipe, drawTube } from "../game/draw";
import {
  buildGameState,
  snapshot,
  restoreSnapshot,
  tick,
} from "../game/state";
import { tapTile } from "../game/gridManager";
import type { GameState, GridTile, LevelDef, Marble } from "../game/types";

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
}

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private level!: LevelDef;
  private tileSprites: (TileSprite | null)[][] = [];
  private marbleSprites: Map<number, MarbleSprite> = new Map();
  private isAnimating = false; // blocks taps during snapshot animations
  private lastTickAt = 0;
  private statusText!: Phaser.GameObjects.Text;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private conveyorX = 0; // left edge of inner pipe
  private conveyorY = 0; // top edge of inner pipe
  private conveyorWidth = 0;
  private tubesY = 0; // top of cap row

  constructor() {
    super("GameScene");
  }

  init(data: { levelId?: number; level?: LevelDef }): void {
    if (data?.level) {
      this.level = data.level;
    } else {
      const id = data?.levelId ?? 1;
      const found = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
      this.level = found;
    }
    this.state = buildGameState(this.level);
    this.tileSprites = [];
    this.marbleSprites = new Map();
    this.isAnimating = false;
    this.lastTickAt = 0;
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawTopBar();
    this.drawGridPanel();
    this.buildGrid();
    this.drawConveyor();
    this.drawTubes();

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
    const panelW =
      this.level.cols * TILE_SIZE +
      (this.level.cols - 1) * TILE_GAP +
      36;
    const panelH =
      this.level.rows * TILE_SIZE +
      (this.level.rows - 1) * TILE_GAP +
      36;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = 90;

    const g = this.add.graphics();
    g.fillStyle(0x4a328a, 0.5);
    g.fillRoundedRect(panelX - 6, panelY - 6, panelW + 12, panelH + 12, 28);
    g.fillStyle(UI_GRID_BG, 1);
    g.fillRoundedRect(panelX, panelY, panelW, panelH, 22);

    this.gridOriginX = panelX + 18 + TILE_SIZE / 2;
    this.gridOriginY = panelY + 18 + TILE_SIZE / 2;
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
    drawTile(graphics, TILE_SIZE, tile);
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
    } else {
      // Show remaining-marble dots in the corner for normal/revealed/unlocked.
      const dotsG = this.add.graphics();
      const total = this.state.marblesPerBlock;
      const dotR = 4;
      const startX = -TILE_SIZE / 2 + 8;
      const yPos = TILE_SIZE / 2 - 8;
      for (let i = 0; i < total; i++) {
        const filled = i < tile.marblesLeft;
        dotsG.fillStyle(filled ? 0xffffff : 0x000000, filled ? 0.85 : 0.25);
        dotsG.fillCircle(startX + i * (dotR * 2 + 2), yPos, dotR);
      }
      container.add(dotsG);
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
    const y = 410;
    this.conveyorX = x;
    this.conveyorY = y;
    this.conveyorWidth = innerW;

    // Label
    this.add
      .text(GAME_WIDTH / 2, y - 18, "CONVEYOR", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "11px",
        color: "#e8def8",
      })
      .setOrigin(0.5);

    const g = this.add.graphics();
    drawConveyorPipe(g, x, y, innerW, CONVEYOR_HEIGHT, UI_PIPE_BG, UI_PIPE_BORDER);

    // Slot indicators (faint dots)
    for (let i = 0; i < this.state.conveyor.length; i++) {
      const sx = this.conveyorSlotX(i);
      g.fillStyle(0x000000, 0.05);
      g.fillCircle(sx, y + CONVEYOR_HEIGHT / 2, CONVEYOR_MARBLE_RADIUS - 2);
    }

    // Direction arrow
    g.fillStyle(0x7e57c2, 0.6);
    const ay = y + CONVEYOR_HEIGHT / 2;
    const ax = x + innerW + 2;
    g.fillTriangle(ax, ay - 8, ax, ay + 8, ax + 12, ay);
  }

  private conveyorSlotX(idx: number): number {
    const slotWidth = this.conveyorWidth / this.state.conveyor.length;
    return this.conveyorX + slotWidth * (idx + 0.5);
  }

  private conveyorSlotY(): number {
    return this.conveyorY + CONVEYOR_HEIGHT / 2;
  }

  // Position used to display marbles waiting in the pendingEject queue,
  // stacked just above-left of the conveyor.
  private pendingPos(idx: number): { x: number; y: number } {
    const startX = this.conveyorX + 16;
    return {
      x: startX + idx * (CONVEYOR_MARBLE_RADIUS * 2 + 4),
      y: this.conveyorY - 30,
    };
  }

  // ─────────────────────────── TUBES ───────────────────────────
  private drawTubes(): void {
    const n = this.state.tubes.length;
    const totalW = n * TUBE_WIDTH + (n - 1) * TUBE_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;
    const capacity = Math.max(...this.state.tubes.map((t) => t.capacity));
    const bodyHeight = capacity * TUBE_MARBLE_DIAMETER + TUBE_PADDING * 2;
    const top = 510;
    this.tubesY = top;

    // Panel behind tubes
    const panelG = this.add.graphics();
    const panelH = TUBE_CAP_HEIGHT + bodyHeight + TUBE_BOTTOM_HEIGHT + 30;
    panelG.fillStyle(0x4a328a, 0.4);
    panelG.fillRoundedRect(20, top - 16, GAME_WIDTH - 40, panelH, 24);

    this.add
      .text(GAME_WIDTH / 2, top - 6, "SORTING TUBES", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "11px",
        color: "#e8def8",
      })
      .setOrigin(0.5);

    for (let i = 0; i < n; i++) {
      const tube = this.state.tubes[i];
      const x = startX + i * (TUBE_WIDTH + TUBE_GAP);
      const y = top + 12;
      const tubeBodyH = tube.capacity * TUBE_MARBLE_DIAMETER + TUBE_PADDING * 2;
      const g = this.add.graphics();
      drawTube(
        g,
        x,
        y,
        TUBE_WIDTH,
        tubeBodyH,
        TUBE_CAP_HEIGHT,
        TUBE_BOTTOM_HEIGHT,
        tube.color,
      );
      // Capacity hint at the bottom: "0 / 6"
      this.add
        .text(
          x + TUBE_WIDTH / 2,
          y + TUBE_CAP_HEIGHT + tubeBodyH + TUBE_BOTTOM_HEIGHT + 8,
          `${tube.marbles.length}/${tube.capacity}`,
          {
            fontFamily: "Arial Black, sans-serif",
            fontSize: "13px",
            color: "#ffffff",
            stroke: "#5e2e91",
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5)
        .setName(`tubeCount-${i}`);
    }
  }

  // Position of the marble at slot j in tube i (j=0 bottom).
  private tubeMarblePos(
    tubeIdx: number,
    j: number,
  ): { x: number; y: number } {
    const n = this.state.tubes.length;
    const totalW = n * TUBE_WIDTH + (n - 1) * TUBE_GAP;
    const startX = (GAME_WIDTH - totalW) / 2;
    const tube = this.state.tubes[tubeIdx];
    const tubeBodyH = tube.capacity * TUBE_MARBLE_DIAMETER + TUBE_PADDING * 2;
    const baseY =
      this.tubesY +
      12 +
      TUBE_CAP_HEIGHT +
      tubeBodyH -
      TUBE_PADDING -
      TUBE_MARBLE_DIAMETER / 2;
    return {
      x: startX + tubeIdx * (TUBE_WIDTH + TUBE_GAP) + TUBE_WIDTH / 2,
      y: baseY - j * TUBE_MARBLE_DIAMETER,
    };
  }

  private updateTubeCount(i: number): void {
    const t = this.state.tubes[i];
    const txt = this.children.getByName(`tubeCount-${i}`) as
      | Phaser.GameObjects.Text
      | null;
    if (txt) txt.setText(`${t.marbles.length}/${t.capacity}`);
  }

  // ─────────────────────────── MARBLE SPRITES ───────────────────────────
  private spawnMarbleSprite(marble: Marble, x: number, y: number): MarbleSprite {
    const g = this.add.graphics();
    drawMarble(g, CONVEYOR_MARBLE_RADIUS * 2, marble.color);
    const c = this.add.container(x, y, [g]);
    c.setDepth(10);
    const spr: MarbleSprite = { container: c, marble };
    this.marbleSprites.set(marble.id, spr);
    return spr;
  }

  private destroyMarbleSprite(id: number): void {
    const spr = this.marbleSprites.get(id);
    if (spr) {
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

    // Animate the tile change
    this.redrawTile(r, c);

    // If the tile is now empty, refreshing locks may have flipped neighbors.
    // Redraw everything for safety.
    this.redrawAllTiles();

    // If marbles were released, spawn marble sprites for the new pendingEject items.
    if (outcome.kind === "released" && outcome.releasedCount > 0) {
      const tilePos = this.tilePos(r, c);
      const newCount = this.state.pendingEject.length - before;
      for (let k = 0; k < newCount; k++) {
        const idx = before + k;
        const m = this.state.pendingEject[idx];
        const target = this.pendingPos(idx);
        const spr = this.spawnMarbleSprite(m, tilePos.x, tilePos.y);
        spr.container.setScale(0.4);
        this.tweens.add({
          targets: spr.container,
          x: target.x,
          y: target.y,
          scale: 1,
          duration: MARBLE_ANIM_MS,
          ease: "Cubic.out",
          delay: k * 60,
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
    // Clear all marble sprites
    for (const [, s] of this.marbleSprites) s.container.destroy();
    this.marbleSprites.clear();

    // Rebuild tiles
    for (const row of this.tileSprites) {
      for (const s of row) {
        if (s) s.container.destroy();
      }
    }
    this.buildGrid();

    // Re-spawn marbles based on state
    this.state.pendingEject.forEach((m, idx) => {
      const p = this.pendingPos(idx);
      this.spawnMarbleSprite(m, p.x, p.y);
    });
    this.state.conveyor.forEach((m, i) => {
      if (!m) return;
      this.spawnMarbleSprite(m, this.conveyorSlotX(i), this.conveyorSlotY());
    });
    this.state.tubes.forEach((t, i) => {
      t.marbles.forEach((m, j) => {
        const p = this.tubeMarblePos(i, j);
        this.spawnMarbleSprite(m, p.x, p.y);
      });
      this.updateTubeCount(i);
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
    if (this.state.status !== "playing") return;
    if (this.lastTickAt === 0) this.lastTickAt = time;
    if (time - this.lastTickAt < this.state.tickMs) return;
    this.lastTickAt = time;
    this.runTick();
  }

  private runTick(): void {
    // Snapshot conveyor's previous marbles by id → previous slot index
    const prevConveyor = this.state.conveyor.slice();

    const result = tick(this.state);

    // 1. Animate conveyor shift: every marble that survived in the conveyor
    //    after the tick moves one slot right.
    for (let i = 0; i < this.state.conveyor.length; i++) {
      const m = this.state.conveyor[i];
      if (!m) continue;
      const spr = this.marbleSprites.get(m.id);
      if (!spr) continue;
      this.tweens.killTweensOf(spr.container);
      this.tweens.add({
        targets: spr.container,
        x: this.conveyorSlotX(i),
        y: this.conveyorSlotY(),
        duration: this.state.tickMs - 20,
        ease: "Linear",
      });
    }

    // 2. New marble injected at slot 0 from pendingEject — its sprite already
    //    exists (was spawned at queue position), tween into slot 0.
    if (result.injected) {
      const spr = this.marbleSprites.get(result.injected.id);
      if (spr) {
        this.tweens.killTweensOf(spr.container);
        this.tweens.add({
          targets: spr.container,
          x: this.conveyorSlotX(0),
          y: this.conveyorSlotY(),
          duration: this.state.tickMs - 20,
          ease: "Cubic.out",
        });
      }
    }

    // 3. Re-position the remaining pendingEject marbles to their new queue slots.
    this.state.pendingEject.forEach((m, idx) => {
      const spr = this.marbleSprites.get(m.id);
      if (!spr) return;
      const p = this.pendingPos(idx);
      this.tweens.killTweensOf(spr.container);
      this.tweens.add({
        targets: spr.container,
        x: p.x,
        y: p.y,
        duration: this.state.tickMs - 20,
        ease: "Cubic.out",
      });
    });

    // 4. The emitted marble: route into target tube (or game over).
    if (result.emitted) {
      const spr = this.marbleSprites.get(result.emitted.id);
      if (result.routed?.ok) {
        const tubeIdx = result.routed.tubeIndex;
        const j = this.state.tubes[tubeIdx].marbles.length - 1;
        const target = this.tubeMarblePos(tubeIdx, j);
        if (spr) {
          this.tweens.killTweensOf(spr.container);
          // Drop arc: first move horizontally, then plop down.
          this.tweens.add({
            targets: spr.container,
            x: target.x,
            y: target.y,
            duration: 360,
            ease: "Bounce.out",
          });
        }
        this.updateTubeCount(tubeIdx);
      } else {
        // Routing failed — animate marble dropping off the right edge then
        // GameOver scene.
        if (spr) {
          this.tweens.add({
            targets: spr.container,
            x: spr.container.x + 60,
            y: spr.container.y + 200,
            alpha: 0,
            angle: 90,
            duration: 600,
            ease: "Cubic.in",
          });
        }
      }
    }

    // 5. Status transitions
    if (result.statusChanged) {
      this.time.delayedCall(700, () => {
        if (this.state.status === "won") {
          this.scene.start(SCENE_COMPLETE, { levelId: this.level.id });
        } else if (this.state.status === "lost") {
          this.scene.start(SCENE_GAMEOVER, { levelId: this.level.id });
        }
      });
    }

    // Avoid unused-var warning; prevConveyor is kept for potential debug.
    void prevConveyor;
  }
}
