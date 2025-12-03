// ========== PARAMETRIC EQ ==========
// 4-band parametric EQ for precise tone shaping

import { AudioMath } from '../utils/AudioMath.js';

export class ParametricEQ {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Create 4 filter bands
        this.lowShelf = audioContext.createBiquadFilter();
        this.lowMid = audioContext.createBiquadFilter();
        this.highMid = audioContext.createBiquadFilter();
        this.highShelf = audioContext.createBiquadFilter();

        // Configure filter types
        this.lowShelf.type = 'lowshelf';
        this.lowMid.type = 'peaking';
        this.highMid.type = 'peaking';
        this.highShelf.type = 'highshelf';

        // Default parameters
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

        // Connect in series: Input -> Low -> LowMid -> HighMid -> High -> Output
        this.input.connect(this.lowShelf);
        this.lowShelf.connect(this.lowMid);
        this.lowMid.connect(this.highMid);
        this.highMid.connect(this.highShelf);
        this.highShelf.connect(this.output);

        // Initialize
        this.updateAllBands();
    }

    // Set low shelf parameters
    setLowBand(frequency, gain, q = 1) {
        this.bands.low.frequency = AudioMath.clamp(frequency, 20, 500);
        this.bands.low.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.low.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.lowShelf, this.bands.low);
    }

    // Set low-mid peaking parameters
    setLowMidBand(frequency, gain, q = 1) {
        this.bands.lowMid.frequency = AudioMath.clamp(frequency, 200, 2000);
        this.bands.lowMid.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.lowMid.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.lowMid, this.bands.lowMid);
    }

    // Set high-mid peaking parameters
    setHighMidBand(frequency, gain, q = 1) {
        this.bands.highMid.frequency = AudioMath.clamp(frequency, 1000, 8000);
        this.bands.highMid.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.highMid.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.highMid, this.bands.highMid);
    }

    // Set high shelf parameters
    setHighBand(frequency, gain, q = 1) {
        this.bands.high.frequency = AudioMath.clamp(frequency, 2000, 20000);
        this.bands.high.gain = AudioMath.clamp(gain, -24, 24);
        this.bands.high.q = AudioMath.clamp(q, 0.1, 10);
        this.updateBand(this.highShelf, this.bands.high);
    }

    // Update a single band
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

    // Update all bands
    updateAllBands() {
        this.updateBand(this.lowShelf, this.bands.low);
        this.updateBand(this.lowMid, this.bands.lowMid);
        this.updateBand(this.highMid, this.bands.highMid);
        this.updateBand(this.highShelf, this.bands.high);
    }

    // Reset all bands to flat
    reset() {
        this.setLowBand(100, 0, 1);
        this.setLowMidBand(500, 0, 1);
        this.setHighMidBand(2000, 0, 1);
        this.setHighBand(8000, 0, 1);
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Bypass by setting all gains to 0
            this.lowShelf.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.lowMid.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.highMid.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
            this.highShelf.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateAllBands();
        }
    }

    // Preset: Warm (boost lows, cut highs)
    presetWarm() {
        this.setLowBand(100, 3, 1);
        this.setLowMidBand(400, 2, 1.5);
        this.setHighMidBand(2500, -1, 1);
        this.setHighBand(8000, -3, 1);
    }

    // Preset: Bright (boost highs, cut lows)
    presetBright() {
        this.setLowBand(100, -2, 1);
        this.setLowMidBand(500, -1, 1);
        this.setHighMidBand(2500, 2, 1.5);
        this.setHighBand(8000, 4, 1);
    }

    // Preset: Presence (boost mids)
    presetPresence() {
        this.setLowBand(100, 0, 1);
        this.setLowMidBand(800, 3, 2);
        this.setHighMidBand(3000, 4, 2);
        this.setHighBand(8000, 1, 1);
    }

    // Preset: Scoop (cut mids, boost lows and highs)
    presetScoop() {
        this.setLowBand(100, 4, 1);
        this.setLowMidBand(500, -4, 2);
        this.setHighMidBand(2000, -5, 2);
        this.setHighBand(8000, 3, 1);
    }

    // Preset: Telephone (narrow mid focus)
    presetTelephone() {
        this.setLowBand(100, -12, 1);
        this.setLowMidBand(800, 6, 3);
        this.setHighMidBand(2000, 4, 3);
        this.setHighBand(8000, -12, 1);
    }

    // Connect to next node
    connect(destination) {
        this.output.connect(destination);
    }

    // Disconnect
    disconnect() {
        this.output.disconnect();
    }

    // Cleanup
    destroy() {
        this.disconnect();
    }
}
