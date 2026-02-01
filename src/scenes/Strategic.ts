import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Strategic extends Phaser.Scene {
    // Ship
    private ship!: Phaser.GameObjects.Container;
    private shipTarget = new Phaser.Math.Vector2(0, 0);
    private isGrabbing: boolean = false;

    // Obstacles
    private asteroids!: Phaser.GameObjects.Group;
    private blackHoles!: Phaser.GameObjects.Group;

    // State
    private hullHealth: number = 100;
    private isGameOver: boolean = false;

    // HUD
    private hullBar!: Phaser.GameObjects.Rectangle;
    private hullBarBg!: Phaser.GameObjects.Rectangle;
    private statusText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    // Starfield
    private stars: Phaser.GameObjects.Arc[] = [];

    // Grid
    private gridGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super('Strategic');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const vw = width / 2;
        const vh = height;

        // Left Viewport
        this.cameras.main.setViewport(0, 0, vw, vh);
        this.cameras.main.setBackgroundColor('#000008'); // Deep blue-black space

        // === STARFIELD ===
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.5, 2),
                0x4488ff,
                Phaser.Math.FloatBetween(0.2, 0.6)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.2, 1);
            this.stars.push(star);
        }

        // === GRID OVERLAY ===
        this.gridGraphics = this.add.graphics();
        this.drawGrid(vw, vh);

        // === HUD ===
        this.add.text(20, 20, 'STRATEGIC VIEW', {
            fontFamily: 'Courier', fontSize: '18px', color: '#4488ff'
        });

        this.statusText = this.add.text(20, 45, 'STANDBY', {
            fontFamily: 'Courier', fontSize: '12px', color: '#446688'
        });

        // Hull Bar (Bottom)
        this.add.text(20, vh - 70, 'HULL INTEGRITY', {
            fontFamily: 'Courier', fontSize: '12px', color: '#446688'
        });
        this.hullBarBg = this.add.rectangle(100, vh - 45, 150, 14, 0x222244);
        this.hullBar = this.add.rectangle(100, vh - 45, 150, 14, 0x44aaff);

        // Game Over
        this.gameOverText = this.add.text(vw / 2, vh / 2, 'HULL BREACH', {
            fontSize: '36px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === SHIP ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.shipTarget.set(cx, cy);

        this.ship = this.add.container(cx, cy);
        // Ship body (triangle)
        const shipBody = this.add.polygon(0, 0, [0, -20, 15, 15, -15, 15], 0x2266aa);
        shipBody.setStrokeStyle(2, 0x44aaff);
        this.ship.add(shipBody);
        // Engine glow
        const engine = this.add.circle(0, 12, 5, 0x44ddff, 0.8);
        this.ship.add(engine);

        // === OBSTACLE GROUPS ===
        this.asteroids = this.add.group();
        this.blackHoles = this.add.group();

        // Spawn Timers
        this.time.addEvent({ delay: 1500, callback: this.spawnAsteroid, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 8000, callback: this.spawnBlackHole, callbackScope: this, loop: true });

        // Emit hull to Tactical
        this.game.events.on('GET_HULL', () => {
            this.game.events.emit('HULL_UPDATE', this.hullHealth);
        });
    }

    update(time: number, _delta: number) {
        if (this.isGameOver) return;

        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // --- Starfield ---
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
            const pilot = hands.pilot;

            if (pilot) {
                const targetX = pilot.x * vw;
                const targetY = pilot.y * vh;

                // FIST = Grab ship
                if (pilot.gesture === 'FIST') {
                    this.isGrabbing = true;
                    this.shipTarget.set(targetX, targetY);
                    this.statusText.setText('GRAB: ACTIVE');
                    this.statusText.setColor('#44ff44');
                } else {
                    this.isGrabbing = false;
                    this.statusText.setText('GRAB: RELEASE');
                    this.statusText.setColor('#446688');
                }
            } else {
                this.statusText.setText('NO SIGNAL');
                this.statusText.setColor('#ff4444');
            }
        }

        // LERP Ship (only when grabbing or drifting slowly)
        const lerpFactor = this.isGrabbing ? 0.15 : 0.02;
        this.ship.x = Phaser.Math.Linear(this.ship.x, this.shipTarget.x, lerpFactor);
        this.ship.y = Phaser.Math.Linear(this.ship.y, this.shipTarget.y, lerpFactor);

        // --- Asteroid Movement ---
        this.asteroids.getChildren().forEach((asteroid: any) => {
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            asteroid.rotation += asteroid.spin;

            // Off-screen cleanup
            if (asteroid.x < -50 || asteroid.x > vw + 50 || asteroid.y < -50 || asteroid.y > vh + 50) {
                asteroid.destroy();
            }

            // Collision with ship
            const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
            if (dist < 30) {
                this.takeDamage(15);
                this.createImpact(asteroid.x, asteroid.y);
                asteroid.destroy();
            }
        });

        // --- Black Hole Gravity ---
        this.blackHoles.getChildren().forEach((hole: any) => {
            const dx = hole.x - this.ship.x;
            const dy = hole.y - this.ship.y;
            const dist = Math.max(Phaser.Math.Distance.Between(this.ship.x, this.ship.y, hole.x, hole.y), 30);

            // Gravity pull (stronger when closer)
            const pullStrength = 800 / (dist * dist); // Inverse square
            const maxPull = 3;
            const pull = Math.min(pullStrength, maxPull);

            // Apply gravity to ship target
            if (!this.isGrabbing) {
                this.shipTarget.x += (dx / dist) * pull;
                this.shipTarget.y += (dy / dist) * pull;
            }

            // Damage if too close
            if (dist < 60) {
                this.takeDamage(0.5); // Continuous damage
                // Visual warning
                (hole.getAt(0) as Phaser.GameObjects.Arc).setFillStyle(0xff4444, 0.3);
            } else {
                (hole.getAt(0) as Phaser.GameObjects.Arc).setFillStyle(0x220044, 0.6);
            }

            // Rotate visual
            hole.rotation += 0.02;

            // Lifespan
            hole.life -= 1;
            if (hole.life <= 0) {
                hole.destroy();
            }
        });

        // Clamp ship to viewport
        this.shipTarget.x = Phaser.Math.Clamp(this.shipTarget.x, 30, vw - 30);
        this.shipTarget.y = Phaser.Math.Clamp(this.shipTarget.y, 30, vh - 30);
    }

    private drawGrid(vw: number, vh: number) {
        this.gridGraphics.lineStyle(1, 0x223355, 0.3);
        const gridSize = 50;
        for (let x = 0; x <= vw; x += gridSize) {
            this.gridGraphics.lineBetween(x, 0, x, vh);
        }
        for (let y = 0; y <= vh; y += gridSize) {
            this.gridGraphics.lineBetween(0, y, vw, y);
        }
    }

    private spawnAsteroid() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // Spawn from random edge
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0, vx = 0, vy = 0;

        switch (edge) {
            case 0: // Top
                x = Phaser.Math.Between(0, vw);
                y = -30;
                vx = Phaser.Math.FloatBetween(-1, 1);
                vy = Phaser.Math.FloatBetween(1, 3);
                break;
            case 1: // Right
                x = vw + 30;
                y = Phaser.Math.Between(0, vh);
                vx = Phaser.Math.FloatBetween(-3, -1);
                vy = Phaser.Math.FloatBetween(-1, 1);
                break;
            case 2: // Bottom
                x = Phaser.Math.Between(0, vw);
                y = vh + 30;
                vx = Phaser.Math.FloatBetween(-1, 1);
                vy = Phaser.Math.FloatBetween(-3, -1);
                break;
            case 3: // Left
                x = -30;
                y = Phaser.Math.Between(0, vh);
                vx = Phaser.Math.FloatBetween(1, 3);
                vy = Phaser.Math.FloatBetween(-1, 1);
                break;
        }

        // Irregular asteroid shape
        const size = Phaser.Math.Between(15, 35);
        const points: number[] = [];
        const numPoints = Phaser.Math.Between(5, 8);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = size * Phaser.Math.FloatBetween(0.6, 1);
            points.push(Math.cos(angle) * r, Math.sin(angle) * r);
        }

        const asteroid = this.add.polygon(x, y, points, 0x554433);
        asteroid.setStrokeStyle(2, 0x887766);
        (asteroid as any).vx = vx;
        (asteroid as any).vy = vy;
        (asteroid as any).spin = Phaser.Math.FloatBetween(-0.02, 0.02);
        this.asteroids.add(asteroid);
    }

    private spawnBlackHole() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(80, vw - 80);
        const y = Phaser.Math.Between(80, vh - 80);

        const hole = this.add.container(x, y);

        // Accretion disk rings
        for (let i = 0; i < 4; i++) {
            const ring = this.add.circle(0, 0, 50 - i * 10).setStrokeStyle(2, 0x6644aa, 0.4 - i * 0.1);
            hole.add(ring);
        }

        // Core
        const core = this.add.circle(0, 0, 20, 0x220044, 0.6);
        hole.add(core);

        // Inner singularity
        const singularity = this.add.circle(0, 0, 8, 0x000000);
        hole.add(singularity);

        (hole as any).life = 600; // ~10 seconds at 60fps
        this.blackHoles.add(hole);
    }

    private takeDamage(amount: number) {
        this.hullHealth -= amount;
        if (this.hullHealth < 0) this.hullHealth = 0;

        // Update bar
        const barWidth = (this.hullHealth / 100) * 150;
        this.hullBar.width = barWidth;
        this.hullBar.x = 25 + barWidth / 2;

        // Color
        if (this.hullHealth <= 50) this.hullBar.setFillStyle(0xffaa00);
        if (this.hullHealth <= 25) this.hullBar.setFillStyle(0xff4444);

        // Emit to Tactical
        this.game.events.emit('HULL_UPDATE', this.hullHealth);

        if (this.hullHealth <= 0) {
            this.gameOver();
        }
    }

    private createImpact(x: number, y: number) {
        for (let i = 0; i < 6; i++) {
            const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xffaa44);
            const angle = (i / 6) * Math.PI * 2;
            const speed = Phaser.Math.Between(30, 80);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 200,
                onComplete: () => particle.destroy()
            });
        }
        this.cameras.main.shake(100, 0.01);
    }

    private gameOver() {
        this.isGameOver = true;
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(3000, 0, 0, 0);
        this.game.events.emit('PILOT_GAME_OVER');
    }
}
