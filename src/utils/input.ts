import { OneEuroFilter } from './OneEuroFilter';

// Keep small hand tremors smooth without the long trailing motion of a 1 Hz
// cutoff. Coordinates are normalized, so beta is tuned for that scale.
export function createHandMotionFilter(): OneEuroFilter {
    return new OneEuroFilter(2, 0.15, 1);
}

export const PILOT_FOLLOW_AT_60_HZ = 0.35;
export const AIM_FOLLOW_AT_60_HZ = 0.5;
