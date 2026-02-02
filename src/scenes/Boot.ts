import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // === PILOT ASSETS ===
        this.load.image('pilotship1', 'src/assets/pilotship/pilotship1.png');
        this.load.image('pilotship2', 'src/assets/pilotship/pilotship2.png');
        this.load.image('pilotship3', 'src/assets/pilotship/pilotship3.png');
        this.load.image('pilotship4', 'src/assets/pilotship/pilotship4.png');
        this.load.image('pilotship5', 'src/assets/pilotship/pilotship5.png');
        this.load.image('pannelV1', 'src/assets/backgrounds/PannelV1.png');
        this.load.image('blackhole', 'src/assets/obstacles/BlackholeV1.png');

        // === GUNNER ASSETS ===
        this.load.image('enemyV1', 'src/assets/enemyships/EnemyV1.png');
        this.load.image('enemyV2', 'src/assets/enemyships/EnemyV2.png');
        this.load.image('deathray1', 'src/assets/deathray/deathray1.png');
        this.load.image('deathray2', 'src/assets/deathray/deathray2.png');
        this.load.image('deathray3', 'src/assets/deathray/deathray3.png');
    }

    create() {
        // Launch both scenes in parallel
        this.scene.launch('Strategic');
        this.scene.launch('Tactical');
    }
}
