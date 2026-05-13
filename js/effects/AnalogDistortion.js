// ========== DISTORSIÓN ANALÓGICA ==========
// Distorsión realista de estilo analógico con múltiples modos de recorte

import { AudioMath } from '../utils/AudioMath.js';
import { WaveshapeGenerator } from '../utils/WaveshapeGenerator.js';

export class AnalogDistortion {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.preGain = audioContext.createGain();
        this.waveshaper = audioContext.createWaveShaper();
        this.waveshaper.oversample = '4x'; // Reducir aliasing
        this.toneFilter = audioContext.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 3000;
        this.toneFilter.Q.value = 0.7;
        this.postGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Conexión: Entrada -> PreGain -> Waveshaper -> Tono -> PostGain -> WetGain -> Salida
        //                  -> DryGain -> Salida
        this.input.connect(this.preGain);
        this.preGain.connect(this.waveshaper);
        this.waveshaper.connect(this.toneFilter);
        this.toneFilter.connect(this.postGain);
        this.postGain.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Inicializar
        this.updateWaveshaper();
        this.updateMix();
    }

    // Ajusta la cantidad de drive (0-1)
    setDrive(value) {
        this.drive = AudioMath.clamp(value, 0, 1);
        this.updateWaveshaper();
    }

    // Ajusta el tono (0-1, controla el filtro paso bajo)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);
        // Mapear 0-1 a 200Hz-8000Hz
        const freq = AudioMath.mapRange(this.tone, 0, 1, 200, 8000);
        this.toneFilter.frequency.setTargetAtTime(
            freq,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajusta el nivel de salida (0-1)
    setLevel(value) {
        this.level = AudioMath.clamp(value, 0, 1);
        this.postGain.gain.setTargetAtTime(
            this.level,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajusta la mezcla wet/dry (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.updateMix();
    }

    // Ajusta el modo de distorsión
    setMode(mode) {
        this.mode = mode;
        this.updateWaveshaper();
    }

    // Actualiza la curva del Waveshaper basada en el modo y el drive
    updateWaveshaper() {
        const amount = 1 + this.drive * 9; // Mapear 0-1 a 1-10

        switch (this.mode) {
            case 'tube':
                this.waveshaper.curve = WaveshapeGenerator.tubeSaturation(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
                break;
            case 'diode':
                this.waveshaper.curve = WaveshapeGenerator.asymmetricClip(amount);
                this.preGain.gain.value = 1 + this.drive * 3;
                break;
            case 'fuzz':
                this.waveshaper.curve = WaveshapeGenerator.exponentialClip(amount);
                this.preGain.gain.value = 1 + this.drive * 5;
                break;
            case 'soft':
                this.waveshaper.curve = WaveshapeGenerator.softClip(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
                break;
            case 'hard':
                this.waveshaper.curve = WaveshapeGenerator.hardClip(0.3 + this.drive * 0.6);
                this.preGain.gain.value = 1 + this.drive * 4;
                break;
            default:
                this.waveshaper.curve = WaveshapeGenerator.tubeSaturation(amount);
                this.preGain.gain.value = 1 + this.drive * 2;
        }
    }

    // Actualiza la mezcla wet/dry
    updateMix() {
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1 - this.mix,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.setMix(0); // Totalmente dry cuando está desactivado
        } else {
            this.setMix(this.mix);
        }
    }

    // Preset: Blues (overdrive cálido y sutil)
    presetBlues() {
        this.setMode('tube');
        this.setDrive(0.3);
        this.setTone(0.6);
        this.setLevel(0.8);
        this.setMix(1.0);
    }

    // Preset: Rock (crunch clásico)
    presetRock() {
        this.setMode('diode');
        this.setDrive(0.5);
        this.setTone(0.5);
        this.setLevel(0.8);
        this.setMix(1.0);
    }

    // Preset: Metal (saturación pesada)
    presetMetal() {
        this.setMode('fuzz');
        this.setDrive(0.8);
        this.setTone(0.4);
        this.setLevel(0.7);
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
