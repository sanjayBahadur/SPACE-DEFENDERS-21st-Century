import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';
import { applyHullHit } from '../utils/hull';
import { advanceCannon, CANNON_COOL_PER_SECOND, CANNON_HEAT_PER_SECOND, frameLerp } from '../utils/combat';

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
    private wasPointerDown: boolean = false;
    private lastHandTime: number = 0;
    private damageProtectedUntil = 0;

    // Entity Groups
    private enemies!: Phaser.GameObjects.Group;
    private missiles!: Phaser.GameObjects.Group;

    // HUD Elements
    private lockStatusText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private shieldBar!: Phaser.GameObjects.Rectangle;
    private defensesText!: Phaser.GameObjects.Text;
    private lockCountText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private debugText!: Phaser.GameObjects.Text;

    // Cockpit Frame
    private cockpitFrame!: Phaser.GameObjects.Graphics;

    // Stars
    private stars: Phaser.GameObjects.Arc[] = [];

    // Constants
    private readonly AIM_ASSIST_RADIUS = 110;
    private readonly LOCK_BRACKET_SIZE = 50;

    // Palm Cannon State
    private palmCannonSprite: Phaser.GameObjects.Sprite | null = null;
    private cannonKey!: Phaser.Input.Keyboard.Key;
    private isOverheated = false;
    private lastFlickTime = -Infinity;

    // Overheat Mechanic
    private palmTemp: number = 0;

    private tempBar!: Phaser.GameObjects.Rectangle;
    private tempBarBg!: Phaser.GameObjects.Rectangle;
    private overheatWarningText!: Phaser.GameObjects.Text;

    constructor() {
        super('Tactical');
    }

    create() {
        this.registry.set('missionScore', 0);
        this.registry.set('missionOutcome', '');
        // Reset State
        this.isGameOver = false;
        this.shieldLevel = 100;
        this.score = 0;
        this.lives = 3;
        this.lockedTarget = null;
        this.palmCannonSprite = null;
        this.palmTemp = 0;
        this.isOverheated = false;
        this.lastFlickTime = -Infinity;
        this.wasPointerDown = this.input.activePointer.leftButtonDown();
        this.lastHandTime = this.time.now;
        this.damageProtectedUntil = 0;
        this.stars = [];

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

        // === PANEL BACKGROUND (PannelV2) ===
        const panelBg = this.add.image(vw / 2, vh / 2, 'pannelV2');
        panelBg.setDisplaySize(vw, vh);
        panelBg.setAlpha(0.15);
        panelBg.setDepth(0);

        // === COCKPIT FRAME (Immersive edges) ===
        this.cockpitFrame = this.add.graphics();
        this.drawCockpitFrame(vw, vh);

        // === HUD ===
        this.lockStatusText = this.add.text(25, 25, 'SCANNING...', {
            fontFamily: 'Courier', fontSize: '16px', color: '#ff4444'
        });

        // Top Right Score (Analog Style)
        this.add.text(vw - 25, 25, 'SCORE', { fontFamily: 'Courier', fontSize: '14px', color: '#666666' }).setOrigin(1, 0);
        this.scoreText = this.add.text(vw - 25, 40, '0000', {
            fontFamily: 'Courier', fontSize: '24px', color: '#ff8888',
            stroke: '#442222', strokeThickness: 2
        }).setOrigin(1, 0);

        // Bottom Left Lock/Ship Count (moved from Top Right)
        this.add.text(25, vh - 72, 'ENEMIES', { fontFamily: 'Courier', fontSize: '14px', color: '#666666' });
        this.lockCountText = this.add.text(25, vh - 50, '000', { fontFamily: 'Courier', fontSize: '18px', color: '#ff6666' });

        this.defensesText = this.add.text(vw / 2 - 50, vh - 72, 'DEFENSES 100%', { fontFamily: 'Courier', fontSize: '14px', color: '#ffaaaa' });
        this.add.rectangle(vw / 2, vh - 48, 100, 10, 0x331111);
        this.shieldBar = this.add.rectangle(vw / 2, vh - 48, 100, 10, 0xff3333);

        this.add.text(vw - 75, vh - 72, 'LIVES', { fontFamily: 'Courier', fontSize: '14px', color: '#666666' });
        this.livesText = this.add.text(vw - 75, vh - 50, '♥♥♥', { fontFamily: 'Courier', fontSize: '18px', color: '#ff4444' });

        // === TEMPERATURE UI ===
        this.add.text(vw - 30, vh / 2 - 60, 'TEMP', {
            fontFamily: 'Courier', fontSize: '14px', color: '#666666'
        }).setOrigin(0.5);

        // Background for temp bar
        // Anchor BOTH at the bottom to prevent spill alignment issues
        const barBottomY = vh / 2 + 52;
        this.tempBarBg = this.add.rectangle(vw - 30, barBottomY, 14, 104, 0x110505);
        this.tempBarBg.setStrokeStyle(2, 0x552222);
        this.tempBarBg.setOrigin(0.5, 1);

        // The bar itself (growing from bottom)
        // 2px padding from bottom (stroke)
        this.tempBar = this.add.rectangle(vw - 30, barBottomY - 2, 8, 0, 0x00ff00);
        this.tempBar.setOrigin(0.5, 1); // Grow upwards

        // Warning Text
        this.overheatWarningText = this.add.text(vw / 2, vh / 2 - 40, 'WARNING: OVERHEAT', {
            fontFamily: 'Courier', fontSize: '20px', color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);

        // Keep the countdown legible while the bar communicates heat.
        this.overheatWarningText.setDepth(35);

        this.debugText = this.add.text(25, 48, '', { fontSize: '14px' }).setVisible(false);

        // Listen for Pilot Game Over
        this.game.events.on('PILOT_GAME_OVER', this.gameOver, this);
        this.events.once('shutdown', () => {
            this.game.events.off('PILOT_GAME_OVER', this.gameOver, this);
            this.game.events.off('FIRE', this.handleFire, this);
            this.events.off('resume', this.onResume, this);
            this.stars = [];
        });
        this.events.on('resume', this.onResume, this);

        // Pause Keys
        this.cannonKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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

        // Pulse animation for lock bracket
        this.tweens.add({
            targets: this.lockBracket,
            alpha: { from: 1, to: 0.6 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
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

        // === ANIMATIONS ===
        this.createAnimation({
            key: 'explosionV1',
            frames: [{ key: 'explosionV1_1' }, { key: 'explosionV1_2' }, { key: 'explosionV1_3' }, { key: 'explosionV1_4' }],
            frameRate: 15,
            repeat: 0
        });
        this.createAnimation({
            key: 'explosionV2',
            frames: [{ key: 'explosionV2_1' }, { key: 'explosionV2_2' }, { key: 'explosionV2_3' }, { key: 'explosionV2_4' }],
            frameRate: 15,
            repeat: 0
        });
        this.createAnimation({
            key: 'enemyV3_anim',
            frames: [
                { key: 'enemyV3_1' }, { key: 'enemyV3_2' },
                { key: 'enemyV3_3' }, { key: 'enemyV3_4' }
            ],
            frameRate: 10,
            repeat: 0
        });

        // Shot Animations
        this.createAnimation({
            key: 'shotV1_anim',
            frames: [
                { key: 'shotV1_1' }, { key: 'shotV1_2' },
                { key: 'shotV1_3' }, { key: 'shotV1_4' }
            ],
            frameRate: 20,
            repeat: 0
        });

        this.createAnimation({
            key: 'shotV2_anim',
            frames: [
                { key: 'shotV2_1' }, { key: 'shotV2_2' },
                { key: 'shotV2_3' }, { key: 'shotV2_4' },
                { key: 'shotV2_5' }
            ],
            frameRate: 24,
            repeat: 0
        });

        // Entity Groups - Groups were missing from previous edit
        this.enemies = this.add.group();
        this.missiles = this.add.group();

        // Spawn Timer
        this.time.addEvent({ delay: 3500, callback: this.spawnEnemy, callbackScope: this, loop: true });

        // FIRE event
        this.game.events.on('FIRE', this.handleFire, this);
        this.children.each(child => {
            if (child instanceof Phaser.GameObjects.Text || child instanceof Phaser.GameObjects.Rectangle) child.setDepth(40);
        });

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
        const delta = Math.min(Math.max(_delta, 0), 100);
        const frame = delta / (1000 / 60);

        // Starfield
        this.stars.forEach(star => {
            star.y += (star as any).speed * frame;
            if (star.y > vh) { star.y = 0; star.x = Phaser.Math.Between(0, vw); }
        });

        let fireRequested = false;

        // Hand Tracking
        const keyboardMode = this.registry.get('keyboardMode') === true;
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        const hands = !keyboardMode && tracker ? tracker.getHands(true) : { pilot: null, gunner: null };
        if (!keyboardMode && tracker) {
            const gunner = hands.gunner;
            const pilot = hands.pilot;

            if (gunner) {
                this.lastHandTime = _time;

                // If hands are back, re-enable auto-pause safety
                // UNLESS we are in explicit Keyboard Mode
                const isKeyboardMode = this.registry.get('keyboardMode') === true;
                if (pilot && !isKeyboardMode && this.registry.get('manualKeyboardOverride') === true) {
                    this.registry.set('manualKeyboardOverride', false);
                    this.debugText.setText('HANDS DETECTED - SAFETY ON');
                }
            }

            if (gunner) {
                const rawX = gunner.x * vw;
                const rawY = gunner.y * vh;

                if (gunner.indexExtended || gunner.gesture === 'FIST') {
                    this.crosshairTarget.set(rawX, rawY);
                }

                if (gunner.flickDetected && _time - this.lastFlickTime > 180) {
                    this.lastFlickTime = _time;
                    fireRequested = true;
                }

                this.debugText.setText(`G:${gunner.gesture}`);
            } else {
                this.debugText.setText('NO SIG');

                // Auto-Pause if hands missing and not using keyboard override
                const keyboardOverride = this.registry.get('manualKeyboardOverride') === true;

                if (_time - this.lastHandTime > 750 && !this.isGameOver && !keyboardOverride) {
                    this.pauseGame('HAND_LOST');
                    return;
                }
            }
        } else {
            this.debugText.setText('NO SIG');
        }

        const gunner = hands.gunner;
        const keyboardControls = this.registry.get('useKeyboardControls') !== false;
        const pointer = this.input.activePointer;
        const rightMouseCannon = pointer.x > vw && pointer.rightButtonDown();
        const requestedCannon = gunner?.gesture === 'FIST' || (keyboardControls && (this.cannonKey.isDown || rightMouseCannon));
        const cannon = advanceCannon({ heat: this.palmTemp, overheated: this.isOverheated }, requestedCannon, delta);
        this.palmTemp = cannon.heat;
        this.isOverheated = cannon.overheated;
        const firingCannon = requestedCannon && !this.isOverheated;

        // Resizing must update the rectangle geometry and display origin together.
        // Changing height alone leaves the bottom anchor at its previous size.
        this.tempBar.setSize(8, Phaser.Math.Clamp(this.palmTemp, 0, 100) * 0.98);
        this.tempBar.setFillStyle(this.isOverheated ? 0xff4444 : this.palmTemp >= 50 ? 0xffba66 : 0x5be4b9);
        if (this.isOverheated) {
            const seconds = (this.palmTemp / CANNON_COOL_PER_SECOND).toFixed(1);
            this.overheatWarningText.setText(`CANNON COOLING · ${seconds}s`).setColor('#ffba66').setVisible(true);
        } else if (firingCannon && this.palmTemp >= 50) {
            const seconds = ((100 - this.palmTemp) / CANNON_HEAT_PER_SECOND).toFixed(1);
            this.overheatWarningText.setText(`HEAT LIMIT IN ${seconds}s\nRELEASE TO COOL`).setColor('#ffba66').setVisible(true);
        } else if (!firingCannon && this.palmTemp > 0) {
            const seconds = (this.palmTemp / CANNON_COOL_PER_SECOND).toFixed(1);
            this.overheatWarningText.setText(`COOLING · ${seconds}s`).setColor('#8ecaff').setVisible(true);
        } else {
            this.overheatWarningText.setVisible(false);
        }

        this.crosshair.setVisible(!firingCannon);
        if (!firingCannon && this.palmCannonSprite) {
            this.palmCannonSprite.destroy();
            this.palmCannonSprite = null;
        }
        // Mouse Fallback & Priority Logic
        // Only use mouse if NO hand is actively controlling (indexExtended) or tracking is missing
        const isHandActive = gunner && (gunner.indexExtended || gunner.gesture === 'FIST');

        if (!isHandActive && keyboardControls) {
            const pointer = this.input.activePointer;
            // Check if pointer is strictly in the right half (Tactical Panel)
            if (pointer.x > this.scale.width / 2) {
                // Convert to Camera space
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.crosshairTarget.set(worldPoint.x, worldPoint.y);

                if (pointer.leftButtonDown() && !this.wasPointerDown) {
                    fireRequested = true;
                }
                this.wasPointerDown = pointer.leftButtonDown();
            } else {
                this.wasPointerDown = false; // Reset if out of bounds
            }
        }

        // Aim Assist
        let nearestTarget: Phaser.GameObjects.GameObject | null = null;
        let nearestDist = Infinity;

        const candidates = [...this.missiles.getChildren(), ...this.enemies.getChildren()];
        candidates.forEach((target: any) => {
            const dist = Phaser.Math.Distance.Between(this.crosshairTarget.x, this.crosshairTarget.y, target.x, target.y);

            // Bias: artificially reduce distance for the currently locked target to make it "stickym"
            let effectiveDist = dist;
            if (this.lockedTarget === target) {
                effectiveDist -= 25; // Sticky bias
            }

            if (dist < this.AIM_ASSIST_RADIUS && effectiveDist < nearestDist) {
                nearestDist = effectiveDist;
                nearestTarget = target;
            }
        });

        // State Change Detection
        if (this.lockedTarget !== nearestTarget) {
            // New Lock Acquired or Lost
            if (nearestTarget) {
                // Play "Snap" animation
                this.lockBracket.setScale(2.0);
                this.tweens.add({
                    targets: this.lockBracket,
                    scale: this.missiles.contains(nearestTarget) ? 0.7 : 1, // Final scale
                    duration: 150,
                    ease: 'Back.easeOut'
                });
            }
        }

        this.lockedTarget = nearestTarget;

        // Update Visuals
        const crosshairDiamond = this.crosshair.getAt(0) as Phaser.GameObjects.Polygon; // Diamond
        const crosshairDot = this.crosshair.getAt(1) as Phaser.GameObjects.Arc;     // Dot

        if (nearestTarget) {
            this.lockStatusText.setText('TARGET\nLOCK ON').setColor('#ff2222');
            this.lockBracket.setVisible(true);
            this.lockBracket.x = Phaser.Math.Linear(this.lockBracket.x, (nearestTarget as any).x, frameLerp(0.25, delta));
            this.lockBracket.y = Phaser.Math.Linear(this.lockBracket.y, (nearestTarget as any).y, frameLerp(0.25, delta));

            // Sync scale only if not animating snap (check tween? or just let update overwrite it gently? 
            // The tween above handles the snap. We should probably only LERP position here.
            // But we need to maintain the correct final scale (0.7 vs 1).
            // Let's rely on the tween for the snap, and set the target scale for next frames.
            // Simplify: Just force scale if not tweening, or just let it be. 
            // For robustness, we can just set it here, but it might override the tween.
            // Actually, if we just set it here without LERP, it pops.
            // Let's only set target scale if we are STABLE.
            // For now, let's assume the tween handles the entry, and we just maintain it.
            // A simple approach is just setting it every frame.
            if (!this.tweens.isTweening(this.lockBracket)) {
                const isMissile = this.missiles.contains(nearestTarget);
                this.lockBracket.setScale(isMissile ? 0.7 : 1);
            }

            // Crosshair Color Change (Cyan for lock)
            crosshairDiamond.setStrokeStyle(2, 0x00ffff, 1);
            crosshairDot.setFillStyle(0x00ffff);

            // MAGNETIC AUTO-AIM (Tuned)
            // Snap the crosshair target to the enemy if we have a lock
            // We blend the magnetic position with the raw input for a "sticky" feel
            const magnetStrength = frameLerp(0.4, delta); // Reduced from 0.6 for smoother manual-assist feel
            this.crosshairTarget.x = Phaser.Math.Linear(this.crosshairTarget.x, (nearestTarget as any).x, magnetStrength);
            this.crosshairTarget.y = Phaser.Math.Linear(this.crosshairTarget.y, (nearestTarget as any).y, magnetStrength);

        } else {
            this.lockStatusText.setText('SCANNING...').setColor('#ff4444');
            this.lockBracket.setVisible(false);

            // Revert Crosshair Color (Red)
            crosshairDiamond.setStrokeStyle(2, 0xff4444, 0.8);
            crosshairDot.setFillStyle(0xff4444);
        }

        // Crosshair LERP
        this.crosshair.x = Phaser.Math.Linear(this.crosshair.x, this.crosshairTarget.x, frameLerp(0.2, delta));
        this.crosshair.y = Phaser.Math.Linear(this.crosshair.y, this.crosshairTarget.y, frameLerp(0.2, delta));

        if (fireRequested) this.game.events.emit('FIRE');
        if (firingCannon) this.updateFistCannon(_time, this.crosshair.x, this.crosshair.y);

        // Enemy Separation Logic
        const enemies = this.enemies.getChildren();
        for (let i = 0; i < enemies.length; i++) {
            const e1 = enemies[i] as any;
            for (let j = i + 1; j < enemies.length; j++) {
                const e2 = enemies[j] as any;
                const dist = Phaser.Math.Distance.Between(e1.x, e1.y, e2.x, e2.y);
                const minSep = 70; // Minimum separation distance
                if (dist < minSep) {
                    const angle = Phaser.Math.Angle.Between(e1.x, e1.y, e2.x, e2.y);
                    const force = 0.5 * frame;
                    e1.x -= Math.cos(angle) * force;
                    e1.y -= Math.sin(angle) * force;
                    e2.x += Math.cos(angle) * force;
                    e2.y += Math.sin(angle) * force;
                }
            }
        }

        // Enemy Behavior (using sprites)
        this.enemies.getChildren().forEach((enemy: any) => {
            if (enemy.texture.key.startsWith('enemyV3')) {
                // EnemyV3: Spin and Enlarge (Faster growth)
                if (!enemy.isAnimating) {
                    enemy.rotation += 0.05 * frame;
                    enemy.setScale(enemy.scale + 0.002 * frame); // Increased from 0.0005
                }

                // If it reaches a certain size, fire death ray
                if (enemy.scale > 0.35 && !enemy.isFiring) { // Reduced from 0.45
                    enemy.isFiring = true;
                    enemy.isAnimating = true;
                    enemy.play('enemyV3_anim');
                    // Wait for animation to complete before firing ray
                    enemy.once('animationcomplete', () => {
                        this.fireEnemyV3Ray(enemy);
                    });
                }
            } else {
                enemy.x += Math.sin(_time * 0.001 + enemy.driftOffset) * 0.3 * frame;
                enemy.y += Math.cos(_time * 0.0008 + enemy.driftOffset) * 0.2 * frame;

                // Pass missile type based on enemy texture
                if (Math.random() < 1 - Math.pow(1 - 0.003, frame)) {
                    const isV2 = enemy.texture.key === 'enemyV2';
                    this.spawnMissile(enemy.x, enemy.y, isV2 ? 'V2' : 'V1');
                }
            }
        });

        // Missile Behavior
        this.missiles.getChildren().forEach((missile: any) => {
            missile.setScale(missile.scale + 0.015 * frame);
            missile.x = Phaser.Math.Linear(missile.x, vw / 2, frameLerp(0.003, delta));
            missile.y = Phaser.Math.Linear(missile.y, vh / 2, frameLerp(0.003, delta));
            missile.rotation += 0.05 * frame;

            if (missile.scale > 2.5) {
                if (this.takeDamage()) this.createImpact(missile.x, missile.y);
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
        const vScale = 0.35; // Adjusted depth limit to match new size cap
        const y = Phaser.Math.Between(80, vh * vScale);

        // Pick enemy type (V1, V2, or V3)
        const rand = Math.random();
        let enemyType = 'enemyV1';
        let isV3 = false;

        if (rand > 0.8) {
            enemyType = 'enemyV3_0';
            isV3 = true;
        } else if (rand > 0.4) {
            enemyType = 'enemyV2';
        }

        const enemy = this.add.sprite(x, y, enemyType);
        enemy.setDepth(5);
        (enemy as any).driftOffset = Math.random() * 100;

        if (isV3) {
            enemy.setScale(0.15);
            enemy.setTexture('enemyV3_0'); // Hold on first frame while growing
            (enemy as any).isFiring = false;
            (enemy as any).isAnimating = false;
        } else {
            enemy.setScale(0.18);
        }

        this.enemies.add(enemy);

        // Entrance animation
        enemy.setAlpha(0);
        this.tweens.add({
            targets: enemy,
            alpha: 1,
            scale: isV3 ? 0.2 : 0.22,
            duration: 400,
            ease: 'Back.easeOut'
        });

        this.time.delayedCall(20000, () => { if (enemy.active) enemy.destroy(); });
    }

    private fireEnemyV3Ray(enemy: any) {
        if (this.isGameOver || !enemy.active) return;

        // Visual warning
        const warning = this.add.circle(enemy.x, enemy.y, 10, 0xff0000, 0.5);
        this.tweens.add({
            targets: warning,
            scale: 8,
            alpha: 0,
            duration: 300, // Faster warning (was 500)
            onComplete: () => {
                warning.destroy();
                if (!enemy.active) return;

                this.cameras.main.flash(200, 255, 0, 0);
                this.cameras.main.shake(300, 0.015);
                this.takeDamage(); // Direct hit

                // Enemy retreats or resets (Faster despawn)
                this.tweens.add({
                    targets: enemy,
                    alpha: 0,
                    scale: 0.1,
                    duration: 300, // Faster retreat (was 1000)
                    onComplete: () => enemy.destroy()
                });
            }
        });
    }

    private spawnMissile(startX: number, startY: number, type: 'V1' | 'V2' = 'V1') {
        if (this.isGameOver) return;

        // Modern missile design (energy orb with trail)
        const missile = this.add.container(startX, startY);

        // Colors based on type
        // V1 (Orange/Red) vs V2 (Cyan/Blue)
        const coreColor = type === 'V1' ? 0xff4400 : 0x00ffff;
        const ringColor = type === 'V1' ? 0xffaa00 : 0x0088ff;
        const trail1Color = type === 'V1' ? 0xff6600 : 0x00ccff;
        const trail2Color = type === 'V1' ? 0xff8800 : 0x0044ff;

        // Core glow
        const core = this.add.circle(0, 0, 5, coreColor);
        core.setAlpha(0.9);
        missile.add(core);

        // Outer ring
        const ring = this.add.circle(0, 0, 8).setStrokeStyle(2, ringColor, 0.6);
        missile.add(ring);

        // Trail particles
        const trail1 = this.add.circle(-8, 0, 3, trail1Color, 0.5);
        const trail2 = this.add.circle(-14, 0, 2, trail2Color, 0.3);
        missile.add(trail1);
        missile.add(trail2);

        missile.setScale(0.5);
        missile.setDepth(8);
        this.missiles.add(missile);
    }

    private handleFire() {
        if (this.isGameOver || !this.scene.isActive()) return;

        // Visual: Play ShotV1 animation regardless of hit
        // Spawn at crosshair
        const shot = this.add.sprite(this.crosshair.x, this.crosshair.y, 'shotV1_1');
        shot.setDepth(28);
        shot.setScale(0.2); // Tiny, like missile
        shot.play('shotV1_anim');
        shot.on('animationcomplete', () => shot.destroy());

        if (this.lockedTarget && this.lockedTarget.active) {
            const target = this.lockedTarget;
            const isMissile = this.missiles.contains(target);

            this.addScore(isMissile ? 50 : 100);
            this.createExplosion((target as any).x, (target as any).y, isMissile ? 'explosionV1' : 'explosionV2', isMissile ? 0.3 : 0.45);
            target.destroy();
            this.lockedTarget = null;
            this.cameras.main.shake(40, 0.004);
            return;
        }

        // Fallback manual
        const hitRadius = 30; // Reduced from 65 for tighter manual accuracy (relies on magnet for ease)
        const cx = this.crosshair.x;
        const cy = this.crosshair.y;
        let hit = false;

        this.missiles.getChildren().forEach((missile: any) => {
            if (hit) return;
            const dist = Phaser.Math.Distance.Between(cx, cy, missile.x, missile.y);
            if (dist < hitRadius + missile.scale * 6) {
                this.addScore(50);
                this.createExplosion(missile.x, missile.y, 'explosionV1', 0.3);
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
                    this.createExplosion(enemy.x, enemy.y, 'explosionV2', 0.45);
                    enemy.destroy();
                    hit = true;
                }
            });
        }

        if (hit) this.cameras.main.shake(35, 0.003);
    }

    private createExplosion(x: number, y: number, animKey: string, scale: number = 0.5) {
        const explosion = this.add.sprite(x, y, `${animKey}_1`);
        explosion.setDepth(15);
        explosion.setScale(scale);
        explosion.play(animKey);
        explosion.on('animationcomplete', () => explosion.destroy());
    }

    private createImpact(_x: number, _y: number) {
        const flash = this.add.rectangle(this.scale.width / 4, this.scale.height / 2, this.scale.width / 2, this.scale.height, 0xff0000, 0.35);
        this.tweens.add({ targets: flash, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
        this.cameras.main.shake(150, 0.018);
    }

    private takeDamage(): boolean {
        if (this.isGameOver) return false;
        const hit = applyHullHit({ health: this.shieldLevel, protectedUntil: this.damageProtectedUntil }, 25, this.time.now);
        if (hit.health === this.shieldLevel) return false;
        this.shieldLevel = hit.health;
        this.damageProtectedUntil = hit.protectedUntil;

        const barWidth = (this.shieldLevel / 100) * 100;
        this.shieldBar.setSize(barWidth, 10);
        this.shieldBar.x = this.scale.width / 4 - (100 - barWidth) / 2;

        if (this.shieldLevel <= 40) this.shieldBar.setFillStyle(0xffaa00);
        if (this.shieldLevel <= 20) this.shieldBar.setFillStyle(0xff3333);

        if (this.shieldLevel <= 0) {
            this.lives--;
            this.updateLives();
            if (this.lives > 0) {
                this.shieldLevel = 100;
                this.shieldBar.setSize(100, 10);
                this.shieldBar.x = this.scale.width / 4;
                this.shieldBar.setFillStyle(0xff3333);
            } else {
                this.gameOver();
            }
        }
        this.defensesText.setText(`DEFENSES ${Math.ceil(this.shieldLevel)}%`);
        return true;
    }

    private updateLives() {
        this.livesText.setText('♥'.repeat(Math.max(0, this.lives)));
    }

    private addScore(points: number) {
        this.score += points;
        this.registry.set('missionScore', this.score);
        this.scoreText.setText(String(this.score).padStart(4, '0'));
    }

    private updateFistCannon(_time: number, x: number, y: number) {
        if (!this.palmCannonSprite) {
            this.palmCannonSprite = this.add.sprite(x, y, 'shotV2_1');
            this.palmCannonSprite.setDepth(30);
            this.palmCannonSprite.setScale(0.35); // Significantly smaller

            // Recursive animation loop with rotation
            const playAnim = () => {
                if (!this.palmCannonSprite || !this.palmCannonSprite.active) return;
                this.palmCannonSprite.play('shotV2_anim');
                this.palmCannonSprite.once('animationcomplete', () => {
                    if (!this.palmCannonSprite || !this.palmCannonSprite.active) return;
                    this.palmCannonSprite.rotation += Phaser.Math.DegToRad(30); // Rotate 30 deg
                    playAnim();
                });
            };
            playAnim();
        }

        this.palmCannonSprite.x = x;
        this.palmCannonSprite.y = y;

        // Collision Logic
        const hitRadius = 50; // Size of the cannon influence
        this.enemies.getChildren().forEach((enemy: any) => {
            if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < hitRadius) {
                this.addScore(10);
                this.createExplosion(enemy.x, enemy.y, 'explosionV2', 0.4);
                enemy.destroy();
            }
        });

        // Also hit missiles
        this.missiles.getChildren().forEach((missile: any) => {
            if (Phaser.Math.Distance.Between(x, y, missile.x, missile.y) < hitRadius) {
                this.addScore(5);
                this.createExplosion(missile.x, missile.y, 'explosionV1', 0.2);
                missile.destroy();
            }
        });
    }

    private gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        if (!this.registry.get('missionOutcome')) this.registry.set('missionOutcome', 'Gunner defenses breached');
        // Sync with Pilot
        this.game.events.emit('GUNNER_GAME_OVER');

        // Pause and Show Game Over
        this.scene.pause();
        if (!this.scene.isActive('GameOverScene') && !this.registry.get('gameOverPending')) {
            this.registry.set('gameOverPending', true);
            this.scene.launch('GameOverScene');
        }
    }

    private createAnimation(config: Phaser.Types.Animations.Animation) {
        if (config.key && !this.anims.exists(config.key)) this.anims.create(config);
    }

    private onResume() {
        this.lastHandTime = this.time.now;
        this.wasPointerDown = this.input.activePointer.leftButtonDown();
    }

    private pauseGame(reason?: string) {
        if (this.isGameOver || this.scene.isPaused() || this.scene.isActive('PauseScene') || this.registry.get('pausePending')) return;
        this.registry.set('pausePending', true);
        this.scene.pause('Strategic');
        this.scene.pause();
        this.scene.launch('PauseScene', { reason, missingRole: reason === 'HAND_LOST' ? 'gunner' : undefined });
    }
}
