import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_GAME,
  SCENE_MENU,
  UI_BG_TOP,
  UI_BG_BOTTOM,
} from "../game/constants";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: { levelId: number }): void {
    const id = data?.levelId ?? 1;

    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sad emoji-style icon
    this.add
      .text(GAME_WIDTH / 2, 280, "💥", {
        fontFamily: "Arial",
        fontSize: "120px",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 400, "FACTORY JAMMED!", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "40px",
        color: "#ff7676",
        stroke: "#5e2e91",
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        450,
        "A marble had nowhere to go.\nThe target tube was full.",
        {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          stroke: "#5e2e91",
          strokeThickness: 3,
          align: "center",
        },
      )
      .setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2, 560, "RETRY", 0x6dd35f, () =>
      this.scene.start(SCENE_GAME, { levelId: id }),
    );
    this.makeButton(GAME_WIDTH / 2, 650, "MENU", 0xb472ff, () =>
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
}
