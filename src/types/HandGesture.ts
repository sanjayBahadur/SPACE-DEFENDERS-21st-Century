export type Gesture = 'FIST' | 'GUN' | 'PALM' | 'NONE';

export interface HandData {
    x: number; // Normalized 0-1, mirrored
    y: number; // Normalized 0-1
    gesture: Gesture;
    isLeft: boolean; // True if Left hand (Pilot)
    flickDetected?: boolean; // True if a thumb flick was detected this frame
    indexExtended?: boolean; // True if index finger is projected to be fully extended
}
