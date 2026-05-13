// ========== PUERTA DE RUIDO (NOISE GATE) ==========
// Puerta de ruido profesional para eliminar ruido no deseado

import { AudioMath } from '../utils/AudioMath.js';

export class NoiseGate {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;

        // Parámetros
        this.threshold = -40; // dB
        this.attack = 0.001; // segundos
        this.release = 0.1; // segundos
        this.hold = 0.05; // segundos
        this.enabled = false;

        // Estado
        this.isOpen = false;
        this.holdTimer = 0;
        this.updateInterval = null;

        // Conectar
        this.input.connect(this.analyser);
        this.input.connect(this.output);

        // Iniciar procesamiento
        this.startProcessing();
    }

    startProcessing() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const process = () => {
            if (!this.enabled) {
                this.output.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.001);
                this.updateInterval = requestAnimationFrame(process);
                return;
            }

            this.analyser.getByteFrequencyData(dataArray);

            // Calcular nivel RMS
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const rms = average / 255; // Normalizar a 0-1
            const rmsDb = AudioMath.gainToDb(rms);

            const now = this.audioContext.currentTime;

            // Lógica de la puerta
            if (rmsDb > this.threshold) {
                // Señal por encima del umbral - abrir puerta
                if (!this.isOpen) {
                    this.output.gain.setTargetAtTime(1.0, now, this.attack);
                    this.isOpen = true;
                }
                this.holdTimer = now + this.hold;
            } else {
                // Señal por debajo del umbral
                if (this.isOpen && now > this.holdTimer) {
                    // Cerrar puerta después del tiempo de hold
                    this.output.gain.setTargetAtTime(0.0, now, this.release);
                    this.isOpen = false;
                }
            }

            this.updateInterval = requestAnimationFrame(process);
        };

        process();
    }

    // Ajustar umbral en dB
    setThreshold(dB) {
        this.threshold = AudioMath.clamp(dB, -60, 0);
    }

    // Ajustar tiempo de ataque en segundos
    setAttack(seconds) {
        this.attack = AudioMath.clamp(seconds, 0.0001, 0.05);
    }

    // Ajustar tiempo de liberación (release) en segundos
    setRelease(seconds) {
        this.release = AudioMath.clamp(seconds, 0.01, 1.0);
    }

    // Ajustar tiempo de mantenimiento (hold) en segundos
    setHold(seconds) {
        this.hold = AudioMath.clamp(seconds, 0, 0.5);
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.isOpen = false;
            this.output.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.001);
        }
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
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }
        this.disconnect();
    }
}
