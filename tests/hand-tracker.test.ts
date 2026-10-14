import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { HandTracker, type HandsResult, type HandTrackerStatus } from '../src/services/HandTracker.ts';
import { GestureMenuController } from '../src/ui/GestureMenu.ts';

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
    debugVisible: boolean;
    lastDetectionTime: number;
    hands: HandsResult;
    stream?: MediaStream;
    video?: HTMLVideoElement;
    handLandmarker?: { close(): void };
    canvas?: HTMLCanvasElement;
    frameId?: number;
    results?: { landmarks: NormalizedLandmark[][]; handedness: { categoryName: string }[][] };
    updateHands(now: number): HandsResult;
    detectLoop(): void;
}

function state(tracker: HandTracker): TrackerState {
    return tracker as unknown as TrackerState;
}

function pointingHand(): NormalizedLandmark[] {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0.3, y: 0.6, z: 0 }));
    landmarks[0] = { x: 0.3, y: 0.7, z: 0 };
    landmarks[9] = { x: 0.3, y: 0.5, z: 0 };
    landmarks[4] = { x: 0.15, y: 0.45, z: 0 };
    landmarks[5] = { x: 0.35, y: 0.5, z: 0 };
    landmarks[6] = { x: 0.35, y: 0.4, z: 0 };
    landmarks[8] = { x: 0.35, y: 0.25, z: 0 };
    return landmarks;
}

function detect(tracker: HandTracker, now: number, hands: { side: string; landmarks: NormalizedLandmark[] }[]): HandsResult {
    state(tracker).results = {
        landmarks: hands.map(hand => hand.landmarks),
        handedness: hands.map(hand => [{ categoryName: hand.side }]),
    };
    return state(tracker).updateHands(now);
}

test('menu cursor follows the mirrored index tip without gameplay zone expansion or clipping', () => {
    for (const [cameraX, gameplayX] of [[0.35, 2 / 7], [0.5, 0], [0.05, 1]]) {
        const tracker = new HandTracker();
        const hand = pointingHand();
        hand[8].x = cameraX;
        const gunner = detect(tracker, 1000, [{ side: 'Right', landmarks: hand }]).gunner!;
        assert.ok(Math.abs(gunner.x - gameplayX) < 1e-10, 'Gunner aiming must retain its existing mapping');
        const target = { id: 'tip', bounds: { x: (1 - cameraX) * 1000 - 10, y: 140, width: 20, height: 20 }, activate() {} };
        const selection = new GestureMenuController().update(gunner, [target], { width: 1000, height: 600 }, 0);
        assert.deepEqual(selection.pointer, { x: (1 - cameraX) * 1000, y: 150 });
        assert.equal(selection.target, target);
    }
});

test('stopping tracking resets menu smoothing before a new camera session', () => {
    const tracker = new HandTracker();
    detect(tracker, 1000, [{ side: 'Right', landmarks: pointingHand() }]);
    tracker.stop();
    const hand = pointingHand().map(point => ({ ...point, x: point.x - 0.25 }));
    const gunner = detect(tracker, 1034, [{ side: 'Right', landmarks: hand }]).gunner!;
    assert.deepEqual(gunner.menuPointer, { x: 0.9, y: 0.25 });
});

test('constructing a tracker never requests the camera or starts browser work', t => {
    mockCamera(t, () => assert.fail('Construction requested camera permission'));
    const tracker = new HandTracker();
    assert.equal(tracker.getStatus(), 'idle');
    assert.equal(state(tracker).debugVisible, true, 'Gesture skeleton feedback is enabled by default');
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

test('thumb flick detection ignores a change in camera distance but preserves a real flick', () => {
    const tracker = new HandTracker();
    const hand = pointingHand();
    assert.equal(detect(tracker, 1000, [{ side: 'Right', landmarks: hand }]).gunner?.flickDetected, false);

    const closerHand = hand.map(point => ({
        ...point, x: 0.3 + (point.x - 0.3) * 1.25, y: 0.7 + (point.y - 0.7) * 1.25,
    }));
    assert.equal(detect(tracker, 1034, [{ side: 'Right', landmarks: closerHand }]).gunner?.flickDetected, false,
        'An unchanged pose moving toward the camera must not fire or select a menu');

    const flickHand = closerHand.map(point => ({ ...point }));
    flickHand[4].x -= 0.125;
    assert.equal(detect(tracker, 1068, [{ side: 'Right', landmarks: flickHand }]).gunner?.flickDetected, true);
});

test('a missing gunner returns at its current position without a ghost thumb flick', () => {
    const tracker = new HandTracker();
    const hand = pointingHand();
    detect(tracker, 1000, [{ side: 'Right', landmarks: hand }]);
    assert.equal(detect(tracker, 1034, []).gunner, null);

    const returningHand = hand.map(point => ({ ...point, x: point.x - 0.25 }));
    returningHand[4].x -= 0.1;
    const returned = detect(tracker, 1068, [{ side: 'Right', landmarks: returningHand }]).gunner!;
    assert.equal(returned.x, 1, 'Reacquisition must not use the lost hand\'s cursor smoothing state');
    assert.equal(returned.flickDetected, false);
    assert.deepEqual(returned.menuPointer, { x: 0.9, y: 0.25 });
});

test('a stalled inference stream resets motion even without an explicit missing-hand frame', () => {
    const tracker = new HandTracker();
    const hand = pointingHand();
    detect(tracker, 1000, [{ side: 'Right', landmarks: hand }]);
    const returningHand = hand.map(point => ({ ...point, x: point.x - 0.25 }));
    returningHand[4].x -= 0.1;
    const returned = detect(tracker, 1251, [{ side: 'Right', landmarks: returningHand }]).gunner!;
    assert.equal(returned.x, 1);
    assert.equal(returned.flickDetected, false, 'A thumb pose changed while tracking was stale is not a fresh flick');
    assert.deepEqual(returned.menuPointer, { x: 0.9, y: 0.25 });
});

test('pilot smoothing resets independently while the gunner remains tracked', () => {
    const tracker = new HandTracker();
    const gunner = pointingHand();
    const pilot = pointingHand();
    detect(tracker, 1000, [{ side: 'Left', landmarks: pilot }, { side: 'Right', landmarks: gunner }]);
    detect(tracker, 1034, [{ side: 'Right', landmarks: gunner }]);
    const returningPilot = pilot.map(point => ({ ...point, x: point.x + 0.55 }));
    const returned = detect(tracker, 1068, [
        { side: 'Left', landmarks: returningPilot }, { side: 'Right', landmarks: gunner },
    ]);
    assert.ok(Math.abs(returned.pilot!.x - 1 / 7) < 1e-10);
    assert.equal(returned.gunner?.flickDetected, false);
});

test('default skeleton overlay mounts after video setup and never intercepts game input', t => {
    const tracker = new HandTracker();
    const canvas = {
        id: '', style: {},
        setAttribute: (name: string, value: string) => assert.deepEqual([name, value], ['aria-hidden', 'true']),
        getContext: () => ({}),
        remove: () => { removed++; },
    };
    let mounted = 0;
    let removed = 0;
    replaceGlobal(t, 'document', {
        createElement: (tag: string) => { assert.equal(tag, 'canvas'); return canvas; },
        getElementById: (id: string) => {
            assert.equal(id, 'app');
            return { appendChild: (element: unknown) => { assert.equal(element, canvas); mounted++; } };
        },
    });
    Object.assign(state(tracker), { status: 'ready', video: {} });
    tracker.setDebugVisible(state(tracker).debugVisible);
    assert.equal(mounted, 1);
    assert.equal(canvas.id, 'hand-debug-canvas');
    assert.equal((canvas.style as { pointerEvents: string }).pointerEvents, 'none');
    tracker.setDebugVisible(true);
    assert.equal(mounted, 1, 'Repeated enable must reuse the existing overlay');
    tracker.setDebugVisible(false);
    assert.equal(removed, 1);
    assert.equal(state(tracker).canvas, undefined);
    tracker.setDebugVisible(true);
    assert.equal(mounted, 2, 'Players can restore skeleton feedback');
});


test('each new 30 FPS camera frame is processed without display-clock sampling drift', t => {
    let now = 0;
    replaceGlobal(t, 'performance', { now: () => now });
    replaceGlobal(t, 'document', { hidden: false });
    replaceGlobal(t, 'HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
    replaceGlobal(t, 'requestAnimationFrame', () => 1);
    for (const displayHz of [59.94, 60, 60.1, 120, 144]) {
        const tracker = new HandTracker();
        const video = { currentTime: 0, readyState: 2 };
        let detections = 0;
        Object.assign(state(tracker), {
            status: 'ready', video,
            handLandmarker: { detectForVideo() { detections++; return { landmarks: [], handedness: [] }; } },
        });
        for (let frame = 0; frame < displayHz * 2; frame++) {
            now = 1000 + frame * 1000 / displayHz;
            video.currentTime = Math.floor((now - 1000 + 1e-8) * 30 / 1000) / 30;
            state(tracker).detectLoop();
        }
        assert.ok(detections >= 59 && detections <= 61, `Lost camera frames at ${displayHz} Hz: ${detections}`);
        state(tracker).detectLoop();
        assert.ok(detections <= 61, 'Reading a duplicate frame must not run inference');
    }
});

test('hidden tabs and unchanged camera frames do not run inference', t => {
    let now = 1000;
    const documentState = { hidden: false };
    replaceGlobal(t, 'performance', { now: () => now });
    replaceGlobal(t, 'document', documentState);
    replaceGlobal(t, 'HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
    replaceGlobal(t, 'requestAnimationFrame', () => 1);
    const tracker = new HandTracker();
    const video = { currentTime: 1, readyState: 2 };
    let detections = 0;
    Object.assign(state(tracker), {
        status: 'ready', video,
        handLandmarker: { detectForVideo() { detections++; return { landmarks: [], handedness: [] }; } },
    });
    state(tracker).detectLoop();
    now += 100;
    state(tracker).detectLoop();
    assert.equal(detections, 1);
    documentState.hidden = true;
    video.currentTime = 2;
    now += 100;
    state(tracker).detectLoop();
    assert.equal(detections, 1);
    documentState.hidden = false;
    state(tracker).detectLoop();
    assert.equal(detections, 2);
});
