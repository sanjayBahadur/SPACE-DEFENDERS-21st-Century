import Phaser from 'phaser';
import type { HandTracker } from '../services/HandTracker';

export class PauseScene extends Phaser.Scene {
    private reason?: string;
    private leaving = false;

    constructor() {
        super('PauseScene');
    }

    create(data?: { reason?: string }) {
        this.reason = data?.reason;
        this.leaving = false;
        this.registry.set('pausePending', false);

        const width = this.scale.width;
        const height = this.scale.height;

        // Semi-transparent dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85); // Darker background for image pop

        const titleImage = this.add.image(width / 2, height * 0.25, 'title').setOrigin(0.5);
        // Scale title
        const targetWidth = width * 0.5;
        const scale = targetWidth / titleImage.width;
        titleImage.setScale(scale);

        // Subtext / Context
        let subText = 'MISSION PAUSED';
        let subColor = '#FFE81F'; // Yellow default

        if (this.reason === 'HAND_LOST') {
            subText = 'PILOT DISCONNECTED\nRETURN HANDS TO SENSOR RANGE';
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
        this.createButton(width / 2, height * 0.55, 'RESUME MISSION', () => {
            this.resumeGame(true);
        });

        // Switching to keyboard releases the camera. Camera setup stays in the menu.
        const isKeyboardMode = this.registry.get('keyboardMode') === true;
        if (isKeyboardMode) {
            this.add.text(width / 2, height * 0.68, 'KEYBOARD & MOUSE MODE', {
                fontFamily: '"Century Gothic", Futura, sans-serif',
                fontSize: '24px', color: '#FFE81F'
            }).setOrigin(0.5);
        } else {
            this.createButton(width / 2, height * 0.68, 'USE KEYBOARD & MOUSE', () => {
                (this.registry.get('handTracker') as HandTracker | undefined)?.stop();
                this.registry.set('keyboardMode', true);
                this.resumeGame(true);
            });
        }

        this.createButton(width / 2, height * 0.82, 'ABORT TO MENU', () => {
            if (this.leaving) return;
            this.leaving = true;
            this.scene.stop('Strategic');
            this.scene.stop('Tactical'); // Ensure other scenes are stopped too if running
            this.scene.stop();
            this.scene.start('MainMenu', { skipIntro: true });
        });

        // Add keyboard listener to unpause
        const keyResume = (event: KeyboardEvent) => {
            if (!event.repeat) this.resumeGame(true);
        };
        this.input.keyboard?.on('keydown-P', keyResume);
        this.input.keyboard?.on('keydown-ESC', keyResume);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown-P', keyResume);
            this.input.keyboard?.off('keydown-ESC', keyResume);
        });
    }

    private resumeGame(isManual: boolean) {
        if (this.leaving) return;
        this.leaving = true;
        // Manual resume keeps intermittent tracking from immediately pausing again.
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
