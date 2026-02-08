import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // === PILOT ASSETS ===
        this.load.image('pilotship1', '/assets/pilotship/pilotship1.png');
        this.load.image('pilotship2', '/assets/pilotship/pilotship2.png');
        this.load.image('pilotship3', '/assets/pilotship/pilotship3.png');
        this.load.image('pilotship4', '/assets/pilotship/pilotship4.png');
        this.load.image('pilotship5', '/assets/pilotship/pilotship5.png');

        // Backgrounds
        this.load.image('pannelV1', '/assets/backgrounds/PannelV1.png');
        this.load.image('pannelV2', '/assets/backgrounds/PannelV2.jpg');

        // Obstacles - Meteors
        this.load.image('meteor1', '/assets/obstacles/MeteorV1.1.png');
        this.load.image('meteor2', '/assets/obstacles/MeteorV1.2.png');
        this.load.image('meteor3', '/assets/obstacles/MeteorV1.3.png');
        this.load.image('meteor4', '/assets/obstacles/MeteorV1.4.png');
        this.load.image('blackhole', '/assets/obstacles/BlackholeV1.png');

        // Deathray Monster
        this.load.image('creature1', '/assets/deathray/CreatureV1.1.png');
        this.load.image('creature2', '/assets/deathray/CreatureV1.2.png');
        this.load.image('deathray1', '/assets/deathray/DeathrayV1.1.png');
        this.load.image('deathray2', '/assets/deathray/DeathrayV1.2.png');
        this.load.image('deathray3', '/assets/deathray/DeathrayV1.3.png');
        this.load.image('deathray4', '/assets/deathray/DeathrayV1.4.png');

        // === GUNNER ASSETS ===
        this.load.image('enemyV1', '/assets/enemyships/EnemyV1.png');
        this.load.image('enemyV2', '/assets/enemyships/EnemyV2.png');
        this.load.image('enemyV3_0', '/assets/enemyships/EnemyV3.0.png');
        this.load.image('enemyV3_1', '/assets/enemyships/EnemyV3.1.png');
        this.load.image('enemyV3_2', '/assets/enemyships/EnemyV3.2.png');
        this.load.image('enemyV3_3', '/assets/enemyships/EnemyV3.3.png');
        this.load.image('enemyV3_4', '/assets/enemyships/EnemyV3.4.png');

        // === SHOTS ===
        // Standard Shot
        this.load.image('shotV1_1', '/assets/shots/ShotV1.1.png');
        this.load.image('shotV1_2', '/assets/shots/ShotV1.2.png');
        this.load.image('shotV1_3', '/assets/shots/ShotV1.3.png');
        this.load.image('shotV1_4', '/assets/shots/ShotV1.4.png');

        // Palm Cannon Shot
        this.load.image('shotV2_1', '/assets/shots/Shotv2.1.png'); // Note lowercase 'v' in filename based on find_by_name
        this.load.image('shotV2_2', '/assets/shots/ShotV2.2.png');
        this.load.image('shotV2_3', '/assets/shots/ShotV2.3.png');
        this.load.image('shotV2_4', '/assets/shots/ShotV2.4.png');
        this.load.image('shotV2_5', '/assets/shots/ShotV2.5.png');

        // === EFFECTS ===
        this.load.image('explosionV1_1', '/assets/effects/ExplosionV1.1.png');
        this.load.image('explosionV1_2', '/assets/effects/ExplosionV1.2.png');
        this.load.image('explosionV1_3', '/assets/effects/ExplosionV1.3.png');
        this.load.image('explosionV1_4', '/assets/effects/ExplosionV1.4.png');
        this.load.image('explosionV2_1', '/assets/effects/ExplosionV2.1.png');
        this.load.image('explosionV2_2', '/assets/effects/ExplosionV2.2.png');
        this.load.image('explosionV2_3', '/assets/effects/ExplosionV2.3.png');
        this.load.image('explosionV2_3', '/assets/effects/ExplosionV2.3.png');
        this.load.image('explosionV2_4', '/assets/effects/ExplosionV2.4.png');

        // === TITLE ASSET ===
        this.load.image('title', '/assets/titlescreen/SpaceDefenders.png');
    }

    create() {
        this.scene.start('MainMenu');
    }
}
