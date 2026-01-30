import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { HandData, Gesture } from '../types/HandGesture';

export class HandTracker {
    private handLandmarker: HandLandmarker | undefined;
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement; // For debug drawing
    private ctx: CanvasRenderingContext2D;
    private lastVideoTime = -1;
    private results: any = undefined;

    constructor() {
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

    getHandData(): HandData[] {
        if (!this.results || !this.results.landmarks) return [];

        const hands: HandData[] = [];

        // Iterate over detected hands
        for (let i = 0; i < this.results.landmarks.length; i++) {
            const landmarks = this.results.landmarks[i];
            const handedness = this.results.handedness[i][0];
            const isLeft = handedness.categoryName === 'Left'; // Note: In Selfie mode, this might be swapped depending on mirroring

            // Gesture Logic
            const gesture = this.detectGesture(landmarks);

            // Coordinates: Use Index Finger Tip (8) for pointer
            const rawX = landmarks[8].x;
            const rawY = landmarks[8].y;

            // Mirror X: 1 - x
            const x = 1 - rawX;
            const y = rawY;

            hands.push({
                x,
                y,
                gesture,
                isLeft
            });
        }
        return hands;
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
        // const thumbTip = landmarks[4]; // Unused

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
