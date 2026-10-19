import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = resolve('dist');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${path}`);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(root);
assert.ok(files.length <= 20000, 'Cloudflare Pages Free file limit exceeded');
for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  assert.ok(!/^(_worker\.js(?:\/|$)|functions\/)/.test(name), `Server code is outside this static-only deployment policy: ${name}`);
  assert.ok(!/(^|\/)\.env(?:\.|$)/.test(name), `Environment file in output: ${name}`);
  assert.ok((await stat(file)).size <= 25 * 1024 * 1024, `Pages 25 MiB asset limit exceeded: ${name}`);
}
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(html, /src="\/assets\//, 'Custom-domain build must use root asset URLs');
console.log(`Static hosting check passed: ${files.length} files, no Worker/Functions output, root asset URLs, each file within 25 MiB.`);
