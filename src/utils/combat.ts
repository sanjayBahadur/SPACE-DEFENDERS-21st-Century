export const CANNON_HEAT_PER_SECOND = 100 / 6;
export const CANNON_COOL_PER_SECOND = 25;

export interface CannonState {
    heat: number;
    overheated: boolean;
}

export function advanceCannon(state: CannonState, firing: boolean, deltaMs: number): CannonState {
    const seconds = Math.max(0, deltaMs) / 1000;
    const canFire = firing && !state.overheated;
    let heat = Math.min(100, Math.max(0, state.heat + seconds * (
        canFire ? CANNON_HEAT_PER_SECOND : -CANNON_COOL_PER_SECOND
    )));
    if (heat < 1e-8) heat = 0;
    if (heat > 100 - 1e-8) heat = 100;
    return { heat, overheated: heat >= 100 || (state.overheated && heat > 0) };
}

/** Convert an interpolation amount at 60 Hz to the current frame duration. */
export function frameLerp(amountAt60Hz: number, deltaMs: number): number {
    return 1 - Math.pow(1 - amountAt60Hz, Math.max(0, deltaMs) / (1000 / 60));
}
