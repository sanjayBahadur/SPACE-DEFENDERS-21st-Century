import Phaser from "phaser";

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload() {
    this.load.image(
      "title",
      `${import.meta.env.BASE_URL}assets/titlescreen/SpaceDefenders.webp`,
    );
  }
  create() {
    document.getElementById("startup")?.remove();
    this.scene.start("MainMenu");
  }
}
