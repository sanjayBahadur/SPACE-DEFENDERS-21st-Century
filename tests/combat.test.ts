import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCannon, frameLerp } from '../src/utils/combat.ts';

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

test('motion smoothing retains its 60 fps response across refresh rates', () => {
    const oneFrame = frameLerp(0.2, 1000 / 60);
    const halfFrame = frameLerp(0.2, 1000 / 120);
    assert.ok(Math.abs(oneFrame - (1 - (1 - halfFrame) ** 2)) < 1e-10);
});

test('six-second cannon limit does not drift with floating-point frames', () => {
    for (const fps of [30, 60, 144]) {
        let cannon = { heat: 0, overheated: false };
        for (let i = 0; i < fps * 6; i++) cannon = advanceCannon(cannon, true, 1000 / fps);
        assert.deepEqual(cannon, { heat: 100, overheated: true });
    }
});
