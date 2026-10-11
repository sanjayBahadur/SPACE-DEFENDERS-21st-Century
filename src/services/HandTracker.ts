import type { HandLandmarker, HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HandData, Gesture } from '../types/HandGesture';
import { OneEuroFilter } from '../utils/OneEuroFilter';

export interface HandsResult {
    pilot: HandData | null;
    gunner: HandData | null;
}

export type HandTrackerStatus = 'idle' | 'loading' | 'ready' | 'error';

export class HandTracker {
    private handLandmarker: HandLandmarker | undefined;
    private video: HTMLVideoElement | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private ctx: CanvasRenderingContext2D | null = null;
    private stream: MediaStream | undefined;
    private frameId: number | undefined;
    private session = 0;
    private initPromise: Promise<void> | undefined;
    private cancelStartup: (() => void) | undefined;
    private status: HandTrackerStatus = 'idle';
    private error: string | null = null;
    private debugVisible = true;
    private lastVideoTime = -1;
    private results: HandLandmarkerResult | undefined;
    private hands: HandsResult = { pilot: null, gunner: null };

    private pilotFilterX = new OneEuroFilter();
    private pilotFilterY = new OneEuroFilter();
    private gunnerFilterX = new OneEuroFilter();
    private gunnerFilterY = new OneEuroFilter();
    private lastGunnerThumbDist = -1;
    private lastDetectionTime = 0;
    private lastHandsUpdateTime = 0;

    getStatus(): HandTrackerStatus {
        return this.status;
    }

    getError(): string | null {
        return this.error;
    }

    // Call only after the player chooses camera controls. Construction is inert.
    init(): Promise<void> {
        if (this.status === 'ready') return Promise.resolve();
        if (this.initPromise) return this.initPromise;

        const session = ++this.session;
        this.status = 'loading';
        this.error = null;
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(
                'Camera setup took too long. Try again or use keyboard controls.'
            )), 45000);
        });

        let cancelStartup: () => void;
        const cancellation = new Promise<never>((_, reject) => {
            cancelStartup = () => {
                clearTimeout(timeoutId);
                reject(new DOMException('Camera setup cancelled.', 'AbortError'));
            };
            this.cancelStartup = cancelStartup;
        });
        const initPromise = Promise.race([this.start(session), timeout, cancellation])
            .catch((error: unknown) => {
                if (session === this.session) {
                    this.stop();
                    this.status = 'error';
                    this.error = this.describeError(error);
                }
                throw error;
            })
            .finally(() => {
                clearTimeout(timeoutId);
                if (this.initPromise === initPromise) this.initPromise = undefined;
                if (this.cancelStartup === cancelStartup) this.cancelStartup = undefined;
            });
        this.initPromise = initPromise;
        return initPromise;
    }

    private async start(session: number): Promise<void> {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera controls require HTTPS and a browser with camera support. Keyboard controls are available.');
        }

        // Permission comes first: a declined camera never downloads the ML runtime.
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30, max: 30 },
            },
        });
        if (session !== this.session) {
            stream.getTracks().forEach(track => track.stop());
            throw new DOMException('Camera setup cancelled.', 'AbortError');
        }
        this.stream = stream;
        stream.getVideoTracks().forEach(track => {
            track.addEventListener('ended', () => {
                if (session !== this.session) return;
                this.stop();
                this.status = 'error';
                this.error = 'The camera disconnected. Reconnect it and try again, or use keyboard controls.';
            }, { once: true });
        });

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.hidden = true;
        video.srcObject = stream;
        document.body.appendChild(video);
        this.video = video;

        // Keep MediaPipe out of the initial game bundle and load it on demand.
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        this.assertSession(session);
        const modelBase = `${import.meta.env.BASE_URL}models`;
        const vision = await FilesetResolver.forVisionTasks(modelBase);
        this.assertSession(session);
        const createLandmarker = async (delegate: 'GPU' | 'CPU') => {
            const landmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `${modelBase}/hand_landmarker.task`,
                    delegate,
                },
                runningMode: 'VIDEO',
                numHands: 2,
            });
            if (session !== this.session) {
                landmarker.close();
                this.assertSession(session);
            }
            return landmarker;
        };
        try {
            this.handLandmarker = await createLandmarker('GPU');
        } catch (error) {
            this.assertSession(session);
            // WebGL is unavailable on some devices; CPU inference remains usable.
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            this.handLandmarker = await createLandmarker('CPU');
        }
        this.assertSession(session);
        await video.play();
        this.assertSession(session);
        this.status = 'ready';
        this.setDebugVisible(this.debugVisible);
        this.detectLoop();
    }

    private assertSession(session: number): void {
        if (session !== this.session) throw new DOMException('Camera setup cancelled.', 'AbortError');
    }

    stop(): void {
        ++this.session;
        this.cancelStartup?.();
        this.cancelStartup = undefined;
        this.initPromise = undefined;
        if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
        this.frameId = undefined;
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = undefined;
        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
            this.video.remove();
            this.video = undefined;
        }
        this.handLandmarker?.close();
        this.handLandmarker = undefined;
        this.canvas?.remove();
        this.canvas = undefined;
        this.ctx = null;
        this.results = undefined;
        this.hands = { pilot: null, gunner: null };
        this.lastVideoTime = -1;
        this.lastDetectionTime = 0;
        this.lastHandsUpdateTime = 0;
        this.lastGunnerThumbDist = -1;
        this.pilotFilterX = new OneEuroFilter();
        this.pilotFilterY = new OneEuroFilter();
        this.gunnerFilterX = new OneEuroFilter();
        this.gunnerFilterY = new OneEuroFilter();
        this.status = 'idle';
        this.error = null;
    }

    setDebugVisible(visible: boolean): void {
        this.debugVisible = visible;
        if (!visible) {
            this.canvas?.remove();
            this.canvas = undefined;
            this.ctx = null;
            return;
        }
        if (!this.video || this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'hand-debug-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        Object.assign(this.canvas.style, {
            position: 'absolute', top: '0', left: '0', width: '100%',
            height: '100%', pointerEvents: 'none', zIndex: '100',
        });
        (document.getElementById('app') ?? document.body).appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    private describeError(error: unknown): string {
        if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') return 'Camera permission was declined. Allow camera access to try again, or use keyboard controls.';
            if (error.name === 'NotFoundError') return 'No camera was found. Connect a camera or use keyboard controls.';
            if (error.name === 'NotReadableError') return 'The camera is busy or unavailable. Close other camera apps and try again.';
        }
        return error instanceof Error ? error.message : 'Camera controls could not start. Try again or use keyboard controls.';
    }

    getHands(consumeFlick = false): HandsResult {
        if (this.status !== 'ready' || performance.now() - this.lastDetectionTime > 250) {
            return { pilot: null, gunner: null };
        }
        // A thumb flick is an event, consumed once even when rendering at 60 FPS.
        const hands = this.hands;
        if (consumeFlick && hands.gunner?.flickDetected) {
            this.hands = { ...hands, gunner: { ...hands.gunner, flickDetected: false } };
        }
        return hands;
    }

    private updateHands(now: number): HandsResult {
        const result: HandsResult = { pilot: null, gunner: null };
        // A stalled camera or hidden tab must not turn the first returning frame
        // into a thumb flick, or smooth its cursor from an old hand position.
        if (now - this.lastHandsUpdateTime > 250) {
            this.resetPilotMotion();
            this.resetGunnerMotion();
        }
        this.lastHandsUpdateTime = now;
        const detectedHands = this.results?.landmarks ?? [];

        // Iterate over detected hands
        for (let i = 0; i < detectedHands.length; i++) {
            const landmarks = detectedHands[i];
            const handedness = this.results?.handedness[i]?.[0];
            if (!handedness || landmarks.length < 21) continue;
            const detectedCategory = handedness.categoryName;
            // In MediaPipe with front camera, "Left" usually refers to the left hand of the person 
            // (which appears on the Right side of the screen if unmirrored). 
            // If we mirror the video display, "Left" hand should ideally be controlled by the person's left hand.

            // Assign Roles:
            // Pilot = Left Hand
            // Gunner = Right Hand

            // Note: We need a consistent mapping. 
            // If the user raises their physical Left hand, MediaPipe (assuming selfie mode default) says "Left".
            const isLeft = detectedCategory === 'Left';

            // Gesture Logic
            const gesture = this.detectGesture(landmarks);

            // Coordinates: Default to Palm Center (Middle MCP - 9)
            let sourceIndex = 9;

            // Exception: Gunner (Right Hand) uses Index Tip (8) for precision cursor
            if (!isLeft) {
                sourceIndex = 8;
            }

            const rawX = landmarks[sourceIndex].x;
            const rawY = landmarks[sourceIndex].y;

            // Mirror X: 1 - x (Ensure natural movement)
            const x = 1 - rawX;
            const y = rawY;

            let filteredX = x;
            let filteredY = y;
            let flickDetected = false;

            const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

            if (isLeft) {
                // Pilot (Left Hand) -> Active Zone [0.1, 0.45]
                // Map [0.1, 0.45] -> [0, 1]
                const normalizedX = clamp((x - 0.1) / (0.45 - 0.1), 0, 1);
                const normalizedY = clamp(y, 0, 1);

                filteredX = this.pilotFilterX.filter(normalizedX, now);
                filteredY = this.pilotFilterY.filter(normalizedY, now);

                result.pilot = {
                    x: filteredX,
                    y: filteredY,
                    gesture,
                    isLeft: true
                };
            } else {
                // Gunner (Right Hand) -> Active Zone [0.55, 0.9]
                // Map [0.55, 0.9] -> [0, 1]
                const normalizedX = clamp((x - 0.55) / (0.9 - 0.55), 0, 1);
                const normalizedY = clamp(y, 0, 1);

                filteredX = this.gunnerFilterX.filter(normalizedX, now);
                filteredY = this.gunnerFilterY.filter(normalizedY, now);

                // Detect Thumb-Flick for Gunner
                // Thumb Tip (4) and Index Base (5 - Index MCP)
                // "detect a 'Shoot' event when the distance ... increases rapidly (>20% change in 2 frames)."

                // Calculate distance
                const thumbTip = landmarks[4];
                const indexBase = landmarks[5]; // Index MCP
                // Compare thumb motion relative to palm size. Moving the whole
                // hand toward the camera should not count as pulling a trigger.
                const palmSize = Math.max(this.distance(landmarks[0], landmarks[9]), 0.001);
                const currentDist = this.distance(thumbTip, indexBase) / palmSize;

                if (this.lastGunnerThumbDist > 0.001) {
                    const delta = currentDist - this.lastGunnerThumbDist;
                    const percentChange = delta / this.lastGunnerThumbDist;

                    // Check for rapid increase > 15% (Relaxed from 20%)
                    // Removed strict 'GUN' check to allow for transitional states during fast motion
                    if (percentChange > 0.15) {
                        flickDetected = true;
                    }
                }

                this.lastGunnerThumbDist = currentDist;

                // Sensitivity Check: Is Index Extended?
                // dist(8, 5) > dist(6, 5)
                // 8: Index Tip, 5: Index MCP, 6: Index PIP
                const d8_5 = this.distance(landmarks[8], landmarks[5]);
                const d6_5 = this.distance(landmarks[6], landmarks[5]);
                const indexExtended = d8_5 > d6_5;

                result.gunner = {
                    x: filteredX,
                    y: filteredY,
                    gesture,
                    isLeft: false,
                    flickDetected,
                    indexExtended
                };
            }
        }
        if (!result.pilot) this.resetPilotMotion();
        if (!result.gunner) this.resetGunnerMotion();
        return result;
    }

    private resetPilotMotion(): void {
        this.pilotFilterX = new OneEuroFilter();
        this.pilotFilterY = new OneEuroFilter();
    }

    private resetGunnerMotion(): void {
        this.gunnerFilterX = new OneEuroFilter();
        this.gunnerFilterY = new OneEuroFilter();
        this.lastGunnerThumbDist = -1;
    }

    private detectLoop(): void {
        if (this.status !== 'ready' || !this.video || !this.handLandmarker) return;
        const now = performance.now();
        // Inference is synchronous; avoid processing duplicate frames or hidden tabs.
        if (!document.hidden && now - this.lastDetectionTime >= 1000 / 30 &&
            this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            this.video.currentTime !== this.lastVideoTime) {
            try {
                this.lastDetectionTime = now;
                this.lastVideoTime = this.video.currentTime;
                this.results = this.handLandmarker.detectForVideo(this.video, now);
                this.hands = this.updateHands(now);
                if (this.canvas && this.ctx) {
                    if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                    }
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.save();
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-this.canvas.width, 0);
                    for (const landmarks of this.results.landmarks) this.drawWireframeHand(landmarks);
                    this.ctx.restore();
                }
            } catch (error) {
                this.stop();
                this.status = 'error';
                this.error = this.describeError(error);
                return;
            }
        }
        this.frameId = requestAnimationFrame(() => this.detectLoop());
    }

    private detectGesture(landmarks: NormalizedLandmark[]): Gesture {
        // 0: Wrist
        // 4: Thumb Tip
        // 8: Index Tip
        // 12: Middle Tip
        // 16: Ring Tip
        // 20: Pinky Tip
        // 9: Middle MCP (Base of finger)

        // Calculate Scale based on hand size (Wrist to Middle MCP)
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const scale = this.distance(wrist, middleMCP);

        const isTipExtended = (tipIdx: number) => {
            return this.distance(landmarks[tipIdx], wrist) > scale * 1.5; // Tunable multiplier
        };

        const isTipCurled = (tipIdx: number) => {
            return this.distance(landmarks[tipIdx], wrist) < scale * 1.2; // Tunable
        };

        // User Check: Fist = Fingertips near Palm Base
        // Palm Base is 0. 
        // We check if all tips are close to 0 effectively.
        // Or we check if they are NOT extended.

        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        // const thumbTip = landmarks[4]; // Unused for basic checks

        // FIST: All 4 fingers curled
        const fingersCurled =
            this.distance(indexTip, wrist) < scale * 1.2 &&
            this.distance(middleTip, wrist) < scale * 1.2 &&
            this.distance(ringTip, wrist) < scale * 1.2 &&
            this.distance(pinkyTip, wrist) < scale * 1.2;

        if (fingersCurled) {
            // Thumb position for fist? Usually curled or tucked.
            return 'FIST';
        }

        // FINGER GUN: Index & Thumb extended, others curled
        const gunPose =
            isTipExtended(8) && // Index
            isTipExtended(4) && // Thumb
            isTipCurled(12) && // Middle
            isTipCurled(16) && // Ring
            isTipCurled(20);   // Pinky

        if (gunPose) return 'GUN';

        // OPEN PALM: All extended
        const palmPose =
            isTipExtended(8) &&
            isTipExtended(12) &&
            isTipExtended(16) &&
            isTipExtended(20) &&
            isTipExtended(4);

        if (palmPose) return 'PALM';

        return 'NONE';
    }

    private distance(p1: { x: number, y: number }, p2: { x: number, y: number }) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    private drawWireframeHand(landmarks: NormalizedLandmark[]) {
        if (!this.canvas || !this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const pts = landmarks.map(lm => ({
            x: lm.x * w,
            y: lm.y * h
        }));

        // Hand connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17], [0, 17]
        ];

        // Transparent mesh lines
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(100, 180, 255, 0.35)';
        this.ctx.shadowColor = 'rgba(68, 200, 255, 0.3)';
        this.ctx.shadowBlur = 4;

        for (const [a, b] of connections) {
            this.ctx.beginPath();
            this.ctx.moveTo(pts[a].x, pts[a].y);
            this.ctx.lineTo(pts[b].x, pts[b].y);
            this.ctx.stroke();
        }

        // Ghost joints
        this.ctx.fillStyle = 'rgba(200, 220, 255, 0.25)';
        this.ctx.shadowBlur = 6;
        for (const pt of pts) {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Soft fingertip highlights
        const tips = [4, 8, 12, 16, 20];
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        this.ctx.shadowBlur = 8;
        for (const i of tips) {
            this.ctx.beginPath();
            this.ctx.arc(pts[i].x, pts[i].y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 0;
    }
}
