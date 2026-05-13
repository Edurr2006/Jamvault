// ========== CHORUS ==========
// Chorus estilo Boss CE-2 con modulación cálida y densa

import { AudioMath } from '../utils/AudioMath.js';

export class Chorus {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();

        // Crear múltiples voces para un chorus más rico
        this.voices = [];
        this.numVoices = 2;

        for (let i = 0; i < this.numVoices; i++) {
            const voice = {
                delay: audioContext.createDelay(0.1),
                lfo: audioContext.createOscillator(),
                lfoGain: audioContext.createGain(),
                gain: audioContext.createGain()
            };

            // Conectar LFO para modular el tiempo de delay
            voice.lfo.connect(voice.lfoGain);
            voice.lfoGain.connect(voice.delay.delayTime);

            // Conectar delay a la salida
            voice.delay.connect(voice.gain);
            voice.gain.connect(this.wetGain);

            // Iniciar LFO
            voice.lfo.start();

            this.voices.push(voice);
        }

        // Parámetros
        this.rate = 0.8; // Hz
        this.depth = 0.5; // 0-1
        this.mix = 0.5; // 0-1
        this.enabled = false;

        // Conectar
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        for (const voice of this.voices) {
            this.input.connect(voice.delay);
        }

        this.wetGain.connect(this.output);

        // Inicializar
        this.updateChorus();
    }

    // Ajustar velocidad (frecuencia LFO) en Hz
    setRate(hz) {
        this.rate = AudioMath.clamp(hz, 0.1, 10);
        this.updateChorus();
    }

    // Ajustar profundidad (0-1)
    setDepth(value) {
        this.depth = AudioMath.clamp(value, 0, 1);
        this.updateChorus();
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
            1.0, // Mantener dry al 100%, wet se suma
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar número de voces (1-4)
    setVoices(num) {
        // Esto requeriría recrear el array de voces
        // Por simplicidad, solo ajustamos la ganancia de las voces existentes
        const activeVoices = Math.min(num, this.voices.length);
        for (let i = 0; i < this.voices.length; i++) {
            if (i < activeVoices) {
                this.voices[i].gain.gain.value = 1.0 / activeVoices;
            } else {
                this.voices[i].gain.gain.value = 0;
            }
        }
    }

    // Actualizar parámetros del chorus
    updateChorus() {
        const baseDelay = 0.020; // 20ms delay base
        const maxModulation = 0.005; // 5ms profundidad de modulación

        this.voices.forEach((voice, index) => {
            // Ajustar frecuencia LFO con un ligero desafine entre voces
            const detune = 1 + (index * 0.1);
            voice.lfo.frequency.setTargetAtTime(
                this.rate * detune,
                this.audioContext.currentTime,
                0.01
            );

            // Ajustar profundidad LFO (cantidad de modulación del tiempo de delay)
            voice.lfoGain.gain.setTargetAtTime(
                maxModulation * this.depth,
                this.audioContext.currentTime,
                0.01
            );

            // Ajustar tiempo de delay base (ligeramente diferente para cada voz)
            const voiceDelay = baseDelay + (index * 0.002);
            voice.delay.delayTime.setTargetAtTime(
                voiceDelay,
                this.audioContext.currentTime,
                0.01
            );

            // Ajustar ganancia de la voz
            voice.gain.gain.value = 1.0 / this.numVoices;
        });
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

    // Preset: Sutil (movimiento suave)
    presetSubtle() {
        this.setRate(0.5);
        this.setDepth(0.3);
        this.setMix(0.3);
    }

    // Preset: Clásico (estilo CE-2)
    presetClassic() {
        this.setRate(0.8);
        this.setDepth(0.5);
        this.setMix(0.5);
    }

    // Preset: Lush (denso y ancho)
    presetLush() {
        this.setRate(1.2);
        this.setDepth(0.7);
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
        this.voices.forEach(voice => {
            voice.lfo.stop();
        });
        this.disconnect();
    }
}
