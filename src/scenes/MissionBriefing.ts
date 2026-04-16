import Phaser from 'phaser';
import type { HandTracker } from '../services/HandTracker';
import { GestureMenuNavigator } from '../ui/GestureMenu';
import { mountScreen } from '../ui/screens';
import { stationGuideMarkup } from '../ui/stationGuides';

/** A short preparation window: no hazards or mission clock start until launch. */
export class MissionBriefing extends Phaser.Scene {
    private leaving = false;
    private launchTimer?: number;
    private gestureMenu?: GestureMenuNavigator;
    private countdown?: HTMLElement;
    private launchAt = 0;
    private lastSeconds = -1;

    constructor() { super('MissionBriefing'); }

    create() {
        this.leaving = false;
        this.lastSeconds = -1;
        this.launchAt = performance.now() + 4000;
        this.cameras.main.setBackgroundColor('#000000');
        for (let i = 0; i < 120; i++) {
            this.add.circle(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height),
                Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.6));
        }
        const screen = mountScreen(this, `<section class="mission-briefing" aria-label="Mission briefing">
            <h1>GOOD LUCK, PILOT</h1>
            <p class="briefing-wish">May the Force be with you.</p>
            <div class="briefing-stations">${stationGuideMarkup('pilot')}${stationGuideMarkup('gunner')}</div>
            <p class="briefing-keyboard">KEYBOARD: WASD / ARROWS · MOUSE TO AIM & FIRE · SPACE FOR CANNON</p>
            <p class="briefing-countdown">LAUNCHING IN <span id="briefing-seconds">4</span>…</p>
            <button id="briefing-back" class="secondary">RETURN TO MENU · ESC</button>
        </section>`);
        screen.classList.add('briefing-screen');
        this.countdown = screen.querySelector('#briefing-seconds')!;
        const back = screen.querySelector<HTMLButtonElement>('#briefing-back')!;
        back.addEventListener('click', () => this.returnToMenu());
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        if (tracker && this.registry.get('keyboardMode') !== true) {
            this.gestureMenu = new GestureMenuNavigator(this, tracker, () => [{
                id: 'back', bounds: back.getBoundingClientRect(), activate: () => this.returnToMenu(),
            }]);
        }
        const escape = (event: KeyboardEvent) => { if (!event.repeat) this.returnToMenu(); };
        this.input.keyboard?.on('keydown-ESC', escape);
        this.launchTimer = window.setTimeout(() => this.launchMission(), 4000);
        this.events.once('shutdown', () => {
            if (this.launchTimer !== undefined) window.clearTimeout(this.launchTimer);
            this.launchTimer = undefined;
            this.input.keyboard?.off('keydown-ESC', escape);
            this.countdown = undefined;
            this.gestureMenu = undefined;
        });
    }

    update() {
        this.gestureMenu?.tick();
        const seconds = Math.max(0, Math.ceil((this.launchAt - performance.now()) / 1000));
        if (seconds !== this.lastSeconds && this.countdown) {
            this.lastSeconds = seconds;
            this.countdown.textContent = String(seconds);
        }
    }

    private launchMission() {
        if (this.leaving) return;
        this.leaving = true;
        (this.registry.get('handTracker') as HandTracker | undefined)?.getHands(true);
        this.scene.start('Strategic');
        this.scene.launch('Tactical');
    }

    private returnToMenu() {
        if (this.leaving) return;
        this.leaving = true;
        if (this.launchTimer !== undefined) window.clearTimeout(this.launchTimer);
        this.launchTimer = undefined;
        this.scene.start('MainMenu', { skipIntro: true });
    }
}
