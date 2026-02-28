import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
test("mission textures have unique keys and nonempty case-correct files", async () => {
  const source = await readFile(
    new URL("src/scenes/MissionLoad.ts", root),
    "utf8",
  );
  const entries = [
    ...source.matchAll(
      /this\.load\.image\(\s*["']([^"']+)["'],\s*`\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/g,
    ),
  ];
  assert.ok(
    entries.length > 30,
    "expected the complete mission asset manifest",
  );
  assert.equal(
    new Set(entries.map((entry) => entry[1])).size,
    entries.length,
    "duplicate texture keys",
  );
  for (const [, key, path] of entries) {
    const file = await stat(new URL(`public/${path}`, root));
    assert.ok(file.size > 0, `${key} is empty`);
  }
});

test("required local camera model and WASM files are nonempty", async () => {
  for (const name of [
    "hand_landmarker.task",
    "vision_wasm_internal.wasm",
    "vision_wasm_internal.js",
    "vision_wasm_nosimd_internal.wasm",
    "vision_wasm_nosimd_internal.js",
  ]) {
    assert.ok(
      (await stat(new URL(`public/models/${name}`, root))).size > 0,
      `${name} is empty`,
    );
  }
});
