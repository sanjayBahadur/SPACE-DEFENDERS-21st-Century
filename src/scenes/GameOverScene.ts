import Phaser from "phaser";
import { mountScreen } from "../ui/screens";
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }
  create() {
    const score = Math.max(0, Number(this.registry.get("missionScore")) || 0);
    const seconds = Math.floor(
      Math.max(0, Number(this.registry.get("missionSeconds")) || 0),
    );
    const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    const outcome =
      this.registry.get("missionOutcome") === "Hull integrity lost"
        ? "Hull integrity lost"
        : "Gunner defenses breached";
    const screen = mountScreen(
      this,
      `<section class="dialog-card">
            <p class="eyebrow">MISSION REPORT</p><h1>Ship lost.<br><em>Return stronger.</em></h1>
            <dl class="mission-stats"><div><dt>Score</dt><dd>${score.toLocaleString()}</dd></div><div><dt>Time survived</dt><dd>${duration}</dd></div></dl>
            <p class="status">${outcome}</p>
            <p class="lede">Avoid hazards. Fire the cannon in bursts and let it cool between attacks.</p>
            <div class="dialog-actions"><button id="retry" class="primary">Retry mission</button>
            <button id="menu" class="secondary">Return to menu</button></div>
        </section>`,
      true,
    );
    const stopMission = () => {
      this.scene.stop("Strategic");
      this.scene.stop("Tactical");
    };
    screen.querySelector("#retry")!.addEventListener("click", () => {
      stopMission();
      this.scene.start("Strategic");
      this.scene.launch("Tactical");
    });
    screen.querySelector("#menu")!.addEventListener("click", () => {
      stopMission();
      this.scene.start("MainMenu");
    });
  }
}
