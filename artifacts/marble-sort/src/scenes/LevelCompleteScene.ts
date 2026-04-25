import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_GAME,
  SCENE_MENU,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  MARBLE_COLORS,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import { drawMarble } from "../game/draw";
import type { MarbleColor } from "../game/types";

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super("LevelCompleteScene");
  }

  create(data: { levelId: number }): void {
    const id = data?.levelId ?? 1;
    const idx = LEVELS.findIndex((l) => l.id === id);
    const next = idx >= 0 && idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;

    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Confetti marbles
    const colors = Object.keys(MARBLE_COLORS) as MarbleColor[];
    for (let i = 0; i < 28; i++) {
      const g = this.add.graphics();
      drawMarble(g, 18, colors[i % colors.length]);
      g.x = Math.random() * GAME_WIDTH;
      g.y = -20 - Math.random() * 200;
      this.tweens.add({
        targets: g,
        y: GAME_HEIGHT + 40,
        rotation: Math.random() * 6,
        duration: 2400 + Math.random() * 1800,
        repeat: -1,
        delay: Math.random() * 1000,
      });
    }

    this.add
      .text(GAME_WIDTH / 2, 240, "TUBES SORTED!", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "44px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 290, `Level ${id} cleared`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Stars
    for (let i = 0; i < 3; i++) {
      const x = GAME_WIDTH / 2 - 80 + i * 80;
      const y = 380;
      const star = this.add.graphics();
      star.fillStyle(0xffd84a, 1);
      star.lineStyle(4, 0x7e3a00, 1);
      this.drawStar(star, 0, 0, 5, 30, 14);
      star.fillPath();
      star.strokePath();
      const c = this.add.container(x, y, [star]);
      c.setScale(0);
      this.tweens.add({
        targets: c,
        scale: 1,
        duration: 360,
        delay: 300 + i * 200,
        ease: "Back.out",
      });
    }

    if (next) {
      this.makeButton(GAME_WIDTH / 2, 520, "NEXT LEVEL", 0x6dd35f, () => {
        this.scene.start(SCENE_GAME, { levelId: next.id });
      });
    } else {
      this.add
        .text(GAME_WIDTH / 2, 520, "FACTORY MASTERED!", {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "26px",
          color: "#ffd84a",
          stroke: "#7e3a00",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
    }

    this.makeButton(GAME_WIDTH / 2, 610, "REPLAY", 0x49b9ff, () =>
      this.scene.start(SCENE_GAME, { levelId: id }),
    );
    this.makeButton(GAME_WIDTH / 2, 700, "MENU", 0xb472ff, () =>
      this.scene.start(SCENE_MENU),
    );
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
    g.fillRoundedRect(-130, -28, 260, 56, 16);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-130, -32, 260, 56, 16);
    g.lineStyle(4, 0xffffff, 0.8);
    g.strokeRoundedRect(-130, -32, 260, 56, 16);
    const t = this.add
      .text(0, -4, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(260, 56);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.05));
    c.on("pointerout", () => c.setScale(1));
  }

  private drawStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    points: number,
    outer: number,
    inner: number,
  ): void {
    g.beginPath();
    const step = Math.PI / points;
    let angle = -Math.PI / 2;
    g.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    for (let i = 0; i < points; i++) {
      angle += step;
      g.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      angle += step;
      g.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    }
    g.closePath();
  }
}
