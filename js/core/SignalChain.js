// ========== CADENA DE SEÑAL ==========
// Cadena de señal profesional: Entrada → Puerta de Ruido → Compresor → Amplificador → Efectos → EQ → Salida

import { NoiseGate } from '../effects/NoiseGate.js';
import { Compressor } from '../effects/Compressor.js';
import { AnalogDistortion } from '../effects/AnalogDistortion.js';
import { BPMDelay } from '../effects/BPMDelay.js';
import { ConvolutionReverb } from '../effects/ConvolutionReverb.js';
import { Chorus } from '../effects/Chorus.js';
import { Flanger } from '../effects/Flanger.js';
import { Phaser } from '../effects/Phaser.js';
import { Tremolo } from '../effects/Tremolo.js';
import { ParametricEQ } from '../effects/ParametricEQ.js';
import { AmpSimulator } from './AmpSimulator.js';
import { CabinetSimulator } from './CabinetSimulator.js';

export class SignalChain {
    constructor(audioContext, irLoader) {
        this.audioContext = audioContext;
        this.irLoader = irLoader;

        // Crear nodos de entrada y salida
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Crear todos los efectos en orden
        this.noiseGate = new NoiseGate(audioContext);
        this.compressor = new Compressor(audioContext);
        this.ampSimulator = new AmpSimulator(audioContext);
        this.cabinetSimulator = new CabinetSimulator(audioContext, irLoader);

        // Efectos post-amplificador
        this.distortion = new AnalogDistortion(audioContext);
        this.chorus = new Chorus(audioContext);
        this.flanger = new Flanger(audioContext);
        this.phaser = new Phaser(audioContext);
        this.tremolo = new Tremolo(audioContext);
        this.delay = new BPMDelay(audioContext);
        this.reverb = new ConvolutionReverb(audioContext, irLoader);

        // EQ final
        this.eq = new ParametricEQ(audioContext);

        // Ganancia y panorama de la pista
        this.trackGain = audioContext.createGain();
        this.trackPan = audioContext.createStereoPanner();

        // Enrutamiento predeterminado (todos los efectos en serie)
        this.connectChain();
    }

    // Conectar la cadena de señal completa
    connectChain() {
        // Desconectar todo primero
        this.disconnectAll();

        // Construir la cadena: Entrada → Efectos → Controles de Pista → Salida
        let currentNode = this.input;

        // Procesamiento pre-amplificador
        currentNode.connect(this.noiseGate.input);
        currentNode = this.noiseGate.output;

        currentNode.connect(this.compressor.input);
        currentNode = this.compressor.output;

        // Simulación de amplificador
        currentNode.connect(this.ampSimulator.input);
        currentNode = this.ampSimulator.output;

        currentNode.connect(this.cabinetSimulator.input);
        currentNode = this.cabinetSimulator.output;

        // Efectos post-amplificador (modulación, basados en tiempo)
        currentNode.connect(this.distortion.input);
        currentNode = this.distortion.output;

        currentNode.connect(this.chorus.input);
        currentNode = this.chorus.output;

        currentNode.connect(this.flanger.input);
        currentNode = this.flanger.output;

        currentNode.connect(this.phaser.input);
        currentNode = this.phaser.output;

        currentNode.connect(this.tremolo.input);
        currentNode = this.tremolo.output;

        currentNode.connect(this.delay.input);
        currentNode = this.delay.output;

        currentNode.connect(this.reverb.input);
        currentNode = this.reverb.output;

        // EQ final
        currentNode.connect(this.eq.input);
        currentNode = this.eq.output;

        // Controles de pista
        currentNode.connect(this.trackGain);
        this.trackGain.connect(this.trackPan);
        this.trackPan.connect(this.output);
    }

    // Desconectar todos los efectos
    disconnectAll() {
        try {
            this.noiseGate.disconnect();
            this.compressor.disconnect();
            this.ampSimulator.disconnect();
            this.cabinetSimulator.disconnect();
            this.distortion.disconnect();
            this.chorus.disconnect();
            this.flanger.disconnect();
            this.phaser.disconnect();
            this.tremolo.disconnect();
            this.delay.disconnect();
            this.reverb.disconnect();
            this.eq.disconnect();
            this.trackGain.disconnect();
            this.trackPan.disconnect();
        } catch (e) {
            // Ignorar errores de desconexión
        }
    }

    // Establecer el volumen de la pista (0-1)
    setVolume(value) {
        this.trackGain.gain.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Establecer el panorama de la pista (-1 a 1)
    setPan(value) {
        this.trackPan.pan.setTargetAtTime(
            value,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Obtener efecto por nombre
    getEffect(name) {
        const effects = {
            'noiseGate': this.noiseGate,
            'compressor': this.compressor,
            'amp': this.ampSimulator,
            'cabinet': this.cabinetSimulator,
            'distortion': this.distortion,
            'chorus': this.chorus,
            'flanger': this.flanger,
            'phaser': this.phaser,
            'tremolo': this.tremolo,
            'delay': this.delay,
            'reverb': this.reverb,
            'eq': this.eq
        };
        return effects[name];
    }

    // Conectar a destino (bus maestro)
    connect(destination) {
        this.output.connect(destination);
    }

    // Desconectar de destino
    disconnect() {
        this.output.disconnect();
    }

    // Limpieza
    destroy() {
        this.disconnectAll();
        this.disconnect();

        // Destruir todos los efectos
        this.noiseGate.destroy();
        this.compressor.destroy();
        this.ampSimulator.destroy();
        this.cabinetSimulator.destroy();
        this.distortion.destroy();
        this.chorus.destroy();
        this.flanger.destroy();
        this.phaser.destroy();
        this.tremolo.destroy();
        this.delay.destroy();
        this.reverb.destroy();
        this.eq.destroy();
    }

}
