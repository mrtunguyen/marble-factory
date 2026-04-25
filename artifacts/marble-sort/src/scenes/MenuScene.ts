import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_EDITOR,
  SCENE_MAP,
  UI_ACCENT,
  MARBLE_COLORS,
} from "../game/constants";
import { drawMarble } from "../game/draw";
import type { MarbleColor } from "../game/types";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  preload(): void {
    this.load.image("menu-bg", "assets/backgrounds/background.png");
  }

  create(): void {
    // Background image — cover fit with slow zoom
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "menu-bg");
    const coverScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(coverScale);
    this.tweens.add({
      targets: bg,
      scale: coverScale * 1.08,
      duration: 12000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Dark overlay for text readability
    this.add.graphics()
      .fillStyle(0x000000, 0.45)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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

    // Start button
    this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT / 2, "START", () =>
      this.scene.start(SCENE_MAP),
    );

    // Editor button
    this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, "LEVEL EDITOR", () =>
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
