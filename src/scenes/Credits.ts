import Phaser from 'phaser';

export class Credits extends Phaser.Scene {
    constructor() {
        super('Credits');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.cameras.main.setBackgroundColor('#000000');

        // Starfield (Simple repeated background)
        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.5, 1.5),
                0xffffff,
                Phaser.Math.FloatBetween(0.1, 0.5)
            );
        }

        const title = this.add.text(width / 2, 80, 'CREDITS', {
            fontFamily: 'Impact',
            fontSize: '48px',
            color: '#ffcc00'
        }).setOrigin(0.5);

        const creditsText = [
            'Game Design & Development',
            'Space Defenders Team',
            '',
            'Art & Assets',
            'OpenGameArt.org',
            '',
            'Special Thanks',
            'Sanjay Bahadur',
            'Mina',
            'The 21st Century',
            '',
            'Inspiration',
            'Star Wars (Episode IV - VI)',
            'Top Gun'
        ];

        let startY = 180;
        creditsText.forEach((line, index) => {
            this.add.text(width / 2, startY + (index * 40), line, {
                fontFamily: 'Courier',
                fontSize: index % 3 === 0 ? '24px' : '18px',
                color: index % 3 === 0 ? '#4488ff' : '#ffffff',
                fontStyle: index % 3 === 0 ? 'bold' : 'normal'
            }).setOrigin(0.5);
        });

        // Back Button
        const backBtn = this.add.text(width / 2, height - 80, 'BACK TO MENU', {
            fontFamily: 'Courier',
            fontSize: '24px',
            color: '#ffcc00',
            backgroundColor: '#002244',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerout', () => backBtn.setColor('#ffcc00'));
    }
}
