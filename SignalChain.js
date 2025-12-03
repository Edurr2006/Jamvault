// ========== SIGNAL CHAIN ==========
// Professional signal chain: Input → Noise Gate → Compressor → Amp → Effects → EQ → Output

import { NoiseGate } from './effects/NoiseGate.js';
import { Compressor } from './effects/Compressor.js';
import { AnalogDistortion } from './effects/AnalogDistortion.js';
import { BPMDelay } from './effects/BPMDelay.js';
import { ConvolutionReverb } from './effects/ConvolutionReverb.js';
import { Chorus } from './effects/Chorus.js';
import { Flanger } from './effects/Flanger.js';
import { Phaser } from './effects/Phaser.js';
import { Tremolo } from './effects/Tremolo.js';
import { ParametricEQ } from './effects/ParametricEQ.js';
import { AmpSimulator } from './AmpSimulator.js';
import { CabinetSimulator } from './CabinetSimulator.js';

export class SignalChain {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Create input and output nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Create all effects in order
        this.noiseGate = new NoiseGate(audioContext);
        this.compressor = new Compressor(audioContext);
        this.ampSimulator = new AmpSimulator(audioContext);
        this.cabinetSimulator = new CabinetSimulator(audioContext, irLoader);

        // Post-amp effects
        this.distortion = new AnalogDistortion(audioContext);
        this.chorus = new Chorus(audioContext);
        this.flanger = new Flanger(audioContext);
        this.phaser = new Phaser(audioContext);
        this.tremolo = new Tremolo(audioContext);
        this.delay = new BPMDelay(audioContext);
        this.reverb = new ConvolutionReverb(audioContext, irLoader);

        // Final EQ
        this.eq = new ParametricEQ(audioContext);

        // Track gain and pan
        this.trackGain = audioContext.createGain();
        this.trackPan = audioContext.createStereoPanner();

        // Default routing (all effects in series)
        this.connectChain();
    }

    // Connect the full signal chain
    connectChain() {
        // Disconnect everything first
        this.disconnectAll();

        // Build the chain: Input → Effects → Track Controls → Output
        let currentNode = this.input;

        // Pre-amp processing
        currentNode.connect(this.noiseGate.input);
        currentNode = this.noiseGate.output;

        currentNode.connect(this.compressor.input);
        currentNode = this.compressor.output;

        // Amp simulation
        currentNode.connect(this.ampSimulator.input);
        currentNode = this.ampSimulator.output;

        currentNode.connect(this.cabinetSimulator.input);
        currentNode = this.cabinetSimulator.output;

        // Post-amp effects (modulation, time-based)
        currentNode.connect(this.distortion.input);
        currentNode = this.distortion.output;

        currentNode.connect(this.chorus.input);
        currentNode = this.chorus.output;

        currentNode.connect(this.flanger.input);
        currentNode = this.flanger.output;

        currentNode.connect(this.phaser.input);
        currentNode = this.phaser.output;

        currentNode.connect(this.tremolo.input);
        currentNode = this.tremolo.output;

        currentNode.connect(this.delay.input);
        currentNode = this.delay.output;

        currentNode.connect(this.reverb.input);
        currentNode = this.reverb.output;

        // Final EQ
        currentNode.connect(this.eq.input);
        currentNode = this.eq.output;

        // Track controls
        currentNode.connect(this.trackGain);
        this.trackGain.connect(this.trackPan);
        this.trackPan.connect(this.output);
    }

    // Disconnect all effects
    disconnectAll() {
        try {
            this.noiseGate.disconnect();
            this.compressor.disconnect();
            this.ampSimulator.disconnect();
            this.cabinetSimulator.disconnect();
            this.distortion.disconnect();
            this.chorus.disconnect();
            this.flanger.disconnect();
            this.phaser.disconnect();
            this.tremolo.disconnect();
            this.delay.disconnect();
            this.reverb.disconnect();
            this.eq.disconnect();
            this.trackGain.disconnect();
            this.trackPan.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
    }

    // Set track volume (0-1)
    setVolume(value) {
        this.trackGain.gain.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set track pan (-1 to 1)
    setPan(value) {
        this.trackPan.pan.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Get effect by name
    getEffect(name) {
        const effects = {
            'noiseGate': this.noiseGate,
            'compressor': this.compressor,
            'amp': this.ampSimulator,
            'cabinet': this.cabinetSimulator,
            'distortion': this.distortion,
            'chorus': this.chorus,
            'flanger': this.flanger,
            'phaser': this.phaser,
            'tremolo': this.tremolo,
            'delay': this.delay,
            'reverb': this.reverb,
            'eq': this.eq
        };
        return effects[name];
    }

    // Connect to destination (master bus)
    connect(destination) {
        this.output.connect(destination);
    }

    // Disconnect from destination
    disconnect() {
        this.output.disconnect();
    }

    // Cleanup
    destroy() {
        this.disconnectAll();
        this.disconnect();

        // Destroy all effects
        this.noiseGate.destroy();
        this.compressor.destroy();
        this.ampSimulator.destroy();
        this.cabinetSimulator.destroy();
        this.distortion.destroy();
        this.chorus.destroy();
        this.flanger.destroy();
        this.phaser.destroy();
        this.tremolo.destroy();
        this.delay.destroy();
        this.reverb.destroy();
        this.eq.destroy();
    }

    // Preset: Clean Guitar
    presetCleanGuitar() {
        this.noiseGate.setEnabled(true);
        this.noiseGate.setThreshold(-45);

        this.compressor.setEnabled(true);
        this.compressor.presetGentle();

        this.ampSimulator.setEnabled(true);
        this.ampSimulator.presetClean();

        this.cabinetSimulator.setEnabled(true);
        this.cabinetSimulator.preset2x12();

        this.distortion.setEnabled(false);
        this.chorus.setEnabled(true);
        this.chorus.presetSubtle();

        this.delay.setEnabled(false);
        this.reverb.setEnabled(true);
        this.reverb.presetRoom();

        this.eq.setEnabled(true);
        this.eq.presetBright();
    }

    // Preset: Rock Guitar
    presetRockGuitar() {
        this.noiseGate.setEnabled(true);
        this.noiseGate.setThreshold(-40);

        this.compressor.setEnabled(true);
        this.compressor.presetMedium();

        this.ampSimulator.setEnabled(true);
        this.ampSimulator.presetRock();

        this.cabinetSimulator.setEnabled(true);
        this.cabinetSimulator.preset4x12();

        this.distortion.setEnabled(false);
        this.delay.setEnabled(true);
        this.delay.presetQuarterNote();

        this.reverb.setEnabled(true);
        this.reverb.presetHall();

        this.eq.setEnabled(true);
        this.eq.presetPresence();
    }

    // Preset: Metal Guitar
    presetMetalGuitar() {
        this.noiseGate.setEnabled(true);
        this.noiseGate.setThreshold(-35);

        this.compressor.setEnabled(true);
        this.compressor.presetHeavy();

        this.ampSimulator.setEnabled(true);
        this.ampSimulator.presetMetal();

        this.cabinetSimulator.setEnabled(true);
        this.cabinetSimulator.preset4x12();

        this.distortion.setEnabled(true);
        this.distortion.presetMetal();

        this.delay.setEnabled(false);
        this.reverb.setEnabled(true);
        this.reverb.presetRoom();

        this.eq.setEnabled(true);
        this.eq.presetScoop();
    }

    // Preset: Lead Guitar
    presetLeadGuitar() {
        this.noiseGate.setEnabled(true);
        this.noiseGate.setThreshold(-38);

        this.compressor.setEnabled(true);
        this.compressor.presetMedium();

        this.ampSimulator.setEnabled(true);
        this.ampSimulator.presetLead();

        this.cabinetSimulator.setEnabled(true);
        this.cabinetSimulator.preset4x12();

        this.delay.setEnabled(true);
        this.delay.presetDottedEighth();

        this.reverb.setEnabled(true);
        this.reverb.presetHall();

        this.eq.setEnabled(true);
        this.eq.presetPresence();
    }
}
