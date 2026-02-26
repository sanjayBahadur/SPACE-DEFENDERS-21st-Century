import Phaser from "phaser";
import { mountScreen } from "../ui/screens";
export class Credits extends Phaser.Scene {
  constructor() {
    super("Credits");
  }
  create() {
    const screen = mountScreen(
      this,
      `<section class="dialog-card credits-card">
            <p class="eyebrow">THE CREW BEHIND THE MISSION</p><h1>Space Defenders</h1>
            <h2>Created by Sanjay Malla</h2><p class="lede">sanjayBahadur</p>
            <h3>Built with</h3><p>Phaser 3 · MediaPipe Hands · TypeScript · Vite</p>
            <h3>Special thanks</h3><p>Maddiem, Naviya, and the open source contributors.</p>
            <button id="back" class="primary">Return to mission control</button>
        </section>`,
      true,
    );
    screen
      .querySelector("#back")!
      .addEventListener("click", () => this.scene.start("MainMenu"));
  }
}
