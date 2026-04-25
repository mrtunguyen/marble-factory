import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_GAME,
  SCENE_EDITOR,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_TEXT_LIGHT,
  UI_ACCENT,
  MARBLE_COLORS,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import { drawMarble } from "../game/draw";
import type { MarbleColor } from "../game/types";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawDecorations();

    // Title
    this.add
      .text(GAME_WIDTH / 2, 130, "MARBLE", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "60px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 190, "FACTORY", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "60px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 250, "Sort the marbles into the right tubes", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Level select
    this.add
      .text(GAME_WIDTH / 2, 310, "Choose a level", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: UI_TEXT_LIGHT,
      })
      .setOrigin(0.5);

    const cols = 5;
    const buttonW = 86;
    const buttonH = 100;
    const gap = 12;
    const totalW = cols * buttonW + (cols - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + buttonW / 2;
    const startY = 380;
    LEVELS.forEach((level, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * (buttonW + gap);
      const y = startY + row * (buttonH + gap);
      this.makeLevelButton(
        x,
        y,
        buttonW,
        buttonH,
        level.id,
        level.name,
        level.tubes.map((t) => t.color),
      );
    });

    // Editor button
    this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT - 130, "LEVEL EDITOR", () =>
      this.scene.start(SCENE_EDITOR),
    );

    // Footer
    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 40,
        "Tap blocks → marbles flow → fill the matching tubes",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#e8def8",
        },
      )
      .setOrigin(0.5);
  }

  private makeLevelButton(
    x: number,
    y: number,
    w: number,
    h: number,
    id: number,
    name: string,
    tubeColors: MarbleColor[],
  ): void {
    const c = this.add.container(x, y);
    const palette = [0xff5b6e, 0x49b9ff, 0x6dd35f, 0xffd84a, 0xb472ff, 0xff9c42];
    const color = palette[(id - 1) % palette.length];

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(3, 0xffffff, 0.55);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    c.add(g);

    const numTxt = this.add
      .text(0, -28, `${id}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "30px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    c.add(numTxt);

    // Tube color preview marbles, centered horizontally
    const marbleSize = 12;
    const colorRow = tubeColors.slice(0, 4);
    const totalRowW = colorRow.length * (marbleSize + 2) - 2;
    colorRow.forEach((tc, i) => {
      const mg = this.add.graphics();
      drawMarble(mg, marbleSize, tc);
      mg.x = -totalRowW / 2 + i * (marbleSize + 2) + marbleSize / 2;
      mg.y = 6;
      c.add(mg);
    });

    const lblTxt = this.add
      .text(0, 32, name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    c.add(lblTxt);

    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => this.scene.start(SCENE_GAME, { levelId: id }));
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }

  private makeButton(x: number, y: number, label: string, cb: () => void): void {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(UI_ACCENT, 1);
    g.fillRoundedRect(-130, -28, 260, 56, 16);
    g.lineStyle(4, 0x7e3a00, 1);
    g.strokeRoundedRect(-130, -28, 260, 56, 16);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#7e3a00",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(260, 56);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.05));
    c.on("pointerout", () => c.setScale(1));
  }

  private drawDecorations(): void {
    const colors = Object.keys(MARBLE_COLORS) as MarbleColor[];
    const positions = [
      { x: 60, y: 70, s: 24 },
      { x: GAME_WIDTH - 60, y: 70, s: 24 },
      { x: 100, y: 30, s: 18 },
      { x: GAME_WIDTH - 100, y: 30, s: 18 },
      { x: 30, y: 220, s: 22 },
      { x: GAME_WIDTH - 30, y: 220, s: 22 },
    ];
    positions.forEach((p, i) => {
      const g = this.add.graphics();
      drawMarble(g, p.s, colors[i % colors.length]);
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
    });
  }
}
