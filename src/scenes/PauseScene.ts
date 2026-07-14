import Phaser from "phaser";
import type { HandTracker } from "../services/HandTracker";
import { mountScreen, controlsMarkup } from "../ui/screens";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }
  create(data?: { reason?: string }) {
    this.registry.set("pausePending", false);
    const lost = data?.reason === "HAND_LOST";
    const screen = mountScreen(
      this,
      `<section class="dialog-card">
            <p class="eyebrow">MISSION CONTROL</p><h1>${lost ? "Tracking interrupted" : "Mission paused"}</h1>
            <p class="lede">${lost ? "Return your hands to camera view, or continue with keyboard & mouse." : "Take a breath. Your ship is holding position."}</p>
            ${controlsMarkup()}
            <div class="dialog-actions"><button id="resume" class="primary">Resume mission</button>
            <button id="fallback" class="secondary">Use keyboard & mouse</button>
            <button id="menu" class="text-button">End mission & return to menu</button></div>
        </section>`,
      true,
    );
    const resume = () => {
      this.registry.set("manualKeyboardOverride", true);
      this.scene.resume("Tactical");
      this.scene.resume("Strategic");
      this.scene.stop();
    };
    screen.querySelector("#resume")!.addEventListener("click", resume);
    screen.querySelector("#fallback")!.addEventListener("click", () => {
      (this.registry.get("handTracker") as HandTracker).stop();
      this.registry.set("keyboardMode", true);
      resume();
    });
    screen.querySelector("#menu")!.addEventListener("click", () => {
      this.scene.stop("Strategic");
      this.scene.stop("Tactical");
      this.scene.start("MainMenu");
    });
    const keyResume = (event: KeyboardEvent) => {
      if (!event.repeat) resume();
    };
    this.input.keyboard?.on("keydown-ESC", keyResume);
    this.input.keyboard?.on("keydown-P", keyResume);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown-ESC", keyResume);
      this.input.keyboard?.off("keydown-P", keyResume);
    });
  }
}
