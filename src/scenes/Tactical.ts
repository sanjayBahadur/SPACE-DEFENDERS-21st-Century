import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class Tactical extends Phaser.Scene {
    private cursor!: Phaser.GameObjects.Rectangle;
    private debugText!: Phaser.GameObjects.Text;

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

        // Crosshair pattern
        const cx = width / 4; // Center of this viewport (relative to camera)
        const cy = height / 2;
        this.add.circle(cx, cy, 100).setStrokeStyle(4, 0xff0000, 0.5);
        this.add.line(0, 0, cx - 120, cy, cx + 120, cy, 0xff0000, 0.5);
        this.add.line(0, 0, cx, cy - 120, cx, cy + 120, 0xff0000, 0.5);

        // Debug Cursor
        this.cursor = this.add.rectangle(0, 0, 20, 20, 0x00ff00);
        this.debugText = this.add.text(20, 60, 'Waiting for hand...', { fontSize: '16px', color: '#00ff00' });
    }

    update() {
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHandData();
            if (hands.length > 0) {
                // Using logic: If 2 hands, maybe map one to each?
                // For now, let's use the LAST hand for tactical if available, or first.
                // Or just map the same hand to both for testing.
                const hand = hands.length > 1 ? hands[1] : hands[0];

                // Local coordinates for this camera (0 to width/2)
                const viewWidth = this.scale.width / 2;
                const viewHeight = this.scale.height;

                this.cursor.x = hand.x * viewWidth;
                this.cursor.y = hand.y * viewHeight;

                let color = 0x00ff00;
                if (hand.gesture === 'FIST') color = 0xff0000;
                if (hand.gesture === 'GUN') color = 0xffff00;
                if (hand.gesture === 'PALM') color = 0x00ffff;

                this.cursor.setFillStyle(color);

                this.debugText.setText(
                    `Gesture: ${hand.gesture}\n` +
                    `X: ${hand.x.toFixed(2)}\n` +
                    `Y: ${hand.y.toFixed(2)}\n` +
                    `Hand: ${hand.isLeft ? 'Left' : 'Right'}`
                );
            } else {
                this.debugText.setText('No hand detected');
            }
        }
    }
}
