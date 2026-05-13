// ========== COMPRESOR ==========
// Compresor de dinámica profesional para guitarra

import { AudioMath } from '../utils/AudioMath.js';

export class Compressor {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.compressor = audioContext.createDynamicsCompressor();
        this.makeupGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Parámetros por defecto (orientados a guitarra)
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.makeupGain.gain.value = 1.0;

        this.enabled = false;

        // Conexión: Entrada -> Compresor -> Makeup Gain -> Salida
        this.input.connect(this.compressor);
        this.compressor.connect(this.makeupGain);
        this.makeupGain.connect(this.output);
    }

    // Ajustar umbral (threshold) en dB
    setThreshold(dB) {
        const value = AudioMath.clamp(dB, -60, 0);
        this.compressor.threshold.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar ratio (1:1 a 20:1)
    setRatio(ratio) {
        const value = AudioMath.clamp(ratio, 1, 20);
        this.compressor.ratio.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar tiempo de ataque en segundos
    setAttack(seconds) {
        const value = AudioMath.clamp(seconds, 0.0001, 0.1);
        this.compressor.attack.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar tiempo de liberación (release) en segundos
    setRelease(seconds) {
        const value = AudioMath.clamp(seconds, 0.01, 2.0);
        this.compressor.release.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar knee (duro/suave)
    setKnee(dB) {
        const value = AudioMath.clamp(dB, 0, 40);
        this.compressor.knee.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar ganancia de compensación (makeup gain) en dB
    setMakeupGain(dB) {
        const gain = AudioMath.dBToGain(AudioMath.clamp(dB, 0, 24));
        this.makeupGain.gain.setTargetAtTime(
            gain,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        // El compresor siempre está en la cadena, pero podemos omitirlo
        // configurando el ratio a 1:1
        if (!enabled) {
            this.compressor.ratio.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
        }
    }

    // Obtener cantidad de reducción (para vúmetros)
    getReduction() {
        return this.compressor.reduction;
    }

    // Preset: Suave (nivelación sutil)
    presetGentle() {
        this.setThreshold(-30);
        this.setRatio(2);
        this.setAttack(0.01);
        this.setRelease(0.3);
        this.setKnee(15);
        this.setMakeupGain(3);
    }

    // Preset: Medio (compresión equilibrada)
    presetMedium() {
        this.setThreshold(-24);
        this.setRatio(4);
        this.setAttack(0.003);
        this.setRelease(0.25);
        this.setKnee(10);
        this.setMakeupGain(6);
    }

    // Preset: Pesado (compresión agresiva)
    presetHeavy() {
        this.setThreshold(-18);
        this.setRatio(8);
        this.setAttack(0.001);
        this.setRelease(0.15);
        this.setKnee(5);
        this.setMakeupGain(12);
    }

    // Preset: Limitador (evitar recortes)
    presetLimiter() {
        this.setThreshold(-3);
        this.setRatio(20);
        this.setAttack(0.0001);
        this.setRelease(0.05);
        this.setKnee(0);
        this.setMakeupGain(0);
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
