// ========== UTILIDADES MATEMÁTICAS DE AUDIO ==========
// Utilidades de DSP y cálculos de audio

export class AudioMath {
    // Convierte decibelios a ganancia lineal
    static dBToGain(dB) {
        return Math.pow(10, dB / 20);
    }

    // Convierte ganancia lineal a decibelios
    static gainToDb(gain) {
        return 20 * Math.log10(Math.max(gain, 0.00001)); // Avoid log(0)
    }

    // Convierte BPM y división de nota a milisegundos
    static bpmToMs(bpm, division = '1/4') {
        const beatMs = (60 / bpm) * 1000;

        const divisions = {
            '1/1': 4,      // Redonda
            '1/2': 2,      // Blanca
            '1/4': 1,      // Negra
            '1/8': 0.5,    // Corchea
            '1/16': 0.25,  // Semicorchea
            '1/8D': 0.75,  // Corchea con puntillo
            '1/8T': 0.333, // Tresillo de corchea
            '1/16T': 0.167 // Tresillo de semicorchea
        };

        return beatMs * (divisions[division] || 1);
    }

    // Convierte milisegundos a segundos
    static msToSeconds(ms) {
        return ms / 1000;
    }

    // Calcula RMS (Root Mean Square) de los datos de audio
    static calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    // Calcula el valor pico en los datos de audio
    static calculatePeak(audioData) {
        let peak = 0;
        for (let i = 0; i < audioData.length; i++) {
            const abs = Math.abs(audioData[i]);
            if (abs > peak) peak = abs;
        }
        return peak;
    }

    // Limita un valor entre un mínimo y un máximo (clamp)
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Interpolación lineal
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Mapea un valor de un rango a otro
    static mapRange(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    // Convierte frecuencia a factor Q para filtros
    static frequencyToQ(frequency, bandwidth) {
        return frequency / bandwidth;
    }

    // Calcula el coeficiente de filtro para un filtro simple de un polo
    static calculateFilterCoefficient(cutoffFreq, sampleRate) {
        const omega = 2 * Math.PI * cutoffFreq / sampleRate;
        return 1 - Math.exp(-omega);
    }

    // Suavizado de parámetros (suavizado exponencial)
    static smoothParameter(current, target, smoothing = 0.95) {
        return current * smoothing + target * (1 - smoothing);
    }

    // Convierte nota MIDI a frecuencia
    static midiToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    // Convierte frecuencia a nota MIDI
    static frequencyToMidi(frequency) {
        return 69 + 12 * Math.log2(frequency / 440);
    }
}
