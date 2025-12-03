// ========== AUDIO ENGINE ==========
// Core audio engine for professional DAW

import { AudioMath } from './utils/AudioMath.js';
import { IRLoader } from './utils/IRLoader.js';

export class AudioEngine {
    constructor(sampleRate = 48000) {
        this.audioContext = null;
        this.sampleRate = sampleRate;
        this.masterGain = null;
        this.masterCompressor = null;
        this.masterAnalyser = null;
        this.irLoader = null;
        this.isInitialized = false;
    }

    // Initialize audio context and master chain
    async init() {
        if (this.isInitialized) {
            console.warn('AudioEngine already initialized');
            return;
        }

        try {
            // Create AudioContext with specified sample rate
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
                latencyHint: 'interactive' // Optimize for low latency
            });

            console.log('AudioContext created:', {
                sampleRate: this.audioContext.sampleRate,
                baseLatency: this.audioContext.baseLatency,
                outputLatency: this.audioContext.outputLatency,
                state: this.audioContext.state
            });

            // Create master chain: Compressor -> Gain -> Analyser -> Destination
            this.masterCompressor = this.audioContext.createDynamicsCompressor();
            this.masterCompressor.threshold.value = -10;
            this.masterCompressor.knee.value = 10;
            this.masterCompressor.ratio.value = 4;
            this.masterCompressor.attack.value = 0.003;
            this.masterCompressor.release.value = 0.25;

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.8;

            this.masterAnalyser = this.audioContext.createAnalyser();
            this.masterAnalyser.fftSize = 2048;
            this.masterAnalyser.smoothingTimeConstant = 0.8;

            // Connect master chain
            this.masterCompressor.connect(this.masterGain);
            this.masterGain.connect(this.masterAnalyser);
            this.masterAnalyser.connect(this.audioContext.destination);

            // Initialize IR loader
            this.irLoader = new IRLoader(this.audioContext);

            this.isInitialized = true;
            console.log('AudioEngine initialized successfully');

        } catch (error) {
            console.error('Error initializing AudioEngine:', error);
            throw error;
        }
    }

    // Resume audio context (needed for autoplay policies)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioContext resumed');
        }
    }

    // Get current time
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    }

    // Create gain node
    createGain(initialValue = 1.0) {
        const gain = this.audioContext.createGain();
        gain.gain.value = initialValue;
        return gain;
    }

    // Create stereo panner
    createPanner(initialPan = 0) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = initialPan;
        return panner;
    }

    // Create analyser for VU meters
    createAnalyser(fftSize = 256) {
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0.8;
        return analyser;
    }

    // Create biquad filter
    createFilter(type = 'lowpass', frequency = 1000, q = 1) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        return filter;
    }

    // Create waveshaper for distortion
    createWaveShaper(curve = null) {
        const shaper = this.audioContext.createWaveShaper();
        if (curve) {
            shaper.curve = curve;
        }
        shaper.oversample = '4x'; // Reduce aliasing
        return shaper;
    }

    // Create convolver for IR-based effects
    createConvolver(impulseResponse = null) {
        const convolver = this.audioContext.createConvolver();
        if (impulseResponse) {
            convolver.buffer = impulseResponse;
        }
        return convolver;
    }

    // Create delay node
    createDelay(maxDelayTime = 5.0) {
        return this.audioContext.createDelay(maxDelayTime);
    }

    // Create compressor
    createCompressor(threshold = -24, knee = 30, ratio = 12, attack = 0.003, release = 0.25) {
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = threshold;
        compressor.knee.value = knee;
        compressor.ratio.value = ratio;
        compressor.attack.value = attack;
        compressor.release.value = release;
        return compressor;
    }

    // Create buffer source
    createBufferSource(buffer = null) {
        const source = this.audioContext.createBufferSource();
        if (buffer) {
            source.buffer = buffer;
        }
        return source;
    }

    // Create oscillator (for metronome, LFOs, etc.)
    createOscillator(type = 'sine', frequency = 440) {
        const osc = this.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        return osc;
    }

    // Create media stream source (for microphone input)
    createMediaStreamSource(stream) {
        return this.audioContext.createMediaStreamSource(stream);
    }

    // Create offline context for rendering/export
    createOfflineContext(duration, numberOfChannels = 2) {
        const length = Math.ceil(duration * this.sampleRate);
        return new OfflineAudioContext(numberOfChannels, length, this.sampleRate);
    }

    // Decode audio data
    async decodeAudioData(arrayBuffer) {
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    // Set master volume
    setMasterVolume(value) {
        if (this.masterGain) {
            // Smooth parameter change to avoid clicks
            this.masterGain.gain.setTargetAtTime(
                value,
                this.audioContext.currentTime,
                0.01
            );
        }
    }

    // Get master volume
    getMasterVolume() {
        return this.masterGain ? this.masterGain.gain.value : 0;
    }

    // Enable/disable master limiter
    setMasterLimiter(enabled) {
        if (this.masterCompressor) {
            if (enabled) {
                this.masterCompressor.threshold.value = -1;
                this.masterCompressor.ratio.value = 20;
            } else {
                this.masterCompressor.threshold.value = -10;
                this.masterCompressor.ratio.value = 4;
            }
        }
    }

    // Get master analyser data for VU meter
    getMasterLevel() {
        if (!this.masterAnalyser) return { rms: 0, peak: 0 };

        const bufferLength = this.masterAnalyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.masterAnalyser.getFloatTimeDomainData(dataArray);

        const rms = AudioMath.calculateRMS(dataArray);
        const peak = AudioMath.calculatePeak(dataArray);

        return {
            rms: rms,
            peak: peak,
            rmsDb: AudioMath.gainToDb(rms),
            peakDb: AudioMath.gainToDb(peak)
        };
    }

    // Get destination node (for connecting tracks)
    getDestination() {
        return this.masterCompressor;
    }

    // Close audio context
    close() {
        if (this.audioContext) {
            this.audioContext.close();
            this.isInitialized = false;
            console.log('AudioEngine closed');
        }
    }
}
