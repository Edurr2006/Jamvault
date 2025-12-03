// ========== TREMOLO ==========
// Amplitude modulation effect

import { AudioMath } from '../utils/AudioMath.js';

export class Tremolo {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.modulationGain = audioContext.createGain();
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();

        // Parameters
        this.rate = 4; // Hz
        this.depth = 0.5; // 0-1
        this.waveform = 'sine'; // sine, triangle, square
        this.enabled = false;

        // Connect: Input -> ModulationGain -> Output
        // LFO -> LFOGain -> ModulationGain.gain
        this.input.connect(this.modulationGain);
        this.modulationGain.connect(this.output);

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.modulationGain.gain);

        // Start LFO
        this.lfo.start();

        // Initialize
        this.updateTremolo();
    }

    // Set rate (LFO frequency) in Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.1, 20);
        this.lfo.frequency.setTargetAtTime(
            this.rate,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set depth (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateTremolo();
    }

    // Set waveform
    setWaveform(waveform) {
        this.waveform = waveform;
        this.lfo.type = waveform;
    }

    // Update tremolo parameters
    updateTremolo() {
        // LFO oscillates between -1 and 1
        // We want gain to oscillate between (1 - depth) and 1
        // So we offset the LFO and scale it

        // Set DC offset (center point of modulation)
        const offset = 1 - (this.depth * 0.5);
        this.modulationGain.gain.value = offset;

        // Set modulation amount
        const modAmount = this.depth * 0.5;
        this.lfoGain.gain.setTargetAtTime(
            modAmount,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Reset to unity gain
            this.modulationGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.01);
            this.lfoGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateTremolo();
        }
    }

    // Preset: Slow (gentle pulsing)
    presetSlow() {
        this.setRate(2);
        this.setDepth(0.4);
        this.setWaveform('sine');
    }

    // Preset: Medium (classic tremolo)
    presetMedium() {
        this.setRate(4);
        this.setDepth(0.6);
        this.setWaveform('sine');
    }

    // Preset: Fast (helicopter)
    presetFast() {
        this.setRate(8);
        this.setDepth(0.8);
        this.setWaveform('sine');
    }

    // Preset: Square (choppy)
    presetSquare() {
        this.setRate(4);
        this.setDepth(0.7);
        this.setWaveform('square');
    }

    // Connect to next node
    connect(destination) {
        this.output.connect(destination);
    }

    // Disconnect
    disconnect() {
        this.output.disconnect();
    }

    // Cleanup
    destroy() {
        this.lfo.stop();
        this.disconnect();
    }
}
