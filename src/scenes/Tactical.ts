import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Tactical extends Phaser.Scene {
    private cursor!: Phaser.GameObjects.Rectangle;
    private debugText!: Phaser.GameObjects.Text;
    private crosshairTarget = new Phaser.Math.Vector2(0, 0);

    constructor() {
        super('Tactical');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Right Viewport (50% to 100% width)
        this.cameras.main.setViewport(width / 2, 0, width / 2, height);
        this.cameras.main.setBackgroundColor('#441100'); // Deep Red

        // UI Elements
        this.add.text(20, 20, 'TACTICAL VIEW', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        });

        // Crosshair pattern (Midpoint of viewport)
        const cx = width / 4;
        const cy = height / 2;
        this.add.circle(cx, cy, 100).setStrokeStyle(4, 0xff0000, 0.5);
        this.add.line(0, 0, cx - 120, cy, cx + 120, cy, 0xff0000, 0.5);
        this.add.line(0, 0, cx, cy - 120, cx, cy + 120, 0xff0000, 0.5);

        // Debug Cursor
        // Start at center
        this.crosshairTarget.set(cx, cy);
        this.cursor = this.add.rectangle(cx, cy, 20, 20, 0x00ff00);

        this.debugText = this.add.text(20, 60, 'Waiting for Gunner...', { fontSize: '16px', color: '#00ff00' });
    }

    update() {
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

                // Gesture Logic
                if (gunner.gesture === 'GUN') {
                    // Update target only when aiming
                    this.crosshairTarget.x = targetX;
                    this.crosshairTarget.y = targetY;
                    this.cursor.setFillStyle(0xffff00); // Yellow for Gun

                    // Check for Fire
                    if (gunner.flickDetected) {
                        console.log('FIRE DETECTED!');
                        this.game.events.emit('FIRE');
                        // Visual feedback for fire
                        this.cameras.main.shake(100, 0.01);
                        this.cursor.setFillStyle(0xffffff);
                    }
                } else if (gunner.gesture === 'FIST') {
                    this.cursor.setFillStyle(0xff0000);
                } else if (gunner.gesture === 'PALM') {
                    this.cursor.setFillStyle(0x00ffff);
                } else {
                    this.cursor.setFillStyle(0x00ff00);
                }

                this.debugText.setText(
                    `Gesture: ${gunner.gesture}\n` +
                    `X: ${gunner.x.toFixed(2)}\n` +
                    `Y: ${gunner.y.toFixed(2)}\n` +
                    `Hand: Gunner (Right)\n` +
                    `Flick: ${gunner.flickDetected ? 'YES' : 'NO'}`
                );
            } else {
                this.debugText.setText('Waiting for Gunner...');
            }
        }

        // LERP crosshair to target (0.15 factor)
        this.cursor.x = Phaser.Math.Linear(this.cursor.x, this.crosshairTarget.x, 0.15);
        this.cursor.y = Phaser.Math.Linear(this.cursor.y, this.crosshairTarget.y, 0.15);
    }
}
