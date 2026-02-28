import Phaser from "phaser";
import type { HandTracker } from "../services/HandTracker";
import { mountScreen, controlsMarkup } from "../ui/screens";

export class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }
  create() {
    const tracker = this.registry.get("handTracker") as HandTracker;
    tracker.stop();
    this.registry.set("keyboardMode", true);
    this.registry.set("manualKeyboardOverride", true);
    const screen = mountScreen(
      this,
      `
            <div class="menu-layout">
                <section class="mission-intro">
                    <p class="eyebrow">ORBITAL DEFENSE COMMAND <span>BUILD 0.9</span></p>
                    <img class="game-logo" src="${import.meta.env.BASE_URL}assets/titlescreen/SpaceDefenders.webp" alt="Space Defenders: 21st Century">
                    <h1>One ship.<br>Two stations.<br><em>You’re the crew.</em></h1>
                    <p class="lede">Navigate the debris field. Lock onto incoming threats. Keep your ship alive.</p>
                    <div class="mission-tags"><span>01 / PILOT</span><span>02 / GUNNER</span><span>SURVIVAL ARCADE</span></div>
                </section>
                <section class="command-card" aria-labelledby="prepare-title">
                    <p class="eyebrow">MISSION PREPARATION</p>
                    <h2 id="prepare-title">Choose your controls</h2>
                    <div class="mode-options" role="group" aria-label="Control mode">
                        <button id="keyboard-mode" class="mode selected" aria-pressed="true"><strong>Keyboard & mouse</strong><span>Ready immediately · no camera</span></button>
                        <button id="gesture-mode" class="mode" aria-pressed="false"><strong>Hand gestures</strong><span>Enable your camera to fly hands-free</span></button>
                    </div>
                    <p id="camera-status" class="status" role="status">Keyboard & mouse ready. Your camera is off.</p>
                    ${controlsMarkup()}
                    <button id="start-mission" class="primary">Launch mission <span aria-hidden="true">↗</span></button>
                    <p class="small-note">Best played on desktop in landscape. Press Esc to pause.</p>
                    <button id="credits" class="text-button">Credits & technology</button>
                </section>
            </div>`,
    );
    const keyboard = screen.querySelector<HTMLButtonElement>("#keyboard-mode")!;
    const gesture = screen.querySelector<HTMLButtonElement>("#gesture-mode")!;
    const start = screen.querySelector<HTMLButtonElement>("#start-mission")!;
    const status = screen.querySelector<HTMLElement>("#camera-status")!;
    let request = 0;
    let launching = false;
    this.events.once("shutdown", () => {
      request++;
      if (!launching) tracker.stop();
    });
    const selectMode = (useKeyboard: boolean) => {
      this.registry.set("keyboardMode", useKeyboard);
      this.registry.set("manualKeyboardOverride", useKeyboard);
      keyboard.classList.toggle("selected", useKeyboard);
      gesture.classList.toggle("selected", !useKeyboard);
      keyboard.setAttribute("aria-pressed", String(useKeyboard));
      gesture.setAttribute("aria-pressed", String(!useKeyboard));
    };
    keyboard.addEventListener("click", () => {
      request++;
      tracker.stop();
      selectMode(true);
      start.disabled = false;
      gesture.disabled = false;
      status.textContent = "Keyboard & mouse ready. Your camera is off.";
    });
    gesture.addEventListener("click", async () => {
      const currentRequest = ++request;
      start.disabled = true;
      gesture.disabled = true;
      status.textContent =
        "Allow camera access. Preparing hand tracking… You can switch back at any time.";
      try {
        await tracker.init();
        if (currentRequest !== request || !screen.isConnected) return;
        selectMode(false);
        status.textContent =
          "Camera ready. Left hand pilots; right hand aims. Keyboard & mouse remain available.";
      } catch {
        if (currentRequest !== request || !screen.isConnected) return;
        selectMode(true);
        status.textContent = `${tracker.getError() ?? "Camera unavailable."} Keyboard & mouse are ready.`;
      } finally {
        if (currentRequest === request && screen.isConnected) {
          start.disabled = false;
          gesture.disabled = false;
        }
      }
    });
    start.addEventListener("click", () => {
      start.disabled = true;
      launching = true;
      this.scene.start("MissionLoad");
    });
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (
          this.registry.get("keyboardMode") === false &&
          tracker.getStatus() !== "ready"
        ) {
          selectMode(true);
          status.textContent = `${tracker.getError() ?? "Tracking stopped."} Keyboard & mouse are ready.`;
        }
      },
    });
    screen
      .querySelector("#credits")!
      .addEventListener("click", () => this.scene.start("Credits"));
  }
}
