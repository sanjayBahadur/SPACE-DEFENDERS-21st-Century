import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Tactical extends Phaser.Scene {
    // Crosshair & Targeting
    private crosshair!: Phaser.GameObjects.Container;
    private crosshairTarget = new Phaser.Math.Vector2(0, 0);
    private lockBracket!: Phaser.GameObjects.Container;
    private lockedTarget: Phaser.GameObjects.GameObject | null = null;

    // Gameplay State
    private shieldLevel: number = 100;
    private score: number = 0;
    private lives: number = 3;
    private isGameOver: boolean = false;

    // Entity Groups
    private enemies!: Phaser.GameObjects.Group;
    private missiles!: Phaser.GameObjects.Group;

    // HUD Elements
    private lockStatusText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private shieldBar!: Phaser.GameObjects.Rectangle;
    private shieldBarBg!: Phaser.GameObjects.Rectangle;
    private lockCountText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private debugText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    // Starfield
    private stars: Phaser.GameObjects.Arc[] = [];

    // Constants
    private readonly AIM_ASSIST_RADIUS = 100; // Snap distance
    private readonly LOCK_BRACKET_SIZE = 40;

    constructor() {
        super('Tactical');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const vw = width / 2;
        const vh = height;

        this.cameras.main.setViewport(width / 2, 0, vw, vh);
        this.cameras.main.setBackgroundColor('#050002'); // Deep red-tinted black

        // === STARFIELD ===
        for (let i = 0; i < 120; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.5, 1.5),
                0xff4444,
                Phaser.Math.FloatBetween(0.1, 0.4)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.3, 1.5);
            this.stars.push(star);
        }

        // === VIEWPORT BORDER (Red Frame) ===
        const borderColor = 0xff2222;
        // Outer frame corners (L-shaped brackets like reference)
        const cornerSize = 80;
        const cornerThickness = 3;
        // Top-Left
        this.add.rectangle(cornerThickness / 2, cornerSize / 2, cornerThickness, cornerSize, borderColor, 0.6);
        this.add.rectangle(cornerSize / 2, cornerThickness / 2, cornerSize, cornerThickness, borderColor, 0.6);
        // Top-Right
        this.add.rectangle(vw - cornerThickness / 2, cornerSize / 2, cornerThickness, cornerSize, borderColor, 0.6);
        this.add.rectangle(vw - cornerSize / 2, cornerThickness / 2, cornerSize, cornerThickness, borderColor, 0.6);
        // Bottom-Left
        this.add.rectangle(cornerThickness / 2, vh - cornerSize / 2, cornerThickness, cornerSize, borderColor, 0.6);
        this.add.rectangle(cornerSize / 2, vh - cornerThickness / 2, cornerSize, cornerThickness, borderColor, 0.6);
        // Bottom-Right
        this.add.rectangle(vw - cornerThickness / 2, vh - cornerSize / 2, cornerThickness, cornerSize, borderColor, 0.6);
        this.add.rectangle(vw - cornerSize / 2, vh - cornerThickness / 2, cornerSize, cornerThickness, borderColor, 0.6);

        // === HUD (Red Theme) ===
        // Lock Status (Top Left - like "TARGET LOCK ON")
        this.lockStatusText = this.add.text(20, 20, 'SCANNING...', {
            fontFamily: 'Courier', fontSize: '18px', color: '#ff4444'
        });

        // Score (Bottom Left)
        this.add.text(20, vh - 70, 'SCORE', { fontFamily: 'Courier', fontSize: '12px', color: '#888888' });
        this.scoreText = this.add.text(20, vh - 50, '000', { fontFamily: 'Courier', fontSize: '20px', color: '#ff6666' });

        // Shields Bar (Bottom Center)
        this.add.text(vw / 2 - 60, vh - 70, 'SHIELDS', { fontFamily: 'Courier', fontSize: '12px', color: '#888888' });
        this.shieldBarBg = this.add.rectangle(vw / 2, vh - 50, 120, 12, 0x330000);
        this.shieldBar = this.add.rectangle(vw / 2, vh - 50, 120, 12, 0xff3333);

        // Lock Counter (Top Right)
        this.add.text(vw - 80, 20, 'LOCK', { fontFamily: 'Courier', fontSize: '12px', color: '#888888' });
        this.lockCountText = this.add.text(vw - 80, 38, '000', { fontFamily: 'Courier', fontSize: '20px', color: '#ff6666' });

        // Lives (Bottom Right)
        this.add.text(vw - 80, vh - 70, 'LIVES', { fontFamily: 'Courier', fontSize: '12px', color: '#888888' });
        this.livesText = this.add.text(vw - 80, vh - 50, '♥♥♥', { fontFamily: 'Courier', fontSize: '20px', color: '#ff4444' });

        // Debug
        this.debugText = this.add.text(20, 45, '', { fontSize: '10px', color: '#444444' });

        // Game Over
        this.gameOverText = this.add.text(vw / 2, vh / 2, 'GAME OVER', {
            fontSize: '48px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === LOCK BRACKET (Follows locked target) ===
        this.lockBracket = this.add.container(-100, -100); // Start offscreen
        const bs = this.LOCK_BRACKET_SIZE;
        // Four corner brackets (like reference image)
        // Top-left corner
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, -bs / 2, -bs / 2 + 15, -bs / 2, 0xff4444, 0.9));
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, -bs / 2, -bs / 2, -bs / 2 + 15, 0xff4444, 0.9));
        // Top-right corner
        this.lockBracket.add(this.add.line(0, 0, bs / 2, -bs / 2, bs / 2 - 15, -bs / 2, 0xff4444, 0.9));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, -bs / 2, bs / 2, -bs / 2 + 15, 0xff4444, 0.9));
        // Bottom-left corner
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, bs / 2, -bs / 2 + 15, bs / 2, 0xff4444, 0.9));
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, bs / 2, -bs / 2, bs / 2 - 15, 0xff4444, 0.9));
        // Bottom-right corner
        this.lockBracket.add(this.add.line(0, 0, bs / 2, bs / 2, bs / 2 - 15, bs / 2, 0xff4444, 0.9));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, bs / 2, bs / 2, bs / 2 - 15, 0xff4444, 0.9));
        this.lockBracket.setVisible(false);

        // === CROSSHAIR (Simpler, red theme) ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.crosshairTarget.set(cx, cy);

        this.crosshair = this.add.container(cx, cy);
        // Center reticle (small square like reference)
        this.crosshair.add(this.add.rectangle(0, 0, 16, 16).setStrokeStyle(2, 0xff4444, 0.8));
        this.crosshair.add(this.add.circle(0, 0, 3, 0xff4444));
        // Cross lines
        this.crosshair.add(this.add.line(0, 0, -40, 0, -12, 0, 0xff4444, 0.6));
        this.crosshair.add(this.add.line(0, 0, 12, 0, 40, 0, 0xff4444, 0.6));
        this.crosshair.add(this.add.line(0, 0, 0, -40, 0, -12, 0xff4444, 0.6));
        this.crosshair.add(this.add.line(0, 0, 0, 12, 0, 40, 0xff4444, 0.6));

        // === GAMEPLAY GROUPS ===
        this.enemies = this.add.group();
        this.missiles = this.add.group();

        // Spawn Timer
        this.time.addEvent({ delay: 3000, callback: this.spawnEnemy, callbackScope: this, loop: true });

        // Listen for FIRE
        this.game.events.on('FIRE', this.handleFire, this);
    }

    update(time: number, _delta: number) {
        if (this.isGameOver) return;

        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // --- Starfield Animation ---
        this.stars.forEach(star => {
            star.y += (star as any).speed;
            if (star.y > vh) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, vw);
            }
        });

        // --- Hand Tracking ---
        const tracker = this.registry.get('handTracker') as HandTracker;
        let rawTargetX = this.crosshairTarget.x;
        let rawTargetY = this.crosshairTarget.y;

        if (tracker) {
            const hands = tracker.getHands();
            const gunner = hands.gunner;

            if (gunner) {
                rawTargetX = gunner.x * vw;
                rawTargetY = gunner.y * vh;

                if (gunner.indexExtended) {
                    this.crosshairTarget.set(rawTargetX, rawTargetY);
                }

                // Fire on flick
                if (gunner.flickDetected) {
                    this.game.events.emit('FIRE');
                }

                this.debugText.setText(`G:${gunner.gesture} IDX:${gunner.indexExtended ? '1' : '0'}`);
            } else {
                this.debugText.setText('NO SIG');
            }
        }

        // === AIM ASSIST: Find nearest target ===
        let nearestTarget: Phaser.GameObjects.GameObject | null = null;
        let nearestDist = Infinity;
        const assistX = this.crosshairTarget.x;
        const assistY = this.crosshairTarget.y;

        // Check missiles first (higher threat priority)
        this.missiles.getChildren().forEach((missile: any) => {
            const dist = Phaser.Math.Distance.Between(assistX, assistY, missile.x, missile.y);
            if (dist < this.AIM_ASSIST_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = missile;
            }
        });

        // Then enemies
        this.enemies.getChildren().forEach((enemy: any) => {
            const dist = Phaser.Math.Distance.Between(assistX, assistY, enemy.x, enemy.y);
            if (dist < this.AIM_ASSIST_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = enemy;
            }
        });

        // Update lock state
        this.lockedTarget = nearestTarget;
        if (nearestTarget) {
            this.lockStatusText.setText('TARGET\nLOCK ON');
            this.lockStatusText.setColor('#ff2222');
            this.lockBracket.setVisible(true);
            this.lockBracket.x = Phaser.Math.Linear(this.lockBracket.x, (nearestTarget as any).x, 0.3);
            this.lockBracket.y = Phaser.Math.Linear(this.lockBracket.y, (nearestTarget as any).y, 0.3);
            // Scale bracket based on target type
            const isMissile = this.missiles.contains(nearestTarget);
            this.lockBracket.setScale(isMissile ? 0.8 : 1.2);
        } else {
            this.lockStatusText.setText('SCANNING...');
            this.lockStatusText.setColor('#ff4444');
            this.lockBracket.setVisible(false);
        }

        // LERP Crosshair
        this.crosshair.x = Phaser.Math.Linear(this.crosshair.x, this.crosshairTarget.x, 0.2);
        this.crosshair.y = Phaser.Math.Linear(this.crosshair.y, this.crosshairTarget.y, 0.2);

        // --- Enemy Behavior ---
        this.enemies.getChildren().forEach((enemy: any) => {
            enemy.x += Math.sin(time * 0.001 + enemy.driftOffset) * 0.4;
            enemy.y += Math.cos(time * 0.0012 + enemy.driftOffset) * 0.3;
            // Spawn missiles independently
            if (Math.random() < 0.004) this.spawnMissile(enemy.x, enemy.y);
        });

        // --- Missile Behavior (Independent) ---
        this.missiles.getChildren().forEach((missile: any) => {
            missile.setScale(missile.scale + 0.018);
            missile.x = Phaser.Math.Linear(missile.x, vw / 2, 0.004);
            missile.y = Phaser.Math.Linear(missile.y, vh / 2, 0.004);

            if (missile.scale > 2.8) {
                this.takeDamage();
                this.createImpact(missile.x, missile.y);
                missile.destroy();
            }
        });

        // Update HUD
        this.lockCountText.setText(String(this.missiles.getLength() + this.enemies.getLength()).padStart(3, '0'));
    }

    private spawnEnemy() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(80, vw - 80);
        const y = Phaser.Math.Between(80, vh * 0.5);

        // Enemy: Diamond shape with red tint
        const enemy = this.add.polygon(x, y, [0, -18, 12, 0, 0, 18, -12, 0], 0x553333);
        enemy.setStrokeStyle(2, 0xff6666);
        (enemy as any).driftOffset = Math.random() * 100;
        this.enemies.add(enemy);

        this.time.delayedCall(15000, () => { if (enemy.active) enemy.destroy(); });
    }

    private spawnMissile(startX: number, startY: number) {
        if (this.isGameOver) return;
        const missile = this.add.circle(startX, startY, 5, 0xff4400);
        missile.setStrokeStyle(2, 0xffaa00);
        this.missiles.add(missile);
    }

    private handleFire() {
        if (this.isGameOver) return;

        // If we have a locked target, shoot IT specifically
        if (this.lockedTarget && this.lockedTarget.active) {
            const target = this.lockedTarget;
            const isMissile = this.missiles.contains(target);

            if (isMissile) {
                this.addScore(50);
                this.createExplosion((target as any).x, (target as any).y, 0xff6600);
            } else {
                this.addScore(100);
                this.createExplosion((target as any).x, (target as any).y, 0xffff00);
            }

            target.destroy();
            this.lockedTarget = null;
            this.cameras.main.shake(50, 0.005);
            return;
        }

        // Fallback: Manual aim (no lock)
        const hitRadius = 60;
        const cx = this.crosshair.x;
        const cy = this.crosshair.y;
        let hit = false;

        // Check missiles
        this.missiles.getChildren().forEach((missile: any) => {
            if (hit) return;
            const dist = Phaser.Math.Distance.Between(cx, cy, missile.x, missile.y);
            if (dist < hitRadius + missile.scale * 5) {
                this.addScore(50);
                this.createExplosion(missile.x, missile.y, 0xff6600);
                missile.destroy();
                hit = true;
            }
        });

        if (!hit) {
            this.enemies.getChildren().forEach((enemy: any) => {
                if (hit) return;
                const dist = Phaser.Math.Distance.Between(cx, cy, enemy.x, enemy.y);
                if (dist < hitRadius + 20) {
                    this.addScore(100);
                    this.createExplosion(enemy.x, enemy.y, 0xffff00);
                    enemy.destroy();
                    hit = true;
                }
            });
        }

        if (hit) {
            this.cameras.main.shake(40, 0.004);
        }
    }

    private createExplosion(x: number, y: number, color: number) {
        for (let i = 0; i < 10; i++) {
            const particle = this.add.circle(x, y, Phaser.Math.Between(2, 6), color);
            const angle = (i / 10) * Math.PI * 2;
            const speed = Phaser.Math.Between(40, 120);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 250,
                onComplete: () => particle.destroy()
            });
        }
    }

    private createImpact(_x: number, _y: number) {
        const flash = this.add.rectangle(this.scale.width / 4, this.scale.height / 2, this.scale.width / 2, this.scale.height, 0xff0000, 0.4);
        this.tweens.add({ targets: flash, alpha: 0, duration: 150, onComplete: () => flash.destroy() });
        this.cameras.main.shake(180, 0.02);
    }

    private takeDamage() {
        this.shieldLevel -= 25;
        if (this.shieldLevel < 0) this.shieldLevel = 0;

        const barWidth = (this.shieldLevel / 100) * 120;
        this.shieldBar.width = barWidth;
        this.shieldBar.x = this.scale.width / 4 - (120 - barWidth) / 2;

        if (this.shieldLevel <= 40) this.shieldBar.setFillStyle(0xffaa00);
        if (this.shieldLevel <= 20) this.shieldBar.setFillStyle(0xff3333);

        if (this.shieldLevel <= 0) {
            this.lives--;
            this.updateLives();
            if (this.lives > 0) {
                this.shieldLevel = 100;
                this.shieldBar.width = 120;
                this.shieldBar.setFillStyle(0xff3333);
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
        this.scoreText.setText(String(this.score).padStart(3, '0'));
    }

    private gameOver() {
        this.isGameOver = true;
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(3000, 0, 0, 0);
    }
}
