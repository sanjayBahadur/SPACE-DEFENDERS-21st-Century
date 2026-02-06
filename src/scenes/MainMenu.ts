import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    private music!: Phaser.Sound.BaseSound;
    private stars: Phaser.GameObjects.Arc[] = [];
    private crawlText!: HTMLElement | null;
    private skipButton!: Phaser.GameObjects.Text;

    private mainGroup!: Phaser.GameObjects.Container;
    private controlsGroup!: Phaser.GameObjects.Container;
    private settingsGroup!: Phaser.GameObjects.Container;

    private skipIntro: boolean = false;

    constructor() {
        super('MainMenu');
    }

    init(data?: { skipIntro?: boolean }) {
        this.skipIntro = !!data?.skipIntro;
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

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

        // Initialize Menus first (hidden)
        this.createMenus();

        if (this.skipIntro) {
            // Show menu immediately
            this.mainGroup.setVisible(true);
            this.mainGroup.setAlpha(1);
        } else {
            // Start Intro
            this.startCrawl();

            this.skipButton = this.add.text(width - 20, 20, 'SKIP / MENU', {
                fontFamily: 'Courier',
                fontSize: '16px',
                color: '#4488ff'
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

            this.skipButton.on('pointerdown', () => {
                if (document.getElementById('crawl-container')) {
                    this.showMenuOrStopCrawl();
                }
            });
        }
    }

    update() {
        this.stars.forEach(star => {
            star.y += (star as any).speed;
            if (star.y > this.scale.height) {
                star.y = 0;
                star.x = Phaser.Math.Between(0, this.scale.width);
            }
        });
    }

    private startCrawl() {
        const overlay = document.createElement('div');
        overlay.id = 'crawl-container';
        overlay.innerHTML = `
            <div class="crawl-content">
                <div class="crawl-title">GAME INSTRUCTIONS</div>
                <div class="crawl-subtitle">Mastering Space Defenders is all about choosing your favorite way to fly!</div>
                <div class="crawl-body">
                    <p>For the ultimate immersive experience, try Hand Gesture controls! Simply hold your left hand in a fist to move your ship and release a fist to stop. To attack, make a finger gun with your right hand and flick your thumb to fire basic shots, or clench that same hand into a fist to unleash the powerful Fist Cannon.</p>
                    <p>If you prefer a classic setup, you can also use your Keyboard (WASD or Arrow Keys) to navigate and your Mouse to blast enemies. Use Left Click for standard shots and Right Click for the Fist Cannon. Whether you are using your hands or your hardware, the galaxy is counting on you.</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        (this.crawlText as any) = overlay;

        // Hard Cutoff (20s)
        this.time.delayedCall(20000, () => {
            // Only if still existing
            if (document.getElementById('crawl-container')) {
                this.showMenuOrStopCrawl();
            }
        });
    }

    private showMenuOrStopCrawl() {
        const overlay = document.getElementById('crawl-container');
        if (overlay) {
            overlay.remove();
            (this.crawlText as any) = null;
        }
        if (this.skipButton) this.skipButton.setVisible(false);

        this.mainGroup.setVisible(true);
        this.mainGroup.setAlpha(0);
        this.tweens.add({
            targets: this.mainGroup,
            alpha: 1,
            duration: 1000
        });
    }

    private createMenus() {
        const width = this.scale.width;
        const height = this.scale.height;

        // --- TITLE IMAGE ---
        // Ensure texture exists
        let title: Phaser.GameObjects.Image | Phaser.GameObjects.Text;

        if (this.textures.exists('title')) {
            title = this.add.image(width / 2, height * 0.20, 'title').setOrigin(0.5);
            // Scale logic: Max width 600px or 60% of screen, whichever is smaller? 
            // Or ensure it doesn't overlap buttons.
            // Buttons start at 0.45 * height (approx 324px).
            // Title is at 0.20 * height (144px).
            // Title should fit within top 35% of screen.

            const maxW = width * 0.7;
            const maxH = height * 0.3;

            const scaleX = maxW / title.width;
            const scaleY = maxH / title.height;
            const finalScale = Math.min(scaleX, scaleY, 1.0); // Don't upscale

            title.setScale(finalScale);
        } else {
            // Fallback text if image missing
            title = this.add.text(width / 2, height * 0.2, 'SPACE DEFENDERS', {
                fontFamily: 'Impact', fontSize: '64px', color: '#ffcc00'
            }).setOrigin(0.5);
        }

        // --- 1. MAIN GROUP ---
        this.mainGroup = this.add.container(0, 0);
        this.mainGroup.add(title);

        const mainBtns = [
            {
                text: 'START MISSION', cb: () => {
                    this.scene.start('Strategic');
                    this.scene.launch('Tactical');
                }
            }, // Start Game
            { text: 'GAME CONTROLS', cb: () => this.showControlsGroup() },
            { text: 'SETTINGS', cb: () => this.showSettingsGroup() },
            { text: 'CREDITS', cb: () => this.scene.start('Credits') }
        ];

        // Center vertically in the remaining space
        let startY = height * 0.5;
        const gap = 60;

        mainBtns.forEach((btn, idx) => {
            const b = this.createButton(width / 2, startY + (idx * gap), btn.text, btn.cb);
            this.mainGroup.add(b);
        });

        // --- 2. CONTROLS GROUP ---
        this.controlsGroup = this.add.container(0, 0);
        this.controlsGroup.setVisible(false);

        const controlsTitle = this.add.text(width / 2, height * 0.2, 'CONTROLS', {
            fontFamily: '"Orbitron", "Impact", sans-serif', fontSize: '64px', color: '#FFE81F', stroke: '#FFE81F', strokeThickness: 1
        }).setOrigin(0.5);
        this.controlsGroup.add(controlsTitle);

        const gestureToggle = this.createToggle(width / 2, startY, 'GESTURE CONTROL', 'useGestures');
        const keyboardToggle = this.createToggle(width / 2, startY + gap, 'KEYBOARD & MOUSE', 'useKeyboardControls');

        const backBtnControls = this.createButton(width / 2, height * 0.8, 'BACK', () => this.showMainGroup());

        this.controlsGroup.add([gestureToggle, keyboardToggle, backBtnControls]);


        // --- 3. SETTINGS GROUP ---
        this.settingsGroup = this.add.container(0, 0);
        this.settingsGroup.setVisible(false);
        const settingsTitle = this.add.text(width / 2, height * 0.2, 'SETTINGS', {
            fontFamily: '"Orbitron", "Impact", sans-serif', fontSize: '64px', color: '#FFE81F', stroke: '#FFE81F', strokeThickness: 1
        }).setOrigin(0.5);
        this.settingsGroup.add(settingsTitle);

        const cameraToggle = this.createToggle(width / 2, startY, 'CAMERA ACCESS', 'useCamera', (state) => {
            const tracker = this.registry.get('handTracker');
            if (tracker && tracker.setEnabled) {
                tracker.setEnabled(state);
            }
        });
        const soundToggle = this.createToggle(width / 2, startY + gap, 'SOUND', 'soundEnabled', (state) => {
            this.sound.mute = !state;
        });

        const backBtnSettings = this.createButton(width / 2, height * 0.8, 'BACK', () => this.showMainGroup());

        this.settingsGroup.add([cameraToggle, soundToggle, backBtnSettings]);

        this.mainGroup.setVisible(false);
    }

    private showMainGroup() {
        this.mainGroup.setVisible(true);
        this.controlsGroup.setVisible(false);
        this.settingsGroup.setVisible(false);
    }

    private showControlsGroup() {
        this.mainGroup.setVisible(false);
        this.controlsGroup.setVisible(true);
        this.settingsGroup.setVisible(false);
    }

    private showSettingsGroup() {
        this.mainGroup.setVisible(false);
        this.controlsGroup.setVisible(false);
        this.settingsGroup.setVisible(true);
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const container = this.add.container(x, y);

        const textObj = this.add.text(0, 0, text, {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '32px',
            color: '#FFE81F',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, textObj.width + 80, textObj.height + 30, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            textObj.setScale(1.1);
            textObj.setColor('#FFFFFF');
        });
        hitArea.on('pointerout', () => {
            textObj.setScale(1.0);
            textObj.setColor('#FFE81F');
        });
        hitArea.on('pointerdown', callback);

        container.add([hitArea, textObj]);
        return container;
    }

    private createToggle(x: number, y: number, label: string, registryKey: string, onToggle?: (state: boolean) => void) {
        const container = this.add.container(x, y);

        let state = this.registry.get(registryKey) ?? true;

        const updateText = () => `${label}: [${state ? 'ON' : 'OFF'}]`;

        const textObj = this.add.text(0, 0, updateText(), {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '28px',
            color: state ? '#00FF00' : '#FF4444',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, textObj.width + 60, textObj.height + 20, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
            state = !state;
            this.registry.set(registryKey, state);
            textObj.setText(updateText());
            textObj.setColor(state ? '#00FF00' : '#FF4444');
            if (onToggle) onToggle(state);
        });

        hitArea.on('pointerover', () => textObj.setScale(1.1));
        hitArea.on('pointerout', () => textObj.setScale(1.0));

        container.add([hitArea, textObj]);
        return container;
    }
}
