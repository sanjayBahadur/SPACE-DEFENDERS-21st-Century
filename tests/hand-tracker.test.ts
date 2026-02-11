import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { HandTracker, type HandsResult, type HandTrackerStatus } from '../src/services/HandTracker.ts';

function replaceGlobal(t: TestContext, name: string, value: unknown): void {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (original) Object.defineProperty(globalThis, name, original);
        else Reflect.deleteProperty(globalThis, name);
    });
}

function mockCamera(t: TestContext, getUserMedia: () => Promise<MediaStream>, secure = true): void {
    replaceGlobal(t, 'window', { isSecureContext: secure });
    replaceGlobal(t, 'navigator', { mediaDevices: { getUserMedia } });
    // Startup must not create video elements or reach the ML import without permission.
    replaceGlobal(t, 'document', {
        createElement: () => assert.fail('Video/ML setup ran before camera permission'),
    });
}

interface TrackerState {
    status: HandTrackerStatus;
    lastDetectionTime: number;
    hands: HandsResult;
    stream?: MediaStream;
    video?: HTMLVideoElement;
    handLandmarker?: { close(): void };
    canvas?: HTMLCanvasElement;
    frameId?: number;
}

function state(tracker: HandTracker): TrackerState {
    return tracker as unknown as TrackerState;
}

test('constructing a tracker never requests the camera or starts browser work', t => {
    mockCamera(t, () => assert.fail('Construction requested camera permission'));
    const tracker = new HandTracker();
    assert.equal(tracker.getStatus(), 'idle');
    assert.equal(tracker.getError(), null);
    assert.deepEqual(tracker.getHands(), { pilot: null, gunner: null });
    tracker.stop();
    assert.equal(tracker.getStatus(), 'idle');
});

test('declined permission skips video/ML startup and provides an actionable error', async t => {
    let requests = 0;
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    mockCamera(t, async () => { requests++; throw denied; });
    const tracker = new HandTracker();
    await assert.rejects(tracker.init(), error => error === denied);
    assert.equal(requests, 1);
    assert.equal(tracker.getStatus(), 'error');
    assert.match(tracker.getError()!, /permission was declined.*keyboard controls/i);
    assert.deepEqual(tracker.getHands(true), { pilot: null, gunner: null });
    tracker.stop();
    assert.equal(tracker.getError(), null);
});

test('an insecure origin rejects before requesting camera permission', async t => {
    mockCamera(t, () => assert.fail('Insecure context requested camera permission'), false);
    const tracker = new HandTracker();
    await assert.rejects(tracker.init(), /require HTTPS/);
    assert.equal(tracker.getStatus(), 'error');
    assert.match(tracker.getError()!, /keyboard controls/i);
});

test('duplicate initialization shares one request; cancelling releases a late stream', async t => {
    let requests = 0;
    let resolvePermission!: (stream: MediaStream) => void;
    const permission = new Promise<MediaStream>(resolve => { resolvePermission = resolve; });
    mockCamera(t, () => { requests++; return permission; });
    const tracker = new HandTracker();
    const first = tracker.init();
    const duplicate = tracker.init();
    assert.equal(first, duplicate);
    assert.equal(requests, 1);
    assert.equal(tracker.getStatus(), 'loading');
    const cancelled = assert.rejects(first, { name: 'AbortError' });
    tracker.stop();
    await cancelled;
    assert.equal(tracker.getStatus(), 'idle');
    assert.equal(tracker.getError(), null);

    let stopped = 0;
    resolvePermission({ getTracks: () => [{ stop: () => { stopped++; } }] } as unknown as MediaStream);
    await permission;
    await Promise.resolve();
    assert.equal(stopped, 1, 'A camera granted after cancellation must immediately close');
    assert.equal(tracker.getStatus(), 'idle');
});

test('a cancelled startup cannot overwrite a subsequent camera attempt', async t => {
    let requests = 0;
    let resolveOldPermission!: (stream: MediaStream) => void;
    const oldPermission = new Promise<MediaStream>(resolve => { resolveOldPermission = resolve; });
    const missing = new DOMException('No camera', 'NotFoundError');
    mockCamera(t, () => ++requests === 1 ? oldPermission : Promise.reject(missing));
    const tracker = new HandTracker();
    const cancelled = assert.rejects(tracker.init(), { name: 'AbortError' });
    tracker.stop();
    // Restart before the cancelled promise settles, as a quick menu switch can do.
    const next = tracker.init();
    await cancelled;
    await assert.rejects(next, error => error === missing);
    let stopped = 0;
    resolveOldPermission({ getTracks: () => [{ stop: () => { stopped++; } }] } as unknown as MediaStream);
    await oldPermission;
    await Promise.resolve();
    assert.equal(requests, 2);
    assert.equal(stopped, 1);
    assert.equal(tracker.getStatus(), 'error');
    assert.match(tracker.getError()!, /No camera was found/);
});

test('stop cancels inference and releases every camera, model and debug resource', t => {
    const calls: string[] = [];
    replaceGlobal(t, 'cancelAnimationFrame', (id: number) => calls.push(`frame:${id}`));
    const tracker = new HandTracker();
    const video = {
        srcObject: {},
        pause: () => calls.push('pause'),
        remove: () => calls.push('video'),
    };
    Object.assign(state(tracker), {
        status: 'ready', frameId: 12,
        stream: { getTracks: () => [
            { stop: () => calls.push('track1') }, { stop: () => calls.push('track2') },
        ] },
        video,
        handLandmarker: { close: () => calls.push('model') },
        canvas: { remove: () => calls.push('canvas') },
        hands: { pilot: { x: 0.5, y: 0.5, gesture: 'PALM', isLeft: true }, gunner: null },
    });
    tracker.stop();
    assert.deepEqual(calls, ['frame:12', 'track1', 'track2', 'pause', 'video', 'model', 'canvas']);
    assert.equal(video.srcObject, null);
    assert.equal(state(tracker).stream, undefined);
    assert.equal(state(tracker).video, undefined);
    assert.equal(state(tracker).handLandmarker, undefined);
    assert.equal(tracker.getStatus(), 'idle');
    assert.deepEqual(tracker.getHands(), { pilot: null, gunner: null });
    tracker.stop();
    assert.equal(calls.length, 7, 'Stopping twice must not close resources twice');
});

test('strategic reads preserve thumb flicks; tactical reads consume each event once', () => {
    const tracker = new HandTracker();
    Object.assign(state(tracker), {
        status: 'ready', lastDetectionTime: performance.now(),
        hands: {
            pilot: { x: 0.5, y: 0.5, gesture: 'PALM', isLeft: true },
            gunner: { x: 0.5, y: 0.5, gesture: 'GUN', isLeft: false, flickDetected: true },
        },
    });
    assert.equal(tracker.getHands().gunner?.flickDetected, true);
    assert.equal(tracker.getHands(false).gunner?.flickDetected, true);
    const fired = tracker.getHands(true);
    assert.equal(fired.gunner?.flickDetected, true);
    assert.equal(tracker.getHands(true).gunner?.flickDetected, false);
    assert.equal(fired.gunner?.flickDetected, true, 'Consuming does not mutate an earlier frame snapshot');
});

test('stale tracking does not return movement or consume a flick', () => {
    const tracker = new HandTracker();
    Object.assign(state(tracker), {
        status: 'ready', lastDetectionTime: performance.now() - 251,
        hands: { pilot: null, gunner: { x: 0.5, y: 0.5, gesture: 'GUN', isLeft: false, flickDetected: true } },
    });
    assert.deepEqual(tracker.getHands(true), { pilot: null, gunner: null });
    assert.equal(state(tracker).hands.gunner?.flickDetected, true);
});
