import Phaser from "phaser";
import {
  ALL_COLORS,
  MARBLE_COLORS,
  TUBE_WIDTH,
  TUBE_SPACING,
  MARBLE_SPACING,
  MARBLE_RADIUS,
  SCENE_MENU,
} from "../game/constants";
import type { MarbleColor, TubeDef, Level } from "../game/types";

interface EditorTube {
  marbles: MarbleColor[];
  locked: boolean;
  lockedTurns: number;
}

export class EditorScene extends Phaser.Scene {
  private tubes: EditorTube[] = [];
  private capacity = 4;
  private selectedColor: MarbleColor = "red";
  private selectedTube = -1;

  private tubeGraphics: Phaser.GameObjects.Graphics[] = [];
  private paletteGraphics: Phaser.GameObjects.Graphics[] = [];
  private colorLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private exportText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: "EditorScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Default tubes
    this.tubes = [
      { marbles: [], locked: false, lockedTurns: 0 },
      { marbles: [], locked: false, lockedTurns: 0 },
      { marbles: [], locked: false, lockedTurns: 0 },
    ];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    this.add
      .text(width / 2, 26, "LEVEL EDITOR", {
        fontSize: "24px",
        fontFamily: "Arial Black, Arial",
        color: "#e0e8ff",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(width / 2, 54, "Select a color, then click a tube to add/remove marbles", {
        fontSize: "13px",
        fontFamily: "Arial",
        color: "#7898b8",
      })
      .setOrigin(0.5);

    // Color palette
    this.buildPalette(width);

    // Tubes
    this.renderTubes(width, height);

    // Controls
    this.buildControls(width, height);

    // Back to menu
    this.makeButton(60, 28, "← Back", 90, 30, () => {
      this.scene.start(SCENE_MENU);
    });
  }

  private buildPalette(width: number) {
    const y = 96;
    const startX = width / 2 - (ALL_COLORS.length * 40) / 2 + 16;

    ALL_COLORS.forEach((color, i) => {
      const x = startX + i * 40;
      const g = this.add.graphics();
      this.drawPaletteCircle(g, x, y, color, color === this.selectedColor);
      g.setInteractive(
        new Phaser.Geom.Circle(x, y, 18),
        Phaser.Geom.Circle.Contains
      );
      g.on("pointerdown", () => {
        this.selectedColor = color;
        this.refreshPalette(width);
        this.statusText.setText(`Selected: ${color}`);
      });
      g.on("pointerover", () => { this.input.setDefaultCursor("pointer"); });
      g.on("pointerout", () => { this.input.setDefaultCursor("default"); });
      this.paletteGraphics.push(g);
    });
  }

  private drawPaletteCircle(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: MarbleColor,
    selected: boolean
  ) {
    g.clear();
    if (selected) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeCircle(x, y, 20);
    }
    g.fillStyle(MARBLE_COLORS[color], 1);
    g.fillCircle(x, y, 16);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(x - 5, y - 5, 5);
  }

  private refreshPalette(width: number) {
    const startX = width / 2 - (ALL_COLORS.length * 40) / 2 + 16;
    ALL_COLORS.forEach((color, i) => {
      const x = startX + i * 40;
      const g = this.paletteGraphics[i];
      this.drawPaletteCircle(g, x, 96, color, color === this.selectedColor);
    });
  }

  private renderTubes(width: number, height: number) {
    this.tubeGraphics.forEach((g) => g.destroy());
    this.tubeGraphics = [];

    const n = this.tubes.length;
    const totalW = (n - 1) * TUBE_SPACING;
    const startX = width / 2 - totalW / 2;
    const tubeH = this.capacity * MARBLE_SPACING + 20;
    const tubeY = height * 0.5;

    this.tubes.forEach((tube, i) => {
      const x = startX + i * TUBE_SPACING;
      const tubeTop = tubeY - tubeH / 2;

      const g = this.add.graphics();

      // Tube body
      g.fillStyle(tube.locked ? 0x3d1060 : 0x0f3460, 1);
      g.fillRoundedRect(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH, 12);
      g.lineStyle(2, tube.locked ? 0x9b59b6 : 0x4a90d9, 0.9);
      g.strokeRoundedRect(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH, 12);

      // Marbles
      tube.marbles.forEach((color, mi) => {
        const mx = x;
        const my = tubeY + tubeH / 2 - 10 - MARBLE_SPACING * mi - MARBLE_RADIUS;
        g.fillStyle(MARBLE_COLORS[color], 1);
        g.fillCircle(mx, my, MARBLE_RADIUS);
        g.fillStyle(0xffffff, 0.25);
        g.fillCircle(mx - 8, my - 8, 9);
      });

      // Lock label
      if (tube.locked) {
        this.add.text(x, tubeTop - 20, `🔒${tube.lockedTurns}`, {
          fontSize: "14px",
          color: "#c39bd3",
        }).setOrigin(0.5).setDepth(10);
      }

      // Tube label
      this.add.text(x, tubeY + tubeH / 2 + 14, `T${i + 1}`, {
        fontSize: "12px",
        color: "#5a7898",
      }).setOrigin(0.5);

      // Click to add/remove marbles (left/right click)
      g.setInteractive(
        new Phaser.Geom.Rectangle(x - TUBE_WIDTH / 2, tubeTop, TUBE_WIDTH, tubeH),
        Phaser.Geom.Rectangle.Contains
      );

      g.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
        if (ptr.rightButtonDown()) {
          // Right click = remove top marble
          tube.marbles.pop();
        } else {
          // Left click = add selected marble if room
          if (tube.marbles.length < this.capacity) {
            tube.marbles.push(this.selectedColor);
          }
        }
        this.renderTubes(width, height);
      });

      g.on("pointerover", () => { this.input.setDefaultCursor("pointer"); });
      g.on("pointerout", () => { this.input.setDefaultCursor("default"); });

      this.tubeGraphics.push(g);
    });
  }

  private buildControls(width: number, height: number) {
    const tubeH = this.capacity * MARBLE_SPACING + 20;
    const tubeY = height * 0.5;
    const bottomY = tubeY + tubeH / 2 + 50;

    // Add tube
    this.makeButton(width / 2 - 165, bottomY, "+ Tube", 100, 34, () => {
      if (this.tubes.length < 8) {
        this.tubes.push({ marbles: [], locked: false, lockedTurns: 0 });
        this.renderTubes(width, height);
      }
    });

    // Remove tube
    this.makeButton(width / 2 - 55, bottomY, "- Tube", 100, 34, () => {
      if (this.tubes.length > 2) {
        this.tubes.pop();
        this.renderTubes(width, height);
      }
    });

    // Toggle lock on last tube
    this.makeButton(width / 2 + 55, bottomY, "Lock Last", 100, 34, () => {
      const last = this.tubes[this.tubes.length - 1];
      last.locked = !last.locked;
      last.lockedTurns = last.locked ? 3 : 0;
      this.renderTubes(width, height);
    });

    // Clear
    this.makeButton(width / 2 + 165, bottomY, "Clear All", 100, 34, () => {
      this.tubes.forEach((t) => (t.marbles = []));
      this.renderTubes(width, height);
    });

    // Export JSON
    this.makeButton(width / 2 - 65, bottomY + 52, "Export JSON", 130, 36, () => {
      const level: Level = {
        id: 99,
        name: "Custom Level",
        tubeCapacity: this.capacity,
        tubes: this.tubes.map((t): TubeDef => ({
          marbles: [...t.marbles],
          locked: t.locked,
          lockedTurns: t.lockedTurns,
        })),
      };
      const json = JSON.stringify(level, null, 2);
      if (this.exportText) this.exportText.destroy();
      this.exportText = this.add
        .text(width / 2, bottomY + 120, json, {
          fontSize: "11px",
          fontFamily: "Monospace, Courier",
          color: "#a8f0c8",
          backgroundColor: "#0a1e10",
          padding: { x: 10, y: 8 },
          wordWrap: { width: width - 40 },
        })
        .setOrigin(0.5);

      // Copy to clipboard
      try {
        navigator.clipboard.writeText(json);
        this.statusText.setText("JSON copied to clipboard!");
      } catch {
        this.statusText.setText("JSON shown below (copy manually)");
      }
    });

    // Import JSON
    this.makeButton(width / 2 + 75, bottomY + 52, "Import JSON", 130, 36, () => {
      const json = prompt("Paste level JSON:");
      if (!json) return;
      try {
        const data = JSON.parse(json) as Level;
        if (data.tubes && data.tubeCapacity) {
          this.tubes = data.tubes.map((t) => ({
            marbles: [...t.marbles],
            locked: t.locked ?? false,
            lockedTurns: t.lockedTurns ?? 0,
          }));
          this.capacity = data.tubeCapacity;
          this.renderTubes(width, height);
          this.statusText.setText("Level imported!");
        }
      } catch {
        this.statusText.setText("Invalid JSON!");
      }
    });

    // Instructions
    this.add
      .text(width / 2, bottomY + 170, "Left-click tube = add marble | Right-click = remove marble | Lock Last = toggle lock on last tube", {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#5a7898",
        align: "center",
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5);
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
      .text(x, y, label, { fontSize: "13px", fontFamily: "Arial", color: "#e0e8ff" })
      .setOrigin(0.5);

    g.on("pointerover", () => { this.input.setDefaultCursor("pointer"); txt.setColor("#ffffff"); });
    g.on("pointerout", () => { this.input.setDefaultCursor("default"); txt.setColor("#e0e8ff"); });
    g.on("pointerdown", cb);
  }
}
