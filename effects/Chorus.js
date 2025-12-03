// ========== CHORUS ==========
// Boss CE-2 style chorus with warm, lush modulation

import { AudioMath } from '../utils/AudioMath.js';

export class Chorus {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Create multiple voices for richer chorus
        this.voices = [];
        this.numVoices = 2;

        for (let i = 0; i < this.numVoices; i++) {
            const voice = {
                delay: audioContext.createDelay(0.1),
                lfo: audioContext.createOscillator(),
                lfoGain: audioContext.createGain(),
                gain: audioContext.createGain()
            };

            // Connect LFO to modulate delay time
            voice.lfo.connect(voice.lfoGain);
            voice.lfoGain.connect(voice.delay.delayTime);

            // Connect delay to output
            voice.delay.connect(voice.gain);
            voice.gain.connect(this.wetGain);

            // Start LFO
            voice.lfo.start();

            this.voices.push(voice);
        }

        // Parameters
        this.rate = 0.8; // Hz
        this.depth = 0.5; // 0-1
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Connect
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        for (const voice of this.voices) {
            this.input.connect(voice.delay);
        }

        this.wetGain.connect(this.output);

        // Initialize
        this.updateChorus();
    }

    // Set rate (LFO frequency) in Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.1, 10);
        this.updateChorus();
    }

    // Set depth (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateChorus();
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
            1.0, // Keep dry at 100%, wet is added
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set number of voices (1-4)
    setVoices(num) {
        // This would require recreating the voice array
        // For simplicity, we'll just adjust the gain of existing voices
        const activeVoices = Math.min(num, this.voices.length);
        for (let i = 0; i < this.voices.length; i++) {
            if (i < activeVoices) {
                this.voices[i].gain.gain.value = 1.0 / activeVoices;
            } else {
                this.voices[i].gain.gain.value = 0;
            }
        }
    }

    // Update chorus parameters
    updateChorus() {
        const baseDelay = 0.020; // 20ms base delay
        const maxModulation = 0.005; // 5ms modulation depth

        this.voices.forEach((voice, index) => {
            // Set LFO frequency with slight detuning between voices
            const detune = 1 + (index * 0.1);
            voice.lfo.frequency.setTargetAtTime(
                this.rate * detune,
                this.audioContext.currentTime,
                0.01
            );

            // Set LFO depth (amount of delay time modulation)
            voice.lfoGain.gain.setTargetAtTime(
                maxModulation * this.depth,
                this.audioContext.currentTime,
                0.01
            );

            // Set base delay time (slightly different for each voice)
            const voiceDelay = baseDelay + (index * 0.002);
            voice.delay.delayTime.setTargetAtTime(
                voiceDelay,
                this.audioContext.currentTime,
                0.01
            );

            // Set voice gain
            voice.gain.gain.value = 1.0 / this.numVoices;
        });
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

    // Preset: Subtle (gentle movement)
    presetSubtle() {
        this.setRate(0.5);
        this.setDepth(0.3);
        this.setMix(0.3);
    }

    // Preset: Classic (CE-2 style)
    presetClassic() {
        this.setRate(0.8);
        this.setDepth(0.5);
        this.setMix(0.5);
    }

    // Preset: Lush (thick, wide)
    presetLush() {
        this.setRate(1.2);
        this.setDepth(0.7);
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
        this.voices.forEach(voice => {
            voice.lfo.stop();
        });
        this.disconnect();
    }
}
