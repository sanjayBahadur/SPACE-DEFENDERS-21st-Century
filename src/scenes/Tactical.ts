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
    private lockCountText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private debugText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    // Cockpit Frame
    private cockpitFrame!: Phaser.GameObjects.Graphics;

    // Stars
    private stars: Phaser.GameObjects.Arc[] = [];

    // Constants
    private readonly AIM_ASSIST_RADIUS = 110;
    private readonly LOCK_BRACKET_SIZE = 50;

    constructor() {
        super('Tactical');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const vw = width / 2;
        const vh = height;

        this.cameras.main.setViewport(width / 2, 0, vw, vh);
        this.cameras.main.setBackgroundColor('#020005');

        // === STARFIELD ===
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.4, 1.2),
                0xff4444,
                Phaser.Math.FloatBetween(0.08, 0.3)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.2, 1);
            this.stars.push(star);
        }

        // === COCKPIT FRAME (Immersive edges) ===
        this.cockpitFrame = this.add.graphics();
        this.drawCockpitFrame(vw, vh);

        // === HUD ===
        this.lockStatusText = this.add.text(25, 25, 'SCANNING...', {
            fontFamily: 'Courier', fontSize: '16px', color: '#ff4444'
        });

        this.add.text(25, vh - 65, 'SCORE', { fontFamily: 'Courier', fontSize: '10px', color: '#666666' });
        this.scoreText = this.add.text(25, vh - 50, '0000', { fontFamily: 'Courier', fontSize: '18px', color: '#ff6666' });

        this.add.text(vw / 2 - 50, vh - 65, 'SHIELDS', { fontFamily: 'Courier', fontSize: '10px', color: '#666666' });
        this.add.rectangle(vw / 2, vh - 48, 100, 10, 0x331111);
        this.shieldBar = this.add.rectangle(vw / 2, vh - 48, 100, 10, 0xff3333);

        this.add.text(vw - 75, 25, 'LOCK', { fontFamily: 'Courier', fontSize: '10px', color: '#666666' });
        this.lockCountText = this.add.text(vw - 75, 40, '000', { fontFamily: 'Courier', fontSize: '16px', color: '#ff6666' });

        this.add.text(vw - 75, vh - 65, 'LIVES', { fontFamily: 'Courier', fontSize: '10px', color: '#666666' });
        this.livesText = this.add.text(vw - 75, vh - 50, '♥♥♥', { fontFamily: 'Courier', fontSize: '18px', color: '#ff4444' });

        this.debugText = this.add.text(25, 48, '', { fontSize: '9px', color: '#333333' });

        this.gameOverText = this.add.text(vw / 2, vh / 2, 'GAME OVER', {
            fontSize: '40px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === LOCK BRACKET ===
        this.lockBracket = this.add.container(-100, -100);
        const bs = this.LOCK_BRACKET_SIZE;
        const bracketColor = 0xff3333;
        // Corners
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, -bs / 2, -bs / 2 + 18, -bs / 2, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, -bs / 2, -bs / 2, -bs / 2 + 18, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, -bs / 2, bs / 2 - 18, -bs / 2, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, -bs / 2, bs / 2, -bs / 2 + 18, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, bs / 2, -bs / 2 + 18, bs / 2, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, -bs / 2, bs / 2, -bs / 2, bs / 2 - 18, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, bs / 2, bs / 2 - 18, bs / 2, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.add(this.add.line(0, 0, bs / 2, bs / 2, bs / 2, bs / 2 - 18, bracketColor, 0.9).setLineWidth(2));
        this.lockBracket.setVisible(false);
        this.lockBracket.setDepth(20);

        // === CROSSHAIR ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.crosshairTarget.set(cx, cy);

        this.crosshair = this.add.container(cx, cy);
        // Center diamond
        this.crosshair.add(this.add.polygon(0, 0, [0, -10, 10, 0, 0, 10, -10, 0]).setStrokeStyle(2, 0xff4444, 0.8));
        this.crosshair.add(this.add.circle(0, 0, 3, 0xff4444));
        // Cross lines with gaps
        this.crosshair.add(this.add.line(0, 0, -50, 0, -15, 0, 0xff4444, 0.5).setLineWidth(1));
        this.crosshair.add(this.add.line(0, 0, 15, 0, 50, 0, 0xff4444, 0.5).setLineWidth(1));
        this.crosshair.add(this.add.line(0, 0, 0, -50, 0, -15, 0xff4444, 0.5).setLineWidth(1));
        this.crosshair.add(this.add.line(0, 0, 0, 15, 0, 50, 0xff4444, 0.5).setLineWidth(1));
        this.crosshair.setDepth(25);

        // === GROUPS ===
        this.enemies = this.add.group();
        this.missiles = this.add.group();

        // Spawn Timer
        this.time.addEvent({ delay: 3500, callback: this.spawnEnemy, callbackScope: this, loop: true });

        // FIRE event
        this.game.events.on('FIRE', this.handleFire, this);
    }

    private drawCockpitFrame(vw: number, vh: number) {
        const g = this.cockpitFrame;
        g.clear();

        // Dark cockpit edges (trapezoid shapes)
        g.fillStyle(0x111118, 0.9);

        // Top cockpit edge
        g.fillTriangle(0, 0, vw, 0, vw * 0.75, 60);
        g.fillTriangle(0, 0, vw * 0.25, 60, vw * 0.75, 60);

        // Bottom cockpit console
        g.fillRect(0, vh - 80, vw, 80);
        g.fillStyle(0x1a1a22, 0.95);
        g.fillRect(0, vh - 75, vw, 5);

        // Side pillars
        g.fillStyle(0x0d0d12, 0.85);
        g.fillRect(0, 0, 15, vh);
        g.fillRect(vw - 15, 0, 15, vh);

        // Corner accents
        g.lineStyle(2, 0xff2222, 0.4);
        g.strokeRect(20, 15, 100, 50);
        g.strokeRect(vw - 120, 15, 100, 50);

        // Scanline effect hints
        g.lineStyle(1, 0xff1111, 0.1);
        for (let y = 0; y < vh; y += 4) {
            g.lineBetween(0, y, vw, y);
        }
    }

    update(_time: number, _delta: number) {
        if (this.isGameOver) return;

        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // Starfield
        this.stars.forEach(star => {
            star.y += (star as any).speed;
            if (star.y > vh) { star.y = 0; star.x = Phaser.Math.Between(0, vw); }
        });

        // Hand Tracking
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHands();
            const gunner = hands.gunner;

            if (gunner) {
                const rawX = gunner.x * vw;
                const rawY = gunner.y * vh;

                if (gunner.indexExtended) {
                    this.crosshairTarget.set(rawX, rawY);
                }

                if (gunner.flickDetected) {
                    this.game.events.emit('FIRE');
                }

                this.debugText.setText(`G:${gunner.gesture}`);
            } else {
                this.debugText.setText('NO SIG');
            }
        }

        // Aim Assist
        let nearestTarget: Phaser.GameObjects.GameObject | null = null;
        let nearestDist = Infinity;

        this.missiles.getChildren().forEach((missile: any) => {
            const dist = Phaser.Math.Distance.Between(this.crosshairTarget.x, this.crosshairTarget.y, missile.x, missile.y);
            if (dist < this.AIM_ASSIST_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = missile;
            }
        });

        this.enemies.getChildren().forEach((enemy: any) => {
            const dist = Phaser.Math.Distance.Between(this.crosshairTarget.x, this.crosshairTarget.y, enemy.x, enemy.y);
            if (dist < this.AIM_ASSIST_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestTarget = enemy;
            }
        });

        this.lockedTarget = nearestTarget;
        if (nearestTarget) {
            this.lockStatusText.setText('TARGET\nLOCK ON').setColor('#ff2222');
            this.lockBracket.setVisible(true);
            this.lockBracket.x = Phaser.Math.Linear(this.lockBracket.x, (nearestTarget as any).x, 0.25);
            this.lockBracket.y = Phaser.Math.Linear(this.lockBracket.y, (nearestTarget as any).y, 0.25);
            const isMissile = this.missiles.contains(nearestTarget);
            this.lockBracket.setScale(isMissile ? 0.7 : 1);
        } else {
            this.lockStatusText.setText('SCANNING...').setColor('#ff4444');
            this.lockBracket.setVisible(false);
        }

        // Crosshair LERP
        this.crosshair.x = Phaser.Math.Linear(this.crosshair.x, this.crosshairTarget.x, 0.2);
        this.crosshair.y = Phaser.Math.Linear(this.crosshair.y, this.crosshairTarget.y, 0.2);

        // Enemy Behavior (using sprites)
        this.enemies.getChildren().forEach((enemy: any) => {
            enemy.x += Math.sin(_time * 0.001 + enemy.driftOffset) * 0.3;
            enemy.y += Math.cos(_time * 0.0008 + enemy.driftOffset) * 0.2;
            if (Math.random() < 0.003) this.spawnMissile(enemy.x, enemy.y);
        });

        // Missile Behavior
        this.missiles.getChildren().forEach((missile: any) => {
            missile.setScale(missile.scale + 0.015);
            missile.x = Phaser.Math.Linear(missile.x, vw / 2, 0.003);
            missile.y = Phaser.Math.Linear(missile.y, vh / 2, 0.003);
            missile.rotation += 0.05;

            if (missile.scale > 2.5) {
                this.takeDamage();
                this.createImpact(missile.x, missile.y);
                missile.destroy();
            }
        });

        // HUD
        this.lockCountText.setText(String(this.missiles.getLength() + this.enemies.getLength()).padStart(3, '0'));
    }

    private spawnEnemy() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(80, vw - 80);
        const y = Phaser.Math.Between(80, vh * 0.45);

        // Use enemy sprite
        const enemyType = Math.random() > 0.5 ? 'enemyV1' : 'enemyV2';
        const enemy = this.add.sprite(x, y, enemyType);
        enemy.setScale(0.12);
        enemy.setDepth(5);
        (enemy as any).driftOffset = Math.random() * 100;
        this.enemies.add(enemy);

        // Entrance animation
        enemy.setAlpha(0);
        this.tweens.add({
            targets: enemy,
            alpha: 1,
            scale: 0.15,
            duration: 400,
            ease: 'Back.easeOut'
        });

        this.time.delayedCall(18000, () => { if (enemy.active) enemy.destroy(); });
    }

    private spawnMissile(startX: number, startY: number) {
        if (this.isGameOver) return;

        // Modern missile design (energy orb with trail)
        const missile = this.add.container(startX, startY);

        // Core glow
        const core = this.add.circle(0, 0, 5, 0xff4400);
        core.setAlpha(0.9);
        missile.add(core);

        // Outer ring
        const ring = this.add.circle(0, 0, 8).setStrokeStyle(2, 0xffaa00, 0.6);
        missile.add(ring);

        // Trail particles
        const trail1 = this.add.circle(-8, 0, 3, 0xff6600, 0.5);
        const trail2 = this.add.circle(-14, 0, 2, 0xff8800, 0.3);
        missile.add(trail1);
        missile.add(trail2);

        missile.setScale(0.5);
        missile.setDepth(8);
        this.missiles.add(missile);
    }

    private handleFire() {
        if (this.isGameOver) return;

        if (this.lockedTarget && this.lockedTarget.active) {
            const target = this.lockedTarget;
            const isMissile = this.missiles.contains(target);

            this.addScore(isMissile ? 50 : 100);
            this.createExplosion((target as any).x, (target as any).y, isMissile ? 0xff6600 : 0xffff00);
            target.destroy();
            this.lockedTarget = null;
            this.cameras.main.shake(40, 0.004);
            return;
        }

        // Fallback manual
        const hitRadius = 65;
        const cx = this.crosshair.x;
        const cy = this.crosshair.y;
        let hit = false;

        this.missiles.getChildren().forEach((missile: any) => {
            if (hit) return;
            const dist = Phaser.Math.Distance.Between(cx, cy, missile.x, missile.y);
            if (dist < hitRadius + missile.scale * 6) {
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
                if (dist < hitRadius + 25) {
                    this.addScore(100);
                    this.createExplosion(enemy.x, enemy.y, 0xffff00);
                    enemy.destroy();
                    hit = true;
                }
            });
        }

        if (hit) this.cameras.main.shake(35, 0.003);
    }

    private createExplosion(x: number, y: number, color: number) {
        for (let i = 0; i < 12; i++) {
            const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), color);
            const angle = (i / 12) * Math.PI * 2;
            const speed = Phaser.Math.Between(40, 100);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: 220,
                onComplete: () => p.destroy()
            });
        }
    }

    private createImpact(_x: number, _y: number) {
        const flash = this.add.rectangle(this.scale.width / 4, this.scale.height / 2, this.scale.width / 2, this.scale.height, 0xff0000, 0.35);
        this.tweens.add({ targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
        this.cameras.main.shake(150, 0.018);
    }

    private takeDamage() {
        this.shieldLevel -= 25;
        if (this.shieldLevel < 0) this.shieldLevel = 0;

        const barWidth = (this.shieldLevel / 100) * 100;
        this.shieldBar.width = barWidth;
        this.shieldBar.x = this.scale.width / 4 - (100 - barWidth) / 2;

        if (this.shieldLevel <= 40) this.shieldBar.setFillStyle(0xffaa00);
        if (this.shieldLevel <= 20) this.shieldBar.setFillStyle(0xff3333);

        if (this.shieldLevel <= 0) {
            this.lives--;
            this.updateLives();
            if (this.lives > 0) {
                this.shieldLevel = 100;
                this.shieldBar.width = 100;
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
        this.scoreText.setText(String(this.score).padStart(4, '0'));
    }

    private gameOver() {
        this.isGameOver = true;
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(3000, 0, 0, 0);
    }
}
