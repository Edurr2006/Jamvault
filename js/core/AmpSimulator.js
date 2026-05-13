// ========== SIMULADOR DE AMPLIFICADOR ==========
// Amplificador de guitarra virtual con preamplificador, tone stack y simulación de pantalla (cabinet)

import { AudioMath } from '../utils/AudioMath.js';
import { WaveshapeGenerator } from '../utils/WaveshapeGenerator.js';

export class AmpSimulator {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Etapa de preamplificación (Preamp)
        this.preampGain = audioContext.createGain();
        this.preampShaper = audioContext.createWaveShaper();
        this.preampShaper.oversample = '4x';

        // Tone stack (EQ estilo Baxandall)
        this.bassFilter = audioContext.createBiquadFilter();
        this.midFilter = audioContext.createBiquadFilter();
        this.trebleFilter = audioContext.createBiquadFilter();
        this.presenceFilter = audioContext.createBiquadFilter();

        // Configurar tone stack
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

        // Etapa de salida
        this.masterGain = audioContext.createGain();

        // Parámetros
        this.model = 'clean'; // limpio (clean), saturado (crunch), alta ganancia (high-gain)
        this.gain = 5; // 0-10
        this.bass = 5; // 0-10
        this.mid = 5; // 0-10
        this.treble = 5; // 0-10
        this.presence = 5; // 0-10
        this.master = 0.8; // 0-1
        this.enabled = false;

        // Conexión: Entrada -> PreampGain -> Shaper -> Tone Stack -> Master -> Salida
        this.input.connect(this.preampGain);
        this.preampGain.connect(this.preampShaper);
        this.preampShaper.connect(this.bassFilter);
        this.bassFilter.connect(this.midFilter);
        this.midFilter.connect(this.trebleFilter);
        this.trebleFilter.connect(this.presenceFilter);
        this.presenceFilter.connect(this.masterGain);
        this.masterGain.connect(this.output);

        // Inicializar
        this.updatePreamp();
        this.updateToneStack();
    }

    // Seleccionar modelo de amplificador
    setModel(model) {
        this.model = model;
        this.updatePreamp();
    }

    // Ajustar ganancia (0-10)
    setGain(value) {
        this.gain = AudioMath.clamp(value, 0, 10);
        this.updatePreamp();
    }

    // Ajustar graves (0-10)
    setBass(value) {
        this.bass = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Ajustar medios (0-10)
    setMid(value) {
        this.mid = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Ajustar agudos (0-10)
    setTreble(value) {
        this.treble = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Ajustar presencia (0-10)
    setPresence(value) {
        this.presence = AudioMath.clamp(value, 0, 10);
        this.updateToneStack();
    }

    // Ajustar volumen maestro (0-1)
    setMaster(value) {
        this.master = AudioMath.clamp(value, 0, 1);
        this.masterGain.gain.setTargetAtTime(
            this.master,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Actualizar preamplificador basado en modelo y ganancia
    updatePreamp() {
        const gainNormalized = this.gain / 10; // 0-1

        switch (this.model) {
            case 'clean':
                // Estilo Fender Twin Reverb - calidez sutil, transparente
                this.preampGain.gain.value = 1 + gainNormalized * 2;
                this.preampShaper.curve = WaveshapeGenerator.tubeSaturation(0.5 + gainNormalized * 1.5);
                break;

            case 'crunch':
                // Estilo Marshall JCM800 - enfocado en medios, rock clásico
                this.preampGain.gain.value = 1 + gainNormalized * 4;
                this.preampShaper.curve = WaveshapeGenerator.asymmetricClip(1 + gainNormalized * 3);
                break;

            case 'high-gain':
                // Estilo Mesa Boogie Dual Rectifier - agresivo, metal moderno
                this.preampGain.gain.value = 1 + gainNormalized * 6;
                this.preampShaper.curve = WaveshapeGenerator.exponentialClip(2 + gainNormalized * 4);
                break;

            default:
                this.preampGain.gain.value = 1 + gainNormalized * 2;
                this.preampShaper.curve = WaveshapeGenerator.tubeSaturation(0.5 + gainNormalized * 1.5);
        }
    }

    // Actualizar tone stack
    updateToneStack() {
        // Graves (0-10 mapea a -12dB a +12dB)
        const bassGain = AudioMath.mapRange(this.bass, 0, 10, -12, 12);
        this.bassFilter.gain.setTargetAtTime(
            bassGain,
            this.audioContext.currentTime,
            0.01
        );

        // Medios (0-10 mapea a -12dB a +12dB)
        const midGain = AudioMath.mapRange(this.mid, 0, 10, -12, 12);
        this.midFilter.gain.setTargetAtTime(
            midGain,
            this.audioContext.currentTime,
            0.01
        );

        // Agudos (0-10 mapea a -12dB a +12dB)
        const trebleGain = AudioMath.mapRange(this.treble, 0, 10, -12, 12);
        this.trebleFilter.gain.setTargetAtTime(
            trebleGain,
            this.audioContext.currentTime,
            0.01
        );

        // Presencia (0-10 mapea a -6dB a +12dB, más realce que recorte)
        const presenceGain = AudioMath.mapRange(this.presence, 0, 10, -6, 12);
        this.presenceFilter.gain.setTargetAtTime(
            presenceGain,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Bypass poniendo el previo a ganancia unitaria y curva lineal
            this.preampGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.01);
            this.preampShaper.curve = null;
        } else {
            this.updatePreamp();
        }
    }

    // Preset: Limpio (Fender Twin)
    presetClean() {
        this.setModel('clean');
        this.setGain(3);
        this.setBass(6);
        this.setMid(5);
        this.setTreble(6);
        this.setPresence(5);
        this.setMaster(0.8);
    }

    // Preset: Blues (overdrive cálido)
    presetBlues() {
        this.setModel('crunch');
        this.setGain(5);
        this.setBass(6);
        this.setMid(6);
        this.setTreble(5);
        this.setPresence(4);
        this.setMaster(0.75);
    }

    // Preset: Rock (saturación Marshall)
    presetRock() {
        this.setModel('crunch');
        this.setGain(7);
        this.setBass(5);
        this.setMid(7);
        this.setTreble(6);
        this.setPresence(6);
        this.setMaster(0.8);
    }

    // Preset: Metal (alta ganancia)
    presetMetal() {
        this.setModel('high-gain');
        this.setGain(8);
        this.setBass(6);
        this.setMid(4);
        this.setTreble(7);
        this.setPresence(7);
        this.setMaster(0.7);
    }

    // Preset: Solista (Lead) (sustentación cantarina)
    presetLead() {
        this.setModel('high-gain');
        this.setGain(7);
        this.setBass(5);
        this.setMid(8);
        this.setTreble(6);
        this.setPresence(8);
        this.setMaster(0.75);
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
