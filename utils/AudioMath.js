// ========== AUDIO MATH UTILITIES ==========
// DSP and audio calculation utilities

export class AudioMath {
    // Convert decibels to linear gain
    static dBToGain(dB) {
        return Math.pow(10, dB / 20);
    }

    // Convert linear gain to decibels
    static gainToDb(gain) {
        return 20 * Math.log10(Math.max(gain, 0.00001)); // Avoid log(0)
    }

    // Convert BPM and note division to milliseconds
    static bpmToMs(bpm, division = '1/4') {
        const beatMs = (60 / bpm) * 1000;

        const divisions = {
            '1/1': 4,      // Whole note
            '1/2': 2,      // Half note
            '1/4': 1,      // Quarter note
            '1/8': 0.5,    // Eighth note
            '1/16': 0.25,  // Sixteenth note
            '1/8D': 0.75,  // Dotted eighth
            '1/8T': 0.333, // Eighth triplet
            '1/16T': 0.167 // Sixteenth triplet
        };

        return beatMs * (divisions[division] || 1);
    }

    // Convert milliseconds to seconds
    static msToSeconds(ms) {
        return ms / 1000;
    }

    // Calculate RMS (Root Mean Square) of audio data
    static calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }

    // Calculate peak value in audio data
    static calculatePeak(audioData) {
        let peak = 0;
        for (let i = 0; i < audioData.length; i++) {
            const abs = Math.abs(audioData[i]);
            if (abs > peak) peak = abs;
        }
        return peak;
    }

    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Linear interpolation
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Map value from one range to another
    static mapRange(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    // Convert frequency to Q factor for filters
    static frequencyToQ(frequency, bandwidth) {
        return frequency / bandwidth;
    }

    // Calculate filter coefficient for simple one-pole filter
    static calculateFilterCoefficient(cutoffFreq, sampleRate) {
        const omega = 2 * Math.PI * cutoffFreq / sampleRate;
        return 1 - Math.exp(-omega);
    }

    // Smooth parameter changes (exponential smoothing)
    static smoothParameter(current, target, smoothing = 0.95) {
        return current * smoothing + target * (1 - smoothing);
    }

    // Convert MIDI note to frequency
    static midiToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    // Convert frequency to MIDI note
    static frequencyToMidi(frequency) {
        return 69 + 12 * Math.log2(frequency / 440);
    }
}
