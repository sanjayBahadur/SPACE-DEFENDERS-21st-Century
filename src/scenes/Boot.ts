import Phaser from "phaser";

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    document.getElementById("startup")?.remove();
    this.scene.start("MainMenu");
  }
}
