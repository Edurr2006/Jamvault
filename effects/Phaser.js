// ========== PHASER ==========
// Phase 90 style phaser with sweeping notches

import { AudioMath } from '../utils/AudioMath.js';

export class Phaser {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.feedback = audioContext.createGain();

        // Create allpass filters (creates the phase shift)
        this.stages = 4; // Number of allpass stages
        this.filters = [];

        for (let i = 0; i < this.stages; i++) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'allpass';
            filter.Q.value = 1;
            this.filters.push(filter);
        }

        // LFO for sweeping
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();

        // Parameters
        this.rate = 0.5; // Hz
        this.depth = 0.5; // 0-1
        this.feedbackAmount = 0.5; // 0-1
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Connect filters in series
        this.input.connect(this.filters[0]);
        for (let i = 0; i < this.stages - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }

        // Last filter connects to feedback and output
        this.filters[this.stages - 1].connect(this.feedback);
        this.feedback.connect(this.filters[0]); // Feedback loop
        this.filters[this.stages - 1].connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Dry signal
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // LFO setup (we'll manually update filter frequencies)
        this.lfo.frequency.value = this.rate;
        this.lfo.start();

        // Start LFO processing
        this.startLFO();

        // Initialize
        this.updatePhaser();
    }

    // Manually process LFO to update filter frequencies
    startLFO() {
        const updateFilters = () => {
            if (!this.enabled) {
                this.lfoUpdateInterval = requestAnimationFrame(updateFilters);
                return;
            }

            const now = this.audioContext.currentTime;
            const lfoValue = Math.sin(2 * Math.PI * this.rate * now);

            // Map LFO to frequency range (200Hz to 2000Hz)
            const minFreq = 200;
            const maxFreq = 2000;
            const freqRange = maxFreq - minFreq;
            const centerFreq = minFreq + (freqRange * 0.5);
            const modAmount = (freqRange * 0.5) * this.depth;

            // Update each filter with slightly different frequencies for richer sound
            this.filters.forEach((filter, index) => {
                const offset = index * 0.1; // Slight detuning
                const freq = centerFreq + (lfoValue * modAmount) + (offset * 100);
                filter.frequency.setTargetAtTime(
                    freq,
                    now,
                    0.01
                );
            });

            this.lfoUpdateInterval = requestAnimationFrame(updateFilters);
        };

        updateFilters();
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
    }

    // Set feedback amount (0-1)
    setFeedback(value) {
        this.feedbackAmount = AudioMath.clamp(value, 0, 0.95);
        this.feedback.gain.setTargetAtTime(
            this.feedbackAmount * 0.5, // Scale down
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set number of stages (2, 4, 6, or 8)
    setStages(num) {
        // This would require recreating the filter array
        // For now, we'll just note it as a future enhancement
        console.log('Stage switching not yet implemented');
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

    // Update phaser parameters
    updatePhaser() {
        this.setFeedback(this.feedbackAmount);
        this.setMix(this.mix);
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
        this.setMix(0.4);
    }

    // Preset: Classic (Phase 90 style)
    presetClassic() {
        this.setRate(0.5);
        this.setDepth(0.6);
        this.setFeedback(0.5);
        this.setMix(0.5);
    }

    // Preset: Intense (deep sweep)
    presetIntense() {
        this.setRate(1.0);
        this.setDepth(0.8);
        this.setFeedback(0.7);
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
        if (this.lfoUpdateInterval) {
            cancelAnimationFrame(this.lfoUpdateInterval);
        }
        this.lfo.stop();
        this.disconnect();
    }
}
