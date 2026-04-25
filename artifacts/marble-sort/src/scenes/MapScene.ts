import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, SCENE_GAME, SCENE_MENU } from "../game/constants";
import { CITY_ROUTE } from "../game/cityRoute";
import { isUnlocked, isCompleted } from "../game/progression";

const CAR_DEPTH = 10;
const CITY_SIZE = 64;
const CITY_HOVER_SIZE = 72;
const CAR_SIZE = 64;
const CAR_OFFSET_Y = 36; // car sits this many px above the city center
const CAR_BOUNCE_AMPLITUDE = 6;
const CITY_HIT_SIZE = 80;

interface MapSceneData {
  justUnlocked?: number;
}

export class MapScene extends Phaser.Scene {
  private justUnlocked?: number;

  constructor() {
    super("MapScene");
  }

  preload(): void {
    this.load.image("map-bg", "assets/map/map.png");
    this.load.image("city-locked", "assets/map/city-locked.png");
    this.load.image("city-unlocked", "assets/map/city-unlocked.png");
    this.load.image("mascot-car", "assets/map/mascot-car.png");
  }

  create(data?: MapSceneData): void {
    this.justUnlocked = data?.justUnlocked;

    // Background map — "cover" fit so the landscape source fills the
    // portrait canvas without distortion.
    this.cameras.main.setBackgroundColor("#1a1a2e");
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "map-bg");
    const coverScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(coverScale);

    this.drawConnectingPath();
    this.drawCities();
    this.drawMascotCar();
    this.drawTitle();
    this.drawMenuButton();
  }

  private drawConnectingPath(): void {
    const g = this.add.graphics();
    g.lineStyle(6, 0xd9c08a, 0.7);
    g.beginPath();
    const first = CITY_ROUTE[0];
    g.moveTo(first.x, first.y);
    for (let i = 1; i < CITY_ROUTE.length; i++) {
      g.lineTo(CITY_ROUTE[i].x, CITY_ROUTE[i].y);
    }
    g.strokePath();

    // Dashed overlay for locked segments
    for (let i = 0; i < CITY_ROUTE.length - 1; i++) {
      const a = CITY_ROUTE[i];
      const b = CITY_ROUTE[i + 1];
      if (!isUnlocked(b.levelId)) {
        const dash = this.add.graphics();
        dash.lineStyle(6, 0x888888, 0.5);
        dash.beginPath();
        dash.moveTo(a.x, a.y);
        dash.lineTo(b.x, b.y);
        dash.strokePath();
      }
    }
  }

  private drawCities(): void {
    for (const city of CITY_ROUTE) {
      const unlocked = isUnlocked(city.levelId);
      const completed = isCompleted(city.levelId);

      const texture = unlocked ? "city-unlocked" : "city-locked";
      const img = this.add.image(city.x, city.y, texture);
      img.setDisplaySize(CITY_SIZE, CITY_SIZE);

      // Completed star badge
      if (completed) {
        this.add
          .text(city.x + 22, city.y - 22, "★", {
            fontSize: "22px",
            color: "#ffd84a",
            stroke: "#7e3a00",
            strokeThickness: 4,
          })
          .setOrigin(0.5);
      }

      // City name label
      this.add
        .text(city.x, city.y + CITY_SIZE / 2 + 12, city.name, {
          fontFamily: "Arial Black, sans-serif",
          fontSize: "13px",
          color: unlocked ? "#ffffff" : "#888888",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      if (unlocked) {
        const zone = this.add
          .zone(city.x, city.y, CITY_HIT_SIZE, CITY_HIT_SIZE)
          .setInteractive({ useHandCursor: true });

        zone.on("pointerdown", () => this.onCityClick(city.levelId));
        zone.on("pointerover", () => img.setDisplaySize(CITY_HOVER_SIZE, CITY_HOVER_SIZE));
        zone.on("pointerout", () => img.setDisplaySize(CITY_SIZE, CITY_SIZE));
      } else {
        // Locked tap: shake the city icon
        const zone = this.add
          .zone(city.x, city.y, CITY_HIT_SIZE, CITY_HIT_SIZE)
          .setInteractive();
        zone.on("pointerdown", () => {
          this.tweens.add({
            targets: img,
            x: { from: city.x - 6, to: city.x + 6 },
            duration: 60,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              img.x = city.x;
            },
          });
        });
      }
    }
  }

  private drawMascotCar(): void {
    // Find the highest unlocked city
    let targetIdx = 0;
    for (let i = 0; i < CITY_ROUTE.length; i++) {
      if (isUnlocked(CITY_ROUTE[i].levelId)) targetIdx = i;
    }
    const target = CITY_ROUTE[targetIdx];

    // If we just unlocked this city, animate from the previous one.
    const justUnlockedThisOne =
      this.justUnlocked !== undefined &&
      this.justUnlocked === target.levelId &&
      targetIdx > 0;
    const start = justUnlockedThisOne ? CITY_ROUTE[targetIdx - 1] : target;

    const car = this.add.image(start.x, start.y - CAR_OFFSET_Y, "mascot-car");
    car.setDisplaySize(CAR_SIZE, CAR_SIZE);
    car.setDepth(CAR_DEPTH);

    const startIdleBounce = () => {
      this.tweens.add({
        targets: car,
        y: target.y - CAR_OFFSET_Y - CAR_BOUNCE_AMPLITUDE,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    };

    if (justUnlockedThisOne) {
      this.tweens.add({
        targets: car,
        x: target.x,
        y: target.y - CAR_OFFSET_Y,
        duration: 600,
        ease: "Sine.inOut",
        onComplete: startIdleBounce,
      });
    } else {
      startIdleBounce();
    }
  }

  private drawTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 44, "WORLD MAP", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "32px",
        color: "#ffd84a",
        stroke: "#7e3a00",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
  }

  private drawMenuButton(): void {
    const c = this.add.container(60, 46);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-44, -20, 88, 40, 10);
    g.fillStyle(0xb472ff, 1);
    g.fillRoundedRect(-44, -22, 88, 40, 10);
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeRoundedRect(-44, -22, 88, 40, 10);
    const t = this.add
      .text(0, -2, "MENU", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    c.add([g, t]);
    c.setSize(88, 40);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => this.scene.start(SCENE_MENU));
    c.on("pointerover", () => c.setScale(1.08));
    c.on("pointerout", () => c.setScale(1));
  }

  private onCityClick(levelId: number): void {
    this.scene.start(SCENE_GAME, { levelId, fromMap: true });
  }
}
