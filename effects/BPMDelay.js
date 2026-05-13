// ========== DELAY SINCRONIZADO POR BPM ==========
// Delay profesional con sincronización por BPM y subdivisiones musicales

import { AudioMath } from '../utils/AudioMath.js';

export class BPMDelay {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.delayNode = audioContext.createDelay(5.0);
        this.feedbackGain = audioContext.createGain();
        this.toneFilter = audioContext.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 3000;
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Nodos para ping-pong estéreo
        this.leftDelay = audioContext.createDelay(5.0);
        this.rightDelay = audioContext.createDelay(5.0);
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        this.merger = audioContext.createChannelMerger(2);

        // Parámetros
        this.bpm = 120;
        this.subdivision = '1/4'; // Subdivisión musical
        this.feedback = 0.3; // 0-1
        this.tone = 0.7; // 0-1
        this.mix = 0.3; // 0-1
        this.pingPong = false;
        this.enabled = false;
        this.manualTime = 0.25; // segundos (cuando no está sincronizado al BPM)
        this.syncToBPM = true;

        // Conectar cadena de delay mono:
        // Entrada -> Delay -> Tono -> Feedback -> Delay
        //       -> Wet -> Salida
        this.input.connect(this.delayNode);
        this.delayNode.connect(this.toneFilter);
        this.toneFilter.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode); // Feedback loop
        this.toneFilter.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Señal Dry (seca)
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Inicializar
        this.updateDelayTime();
        this.updateMix();
        this.setFeedback(this.feedback);
        this.setTone(this.tone);
    }

    // Ajustar BPM
    setBPM(bpm) {
        this.bpm = AudioMath.clamp(bpm, 40, 240);
        if (this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Ajustar subdivisión
    setSubdivision(subdivision) {
        this.subdivision = subdivision;
        if (this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Ajustar tiempo de delay manual (cuando no está sincronizado al BPM)
    setManualTime(seconds) {
        this.manualTime = AudioMath.clamp(seconds, 0.001, 2.0);
        if (!this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Alternar sincronización por BPM
    setSyncToBPM(sync) {
        this.syncToBPM = sync;
        this.updateDelayTime();
    }

    // Actualizar tiempo de delay basado en BPM o ajuste manual
    updateDelayTime() {
        let delayTime;

        if (this.syncToBPM) {
            delayTime = AudioMath.msToSeconds(AudioMath.bpmToMs(this.bpm, this.subdivision));
        } else {
            delayTime = this.manualTime;
        }

        // Limitar al rango válido
        delayTime = AudioMath.clamp(delayTime, 0.001, 2.0);

        this.delayNode.delayTime.setTargetAtTime(
            delayTime,
            this.audioContext.currentTime,
            0.01
        );

        if (this.pingPong) {
            this.leftDelay.delayTime.setTargetAtTime(
                delayTime,
                this.audioContext.currentTime,
                0.01
            );
            this.rightDelay.delayTime.setTargetAtTime(
                delayTime,
                this.audioContext.currentTime,
                0.01
            );
        }
    }

    // Ajustar cantidad de feedback (0-1)
    setFeedback(value) {
        this.feedback = AudioMath.clamp(value, 0, 0.95); // Máximo 95% para evitar realimentación infinita
        this.feedbackGain.gain.setTargetAtTime(
            this.feedback,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Ajustar tono (controla el filtro en el bucle de feedback)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);
        // Mapear 0-1 a 500Hz-8000Hz
        const freq = AudioMath.mapRange(this.tone, 0, 1, 500, 8000);
        this.toneFilter.frequency.setTargetAtTime(
            freq,
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

    // Activar/desactivar modo ping-pong
    setPingPong(enabled) {
        this.pingPong = enabled;
        // TODO: Implementar enrutamiento ping-pong estéreo
        // Esto requeriría desconectar la cadena mono y usar delays estéreo
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

    // Preset: Slapback (corto, repetición única)
    presetSlapback() {
        this.setSyncToBPM(false);
        this.setManualTime(0.12);
        this.setFeedback(0.1);
        this.setTone(0.8);
        this.setMix(0.3);
    }

    // Preset: Negra (rítmico)
    presetQuarterNote() {
        this.setSyncToBPM(true);
        this.setSubdivision('1/4');
        this.setFeedback(0.4);
        this.setTone(0.6);
        this.setMix(0.35);
    }

    // Preset: Corchea con puntillo (estilo U2)
    presetDottedEighth() {
        this.setSyncToBPM(true);
        this.setSubdivision('1/8D');
        this.setFeedback(0.5);
        this.setTone(0.5);
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
