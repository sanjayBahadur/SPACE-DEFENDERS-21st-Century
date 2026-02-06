import Phaser from 'phaser';

export class Credits extends Phaser.Scene {
    private domElement: HTMLElement | null = null;

    constructor() {
        super('Credits');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        // Starfield (Simple)
        for (let i = 0; i < 100; i++) {
            this.add.circle(
                Phaser.Math.Between(0, 1280), Phaser.Math.Between(0, 720),
                Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5)
            );
        }

        // Start Crawl
        this.startCreditCrawl();
    }

    private startCreditCrawl() {
        const overlay = document.createElement('div');
        overlay.id = 'crawl-container'; // Reuse Main ID for base style
        // Use .credits-crawl for the slower specific animation (70s)
        overlay.innerHTML = `
            <div class="crawl-content credits-crawl">
                <div class="crawl-title">CREDITS</div>
                 <div class="crawl-subtitle">The Galaxy thanks you</div>
                <div class="crawl-body">
                    <p><strong>SPACE DEFENDERS TEAM</strong><br><br>Sanjay Malla<br>(sanjayBahadur)</p>
                    <p><strong>LIBRARIES & TECH</strong><br><br>Phaser 3<br>MediaPipe Hands<br>TypeScript<br>Vite</p>
                    <p><strong>SPECIAL THANKS</strong><br><br>Mina<br>The 21st Century<br>Open Source Contributors</p>
                    <p>The Force will be with you.<br>Always.</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.domElement = overlay;

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

        // Click to exit anytime
        this.input.on('pointerdown', () => this.returnToMenu());
    }

    private returnToMenu() {
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
        }
        this.scene.start('MainMenu', { skipIntro: true });
    }
}
