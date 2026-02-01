/**
 * OneEuroFilter utility class.
 * Reference: https://cristal.univ-lille.fr/~casiez/1euro/
 */

class LowPassFilter {
    alpha: number;
    y: number;
    s: number;
    initialized: boolean;

    constructor(alpha: number, initval: number = 0) {
        this.alpha = alpha;
        this.y = initval;
        this.s = initval;
        this.initialized = false;
    }

    filter(value: number) {
        let result: number;
        if (this.initialized) {
            result = this.alpha * value + (1.0 - this.alpha) * this.s;
        } else {
            result = value;
            this.initialized = true;
        }
        this.y = value;
        this.s = result;
        return result;
    }

    filterWithAlpha(value: number, alpha: number) {
        this.alpha = alpha;
        return this.filter(value);
    }

    hasLastRawValue() {
        return this.initialized;
    }

    lastRawValue() {
        return this.y;
    }
}

export class OneEuroFilter {
    minCutoff: number;
    beta: number;
    dcutoff: number;
    x: LowPassFilter;
    dx: LowPassFilter;
    lasttime: number | undefined;

    constructor(minCutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dcutoff = dcutoff;
        this.x = new LowPassFilter(this.alpha(minCutoff));
        this.dx = new LowPassFilter(this.alpha(dcutoff));
        this.lasttime = undefined;
    }

    alpha(cutoff: number): number {
        const te = 1.0 / 60.0; // Default estimate if time not available
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }

    filter(value: number, timestamp: number = -1): number {
        if (this.lasttime !== undefined && timestamp !== -1) {
            // Unused variables removed
            // const dt = (timestamp - this.lasttime) / 1000.0;
        }

        // Standard implementation usually recalculates alpha dynamically
        // But for simplicity with fixed param, let's follow the standard dynamic version strictly

        if (this.lasttime !== undefined && timestamp !== -1 && timestamp !== this.lasttime) {
            const dt = (timestamp - this.lasttime) / 1000.0;
            const dx = (value - this.x.lastRawValue()) / dt;
            const edx = this.dx.filterWithAlpha(dx, this.getAlpha(dt, this.dcutoff));
            const cutoff = this.minCutoff + this.beta * Math.abs(edx);
            const result = this.x.filterWithAlpha(value, this.getAlpha(dt, cutoff));
            this.lasttime = timestamp;
            return result;
        } else if (this.lasttime === undefined || timestamp === -1) {
            // First time or no timestamp
            this.lasttime = timestamp;
            return this.x.filter(value);
        }

        // If timestamp equals lasttime, return current filtered value (no update)
        return this.x.s;
    }

    private getAlpha(dt: number, cutoff: number): number {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }
}
