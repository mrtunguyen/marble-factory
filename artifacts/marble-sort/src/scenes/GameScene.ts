import Phaser from "phaser";
import { LEVELS } from "../game/levels";
import {
  buildGameState,
  canMove,
  applyMove,
  isLevelComplete,
  cloneTubes,
  topMarble,
} from "../game/logic";
import {
  MARBLE_RADIUS,
  TUBE_WIDTH,
  TUBE_SPACING,
  MARBLE_SPACING,
  ANIMATION_DURATION,
  MARBLE_COLORS,
  SCENE_MENU,
  SCENE_COMPLETE,
} from "../game/constants";
import type { GameState, Tube, MarbleColor } from "../game/types";

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private levelIndex = 0;
  private tubeGraphics: Phaser.GameObjects.Graphics[] = [];
  private marbleGraphics: Phaser.GameObjects.Graphics[][] = [];
  private lockTexts: Phaser.GameObjects.Text[] = [];
  private moveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private animating = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { levelIndex: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    const level = LEVELS[this.levelIndex];
    this.state = buildGameState(level);

    this.buildUI();
    this.renderAll();
  }

  private buildUI() {
    const { width } = this.scale;
    const level = LEVELS[this.levelIndex];

    // Top bar
    this.levelText = this.add
      .text(width / 2, 28, `Level ${level.id}: ${level.name}`, {
        fontSize: "22px",
        fontFamily: "Arial Black, Arial",
        color: "#e0e8ff",
      })
      .setOrigin(0.5);

    this.moveText = this.add
      .text(width / 2, 56, "Moves: 0", {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#a8c6f0",
      })
      .setOrigin(0.5);

    // Buttons
    this.makeButton(width - 70, 30, "Menu", 80, 30, () => {
      this.scene.start(SCENE_MENU);
    });

    this.makeButton(width - 70, 68, "Restart", 80, 30, () => {
      this.restartLevel();
    });

    this.makeButton(70, 30, "Undo", 80, 30, () => {
      this.undoMove();
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    w: number,
    h: number,
    cb: () => void
  ) {
    const g = this.add.graphics();
    g.fillStyle(0x0f3460, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(1.5, 0x4a90d9, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.setPosition(x, y).setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    const txt = this.add
      .text(x, y, label, {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#e0e8ff",
      })
      .setOrigin(0.5);

    g.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");
      txt.setColor("#ffffff");
    });
    g.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      txt.setColor("#e0e8ff");
    });
    g.on("pointerdown", cb);
  }

  private getTubeLayout(): { x: number; y: number }[] {
    const { width, height } = this.scale;
    const tubes = this.state.tubes;
    const n = tubes.length;

    // Lay out in rows if too many
    const maxPerRow = 7;
    const rows = Math.ceil(n / maxPerRow);
    const result: { x: number; y: number }[] = [];

    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / maxPerRow);
      const rowCount = Math.min(maxPerRow, n - row * maxPerRow);
      const totalW = (rowCount - 1) * TUBE_SPACING;
      const startX = width / 2 - totalW / 2;
      const col = i % maxPerRow;
      const x = startX + col * TUBE_SPACING;
      const rowH = (MARBLE_SPACING * (this.state.tubes[0].capacity + 1)) + 30;
      const totalRows = rows * rowH;
      const startY = height / 2 - totalRows / 2 + rowH / 2 + 60;
      const y = startY + row * rowH;
      result.push({ x, y });
    }

    return result;
  }

  private renderAll() {
    // Destroy old graphics
    this.tubeGraphics.forEach((g) => g.destroy());
    this.marbleGraphics.forEach((row) => row.forEach((g) => g.destroy()));
    this.lockTexts.forEach((t) => t.destroy());
    this.tubeGraphics = [];
    this.marbleGraphics = [];
    this.lockTexts = [];

    const positions = this.getTubeLayout();
    const capacity = this.state.tubes[0].capacity;
    const tubeH = capacity * MARBLE_SPACING + 20;

    this.state.tubes.forEach((tube, i) => {
      const { x, y } = positions[i];
      const isSelected = this.state.selectedTubeIndex === i;

      // Draw tube body
      const g = this.add.graphics();
      const tubeTop = y - tubeH / 2;

      // Background fill
      g.fillStyle(isSelected ? 0x1a5490 : 0x0f3460, 1);
      g.fillRoundedRect(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH, 12);

      // Locked overlay
      if (tube.locked) {
        g.fillStyle(0x4a1a6e, 0.6);
        g.fillRoundedRect(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH, 12);
      }

      // Border
      if (isSelected) {
        g.lineStyle(3, 0x70b8ff, 1);
      } else if (tube.locked) {
        g.lineStyle(2, 0x9b59b6, 1);
      } else {
        g.lineStyle(2, 0x4a90d9, 0.6);
      }
      g.strokeRoundedRect(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH, 12);

      // Hitbox
      g.setInteractive(
        new Phaser.Geom.Rectangle(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH),
        Phaser.Geom.Rectangle.Contains
      );

      g.on("pointerdown", () => this.handleTubeClick(i));
      g.on("pointerover", () => {
        this.input.setDefaultCursor("pointer");
      });
      g.on("pointerout", () => {
        this.input.setDefaultCursor("default");
      });

      this.tubeGraphics.push(g);

      // Lock text
      if (tube.locked) {
        const lt = this.add
          .text(x, tubeTop - 20, `🔒 ${tube.lockedTurns}`, {
            fontSize: "14px",
            fontFamily: "Arial",
            color: "#c39bd3",
          })
          .setOrigin(0.5);
        this.lockTexts.push(lt);
      } else {
        this.lockTexts.push(this.add.text(-9999, -9999, "")); // placeholder
      }

      // Draw marbles
      const marbleRow: Phaser.GameObjects.Graphics[] = [];
      tube.marbles.forEach((color, mi) => {
        const mx = x;
        const my = y + tubeH / 2 - 10 - MARBLE_SPACING * mi - MARBLE_RADIUS;
        const mg = this.drawMarble(mx, my, color);
        marbleRow.push(mg);
      });
      this.marbleGraphics.push(marbleRow);
    });

    // Update HUD
    this.moveText.setText(`Moves: ${this.state.moveCount}`);
  }

  private drawMarble(x: number, y: number, color: MarbleColor): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(MARBLE_COLORS[color], 1);
    g.fillCircle(x, y, MARBLE_RADIUS);
    // Shine
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(x - 8, y - 8, 9);
    return g;
  }

  private handleTubeClick(tubeIdx: number) {
    if (this.animating) return;
    if (this.state.levelComplete) return;

    const { selectedTubeIndex, tubes } = this.state;

    if (selectedTubeIndex === null) {
      // Select a tube if it has marbles
      if (tubes[tubeIdx].marbles.length > 0) {
        this.state.selectedTubeIndex = tubeIdx;
        this.renderAll();
      }
    } else if (selectedTubeIndex === tubeIdx) {
      // Deselect
      this.state.selectedTubeIndex = null;
      this.renderAll();
    } else {
      // Try to move
      if (canMove(tubes, selectedTubeIndex, tubeIdx)) {
        this.performMove(selectedTubeIndex, tubeIdx);
      } else {
        // Shake the selected tube briefly to indicate invalid move
        this.state.selectedTubeIndex = tubeIdx; // switch selection
        this.renderAll();
      }
    }
  }

  private performMove(fromIdx: number, toIdx: number) {
    this.animating = true;

    // Save history before move
    const snapshot = cloneTubes(this.state.tubes);
    this.state.history.push(snapshot);

    // Animate marble flying from source to destination
    const positions = this.getTubeLayout();
    const fromPos = positions[fromIdx];
    const toPos = positions[toIdx];
    const capacity = this.state.tubes[0].capacity;
    const tubeH = capacity * MARBLE_SPACING + 20;

    const fromTube = this.state.tubes[fromIdx];
    const mi = fromTube.marbles.length - 1;
    const color = topMarble(fromTube)!;

    const startX = fromPos.x;
    const startY = fromPos.y + tubeH / 2 - 10 - MARBLE_SPACING * mi - MARBLE_RADIUS;

    const toTube = this.state.tubes[toIdx];
    const destSlot = toTube.marbles.length; // will be placed at this index
    const endX = toPos.x;
    const endY = toPos.y + tubeH / 2 - 10 - MARBLE_SPACING * destSlot - MARBLE_RADIUS;

    // Create a temporary moving marble on top of everything
    const flyMarble = this.add.graphics();
    flyMarble.fillStyle(MARBLE_COLORS[color], 1);
    flyMarble.fillCircle(0, 0, MARBLE_RADIUS);
    flyMarble.fillStyle(0xffffff, 0.25);
    flyMarble.fillCircle(-8, -8, 9);
    flyMarble.setPosition(startX, startY);
    flyMarble.setDepth(100);

    // Apply the logical move
    this.state.tubes = applyMove(this.state.tubes, fromIdx, toIdx);
    this.state.moveCount++;
    this.state.selectedTubeIndex = null;

    // Redraw without the animating marble (the fly marble covers it)
    this.renderAll();

    // Animate arc path: go up, then down to dest
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 80;

    this.tweens.add({
      targets: flyMarble,
      x: { value: endX, ease: "Quad.easeInOut" },
      y: {
        value: endY,
        ease: "Quad.easeIn",
      },
      duration: ANIMATION_DURATION,
      onComplete: () => {
        flyMarble.destroy();
        this.animating = false;

        // Check win
        if (isLevelComplete(this.state.tubes)) {
          this.state.levelComplete = true;
          this.time.delayedCall(300, () => {
            this.scene.start(SCENE_COMPLETE, {
              levelIndex: this.levelIndex,
              moves: this.state.moveCount,
            });
          });
        }
      },
    });
  }

  private undoMove() {
    if (this.animating) return;
    if (this.state.history.length === 0) return;

    const prev = this.state.history.pop()!;
    this.state.tubes = prev;
    this.state.moveCount = Math.max(0, this.state.moveCount - 1);
    this.state.selectedTubeIndex = null;
    this.renderAll();
  }

  private restartLevel() {
    const level = LEVELS[this.levelIndex];
    this.state = buildGameState(level);
    this.renderAll();
  }
}
