import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_GAME,
  SCENE_EDITOR,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_TEXT_DARK,
  UI_TEXT_LIGHT,
  UI_ACCENT,
  BLOCK_COLORS,
} from "../game/constants";
import { LEVELS } from "../game/levels";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    // Background — gradient-ish purple
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative floating blocks at top
    this.drawDecorativeBlocks();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 110, "BLOCK MATCH", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "52px",
      color: "#ffd84a",
      stroke: "#7e3a00",
      strokeThickness: 8,
    });
    title.setOrigin(0.5);

    const sub = this.add.text(GAME_WIDTH / 2, 160, "SOLVE THE PUZZLES", {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#5e2e91",
      strokeThickness: 4,
    });
    sub.setOrigin(0.5);

    // Level select grid
    this.add
      .text(GAME_WIDTH / 2, 230, "Choose a level", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);

    const cols = 5;
    const rows = Math.ceil(LEVELS.length / cols);
    const buttonW = 80;
    const buttonH = 80;
    const gap = 16;
    const totalW = cols * buttonW + (cols - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + buttonW / 2;
    const startY = 290;

    LEVELS.forEach((level, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = startX + col * (buttonW + gap);
      const y = startY + row * (buttonH + gap);
      this.makeLevelButton(x, y, buttonW, buttonH, level.id, level.name);
    });

    // Editor button
    const editorBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 90);
    const editorBg = this.add.graphics();
    editorBg.fillStyle(UI_ACCENT, 1);
    editorBg.fillRoundedRect(-110, -28, 220, 56, 16);
    editorBg.lineStyle(4, 0x7e3a00, 1);
    editorBg.strokeRoundedRect(-110, -28, 220, 56, 16);
    const editorText = this.add
      .text(0, 0, "LEVEL EDITOR", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#7e3a00",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    editorBtn.add([editorBg, editorText]);
    editorBtn.setSize(220, 56);
    editorBtn.setInteractive({ useHandCursor: true });
    editorBtn.on("pointerdown", () => {
      this.scene.start(SCENE_EDITOR);
    });
    editorBtn.on("pointerover", () => editorBtn.setScale(1.05));
    editorBtn.on("pointerout", () => editorBtn.setScale(1));

    // Footer
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 24,
        "Tap blocks → match 3+ same color in tray",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#e8def8",
        }
      )
      .setOrigin(0.5);
  }

  private makeLevelButton(
    x: number,
    y: number,
    w: number,
    h: number,
    id: number,
    name: string
  ): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    // Color based on level id
    const palette = [0xff5b6e, 0x49b9ff, 0x6dd35f, 0xffd84a, 0xb472ff, 0xff9c42];
    const color = palette[(id - 1) % palette.length];
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(3, 0xffffff, 0.5);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    const num = this.add
      .text(0, -10, `${id}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const lbl = this.add
      .text(0, 22, name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    c.add([g, num, lbl]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => {
      this.scene.start(SCENE_GAME, { levelId: id });
    });
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }

  private drawDecorativeBlocks(): void {
    // Scatter a few small blocks at the top corners
    const colors = Object.values(BLOCK_COLORS);
    const positions = [
      { x: 60, y: 60, s: 36, c: colors[0] },
      { x: GAME_WIDTH - 60, y: 60, s: 36, c: colors[1] },
      { x: 100, y: 30, s: 24, c: colors[2] },
      { x: GAME_WIDTH - 100, y: 30, s: 24, c: colors[3] },
      { x: 30, y: 150, s: 28, c: colors[4] },
      { x: GAME_WIDTH - 30, y: 150, s: 28, c: colors[5] },
    ];
    for (const p of positions) {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(-p.s / 2 + 2, -p.s / 2 + 3, p.s, p.s, 6);
      g.fillStyle(p.c, 0.7);
      g.fillRoundedRect(-p.s / 2, -p.s / 2, p.s, p.s, 6);
      g.x = p.x;
      g.y = p.y;
      this.tweens.add({
        targets: g,
        y: p.y + 8,
        yoyo: true,
        repeat: -1,
        duration: 1500 + Math.random() * 1000,
        ease: "Sine.inOut",
      });
    }
  }
}
