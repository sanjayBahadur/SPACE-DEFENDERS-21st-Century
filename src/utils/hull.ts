export const METEOR_HULL_DAMAGE = 18;
export const DEATH_RAY_HULL_DAMAGE = 30;
export const BLACK_HOLE_DAMAGE_PER_SECOND = 8;
export const HULL_HIT_RECOVERY_MS = 900;

export interface HullState {
    health: number;
    protectedUntil: number;
}

export function applyHullHit(state: HullState, damage: number, now: number): HullState {
    if (state.health <= 0 || !Number.isFinite(damage) || damage <= 0 || now < state.protectedUntil) return state;
    return {
        health: Math.max(0, state.health - damage),
        protectedUntil: now + HULL_HIT_RECOVERY_MS,
    };
}

// Continuous hazards remain dangerous during impact recovery, but drain hull
// gradually. Cap a stalled frame to the same 100 ms used by the game loop.
export function applyHullExposure(state: HullState, damagePerSecond: number, deltaMs: number): HullState {
    if (state.health <= 0 || !Number.isFinite(damagePerSecond) || damagePerSecond <= 0 ||
        !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
    return {
        ...state,
        health: Math.max(0, state.health - damagePerSecond * Math.min(deltaMs, 100) / 1000),
    };
}
