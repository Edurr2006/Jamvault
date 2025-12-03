// ========== BPM-SYNCED DELAY ==========
// Professional delay with BPM synchronization and musical subdivisions

import { AudioMath } from '../utils/AudioMath.js';

export class BPMDelay {
    constructor(audioContext) {
        this.audioContext = audioContext;

        // Create nodes
        this.input = audioContext.createGain();
        this.delayNode = audioContext.createDelay(5.0);
        this.feedbackGain = audioContext.createGain();
        this.toneFilter = audioContext.createBiquadFilter();
        this.toneFilter.type = 'lowpass';
        this.toneFilter.frequency.value = 3000;
        this.wetGain = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.output = audioContext.createGain();

        // Stereo ping-pong nodes
        this.leftDelay = audioContext.createDelay(5.0);
        this.rightDelay = audioContext.createDelay(5.0);
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        this.merger = audioContext.createChannelMerger(2);

        // Parameters
        this.bpm = 120;
        this.subdivision = '1/4'; // Musical subdivision
        this.feedback = 0.3; // 0-1
        this.tone = 0.7; // 0-1
        this.mix = 0.3; // 0-1
        this.pingPong = false;
        this.enabled = false;
        this.manualTime = 0.25; // seconds (when not synced to BPM)
        this.syncToBPM = true;

        // Connect mono delay chain:
        // Input -> Delay -> Tone -> Feedback -> Delay
        //       -> Wet -> Output
        this.input.connect(this.delayNode);
        this.delayNode.connect(this.toneFilter);
        this.toneFilter.connect(this.feedbackGain);
        this.feedbackGain.connect(this.delayNode); // Feedback loop
        this.toneFilter.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Dry signal
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Initialize
        this.updateDelayTime();
        this.updateMix();
        this.setFeedback(this.feedback);
        this.setTone(this.tone);
    }

    // Set BPM
    setBPM(bpm) {
        this.bpm = AudioMath.clamp(bpm, 40, 240);
        if (this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Set subdivision
    setSubdivision(subdivision) {
        this.subdivision = subdivision;
        if (this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Set manual delay time (when not synced to BPM)
    setManualTime(seconds) {
        this.manualTime = AudioMath.clamp(seconds, 0.001, 2.0);
        if (!this.syncToBPM) {
            this.updateDelayTime();
        }
    }

    // Toggle BPM sync
    setSyncToBPM(sync) {
        this.syncToBPM = sync;
        this.updateDelayTime();
    }

    // Update delay time based on BPM or manual setting
    updateDelayTime() {
        let delayTime;

        if (this.syncToBPM) {
            delayTime = AudioMath.msToSeconds(AudioMath.bpmToMs(this.bpm, this.subdivision));
        } else {
            delayTime = this.manualTime;
        }

        // Clamp to valid range
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

    // Set feedback amount (0-1)
    setFeedback(value) {
        this.feedback = AudioMath.clamp(value, 0, 0.95); // Max 95% to avoid runaway
        this.feedbackGain.gain.setTargetAtTime(
            this.feedback,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set tone (controls filter in feedback loop)
    setTone(value) {
        this.tone = AudioMath.clamp(value, 0, 1);
        // Map 0-1 to 500Hz-8000Hz
        const freq = AudioMath.mapRange(this.tone, 0, 1, 500, 8000);
        this.toneFilter.frequency.setTargetAtTime(
            freq,
            this.audioContext.currentTime,
            0.01
        );
    }

    // Set wet/dry mix (0-1)
    setMix(value) {
        this.mix = AudioMath.clamp(value, 0, 1);
        this.updateMix();
    }

    // Update wet/dry mix
    updateMix() {
        this.wetGain.gain.setTargetAtTime(
            this.mix,
            this.audioContext.currentTime,
            0.01
        );
        this.dryGain.gain.setTargetAtTime(
            1.0, // Dry always at 100%, wet is added
            this.audioContext.currentTime,
            0.01
        );
    }

    // Enable/disable ping-pong mode
    setPingPong(enabled) {
        this.pingPong = enabled;
        // TODO: Implement stereo ping-pong routing
        // This would require disconnecting mono chain and using stereo delays
    }

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        } else {
            this.updateMix();
        }
    }

    // Preset: Slapback (short, single repeat)
    presetSlapback() {
        this.setSyncToBPM(false);
        this.setManualTime(0.12);
        this.setFeedback(0.1);
        this.setTone(0.8);
        this.setMix(0.3);
    }

    // Preset: Quarter Note (rhythmic)
    presetQuarterNote() {
        this.setSyncToBPM(true);
        this.setSubdivision('1/4');
        this.setFeedback(0.4);
        this.setTone(0.6);
        this.setMix(0.35);
    }

    // Preset: Dotted Eighth (U2 style)
    presetDottedEighth() {
        this.setSyncToBPM(true);
        this.setSubdivision('1/8D');
        this.setFeedback(0.5);
        this.setTone(0.5);
        this.setMix(0.4);
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
