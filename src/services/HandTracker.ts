import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { HandData, Gesture } from '../types/HandGesture';
import { OneEuroFilter } from '../utils/OneEuroFilter';

export interface HandsResult {
    pilot: HandData | null;
    gunner: HandData | null;
}

export class HandTracker {
    private handLandmarker: HandLandmarker | undefined;
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement; // For debug drawing
    private ctx: CanvasRenderingContext2D;
    private lastVideoTime = -1;
    private results: any = undefined;

    // Filters for Pilot (Left Hand)
    private pilotFilterX: OneEuroFilter;
    private pilotFilterY: OneEuroFilter;

    // Filters for Gunner (Right Hand)
    private gunnerFilterX: OneEuroFilter;
    private gunnerFilterY: OneEuroFilter;

    // State for Gunner Thumb Flick
    private lastGunnerThumbDist: number = -1;

    constructor() {
        // Initialize Filters with minCutoff = 1.0, beta = 0.007, dCutoff = 1.0
        this.pilotFilterX = new OneEuroFilter(1.0, 0.007, 1.0);
        this.pilotFilterY = new OneEuroFilter(1.0, 0.007, 1.0);
        this.gunnerFilterX = new OneEuroFilter(1.0, 0.007, 1.0);
        this.gunnerFilterY = new OneEuroFilter(1.0, 0.007, 1.0);

        // Create hidden video element
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.style.display = 'none';
        document.body.appendChild(this.video);

        // Create debug canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'hand-debug-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '100'; // Ensure it is on top
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;
    }

    async init(): Promise<void> {
        try {
            const vision = await FilesetResolver.forVisionTasks('/models');
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: '/models/hand_landmarker.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numHands: 2,
            });

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;

            return new Promise<void>((resolve) => {
                this.video.addEventListener('loadeddata', () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    this.detectLoop();
                    resolve();
                });
            });
        } catch (e) {
            console.error('HandTracker Init Error:', e);
            throw e;
        }
    }

    getHands(): HandsResult {
        const result: HandsResult = { pilot: null, gunner: null };
        if (!this.results || !this.results.landmarks) return result;

        const now = performance.now();

        // Iterate over detected hands
        for (let i = 0; i < this.results.landmarks.length; i++) {
            const landmarks = this.results.landmarks[i];
            const handedness = this.results.handedness[i][0];
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

            // Exception: Gunner with GUN gesture uses Index Tip (8)
            if (!isLeft && gesture === 'GUN') {
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
                // Pilot (Left Hand) -> Zone [0.0, 0.5]
                // Map [0.0, 0.5] -> [0, 1]
                const normalizedX = clamp(x / 0.5, 0, 1);
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
                // Gunner (Right Hand) -> Zone [0.5, 1.0]
                // Map [0.5, 1.0] -> [0, 1]
                const normalizedX = clamp((x - 0.5) / 0.5, 0, 1);
                const normalizedY = clamp(y, 0, 1);

                filteredX = this.gunnerFilterX.filter(normalizedX, now);
                filteredY = this.gunnerFilterY.filter(normalizedY, now);

                // Detect Thumb-Flick for Gunner
                // Thumb Tip (4) and Index Base (5 - Index MCP)
                // "detect a 'Shoot' event when the distance ... increases rapidly (>20% change in 2 frames)."

                // Calculate distance
                const thumbTip = landmarks[4];
                const indexBase = landmarks[5]; // Index MCP
                const currentDist = this.distance(thumbTip, indexBase);

                if (this.lastGunnerThumbDist !== -1) {
                    const delta = currentDist - this.lastGunnerThumbDist;
                    const percentChange = delta / this.lastGunnerThumbDist;

                    // Check for rapid increase > 20%
                    if (percentChange > 0.20 && gesture === 'GUN') {
                        flickDetected = true;
                    }
                }

                this.lastGunnerThumbDist = currentDist;

                result.gunner = {
                    x: filteredX,
                    y: filteredY,
                    gesture,
                    isLeft: false,
                    flickDetected
                };
            }
        }
        return result;
    }

    private detectLoop() {
        if (this.handLandmarker && this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            this.results = this.handLandmarker.detectForVideo(this.video, performance.now());

            // Draw debug
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.save();
            // Mirror the context so drawing matches the mirrored gameplay
            this.ctx.scale(-1, 1);
            this.ctx.translate(-this.canvas.width, 0);

            if (this.results.landmarks) {
                const drawingUtils = new DrawingUtils(this.ctx);
                for (const landmarks of this.results.landmarks) {
                    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
                    drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1 });
                }
            }
            this.ctx.restore();
        }
        requestAnimationFrame(() => this.detectLoop());
    }

    private detectGesture(landmarks: any[]): Gesture {
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
}
