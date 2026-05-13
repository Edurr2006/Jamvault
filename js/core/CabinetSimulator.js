// ========== SIMULADOR DE PANTALLA ==========
// Simulación de pantalla y micrófono utilizando respuestas al impulso

import { AudioMath } from './utils/AudioMath.js';

export class CabinetSimulator {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.convolver = audioContext.createConvolver();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Parámetros
        this.cabinetType = '4x12'; // 1x12, 2x12, 4x12
        this.micType = 'SM57'; // SM57, MD421, R121
        this.micPosition = 'on-axis'; // on-axis, off-axis, distance
        this.mix = 1.0; // 0-1 (normalmente 100% wet para simulación de pantalla)
        this.enabled = false;
        this.currentIR = null;

        // Conectar: Entrada -> Convolver -> Wet -> Salida
        //         Entrada -> Dry -> Salida
        this.input.connect(this.convolver);
        this.convolver.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Inicializar con IR sintética
        this.loadSyntheticCabinet();
        this.updateMix();
    }

    // Cargar IR de pantalla desde URL
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

    // Cargar IR de pantalla desde archivo
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

    // Cargar IR de pantalla sintética (fallback/pruebas)
    loadSyntheticCabinet() {
        // Generar una IR simple similar a una pantalla
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(0.05 * sampleRate); // 50ms
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);

            // Crear respuesta similar a una pantalla
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;

                // Impulso inicial con caída de altas frecuencias
                const impulse = Math.exp(-t * 100) * (Math.random() * 2 - 1);

                // Carácter de paso bajo (cono del altavoz)
                const lowpass = Math.exp(-t * 50) * Math.sin(2 * Math.PI * 200 * t);

                // Resonancia (resonancia de la pantalla)
                const resonance = Math.exp(-t * 30) * Math.sin(2 * Math.PI * 120 * t) * 0.3;

                data[i] = (impulse + lowpass + resonance) * 0.5;
            }
        }

        this.convolver.buffer = buffer;
        this.currentIR = 'synthetic_cabinet';
        console.log('Synthetic cabinet IR loaded');
    }

    // Establecer tipo de pantalla
    setCabinetType(type) {
        this.cabinetType = type;
        // En una implementación real, esto cargaría diferentes IRs
        // Por ahora, solo registramos el cambio
        console.log('Cabinet type set to:', type);
    }

    // Establecer tipo de micrófono
    setMicType(type) {
        this.micType = type;
        console.log('Mic type set to:', type);
    }

    // Establecer posición del micrófono
    setMicPosition(position) {
        this.micPosition = position;
        console.log('Mic position set to:', position);
    }

    // Establecer mezcla wet/dry (0-1)
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
            1 - this.mix, // Inverso para pantalla (normalmente 100% wet)
            this.audioContext.currentTime,
            0.01
        );
    }

    // Habilitar/deshabilitar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Señal seca completa cuando está deshabilitado
            this.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.dryGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
        } else {
            this.updateMix();
        }
    }

    // Preset: 1x12 Combo (pequeño, enfocado)
    preset1x12() {
        this.setCabinetType('1x12');
        this.setMicType('SM57');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: 2x12 (equilibrado)
    preset2x12() {
        this.setCabinetType('2x12');
        this.setMicType('MD421');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: 4x12 Stack (lleno, potente)
    preset4x12() {
        this.setCabinetType('4x12');
        this.setMicType('SM57');
        this.setMicPosition('on-axis');
        this.setMix(1.0);
    }

    // Preset: Sala (micrófono distante)
    presetRoom() {
        this.setCabinetType('4x12');
        this.setMicType('R121');
        this.setMicPosition('distance');
        this.setMix(1.0);
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
