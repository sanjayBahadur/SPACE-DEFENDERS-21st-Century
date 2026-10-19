import { createServer } from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : 4187);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port between 1024 and 65535.');
if (!args.includes('--skip-build')) {
  const result = await new Promise(resolveResult => {
    const child = spawn('npm', ['run', 'build', '--', '--base=/SPACE-DEFENDERS-21st-Century/'], { cwd: root, stdio: 'inherit' });
    child.once('error', () => resolveResult(1)); child.once('exit', resolveResult);
  });
  if (result !== 0) process.exit(1);
}
await stat(resolve(root, 'dist/index.html'));
const outputIndex = args.indexOf('--output-dir');
if (outputIndex >= 0 && !args[outputIndex + 1]) throw new Error('--output-dir needs a path.');
const recordings = resolve(root, outputIndex >= 0 ? args[outputIndex + 1] : 'output/recordings');
await mkdir(recordings, { recursive: true });
const sessions = new Map();
const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webm': 'video/webm', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) {
  let result = '';
  for await (const chunk of req) { result += chunk; if (result.length > 8192) throw new Error('Request too large'); }
  return JSON.parse(result || '{}');
}
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.startsWith('/capture-api/')) {
      if (req.method !== 'POST' || !allowedOrigins.has(req.headers.origin)) return json(res, 403, { error: 'Use the local recorder page.' });
      if (path === '/capture-api/start') {
        const input = await body(req);
        if (!['video/webm', 'video/mp4'].some(type => String(input.mimeType).startsWith(type))) return json(res, 400, { error: 'Unsupported recording type' });
        const id = randomUUID();
        const extension = input.mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
        const filename = `space-defenders-${new Date().toISOString().replace(/[:.]/g, '-')}-${id.slice(0, 8)}.${extension}`;
        const file = resolve(recordings, filename);
        await writeFile(file, '');
        sessions.set(id, { file, filename, uploading: false, finished: false });
        return json(res, 201, { id, filename });
      }
      const match = path.match(/^\/capture-api\/([a-f0-9-]+)\/(chunk|finish)$/);
      const session = match && sessions.get(match[1]);
      if (!session) return json(res, 404, { error: 'Recording not found' });
      if (session.finished || session.uploading) return json(res, 409, { error: 'Recording is busy or finished' });
      if (match[2] === 'chunk') {
        session.uploading = true;
        try { await pipeline(req, createWriteStream(session.file, { flags: 'a' })); }
        finally { session.uploading = false; }
        return json(res, 200, { saved: true });
      }
      const info = await body(req);
      const size = (await stat(session.file)).size;
      session.finished = true;
      if (!size) { await unlink(session.file); return json(res, 200, { discarded: true }); }
      await writeFile(`${session.file}.json`, JSON.stringify({ filename: session.filename, bytes: size, durationSeconds: Number(info.durationSeconds) || 0, hasAudio: info.hasAudio === true, mimeType: String(info.mimeType ?? ''), width: Number(info.width) || 0, height: Number(info.height) || 0, frameRate: Number(info.frameRate) || 0, partial: info.partial === true }, null, 2) + '\n');
      console.log(`Saved: ${session.file}${info.partial ? ' (partial)' : ''}`);
      return json(res, 200, { filename: session.filename, path: session.file, url: `/recordings/${encodeURIComponent(session.filename)}`, bytes: size });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    if (path === '/') { res.writeHead(302, { Location: '/recorder/' }); return res.end(); }
    let base, relative;
    if (path.startsWith('/recorder/')) { base = resolve(root, 'tools/recorder'); relative = path.slice('/recorder/'.length) || 'index.html'; }
    else if (path.startsWith('/SPACE-DEFENDERS-21st-Century/')) { base = resolve(root, 'dist'); relative = path.slice('/SPACE-DEFENDERS-21st-Century/'.length) || 'index.html'; }
    else if (path.startsWith('/recordings/')) { base = recordings; relative = path.slice('/recordings/'.length); }
    else { res.writeHead(404); return res.end(); }
    const file = resolve(base, relative);
    if (!file.startsWith(base + sep)) { res.writeHead(403); return res.end(); }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    await pipeline(createReadStream(file), res);
  } catch (error) {
    if (!res.headersSent) json(res, error.code === 'ENOENT' ? 404 : 400, { error: error.code === 'ENOENT' ? 'File not found' : 'Request failed' });
    else res.destroy();
  }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Try npm run record -- --port ${port + 1}` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/recorder/`;
  console.log(`\nRecorder: ${url}\nClips save to: ${recordings}\nKeep this terminal open while recording. Ctrl+C after saving to stop the server.\n`);
  if (!args.includes('--no-open')) {
    const browser = process.platform === 'linux' ? 'google-chrome' : process.platform === 'darwin' ? 'open' : 'cmd';
    const browserArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(browser, browserArgs, { stdio: 'ignore' });
    child.on('error', () => {
      if (process.platform === 'linux') spawn('xdg-open', [url], { stdio: 'ignore' }).on('error', () => {});
    });
    child.unref();
  }
});
