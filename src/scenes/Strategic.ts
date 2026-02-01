import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Strategic extends Phaser.Scene {
    private cursor!: Phaser.GameObjects.Arc;
    private debugText!: Phaser.GameObjects.Text;
    private isGrabbing = false;
    private shipTarget = new Phaser.Math.Vector2(0, 0);

    constructor() {
        super('Strategic');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Left Viewport (0 to 50% width)
        this.cameras.main.setViewport(0, 0, width / 2, height);
        this.cameras.main.setBackgroundColor('#002244'); // Deep Blue

        // UI Elements
        this.add.text(20, 20, 'STRATEGIC VIEW', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        });

        this.add.grid(
            width / 4, height / 2,
            width / 2, height,
            50, 50,
            0x004488, 0.5, 0x0066aa
        );

        // Debug Cursor (Ship)
        this.cursor = this.add.circle(width / 4, height / 2, 15, 0x00ff00);

        // Initialize target to center
        this.shipTarget.set(width / 4, height / 2);

        this.debugText = this.add.text(20, 60, 'Waiting for Pilot...', { fontSize: '16px', color: '#00ff00' });
    }

    update() {
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHands();
            const pilot = hands.pilot;

            if (pilot) {
                // Map normalized coordinates (0-1) to viewport size
                const viewWidth = this.scale.width / 2;
                const viewHeight = this.scale.height;
                const handX = pilot.x * viewWidth;
                const handY = pilot.y * viewHeight;

                // Gesture Logic
                if (pilot.gesture === 'FIST') {
                    // Update target only when grabbing (FIST)
                    this.shipTarget.x = handX;
                    this.shipTarget.y = handY;

                    this.cursor.setFillStyle(0xff0000); // Red for engaged
                    this.isGrabbing = true;
                } else if (pilot.gesture === 'PALM') {
                    if (this.isGrabbing) {
                        this.isGrabbing = false;
                        this.game.events.emit('GRAB_RELEASE');
                    }
                    this.cursor.setFillStyle(0x00ffff); // Cyan for Palm
                } else {
                    this.cursor.setFillStyle(0x00ff00); // Default
                }

                this.debugText.setText(
                    `Gesture: ${pilot.gesture}\n` +
                    `X: ${pilot.x.toFixed(2)}\n` +
                    `Y: ${pilot.y.toFixed(2)}\n` +
                    `Hand: Pilot (Left)`
                );
            } else {
                this.debugText.setText('Waiting for Pilot...');
            }
        }

        // LERP ship to target (0.15 factor)
        this.cursor.x = Phaser.Math.Linear(this.cursor.x, this.shipTarget.x, 0.15);
        this.cursor.y = Phaser.Math.Linear(this.cursor.y, this.shipTarget.y, 0.15);
    }
}
