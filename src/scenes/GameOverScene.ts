import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
    private leaving = false;
    constructor() {
        super('GameOverScene');
    }

    create() {
        this.leaving = false;
        const width = this.scale.width;
        const height = this.scale.height;

        // Semi-transparent dark overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        // Title
        this.add.text(width / 2, height * 0.3, 'GAME OVER', {
            fontFamily: '"Orbitron", "Impact", sans-serif',
            fontSize: '64px',
            color: '#FF4444',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const score = Math.max(0, Number(this.registry.get('missionScore')) || 0);
        const seconds = Math.floor(Math.max(0, Number(this.registry.get('missionSeconds')) || 0));
        const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        this.add.text(width / 2, height * 0.42, `SCORE ${score.toLocaleString()}  ·  TIME ${duration}`, {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '24px', color: '#FFE81F', align: 'center'
        }).setOrigin(0.5);

        // Retry Button
        this.createButton(width / 2, height * 0.55, 'RETRY MISSION', () => {
            if (this.leaving) return;
            this.leaving = true;
            this.scene.stop();
            // Stop game scenes to reset them
            this.scene.stop('Strategic');
            this.scene.stop('Tactical');

            // Restart them
            this.scene.start('Strategic');
            this.scene.launch('Tactical');
        });

        // Main Menu Button
        this.createButton(width / 2, height * 0.7, 'RETURN TO MENU', () => {
            if (this.leaving) return;
            this.leaving = true;
            this.scene.stop('Strategic');
            this.scene.stop('Tactical');
            this.scene.stop();
            this.scene.start('MainMenu', { skipIntro: true });
        });
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const container = this.add.container(x, y);

        const textObj = this.add.text(0, 0, text, {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '32px',
            color: '#FFE81F',
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
