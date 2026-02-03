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

        // Backgrounds
        this.load.image('pannelV1', 'src/assets/backgrounds copy/PannelV1.png');
        this.load.image('pannelV2', 'src/assets/backgrounds copy/PannelV2.jpg');

        // Obstacles - Meteors
        this.load.image('meteor1', 'src/assets/obstacles copy/MeteorV1.1.png');
        this.load.image('meteor2', 'src/assets/obstacles copy/MeteorV1.2.png');
        this.load.image('meteor3', 'src/assets/obstacles copy/MeteorV1.3.png');
        this.load.image('meteor4', 'src/assets/obstacles copy/MeteorV1.4.png');
        this.load.image('blackhole', 'src/assets/obstacles copy/BlackholeV1.png');

        // Deathray Monster
        this.load.image('creature1', 'src/assets/deathray copy/CreatureV1.1.png');
        this.load.image('creature2', 'src/assets/deathray copy/CreatureV1.2.png');
        this.load.image('deathray1', 'src/assets/deathray copy/DeathrayV1.1.png');
        this.load.image('deathray2', 'src/assets/deathray copy/DeathrayV1.2.png');
        this.load.image('deathray3', 'src/assets/deathray copy/DeathrayV1.3.png');
        this.load.image('deathray4', 'src/assets/deathray copy/DeathrayV1.4.png');

        // === GUNNER ASSETS ===
        this.load.image('enemyV1', 'src/assets/enemyships/EnemyV1.png');
        this.load.image('enemyV2', 'src/assets/enemyships/EnemyV2.png');
        this.load.image('enemyV3_0', 'src/assets/enemyships/EnemyV3.0.png');
        this.load.image('enemyV3_1', 'src/assets/enemyships/EnemyV3.1.png');
        this.load.image('enemyV3_2', 'src/assets/enemyships/EnemyV3.2.png');
        this.load.image('enemyV3_3', 'src/assets/enemyships/EnemyV3.3.png');
        this.load.image('enemyV3_4', 'src/assets/enemyships/EnemyV3.4.png');

        // === EFFECTS ===
        this.load.image('explosionV1_1', 'src/assets/effects/ExplosionV1.1.png');
        this.load.image('explosionV1_2', 'src/assets/effects/ExplosionV1.2.png');
        this.load.image('explosionV1_3', 'src/assets/effects/ExplosionV1.3.png');
        this.load.image('explosionV1_4', 'src/assets/effects/ExplosionV1.4.png');
        this.load.image('explosionV2_1', 'src/assets/effects/ExplosionV2.1.png');
        this.load.image('explosionV2_2', 'src/assets/effects/ExplosionV2.2.png');
        this.load.image('explosionV2_3', 'src/assets/effects/ExplosionV2.3.png');
        this.load.image('explosionV2_4', 'src/assets/effects/ExplosionV2.4.png');
    }

    create() {
        this.scene.launch('Strategic');
        this.scene.launch('Tactical');
    }
}
