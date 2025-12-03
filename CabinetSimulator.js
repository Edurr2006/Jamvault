// ========== CABINET SIMULATOR ==========
// Cabinet and microphone simulation using impulse responses

import { AudioMath } from './utils/AudioMath.js';

export class CabinetSimulator {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.convolver = audioContext.createConvolver();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Parameters
        this.cabinetType = '4x12'; // 1x12, 2x12, 4x12
        this.micType = 'SM57'; // SM57, MD421, R121
        this.micPosition = 'on-axis'; // on-axis, off-axis, distance
        this.mix = 1.0; // 0-1 (usually 100% wet for cabinet sim)
        this.enabled = false;
        this.currentIR = null;

        // Connect: Input -> Convolver -> Wet -> Output
        //         Input -> Dry -> Output
        this.input.connect(this.convolver);
        this.convolver.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Initialize with synthetic IR
        this.loadSyntheticCabinet();
        this.updateMix();
    }

    // Load cabinet IR from URL
    async loadIR(url, name = null) {
        try {
            const ir = await this.irLoader.loadIR(url, name);
            this.convolver.buffer = ir;
            this.currentIR = name || url;
            console.log('Cabinet IR loaded:', this.currentIR);
        } catch (error) {
            console.error('Error loading cabinet IR:', error);
            this.loadSyntheticCabinet();
        }
    }

    // Load cabinet IR from file
    async loadIRFromFile(file) {
        try {
            const ir = await this.irLoader.loadIRFromFile(file);
            this.convolver.buffer = ir;
            this.currentIR = file.name;
            console.log('Cabinet IR loaded from file:', this.currentIR);
        } catch (error) {
            console.error('Error loading cabinet IR from file:', error);
        }
    }

    // Load synthetic cabinet IR (fallback/testing)
    loadSyntheticCabinet() {
        // Generate a simple cabinet-like IR
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(0.05 * sampleRate); // 50ms
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);

            // Create cabinet-like response
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;

                // Initial impulse with high-frequency roll-off
                const impulse = Math.exp(-t * 100) * (Math.random() * 2 - 1);

                // Low-pass character (speaker cone)
                const lowpass = Math.exp(-t * 50) * Math.sin(2 * Math.PI * 200 * t);

                // Resonance (cabinet resonance)
                const resonance = Math.exp(-t * 30) * Math.sin(2 * Math.PI * 120 * t) * 0.3;

                data[i] = (impulse + lowpass + resonance) * 0.5;
            }
        }

        this.convolver.buffer = buffer;
        this.currentIR = 'synthetic_cabinet';
        console.log('Synthetic cabinet IR loaded');
    }

    // Set cabinet type
    setCabinetType(type) {
        this.cabinetType = type;
        // In a real implementation, this would load different IRs
        // For now, we just log the change
        console.log('Cabinet type set to:', type);
    }

    // Set microphone type
    setMicType(type) {
        this.micType = type;
        console.log('Mic type set to:', type);
    }

    // Set microphone position
    setMicPosition(position) {
        this.micPosition = position;
        console.log('Mic position set to:', position);
    }

    // Set wet/dry mix (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.updateMix();
    }

    // Update wet/dry mix
    updateMix() {
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1 - this.mix, // Inverse for cabinet (usually 100% wet)
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Full dry when disabled
            this.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.dryGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
        } else {
            this.updateMix();
        }
    }

    // Preset: 1x12 Combo (small, focused)
    preset1x12() {
        this.setCabinetType('1x12');
        this.setMicType('SM57');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: 2x12 (balanced)
    preset2x12() {
        this.setCabinetType('2x12');
        this.setMicType('MD421');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: 4x12 Stack (full, powerful)
    preset4x12() {
        this.setCabinetType('4x12');
        this.setMicType('SM57');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: Room (distant mic)
    presetRoom() {
        this.setCabinetType('4x12');
        this.setMicType('R121');
        this.setMicPosition('distance');
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
