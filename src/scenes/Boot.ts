import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load common assets if needed
    }

    create() {
        // Launch both scenes in parallel
        this.scene.launch('Strategic');
        this.scene.launch('Tactical');
    }
}
