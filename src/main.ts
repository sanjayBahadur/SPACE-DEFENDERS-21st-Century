import Phaser from "phaser";
import { gameAudio } from "./services/GameAudio";
import "./style.css";
import { Boot } from "./scenes/Boot";
import { MissionLoad } from "./scenes/MissionLoad";
import { MissionBriefing } from "./scenes/MissionBriefing";
import { Strategic } from "./scenes/Strategic";
import { Tactical } from "./scenes/Tactical";
import { MainMenu } from "./scenes/MainMenu";
import { Credits } from "./scenes/Credits";
import { PauseScene } from "./scenes/PauseScene";
import { HandTracker } from "./services/HandTracker";

import { GameOverScene } from "./scenes/GameOverScene";

// Initialize HandTracker
const handTracker = new HandTracker();
// Camera access is requested only from the control selection menu.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720, // 16:9 ratio
  parent: "app",
  dom: {
    createContainer: true,
  },
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Boot scene launches the others
  scene: [
    Boot,
    MainMenu,
    MissionLoad,
    MissionBriefing,
    Strategic,
    Tactical,
    Credits,
    PauseScene,
    GameOverScene,
  ],
  callbacks: {
    postBoot: (gameInstance) => {
      // Expose tracker to scenes via registry
      gameInstance.registry.set("handTracker", handTracker);
      gameAudio.install();
    },
  },
};

export const game = new Phaser.Game(config);

// Keep missions fair when the window loses focus or becomes hidden.
const pauseOnLeave = () => {
  if (
    !game.scene.isActive("Strategic") ||
    game.scene.isActive("PauseScene") ||
    game.scene.isActive("GameOverScene") ||
    game.registry.get("pausePending")
  )
    return;
  game.registry.set("pausePending", true);
  game.scene.pause("Strategic");
  game.scene.pause("Tactical");
  game.scene.start("PauseScene", { reason: "FOCUS_LOST" });
};
window.addEventListener("blur", pauseOnLeave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseOnLeave();
});
window.addEventListener("pagehide", () => handTracker.stop());
