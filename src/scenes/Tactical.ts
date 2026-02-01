import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Tactical extends Phaser.Scene {
    // Crosshair
    private crosshair!: Phaser.GameObjects.Container;
    private crosshairTarget = new Phaser.Math.Vector2(0, 0);

    // Gameplay State
    private shieldLevel: number = 100;
    private score: number = 0;
    private enemyCount: number = 0;
    private lives: number = 3;
    private isGameOver: boolean = false;

    // Entity Groups
    private enemies!: Phaser.GameObjects.Group;
    private missiles!: Phaser.GameObjects.Group;

    // HUD Elements
    private scoreText!: Phaser.GameObjects.Text;
    private shieldBar!: Phaser.GameObjects.Rectangle;
    private shieldBarBg!: Phaser.GameObjects.Rectangle;
    private enemyCountText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private debugText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    // Starfield
    private stars: Phaser.GameObjects.Arc[] = [];

    constructor() {
        super('Tactical');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const vw = width / 2; // Viewport width
        const vh = height;    // Viewport height

        // Right Viewport (50% to 100% width)
        this.cameras.main.setViewport(width / 2, 0, vw, vh);
        this.cameras.main.setBackgroundColor('#000005'); // Deep Space Black

        // === STARFIELD ===
        for (let i = 0; i < 150; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 1.0)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.5, 2);
            this.stars.push(star);
        }

        // === COCKPIT FRAME (Simplified Visual) ===
        const frameColor = 0x1a2a3a;
        // Top arc hint
        this.add.arc(vw / 2, -vh * 0.3, vh * 0.8, 30, 150, false, frameColor, 0.8);
        // Bottom console bar
        this.add.rectangle(vw / 2, vh - 40, vw, 80, frameColor, 0.9);

        // === HUD ===
        // Score (Bottom Left)
        this.add.text(20, vh - 70, 'SCORE', { fontFamily: 'Courier', fontSize: '14px', color: '#00ff00' });
        this.scoreText = this.add.text(20, vh - 50, '0', { fontFamily: 'Courier', fontSize: '24px', color: '#00ff00' });

        // Shields Bar (Bottom Center)
        this.add.text(vw / 2 - 80, vh - 70, 'SHIELDS', { fontFamily: 'Courier', fontSize: '14px', color: '#ffff00' });
        this.shieldBarBg = this.add.rectangle(vw / 2 + 40, vh - 55, 120, 16, 0x333333);
        this.shieldBar = this.add.rectangle(vw / 2 + 40, vh - 55, 120, 16, 0x00ff00);

        // Enemies (Top Right)
        this.add.text(vw - 100, 20, 'ENEMIES', { fontFamily: 'Courier', fontSize: '14px', color: '#ff4444' });
        this.enemyCountText = this.add.text(vw - 100, 40, '0', { fontFamily: 'Courier', fontSize: '24px', color: '#ff4444' });

        // Lives (Bottom Right)
        this.add.text(vw - 80, vh - 70, 'LIVES', { fontFamily: 'Courier', fontSize: '14px', color: '#ff4444' });
        this.livesText = this.add.text(vw - 80, vh - 50, '♥♥♥', { fontFamily: 'Courier', fontSize: '24px', color: '#ff4444' });

        // Debug
        this.debugText = this.add.text(20, 20, 'STANDBY', { fontSize: '12px', color: '#555555' });

        // Game Over
        this.gameOverText = this.add.text(vw / 2, vh / 2, 'GAME OVER', {
            fontSize: '48px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === CROSSHAIR ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.crosshairTarget.set(cx, cy);

        this.crosshair = this.add.container(cx, cy);
        // Outer ring
        this.crosshair.add(this.add.circle(0, 0, 50).setStrokeStyle(2, 0x00ff00, 0.5));
        // Inner ring
        this.crosshair.add(this.add.circle(0, 0, 20).setStrokeStyle(2, 0x00ff00, 0.8));
        // Center dot
        this.crosshair.add(this.add.circle(0, 0, 4, 0x00ff00));
        // Crosshair lines
        this.crosshair.add(this.add.line(0, 0, -60, 0, -25, 0, 0x00ff00, 0.8));
        this.crosshair.add(this.add.line(0, 0, 25, 0, 60, 0, 0x00ff00, 0.8));
        this.crosshair.add(this.add.line(0, 0, 0, -60, 0, -25, 0x00ff00, 0.8));
        this.crosshair.add(this.add.line(0, 0, 0, 25, 0, 60, 0x00ff00, 0.8));

        // === GAMEPLAY GROUPS ===
        this.enemies = this.add.group();
        this.missiles = this.add.group();

        // Spawn Timer
        this.time.addEvent({ delay: 2500, callback: this.spawnEnemy, callbackScope: this, loop: true });

        // Listen for FIRE
        this.game.events.on('FIRE', this.handleFire, this);
    }

    update(time: number, _delta: number) {
        if (this.isGameOver) return;

        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // --- Starfield Animation (Hyperspace Effect) ---
        this.stars.forEach(star => {
            star.y += (star as any).speed;
            if (star.y > vh) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, vw);
            }
        });

        // --- Hand Tracking ---
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHands();
            const gunner = hands.gunner;

            if (gunner) {
                const targetX = gunner.x * vw;
                const targetY = gunner.y * vh;

                if (gunner.indexExtended) {
                    this.crosshairTarget.set(targetX, targetY);
                }

                // Visual feedback
                const innerRing = this.crosshair.getAt(1) as Phaser.GameObjects.Arc;
                if (gunner.gesture === 'GUN') {
                    innerRing.setStrokeStyle(3, 0xffff00);
                    if (gunner.flickDetected) {
                        this.game.events.emit('FIRE');
                        innerRing.setStrokeStyle(4, 0xffffff);
                    }
                } else {
                    innerRing.setStrokeStyle(2, 0x00ff00);
                }
                this.debugText.setText(`G: ${gunner.gesture} | LOCK: ${gunner.indexExtended ? 'ON' : 'OFF'}`);
            } else {
                this.debugText.setText('NO SIGNAL');
            }
        }

        // LERP Crosshair
        this.crosshair.x = Phaser.Math.Linear(this.crosshair.x, this.crosshairTarget.x, 0.2);
        this.crosshair.y = Phaser.Math.Linear(this.crosshair.y, this.crosshairTarget.y, 0.2);

        // --- Enemy Behavior ---
        this.enemies.getChildren().forEach((enemy: any) => {
            // Drift
            enemy.x += Math.sin(time * 0.001 + enemy.driftOffset) * 0.3;
            enemy.y += Math.cos(time * 0.0015 + enemy.driftOffset) * 0.2;
            // Spawn Missiles
            if (Math.random() < 0.003) this.spawnMissile(enemy.x, enemy.y);
        });

        // --- Missile Behavior ---
        this.missiles.getChildren().forEach((missile: any) => {
            // Scale up (approaching)
            missile.setScale(missile.scale + 0.02);
            // Slight drift towards center
            missile.x = Phaser.Math.Linear(missile.x, vw / 2, 0.003);
            missile.y = Phaser.Math.Linear(missile.y, vh / 2, 0.003);

            // Impact Check
            if (missile.scale > 2.5) {
                this.takeDamage();
                this.createImpact(missile.x, missile.y);
                missile.destroy();
            }
        });

        // Update HUD
        this.enemyCountText.setText(String(this.enemies.getLength()));
    }

    private spawnEnemy() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(60, vw - 60);
        const y = Phaser.Math.Between(60, vh / 2);

        // Enemy shape (TIE Fighter inspired diamond)
        const enemy = this.add.polygon(x, y, [0, -15, 10, 0, 0, 15, -10, 0], 0x444466);
        enemy.setStrokeStyle(1, 0x8888aa);
        (enemy as any).driftOffset = Math.random() * 100;
        this.enemies.add(enemy);
        this.enemyCount++;

        this.time.delayedCall(12000, () => { if (enemy.active) enemy.destroy(); });
    }

    private spawnMissile(startX: number, startY: number) {
        if (this.isGameOver) return;
        const missile = this.add.circle(startX, startY, 4, 0xff3300);
        missile.setStrokeStyle(2, 0xffaa00);
        this.missiles.add(missile);
    }

    private handleFire() {
        if (this.isGameOver) return;

        // Generous hit detection
        const hitRadius = 70; // Generous radius
        const cx = this.crosshair.x;
        const cy = this.crosshair.y;

        let hitSomething = false;

        // Check Missiles FIRST (priority target)
        const missilesToDestroy: Phaser.GameObjects.Arc[] = [];
        this.missiles.getChildren().forEach((missile: any) => {
            const scaledRadius = 4 * missile.scale; // Account for growing size
            const dist = Phaser.Math.Distance.Between(cx, cy, missile.x, missile.y);
            if (dist < hitRadius + scaledRadius) {
                missilesToDestroy.push(missile);
                hitSomething = true;
            }
        });
        missilesToDestroy.forEach(m => {
            this.addScore(25);
            this.createExplosion(m.x, m.y, 0xff6600);
            m.destroy();
        });

        // Check Enemies
        const enemiesToDestroy: Phaser.GameObjects.Polygon[] = [];
        this.enemies.getChildren().forEach((enemy: any) => {
            const dist = Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y);
            if (dist < hitRadius + 20) { // Enemy hitbox ~20px
                enemiesToDestroy.push(enemy);
                hitSomething = true;
            }
        });
        enemiesToDestroy.forEach(e => {
            this.addScore(100);
            this.createExplosion(e.x, e.y, 0xffff00);
            e.destroy();
        });

        if (hitSomething) {
            this.cameras.main.shake(40, 0.003);
        }
    }

    private createExplosion(x: number, y: number, color: number) {
        // Simple burst of circles
        for (let i = 0; i < 8; i++) {
            const particle = this.add.circle(x, y, Phaser.Math.Between(3, 8), color);
            const angle = (i / 8) * Math.PI * 2;
            const speed = Phaser.Math.Between(50, 150);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }
    }

    private createImpact(x: number, y: number) {
        // Screen flash effect
        const flash = this.add.rectangle(this.scale.width / 4, this.scale.height / 2, this.scale.width / 2, this.scale.height, 0xff0000, 0.3);
        this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
        this.cameras.main.shake(150, 0.015);
    }

    private takeDamage() {
        this.shieldLevel -= 20;
        if (this.shieldLevel < 0) this.shieldLevel = 0;

        // Update bar
        const barWidth = (this.shieldLevel / 100) * 120;
        this.shieldBar.width = barWidth;
        this.shieldBar.x = this.scale.width / 4 + 40 - (120 - barWidth) / 2;

        // Color change
        if (this.shieldLevel <= 40) this.shieldBar.setFillStyle(0xffaa00);
        if (this.shieldLevel <= 20) this.shieldBar.setFillStyle(0xff0000);

        if (this.shieldLevel <= 0) {
            this.lives--;
            this.updateLives();
            if (this.lives > 0) {
                this.shieldLevel = 100;
                this.shieldBar.width = 120;
                this.shieldBar.setFillStyle(0x00ff00);
            } else {
                this.gameOver();
            }
        }
    }

    private updateLives() {
        this.livesText.setText('♥'.repeat(Math.max(0, this.lives)));
    }

    private addScore(points: number) {
        this.score += points;
        this.scoreText.setText(String(this.score));
    }

    private gameOver() {
        this.isGameOver = true;
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(3000, 0, 0, 0);
    }
}
