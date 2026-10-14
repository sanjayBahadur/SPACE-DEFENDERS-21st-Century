import Phaser from 'phaser';
import type { HandTracker } from '../services/HandTracker';
import { GestureMenuNavigator } from '../ui/GestureMenu';

export class Credits extends Phaser.Scene {
    private domElement: HTMLElement | null = null;
    private leaving = false;
    private creditsTimer?: number;
    private gestureMenu?: GestureMenuNavigator;

    constructor() {
        super('Credits');
    }

    create() {
        this.leaving = false;
        this.gestureMenu = undefined;
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
            if (this.creditsTimer !== undefined) window.clearTimeout(this.creditsTimer);
            this.creditsTimer = undefined;
            this.domElement?.remove();
            this.domElement = null;
            this.gestureMenu = undefined;
        });
    }

    update() {
        this.gestureMenu?.tick();
    }

    private startCreditCrawl() {
        const overlay = document.createElement('div');
        overlay.id = 'crawl-container'; // Reuse Main ID for base style
        // Keep the original crawl, with a fifteen-second return to the menu.
        overlay.innerHTML = `
            <button type="button" class="crawl-skip" aria-label="Back to menu">BACK TO MENU · ESC</button>
            <div class="crawl-content credits-crawl">
                <div class="crawl-title">CREDITS</div>
                 <div class="crawl-subtitle">The Galaxy thanks you</div>
                <div class="crawl-body">
                    <p><strong>SPACE DEFENDERS TEAM</strong><br>Sanjay Malla<br>(sanjayBahadur)</p>
                    <p><strong>LIBRARIES & TECH</strong><br>Phaser 3 · MediaPipe Hands<br>TypeScript · Vite</p>
                    <p><strong>SPECIAL THANKS</strong><br>Maddiem and Naviya<br>(for no reason)<br>and all the Open Source Contributors</p>
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
            width: 'max-content', maxWidth: 'calc(100vw - 32px)', textAlign: 'center',
        });
        backButton.addEventListener('click', () => this.returnToMenu());
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        if (this.registry.get('keyboardMode') !== true && tracker) {
            backButton.textContent = 'BACK TO MENU · POINT + THUMB FLICK · ESC';
            this.gestureMenu = new GestureMenuNavigator(this, tracker, () => [{
                id: 'back', bounds: backButton.getBoundingClientRect(), activate: () => this.returnToMenu(),
            }]);
        }

        // Animation end and a wall-clock fallback agree on the fifteen-second exit.
        const content = overlay.querySelector('.crawl-content');
        if (content) {
            content.addEventListener('animationend', () => {
                this.returnToMenu();
            });
        }

        // Browser time stays aligned with CSS even if the Phaser scene loses focus.
        this.creditsTimer = window.setTimeout(() => this.returnToMenu(), 15000);

    }

    private returnToMenu() {
        if (this.leaving) return;
        this.leaving = true;
        if (this.creditsTimer !== undefined) window.clearTimeout(this.creditsTimer);
        this.creditsTimer = undefined;
        if (this.domElement) {
            this.domElement.remove();
            this.domElement = null;
        }
        this.scene.start('MainMenu', { skipIntro: true });
    }
}
