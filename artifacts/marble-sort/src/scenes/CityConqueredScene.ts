import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_MAP,
  SCENE_MENU,
  SCENE_LEADERBOARD,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_ACCENT,
  MARBLE_COLORS,
} from "../game/constants";
import { LEVELS } from "../game/levels";
import { CITY_ROUTE } from "../game/cityRoute";
import { drawMarble } from "../game/draw";
import type { MarbleColor } from "../game/types";
import { isAllCompleted } from "../game/progression";

interface ConquestData {
  levelId: number;
  score: number;
  stars: 1 | 2 | 3;
  timeSec: number;
  taps: number;
  par: { time: number; taps: number };
  fromMap?: boolean;
  justUnlocked?: number;
}

export class CityConqueredScene extends Phaser.Scene {
  constructor() {
    super("CityConqueredScene");
  }

  create(data: ConquestData): void {
    const id = data?.levelId ?? 1;
    const fromMap = data?.fromMap ?? false;

    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.cameras.main.flash(280, 255, 240, 180);
    this.cameras.main.shake(180, 0.005);

    // Confetti drift
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

    // Banner
    this.add
      .text(GAME_WIDTH / 2, 180, "CITY CONQUERED!", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "40px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    const city = CITY_ROUTE.find((c) => c.levelId === id);
    const cityName = city?.name ?? LEVELS.find((l) => l.id === id)?.name ?? `Level ${id}`;
    this.add
      .text(GAME_WIDTH / 2, 230, cityName, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Stars row (3 slots; fill `stars` of them)
    for (let i = 0; i < 3; i++) {
      const x = GAME_WIDTH / 2 - 80 + i * 80;
      const y = 320;
      const star = this.add.graphics();
      const filled = i < data.stars;
      star.fillStyle(filled ? 0xffd84a : 0x000000, filled ? 1 : 0.25);
      star.lineStyle(4, 0x7e3a00, filled ? 1 : 0.5);
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

    // Stats panel
    const panelX = GAME_WIDTH / 2 - 170;
    const panelY = 400;
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.35);
    panel.fillRoundedRect(panelX, panelY, 340, 200, 16);
    panel.lineStyle(3, 0xffffff, 0.4);
    panel.strokeRoundedRect(panelX, panelY, 340, 200, 16);

    const labelStyle = {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "20px",
      color: "#e8def8",
    } as const;
    const valueStyle = {
      fontFamily: "Arial Black, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
    } as const;
    const parStyle = {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#a99cd0",
    } as const;

    const rowY = (i: number) => panelY + 30 + i * 50;
    const timeStr = `${data.timeSec.toFixed(1)}s`;
    const tapsStr = `${data.taps}`;
    const scoreStr = `${data.score}`;

    this.add.text(panelX + 28, rowY(0), "TIME", labelStyle).setOrigin(0, 0.5);
    this.add.text(panelX + 200, rowY(0), timeStr, valueStyle).setOrigin(0, 0.5);
    this.add.text(panelX + 290, rowY(0), `(par ${data.par.time}s)`, parStyle).setOrigin(0, 0.5);

    this.add.text(panelX + 28, rowY(1), "TAPS", labelStyle).setOrigin(0, 0.5);
    this.add.text(panelX + 200, rowY(1), tapsStr, valueStyle).setOrigin(0, 0.5);
    this.add.text(panelX + 290, rowY(1), `(par ${data.par.taps})`, parStyle).setOrigin(0, 0.5);

    this.add
      .text(panelX + 28, rowY(2), "SCORE", {
        ...labelStyle,
        color: "#ffd84a",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(panelX + 200, rowY(2), scoreStr, {
        ...valueStyle,
        fontSize: "26px",
        color: "#ffd84a",
      })
      .setOrigin(0, 0.5);

    // CONTINUE button
    this.makeButton(GAME_WIDTH / 2, 700, "CONTINUE", UI_ACCENT, () => {
      if (!fromMap) {
        this.scene.start(SCENE_MENU);
      } else if (isAllCompleted()) {
        this.scene.start(SCENE_LEADERBOARD, { fresh: true });
      } else {
        this.scene.start(SCENE_MAP, { justUnlocked: data.justUnlocked });
      }
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
