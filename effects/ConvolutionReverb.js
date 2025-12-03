// ========== CONVOLUTION REVERB ==========
// High-quality convolution reverb using impulse responses

import { AudioMath } from '../utils/AudioMath.js';

export class ConvolutionReverb {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.convolver = audioContext.createConvolver();
        this.preDelay = audioContext.createDelay(0.5);
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.lowpass = audioContext.createBiquadFilter();
        this.highpass = audioContext.createBiquadFilter();

        // Configure filters
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 8000;
        this.highpass.type = 'highpass';
        this.highpass.frequency.value = 200;

        // Parameters
        this.mix = 0.3; // 0-1
        this.preDelayTime = 0.02; // seconds
        this.tone = 0.5; // 0-1
        this.enabled = false;
        this.currentIR = null;

        // Connect: Input -> PreDelay -> Convolver -> Filters -> Wet -> Output
        //         Input -> Dry -> Output
        this.input.connect(this.preDelay);
        this.preDelay.connect(this.convolver);
        this.convolver.connect(this.highpass);
        this.highpass.connect(this.lowpass);
        this.lowpass.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Initialize with synthetic IR
        this.loadSyntheticIR('room');
        this.updateMix();
    }

    // Load IR from URL
    async loadIR(url, name = null) {
        try {
            const ir = await this.irLoader.loadIR(url, name);
            this.convolver.buffer = ir;
            this.currentIR = name || url;
            console.log('Reverb IR loaded:', this.currentIR);
        } catch (error) {
            console.error('Error loading reverb IR:', error);
            // Fallback to synthetic IR
            this.loadSyntheticIR('room');
        }
    }

    // Load IR from file
    async loadIRFromFile(file) {
        try {
            const ir = await this.irLoader.loadIRFromFile(file);
            this.convolver.buffer = ir;
            this.currentIR = file.name;
            console.log('Reverb IR loaded from file:', this.currentIR);
        } catch (error) {
            console.error('Error loading reverb IR from file:', error);
        }
    }

    // Load synthetic IR
    loadSyntheticIR(type = 'room') {
        const ir = this.irLoader.generateSyntheticIR(type, 2.0);
        this.convolver.buffer = ir;
        this.currentIR = `synthetic_${type}`;
        console.log('Synthetic reverb IR loaded:', this.currentIR);
    }

    // Set pre-delay time in seconds
    setPreDelay(seconds) {
        this.preDelayTime = AudioMath.clamp(seconds, 0, 0.2);
        this.preDelay.delayTime.setTargetAtTime(
            this.preDelayTime,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set tone (controls high/low pass filters)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);

        // Map tone to filter frequencies
        // Low tone = darker (lower lowpass, higher highpass)
        // High tone = brighter (higher lowpass, lower highpass)
        const lowpassFreq = AudioMath.mapRange(this.tone, 0, 1, 2000, 12000);
        const highpassFreq = AudioMath.mapRange(this.tone, 0, 1, 400, 100);

        this.lowpass.frequency.setTargetAtTime(
            lowpassFreq,
            this.audioContext.currentTime,
            0.01
        );

        this.highpass.frequency.setTargetAtTime(
            highpassFreq,
            this.audioContext.currentTime,
            0.01
        );
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
            1.0, // Dry always at 100%, wet is added
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
            this.updateMix();
        }
    }

    // Preset: Room (small, natural)
    presetRoom() {
        this.loadSyntheticIR('room');
        this.setPreDelay(0.01);
        this.setTone(0.6);
        this.setMix(0.25);
    }

    // Preset: Hall (large, spacious)
    presetHall() {
        this.loadSyntheticIR('hall');
        this.setPreDelay(0.03);
        this.setTone(0.5);
        this.setMix(0.35);
    }

    // Preset: Plate (vintage, bright)
    presetPlate() {
        this.loadSyntheticIR('plate');
        this.setPreDelay(0.02);
        this.setTone(0.7);
        this.setMix(0.3);
    }

    // Preset: Spring (guitar amp style)
    presetSpring() {
        this.loadSyntheticIR('spring');
        this.setPreDelay(0.005);
        this.setTone(0.4);
        this.setMix(0.4);
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
