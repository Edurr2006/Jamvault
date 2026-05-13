// ========== MOTOR DE AUDIO (AUDIO ENGINE) ==========
// Motor de audio central para DAW profesional

import { AudioMath } from '../utils/AudioMath.js';
import { IRLoader } from '../utils/IRLoader.js';

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

    // Inicializar el contexto de audio y la cadena maestra
    async init() {
        if (this.isInitialized) {
            console.warn('AudioEngine already initialized');
            return;
        }

        try {
            // Crear AudioContext con la frecuencia de muestreo especificada
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
                latencyHint: 'interactive' // Optimizar para baja latencia
            });

            console.log('AudioContext created:', {
                sampleRate: this.audioContext.sampleRate,
                baseLatency: this.audioContext.baseLatency,
                outputLatency: this.audioContext.outputLatency,
                state: this.audioContext.state
            });

            // Crear cadena maestra: Compresor -> Ganancia -> Analizador -> Destino
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

            // Conectar cadena maestra
            this.masterCompressor.connect(this.masterGain);
            this.masterGain.connect(this.masterAnalyser);
            this.masterAnalyser.connect(this.audioContext.destination);

            // Inicializar cargador de IR
            this.irLoader = new IRLoader(this.audioContext);

            this.isInitialized = true;
            console.log('AudioEngine initialized successfully');

        } catch (error) {
            console.error('Error initializing AudioEngine:', error);
            throw error;
        }
    }

    // Reanudar contexto de audio (necesario para políticas de reproducción automática)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioContext resumed');
        }
    }

    // Obtener tiempo actual
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    }

    // Crear nodo de ganancia
    createGain(initialValue = 1.0) {
        const gain = this.audioContext.createGain();
        gain.gain.value = initialValue;
        return gain;
    }

    // Crear panner estéreo
    createPanner(initialPan = 0) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = initialPan;
        return panner;
    }

    // Crear analizador para vúmetros
    createAnalyser(fftSize = 256) {
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0.8;
        return analyser;
    }

    // Crear filtro biquad
    createFilter(type = 'lowpass', frequency = 1000, q = 1) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        return filter;
    }

    // Crear waveshaper para distorsión
    createWaveShaper(curve = null) {
        const shaper = this.audioContext.createWaveShaper();
        if (curve) {
            shaper.curve = curve;
        }
        shaper.oversample = '4x'; // Reducir aliasing
        return shaper;
    }

    // Crear convolver para efectos basados en IR
    createConvolver(impulseResponse = null) {
        const convolver = this.audioContext.createConvolver();
        if (impulseResponse) {
            convolver.buffer = impulseResponse;
        }
        return convolver;
    }

    // Crear nodo de delay
    createDelay(maxDelayTime = 5.0) {
        return this.audioContext.createDelay(maxDelayTime);
    }

    // Crear compresor
    createCompressor(threshold = -24, knee = 30, ratio = 12, attack = 0.003, release = 0.25) {
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = threshold;
        compressor.knee.value = knee;
        compressor.ratio.value = ratio;
        compressor.attack.value = attack;
        compressor.release.value = release;
        return compressor;
    }

    // Crear fuente de buffer
    createBufferSource(buffer = null) {
        const source = this.audioContext.createBufferSource();
        if (buffer) {
            source.buffer = buffer;
        }
        return source;
    }

    // Crear oscilador (para metrónomo, LFOs, etc.)
    createOscillator(type = 'sine', frequency = 440) {
        const osc = this.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        return osc;
    }

    // Crear fuente de stream de medios (para entrada de micrófono)
    createMediaStreamSource(stream) {
        return this.audioContext.createMediaStreamSource(stream);
    }

    // Crear contexto offline para renderizado/exportación
    createOfflineContext(duration, numberOfChannels = 2) {
        const length = Math.ceil(duration * this.sampleRate);
        return new OfflineAudioContext(numberOfChannels, length, this.sampleRate);
    }

    // Decodificar datos de audio
    async decodeAudioData(arrayBuffer) {
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    // Ajustar volumen maestro
    setMasterVolume(value) {
        if (this.masterGain) {
            // Cambio suave de parámetro para evitar clics
            this.masterGain.gain.setTargetAtTime(
                value,
                this.audioContext.currentTime,
                0.01
            );
        }
    }

    // Obtener volumen maestro
    getMasterVolume() {
        return this.masterGain ? this.masterGain.gain.value : 0;
    }

    // Activar/desactivar limitador maestro
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

    // Obtener datos del analizador maestro para vúmetro
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

    // Obtener nodo de destino (para conectar pistas)
    getDestination() {
        return this.masterCompressor;
    }

    // Cerrar contexto de audio
    close() {
        if (this.audioContext) {
            this.audioContext.close();
            this.isInitialized = false;
            console.log('AudioEngine closed');
        }
    }
}
