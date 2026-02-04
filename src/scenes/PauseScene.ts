import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Semi-transparent dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

        const title = this.add.text(width / 2, height * 0.3, 'GAME PAUSED', {
            fontFamily: 'Impact',
            fontSize: '56px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const resumeBtn = this.createButton(width / 2, height * 0.5, 'RESUME MISSION', () => {
            this.scene.resume('Strategic');
            this.scene.stop();
        });

        const menuBtn = this.createButton(width / 2, height * 0.65, 'ABORT TO MENU', () => {
            this.scene.stop('Strategic');
            this.scene.stop('Tactical'); // Ensure other scenes are stopped too if running
            this.scene.stop();
            this.scene.start('MainMenu');
        });

        // Add keyboard listener to unpause
        this.input.keyboard!.on('keydown-P', () => {
            this.scene.resume('Strategic');
            this.scene.stop();
        });
        this.input.keyboard!.on('keydown-ESC', () => {
            this.scene.resume('Strategic');
            this.scene.stop();
        });
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const container = this.add.container(x, y);

        const textObj = this.add.text(0, 0, text, {
            fontFamily: 'Courier',
            fontSize: '32px',
            color: '#4488ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, textObj.width + 60, textObj.height + 30, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => textObj.setColor('#ffffff'));
        hitArea.on('pointerout', () => textObj.setColor('#4488ff'));
        hitArea.on('pointerdown', callback);

        container.add([hitArea, textObj]);
        return container;
    }
}
