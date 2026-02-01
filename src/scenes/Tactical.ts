import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Tactical extends Phaser.Scene {
    private cursor!: Phaser.GameObjects.Rectangle;
    private debugText!: Phaser.GameObjects.Text;
    private crosshairTarget = new Phaser.Math.Vector2(0, 0);

    // Gameplay State
    private health: number = 100;
    private score: number = 0;
    private isGameOver: boolean = false;

    // Groups
    private enemies!: Phaser.GameObjects.Group;
    private missiles!: Phaser.GameObjects.Group;

    // UI
    private healthText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    constructor() {
        super('Tactical');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Right Viewport (50% to 100% width)
        this.cameras.main.setViewport(width / 2, 0, width / 2, height);
        this.cameras.main.setBackgroundColor('#1a0500'); // Dark Red Space

        // Starfield effect (simple)
        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, width / 2),
                Phaser.Math.Between(0, height),
                Phaser.Math.Between(1, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.1, 0.5)
            );
        }

        // --- UI Elements ---
        this.add.text(20, 20, 'TACTICAL VIEW', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ff4444', fontStyle: 'bold'
        });

        this.healthText = this.add.text(20, height - 50, `HULL: ${this.health}%`, {
            fontFamily: 'Courier', fontSize: '32px', color: '#00ff00', fontStyle: 'bold'
        });

        this.scoreText = this.add.text(width / 2 - 200, 20, `PTS: ${this.score}`, {
            fontFamily: 'Courier', fontSize: '32px', color: '#ffffff'
        });

        this.gameOverText = this.add.text(width / 4, height / 2, 'GAME OVER', {
            fontSize: '64px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);


        // --- Crosshair ---
        const cx = width / 4;
        const cy = height / 2;

        // Static HUD Overlay
        this.add.circle(cx, cy, 100).setStrokeStyle(2, 0x550000, 0.3);
        this.add.line(0, 0, cx - 120, cy, cx + 120, cy, 0x550000, 0.3);

        // Active Cursor
        this.crosshairTarget.set(cx, cy);
        this.cursor = this.add.rectangle(cx, cy, 40, 40).setStrokeStyle(3, 0x00ff00);

        this.debugText = this.add.text(20, 60, 'Waiting for Gunner...', { fontSize: '14px', color: '#555555' });

        // --- Gameplay Setup ---
        this.enemies = this.add.group();
        this.missiles = this.add.group();

        // Spawn Enemies every 3 seconds
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Global Event Listener for Shooting (triggered by HandTracker)
        this.game.events.on('FIRE', this.handleFire, this);
    }

    update(time: number, delta: number) {
        if (this.isGameOver) return;

        // --- Hand Tracking ---
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHands();
            const gunner = hands.gunner;

            if (gunner) {
                // Local coordinates for this camera (0 to width/2)
                const viewWidth = this.scale.width / 2;
                const viewHeight = this.scale.height;
                const targetX = gunner.x * viewWidth;
                const targetY = gunner.y * viewHeight;

                // Movement requires Index Finger Extension for better control
                if (gunner.indexExtended) {
                    this.crosshairTarget.x = targetX;
                    this.crosshairTarget.y = targetY;
                }

                // Gesture Logic
                if (gunner.gesture === 'GUN') {
                    this.cursor.setStrokeStyle(4, 0xffff00); // Yellow Aim

                    if (gunner.flickDetected) {
                        this.game.events.emit('FIRE');
                        this.cursor.setStrokeStyle(6, 0xffffff); // Flash White
                    }
                } else if (gunner.gesture === 'FIST') {
                    this.cursor.setStrokeStyle(2, 0xff0000); // Red Locked
                } else {
                    this.cursor.setStrokeStyle(2, 0x00ff00); // Green Idle
                }

                this.debugText.setText(`G: ${gunner.gesture} | IDX: ${gunner.indexExtended ? 'EXT' : 'CURL'}`);
            } else {
                this.debugText.setText('NO SIGNAL');
            }
        }

        // LERP crosshair (0.2 factor for snappy feel)
        this.cursor.x = Phaser.Math.Linear(this.cursor.x, this.crosshairTarget.x, 0.2);
        this.cursor.y = Phaser.Math.Linear(this.cursor.y, this.crosshairTarget.y, 0.2);


        // --- Entity Logic ---

        // 1. Move/Spawn Missiles from Enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            // Randomly fire missile
            if (Math.random() < 0.005) { // 0.5% chance per frame
                this.spawnMissile(enemy.x, enemy.y);
            }

            // Drift enemy
            enemy.x += Math.sin(time * 0.001 + enemy.id) * 0.5;
            enemy.y += Math.cos(time * 0.001 + enemy.id) * 0.5;
        });

        // 2. Move Missiles (Approaching screen)
        this.missiles.getChildren().forEach((missile: any) => {
            // Scale up to simulate getting closer
            missile.setScale(missile.scale + 0.015);

            // Move slightly towards center of screen (optional, creates parallax)
            const cx = this.scale.width / 4;
            const cy = this.scale.height / 2;
            missile.x = Phaser.Math.Linear(missile.x, cx, 0.002);
            missile.y = Phaser.Math.Linear(missile.y, cy, 0.002);

            // Hit Check
            if (missile.scale > 3.0) {
                // Impact!
                this.takeDamage(10);
                missile.destroy();
                this.cameras.main.shake(200, 0.02);
            }
        });
    }

    private spawnEnemy() {
        if (this.isGameOver) return;
        const viewWidth = this.scale.width / 2;
        const viewHeight = this.scale.height;

        const x = Phaser.Math.Between(50, viewWidth - 50);
        const y = Phaser.Math.Between(50, viewHeight - 50);

        const enemy = this.add.rectangle(x, y, 40, 30, 0x990000);
        (enemy as any).id = Math.random() * 100; // Offset for movement
        this.enemies.add(enemy);

        // Auto destroy after 15s if not killed
        this.time.delayedCall(15000, () => {
            if (enemy.active) enemy.destroy();
        });
    }

    private spawnMissile(startX: number, startY: number) {
        if (this.isGameOver) return;
        const missile = this.add.circle(startX, startY, 5, 0xffaa00);
        this.missiles.add(missile);
    }

    private handleFire() {
        if (this.isGameOver) return;

        // Raycast / Hit Test
        // Check overlap between Cursor and Entities
        const hitBox = new Phaser.Geom.Rectangle(this.cursor.x - 30, this.cursor.y - 30, 60, 60);

        let hit = false;

        // Prioritize Missiles
        this.missiles.getChildren().forEach((missile: any) => {
            if (Phaser.Geom.Rectangle.Contains(hitBox, missile.x, missile.y)) {
                missile.destroy();
                this.addScore(50);
                this.createExplosion(missile.x, missile.y, 0xffaa00);
                hit = true;
            }
        });

        if (!hit) {
            this.enemies.getChildren().forEach((enemy: any) => {
                if (Phaser.Geom.Rectangle.Contains(hitBox, enemy.x, enemy.y)) {
                    enemy.destroy();
                    this.addScore(100);
                    this.createExplosion(enemy.x, enemy.y, 0xff0000);
                    hit = true;
                }
            });
        }

        if (hit) {
            this.cameras.main.shake(50, 0.005);
        }
    }

    private createExplosion(x: number, y: number, color: number) {
        const particles = this.add.particles(x, y, 'flare', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: color
        });
        // Note: 'flare' texture needs to exist or use a shape. 
        // If not exists, Phaser uses a default square usually. 
        // We can use a graphic fallback if needed, but particles are fine.

        this.time.delayedCall(300, () => particles.destroy());
    }

    private takeDamage(amount: number) {
        this.health -= amount;
        this.healthText.setText(`HULL: ${Math.max(0, this.health)}%`);

        if (this.health <= 50) this.healthText.setColor('#ffaa00');
        if (this.health <= 20) this.healthText.setColor('#ff0000');

        if (this.health <= 0) {
            this.gameOver();
        }
    }

    private addScore(points: number) {
        this.score += points;
        this.scoreText.setText(`PTS: ${this.score}`);
    }

    private gameOver() {
        this.isGameOver = true;
        this.physics.pause(); // If physics were used
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(2000, 0, 0, 0);
    }
}
