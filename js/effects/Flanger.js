// ========== FLANGER ==========
// Flanger estilo MXR con efecto de "avión a reacción"

import { AudioMath } from '../utils/AudioMath.js';

export class Flanger {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.delay = audioContext.createDelay(0.1);
        this.feedback = audioContext.createGain();
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Parámetros
        this.rate = 0.5; // Hz
        this.depth = 0.5; // 0-1
        this.feedbackAmount = 0.5; // 0-1
        this.manual = 0.5; // 0-1 (desfase de tiempo de delay)
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Conexión: Entrada -> Delay -> Feedback -> Delay (bucle de feedback)
        //                -> Wet -> Salida
        //         Entrada -> Dry -> Salida
        this.input.connect(this.delay);
        this.delay.connect(this.feedback);
        this.feedback.connect(this.delay); // Bucle de feedback
        this.delay.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // El LFO modula el tiempo de delay
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.delay.delayTime);
        this.lfo.start();

        // Inicializar
        this.updateFlanger();
    }

    // Ajustar velocidad (frecuencia LFO) en Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.05, 10);
        this.lfo.frequency.setTargetAtTime(
            this.rate,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar profundidad (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateFlanger();
    }

    // Ajustar cantidad de feedback (0-1)
    setFeedback(value) {
        this.feedbackAmount = AudioMath.clamp(value, 0, 0.95);
        // Feedback negativo para un sonido más metálico
        this.feedback.gain.setTargetAtTime(
            this.feedbackAmount * 0.7, // Escalar para prevenir realimentación infinita
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar desfase de delay manual (0-1)
    setManual(value) {
        this.manual = AudioMath.clamp(value, 0, 1);
        this.updateFlanger();
    }

    // Ajustar mezcla wet/dry (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1.0,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Actualizar parámetros del flanger
    updateFlanger() {
        // El flanger usa delays muy cortos (0.5ms a 10ms)
        const minDelay = 0.0005; // 0.5ms
        const maxDelay = 0.010; // 10ms

        // Tiempo de delay base controlado por manual
        const baseDelay = AudioMath.mapRange(this.manual, 0, 1, minDelay, maxDelay);

        // Profundidad de modulación del LFO
        const modDepth = (maxDelay - minDelay) * this.depth * 0.5;

        this.delay.delayTime.setTargetAtTime(
            baseDelay,
            this.audioContext.currentTime,
            0.01
        );

        this.lfoGain.gain.setTargetAtTime(
            modDepth,
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
            this.setMix(this.mix);
        }
    }

    // Preset: Sutil (barrido sutil)
    presetSubtle() {
        this.setRate(0.3);
        this.setDepth(0.3);
        this.setFeedback(0.3);
        this.setManual(0.5);
        this.setMix(0.4);
    }

    // Preset: Jet (sonido clásico de avión a reacción)
    presetJet() {
        this.setRate(0.5);
        this.setDepth(0.7);
        this.setFeedback(0.7);
        this.setManual(0.5);
        this.setMix(0.5);
    }

    // Preset: Extremo (barrido intenso)
    presetExtreme() {
        this.setRate(1.0);
        this.setDepth(0.9);
        this.setFeedback(0.85);
        this.setManual(0.6);
        this.setMix(0.6);
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
        this.lfo.stop();
        this.disconnect();
    }
}
