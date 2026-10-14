import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyHullHit, applyHullExposure, METEOR_HULL_DAMAGE, DEATH_RAY_HULL_DAMAGE,
    BLACK_HOLE_DAMAGE_PER_SECOND, HULL_HIT_RECOVERY_MS, type HullState,
} from '../src/utils/hull.ts';

const fullHull = (): HullState => ({ health: 100, protectedUntil: 0 });

test('a full hull survives five separate meteor collisions', () => {
    let state = fullHull();
    for (let hit = 0; hit < 5; hit++) {
        state = applyHullHit(state, METEOR_HULL_DAMAGE, hit * HULL_HIT_RECOVERY_MS);
        assert.equal(state.health, 100 - (hit + 1) * METEOR_HULL_DAMAGE);
    }
    assert.equal(state.health, 10);
    state = applyHullHit(state, METEOR_HULL_DAMAGE, 5 * HULL_HIT_RECOVERY_MS);
    assert.equal(state.health, 0);
    assert.equal(applyHullHit(state, METEOR_HULL_DAMAGE, 6 * HULL_HIT_RECOVERY_MS), state,
        'Defeated hull must stay frozen at zero');
});

test('overlapping collisions cannot stack damage during impact recovery', () => {
    const firstHit = applyHullHit(fullHull(), METEOR_HULL_DAMAGE, 1000);
    for (const now of [1000, 1016, 1300, 1899]) {
        assert.equal(applyHullHit(firstHit, DEATH_RAY_HULL_DAMAGE, now), firstHit);
    }
    const nextHit = applyHullHit(firstHit, DEATH_RAY_HULL_DAMAGE, 1900);
    assert.equal(nextHit.health, 52, 'Damage resumes when the original window ends, without extending it on rejected collisions');
});

test('death rays remain heavier than meteors but cannot destroy full hull with one hit', () => {
    let state = fullHull();
    for (let hit = 0; hit < 3; hit++) state = applyHullHit(state, DEATH_RAY_HULL_DAMAGE, hit * HULL_HIT_RECOVERY_MS);
    assert.equal(state.health, 10);
    assert.equal(applyHullHit(state, DEATH_RAY_HULL_DAMAGE, 3 * HULL_HIT_RECOVERY_MS).health, 0);
});

test('black-hole exposure drains eight hull per second independently of frame rate', () => {
    for (const fps of [30, 60, 120]) {
        let state = fullHull();
        for (let frame = 0; frame < fps * 2; frame++) {
            state = applyHullExposure(state, BLACK_HOLE_DAMAGE_PER_SECOND, 1000 / fps);
        }
        assert.ok(Math.abs(state.health - 84) < 1e-8, `Unexpected drain at ${fps} FPS`);
        assert.equal(state.protectedUntil, 0, 'Continuous exposure never continually renews impact recovery');
    }
});

test('continuous hazards still drain gently during recovery and stalled frames cannot burst damage', () => {
    const impact = applyHullHit(fullHull(), METEOR_HULL_DAMAGE, 1000);
    const exposed = applyHullExposure(impact, BLACK_HOLE_DAMAGE_PER_SECOND, 100);
    assert.equal(exposed.health, 81.2);
    assert.equal(exposed.protectedUntil, impact.protectedUntil);
    assert.equal(applyHullExposure(impact, BLACK_HOLE_DAMAGE_PER_SECOND, 10_000).health, 81.2);
    assert.equal(applyHullExposure(impact, BLACK_HOLE_DAMAGE_PER_SECOND, -1), impact);
    const defeated = applyHullExposure({ health: 0.1, protectedUntil: 0 }, BLACK_HOLE_DAMAGE_PER_SECOND, 100);
    assert.equal(defeated.health, 0);
    assert.equal(applyHullExposure(defeated, BLACK_HOLE_DAMAGE_PER_SECOND, 100), defeated);
});
