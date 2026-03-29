import test from 'node:test';
import assert from 'node:assert/strict';
import { absorbDamage, advanceCannon, advanceShield, frameLerp } from '../src/utils/combat.ts';

test('cannon duration and cooling agree at 30, 60 and 144 fps', () => {
    for (const fps of [30, 60, 144]) {
        let cannon = { heat: 0, overheated: false };
        for (let i = 0; i < fps * 3; i++) cannon = advanceCannon(cannon, true, 1000 / fps);
        assert.ok(Math.abs(cannon.heat - 50) < 1e-8);
        cannon = advanceCannon(cannon, true, 3001);
        assert.equal(cannon.overheated, true);
        cannon = advanceCannon(cannon, true, 2000);
        assert.equal(cannon.heat, 50);
        assert.equal(cannon.overheated, true, 'holding fire cannot bypass cooling');
        cannon = advanceCannon(cannon, true, 2000);
        assert.deepEqual(cannon, { heat: 0, overheated: false });
    }
});

test('releasing cannon cools without causing game-over heat', () => {
    const cannon = advanceCannon({ heat: 90, overheated: false }, false, 1000);
    assert.deepEqual(cannon, { heat: 65, overheated: false });
});

test('pilot shield absorbs hits and passes only excess damage to hull', () => {
    const state = { energy: 25, rechargeDelay: 0, exhausted: false, active: true };
    assert.equal(absorbDamage(state, 18).hullDamage, 0);
    const hit = absorbDamage(state, 30);
    assert.equal(hit.hullDamage, 5);
    assert.equal(hit.shield.energy, 0);
    assert.equal(hit.shield.exhausted, true);
    assert.equal(hit.shield.active, false);
    assert.equal(absorbDamage({ ...state, active: false }, 18).hullDamage, 18);
});

test('shield exhaustion requires release; recharge starts after delay', () => {
    const empty = advanceShield({ energy: 100, rechargeDelay: 0, exhausted: false, active: false }, true, 8000);
    assert.equal(empty.energy, 0);
    assert.equal(empty.exhausted, true);
    const held = advanceShield(empty, true, 2000);
    assert.equal(held.active, false);
    assert.equal(held.exhausted, true);
    const released = advanceShield(empty, false, 2500);
    assert.equal(released.energy, 20);
    assert.equal(released.exhausted, false);
    assert.equal(advanceShield(released, true, 16).active, true);
});

test('shield drain and recharge are independent of frame rate', () => {
    for (const fps of [30, 60, 144]) {
        let state = { energy: 100, rechargeDelay: 0, exhausted: false, active: false };
        for (let i = 0; i < fps * 4; i++) state = advanceShield(state, true, 1000 / fps);
        assert.ok(Math.abs(state.energy - 50) < 1e-8);
        for (let i = 0; i < fps * 4; i++) state = advanceShield(state, false, 1000 / fps);
        assert.ok(Math.abs(state.energy - 100) < 1e-8);
    }
});

test('motion smoothing retains its 60 fps response across refresh rates', () => {
    const oneFrame = frameLerp(0.2, 1000 / 60);
    const halfFrame = frameLerp(0.2, 1000 / 120);
    assert.ok(Math.abs(oneFrame - (1 - (1 - halfFrame) ** 2)) < 1e-10);
});


test('six-second cannon limit and eight-second shield exhaustion do not drift with floating-point frames', () => {
    for (const fps of [30, 60, 144]) {
        let cannon = { heat: 0, overheated: false };
        let shield = { energy: 100, rechargeDelay: 0, exhausted: false, active: false };
        for (let i = 0; i < fps * 6; i++) cannon = advanceCannon(cannon, true, 1000 / fps);
        for (let i = 0; i < fps * 8; i++) shield = advanceShield(shield, true, 1000 / fps);
        assert.deepEqual(cannon, { heat: 100, overheated: true });
        assert.equal(shield.energy, 0);
        assert.equal(shield.active, false);
        assert.equal(shield.exhausted, true);
    }
});

test('absorbed hits delay shield recharge and releasing restores activation', () => {
    const hit = absorbDamage({ energy: 100, rechargeDelay: 0, exhausted: false, active: true }, 30);
    const waiting = advanceShield(hit.shield, false, 1000);
    assert.equal(waiting.energy, 70);
    const recharging = advanceShield(waiting, false, 1500);
    assert.equal(recharging.energy, 80);
    assert.equal(advanceShield(recharging, true, 16).active, true);
});
