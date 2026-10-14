import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const basePath = process.env.SMOKE_BASE_PATH || '/SPACE-DEFENDERS-21st-Century/';
const externalURL = process.env.SMOKE_BASE_URL;
const siteURL = externalURL || `http://127.0.0.1:4185${basePath}`;
const artifactDir = 'output/production-smoke';
let server;
let browser;
const results = [];

async function freshMenu(page) {
  await page.goto(siteURL, { waitUntil: 'domcontentloaded' });
  await page.locator('#skip-intro').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#skip-intro').click();
  await page.locator('#gesture-choice').waitFor({ state: 'visible' });
}

async function clickCanvas(page, x, y) {
  const bounds = await page.locator('#app > canvas').boundingBox();
  assert.ok(bounds, 'Game canvas is missing');
  await page.mouse.click(bounds.x + x / 1280 * bounds.width, bounds.y + y / 720 * bounds.height);
}

async function withPage(name, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['camera'] });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  const failed = [];
  const models = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (new URL(request.url()).pathname.includes('/models/')) models.push(request.url()); });
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    await run(page, models);
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    assert.deepEqual(failed, [], 'Failed production requests');
    await page.screenshot({ path: `${artifactDir}/${name}.png` });
    results.push({ check: name, status: 'passed', modelRequests: models.length });
  } catch (error) {
    await page.screenshot({ path: `${artifactDir}/${name}-failed.png` }).catch(() => {});
    throw error;
  } finally {
    await context.tracing.stop({ path: `${artifactDir}/${name}-trace.zip` });
    await context.close();
  }
}

try {
  await mkdir(artifactDir, { recursive: true });
  if (!externalURL) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1',
      '--port', '4185', '--strictPort', '--base', basePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    server.stdout.on('data', chunk => { logs += chunk; });
    server.stderr.on('data', chunk => { logs += chunk; });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error(`Preview stopped: ${logs}`);
      ready = await fetch(siteURL).then(response => response.ok).catch(() => false);
      if (ready) break;
      await delay(250);
    }
    assert.ok(ready, `Production preview did not start: ${logs}`);
  }
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

  await withPage('keyboard-and-menus', async (page, models) => {
    await freshMenu(page);
    await page.locator('#keyboard-choice').click();
    await page.locator('#start-mission').click();
    await page.locator('.mission-briefing').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.briefing-stations .hand-pose').count(), 4);
    await page.keyboard.press('Escape');
    await page.locator('#start-mission').waitFor({ state: 'visible' });
    await page.waitForTimeout(4300);
    assert.ok(await page.locator('#start-mission').isVisible(), 'Cancelled briefing launched gameplay');
    for (let mission = 0; mission < 2; mission++) {
      await page.locator('#start-mission').click();
      await page.locator('.mission-briefing').waitFor({ state: 'visible' });
      await page.locator('.mission-briefing').waitFor({ state: 'detached', timeout: 10000 });
      await page.waitForTimeout(150);
      await page.keyboard.press('Escape');
      await page.locator('.pause-gesture-guides').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.pause-gesture-guides .hand-pose').count(), 4);
      await page.keyboard.press('Escape');
      await page.locator('.pause-gesture-guides').waitFor({ state: 'detached' });
      await page.keyboard.press('Escape');
      await page.locator('.pause-gesture-guides').waitFor({ state: 'visible' });
      await clickCanvas(page, 640, 720 * 0.82);
      await page.locator('#start-mission').waitFor({ state: 'visible' });
    }
    await page.locator('#credits').click();
    await page.locator('.credits-crawl').waitFor({ state: 'visible' });
    await page.locator('.crawl-skip').click();
    await page.locator('#start-mission').waitFor({ state: 'visible' });
    assert.equal(models.length, 0, 'Keyboard play unexpectedly downloaded camera models');
    const notice = await page.request.get(new URL('legal/THIRD-PARTY-NOTICES.txt', siteURL).href);
    assert.equal(notice.status(), 200, 'Distributed notices are missing');
  });

  await withPage('camera-denial-fallback', async (page, models) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Smoke-test camera denial', 'NotAllowedError'); };
    });
    await freshMenu(page);
    await page.locator('#gesture-choice').click();
    await page.waitForFunction(() => document.querySelector('#camera-status')?.textContent.includes('Keyboard & mouse are ready.'));
    await page.locator('#keyboard-choice').click();
    await page.locator('#start-mission').waitFor({ state: 'visible' });
    assert.equal(models.length, 0, 'Denied permission downloaded camera models');
  });

  await withPage('real-model-startup', async (page, models) => {
    await freshMenu(page);
    await page.locator('#gesture-choice').click();
    await page.waitForFunction(() => document.querySelector('#camera-status')?.textContent.includes('Gesture control ready.'),
      undefined, { timeout: 60000 });
    // Let the menu's camera-health polling observe subsequent inference frames.
    await page.waitForTimeout(1000);
    assert.match(await page.locator('#camera-status').textContent(), /Gesture control ready\./,
      'Tracking failed after model startup');
    assert.ok(models.some(url => url.endsWith('/hand_landmarker.task')), 'Hand model was not loaded');
    assert.ok(models.some(url => url.endsWith('.wasm')), 'WASM runtime was not loaded');
    await page.locator('#controls').click();
    await page.locator('#keyboard-mode').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('video').count(), 0, 'Keyboard switch retained the camera video');
    assert.equal(await page.locator('#hand-debug-canvas').count(), 0, 'Keyboard switch retained the skeleton overlay');
    await page.locator('#controls-menu [data-back]').click();
  });

  await withPage('audio-controls-and-cannon', async (page) => {
    await page.addInitScript(() => {
      window.__audioSmoke = { decoded: 0, sources: [], music: null };
      const NativeContext = window.AudioContext;
      window.AudioContext = class extends NativeContext {
        async decodeAudioData(data) {
          const buffer = await super.decodeAudioData(data);
          if (buffer.length > 0) window.__audioSmoke.decoded++;
          return buffer;
        }
        createBufferSource() {
          const node = super.createBufferSource();
          const record = { loop: false, active: false };
          window.__audioSmoke.sources.push(record);
          const start = node.start.bind(node);
          const stop = node.stop.bind(node);
          node.start = (...args) => { record.loop = node.loop; record.active = true; start(...args); };
          node.stop = (...args) => { record.active = false; stop(...args); };
          node.addEventListener('ended', () => { record.active = false; });
          return node;
        }
      };
      const NativeAudio = window.Audio;
      window.Audio = function (...args) {
        const audio = new NativeAudio(...args);
        window.__audioSmoke.music = audio;
        return audio;
      };
    });
    await page.goto(siteURL, { waitUntil: 'domcontentloaded' });
    await page.locator('#audio-toggle').click();
    assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true', 'First sound click muted audio');
    await page.waitForFunction(() => window.__audioSmoke.decoded === 13, undefined, { timeout: 30000 });
    await page.waitForFunction(() => window.__audioSmoke.music && !window.__audioSmoke.music.paused);
    await page.locator('#skip-intro').click();
    await page.locator('#keyboard-choice').click();
    await page.locator('#settings').click();
    await page.locator('#audio-toggle').click();
    assert.match(await page.locator('#sound-toggle').textContent(), /OFF/, 'Settings mute label is stale');
    assert.equal(await page.evaluate(() => window.__audioSmoke.music.paused), true);
    await page.locator('#sound-toggle').click();
    await page.locator('#music-volume').click();
    assert.match(await page.locator('#music-volume').textContent(), /40%/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('space-defenders-audio')).music), 0.4);
    await page.locator('#settings-menu [data-back]').click();
    await page.locator('#start-mission').click();
    await page.locator('.mission-briefing').waitFor({ state: 'visible' });
    await page.locator('.mission-briefing').waitFor({ state: 'detached', timeout: 10000 });
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__audioSmoke.sources.some(source => source.loop && source.active));
    await page.keyboard.press('Escape');
    await page.locator('.pause-gesture-guides').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__audioSmoke.sources.some(source => source.loop && source.active)), false,
      'Paused mission retained the cannon loop');
    await page.keyboard.up('Space');
    await page.locator('#audio-toggle').click();
    assert.equal(await page.evaluate(() => window.__audioSmoke.sources.some(source => source.active)), false,
      'Mute retained active effects');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#audio-toggle').waitFor({ state: 'visible' });
    await page.locator('#audio-toggle').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('space-defenders-audio')).muted), false,
      'Enabling previously muted sound was not saved');
  });
  console.log(JSON.stringify({ siteURL, results }, null, 2));
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
