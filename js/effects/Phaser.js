// ========== PHASER ==========
// Phaser estilo Phase 90 con barridos de muescas (notches)

import { AudioMath } from '../utils/AudioMath.js';

export class Phaser {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.feedback = audioContext.createGain();

        // Crear filtros allpass (crean el desfase)
        this.stages = 4; // Number of allpass stages
        this.filters = [];

        for (let i = 0; i < this.stages; i++) {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'allpass';
            filter.Q.value = 1;
            this.filters.push(filter);
        }

        // LFO para el barrido
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();

        // Parámetros
        this.rate = 0.5; // Hz
        this.depth = 0.5; // 0-1
        this.feedbackAmount = 0.5; // 0-1
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Conectar filtros en serie
        this.input.connect(this.filters[0]);
        for (let i = 0; i < this.stages - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }

        // El último filtro conecta al feedback y a la salida
        this.filters[this.stages - 1].connect(this.feedback);
        this.feedback.connect(this.filters[0]); // Bucle de feedback
        this.filters[this.stages - 1].connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Señal Dry (seca)
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Configuración LFO (actualizaremos manualmente las frecuencias del filtro)
        this.lfo.frequency.value = this.rate;
        this.lfo.start();

        // Iniciar procesamiento del LFO
        this.startLFO();

        // Inicializar
        this.updatePhaser();
    }

    // Procesa manualmente el LFO para actualizar las frecuencias de los filtros
    startLFO() {
        const updateFilters = () => {
            if (!this.enabled) {
                this.lfoUpdateInterval = requestAnimationFrame(updateFilters);
                return;
            }

            const now = this.audioContext.currentTime;
            const lfoValue = Math.sin(2 * Math.PI * this.rate * now);

            // Mapear LFO al rango de frecuencia (200Hz a 2000Hz)
            const minFreq = 200;
            const maxFreq = 2000;
            const freqRange = maxFreq - minFreq;
            const centerFreq = minFreq + (freqRange * 0.5);
            const modAmount = (freqRange * 0.5) * this.depth;

            // Actualizar cada filtro con frecuencias ligeramente distintas para un sonido más rico
            this.filters.forEach((filter, index) => {
                const offset = index * 0.1; // Desafine sutil
                const freq = centerFreq + (lfoValue * modAmount) + (offset * 100);
                filter.frequency.setTargetAtTime(
                    freq,
                    now,
                    0.01
                );
            });

            this.lfoUpdateInterval = requestAnimationFrame(updateFilters);
        };

        updateFilters();
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
    }

    // Ajustar cantidad de feedback (0-1)
    setFeedback(value) {
        this.feedbackAmount = AudioMath.clamp(value, 0, 0.95);
        this.feedback.gain.setTargetAtTime(
            this.feedbackAmount * 0.5, // Escalar hacia abajo
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar número de etapas (2, 4, 6 o 8)
    setStages(num) {
        // This would require recreating the filter array
        // For now, we'll just note it as a future enhancement
        console.log('Cambio de etapa no implementado todavía');
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

    // Actualizar parámetros del phaser
    updatePhaser() {
        this.setFeedback(this.feedbackAmount);
        this.setMix(this.mix);
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

    // Preset: Sutil (barrido suave)
    presetSubtle() {
        this.setRate(0.3);
        this.setDepth(0.3);
        this.setFeedback(0.3);
        this.setMix(0.4);
    }

    // Preset: Clásico (estilo Phase 90)
    presetClassic() {
        this.setRate(0.5);
        this.setDepth(0.6);
        this.setFeedback(0.5);
        this.setMix(0.5);
    }

    // Preset: Intenso (barrido profundo)
    presetIntense() {
        this.setRate(1.0);
        this.setDepth(0.8);
        this.setFeedback(0.7);
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
        if (this.lfoUpdateInterval) {
            cancelAnimationFrame(this.lfoUpdateInterval);
        }
        this.lfo.stop();
        this.disconnect();
    }
}
