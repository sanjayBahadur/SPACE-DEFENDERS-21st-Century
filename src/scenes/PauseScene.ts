import Phaser from 'phaser';
import { HandTracker } from '../services/HandTracker';

export class PauseScene extends Phaser.Scene {
    private reason?: string;

    constructor() {
        super('PauseScene');
    }

    create(data?: { reason?: string }) {
        this.reason = data?.reason;

        const width = this.scale.width;
        const height = this.scale.height;

        // Semi-transparent dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85); // Darker background for image pop

        // --- TITLE IMAGE LOGIC ---
        // Default: Use Image
        // If Hand Lost: Maybe keep text or overlay text? 
        // User requested: "use this png on the title menu and pause menus."

        const titleImage = this.add.image(width / 2, height * 0.25, 'title').setOrigin(0.5);
        // Scale title
        const targetWidth = width * 0.5;
        const scale = targetWidth / titleImage.width;
        titleImage.setScale(scale);

        // Subtext / Context
        let subText = 'MISSION PAUSED';
        let subColor = '#FFE81F'; // Yellow default

        if (this.reason === 'HAND_LOST') {
            subText = '⚠️ PILOT DISCONNECTED ⚠️\nRETURN HANDS TO SENSOR RANGE';
            subColor = '#FF4444'; // Red alert
        }

        this.add.text(width / 2, height * 0.45, subText, {
            fontFamily: '"Orbitron", "Impact", sans-serif',
            fontSize: '32px',
            color: subColor,
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);


        // Merge into a single "RESUME MISSION" button
        this.createButton(width / 2, height * 0.6, 'RESUME MISSION', () => {
            this.resumeGame(true); // Manual resume enables keyboard mode
        });

        this.createButton(width / 2, height * 0.75, 'ABORT TO MENU', () => {
            this.scene.stop('Strategic');
            this.scene.stop('Tactical'); // Ensure other scenes are stopped too if running
            this.scene.stop();
            this.scene.start('MainMenu');
        });

        // Add keyboard listener to unpause
        this.input.keyboard!.on('keydown-P', () => {
            this.resumeGame(true); // Manual key press enables keyboard mode
        });
        this.input.keyboard!.on('keydown-ESC', () => {
            this.resumeGame(true); // Manual key press enables keyboard mode
        });
    }

    update() {
        // Auto-Resume check if paused due to lost hands
        if (this.reason === 'HAND_LOST') {
            const tracker = this.registry.get('handTracker') as HandTracker;
            if (tracker) {
                const hands = tracker.getHands();
                // If any hand is visible, resume automatically
                if (hands.pilot || hands.gunner) {
                    this.resumeGame(false); // Auto-resume prioritizes gesture control
                }
            }
        }
    }

    private resumeGame(isManual: boolean) {
        // If manual, disable auto-pause requirement for this session
        // If auto (hands detected), re-enable auto-pause requirement
        this.registry.set('manualKeyboardOverride', isManual);

        this.scene.resume('Tactical');
        this.scene.resume('Strategic');
        this.scene.stop();
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const container = this.add.container(x, y);

        const textObj = this.add.text(0, 0, text, {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '32px',
            color: '#FFE81F', // Match functionality of Main Menu
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, textObj.width + 60, textObj.height + 30, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            textObj.setColor('#FFFFFF');
            textObj.setScale(1.1);
        });
        hitArea.on('pointerout', () => {
            textObj.setColor('#FFE81F');
            textObj.setScale(1.0);
        });
        hitArea.on('pointerdown', callback);

        container.add([hitArea, textObj]);
        return container;
    }
}
