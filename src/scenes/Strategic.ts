import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Strategic extends Phaser.Scene {
    // Ship
    private ship!: Phaser.GameObjects.Sprite;
    private shipTarget = new Phaser.Math.Vector2(0, 0);
    private isGrabbing: boolean = false;
    private currentShipFrame: number = 1;
    private shipSpeedMultiplier: number = 1;

    // Obstacles
    private meteors!: Phaser.GameObjects.Group;
    private blackHoles!: Phaser.GameObjects.Group;
    private creatures!: Phaser.GameObjects.Group;
    private deathRays!: Phaser.GameObjects.Group;
    private warnings!: Phaser.GameObjects.Group;

    // State
    private hullHealth: number = 100;
    private isGameOver: boolean = false;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

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

        // === STARFIELD ===
        for (let i = 0; i < 50; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, vw),
                Phaser.Math.Between(0, vh),
                Phaser.Math.FloatBetween(0.3, 1),
                0x4488ff,
                Phaser.Math.FloatBetween(0.1, 0.3)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.15, 0.5);
            this.stars.push(star);
        }

        // === PANEL BACKGROUND ===
        this.panelBg = this.add.image(vw / 2, vh / 2, 'pannelV1');
        this.panelBg.setDisplaySize(vw, vh);
        this.panelBg.setAlpha(0.2);

        // === HUD ===
        this.add.text(20, 20, 'PILOT CONTROL', {
            fontFamily: 'Courier', fontSize: '14px', color: '#4488ff'
        });

        this.statusText = this.add.text(20, 38, 'STANDBY', {
            fontFamily: 'Courier', fontSize: '10px', color: '#446688'
        });

        this.add.text(20, vh - 55, 'HULL', { fontFamily: 'Courier', fontSize: '9px', color: '#446688' });
        this.add.rectangle(90, vh - 42, 120, 8, 0x222244);
        this.hullBar = this.add.rectangle(90, vh - 42, 120, 8, 0x44aaff);

        this.gameOverText = this.add.text(vw / 2, vh / 2, 'HULL BREACH', {
            fontSize: '28px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // === SHIP ===
        const cx = vw / 2;
        const cy = vh / 2;
        this.shipTarget.set(cx, cy);

        this.ship = this.add.sprite(cx, cy, 'pilotship1');
        this.ship.setScale(0.15);
        this.ship.setDepth(10);

        // === GROUPS ===
        this.meteors = this.add.group();
        this.blackHoles = this.add.group();
        this.creatures = this.add.group();
        this.deathRays = this.add.group();
        this.warnings = this.add.group();

        // Spawn Timers
        this.time.addEvent({ delay: 3000, callback: this.spawnMeteorWithWarning, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 18000, callback: this.spawnBlackHole, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 10000, callback: this.spawnCreature, callbackScope: this, loop: true });

        // Hull sync
        this.game.events.on('GET_HULL', () => this.game.events.emit('HULL_UPDATE', this.hullHealth));

        // === ANIMATIONS ===
        this.anims.create({
            key: 'meteor_anim',
            frames: [{ key: 'meteor1' }, { key: 'meteor2' }, { key: 'meteor3' }, { key: 'meteor4' }],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'creature_anim',
            frames: [{ key: 'creature1' }, { key: 'creature2' }],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'deathray_anim',
            frames: [{ key: 'deathray1' }, { key: 'deathray2' }, { key: 'deathray3' }, { key: 'deathray4' }],
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: 'explosionV1',
            frames: [{ key: 'explosionV1_1' }, { key: 'explosionV1_2' }, { key: 'explosionV1_3' }, { key: 'explosionV1_4' }],
            frameRate: 15,
            repeat: 0
        });

        this.anims.create({
            key: 'explosionV2',
            frames: [{ key: 'explosionV2_1' }, { key: 'explosionV2_2' }, { key: 'explosionV2_3' }, { key: 'explosionV2_4' }],
            frameRate: 15,
            repeat: 0
        });

        // Ship animation
        this.time.addEvent({
            delay: 180,
            callback: () => {
                if (this.isGrabbing) {
                    this.currentShipFrame = (this.currentShipFrame % 5) + 1;
                    this.ship.setTexture(`pilotship${this.currentShipFrame}`);
                }
            },
            callbackScope: this,
            loop: true
        });

        // Controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = this.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        }) as any;
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

        // Reset speed multiplier (black holes will modify it)
        this.shipSpeedMultiplier = 1;

        // === BLACK HOLE GRAVITY WITH RINGS ===
        this.blackHoles.getChildren().forEach((holeContainer: any) => {
            const hole = holeContainer;
            const holeX = hole.x;
            const holeY = hole.y;
            const dx = holeX - this.ship.x;
            const dy = holeY - this.ship.y;
            const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, holeX, holeY);

            // Ring zones (slightly smaller as requested: 100, 70, 40)
            if (dist < 100) {
                // In outer ring - slight slowdown
                this.shipSpeedMultiplier *= 0.7;
                if (dist < 70) {
                    // In middle ring - more slowdown + pull
                    this.shipSpeedMultiplier *= 0.5;
                    const pullStrength = 1.0;
                    if (!this.isGrabbing) {
                        this.shipTarget.x += (dx / dist) * pullStrength;
                        this.shipTarget.y += (dy / dist) * pullStrength;
                    }
                    if (dist < 40) {
                        // In core - maximum effect
                        this.shipSpeedMultiplier *= 0.3;
                        const corePull = 1.8;
                        if (!this.isGrabbing) {
                            this.shipTarget.x += (dx / dist) * corePull;
                            this.shipTarget.y += (dy / dist) * corePull;
                        }
                        this.takeDamage(0.3);
                    }
                }
            }

            hole.rotation += 0.008;
            hole.life -= 1;
            if (hole.life <= 0) hole.destroy();
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

        // Keyboard Fallback
        const speed = 15; // Increased speed (was 7 * multiplier, now constant fast base)
        let isUsingKeys = false;

        if (this.cursors.left.isDown || this.wasd.left.isDown) { this.shipTarget.x -= speed; isUsingKeys = true; }
        if (this.cursors.right.isDown || this.wasd.right.isDown) { this.shipTarget.x += speed; isUsingKeys = true; }
        if (this.cursors.up.isDown || this.wasd.up.isDown) { this.shipTarget.y -= speed; isUsingKeys = true; }
        if (this.cursors.down.isDown || this.wasd.down.isDown) { this.shipTarget.y += speed; isUsingKeys = true; }

        // Logic to enable fast responsiveness when using keys
        if (isUsingKeys) {
            this.isGrabbing = true; // Use the faster "Grab" lerp
            this.statusText.setText('MANUAL PILOT').setColor('#44ff44');
        } else if (tracker && !this.isGrabbing) {
            // If not using keys and not grabbing with hand, ensure we reset if needed
            // (Logic handled in Hand Tracking section usually, so this is just a safe fallback)
        }

        // Ship Movement (affected by speed multiplier)
        const baseLerp = this.isGrabbing ? 0.18 : 0.015;
        const lerpFactor = baseLerp * this.shipSpeedMultiplier;
        this.ship.x = Phaser.Math.Linear(this.ship.x, this.shipTarget.x, lerpFactor);
        this.ship.y = Phaser.Math.Linear(this.ship.y, this.shipTarget.y, lerpFactor);

        // Ship rotation
        const moveDx = this.shipTarget.x - this.ship.x;
        const moveDy = this.shipTarget.y - this.ship.y;
        if (Math.abs(moveDx) > 2 || Math.abs(moveDy) > 2) {
            this.ship.rotation = Math.atan2(moveDy, moveDx) + Math.PI / 2;
        }

        // Meteor Movement (Top to Down only as requested)
        this.meteors.getChildren().forEach((meteor: any) => {
            meteor.y += meteor.vy;
            // No rotation or horizontal movement as requested for vertical sprites
            meteor.rotation = 0;

            if (meteor.x < -100 || meteor.x > vw + 100 || meteor.y < -100 || meteor.y > vh + 100) {
                meteor.destroy();
            }

            // HITBOX IMPROVEMENT: Use bounds overlap instead of center distance
            // Create shrunk bounds for tighter hitboxes (70% size)
            const shipBounds = this.ship.getBounds();
            const meteorBounds = meteor.getBounds();

            const shrink = (rect: Phaser.Geom.Rectangle, factor: number) => {
                const w = rect.width * factor;
                const h = rect.height * factor;
                const cx = rect.centerX;
                const cy = rect.centerY;
                return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
            };

            if (Phaser.Geom.Intersects.RectangleToRectangle(
                shrink(shipBounds, 0.7),
                shrink(meteorBounds, 0.7)
            )) {
                this.takeDamage(18);
                this.createImpact(meteor.x, meteor.y);
                meteor.destroy();
            }
        });

        // Death Ray Collision
        this.deathRays.getChildren().forEach((ray: any) => {
            if (!ray.active) return;
            const shipX = this.ship.x;
            const shipY = this.ship.y;

            // HITBOX IMPROVEMENT: Use bounds overlap for beam collision
            // Tighter bounds for ray as well
            const shipBounds = this.ship.getBounds();
            const rayBounds = ray.getBounds();

            // Inline shrink helper (same as above, avoiding class pollution for now)
            const shrink = (rect: Phaser.Geom.Rectangle, factor: number) => {
                const w = rect.width * factor;
                const h = rect.height * factor;
                const cx = rect.centerX;
                const cy = rect.centerY;
                return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
            };

            if (Phaser.Geom.Intersects.RectangleToRectangle(
                shrink(shipBounds, 0.7),
                shrink(rayBounds, 0.6)
            )) {
                this.takeDamage(30);
                ray.destroy();
            }
        });

        // Clamp ship
        this.shipTarget.x = Phaser.Math.Clamp(this.shipTarget.x, 30, vw - 30);
        this.shipTarget.y = Phaser.Math.Clamp(this.shipTarget.y, 30, vh - 30);
    }

    private spawnMeteorWithWarning() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;

        // Meteors only from Top edge as requested
        const x = Phaser.Math.Between(50, vw - 50);
        const y = -80;
        const vy = Phaser.Math.FloatBetween(4, 7);
        const warningX = x;
        const warningY = 30;

        const warning = this.add.text(warningX, warningY, '⚠', { fontSize: '24px', color: '#ff6644' }).setOrigin(0.5);
        this.warnings.add(warning);

        this.tweens.add({
            targets: warning,
            alpha: 0,
            scale: 1.6,
            duration: 700,
            onComplete: () => {
                warning.destroy();
                this.spawnMeteor(x, y, vy);
            }
        });
    }

    private spawnMeteor(x: number, y: number, vy: number) {
        if (this.isGameOver) return;

        const meteor = this.add.sprite(x, y, 'meteor1');
        meteor.play('meteor_anim');

        // Random size (small, medium, large)
        const sizeCategory = Phaser.Math.Between(0, 2);
        const scales = [0.12, 0.18, 0.25];
        meteor.setScale(scales[sizeCategory]);

        (meteor as any).vy = vy * (1 + sizeCategory * 0.15);
        meteor.setDepth(5);
        this.meteors.add(meteor);
    }

    private spawnBlackHole() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        const x = Phaser.Math.Between(100, vw - 100);
        const y = Phaser.Math.Between(100, vh - 100);

        // Create container for black hole + rings
        const holeContainer = this.add.container(x, y);

        // Purple rings (smaller as requested: 100, 70, 40)
        const ring3 = this.add.circle(0, 0, 100).setStrokeStyle(2, 0x8844cc, 0.25);
        const ring2 = this.add.circle(0, 0, 70).setStrokeStyle(3, 0xaa55ee, 0.35);
        const ring1 = this.add.circle(0, 0, 40).setStrokeStyle(4, 0xcc66ff, 0.45);
        holeContainer.add([ring3, ring2, ring1]);

        // Black hole core (slightly bigger core sprite as requested)
        const core = this.add.sprite(0, 0, 'blackhole');
        core.setScale(0.18);
        holeContainer.add(core);

        (holeContainer as any).life = 800;
        holeContainer.setDepth(3);
        this.blackHoles.add(holeContainer);

        // Spawn animation
        holeContainer.setScale(0);
        this.tweens.add({
            targets: holeContainer,
            scale: 1,
            duration: 800,
            ease: 'Back.easeOut'
        });
    }

    private spawnCreature() {
        if (this.isGameOver) return;
        const vw = this.scale.width / 2;
        const vh = this.scale.height;

        // Creatures spawn ONLY on Left/Right corners as requested
        const side = Phaser.Math.Between(0, 1); // 0 = Left, 1 = Right
        const x = side === 0 ? -60 : vw + 60;
        const y = Phaser.Math.Between(100, vh - 100);

        const creature = this.add.sprite(x, y, 'creature1');
        creature.play('creature_anim');
        creature.setScale(0.2);
        creature.setDepth(8);

        const targetX = side === 0 ? 55 : vw - 55;
        const rayY = y;

        this.tweens.add({
            targets: creature,
            x: targetX,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                this.showDeathRayWarning(creature, true, rayY, vw, vh);
            }
        });

        this.creatures.add(creature);
    }

    private showDeathRayWarning(creature: Phaser.GameObjects.Sprite, isHorizontal: boolean, rayPos: number, vw: number, vh: number) {
        // Create visible red warning zone
        let warningZone: Phaser.GameObjects.Rectangle;

        if (isHorizontal) {
            warningZone = this.add.rectangle(vw / 2, rayPos, vw, 50, 0xff0000, 0.15);
        } else {
            warningZone = this.add.rectangle(rayPos, vh / 2, 50, vh, 0xff0000, 0.15);
        }
        warningZone.setStrokeStyle(2, 0xff0000, 0.5);
        this.warnings.add(warningZone);

        // Blink the warning
        this.tweens.add({
            targets: warningZone,
            alpha: { from: 0.3, to: 0.05 },
            duration: 150,
            yoyo: true,
            repeat: 6,
            onComplete: () => {
                warningZone.destroy();
                this.fireDeathRay(creature, isHorizontal, rayPos, vw);
            }
        });
    }

    private fireDeathRay(creature: Phaser.GameObjects.Sprite, isHorizontal: boolean, rayPos: number, vw: number) {
        if (this.isGameOver || !creature.active) return;

        const ray = this.add.sprite(vw / 2, rayPos, 'deathray1');
        ray.play('deathray_anim');
        ray.setDisplaySize(vw, 45);

        ray.setAlpha(0.95);
        ray.setDepth(7);
        (ray as any).isHorizontal = isHorizontal;
        (ray as any).rayX = rayPos;
        (ray as any).rayY = rayPos;
        this.deathRays.add(ray);

        this.cameras.main.flash(100, 255, 100, 100);

        // Remove ray and creature after firing
        this.time.delayedCall(300, () => {
            ray.destroy();
            // Creature retreats
            this.tweens.add({
                targets: creature,
                alpha: 0,
                x: creature.x + (isHorizontal ? -80 : 0),
                y: creature.y + (isHorizontal ? 0 : -80),
                duration: 400,
                onComplete: () => creature.destroy()
            });
        });
    }

    private takeDamage(amount: number) {
        this.hullHealth -= amount;
        if (this.hullHealth < 0) this.hullHealth = 0;

        // Visual feedback
        if (amount > 5) {
            const anim = Math.random() > 0.5 ? 'explosionV1' : 'explosionV2';
            const explosion = this.add.sprite(this.ship.x + Phaser.Math.Between(-20, 20), this.ship.y + Phaser.Math.Between(-20, 20), anim);
            explosion.setScale(0.4); // Scaled down from 0.8
            explosion.play(anim);
            explosion.on('animationcomplete', () => explosion.destroy());
        }

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
                x: x + Math.cos(angle) * 50,
                y: y + Math.sin(angle) * 50,
                alpha: 0,
                duration: 180,
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
