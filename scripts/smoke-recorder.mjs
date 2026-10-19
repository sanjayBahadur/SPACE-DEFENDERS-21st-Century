import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'output/recorder-smoke';
const url = 'http://127.0.0.1:4191';
await mkdir(new URL(`../${output}/`, import.meta.url), { recursive: true });
const before = new Set(await readdir(new URL(`../${output}/`, import.meta.url)));
const server = spawn(process.execPath, ['scripts/record-game.mjs', '--skip-build', '--no-open', '--port', '4191', '--output-dir', output], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', data => { logs += data; }); server.stderr.on('data', data => { logs += data; });
let browser;
try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null) throw new Error(logs);
        ready = await fetch(`${url}/recorder/`).then(r => r.ok).catch(() => false);
        if (ready) break;
        await delay(100);
    }
    assert.ok(ready, logs);
    const blocked = await fetch(`${url}/capture-api/start`, { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{"mimeType":"video/webm"}' });
    assert.equal(blocked.status, 403);
    assert.equal((await fetch(`${url}/SPACE-DEFENDERS-21st-Century/`)).status, 200);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(); const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.addInitScript(() => {
        window.captureTest = { mode: 'denied', calls: 0 };
        navigator.mediaDevices.getDisplayMedia = async () => {
            window.captureTest.calls++;
            if (window.captureTest.mode === 'denied') throw new DOMException('Test permission denial', 'NotAllowedError');
            const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
            const ctx = canvas.getContext('2d');
            const paint = () => { ctx.fillStyle = `hsl(${Date.now() % 360},70%,40%)`; ctx.fillRect(0, 0, 640, 360); };
            paint(); const timer = setInterval(paint, 33);
            const stream = canvas.captureStream(30);
            window.captureTest.stream = stream;
            if (window.captureTest.mode === 'audio') {
                const audio = new AudioContext(); const tone = audio.createOscillator(); const destination = audio.createMediaStreamDestination();
                tone.connect(destination); tone.start(); await audio.resume(); stream.addTrack(destination.stream.getAudioTracks()[0]);
                stream.getVideoTracks()[0].addEventListener('ended', () => { clearInterval(timer); tone.stop(); void audio.close(); });
            }
            return stream;
        };
    });
    await page.goto(`${url}/recorder/`);
    await page.locator('#start').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('cancelled'));
    assert.equal(await page.locator('#start').isDisabled(), false);
    await page.evaluate(() => { window.captureTest.mode = 'silent'; });
    await page.locator('#start').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('No game audio'));
    assert.equal(await page.evaluate(() => window.captureTest.stream.getVideoTracks()[0].readyState), 'ended');
    await page.evaluate(() => { window.captureTest.mode = 'audio'; });
    for (let take = 0; take < 3; take++) {
        if (take === 2) await page.evaluate(() => {
            const duration = document.querySelector('#duration');
            duration.add(new Option('Test auto-stop', '2')); duration.value = '2';
        });
        await page.locator('#start').click();
        await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('RECORDING'));
        await page.waitForTimeout(1600);
        if (take === 0) await page.locator('#stop').click();
        else if (take === 1) await page.evaluate(() => {
            const track = window.captureTest.stream.getVideoTracks()[0]; track.stop(); track.dispatchEvent(new Event('ended'));
        });
        await page.waitForFunction(count => document.querySelectorAll('#saved a').length === count, take + 1);
        assert.match(await page.locator('#status').textContent(), /Game audio included/);
        assert.equal(await page.locator('#start').isDisabled(), false);
    }
    assert.deepEqual(errors, []);
    const files = (await readdir(new URL(`../${output}/`, import.meta.url))).filter(name => !before.has(name) && name.endsWith('.webm'));
    assert.equal(files.length, 3);
    for (const file of files) {
        const path = new URL(`../${output}/${file}`, import.meta.url);
        assert.ok((await stat(path)).size > 1000);
        const info = JSON.parse(await readFile(new URL(`${path.href}.json`), 'utf8'));
        assert.equal(info.hasAudio, true); assert.equal(info.partial, false); assert.ok(info.durationSeconds >= 1);
    }
    console.log(JSON.stringify({ status: 'passed', checks: ['sharing cancellation', 'missing audio', 'real VP9/Opus recording', 'manual stop', 'sharing-ended save', 'automatic stop', 'repeated takes', 'local upload origin'], files }, null, 2));
} finally { await browser?.close(); server.kill('SIGTERM'); }
