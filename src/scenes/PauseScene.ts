import Phaser from 'phaser';
import type { HandTracker } from '../services/HandTracker';
import { GestureMenuNavigator, canvasBounds } from '../ui/GestureMenu';
import type { MenuTarget } from '../ui/GestureMenu';
import { mountPauseGuides } from '../ui/stationGuides';

export class PauseScene extends Phaser.Scene {
    private reason?: string;
    private missingRole?: 'pilot' | 'gunner';
    private leaving = false;
    private gestureMenu?: GestureMenuNavigator;
    private menuTargets: Array<() => MenuTarget | null> = [];
    private connectionText!: Phaser.GameObjects.Text;
    private resumeButton!: Phaser.GameObjects.Container;

    constructor() {
        super('PauseScene');
    }

    create(data?: { reason?: string; missingRole?: 'pilot' | 'gunner' }) {
        this.reason = data?.reason;
        this.missingRole = data?.missingRole;
        this.leaving = false;
        this.menuTargets = [];
        this.gestureMenu = undefined;
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
        const subText = 'MISSION PAUSED';
        const subColor = '#FFE81F';

        this.connectionText = this.add.text(width / 2, height * 0.43, subText, {
            fontFamily: '"Orbitron", "Impact", sans-serif',
            fontSize: '26px',
            wordWrap: { width: 520, useAdvancedWrap: true },
            color: subColor,
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);


        // Merge into a single "RESUME MISSION" button
        this.resumeButton = this.createButton(width / 2, height * 0.55, 'RESUME MISSION', () => {
            this.resumeGame(true);
        }, () => this.resumeGame(false), () => this.canGestureResume());

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

        this.add.text(width / 2, height * 0.93, isKeyboardMode
            ? 'P / ESC TO RESUME'
            : 'POINT YOUR RIGHT INDEX · FLICK THUMB TO SELECT · P / ESC TO RESUME', {
            fontFamily: '"Century Gothic", Futura, sans-serif',
            fontSize: '18px', color: '#FFE81F', align: 'center'
        }).setOrigin(0.5);
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        if (!isKeyboardMode && tracker) {
            this.gestureMenu = new GestureMenuNavigator(this, tracker, () => this.menuTargets
                .map(target => target()).filter((target): target is MenuTarget => target !== null));
        }
        mountPauseGuides(this);
        this.updateConnection();

        // Add keyboard listener to unpause
        const keyResume = (event: KeyboardEvent) => {
            if (!event.repeat) this.resumeGame(true);
        };
        this.input.keyboard?.on('keydown-P', keyResume);
        this.input.keyboard?.on('keydown-ESC', keyResume);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown-P', keyResume);
            this.input.keyboard?.off('keydown-ESC', keyResume);
            this.gestureMenu = undefined;
            this.menuTargets = [];
        });
    }

    update() {
        this.updateConnection();
        this.gestureMenu?.tick();
    }

    private canGestureResume(): boolean {
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        if (this.registry.get('keyboardMode') === true || tracker?.getStatus() !== 'ready') return false;
        const hands = tracker.getHands();
        // Both stations need their hand back before gesture-controlled play resumes.
        return !!hands.pilot && !!hands.gunner;
    }

    private updateConnection() {
        if (this.reason !== 'HAND_LOST' || this.registry.get('keyboardMode') === true) return;
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        const ready = this.canGestureResume();
        const hands = tracker?.getHands();
        const missing = !hands?.pilot ? 'pilot' : !hands.gunner ? 'gunner' : this.missingRole;
        const role = (ready ? this.missingRole : missing)?.toUpperCase() ?? 'HANDS';
        const cameraReady = tracker?.getStatus() === 'ready';
        this.connectionText.setText(ready
            ? `${role} RECONNECTED\nPOINT AT RESUME AND FLICK YOUR THUMB`
            : cameraReady
                ? `${role} DISCONNECTED\nRETURN ${missing === 'pilot' ? 'LEFT HAND' : missing === 'gunner' ? 'RIGHT HAND' : 'HANDS'} TO SENSOR RANGE`
                : 'CAMERA DISCONNECTED\nUSE KEYBOARD & MOUSE OR RETURN TO MENU');
        this.connectionText.setColor(ready ? '#FFE81F' : '#FF4444');
        this.resumeButton.setAlpha(ready ? 1 : 0.6);
    }

    private resumeGame(isManual: boolean) {
        if (this.leaving) return;
        if (!isManual && !this.canGestureResume()) return;
        this.leaving = true;
        // Recovering a hand keeps gesture safety active. P / ESC remains a manual
        // escape hatch if a camera has stopped or the missing hand is unavailable.
        const tracker = this.registry.get('handTracker') as HandTracker | undefined;
        this.registry.set('manualKeyboardOverride', isManual && !this.canGestureResume());
        tracker?.getHands(true); // The menu confirmation must never also fire a shot.

        this.scene.resume('Tactical');
        this.scene.resume('Strategic');
        this.scene.stop();
    }

    private createButton(x: number, y: number, text: string, callback: () => void,
        gestureCallback = callback, enabled = () => true) {
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
        this.menuTargets.push(() => enabled() ? ({
            id: text,
            bounds: canvasBounds(this, hitArea.getBounds()),
            activate: gestureCallback,
        }) : null);
        return container;
    }

}
