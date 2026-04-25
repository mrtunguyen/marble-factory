import Phaser from "phaser";
import { LEVELS } from "../game/levels";
import { SCENE_MENU, SCENE_GAME } from "../game/constants";

export class LevelCompleteScene extends Phaser.Scene {
  private levelIndex = 0;
  private moves = 0;

  constructor() {
    super({ key: "LevelCompleteScene" });
  }

  init(data: { levelIndex: number; moves: number }) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.moves = data?.moves ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Confetti particles
    this.spawnConfetti(width, height);

    // Panel
    const panelW = 380;
    const panelH = 280;
    const panel = this.add.graphics();
    panel.fillStyle(0x0f3460, 0.95);
    panel.fillRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);
    panel.lineStyle(3, 0x4a90d9, 1);
    panel.strokeRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 20);

    // Title
    this.add
      .text(width / 2, height / 2 - 95, "Level Complete!", {
        fontSize: "32px",
        fontFamily: "Arial Black, Arial",
        color: "#70b8ff",
      })
      .setOrigin(0.5);

    const level = LEVELS[this.levelIndex];
    this.add
      .text(width / 2, height / 2 - 52, `${level.name}`, {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#a8c6f0",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 15, `Solved in ${this.moves} moves`, {
        fontSize: "22px",
        fontFamily: "Arial",
        color: "#f1c40f",
      })
      .setOrigin(0.5);

    // Stars based on move count
    const stars = this.getMoves(level.id, this.moves);
    const starStr = "★".repeat(stars) + "☆".repeat(3 - stars);
    this.add
      .text(width / 2, height / 2 + 25, starStr, {
        fontSize: "36px",
        color: "#f1c40f",
      })
      .setOrigin(0.5);

    // Next level button
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    if (hasNext) {
      this.makeButton(width / 2 - 80, height / 2 + 95, "Next Level", () => {
        this.scene.start(SCENE_GAME, { levelIndex: this.levelIndex + 1 });
      }, 0x1a5490, 0x70b8ff);
    }

    this.makeButton(
      hasNext ? width / 2 + 80 : width / 2,
      height / 2 + 95,
      "Menu",
      () => this.scene.start(SCENE_MENU),
      0x0f3460,
      0x4a90d9
    );
  }

  private getMoves(levelId: number, moves: number): number {
    // Simple star rating: more stars for fewer moves
    const par = levelId * 8 + 4;
    if (moves <= par) return 3;
    if (moves <= par * 1.5) return 2;
    return 1;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    cb: () => void,
    fill: number,
    border: number
  ) {
    const w = 140;
    const h = 44;
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(2, border, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.setPosition(x, y).setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    const txt = this.add
      .text(x, y, label, {
        fontSize: "16px",
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

  private spawnConfetti(width: number, height: number) {
    const colors = [0xe74c3c, 0x3498db, 0x27ae60, 0xf1c40f, 0x9b59b6, 0xe67e22];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-50, height / 2);
      const color = Phaser.Math.RND.pick(colors);
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(-5, -5, 10, 10);
      g.setPosition(x, y);
      g.setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: g,
        y: height + 50,
        x: x + Phaser.Math.Between(-80, 80),
        angle: g.angle + Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 3000),
        ease: "Linear",
        delay: Phaser.Math.Between(0, 800),
      });
    }
  }
}
