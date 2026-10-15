import { gameAudio } from '../services/GameAudio';
import Phaser from "phaser";
import type { HandTracker } from "../services/HandTracker";
import { mountScreen } from "../ui/screens";
import { GestureMenuNavigator } from "../ui/GestureMenu";
import { gestureTutorialMarkup } from "../ui/gestureTutorial";

export class MainMenu extends Phaser.Scene {
  private stars: { object: Phaser.GameObjects.Arc; speed: number }[] = [];
  private skipIntro = false;
  private gestureMenu?: GestureMenuNavigator;

  constructor() {
    super("MainMenu");
  }

  init(data?: { skipIntro?: boolean }) {
    this.skipIntro =
      !!data?.skipIntro || this.registry.get("introSeen") === true;
  }

  create() {
    gameAudio.setMode(this.skipIntro ? "menu" : "intro");
    this.cameras.main.setBackgroundColor("#000000");
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        object: this.add.circle(
          Phaser.Math.Between(0, this.scale.width),
          Phaser.Math.Between(0, this.scale.height),
          Phaser.Math.FloatBetween(0.5, 1.5),
          0xffffff,
          Phaser.Math.FloatBetween(0.1, 0.8),
        ),
        speed: Phaser.Math.FloatBetween(3, 12),
      });
    }
    const tracker = this.registry.get("handTracker") as HandTracker;
    // Camera sessions survive menu/mission transitions; only an explicit keyboard
    // choice or page exit releases the camera.
    const cameraReady = tracker.getStatus() === "ready";
    const keyboardChosen =
      this.registry.get("controlChoiceMade") === true &&
      this.registry.get("keyboardMode") === true;
    const needsChoice = !cameraReady && !keyboardChosen;
    this.registry.set("keyboardMode", !cameraReady);
    this.registry.set("manualKeyboardOverride", !cameraReady);
    const screen = mountScreen(
      this,
      `
            <section id="intro" aria-label="Opening crawl">
                <div class="intro-controls">
                    <p id="intro-audio-status" role="status">Your mission awaits.</p>
                    <button id="start-intro">PLAY INTRO WITH SOUND</button>
                    <button id="silent-intro">PLAY WITHOUT SOUND</button>
                </div>
                <div id="crawl-container"><div class="crawl-content intro-crawl">
                    <h1 class="crawl-title">SPACE DEFENDERS</h1>
                    <p class="crawl-subtitle">21st Century</p>
                    <div class="crawl-body">
                        <p>Fly with your left fist. Aim with your right index; flick your thumb to fire. Hold your right fist for the cannon. Release to cool.</p>
                        <p>Or use WASD, mouse, and Space.</p>
                        <p>Protect both stations. The galaxy is counting on you.</p>
                    </div>
                </div></div>
                <button id="skip-intro" class="crawl-skip">SKIP / MENU</button>
            </section>
            <div id="menu-content" hidden>
                <section id="main-menu" class="menu-page">
                    <img class="menu-logo" src="${import.meta.env.BASE_URL}assets/titlescreen/SpaceDefenders.webp" alt="Space Defenders">
                    <nav id="main-actions" class="menu-buttons" aria-label="Main menu">
                        <button id="start-mission">START MISSION</button>
                        <button id="controls">GAME CONTROLS</button>
                        <button id="settings">SETTINGS</button>
                        <button id="credits">CREDITS</button>
                    </nav>
                    <section id="startup-choice" aria-label="Choose controls for this play session" hidden>
                        <p class="choice-heading">PLAY WITH HAND GESTURES?</p>
                        <nav class="menu-buttons startup-buttons" aria-label="Startup controls">
                            <button id="gesture-choice">USE GESTURE CONTROLS</button>
                            <button id="keyboard-choice">PLAY WITH KEYBOARD & MOUSE</button>
                        </nav>
                    </section>
                    ${gestureTutorialMarkup()}
                </section>
                <section id="controls-menu" class="menu-page" hidden>
                    <h1 class="menu-heading">CONTROLS</h1>
                    <p class="control-guide">PILOT: Left fist / WASD / arrows to fly<br>GUNNER: Right index to aim, thumb flick / mouse click to fire<br>CANNON: Right fist / Space / right click — release to cool</p>
                    <nav class="menu-buttons submenu-buttons" aria-label="Control mode">
                        <button id="gesture-mode" aria-pressed="false">GESTURE CONTROL: [OFF]</button>
                        <button id="keyboard-mode" aria-pressed="true">KEYBOARD & MOUSE: [ON]</button>
                        <button data-back>BACK</button>
                    </nav>
                </section>
                <section id="settings-menu" class="menu-page" hidden>
                    <h1 class="menu-heading">SETTINGS</h1>
                    <nav class="menu-buttons submenu-buttons" aria-label="Settings">
                        <button id="camera-toggle" aria-pressed="false">CAMERA ACCESS: [OFF]</button>
                        <button id="sound-toggle">SOUND: ON</button>
                        <button id="music-volume">MUSIC VOLUME</button>
                        <button id="effects-volume">EFFECTS VOLUME</button>
                        <button id="skeleton-toggle" aria-pressed="true">HAND SKELETON: [ON]</button>
                        <button data-back>BACK</button>
                    </nav>
                </section>
                <p id="camera-status" class="menu-status" role="status">Choose gesture controls to enable your camera, or use keyboard & mouse.</p>
            </div>`,
    );
    screen.classList.add("classic-menu");
    const sound = screen.querySelector<HTMLButtonElement>('#sound-toggle')!;
    const musicVolume = screen.querySelector<HTMLButtonElement>('#music-volume')!;
    const effectsVolume = screen.querySelector<HTMLButtonElement>('#effects-volume')!;
    const audioLabels = () => {
      sound.textContent = `SOUND: [${gameAudio.settings.muted ? 'OFF' : 'ON'}]`;
      sound.setAttribute('aria-pressed', String(!gameAudio.settings.muted));
      musicVolume.textContent = `MUSIC: ${Math.round(gameAudio.settings.music * 100)}% · CHANGE`;
      effectsVolume.textContent = `EFFECTS: ${Math.round(gameAudio.settings.effects * 100)}% · CHANGE`;
    };
    sound.addEventListener('click', () => { gameAudio.configure({ muted: !gameAudio.settings.muted }); audioLabels(); });
    const nextVolume = (value: number) => value >= 0.99 ? 0 : Math.min(1, Math.round((value + 0.2) * 5) / 5);
    musicVolume.addEventListener('click', () => { gameAudio.configure({ music: nextVolume(gameAudio.settings.music) }); audioLabels(); });
    effectsVolume.addEventListener('click', () => { gameAudio.configure({ effects: nextVolume(gameAudio.settings.effects) }); audioLabels(); });
    audioLabels();
    document.addEventListener('game-audio-change', audioLabels);
    this.events.once('shutdown', () => document.removeEventListener('game-audio-change', audioLabels));
    const intro = screen.querySelector<HTMLElement>("#intro")!;
    const content = screen.querySelector<HTMLElement>("#menu-content")!;
    const crawl = intro.querySelector<HTMLElement>('.intro-crawl')!;
    const introControls = intro.querySelector<HTMLElement>('.intro-controls')!;
    const startIntro = intro.querySelector<HTMLButtonElement>('#start-intro')!;
    const introStatus = intro.querySelector<HTMLElement>('#intro-audio-status')!;
    crawl.style.animationPlayState = 'paused';
    let introStarted = false;
    let introTimer: number | undefined;
    const finishIntro = () => {
      if (intro.hidden) return;
      if (introTimer !== undefined) window.clearTimeout(introTimer);
      gameAudio.setMode("menu");
      intro.hidden = true;
      content.hidden = false;
      this.registry.set("introSeen", true);
      screen
        .querySelector<HTMLButtonElement>(
          needsChoice ? "#gesture-choice" : "#start-mission",
        )!
        .focus();
    };
    const beginIntro = () => {
      if (intro.hidden || introStarted) return;
      introStarted = true;
      introControls.hidden = true;
      crawl.style.animationPlayState = 'running';
      introTimer = window.setTimeout(finishIntro, 10000);
    };
    const musicError = () => {
      if (intro.hidden || introStarted) return;
      startIntro.disabled = false;
      introStatus.textContent = 'Music could not start. Try again, play without sound, or skip.';
    };
    document.addEventListener('intro-music-playing', beginIntro);
    document.addEventListener('intro-music-error', musicError);
    startIntro.addEventListener('click', () => {
      startIntro.disabled = true;
      introStatus.textContent = 'Preparing the opening theme…';
      gameAudio.startIntroMusic();
    });
    intro.querySelector('#silent-intro')!.addEventListener('click', () => {
      gameAudio.configure({ muted: true });
      beginIntro();
    });
    if (this.skipIntro) finishIntro();
    screen.querySelector("#skip-intro")!.addEventListener("click", finishIntro);
    const showPage = (name: string) => {
      if (name === 'controls') gameAudio.play('ready');
      for (const page of screen.querySelectorAll<HTMLElement>(".menu-page"))
        page.hidden = page.id !== `${name}-menu`;
      screen.querySelector<HTMLElement>(`#${name}-menu button`)?.focus();
    };
    screen
      .querySelector("#controls")!
      .addEventListener("click", () => showPage("controls"));
    screen
      .querySelector("#settings")!
      .addEventListener("click", () => showPage("settings"));
    screen
      .querySelectorAll("[data-back]")
      .forEach((button) =>
        button.addEventListener("click", () => showPage("main")),
      );
    const escape = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (!intro.hidden) finishIntro();
      else showPage("main");
    };
    this.input.keyboard?.on("keydown-ESC", escape);

    const keyboard = screen.querySelector<HTMLButtonElement>("#keyboard-mode")!;
    const gesture = screen.querySelector<HTMLButtonElement>("#gesture-mode")!;
    const camera = screen.querySelector<HTMLButtonElement>("#camera-toggle")!;
    const skeleton =
      screen.querySelector<HTMLButtonElement>("#skeleton-toggle")!;
    const start = screen.querySelector<HTMLButtonElement>("#start-mission")!;
    const status = screen.querySelector<HTMLElement>("#camera-status")!;
    const choice = screen.querySelector<HTMLElement>("#startup-choice")!;
    const actions = screen.querySelector<HTMLElement>("#main-actions")!;
    const gestureChoice =
      screen.querySelector<HTMLButtonElement>("#gesture-choice")!;
    const keyboardChoice =
      screen.querySelector<HTMLButtonElement>("#keyboard-choice")!;
    const showChoice = (show: boolean) => {
      choice.hidden = !show;
      actions.hidden = show;
    };
    showChoice(needsChoice);
    let request = 0;
    let loading = false;
    let showSkeleton = this.registry.get("showSkeleton") !== false;
    tracker.setDebugVisible(showSkeleton);
    const updateSkeleton = () => {
      skeleton.textContent = `HAND SKELETON: [${showSkeleton ? "ON" : "OFF"}]`;
      skeleton.setAttribute("aria-pressed", String(showSkeleton));
    };
    updateSkeleton();
    skeleton.addEventListener("click", () => {
      showSkeleton = !showSkeleton;
      this.registry.set("showSkeleton", showSkeleton);
      tracker.setDebugVisible(showSkeleton);
      updateSkeleton();
    });
    const selectMode = (useKeyboard: boolean) => {
      this.registry.set("keyboardMode", useKeyboard);
      this.registry.set("manualKeyboardOverride", useKeyboard);
      keyboard.textContent = `KEYBOARD & MOUSE: [${useKeyboard ? "ON" : "OFF"}]`;
      gesture.textContent = `GESTURE CONTROL: [${useKeyboard ? "OFF" : "ON"}]`;
      camera.textContent = `CAMERA ACCESS: [${useKeyboard ? "OFF" : "ON"}]`;
      keyboard.setAttribute("aria-pressed", String(useKeyboard));
      gesture.setAttribute("aria-pressed", String(!useKeyboard));
      camera.setAttribute("aria-pressed", String(!useKeyboard));
    };
    const useKeyboard = () => {
      request++;
      loading = false;
      tracker.stop();
      selectMode(true);
      this.registry.set("controlChoiceMade", true);
      showChoice(false);
      start.disabled =
        gesture.disabled =
        camera.disabled =
        gestureChoice.disabled =
          false;
      status.textContent = "Keyboard & mouse ready. Camera off.";
    };
    const enableGestures = async () => {
      if (loading) return;
      const currentRequest = ++request;
      loading = true;
      start.disabled =
        gesture.disabled =
        camera.disabled =
        gestureChoice.disabled =
          true;
      status.textContent =
        "Allow camera access. Preparing hand tracking… Keyboard mode remains available.";
      try {
        await tracker.init();
        if (currentRequest !== request || !screen.isConnected) return;
        selectMode(false);
        this.registry.set("controlChoiceMade", true);
        showChoice(false);
        status.textContent =
          "Gesture control ready. Point + thumb flick to select. Keep both hands in view to fly.";
      } catch {
        if (currentRequest !== request || !screen.isConnected) return;
        selectMode(true);
        status.textContent = `${tracker.getError() ?? "Camera unavailable."} Keyboard & mouse are ready.`;
      } finally {
        if (currentRequest === request && screen.isConnected) {
          loading = false;
          start.disabled =
            gesture.disabled =
            camera.disabled =
            gestureChoice.disabled =
              false;
        }
      }
    };
    keyboard.addEventListener("click", useKeyboard);
    keyboardChoice.addEventListener("click", useKeyboard);
    gestureChoice.addEventListener("click", () => {
      void enableGestures();
    });
    gesture.addEventListener("click", () => {
      void enableGestures();
    });
    camera.addEventListener("click", () => {
      if (tracker.getStatus() === "ready") useKeyboard();
      else void enableGestures();
    });
    start.addEventListener("click", () => {
      start.disabled = true;
      this.scene.start("MissionLoad");
    });
    screen
      .querySelector("#credits")!
      .addEventListener("click", () => this.scene.start("Credits"));
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (
          this.registry.get("keyboardMode") === false &&
          tracker.getStatus() !== "ready"
        ) {
          selectMode(true);
          this.registry.set("controlChoiceMade", false);
          showChoice(true);
          status.textContent = `${tracker.getError() ?? "Tracking stopped."} Keyboard & mouse are ready.`;
        }
      },
    });
    selectMode(!cameraReady);
    if (cameraReady)
      status.textContent =
        "Gesture control ready. Point + thumb flick to select.";
    else if (keyboardChosen)
      status.textContent =
        "Keyboard & mouse ready. Enable gestures in GAME CONTROLS.";
    const buttons = [...screen.querySelectorAll<HTMLButtonElement>("button")];
    this.gestureMenu = new GestureMenuNavigator(this, tracker, () =>
      buttons
        .filter(
          (button) => !button.disabled && button.getClientRects().length > 0,
        )
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            id: button.id || `menu-option-${buttons.indexOf(button)}`,
            bounds: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            activate: () => button.click(),
          };
        }),
    );
    this.events.once("shutdown", () => {
      request++;
      document.removeEventListener('intro-music-playing', beginIntro);
      document.removeEventListener('intro-music-error', musicError);
      if (introTimer !== undefined) window.clearTimeout(introTimer);
      // Cancel abandoned permission/model setup, but keep a ready camera so
      // credits, pause, retry and home are all reachable with gestures.
      if (loading) tracker.stop();
      this.gestureMenu = undefined;
      this.input.keyboard?.off("keydown-ESC", escape);
      this.stars = [];
    });
  }

  update(_time: number, delta: number) {
    this.gestureMenu?.tick();
    for (const star of this.stars) {
      star.object.y += (star.speed * Math.min(delta, 100)) / 1000;
      if (star.object.y > this.scale.height) {
        star.object.y = 0;
        star.object.x = Phaser.Math.Between(0, this.scale.width);
      }
    }
  }
}
