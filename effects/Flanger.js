// ========== FLANGER ==========
// MXR-style flanger with jet-plane swoosh

import { AudioMath } from '../utils/AudioMath.js';

export class Flanger {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.delay = audioContext.createDelay(0.1);
        this.feedback = audioContext.createGain();
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Parameters
        this.rate = 0.5; // Hz
        this.depth = 0.5; // 0-1
        this.feedbackAmount = 0.5; // 0-1
        this.manual = 0.5; // 0-1 (delay time offset)
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Connect: Input -> Delay -> Feedback -> Delay (feedback loop)
        //                -> Wet -> Output
        //         Input -> Dry -> Output
        this.input.connect(this.delay);
        this.delay.connect(this.feedback);
        this.feedback.connect(this.delay); // Feedback loop
        this.delay.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // LFO modulates delay time
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.delay.delayTime);
        this.lfo.start();

        // Initialize
        this.updateFlanger();
    }

    // Set rate (LFO frequency) in Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.05, 10);
        this.lfo.frequency.setTargetAtTime(
            this.rate,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set depth (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateFlanger();
    }

    // Set feedback amount (0-1)
    setFeedback(value) {
        this.feedbackAmount = AudioMath.clamp(value, 0, 0.95);
        // Negative feedback for more metallic sound
        this.feedback.gain.setTargetAtTime(
            this.feedbackAmount * 0.7, // Scale down to prevent runaway
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set manual delay offset (0-1)
    setManual(value) {
        this.manual = AudioMath.clamp(value, 0, 1);
        this.updateFlanger();
    }

    // Set wet/dry mix (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1.0,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Update flanger parameters
    updateFlanger() {
        // Flanger uses very short delays (0.5ms to 10ms)
        const minDelay = 0.0005; // 0.5ms
        const maxDelay = 0.010; // 10ms

        // Base delay time controlled by manual
        const baseDelay = AudioMath.mapRange(this.manual, 0, 1, minDelay, maxDelay);

        // LFO modulation depth
        const modDepth = (maxDelay - minDelay) * this.depth * 0.5;

        this.delay.delayTime.setTargetAtTime(
            baseDelay,
            this.audioContext.currentTime,
            0.01
        );

        this.lfoGain.gain.setTargetAtTime(
            modDepth,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.setMix(this.mix);
        }
    }

    // Preset: Subtle (gentle sweep)
    presetSubtle() {
        this.setRate(0.3);
        this.setDepth(0.3);
        this.setFeedback(0.3);
        this.setManual(0.5);
        this.setMix(0.4);
    }

    // Preset: Jet (classic jet-plane sound)
    presetJet() {
        this.setRate(0.5);
        this.setDepth(0.7);
        this.setFeedback(0.7);
        this.setManual(0.5);
        this.setMix(0.5);
    }

    // Preset: Extreme (intense swoosh)
    presetExtreme() {
        this.setRate(1.0);
        this.setDepth(0.9);
        this.setFeedback(0.85);
        this.setManual(0.6);
        this.setMix(0.6);
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
