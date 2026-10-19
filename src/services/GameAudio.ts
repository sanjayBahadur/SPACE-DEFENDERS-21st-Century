export type AudioMode = 'intro' | 'menu' | 'credits' | 'briefing' | 'gameplay' | 'pause' | 'defeat';
export const EFFECTS = ['hover', 'confirm', 'back', 'tick', 'launch', 'pause', 'defeat', 'laser', 'cannon', 'explosion', 'impact', 'warning', 'ready', 'engine', 'siphon', 'meteor-whoosh', 'meteor-impact', 'enemy-laser', 'enemy-shot', 'enemy-charge'] as const;
export type SoundCue = typeof EFFECTS[number];
type LoopCue = 'cannon' | 'engine' | 'siphon';
export const musicForMode = (mode: AudioMode) => mode === 'intro' || mode === 'credits' ? 'heroic-theme.mp3' : 'out-there.mp3';
/** Actual displacement controls thrust audio, including inertia and gravity. */
export function engineIntensity(distance: number, deltaMs: number, width: number): number {
    if (!Number.isFinite(distance) || !Number.isFinite(deltaMs) || !Number.isFinite(width) || deltaMs <= 0 || width <= 0) return 0;
    const speed = distance * 1000 / deltaMs / width;
    return speed < 0.012 ? 0 : Math.min(1, 0.2 + speed * 0.7);
}
export interface AudioSettings { muted: boolean; music: number; effects: number }
const defaults: AudioSettings = { muted: false, music: 0.22, effects: 0.6 };
export function readAudioSettings(value: string | null): AudioSettings {
    try {
        const data = JSON.parse(value ?? '{}');
        const volume = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
        return { muted: data.muted === true, music: volume(data.music, defaults.music), effects: volume(data.effects, defaults.effects) };
    } catch { return { ...defaults }; }
}

/** Optional, non-blocking audio. No camera, gameplay timer or scene owns its lifetime. */
export class GameAudio {
    settings = { ...defaults };
    mode: AudioMode = 'intro';
    private context?: AudioContext;
    private music?: HTMLAudioElement;
    private buffers = new Map<SoundCue, AudioBuffer>();
    private active = new Map<AudioBufferSourceNode, SoundCue>();
    private lastCue = new Map<SoundCue, number>();
    private loops = new Map<LoopCue, { node: AudioBufferSourceNode; gain: GainNode; level: number }>();
    private musicTrack = '';
    private unlocked = false;
    private hidden = false;
    private installed = false;
    private toggle?: HTMLButtonElement;
    private readonly base = `${import.meta.env?.BASE_URL ?? '/'}audio/`;

    install(): void {
        if (this.installed) return;
        this.installed = true;
        try { this.settings = readAudioSettings(localStorage.getItem('space-defenders-audio')); } catch { /* Private browsing can block storage. */ }
        this.toggle = document.createElement('button');
        this.toggle.id = 'audio-toggle';
        this.toggle.className = 'audio-toggle';
        this.toggle.addEventListener('click', () => {
            this.configure({ muted: !this.settings.muted });
            if (!this.settings.muted && this.mode !== 'intro') this.unlock();
            this.refresh();
        });
        document.body.appendChild(this.toggle);
        const unlock = (event: Event) => { if (this.mode !== 'intro' && event.isTrusted && !(event.target as Element)?.closest?.('#audio-toggle')) this.unlock(); };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('keydown', unlock, true);
        document.addEventListener('click', event => {
            const button = (event.target as Element)?.closest?.('button');
            if (button && !button.disabled && button.id !== 'audio-toggle') this.play(button.hasAttribute('data-back') || button.id.includes('back') ? 'back' : 'confirm');
        }, true);
        document.addEventListener('pointerover', event => {
            const button = (event.target as Element)?.closest?.('button');
            if (button && !button.disabled && !button.contains((event as PointerEvent).relatedTarget as Node | null)) this.play('hover');
        });
        document.addEventListener('focusin', event => {
            if ((event.target as Element)?.matches?.('button:not(:disabled)')) this.play('hover');
        });
        const visibility = () => {
            this.hidden = document.hidden;
            if (this.hidden) this.stopEffects();
            this.refresh();
        };
        document.addEventListener('visibilitychange', visibility);
        window.addEventListener('blur', () => { this.hidden = true; this.stopEffects(); this.refresh(); });
        window.addEventListener('focus', visibility);
        window.addEventListener('pagehide', () => { this.hidden = true; this.stopEffects(); this.music?.pause(); void this.context?.suspend(); });
        this.refresh();
        document.dispatchEvent(new Event('game-audio-change'));
    }

    unlock(): void {
        if (this.unlocked) {
            if (this.context?.state === 'suspended') void this.context.resume().catch(() => {});
            this.refresh();
            return;
        }
        try {
            this.context = new AudioContext();
            this.unlocked = true;
            void this.context.resume().catch(() => {});
            this.musicTrack = musicForMode(this.mode);
            this.music = new Audio(`${this.base}${this.musicTrack}`);
            this.music.addEventListener('playing', () => {
                if (!this.hidden && !this.settings.muted && this.musicTrack === 'heroic-theme.mp3' && this.mode === 'intro') {
                    document.dispatchEvent(new Event('intro-music-playing'));
                }
            });
            this.music.addEventListener('error', () => this.reportIntroError());
            this.music.loop = true;
            this.music.preload = 'none';
            for (const cue of EFFECTS) {
                void fetch(`${this.base}${cue}.wav`).then(response => {
                    if (!response.ok) throw new Error('Audio unavailable');
                    return response.arrayBuffer();
                }).then(data => this.context!.decodeAudioData(data)).then(buffer => {
                    this.buffers.set(cue, buffer);
                }).catch(() => { /* A missing sound must never stop a mission. */ });
            }
        } catch { this.reportIntroError(); }
        this.refresh();
    }

    startIntroMusic(): void {
        this.unlock();
        // Reuse a theme that is already playing in an unlocked audio session.
        if (this.music && !this.music.paused && this.music.readyState >= 2 && !this.hidden && !this.settings.muted && this.settings.music > 0) {
            document.dispatchEvent(new Event('intro-music-playing'));
        }
    }

    private reportIntroError(): void {
        if (this.mode === 'intro' && typeof document !== 'undefined') document.dispatchEvent(new Event('intro-music-error'));
    }

    configure(change: Partial<AudioSettings>): void {
        this.settings = readAudioSettings(JSON.stringify({ ...this.settings, ...change }));
        try { localStorage.setItem('space-defenders-audio', JSON.stringify(this.settings)); } catch { /* Storage is optional. */ }
        this.stopEffects();
        this.refresh();
        if (typeof document !== 'undefined') document.dispatchEvent(new Event('game-audio-change'));
    }

    setMode(mode: AudioMode): void {
        if (this.mode === mode) return;
        this.mode = mode;
        this.stopEffects(true);
        this.lastCue.clear();
        this.refresh();
    }

    play(cue: SoundCue, gap = cue === 'explosion' ? 90 : cue === 'warning' ? 1500 : 70): void {
        if (!this.context || this.context.state !== 'running' || this.hidden || this.settings.muted || this.settings.effects <= 0) return;
        const buffer = this.buffers.get(cue);
        const now = this.context.currentTime * 1000;
        if (!buffer || now - (this.lastCue.get(cue) ?? -Infinity) < gap || this.active.size >= 10) return;
        this.lastCue.set(cue, now);
        const node = this.context.createBufferSource();
        const gain = this.context.createGain();
        node.buffer = buffer;
        gain.gain.value = this.settings.effects * (cue === 'hover' || cue === 'tick' ? 0.22 : cue === 'warning' ? 0.5 : 0.65);
        node.connect(gain).connect(this.context.destination);
        this.active.set(node, cue);
        node.onended = () => { this.active.delete(node); node.disconnect(); gain.disconnect(); };
        node.start();
    }

    cannon(firing: boolean): void { this.loop('cannon', firing ? 1 : 0); }
    engine(intensity: number): void { this.loop('engine', intensity); }
    siphon(damaging: boolean): void { this.loop('siphon', damaging ? 1 : 0); }

    private loop(cue: LoopCue, intensity: number): void {
        const level = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
        const existing = this.loops.get(cue);
        if (level === 0 || this.mode !== 'gameplay' || this.hidden || this.settings.muted || this.settings.effects === 0 || this.context?.state !== 'running') {
            if (existing && this.context) {
                existing.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.008);
                existing.node.stop(this.context.currentTime + 0.04);
                this.loops.delete(cue);
            }
            return;
        }
        const mix = cue === 'engine' ? 0.12 : cue === 'siphon' ? 0.24 : 0.28;
        if (existing) {
            if (Math.abs(existing.level - level) > 0.02) {
                existing.gain.gain.setTargetAtTime(this.settings.effects * mix * level, this.context.currentTime, 0.05);
                existing.level = level;
            }
            return;
        }
        const buffer = this.buffers.get(cue);
        if (!buffer || !this.context) return;
        const node = this.context.createBufferSource();
        const gain = this.context.createGain();
        node.buffer = buffer; node.loop = true;
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(this.settings.effects * mix * level, this.context.currentTime, 0.02);
        node.connect(gain).connect(this.context.destination);
        node.onended = () => { node.disconnect(); gain.disconnect(); };
        node.start(); this.loops.set(cue, { node, gain, level });
    }

    private stopEffects(preserveInterface = false): void {
        this.cannon(false); this.engine(0); this.siphon(false);
        for (const [node, cue] of this.active) {
            if (preserveInterface && ['hover', 'confirm', 'back', 'launch', 'ready', 'tick'].includes(cue)) continue;
            node.stop(); this.active.delete(node);
        }
    }

    private refresh(): void {
        if (this.toggle) {
            this.toggle.textContent = this.settings.muted ? 'SOUND: OFF' : 'SOUND: ON';
            this.toggle.setAttribute('aria-pressed', String(!this.settings.muted));
        }
        if (!this.music) return;
        const track = musicForMode(this.mode);
        if (track !== this.musicTrack) {
            this.music.pause();
            this.music.src = `${this.base}${track}`;
            this.musicTrack = track;
        }
        this.music.volume = this.settings.music * (this.mode === 'pause' ? 0.18 : this.mode === 'gameplay' ? 0.6 : 1);
        if (this.hidden || this.settings.muted || this.settings.music === 0 || this.mode === 'defeat') this.music.pause();
        else if (this.music.paused) void this.music.play().catch(() => this.reportIntroError());
    }
}
export const gameAudio = new GameAudio();
