import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureMenuController, canvasBounds, type MenuTarget } from '../src/ui/GestureMenu.ts';
import type { HandData } from '../src/types/HandGesture.ts';
import type Phaser from 'phaser';

const viewport = { width: 1000, height: 600 };
const resume: MenuTarget = { id: 'resume', bounds: { x: 400, y: 200, width: 200, height: 80 }, activate() {} };
const home: MenuTarget = { id: 'home', bounds: { x: 400, y: 300, width: 200, height: 80 }, activate() {} };
const targets = [resume, home];
const pointing = (overrides: Partial<HandData> = {}): HandData => ({
    x: 0.5, y: 0.4, gesture: 'GUN', isLeft: false, indexExtended: true, ...overrides,
});

test('right index pointing maps client pixels and hits only available menu bounds', () => {
    const controller = new GestureMenuController();
    assert.deepEqual(controller.update(pointing(), targets, viewport, 0).pointer, { x: 500, y: 240 });
    assert.equal(controller.update(pointing(), targets, viewport, 0).target, resume);
    assert.equal(controller.update(pointing({ y: 0.55 }), targets, viewport, 0).target, home);
    assert.equal(controller.update(pointing(), [home], viewport, 0).target, null, 'Disabled options can be excluded');
    assert.equal(controller.update(pointing({ x: 0.1 }), targets, viewport, 0).target, null);
    for (const hand of [pointing({ isLeft: true }), pointing({ gesture: 'PALM' }),
        pointing({ gesture: 'FIST' }), pointing({ indexExtended: false }), pointing({ x: NaN })]) {
        assert.equal(controller.update(hand, targets, viewport, 0).pointer, null);
    }
});

test('menu fingertip coordinates respect skeleton frame offsets and reject invalid samples', () => {
    const controller = new GestureMenuController();
    const hand = pointing({ x: 2 / 7, menuPointer: { x: 0.65, y: 0.25 } });
    assert.deepEqual(controller.update(hand, [], { x: 100, y: 50, width: 800, height: 450 }, 0).pointer,
        { x: 620, y: 162.5 });
    for (const menuPointer of [{ x: NaN, y: 0.25 }, { x: 0.65, y: Infinity }]) {
        assert.equal(controller.update(pointing({ menuPointer }), targets, viewport, 0).pointer, null);
    }
});

test('flick selection requires stable target acquisition and resets on target change', () => {
    const controller = new GestureMenuController();
    controller.update(pointing(), targets, viewport, 0);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 100).activate, null);
    controller.update(pointing(), targets, viewport, 110);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 130).activate, resume);
    controller.update(pointing({ y: 0.55 }), targets, viewport, 600);
    assert.equal(controller.update(pointing({ y: 0.55, flickDetected: true }), targets, viewport, 650).activate, null);
    controller.update(pointing({ y: 0.55 }), targets, viewport, 680);
    assert.equal(controller.update(pointing({ y: 0.55, flickDetected: true }), targets, viewport, 730).activate, home);
});

test('held flicks and rapid second flicks cannot repeatedly activate a menu', () => {
    const controller = new GestureMenuController();
    controller.update(pointing(), targets, viewport, 0);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 130).activate, resume);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 600).activate, null);
    controller.update(pointing(), targets, viewport, 610);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 620).activate, resume);
    controller.update(pointing(), targets, viewport, 630);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 640).activate, null);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 1100).activate, null,
        'A flick rejected during cooldown must still be released');
    controller.update(pointing(), targets, viewport, 1110);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 1120).activate, resume);
});

test('lost hands hide feedback and reacquisition requires a fresh dwell and flick release', () => {
    const controller = new GestureMenuController();
    controller.update(pointing(), targets, viewport, 0);
    assert.deepEqual(controller.update(null, targets, viewport, 200), { pointer: null, target: null, activate: null });
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 500).activate, null);
    controller.update(pointing(), targets, viewport, 510);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 550).activate, null);
    controller.update(pointing(), targets, viewport, 620);
    assert.equal(controller.update(pointing({ flickDetected: true }), targets, viewport, 630).activate, resume);
});

test('a new menu cannot inherit the flick that activated the preceding menu', () => {
    const oldMenu = new GestureMenuController();
    oldMenu.update(pointing(), targets, viewport, 0);
    assert.equal(oldMenu.update(pointing({ flickDetected: true }), targets, viewport, 150).activate, resume);
    const newMenu = new GestureMenuController();
    assert.equal(newMenu.update(pointing({ flickDetected: true }), targets, viewport, 150).activate, null);
    assert.equal(newMenu.update(pointing({ flickDetected: true }), targets, viewport, 400).activate, null);
    newMenu.update(pointing(), targets, viewport, 410);
    assert.equal(newMenu.update(pointing({ flickDetected: true }), targets, viewport, 420).activate, resume);
});

test('canvas target conversion accounts for scaling and letterboxed canvas offsets', () => {
    const scene = {
        game: { canvas: { getBoundingClientRect: () => ({ x: 100, y: 50, width: 800, height: 450 }) } },
        scale: { gameSize: { width: 1600, height: 900 } },
    } as unknown as Phaser.Scene;
    assert.deepEqual(canvasBounds(scene, { x: 400, y: 200, width: 600, height: 100 }),
        { x: 300, y: 150, width: 300, height: 50 });
});
