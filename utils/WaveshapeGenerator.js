// ========== WAVESHAPE GENERATOR ==========
// Generate waveshaping curves for analog-style distortion and saturation

export class WaveshapeGenerator {
    // Generate soft clipping curve (tube-style)
    static softClip(amount = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            const y = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
            curve[i] = Math.max(-1, Math.min(1, y));
        }

        return curve;
    }

    // Generate hard clipping curve (transistor-style)
    static hardClip(threshold = 0.7) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            if (x > threshold) {
                curve[i] = threshold;
            } else if (x < -threshold) {
                curve[i] = -threshold;
            } else {
                curve[i] = x;
            }
        }

        return curve;
    }

    // Generate asymmetric clipping curve (diode-style)
    static asymmetricClip(amount = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;

            if (x > 0) {
                // Positive half - harder clipping
                curve[i] = Math.tanh(x * amount * 2);
            } else {
                // Negative half - softer clipping
                curve[i] = Math.tanh(x * amount);
            }
        }

        return curve;
    }

    // Generate exponential curve (fuzz-style)
    static exponentialClip(amount = 2) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            const sign = x >= 0 ? 1 : -1;
            curve[i] = sign * (1 - Math.exp(-Math.abs(x) * amount));
        }

        return curve;
    }

    // Generate tube saturation curve (warm, musical)
    static tubeSaturation(drive = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            const k = drive * 10;

            // Tube-like transfer function
            if (Math.abs(x) < 0.33) {
                curve[i] = x * 2;
            } else if (Math.abs(x) < 0.66) {
                const sign = x >= 0 ? 1 : -1;
                curve[i] = sign * (3 - Math.pow(2 - 3 * Math.abs(x), 2)) / 3;
            } else {
                const sign = x >= 0 ? 1 : -1;
                curve[i] = sign;
            }

            // Apply drive
            curve[i] = Math.tanh(curve[i] * k) / Math.tanh(k);
        }

        return curve;
    }

    // Generate custom curve using hyperbolic tangent
    static tanhClip(drive = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = Math.tanh(x * drive);
        }

        return curve;
    }

    // Generate sigmoid curve (smooth saturation)
    static sigmoidClip(drive = 5) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = (2 / (1 + Math.exp(-drive * x))) - 1;
        }

        return curve;
    }

    // Generate bit crusher curve (digital distortion)
    static bitCrush(bits = 8) {
        const samples = 1024;
        const curve = new Float32Array(samples);
        const levels = Math.pow(2, bits);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = Math.round(x * levels) / levels;
        }

        return curve;
    }

    // Get curve by name and parameters
    static getCurve(type, amount = 1) {
        switch (type) {
            case 'soft':
                return this.softClip(amount);
            case 'hard':
                return this.hardClip(amount);
            case 'asymmetric':
                return this.asymmetricClip(amount);
            case 'exponential':
                return this.exponentialClip(amount);
            case 'tube':
                return this.tubeSaturation(amount);
            case 'tanh':
                return this.tanhClip(amount);
            case 'sigmoid':
                return this.sigmoidClip(amount);
            case 'bitcrush':
                return this.bitCrush(amount);
            default:
                return this.softClip(amount);
        }
    }
}
