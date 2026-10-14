import { gameAudio } from '../services/GameAudio';
import type Phaser from 'phaser';
import type { HandTracker } from '../services/HandTracker';
import type { HandData } from '../types/HandGesture';

export interface MenuBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MenuTarget {
    id: string;
    /** Browser client coordinates, matching getBoundingClientRect(). */
    bounds: MenuBounds;
    activate: () => void;
}

/** Convert logical game coordinates to client pixels, including canvas letterboxing. */
export function canvasBounds(scene: Phaser.Scene, bounds: MenuBounds): MenuBounds {
    const canvas = scene.game.canvas.getBoundingClientRect();
    const scaleX = canvas.width / scene.scale.gameSize.width;
    const scaleY = canvas.height / scene.scale.gameSize.height;
    return {
        x: canvas.x + bounds.x * scaleX,
        y: canvas.y + bounds.y * scaleY,
        width: bounds.width * scaleX,
        height: bounds.height * scaleY,
    };
}

export interface GestureMenuOptions {
    dwellMs?: number;
    cooldownMs?: number;
    now?: () => number;
}

export interface GestureMenuSelection {
    pointer: { x: number; y: number } | null;
    target: MenuTarget | null;
    activate: MenuTarget | null;
}

/** Independent of Phaser and the DOM so input transitions can be tested. */
export class GestureMenuController {
    private targetId: string | null = null;
    private targetSince = 0;
    private lastActivation = -Infinity;
    // Every menu needs a released flick before it can accept its first action.
    private flickReleased = false;
    private readonly dwellMs: number;
    private readonly cooldownMs: number;

    constructor(options: GestureMenuOptions = {}) {
        this.dwellMs = options.dwellMs ?? 120;
        this.cooldownMs = options.cooldownMs ?? 400;
    }

    update(
        hand: HandData | null,
        targets: MenuTarget[],
        viewport: { x?: number; y?: number; width: number; height: number },
        now: number,
    ): GestureMenuSelection {
        const flick = hand?.flickDetected === true;
        const released = this.flickReleased;
        if (hand) this.flickReleased = !flick;
        const position = hand?.menuPointer ?? hand;
        const canPoint = hand && position && !hand.isLeft && hand.indexExtended === true
            && hand.gesture !== 'PALM' && hand.gesture !== 'FIST'
            && Number.isFinite(position.x) && Number.isFinite(position.y);
        if (!canPoint) {
            this.targetId = null;
            this.flickReleased = false;
            return { pointer: null, target: null, activate: null };
        }

        const pointer = {
            x: (viewport.x ?? 0) + Math.max(0, Math.min(1, position.x)) * viewport.width,
            y: (viewport.y ?? 0) + Math.max(0, Math.min(1, position.y)) * viewport.height,
        };
        const target = targets.find(({ bounds }) => bounds.width > 0 && bounds.height > 0
            && pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width
            && pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height) ?? null;
        if (this.targetId !== (target?.id ?? null)) {
            this.targetId = target?.id ?? null;
            this.targetSince = now;
        }
        const activate = target && flick && released
            && now - this.targetSince >= this.dwellMs
            && now - this.lastActivation >= this.cooldownMs ? target : null;
        if (activate) this.lastActivation = now;
        return { pointer, target, activate };
    }
}

/** A scene-owned pointer and sliding selection box for native or canvas menus. */
export class GestureMenuNavigator {
    private readonly scene: Phaser.Scene;
    private readonly tracker: Pick<HandTracker, 'getHands'>;
    private readonly targets: () => MenuTarget[];
    private readonly controller: GestureMenuController;
    private readonly overlay: HTMLDivElement;
    private readonly pointer: HTMLDivElement;
    private readonly outline: HTMLDivElement;
    private readonly now: () => number;
    private disposed = false;
    private outlineVisible = false;
    private audibleTarget: string | null = null;
    private readonly onShutdown = () => this.dispose();

    constructor(
        scene: Phaser.Scene,
        tracker: Pick<HandTracker, 'getHands'>,
        targets: () => MenuTarget[],
        options: GestureMenuOptions = {},
    ) {
        this.scene = scene;
        this.tracker = tracker;
        this.targets = targets;
        this.controller = new GestureMenuController(options);
        this.now = options.now ?? (() => performance.now());
        this.overlay = document.createElement('div');
        this.overlay.className = 'gesture-menu-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');
        this.overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:110;overflow:hidden;';
        this.pointer = document.createElement('div');
        this.pointer.className = 'gesture-menu-pointer';

        this.outline = document.createElement('div');
        this.outline.className = 'gesture-menu-selection';

        this.overlay.append(this.outline, this.pointer);
        document.body.appendChild(this.overlay);
        this.scene.events.once('shutdown', this.onShutdown);
    }

    tick(): void {
        if (this.disposed) return;
        const { gunner } = this.tracker.getHands(true);
        // Use the skeleton's displayed frame, including any layout offsets.
        // With skeleton feedback off, its full-window frame still applies.
        const frame = document.getElementById('hand-debug-canvas');
        const viewport = frame?.getBoundingClientRect() ?? {
            width: window.innerWidth,
            height: window.innerHeight,
        };
        const selection = this.controller.update(gunner, this.targets(), viewport, this.now());
        const pointer = selection.pointer;
        this.pointer.style.display = pointer ? 'block' : 'none';
        if (pointer) this.pointer.style.transform = `translate(${pointer.x - 15}px, ${pointer.y - 15}px)`;
        const target = selection.target;
        if (target && target.id !== this.audibleTarget) gameAudio.play('hover');
        this.audibleTarget = target?.id ?? null;
        this.pointer.dataset.target = String(!!target);
        this.outline.style.display = target ? 'block' : 'none';
        if (target) {
            const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            this.outline.style.transition = this.outlineVisible && !reducedMotion
                ? 'transform 100ms ease-out, width 100ms ease-out, height 100ms ease-out' : 'none';
            const { x, y, width, height } = target.bounds;
            this.outline.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
            this.outline.style.width = `${width + 8}px`;
            this.outline.style.height = `${height + 8}px`;
        }
        this.outlineVisible = !!target;
        // Call last: activation may shut down this scene and dispose the overlay.
        selection.activate?.activate();
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.scene.events.off('shutdown', this.onShutdown);
        this.overlay.remove();
    }
}
