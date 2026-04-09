import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandMotionFilter, AIM_FOLLOW_AT_60_HZ, PILOT_FOLLOW_AT_60_HZ } from '../src/utils/input.ts';
import { frameLerp } from '../src/utils/combat.ts';
import { OneEuroFilter } from '../src/utils/OneEuroFilter.ts';

/** A 30 FPS hand stream driving a display with an independent refresh rate. */
function stepResponse(fps: number, follow: number, filter = createHandMotionFilter()): number {
    let nextCapture = 1000 / 30;
    let hand = filter.filter(0.2, 0);
    let displayed = hand;
    const delta = 1000 / fps;
    for (let frame = 1; frame <= fps; frame++) {
        const now = frame * delta;
        if (now + 1e-8 >= nextCapture) {
            hand = filter.filter(0.8, now);
            nextCapture += 1000 / 30;
        }
        displayed += (hand - displayed) * frameLerp(follow, delta);
        assert.ok(displayed >= 0.2 && displayed <= 0.8, 'Motion must not overshoot');
        if ((displayed - 0.2) / 0.6 >= 0.9) return now;
    }
    return Infinity;
}

test('hand aim and active pilot motion reach 90% within 250 ms across display refresh rates', () => {
    for (const fps of [30, 60, 120, 144]) {
        for (const follow of [AIM_FOLLOW_AT_60_HZ, PILOT_FOLLOW_AT_60_HZ]) {
            assert.ok(stepResponse(fps, follow) <= 250, `Input trails too long at ${fps} Hz`);
        }
    }
    const previous = stepResponse(60, 0.2, new OneEuroFilter(1, 0.007, 1));
    assert.ok(stepResponse(60, AIM_FOLLOW_AT_60_HZ) <= previous * 0.55,
        'The new complete aim path must materially improve on the old filter plus interpolation');
});

test('responsive hand filtering still attenuates stationary jitter by more than half', () => {
    for (const fps of [30, 60]) {
        const filter = createHandMotionFilter();
        filter.filter(0.5, 0);
        let rawEnergy = 0;
        let filteredEnergy = 0;
        for (let frame = 1; frame <= fps * 2; frame++) {
            const raw = 0.5 + (frame % 2 ? 0.005 : -0.005);
            const filtered = filter.filter(raw, frame * 1000 / fps);
            if (frame > fps) {
                rawEnergy += (raw - 0.5) ** 2;
                filteredEnergy += (filtered - 0.5) ** 2;
            }
        }
        assert.ok(Math.sqrt(filteredEnergy / rawEnergy) < 0.5, `Visible jitter at ${fps} FPS`);
    }
});
