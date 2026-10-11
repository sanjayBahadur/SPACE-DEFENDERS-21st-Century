import Phaser from 'phaser';

export class Credits extends Phaser.Scene {
    private domElement: HTMLElement | null = null;
    private leaving = false;

    constructor() {
        super('Credits');
    }

    create() {
        this.leaving = false;
        this.cameras.main.setBackgroundColor('#000000');

        // Starfield (Simple)
        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height),
                Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5)
            );
        }

        // Start Crawl
        this.startCreditCrawl();
        const returnToMenu = () => this.returnToMenu();
        this.input.keyboard?.on('keydown-ESC', returnToMenu);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown-ESC', returnToMenu);
            this.domElement?.remove();
            this.domElement = null;
        });
    }

    private startCreditCrawl() {
        const overlay = document.createElement('div');
        overlay.id = 'crawl-container'; // Reuse Main ID for base style
        // Use .credits-crawl for the slower specific animation (70s)
        overlay.innerHTML = `
            <button type="button" class="crawl-skip" aria-label="Back to menu">BACK TO MENU · ESC</button>
            <div class="crawl-content credits-crawl">
                <div class="crawl-title">CREDITS</div>
                 <div class="crawl-subtitle">The Galaxy thanks you</div>
                <div class="crawl-body">
                    <p><strong>SPACE DEFENDERS TEAM</strong><br><br>Sanjay Malla<br>(sanjayBahadur)</p>
                    <p><strong>LIBRARIES & TECH</strong><br><br>Phaser 3<br>MediaPipe Hands<br>TypeScript<br>Vite</p>
                    <p><strong>SPECIAL THANKS</strong><br><br>Maddiem and Naviya<br>(for no reason)<br>and all the Open Source Contributors</p>
                    <p>The Force will be with you.<br>Always.</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.domElement = overlay;
        const backButton = overlay.querySelector<HTMLButtonElement>('.crawl-skip')!;
        Object.assign(backButton.style, {
            position: 'absolute', top: 'auto', right: 'auto', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
            zIndex: '2', pointerEvents: 'auto', color: '#FFE81F', background: '#000000',
            border: '1px solid #FFE81F', padding: '12px 20px', cursor: 'pointer',
            fontFamily: '"Century Gothic", Futura, sans-serif', fontSize: '18px',
        });
        backButton.addEventListener('click', () => this.returnToMenu());

        // Auto-exit after 75s (css is 70s, give a buffer)
        // Or on animation end
        const content = overlay.querySelector('.crawl-content');
        if (content) {
            content.addEventListener('animationend', () => {
                this.returnToMenu();
            });
        }

        // Fallback
        this.time.delayedCall(75000, () => this.returnToMenu());

    }

    private returnToMenu() {
        if (this.leaving) return;
        this.leaving = true;
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
        }
        this.scene.start('MainMenu', { skipIntro: true });
    }
}
