export type Gesture = 'FIST' | 'GUN' | 'PALM' | 'NONE';

export interface HandData {
    x: number; // Normalized 0-1, mirrored (0 = left edge of screen, 1 = right edge)
    y: number; // Normalized 0-1
    gesture: Gesture;
    isLeft: boolean; // True if the detected hand is a Left hand
}
