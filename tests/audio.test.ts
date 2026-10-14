import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAudio, readAudioSettings, EFFECTS, engineIntensity, musicForMode } from '../src/services/GameAudio.ts';

function rig() {
    const audio = new GameAudio();
    let starts = 0;
    let stops = 0;
    const context = {
        state: 'running', currentTime: 1,
        createBufferSource: () => ({
            buffer: null, loop: false, onended: undefined,
            connect: () => ({ connect() {} }), disconnect() {},
            start: () => { starts++; }, stop: () => { stops++; },
        }),
        createGain: () => ({ gain: { value: 0, setTargetAtTime() {} }, disconnect() {} }), destination: {},
    };
    const music = { volume: 0, paused: true, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } };
    const state = audio as unknown as { context: unknown; buffers: Map<string, unknown>; music: unknown; hidden: boolean };
    Object.assign(state, { context, music, buffers: new Map(EFFECTS.map(cue => [cue, {}])) });
    return { audio, context, music, state, starts: () => starts, stops: () => stops };
}

test('audio preferences tolerate blocked/corrupt storage and clamp valid volumes', () => {
    assert.deepEqual(readAudioSettings('bad JSON'), readAudioSettings(null));
    assert.deepEqual(readAudioSettings('{"muted":true,"music":9,"effects":-2}'), { muted: true, music: 1, effects: 0 });
    assert.deepEqual(readAudioSettings('null'), readAudioSettings(null));
    assert.equal(readAudioSettings('{"music":"loud"}').music, 0.22);
});

test('rapid explosions and warnings are bounded and a burst cannot allocate unlimited voices', () => {
    const r = rig();
    r.audio.play('explosion'); r.audio.play('explosion');
    assert.equal(r.starts(), 1);
    r.audio.play('warning'); r.context.currentTime += 0.5; r.audio.play('warning');
    assert.equal(r.starts(), 2);
    for (let i = 0; i < 30; i++) { r.context.currentTime += 0.1; r.audio.play('laser'); }
    assert.equal(r.starts(), 10);
});

test('one cannon loop survives repeated firing updates and stops on pause, mute and defeat', () => {
    const r = rig();
    r.audio.setMode('gameplay');
    for (let i = 0; i < 120; i++) r.audio.cannon(true);
    assert.equal(r.starts(), 1);
    r.audio.setMode('pause');
    assert.equal(r.stops(), 1);
    r.audio.cannon(true);
    assert.equal(r.starts(), 1, 'Pause must not restart combat loops');
    r.audio.setMode('gameplay'); r.audio.cannon(true);
    r.audio.configure({ muted: true });
    assert.equal(r.stops(), 2);
    r.audio.play('laser'); r.audio.cannon(true);
    assert.equal(r.starts(), 2);
    r.audio.configure({ muted: false }); r.audio.cannon(true);
    r.audio.setMode('defeat');
    assert.equal(r.stops(), 3);
    assert.equal(r.music.paused, true);
});

test('hidden or locked audio stays silent and pause music stays below gameplay music', () => {
    const r = rig();
    r.context.state = 'suspended'; r.audio.play('laser');
    assert.equal(r.starts(), 0);
    r.context.state = 'running'; r.state.hidden = true; r.audio.play('laser');
    assert.equal(r.starts(), 0);
    r.state.hidden = false; r.audio.setMode('gameplay'); const gameplayVolume = r.music.volume;
    r.audio.setMode('pause');
    assert.ok(r.music.volume < gameplayVolume);
    r.audio.configure({ muted: true });
    assert.equal(r.music.paused, true);
});


test('engine intensity follows actual movement consistently across frame rates and viewport sizes', () => {
    assert.equal(engineIntensity(0, 16, 640), 0);
    assert.equal(engineIntensity(0.01, 16, 640), 0, 'Subpixel settling should stay quiet');
    assert.equal(engineIntensity(10, 1000 / 60, 640), engineIntensity(20, 1000 / 30, 640));
    assert.equal(engineIntensity(10, 1000 / 60, 640), engineIntensity(20, 1000 / 60, 1280));
    assert.equal(engineIntensity(1000, 16, 640), 1);
    for (const value of [NaN, Infinity, -1]) assert.equal(engineIntensity(value, 16, 640), 0);
});

test('engine and siphon have independent loop ownership and stop outside gameplay', () => {
    const r = rig(); r.audio.setMode('gameplay');
    for (let i = 0; i < 100; i++) { r.audio.engine(0.5); r.audio.siphon(true); }
    assert.equal(r.starts(), 2);
    r.audio.siphon(false);
    assert.equal(r.stops(), 1, 'Leaving a damaging core must stop only siphoning');
    r.audio.engine(0);
    assert.equal(r.stops(), 2, 'An idle ship must not hum');
    r.audio.engine(0.8); r.audio.siphon(true); r.audio.setMode('pause');
    assert.equal(r.stops(), 4);
    r.audio.engine(1); r.audio.siphon(true);
    assert.equal(r.starts(), 4);
    r.audio.setMode('gameplay'); r.audio.engine(0.8); r.audio.siphon(true);
    r.audio.setMode('defeat');
    assert.equal(r.stops(), 6);
});

test('opening and credits use the heroic theme while the cockpit retains quiet ambience', () => {
    assert.equal(musicForMode('intro'), 'heroic-theme.mp3');
    assert.equal(musicForMode('credits'), 'heroic-theme.mp3');
    for (const mode of ['menu', 'briefing', 'gameplay', 'pause'] as const) assert.equal(musicForMode(mode), 'out-there.mp3');
});
