import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_MAP,
  SCENE_MENU,
  UI_BG_TOP,
  UI_BG_BOTTOM,
  UI_ACCENT,
} from "../game/constants";
import { getTotalScore, getTotalStars } from "../game/progression";

const RIVAL_NAMES = [
  "MarbleMax",
  "SortyMcSort",
  "RollDeluxe",
  "PipDottir",
  "Conveyor Carl",
  "LaneQueen",
  "MystiKai",
  "LockSmith",
  "RushHourRei",
];

// Fixed jitter percentages — keeps rivals stable across visits.
// Mix of above/below user so user lands mid-pack initially and can climb to #1.
const RIVAL_JITTER_PCT = [0.22, 0.14, 0.07, 0.03, -0.04, -0.09, -0.15, -0.21, -0.28];
const RIVAL_STARS_OFFSET = [3, 2, 1, 0, 0, -1, -2, -3, -4];

interface Row {
  name: string;
  total: number;
  stars: number;
  isUser: boolean;
}

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super("LeaderboardScene");
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(UI_BG_TOP, UI_BG_TOP, UI_BG_BOTTOM, UI_BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const userTotal = getTotalScore();
    const userStars = getTotalStars();

    const rows: Row[] = [
      { name: "YOU", total: userTotal, stars: userStars, isUser: true },
      ...RIVAL_NAMES.map((name, i) => ({
        name,
        total: Math.max(0, Math.round(userTotal * (1 + RIVAL_JITTER_PCT[i]))),
        stars: Math.max(0, Math.min(15, userStars + RIVAL_STARS_OFFSET[i])),
        isUser: false,
      })),
    ];
    rows.sort((a, b) => b.total - a.total);

    const userRank = rows.findIndex((r) => r.isUser) + 1;

    // Header
    this.add
      .text(GAME_WIDTH / 2, 70, "WORLD LEADERBOARD", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "32px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 110, `You: rank #${userRank} of ${rows.length}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#5e2e91",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Rows
    const rowH = 56;
    const rowGap = 4;
    const startY = 150;
    rows.forEach((row, i) => {
      this.drawRow(i + 1, row, startY + i * (rowH + rowGap), rowH);
    });

    // Buttons
    this.makeButton(GAME_WIDTH / 2 - 90, 820, "MAP", UI_ACCENT, () =>
      this.scene.start(SCENE_MAP),
    );
    this.makeButton(GAME_WIDTH / 2 + 90, 820, "MENU", 0xb472ff, () =>
      this.scene.start(SCENE_MENU),
    );
  }

  private drawRow(rank: number, row: Row, y: number, h: number): void {
    const x = 24;
    const w = GAME_WIDTH - 48;
    const g = this.add.graphics();
    const rowColor = row.isUser ? UI_ACCENT : rank % 2 === 0 ? 0x4a3a7a : 0x3e2f6a;
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x + 2, y + 3, w, h, 12);
    g.fillStyle(rowColor, row.isUser ? 1 : 0.85);
    g.fillRoundedRect(x, y, w, h, 12);
    if (row.isUser) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(x, y, w, h, 12);
    }

    const cy = y + h / 2;

    // Medal / rank
    if (rank <= 3) {
      const medalColor = rank === 1 ? 0xffd84a : rank === 2 ? 0xc9c9c9 : 0xcd853f;
      g.fillStyle(medalColor, 1);
      g.fillCircle(x + 32, cy, 18);
      g.lineStyle(2, 0x000000, 0.4);
      g.strokeCircle(x + 32, cy, 18);
    }
    this.add
      .text(x + 32, cy, `${rank}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: rank <= 3 ? "20px" : "22px",
        color: rank <= 3 ? "#3a1a00" : "#ffffff",
      })
      .setOrigin(0.5);

    // User pointer
    if (row.isUser) {
      this.add
        .text(x + 60, cy, "▶", {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "18px",
          color: "#3a1a00",
        })
        .setOrigin(0.5);
    }

    // Name
    this.add
      .text(x + 80, cy, row.name, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: row.isUser ? "#3a1a00" : "#ffffff",
      })
      .setOrigin(0, 0.5);

    // Stars
    this.add
      .text(x + w - 110, cy, `★ ${row.stars}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: row.isUser ? "#3a1a00" : "#ffd84a",
      })
      .setOrigin(0, 0.5);

    // Total score
    this.add
      .text(x + w - 16, cy, `${row.total}`, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "20px",
        color: row.isUser ? "#3a1a00" : "#ffffff",
      })
      .setOrigin(1, 0.5);
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
    g.fillRoundedRect(-80, -24, 160, 48, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-80, -28, 160, 48, 14);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(-80, -28, 160, 48, 14);
    const t = this.add
      .text(0, -4, label, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(160, 48);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", cb);
    c.on("pointerover", () => c.setScale(1.05));
    c.on("pointerout", () => c.setScale(1));
  }
}
