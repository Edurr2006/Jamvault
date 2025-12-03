// ========== NOISE GATE ==========
// Professional noise gate for eliminating unwanted noise

import { AudioMath } from '../utils/AudioMath.js';

export class NoiseGate {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;

        // Parameters
        this.threshold = -40; // dB
        this.attack = 0.001; // seconds
        this.release = 0.1; // seconds
        this.hold = 0.05; // seconds
        this.enabled = false;

        // State
        this.isOpen = false;
        this.holdTimer = 0;
        this.updateInterval = null;

        // Connect
        this.input.connect(this.analyser);
        this.input.connect(this.output);

        // Start processing
        this.startProcessing();
    }

    startProcessing() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const process = () => {
            if (!this.enabled) {
                this.output.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.001);
                this.updateInterval = requestAnimationFrame(process);
                return;
            }

            this.analyser.getByteFrequencyData(dataArray);

            // Calculate RMS level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const rms = average / 255; // Normalize to 0-1
            const rmsDb = AudioMath.gainToDb(rms);

            const now = this.audioContext.currentTime;

            // Gate logic
            if (rmsDb > this.threshold) {
                // Signal above threshold - open gate
                if (!this.isOpen) {
                    this.output.gain.setTargetAtTime(1.0, now, this.attack);
                    this.isOpen = true;
                }
                this.holdTimer = now + this.hold;
            } else {
                // Signal below threshold
                if (this.isOpen && now > this.holdTimer) {
                    // Close gate after hold time
                    this.output.gain.setTargetAtTime(0.0, now, this.release);
                    this.isOpen = false;
                }
            }

            this.updateInterval = requestAnimationFrame(process);
        };

        process();
    }

    // Set threshold in dB
    setThreshold(dB) {
        this.threshold = AudioMath.clamp(dB, -60, 0);
    }

    // Set attack time in seconds
    setAttack(seconds) {
        this.attack = AudioMath.clamp(seconds, 0.0001, 0.05);
    }

    // Set release time in seconds
    setRelease(seconds) {
        this.release = AudioMath.clamp(seconds, 0.01, 1.0);
    }

    // Set hold time in seconds
    setHold(seconds) {
        this.hold = AudioMath.clamp(seconds, 0, 0.5);
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.isOpen = false;
            this.output.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.001);
        }
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
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }
        this.disconnect();
    }
}
