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
