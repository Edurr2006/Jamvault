// ========== AMP SIMULATOR ==========
// Virtual guitar amplifier with preamp, tone stack, and cabinet simulation

import { AudioMath } from './utils/AudioMath.js';
import { WaveshapeGenerator } from './utils/WaveshapeGenerator.js';

export class AmpSimulator {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Preamp stage
        this.preampGain = audioContext.createGain();
        this.preampShaper = audioContext.createWaveShaper();
        this.preampShaper.oversample = '4x';

        // Tone stack (Baxandall-style EQ)
        this.bassFilter = audioContext.createBiquadFilter();
        this.midFilter = audioContext.createBiquadFilter();
        this.trebleFilter = audioContext.createBiquadFilter();
        this.presenceFilter = audioContext.createBiquadFilter();

        // Configure tone stack
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 100;

        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 800;
        this.midFilter.Q.value = 1.5;

        this.trebleFilter.type = 'highshelf';
        this.trebleFilter.frequency.value = 3000;

        this.presenceFilter.type = 'peaking';
        this.presenceFilter.frequency.value = 4500;
        this.presenceFilter.Q.value = 2;

        // Output stage
        this.masterGain = audioContext.createGain();

        // Parameters
        this.model = 'clean'; // clean, crunch, high-gain
        this.gain = 5; // 0-10
        this.bass = 5; // 0-10
        this.mid = 5; // 0-10
        this.treble = 5; // 0-10
        this.presence = 5; // 0-10
        this.master = 0.8; // 0-1
        this.enabled = false;

        // Connect: Input -> PreampGain -> Shaper -> Tone Stack -> Master -> Output
        this.input.connect(this.preampGain);
        this.preampGain.connect(this.preampShaper);
        this.preampShaper.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.presenceFilter);
        this.presenceFilter.connect(this.masterGain);
        this.masterGain.connect(this.output);

        // Initialize
        this.updatePreamp();
        this.updateToneStack();
    }

    // Set amp model
    setModel(model) {
        this.model = model;
        this.updatePreamp();
    }

    // Set gain (0-10)
    setGain(value) {
        this.gain = AudioMath.clamp(value, 0, 10);
        this.updatePreamp();
    }

    // Set bass (0-10)
    setBass(value) {
        this.bass = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Set mid (0-10)
    setMid(value) {
        this.mid = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Set treble (0-10)
    setTreble(value) {
        this.treble = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Set presence (0-10)
    setPresence(value) {
        this.presence = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Set master volume (0-1)
    setMaster(value) {
        this.master = AudioMath.clamp(value, 0, 1);
        this.masterGain.gain.setTargetAtTime(
            this.master,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Update preamp based on model and gain
    updatePreamp() {
        const gainNormalized = this.gain / 10; // 0-1

        switch (this.model) {
            case 'clean':
                // Fender Twin Reverb style - subtle warmth, transparent
                this.preampGain.gain.value = 1 + gainNormalized * 2;
                this.preampShaper.curve = WaveshapeGenerator.tubeSaturation(0.5 + gainNormalized * 1.5);
                break;

            case 'crunch':
                // Marshall JCM800 style - mid-range focused, classic rock
                this.preampGain.gain.value = 1 + gainNormalized * 4;
                this.preampShaper.curve = WaveshapeGenerator.asymmetricClip(1 + gainNormalized * 3);
                break;

            case 'high-gain':
                // Mesa Boogie Dual Rectifier style - aggressive, modern metal
                this.preampGain.gain.value = 1 + gainNormalized * 6;
                this.preampShaper.curve = WaveshapeGenerator.exponentialClip(2 + gainNormalized * 4);
                break;

            default:
                this.preampGain.gain.value = 1 + gainNormalized * 2;
                this.preampShaper.curve = WaveshapeGenerator.tubeSaturation(0.5 + gainNormalized * 1.5);
        }
    }

    // Update tone stack
    updateToneStack() {
        // Bass (0-10 maps to -12dB to +12dB)
        const bassGain = AudioMath.mapRange(this.bass, 0, 10, -12, 12);
        this.bassFilter.gain.setTargetAtTime(
            bassGain,
            this.audioContext.currentTime,
            0.01
        );

        // Mid (0-10 maps to -12dB to +12dB)
        const midGain = AudioMath.mapRange(this.mid, 0, 10, -12, 12);
        this.midFilter.gain.setTargetAtTime(
            midGain,
            this.audioContext.currentTime,
            0.01
        );

        // Treble (0-10 maps to -12dB to +12dB)
        const trebleGain = AudioMath.mapRange(this.treble, 0, 10, -12, 12);
        this.trebleFilter.gain.setTargetAtTime(
            trebleGain,
            this.audioContext.currentTime,
            0.01
        );

        // Presence (0-10 maps to -6dB to +12dB, more boost than cut)
        const presenceGain = AudioMath.mapRange(this.presence, 0, 10, -6, 12);
        this.presenceFilter.gain.setTargetAtTime(
            presenceGain,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Bypass by setting preamp to unity gain and linear curve
            this.preampGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.01);
            this.preampShaper.curve = null;
        } else {
            this.updatePreamp();
        }
    }

    // Preset: Clean (Fender Twin)
    presetClean() {
        this.setModel('clean');
        this.setGain(3);
        this.setBass(6);
        this.setMid(5);
        this.setTreble(6);
        this.setPresence(5);
        this.setMaster(0.8);
    }

    // Preset: Blues (warm overdrive)
    presetBlues() {
        this.setModel('crunch');
        this.setGain(5);
        this.setBass(6);
        this.setMid(6);
        this.setTreble(5);
        this.setPresence(4);
        this.setMaster(0.75);
    }

    // Preset: Rock (Marshall crunch)
    presetRock() {
        this.setModel('crunch');
        this.setGain(7);
        this.setBass(5);
        this.setMid(7);
        this.setTreble(6);
        this.setPresence(6);
        this.setMaster(0.8);
    }

    // Preset: Metal (high-gain)
    presetMetal() {
        this.setModel('high-gain');
        this.setGain(8);
        this.setBass(6);
        this.setMid(4);
        this.setTreble(7);
        this.setPresence(7);
        this.setMaster(0.7);
    }

    // Preset: Lead (singing sustain)
    presetLead() {
        this.setModel('high-gain');
        this.setGain(7);
        this.setBass(5);
        this.setMid(8);
        this.setTreble(6);
        this.setPresence(8);
        this.setMaster(0.75);
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
