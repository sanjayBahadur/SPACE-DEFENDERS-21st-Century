import type Phaser from "phaser";

/** Native controls stay legible and focusable outside the fixed game canvas. */
export function mountScreen(
  scene: Phaser.Scene,
  markup: string,
  compact = false,
) {
  const screen = document.createElement("main");
  screen.className = `game-screen${compact ? " compact-screen" : ""}`;
  screen.innerHTML = markup;
  document.body.appendChild(screen);
  scene.input.keyboard?.disableGlobalCapture();
  const focusTimer = window.setTimeout(
    () => screen.querySelector<HTMLElement>("button:not(:disabled)")?.focus(),
    0,
  );
  scene.events.once("shutdown", () => {
    window.clearTimeout(focusTimer);
    screen.remove();
    scene.input.keyboard?.enableGlobalCapture();
  });
  return screen;
}

export function controlsMarkup() {
  return `<div class="controls-grid">
        <div><h3><span class="pilot-dot">01</span> Pilot · left view</h3><p><kbd>W A S D</kbd> / arrows to move</p><p class="gesture-hint">Left hand: fist to move, release to hold position.</p></div>
        <div><h3><span class="gunner-dot">02</span> Gunner · right view</h3><p>Mouse to aim · click to fire<br><kbd>Space</kbd> / right click: hold cannon</p><p class="gesture-hint">Right hand: point to aim, flick thumb to fire, fist for cannon.</p></div>
    </div>`;
}
