import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';
// import type { HandData } from '../types/HandGesture';

export class Strategic extends Phaser.Scene {
    private cursor!: Phaser.GameObjects.Arc;
    private debugText!: Phaser.GameObjects.Text;

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

        // Debug Cursor
        this.cursor = this.add.circle(0, 0, 15, 0x00ff00);
        this.debugText = this.add.text(20, 60, 'Waiting for hand...', { fontSize: '16px', color: '#00ff00' });
    }

    update() {
        const tracker = this.registry.get('handTracker') as HandTracker;
        if (tracker) {
            const hands = tracker.getHandData();
            if (hands.length > 0) {
                // Use the first hand found or logic for left/right specific
                // For now, map the primary hand to this view
                const hand = hands[0];

                // Map normalized coordinates (0-1) to viewport size
                const viewWidth = this.scale.width / 2;
                const viewHeight = this.scale.height;

                this.cursor.x = hand.x * viewWidth;
                this.cursor.y = hand.y * viewHeight; // Y is not flipped in Phaser usually (0 is top) unless configured

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
