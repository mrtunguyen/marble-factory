import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { LevelCompleteScene } from "./scenes/LevelCompleteScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { EditorScene } from "./scenes/EditorScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./game/constants";

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#1a1a2e",
      scene: [
        MenuScene,
        GameScene,
        LevelCompleteScene,
        GameOverScene,
        EditorScene,
      ],
      parent: containerRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      input: {
        mouse: {
          preventDefaultWheel: false,
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
