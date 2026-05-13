// ========== REVERB POR CONVOLUCIÓN ==========
// Reverb de alta calidad usando respuestas al impulso (IR)

import { AudioMath } from '../utils/AudioMath.js';

export class ConvolutionReverb {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.convolver = audioContext.createConvolver();
        this.preDelay = audioContext.createDelay(0.5);
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.lowpass = audioContext.createBiquadFilter();
        this.highpass = audioContext.createBiquadFilter();

        // Configurar filtros
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 8000;
        this.highpass.type = 'highpass';
        this.highpass.frequency.value = 200;

        // Parámetros
        this.mix = 0.3; // 0-1
        this.preDelayTime = 0.02; // seconds
        this.tone = 0.5; // 0-1
        this.enabled = false;
        this.currentIR = null;

        // Conexión: Entrada -> PreDelay -> Convolver -> Filtros -> Wet -> Salida
        //         Entrada -> Dry -> Salida
        this.input.connect(this.preDelay);
        this.preDelay.connect(this.convolver);
        this.convolver.connect(this.highpass);
        this.highpass.connect(this.lowpass);
        this.lowpass.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Inicializar con una IR sintética
        this.loadSyntheticIR('room');
        this.updateMix();
    }

    // Carga IR desde una URL
    async loadIR(url, name = null) {
        try {
            const ir = await this.irLoader.loadIR(url, name);
            this.convolver.buffer = ir;
            this.currentIR = name || url;
            console.log('Reverb IR loaded:', this.currentIR);
        } catch (error) {
            console.error('Error loading reverb IR:', error);
            // Revertir a IR sintética como fallback
            this.loadSyntheticIR('room');
        }
    }

    // Carga IR desde un archivo
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

    // Carga IR sintética
    loadSyntheticIR(type = 'room') {
        const ir = this.irLoader.generateSyntheticIR(type, 2.0);
        this.convolver.buffer = ir;
        this.currentIR = `synthetic_${type}`;
        console.log('Synthetic reverb IR loaded:', this.currentIR);
    }

    // Ajustar tiempo de pre-delay en segundos
    setPreDelay(seconds) {
        this.preDelayTime = AudioMath.clamp(seconds, 0, 0.2);
        this.preDelay.delayTime.setTargetAtTime(
            this.preDelayTime,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar tono (controla los filtros paso alto/bajo)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);

        // Mapear tono a frecuencias de filtro
        // Tono bajo = más oscuro (paso bajo más bajo, paso alto más alto)
        // Tono alto = más brillante (paso bajo más alto, paso alto más bajo)
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

    // Ajustar mezcla wet/dry (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.updateMix();
    }

    // Actualizar mezcla wet/dry
    updateMix() {
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1.0, // Dry siempre al 100%, wet se suma
            this.audioContext.currentTime,
            0.01
        );
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateMix();
        }
    }

    // Preset: Habitación (pequeña, natural)
    presetRoom() {
        this.loadSyntheticIR('room');
        this.setPreDelay(0.01);
        this.setTone(0.6);
        this.setMix(0.25);
    }

    // Preset: Sala (grande, espaciosa)
    presetHall() {
        this.loadSyntheticIR('hall');
        this.setPreDelay(0.03);
        this.setTone(0.5);
        this.setMix(0.35);
    }

    // Preset: Placa (vintage, brillante)
    presetPlate() {
        this.loadSyntheticIR('plate');
        this.setPreDelay(0.02);
        this.setTone(0.7);
        this.setMix(0.3);
    }

    // Preset: Muelles (estilo amplificador de guitarra)
    presetSpring() {
        this.loadSyntheticIR('spring');
        this.setPreDelay(0.005);
        this.setTone(0.4);
        this.setMix(0.4);
    }

    // Conectar al siguiente nodo
    connect(destination) {
        this.output.connect(destination);
    }

    // Desconectar
    disconnect() {
        this.output.disconnect();
    }

    // Limpieza
    destroy() {
        this.disconnect();
    }
}
