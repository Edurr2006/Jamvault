// ========== COMPRESSOR ==========
// Professional dynamics compressor for guitar

import { AudioMath } from '../utils/AudioMath.js';

export class Compressor {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.compressor = audioContext.createDynamicsCompressor();
        this.makeupGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Default parameters (guitar-friendly)
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.makeupGain.gain.value = 1.0;

        this.enabled = false;

        // Connect: Input -> Compressor -> Makeup Gain -> Output
        this.input.connect(this.compressor);
        this.compressor.connect(this.makeupGain);
        this.makeupGain.connect(this.output);
    }

    // Set threshold in dB
    setThreshold(dB) {
        const value = AudioMath.clamp(dB, -60, 0);
        this.compressor.threshold.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set ratio (1:1 to 20:1)
    setRatio(ratio) {
        const value = AudioMath.clamp(ratio, 1, 20);
        this.compressor.ratio.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set attack time in seconds
    setAttack(seconds) {
        const value = AudioMath.clamp(seconds, 0.0001, 0.1);
        this.compressor.attack.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set release time in seconds
    setRelease(seconds) {
        const value = AudioMath.clamp(seconds, 0.01, 2.0);
        this.compressor.release.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set knee (hard/soft)
    setKnee(dB) {
        const value = AudioMath.clamp(dB, 0, 40);
        this.compressor.knee.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set makeup gain in dB
    setMakeupGain(dB) {
        const gain = AudioMath.dBToGain(AudioMath.clamp(dB, 0, 24));
        this.makeupGain.gain.setTargetAtTime(
            gain,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        // Compressor is always in the chain, but we can bypass it
        // by setting ratio to 1:1
        if (!enabled) {
            this.compressor.ratio.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
        }
    }

    // Get reduction amount (for metering)
    getReduction() {
        return this.compressor.reduction;
    }

    // Preset: Gentle (subtle leveling)
    presetGentle() {
        this.setThreshold(-30);
        this.setRatio(2);
        this.setAttack(0.01);
        this.setRelease(0.3);
        this.setKnee(15);
        this.setMakeupGain(3);
    }

    // Preset: Medium (balanced compression)
    presetMedium() {
        this.setThreshold(-24);
        this.setRatio(4);
        this.setAttack(0.003);
        this.setRelease(0.25);
        this.setKnee(10);
        this.setMakeupGain(6);
    }

    // Preset: Heavy (aggressive squashing)
    presetHeavy() {
        this.setThreshold(-18);
        this.setRatio(8);
        this.setAttack(0.001);
        this.setRelease(0.15);
        this.setKnee(5);
        this.setMakeupGain(12);
    }

    // Preset: Limiter (prevent clipping)
    presetLimiter() {
        this.setThreshold(-3);
        this.setRatio(20);
        this.setAttack(0.0001);
        this.setRelease(0.05);
        this.setKnee(0);
        this.setMakeupGain(0);
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
