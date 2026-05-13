// ========== GENERADOR DE FORMA DE ONDA (WAVESHAPE) ==========
// Genera curvas de distorsión y saturación de estilo analógico

export class WaveshapeGenerator {
    // Genera una curva de recorte suave (tipo válvulas)
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

    // Genera una curva de recorte duro (tipo transistores)
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

    // Genera una curva de recorte asimétrico (tipo diodo)
    static asymmetricClip(amount = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;

            if (x > 0) {
                // Mitad positiva - recorte más duro
                curve[i] = Math.tanh(x * amount * 2);
            } else {
                // Mitad negativa - recorte más suave
                curve[i] = Math.tanh(x * amount);
            }
        }

        return curve;
    }

    // Genera una curva exponencial (tipo fuzz)
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

    // Genera una curva de saturación de válvulas (cálida y musical)
    static tubeSaturation(drive = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            const k = drive * 10;

            // Función de transferencia tipo válvula
            if (Math.abs(x) < 0.33) {
                curve[i] = x * 2;
            } else if (Math.abs(x) < 0.66) {
                const sign = x >= 0 ? 1 : -1;
                curve[i] = sign * (3 - Math.pow(2 - 3 * Math.abs(x), 2)) / 3;
            } else {
                const sign = x >= 0 ? 1 : -1;
                curve[i] = sign;
            }

            // Aplicar drive
            curve[i] = Math.tanh(curve[i] * k) / Math.tanh(k);
        }

        return curve;
    }

    // Genera una curva personalizada usando tangente hiperbólica
    static tanhClip(drive = 1) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = Math.tanh(x * drive);
        }

        return curve;
    }

    // Genera una curva sigmoide (saturación suave)
    static sigmoidClip(drive = 5) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = (2 / (1 + Math.exp(-drive * x))) - 1;
        }

        return curve;
    }

    // Genera una curva de bit crusher (distorsión digital)
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

    // Obtiene una curva por nombre y parámetros
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
