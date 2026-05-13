// ========== EQ PARAMÉTRICO ==========
// EQ paramétrico de 4 bandas para un modelado preciso del tono

import { AudioMath } from '../utils/AudioMath.js';

export class ParametricEQ {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Crear nodos
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Crear 4 bandas de filtro
        this.lowShelf = audioContext.createBiquadFilter();
        this.lowMid = audioContext.createBiquadFilter();
        this.highMid = audioContext.createBiquadFilter();
        this.highShelf = audioContext.createBiquadFilter();

        // Configurar tipos de filtro
        this.lowShelf.type = 'lowshelf';
        this.lowMid.type = 'peaking';
        this.highMid.type = 'peaking';
        this.highShelf.type = 'highshelf';

        // Parámetros por defecto
        this.bands = {
            low: {
                frequency: 100,
                gain: 0,
                q: 1
            },
            lowMid: {
                frequency: 500,
                gain: 0,
                q: 1
            },
            highMid: {
                frequency: 2000,
                gain: 0,
                q: 1
            },
            high: {
                frequency: 8000,
                gain: 0,
                q: 1
            }
        };

        this.enabled = false;

        // Conectar en serie: Entrada -> Low -> LowMid -> HighMid -> High -> Salida
        this.input.connect(this.lowShelf);
        this.lowShelf.connect(this.lowMid);
        this.lowMid.connect(this.highMid);
        this.highMid.connect(this.highShelf);
        this.highShelf.connect(this.output);

        // Inicializar
        this.updateAllBands();
    }

    // Ajustar parámetros de la banda Low Shelf
    setLowBand(frequency, gain, q = 1) {
        this.bands.low.frequency = AudioMath.clamp(frequency, 20, 500);
        this.bands.low.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.low.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.lowShelf, this.bands.low);
    }

    // Ajustar parámetros de la banda Low-Mid Peaking
    setLowMidBand(frequency, gain, q = 1) {
        this.bands.lowMid.frequency = AudioMath.clamp(frequency, 200, 2000);
        this.bands.lowMid.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.lowMid.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.lowMid, this.bands.lowMid);
    }

    // Ajustar parámetros de la banda High-Mid Peaking
    setHighMidBand(frequency, gain, q = 1) {
        this.bands.highMid.frequency = AudioMath.clamp(frequency, 1000, 8000);
        this.bands.highMid.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.highMid.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.highMid, this.bands.highMid);
    }

    // Ajustar parámetros de la banda High Shelf
    setHighBand(frequency, gain, q = 1) {
        this.bands.high.frequency = AudioMath.clamp(frequency, 2000, 20000);
        this.bands.high.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.high.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.highShelf, this.bands.high);
    }

    // Actualizar una única banda
    updateBand(filter, params) {
        filter.frequency.setTargetAtTime(
            params.frequency,
            this.audioContext.currentTime,
            0.01
        );
        filter.gain.setTargetAtTime(
            params.gain,
            this.audioContext.currentTime,
            0.01
        );
        filter.Q.setTargetAtTime(
            params.q,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Actualizar todas las bandas
    updateAllBands() {
        this.updateBand(this.lowShelf, this.bands.low);
        this.updateBand(this.lowMid, this.bands.lowMid);
        this.updateBand(this.highMid, this.bands.highMid);
        this.updateBand(this.highShelf, this.bands.high);
    }

    // Restablecer todas las bandas (plano)
    reset() {
        this.setLowBand(100, 0, 1);
        this.setLowMidBand(500, 0, 1);
        this.setHighMidBand(2000, 0, 1);
        this.setHighBand(8000, 0, 1);
    }

    // Activar/desactivar
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Bypass poniendo todas las ganancias a 0
            this.lowShelf.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.lowMid.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.highMid.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.highShelf.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateAllBands();
        }
    }

    // Preset: Cálido (realza graves, recorta agudos)
    presetWarm() {
        this.setLowBand(100, 3, 1);
        this.setLowMidBand(400, 2, 1.5);
        this.setHighMidBand(2500, -1, 1);
        this.setHighBand(8000, -3, 1);
    }

    // Preset: Brillante (realza agudos, recorta graves)
    presetBright() {
        this.setLowBand(100, -2, 1);
        this.setLowMidBand(500, -1, 1);
        this.setHighMidBand(2500, 2, 1.5);
        this.setHighBand(8000, 4, 1);
    }

    // Preset: Presencia (realza medios)
    presetPresence() {
        this.setLowBand(100, 0, 1);
        this.setLowMidBand(800, 3, 2);
        this.setHighMidBand(3000, 4, 2);
        this.setHighBand(8000, 1, 1);
    }

    // Preset: Scoop (recorta medios, realza graves y agudos)
    presetScoop() {
        this.setLowBand(100, 4, 1);
        this.setLowMidBand(500, -4, 2);
        this.setHighMidBand(2000, -5, 2);
        this.setHighBand(8000, 3, 1);
    }

    // Preset: Teléfono (enfoque estrecho en medios)
    presetTelephone() {
        this.setLowBand(100, -12, 1);
        this.setLowMidBand(800, 6, 3);
        this.setHighMidBand(2000, 4, 3);
        this.setHighBand(8000, -12, 1);
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
