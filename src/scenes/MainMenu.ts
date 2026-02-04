import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    private music!: Phaser.Sound.BaseSound;
    private stars: Phaser.GameObjects.Arc[] = [];
    private crawlText!: Phaser.GameObjects.Container;
    private skipButton!: Phaser.GameObjects.Text;
    private menuContainer!: Phaser.GameObjects.Container;

    constructor() {
        super('MainMenu');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Background
        this.cameras.main.setBackgroundColor('#000000');

        // Starfield
        for (let i = 0; i < 200; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.5, 1.5),
                0xffffff,
                Phaser.Math.FloatBetween(0.1, 0.8)
            );
            (star as any).speed = Phaser.Math.FloatBetween(0.05, 0.2);
            this.stars.push(star);
        }

        // Start Crawl Animation
        this.startCrawl();

        // Skip/Menu Button
        this.skipButton = this.add.text(width - 20, 20, 'SKIP / MENU', {
            fontFamily: 'Courier',
            fontSize: '16px',
            color: '#4488ff'
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.skipButton.on('pointerdown', () => {
            if (this.crawlText.visible) {
                this.showMenu();
            }
        });

        // Initialize Menu Container (Hidden initially)
        this.createMenu();
    }

    update() {
        // Starfield animation
        this.stars.forEach(star => {
            star.y += (star as any).speed;
            if (star.y > this.scale.height) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, this.scale.width);
            }
        });
    }

    private startCrawl() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.crawlText = this.add.container(width / 2, height + 100);

        // Responsive font sizes
        const titleSize = Math.max(32, width * 0.05); // 5% of width or min 32px
        const subTitleSize = Math.max(24, width * 0.04);
        const bodySize = Math.max(34, width * 0.045); // Bigger body text

        const titleStyle = { fontFamily: 'Courier', fontSize: `${titleSize}px`, color: '#ffcc00', fontStyle: 'bold', align: 'center' };
        const bodyStyle = {
            fontFamily: 'Courier',
            fontSize: `${bodySize}px`,
            color: '#ffcc00',
            fontStyle: 'bold',
            align: 'justify',
            wordWrap: { width: width * 0.8 } // 80% width
        };

        const line1 = this.add.text(0, 0, 'Episode XXI', { ...titleStyle, fontSize: `${subTitleSize}px` }).setOrigin(0.5);
        const line2 = this.add.text(0, titleSize * 2, 'DISNEY HAVE ALL YOUR MONEY', titleStyle).setOrigin(0.5);

        const content = "The evil DISNEY company have purchased Star Wars and now make endless amounts of colourful nonsense as an opiate for the masses. Everybody is mesmerised. Nobody is safe.";
        const body = this.add.text(0, titleSize * 5, content, bodyStyle).setOrigin(0.5, 0);

        this.crawlText.add([line1, line2, body]);

        // Crawl Tween with perspective scale
        this.tweens.add({
            targets: this.crawlText,
            y: -height * 1.5, // Move further up to ensure it clears
            scale: 0.2, // Shrink as it goes into "distance"
            duration: 25000, // Slightly slower for readability
            ease: 'Linear',
            onComplete: () => {
                this.showMenu();
            }
        });

        // Start big
        this.crawlText.setScale(1);
    }

    private showMenu() {
        this.crawlText.setVisible(false);
        this.skipButton.setVisible(false);
        this.menuContainer.setVisible(true);
        this.menuContainer.setAlpha(0);

        this.tweens.add({
            targets: this.menuContainer,
            alpha: 1,
            duration: 1000
        });
    }

    private createMenu() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.menuContainer = this.add.container(0, 0);
        this.menuContainer.setVisible(false);

        // Logo / Title
        const title = this.add.text(width / 2, height * 0.25, 'SPACE DEFENDERS', {
            fontFamily: 'Impact',
            fontSize: '64px',
            color: '#ffcc00',
            stroke: '#ff0000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Buttons
        const btnY = height * 0.5;
        const gap = 60;

        const playBtn = this.createButton(width / 2, btnY, 'START MISSION', () => {
            this.scene.start('Boot'); // Boot handles loading and then starts Strategic
        });

        const creditsBtn = this.createButton(width / 2, btnY + gap, 'CREDITS', () => {
            this.scene.start('Credits');
        });

        const controlsEnabled = this.registry.get('useKeyboardControls') ?? true;
        const controlsText = controlsEnabled ? 'CONTROLS: KEYBOARD & MOUSE [ON]' : 'CONTROLS: KEYBOARD & MOUSE [OFF]';
        const controlBtn = this.createButton(width / 2, btnY + gap * 2, controlsText, () => {
            const current = this.registry.get('useKeyboardControls') ?? true;
            const newState = !current;
            this.registry.set('useKeyboardControls', newState);

            // Update button text
            const newText = newState ? 'CONTROLS: KEYBOARD & MOUSE [ON]' : 'CONTROLS: KEYBOARD & MOUSE [OFF]';
            (controlBtn.getAt(1) as Phaser.GameObjects.Text).setText(newText);

            // Visual feedback color
            const newColor = newState ? 0x00ff00 : 0xff4444;
            (controlBtn.getAt(1) as Phaser.GameObjects.Text).setColor(newState ? '#00ff00' : '#ff4444');
        });

        // Initialize the registry default if not set
        if (this.registry.get('useKeyboardControls') === undefined) {
            this.registry.set('useKeyboardControls', true);
        }
        // Set initial color
        (controlBtn.getAt(1) as Phaser.GameObjects.Text).setColor(controlsEnabled ? '#00ff00' : '#ff4444');


        this.menuContainer.add([title, playBtn, creditsBtn, controlBtn]);
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const container = this.add.container(x, y);

        const textObj = this.add.text(0, 0, text, {
            fontFamily: 'Courier',
            fontSize: '28px',
            color: '#4488ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Invisible hit area
        const hitArea = this.add.rectangle(0, 0, textObj.width + 40, textObj.height + 20, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => textObj.setColor('#ffffff'));
        hitArea.on('pointerout', () => textObj.setColor(textObj.text.includes('OFF') ? '#ff4444' : (textObj.text.includes('ON') ? '#00ff00' : '#4488ff')));
        hitArea.on('pointerdown', callback);

        container.add([hitArea, textObj]);
        return container;
    }
}
