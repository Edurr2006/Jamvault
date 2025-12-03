// ========== ANALOG DISTORTION ==========
// Realistic analog-style distortion with multiple clipping modes

import { AudioMath } from '../utils/AudioMath.js';
import { WaveshapeGenerator } from '../utils/WaveshapeGenerator.js';

export class AnalogDistortion {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.preGain = audioContext.createGain();
        this.waveshaper = audioContext.createWaveShaper();
        this.waveshaper.oversample = '4x'; // Reduce aliasing
        this.toneFilter = audioContext.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 3000;
        this.toneFilter.Q.value = 0.7;
        this.postGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Parameters
        this.drive = 0.5; // 0-1
        this.tone = 0.5; // 0-1
        this.level = 0.8; // 0-1
        this.mix = 1.0; // 0-1 (wet/dry)
        this.mode = 'tube'; // tube, diode, fuzz
        this.enabled = false;

        // Connect: Input -> PreGain -> Waveshaper -> Tone -> PostGain -> WetGain -> Output
        //                  -> DryGain -> Output
        this.input.connect(this.preGain);
        this.preGain.connect(this.waveshaper);
        this.waveshaper.connect(this.toneFilter);
        this.toneFilter.connect(this.postGain);
        this.postGain.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Initialize
        this.updateWaveshaper();
        this.updateMix();
    }

    // Set drive amount (0-1)
    setDrive(value) {
        this.drive = AudioMath.clamp(value, 0, 1);
        this.updateWaveshaper();
    }

    // Set tone (0-1, controls low-pass filter)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);
        // Map 0-1 to 200Hz-8000Hz
        const freq = AudioMath.mapRange(this.tone, 0, 1, 200, 8000);
        this.toneFilter.frequency.setTargetAtTime(
            freq,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set output level (0-1)
    setLevel(value) {
        this.level = AudioMath.clamp(value, 0, 1);
        this.postGain.gain.setTargetAtTime(
            this.level,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set wet/dry mix (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.updateMix();
    }

    // Set distortion mode
    setMode(mode) {
        this.mode = mode;
        this.updateWaveshaper();
    }

    // Update waveshaper curve based on mode and drive
    updateWaveshaper() {
        const amount = 1 + this.drive * 9; // Map 0-1 to 1-10

        switch (this.mode) {
            case 'tube':
                this.waveshaper.curve = WaveshapeGenerator.tubeSaturation(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
                break;
            case 'diode':
                this.waveshaper.curve = WaveshapeGenerator.asymmetricClip(amount);
                this.preGain.gain.value = 1 + this.drive * 3;
                break;
            case 'fuzz':
                this.waveshaper.curve = WaveshapeGenerator.exponentialClip(amount);
                this.preGain.gain.value = 1 + this.drive * 5;
                break;
            case 'soft':
                this.waveshaper.curve = WaveshapeGenerator.softClip(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
                break;
            case 'hard':
                this.waveshaper.curve = WaveshapeGenerator.hardClip(0.3 + this.drive * 0.6);
                this.preGain.gain.value = 1 + this.drive * 4;
                break;
            default:
                this.waveshaper.curve = WaveshapeGenerator.tubeSaturation(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
        }
    }

    // Update wet/dry mix
    updateMix() {
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1 - this.mix,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.setMix(0); // Full dry when disabled
        } else {
            this.setMix(this.mix);
        }
    }

    // Preset: Blues (warm, subtle overdrive)
    presetBlues() {
        this.setMode('tube');
        this.setDrive(0.3);
        this.setTone(0.6);
        this.setLevel(0.8);
        this.setMix(1.0);
    }

    // Preset: Rock (classic crunch)
    presetRock() {
        this.setMode('diode');
        this.setDrive(0.5);
        this.setTone(0.5);
        this.setLevel(0.8);
        this.setMix(1.0);
    }

    // Preset: Metal (heavy saturation)
    presetMetal() {
        this.setMode('fuzz');
        this.setDrive(0.8);
        this.setTone(0.4);
        this.setLevel(0.7);
        this.setMix(1.0);
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
        this.disconnect();
    }
}
