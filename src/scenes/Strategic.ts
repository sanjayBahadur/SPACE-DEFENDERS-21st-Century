import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Strategic extends Phaser.Scene {
    // Ship
    private ship!: Phaser.GameObjects.Sprite;
    private shipTarget = new Phaser.Math.Vector2(0, 0);
    private isGrabbing: boolean = false;
    private currentShipFrame: number = 1;

    // Obstacles
    private asteroids!: Phaser.GameObjects.Group;
    private blackHoles!: Phaser.GameObjects.Group;
    private deathRays!: Phaser.GameObjects.Group;
    private warnings!: Phaser.GameObjects.Group;

    // State
    private hullHealth: number = 100;
    private isGameOver: boolean = false;

    // HUD
    private hullBar!: Phaser.GameObjects.Rectangle;
    private statusText!: Phaser.GameObjects.Text;
    private gameOverText!: Phaser.GameObjects.Text;

    // Background
    private panelBg!: Phaser.GameObjects.Image;
    private stars: Phaser.GameObjects.Arc[] = [];

    constructor() {
        super('Strategic');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const vw = width / 2;
        const vh = height;

        this.cameras.main.setViewport(0, 0, vw, vh);
        this.cameras.main.setBackgroundColor('#000005');

        // === STARFIELD (behind panel) ===
        for (let i = 0; i < 60; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.3, 1.2),
                0x4488ff,
                Phaser.Math.FloatBetween(0.15, 0.35)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.2, 0.6);
            this.stars.push(star);
        }

        // === PANEL BACKGROUND (PannelV1) ===
        this.panelBg = this.add.image(vw / 2, vh / 2, 'pannelV1');
        this.panelBg.setDisplaySize(vw, vh);
        this.panelBg.setAlpha(0.25); // Semi-transparent overlay

        // === HUD ===
        this.add.text(20, 20, 'PILOT CONTROL', {
            fontFamily: 'Courier', fontSize: '14px', color: '#4488ff'
        });

        this.statusText = this.add.text(20, 38, 'STANDBY', {
            fontFamily: 'Courier', fontSize: '10px', color: '#446688'
        });

        // Hull Bar
        this.add.text(20, vh - 55, 'HULL', { fontFamily: 'Courier', fontSize: '9px', color: '#446688' });
        this.add.rectangle(90, vh - 42, 120, 8, 0x222244);
        this.hullBar = this.add.rectangle(90, vh - 42, 120, 8, 0x44aaff);

        // Game Over
        this.gameOverText = this.add.text(vw / 2, vh / 2, 'HULL BREACH', {
            fontSize: '28px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === SHIP (using pilotship sprites) ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.shipTarget.set(cx, cy);

        this.ship = this.add.sprite(cx, cy, 'pilotship1');
        this.ship.setScale(0.15); // Adjust scale as needed
        this.ship.setDepth(10);

        // === GROUPS ===
        this.asteroids = this.add.group();
        this.blackHoles = this.add.group();
        this.deathRays = this.add.group();
        this.warnings = this.add.group();

        // Spawn Timers
        this.time.addEvent({ delay: 4000, callback: this.spawnAsteroidWithWarning, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 15000, callback: this.spawnBlackHole, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 8000, callback: this.spawnDeathRayWarning, callbackScope: this, loop: true });

        // Hull sync
        this.game.events.on('GET_HULL', () => this.game.events.emit('HULL_UPDATE', this.hullHealth));

        // Ship variation timer (cycle through ship sprites)
        this.time.addEvent({
            delay: 200,
            callback: () => {
                if (this.isGrabbing) {
                    this.currentShipFrame = (this.currentShipFrame % 5) + 1;
                    this.ship.setTexture(`pilotship${this.currentShipFrame}`);
                }
            },
            callbackScope: this,
            loop: true
        });
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
            const pilot = hands.pilot;

            if (pilot) {
                const targetX = pilot.x * vw;
                const targetY = pilot.y * vh;

                if (pilot.gesture === 'FIST') {
                    this.isGrabbing = true;
                    this.shipTarget.set(targetX, targetY);
                    this.statusText.setText('GRAB: ACTIVE').setColor('#44ff44');
                } else {
                    this.isGrabbing = false;
                    this.statusText.setText('RELEASE').setColor('#446688');
                }
            } else {
                this.statusText.setText('NO SIGNAL').setColor('#ff4444');
            }
        }

        // Ship Movement
        const lerpFactor = this.isGrabbing ? 0.18 : 0.015;
        this.ship.x = Phaser.Math.Linear(this.ship.x, this.shipTarget.x, lerpFactor);
        this.ship.y = Phaser.Math.Linear(this.ship.y, this.shipTarget.y, lerpFactor);

        // Ship rotation towards movement
        const dx = this.shipTarget.x - this.ship.x;
        const dy = this.shipTarget.y - this.ship.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            this.ship.rotation = Math.atan2(dy, dx) + Math.PI / 2;
        }

        // Asteroid Movement
        this.asteroids.getChildren().forEach((asteroid: any) => {
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            asteroid.rotation += asteroid.spin;

            if (asteroid.x < -80 || asteroid.x > vw + 80 || asteroid.y < -80 || asteroid.y > vh + 80) {
                asteroid.destroy();
            }

            const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
            if (dist < 35) {
                this.takeDamage(20);
                this.createImpact(asteroid.x, asteroid.y);
                asteroid.destroy();
            }
        });

        // Black Hole Gravity (using blackhole sprite)
        this.blackHoles.getChildren().forEach((hole: any) => {
            const dx = hole.x - this.ship.x;
            const dy = hole.y - this.ship.y;
            const dist = Math.max(Phaser.Math.Distance.Between(this.ship.x, this.ship.y, hole.x, hole.y), 50);

            const pull = Math.min(500 / (dist * dist), 2);
            if (!this.isGrabbing) {
                this.shipTarget.x += (dx / dist) * pull;
                this.shipTarget.y += (dy / dist) * pull;
            }

            if (dist < 60) {
                this.takeDamage(0.4);
                hole.setTint(0xff4444);
            } else {
                hole.clearTint();
            }

            hole.rotation += 0.01;
            hole.life -= 1;
            if (hole.life <= 0) hole.destroy();
        });

        // Death Ray Collision
        this.deathRays.getChildren().forEach((ray: any) => {
            const shipX = this.ship.x;
            const shipY = this.ship.y;

            if (ray.isHorizontal) {
                if (Math.abs(shipY - ray.y) < 25 && shipX > Math.min(ray.x1, ray.x2) && shipX < Math.max(ray.x1, ray.x2)) {
                    this.takeDamage(25);
                    ray.destroy();
                }
            } else {
                if (Math.abs(shipX - ray.x) < 25 && shipY > Math.min(ray.y1, ray.y2) && shipY < Math.max(ray.y1, ray.y2)) {
                    this.takeDamage(25);
                    ray.destroy();
                }
            }
        });

        // Clamp ship
        this.shipTarget.x = Phaser.Math.Clamp(this.shipTarget.x, 30, vw - 30);
        this.shipTarget.y = Phaser.Math.Clamp(this.shipTarget.y, 30, vh - 30);
    }

    private spawnAsteroidWithWarning() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0, vx = 0, vy = 0, warningX = 0, warningY = 0;
        const speed = Phaser.Math.FloatBetween(5, 8);

        switch (edge) {
            case 0: x = Phaser.Math.Between(50, vw - 50); y = -50; vx = Phaser.Math.FloatBetween(-1, 1); vy = speed; warningX = x; warningY = 25; break;
            case 1: x = vw + 50; y = Phaser.Math.Between(50, vh - 50); vx = -speed; vy = Phaser.Math.FloatBetween(-1, 1); warningX = vw - 35; warningY = y; break;
            case 2: x = Phaser.Math.Between(50, vw - 50); y = vh + 50; vx = Phaser.Math.FloatBetween(-1, 1); vy = -speed; warningX = x; warningY = vh - 25; break;
            case 3: x = -50; y = Phaser.Math.Between(50, vh - 50); vx = speed; vy = Phaser.Math.FloatBetween(-1, 1); warningX = 35; warningY = y; break;
        }

        const warning = this.add.text(warningX, warningY, '⚠', { fontSize: '20px', color: '#ff4444' }).setOrigin(0.5);
        this.warnings.add(warning);

        this.tweens.add({
            targets: warning,
            alpha: 0,
            scale: 1.5,
            duration: 700,
            onComplete: () => {
                warning.destroy();
                this.spawnAsteroid(x, y, vx, vy);
            }
        });
    }

    private spawnAsteroid(x: number, y: number, vx: number, vy: number) {
        if (this.isGameOver) return;

        const size = Phaser.Math.Between(25, 45);
        const points: number[] = [];
        const numPoints = Phaser.Math.Between(6, 8);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = size * Phaser.Math.FloatBetween(0.6, 1);
            points.push(Math.cos(angle) * r, Math.sin(angle) * r);
        }

        const asteroid = this.add.polygon(x, y, points, 0x776655);
        asteroid.setStrokeStyle(3, 0xccaa88);
        (asteroid as any).vx = vx;
        (asteroid as any).vy = vy;
        (asteroid as any).spin = Phaser.Math.FloatBetween(-0.04, 0.04);
        this.asteroids.add(asteroid);
    }

    private spawnBlackHole() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(100, vw - 100);
        const y = Phaser.Math.Between(100, vh - 100);

        // Use blackhole sprite
        const hole = this.add.sprite(x, y, 'blackhole');
        hole.setScale(0.2);
        hole.setAlpha(0.8);
        (hole as any).life = 600;
        this.blackHoles.add(hole);

        // Spawn animation
        this.tweens.add({
            targets: hole,
            scale: 0.35,
            duration: 1000,
            ease: 'Bounce'
        });
    }

    private spawnDeathRayWarning() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const isHorizontal = Math.random() > 0.5;
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

        if (isHorizontal) {
            y1 = y2 = Phaser.Math.Between(80, vh - 80);
            x1 = 0; x2 = vw;
        } else {
            x1 = x2 = Phaser.Math.Between(80, vw - 80);
            y1 = 0; y2 = vh;
        }

        const warningLine = this.add.line(0, 0, x1, y1, x2, y2, 0xff2222, 0.3);
        warningLine.setLineWidth(4);
        this.warnings.add(warningLine);

        this.tweens.add({
            targets: warningLine,
            alpha: { from: 0.5, to: 0.1 },
            duration: 120,
            yoyo: true,
            repeat: 6,
            onComplete: () => {
                warningLine.destroy();
                this.fireDeathRay(x1, y1, x2, y2, isHorizontal);
            }
        });
    }

    private fireDeathRay(x1: number, y1: number, x2: number, y2: number, isHorizontal: boolean) {
        if (this.isGameOver) return;

        // Use deathray sprite rotated appropriately
        const rayNum = Phaser.Math.Between(1, 3);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const ray = this.add.sprite(midX, midY, `deathray${rayNum}`);
        ray.setAlpha(0.9);

        if (isHorizontal) {
            ray.setDisplaySize(this.scale.width / 2, 40);
            ray.setRotation(0);
        } else {
            ray.setDisplaySize(40, this.scale.height);
            ray.setRotation(0);
        }

        (ray as any).x1 = x1; (ray as any).y1 = y1;
        (ray as any).x2 = x2; (ray as any).y2 = y2;
        (ray as any).isHorizontal = isHorizontal;
        this.deathRays.add(ray);

        this.cameras.main.flash(80, 255, 80, 80);
        this.time.delayedCall(250, () => ray.destroy());
    }

    private takeDamage(amount: number) {
        this.hullHealth -= amount;
        if (this.hullHealth < 0) this.hullHealth = 0;

        const barWidth = (this.hullHealth / 100) * 120;
        this.hullBar.width = barWidth;
        this.hullBar.x = 30 + barWidth / 2;

        if (this.hullHealth <= 50) this.hullBar.setFillStyle(0xffaa00);
        if (this.hullHealth <= 25) this.hullBar.setFillStyle(0xff4444);

        this.game.events.emit('HULL_UPDATE', this.hullHealth);
        if (this.hullHealth <= 0) this.gameOver();
    }

    private createImpact(x: number, y: number) {
        for (let i = 0; i < 6; i++) {
            const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0xffaa44);
            const angle = (i / 6) * Math.PI * 2;
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * 60,
                y: y + Math.sin(angle) * 60,
                alpha: 0,
                duration: 200,
                onComplete: () => p.destroy()
            });
        }
        this.cameras.main.shake(60, 0.006);
    }

    private gameOver() {
        this.isGameOver = true;
        this.gameOverText.setVisible(true);
        this.cameras.main.fade(3000, 0, 0, 0);
        this.game.events.emit('PILOT_GAME_OVER');
    }
}
