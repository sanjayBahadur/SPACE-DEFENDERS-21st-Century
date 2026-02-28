import Phaser from "phaser";
import { mountScreen } from "../ui/screens";

export class MissionLoad extends Phaser.Scene {
  constructor() {
    super("MissionLoad");
  }

  private failed = false;
  preload() {
    this.failed = false;
    const screen = mountScreen(
      this,
      `<section class="dialog-card"><p class="eyebrow">SYSTEMS CHECK</p><h1>Preparing your ship</h1><p id="load-status" role="status">Loading mission assets…</p><progress max="1" value="0" aria-label="Mission loading"></progress><p class="small-note">Assets stay cached for your next mission.</p><button id="retry-load" class="primary" hidden>Retry loading</button><button id="load-menu" class="secondary">Return to menu</button></section>`,
      true,
    );
    const progress = screen.querySelector("progress")!;
    const status = screen.querySelector("#load-status")!;
    const retry = screen.querySelector<HTMLButtonElement>("#retry-load")!;
    retry.addEventListener("click", () => this.scene.restart());
    screen
      .querySelector("#load-menu")!
      .addEventListener("click", () => this.scene.start("MainMenu"));
    const onProgress = (value: number) => {
      progress.value = value;
    };
    const onError = () => {
      this.failed = true;
      status.textContent =
        "An asset could not load. Check your connection and try again.";
      retry.hidden = false;
    };
    this.load.on("progress", onProgress);
    this.load.on("loaderror", onError);
    this.events.once("shutdown", () => {
      this.load.off("progress", onProgress);
      this.load.off("loaderror", onError);
    });
    // === PILOT ASSETS ===
    this.load.image(
      "pilotship1",
      `${import.meta.env.BASE_URL}assets/pilotship/pilotship1.webp`,
    );
    this.load.image(
      "pilotship2",
      `${import.meta.env.BASE_URL}assets/pilotship/pilotship2.webp`,
    );
    this.load.image(
      "pilotship3",
      `${import.meta.env.BASE_URL}assets/pilotship/pilotship3.webp`,
    );
    this.load.image(
      "pilotship4",
      `${import.meta.env.BASE_URL}assets/pilotship/pilotship4.webp`,
    );
    this.load.image(
      "pilotship5",
      `${import.meta.env.BASE_URL}assets/pilotship/pilotship5.webp`,
    );

    // Backgrounds
    this.load.image(
      "pannelV1",
      `${import.meta.env.BASE_URL}assets/backgrounds/PannelV1.webp`,
    );
    this.load.image(
      "pannelV2",
      `${import.meta.env.BASE_URL}assets/backgrounds/PannelV2.webp`,
    );

    // Obstacles - Meteors
    this.load.image(
      "meteor1",
      `${import.meta.env.BASE_URL}assets/obstacles/MeteorV1.1.webp`,
    );
    this.load.image(
      "meteor2",
      `${import.meta.env.BASE_URL}assets/obstacles/MeteorV1.2.webp`,
    );
    this.load.image(
      "meteor3",
      `${import.meta.env.BASE_URL}assets/obstacles/MeteorV1.3.webp`,
    );
    this.load.image(
      "meteor4",
      `${import.meta.env.BASE_URL}assets/obstacles/MeteorV1.4.webp`,
    );
    this.load.image(
      "blackhole",
      `${import.meta.env.BASE_URL}assets/obstacles/BlackholeV1.webp`,
    );

    // Deathray Monster
    this.load.image(
      "creature1",
      `${import.meta.env.BASE_URL}assets/deathray/CreatureV1.1.webp`,
    );
    this.load.image(
      "creature2",
      `${import.meta.env.BASE_URL}assets/deathray/CreatureV1.2.webp`,
    );
    this.load.image(
      "deathray1",
      `${import.meta.env.BASE_URL}assets/deathray/DeathrayV1.1.webp`,
    );
    this.load.image(
      "deathray2",
      `${import.meta.env.BASE_URL}assets/deathray/DeathrayV1.2.webp`,
    );
    this.load.image(
      "deathray3",
      `${import.meta.env.BASE_URL}assets/deathray/DeathrayV1.3.webp`,
    );
    this.load.image(
      "deathray4",
      `${import.meta.env.BASE_URL}assets/deathray/DeathrayV1.4.webp`,
    );

    // === GUNNER ASSETS ===
    this.load.image(
      "enemyV1",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV1.webp`,
    );
    this.load.image(
      "enemyV2",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV2.webp`,
    );
    this.load.image(
      "enemyV3_0",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV3.0.webp`,
    );
    this.load.image(
      "enemyV3_1",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV3.1.webp`,
    );
    this.load.image(
      "enemyV3_2",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV3.2.webp`,
    );
    this.load.image(
      "enemyV3_3",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV3.3.webp`,
    );
    this.load.image(
      "enemyV3_4",
      `${import.meta.env.BASE_URL}assets/enemyships/EnemyV3.4.webp`,
    );

    // === SHOTS ===
    // Standard Shot
    this.load.image(
      "shotV1_1",
      `${import.meta.env.BASE_URL}assets/shots/ShotV1.1.webp`,
    );
    this.load.image(
      "shotV1_2",
      `${import.meta.env.BASE_URL}assets/shots/ShotV1.2.webp`,
    );
    this.load.image(
      "shotV1_3",
      `${import.meta.env.BASE_URL}assets/shots/ShotV1.3.webp`,
    );
    this.load.image(
      "shotV1_4",
      `${import.meta.env.BASE_URL}assets/shots/ShotV1.4.webp`,
    );

    // Palm Cannon Shot
    this.load.image(
      "shotV2_1",
      `${import.meta.env.BASE_URL}assets/shots/ShotV2.1.webp`,
    );
    this.load.image(
      "shotV2_2",
      `${import.meta.env.BASE_URL}assets/shots/ShotV2.2.webp`,
    );
    this.load.image(
      "shotV2_3",
      `${import.meta.env.BASE_URL}assets/shots/ShotV2.3.webp`,
    );
    this.load.image(
      "shotV2_4",
      `${import.meta.env.BASE_URL}assets/shots/ShotV2.4.webp`,
    );
    this.load.image(
      "shotV2_5",
      `${import.meta.env.BASE_URL}assets/shots/ShotV2.5.webp`,
    );

    // === EFFECTS ===
    this.load.image(
      "explosionV1_1",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV1.1.webp`,
    );
    this.load.image(
      "explosionV1_2",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV1.2.webp`,
    );
    this.load.image(
      "explosionV1_3",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV1.3.webp`,
    );
    this.load.image(
      "explosionV1_4",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV1.4.webp`,
    );
    this.load.image(
      "explosionV2_1",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV2.1.webp`,
    );
    this.load.image(
      "explosionV2_2",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV2.2.webp`,
    );
    this.load.image(
      "explosionV2_3",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV2.3.webp`,
    );
    this.load.image(
      "explosionV2_4",
      `${import.meta.env.BASE_URL}assets/effects/ExplosionV2.4.webp`,
    );

    // === TITLE ASSET ===
    this.load.image(
      "pilotShield",
      `${import.meta.env.BASE_URL}assets/shield/ShieldV1.webp`,
    );
  }

  create() {
    if (this.failed) return;
    this.scene.start("Strategic");
    this.scene.launch("Tactical");
  }
}
