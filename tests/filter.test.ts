import test from 'node:test';
import assert from 'node:assert/strict';
import { OneEuroFilter } from '../src/utils/OneEuroFilter.ts';

test('the first tracking sample has no artificial jump from zero', () => {
    assert.equal(new OneEuroFilter().filter(0.8, 100), 0.8);
});

test('reading the same camera timestamp preserves the filtered position', () => {
    const filter = new OneEuroFilter();
    filter.filter(0.3, 100);
    const filtered = filter.filter(0.8, 130);
    assert.equal(filter.filter(0.8, 130), filtered);
});

test('irregular camera intervals smooth a step without overshooting', () => {
    const filter = new OneEuroFilter();
    filter.filter(0.2, 100);
    let previous = 0.2;
    for (const timestamp of [117, 153, 219, 251, 301]) {
        const position = filter.filter(0.8, timestamp);
        assert.ok(Number.isFinite(position) && position >= previous && position < 0.8);
        previous = position;
    }
});
