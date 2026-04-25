import Phaser from "phaser";
import { LEVELS } from "../game/levels";
import { SCENE_GAME, SCENE_EDITOR } from "../game/constants";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add
      .text(width / 2, height * 0.12, "MARBLE SORT", {
        fontSize: "56px",
        fontFamily: "Arial Black, Arial",
        color: "#ffffff",
        stroke: "#4a90d9",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.21, "Sort the marbles by color!", {
        fontSize: "20px",
        fontFamily: "Arial",
        color: "#a8c6f0",
      })
      .setOrigin(0.5);

    // Decorative marbles row
    this.drawDecorativeMarbles(width, height);

    // Level select buttons
    const startY = height * 0.36;
    const btnWidth = 220;
    const btnHeight = 52;
    const cols = 2;
    const padX = 30;

    LEVELS.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = cols * btnWidth + (cols - 1) * padX;
      const x = width / 2 - totalW / 2 + col * (btnWidth + padX) + btnWidth / 2;
      const y = startY + row * 68;

      const btn = this.add.graphics();
      btn.fillStyle(0x0f3460, 1);
      btn.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      btn.lineStyle(2, 0x4a90d9, 1);
      btn.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      btn.setPosition(x, y).setInteractive(
        new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight),
        Phaser.Geom.Rectangle.Contains
      );

      const label = this.add
        .text(x, y, `Level ${level.id}: ${level.name}`, {
          fontSize: "18px",
          fontFamily: "Arial",
          color: "#e0e8ff",
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => {
        btn.clear();
        btn.fillStyle(0x1a5490, 1);
        btn.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btn.lineStyle(2, 0x70b8ff, 1);
        btn.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        label.setColor("#ffffff");
        this.input.setDefaultCursor("pointer");
      });

      btn.on("pointerout", () => {
        btn.clear();
        btn.fillStyle(0x0f3460, 1);
        btn.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btn.lineStyle(2, 0x4a90d9, 1);
        btn.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        label.setColor("#e0e8ff");
        this.input.setDefaultCursor("default");
      });

      btn.on("pointerdown", () => {
        this.scene.start(SCENE_GAME, { levelIndex: i });
      });
    });

    // Level Editor button
    const editorY = startY + Math.ceil(LEVELS.length / cols) * 68 + 20;
    const editorBtn = this.add.graphics();
    editorBtn.fillStyle(0x2d1b69, 1);
    editorBtn.fillRoundedRect(-110, -26, 220, 52, 12);
    editorBtn.lineStyle(2, 0x9b59b6, 1);
    editorBtn.strokeRoundedRect(-110, -26, 220, 52, 12);
    editorBtn.setPosition(width / 2, editorY).setInteractive(
      new Phaser.Geom.Rectangle(-110, -26, 220, 52),
      Phaser.Geom.Rectangle.Contains
    );

    const editorLabel = this.add
      .text(width / 2, editorY, "Level Editor", {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#d7b8ff",
      })
      .setOrigin(0.5);

    editorBtn.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");
      editorLabel.setColor("#ffffff");
    });
    editorBtn.on("pointerout", () => {
      this.input.setDefaultCursor("default");
      editorLabel.setColor("#d7b8ff");
    });
    editorBtn.on("pointerdown", () => {
      this.scene.start(SCENE_EDITOR);
    });

    // How to play
    const hintY = editorY + 70;
    this.add
      .text(width / 2, hintY, "How to play: Click a tube to select, then click another tube to move the top marble.\nSort all marbles by color to complete the level!", {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#6a8aaa",
        align: "center",
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5);
  }

  private drawDecorativeMarbles(width: number, height: number) {
    const colors = [0xe74c3c, 0x3498db, 0x27ae60, 0xf1c40f, 0x9b59b6, 0xe67e22];
    const y = height * 0.29;
    const startX = width / 2 - colors.length * 22;
    colors.forEach((color, i) => {
      const x = startX + i * 44;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(x, y, 16);
      // shine
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(x - 5, y - 5, 5);
    });
  }
}
