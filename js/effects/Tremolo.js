// ========== TRÉMOLO ==========
// Efecto de modulación de amplitud

import { AudioMath } from '../utils/AudioMath.js';

export class Tremolo {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos面向对象
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.modulationGain = audioContext.createGain();
        this.lfo = audioContext.createOscillator();
        this.lfoGain = audioContext.createGain();

        // Parámetros
        this.rate = 4; // Hz
        this.depth = 0.5; // 0-1
        this.waveform = 'sine'; // sine, triangle, square
        this.enabled = false;

        // Conexión: Entrada -> ModulationGain -> Salida
        // LFO -> LFOGain -> ModulationGain.gain
        this.input.connect(this.modulationGain);
        this.modulationGain.connect(this.output);

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.modulationGain.gain);

        // Iniciar LFO
        this.lfo.start();

        // Inicializar
        this.updateTremolo();
    }

    // Ajustar velocidad (frecuencia LFO) en Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.1, 20);
        this.lfo.frequency.setTargetAtTime(
            this.rate,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar profundidad (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateTremolo();
    }

    // Ajustar forma de onda (waveform)
    setWaveform(waveform) {
        this.waveform = waveform;
        this.lfo.type = waveform;
    }

    // Actualizar parámetros del trémolo
    updateTremolo() {
        // El LFO oscila entre -1 y 1
        // Queremos que la ganancia oscile entre (1 - profundidad) y 1
        // Por lo tanto, desplazamos el LFO y lo escalamos

        // Establecer desfase DC (punto central de modulación)
        const offset = 1 - (this.depth * 0.5);
        this.modulationGain.gain.value = offset;

        // Ajustar cantidad de modulación
        const modAmount = this.depth * 0.5;
        this.lfoGain.gain.setTargetAtTime(
            modAmount,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Restablecer a ganancia unitaria (unity gain)
            this.modulationGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.01);
            this.lfoGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateTremolo();
        }
    }

    // Preset: Lento (pulsación suave)
    presetSlow() {
        this.setRate(2);
        this.setDepth(0.4);
        this.setWaveform('sine');
    }

    // Preset: Medio (trémolo clásico)
    presetMedium() {
        this.setRate(4);
        this.setDepth(0.6);
        this.setWaveform('sine');
    }

    // Preset: Rápido (helicóptero)
    presetFast() {
        this.setRate(8);
        this.setDepth(0.8);
        this.setWaveform('sine');
    }

    // Preset: Cuadrada (entrecortado)
    presetSquare() {
        this.setRate(4);
        this.setDepth(0.7);
        this.setWaveform('square');
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
