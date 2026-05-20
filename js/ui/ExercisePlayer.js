/**
 * ExercisePlayer.js
 * Secuenciador optimizado para pasos unificados.
 * Estrictamente desacoplado, utiliza AudioEngine solo para contexto/nodos.
 */

import { AudioEngine } from '../core/AudioEngine.js';

export class ExercisePlayer {
    constructor() {
        this.audioEngine = new AudioEngine();

        this.isPlaying = false;
        this.bpm = 120;
        this.isMetronomeOn = true;
        this.isSynthEnabled = true;

        this.schedulerTimer = null;
        this.nextStepTime = 0.0;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s

        this.steps = [];
        this.stepIndex = 0;
        this.currentBeatInStep = 0; // Seguimiento del pulso actual dentro de un paso

        this.onStepHighlight = null; // Callback para sincronización visual
        this.onPlaybackEnd = null;

        this.activeNodes = []; // Seguimiento de osciladores activos para limpieza inmediata

        // Mapeo de frecuencias de notas
        this.NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.CHORD_INTERVALS = {
            'Mayor': [0, 4, 7],
            'Menor': [0, 3, 7],
            '7': [0, 4, 7, 10],
            'maj7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10]
        };
    }

    async init() {
        if (!this.audioEngine.isInitialized) {
            await this.audioEngine.init();
        }
    }
    setExercise(exercise) {
        this.steps = exercise.steps || [];
        this.bpm = exercise.bpm || 120;
        this.isMetronomeOn = exercise.metronomeEnabled !== undefined ? exercise.metronomeEnabled : true;
        this.stepIndex = 0;
        this.currentBeatInStep = 0;
    }

    setCallbacks(onStep, onEnd, onLoop) {
        this.onStepHighlight = onStep;
        this.onPlaybackEnd = onEnd;
        this.onLoop = onLoop;
    }

    start(exercise, bpm, onStep, onLoop) {
        this.setExercise(exercise);
        if (bpm) this.bpm = bpm;
        this.onStepHighlight = onStep;
        this.onLoop = onLoop;
        this.play();
    }

    play() {
        if (this.isPlaying) return;
        if (this.audioEngine.audioContext.state === 'suspended') {
            this.audioEngine.audioContext.resume();
        }

        this.isPlaying = true;
        this.stepIndex = 0;
        this.currentBeatInStep = 0;
        this.nextStepTime = this.audioEngine.getCurrentTime() + 0.05;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.schedulerTimer);
        this.onStepHighlight = null;
        this.onLoop = null;

        // Detener y limpiar todos los nodos de audio activos
        this.activeNodes.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // Ya podría estar detenido
            }
        });
        this.activeNodes = [];

        if (this.onPlaybackEnd) this.onPlaybackEnd();
    }

    setVolume(vol) {
        this.audioEngine.setMasterVolume(vol);
    }

    setBpm(bpm) {
        if (this.bpm === bpm) return;

        const currentTime = this.audioEngine.getCurrentTime();
        if (this.isPlaying && this.nextStepTime > currentTime) {
            // Ajustar el tiempo del próximo paso proporcionalmente para evitar saltos o retrasos
            const ratio = this.bpm / bpm;
            const remaining = this.nextStepTime - currentTime;
            this.nextStepTime = currentTime + (remaining * ratio);
        }
        this.bpm = bpm;
    }

    scheduler() {
        while (this.nextStepTime < this.audioEngine.getCurrentTime() + this.scheduleAheadTime) {
            this.scheduleNextStep(this.nextStepTime);
        }
        if (this.isPlaying) {
            this.schedulerTimer = setTimeout(() => this.scheduler(), this.lookahead);
        }
    }

    scheduleNextStep(time) {
        const index = this.stepIndex;
        const step = this.steps[index];
        if (!step) return;

        const duration = step.duration || 1;
        const secondsPerBeat = 60.0 / this.bpm;

        // 1. Solo al inicio del paso (pulso 0)
        if (this.currentBeatInStep === 0) {
            // Sincronización visual
            const delay = (time - this.audioEngine.getCurrentTime()) * 1000;
            setTimeout(() => {
                if (this.isPlaying && this.onStepHighlight) {
                    this.onStepHighlight(index);
                }
            }, Math.max(0, delay));

            // Síntesis MIDI (Contenido)
            if (this.isSynthEnabled) {
                if (step.kind === 'note') {
                    this.synthNote(step.data, time, step.duration);
                } else if (step.kind === 'chord') {
                    this.synthChord(step.data, time, step.duration);
                }
            }
        }

        // 2. Ticks del metrónomo - Cada pulso (ahora programado de uno en uno)
        if (this.isMetronomeOn) {
            const isAccent = (index === 0 && this.currentBeatInStep === 0);
            this.playMetronomeTick(time, isAccent);
        }

        // Avanzar un pulso (beat)
        this.nextStepTime += secondsPerBeat;
        this.currentBeatInStep++;

        // Si hemos completado la duración del paso, pasar al siguiente
        if (this.currentBeatInStep >= duration) {
            this.currentBeatInStep = 0;
            this.stepIndex++;

            if (this.stepIndex >= this.steps.length) {
                this.stepIndex = 0;
                if (this.onLoop) this.onLoop();
            }
        }
    }

    // --- SÍNTESIS ---

    playMetronomeTick(time, isAccent) {
        const playTime = time || this.audioEngine.getCurrentTime();
        const osc = this.audioEngine.createOscillator(isAccent ? 'triangle' : 'sine', isAccent ? 1200 : 800);
        const gain = this.audioEngine.createGain();
        osc.connect(gain);
        gain.connect(this.audioEngine.getDestination());

        gain.gain.setValueAtTime(0, playTime);
        gain.gain.linearRampToValueAtTime(0.2, playTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.04);
        osc.start(playTime);
        osc.stop(playTime + 0.05);

        this.activeNodes.push(osc);
        osc.onended = () => {
            this.activeNodes = this.activeNodes.filter(n => n !== osc);
        };
    }

    synthNote(data, time, durationBeats) {
        const freq = this.getFrequency(data.note, data.octave);
        const durationSeconds = (60 / this.bpm) * durationBeats;
        this.createVoice(freq, time, durationSeconds, 0.3);
    }

    synthChord(data, time, durationBeats) {
        const intervals = this.CHORD_INTERVALS[data.type] || [0, 4, 7];
        const rootFreq = this.getFrequency(data.root, 2); // Octava más baja para un sonido de guitarra más lleno
        const durationSeconds = (60 / this.bpm) * durationBeats;

        intervals.forEach((interval, i) => {
            const freq = rootFreq * Math.pow(2, interval / 12);
            const strumDelay = i * 0.025; // Escalonamiento simple de rasgueo
            this.createVoice(freq, time + strumDelay, durationSeconds, 0.15);
        });
    }

    createVoice(freq, time, duration, vol) {
        const osc = this.audioEngine.createOscillator('sawtooth', freq);
        const gain = this.audioEngine.createGain();
        const filter = this.audioEngine.createFilter('lowpass', 2000, 1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioEngine.getDestination());

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(vol * 0.5, time + 0.2);
        gain.gain.setValueAtTime(vol * 0.5, time + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.start(time);
        osc.stop(time + duration + 0.1);

        this.activeNodes.push(osc);
        osc.onended = () => {
            this.activeNodes = this.activeNodes.filter(n => n !== osc);
        };
    }

    getFrequency(note, octave) {
        const idx = this.NOTES.indexOf(note);
        if (idx === -1) return 440;
        const n = (octave + 1) * 12 + idx;
        return 440 * Math.pow(2, (n - 69) / 12);
    }
}
