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

export interface ShieldState {
    energy: number;
    rechargeDelay: number;
    exhausted: boolean;
    active: boolean;
}

export function advanceShield(state: ShieldState, requested: boolean, deltaMs: number): ShieldState {
    const seconds = Math.max(0, deltaMs) / 1000;
    let { energy, rechargeDelay, exhausted } = state;
    if (!requested) exhausted = false;
    const active = requested && !exhausted && energy > 0;
    if (active) {
        energy = Math.max(0, energy - seconds * 12.5);
        rechargeDelay = 1.5;
        if (energy < 1e-8) energy = 0;
        exhausted = energy === 0;
    } else {
        const rechargeSeconds = Math.max(0, seconds - rechargeDelay);
        rechargeDelay = Math.max(0, rechargeDelay - seconds);
        energy = Math.min(100, energy + rechargeSeconds * 20);
    }
    return { energy, rechargeDelay, exhausted, active: active && energy > 0 };
}

export function absorbDamage(state: ShieldState, amount: number): { shield: ShieldState; hullDamage: number } {
    const damage = Math.max(0, amount);
    const absorbed = state.active ? Math.min(state.energy, damage) : 0;
    const energy = state.energy - absorbed;
    return {
        shield: {
            ...state, energy,
            rechargeDelay: absorbed > 0 ? 2 : state.rechargeDelay,
            exhausted: state.exhausted || (state.active && energy === 0),
            active: state.active && energy > 0,
        },
        hullDamage: damage - absorbed,
    };
}

/** Convert an interpolation amount at 60 Hz to the current frame duration. */
export function frameLerp(amountAt60Hz: number, deltaMs: number): number {
    return 1 - Math.pow(1 - amountAt60Hz, Math.max(0, deltaMs) / (1000 / 60));
}
