// ========== TIMELINE MANAGER ==========
// Manages clips, playhead position, and timeline operations

export class TimelineManager {
    constructor() {
        this.clips = new Map(); // trackId -> clips[]
        this.playheadPosition = 0; // seconds
        this.selectedClip = null;
    }

    // ========== CLIP MANAGEMENT ==========

    addClip(trackId, clip) {
        if (!this.clips.has(trackId)) {
            this.clips.set(trackId, []);
        }

        const clips = this.clips.get(trackId);

        // Check for overlaps and handle replacement
        const overlapping = this.getOverlappingClips(trackId, clip.startTime, clip.startTime + clip.duration);

        if (overlapping.length > 0) {
            // Remove or trim overlapping clips
            overlapping.forEach(existingClip => {
                this.removeClip(trackId, existingClip.id);
            });
        }

        clips.push(clip);

        // Sort by startTime
        clips.sort((a, b) => a.startTime - b.startTime);

        console.log(`Clip added to track ${trackId}:`, clip);
        return clip;
    }

    removeClip(trackId, clipId) {
        if (!this.clips.has(trackId)) return false;

        const clips = this.clips.get(trackId);
        const index = clips.findIndex(c => c.id === clipId);

        if (index !== -1) {
            clips.splice(index, 1);
            console.log(`Clip ${clipId} removed from track ${trackId}`);
            return true;
        }

        return false;
    }

    getClip(trackId, clipId) {
        if (!this.clips.has(trackId)) return null;
        return this.clips.get(trackId).find(c => c.id === clipId);
    }

    getClips(trackId) {
        return this.clips.get(trackId) || [];
    }

    getAllClips(trackId) {
        return this.getClips(trackId);
    }

    // ========== CLIP QUERIES ==========

    getClipsInRange(trackId, startTime, endTime) {
        const clips = this.getClips(trackId);
        return clips.filter(clip => {
            const clipEnd = clip.startTime + clip.duration;
            // Clip overlaps with range if:
            // clip starts before range ends AND clip ends after range starts
            return clip.startTime < endTime && clipEnd > startTime;
        });
    }

    getClipsAtTime(trackId, time) {
        const clips = this.getClips(trackId);
        return clips.filter(clip => {
            return time >= clip.startTime && time < clip.startTime + clip.duration;
        });
    }

    getOverlappingClips(trackId, startTime, endTime) {
        return this.getClipsInRange(trackId, startTime, endTime);
    }

    getClipAtPosition(trackId, x, pixelsPerSecond) {
        const time = x / pixelsPerSecond;
        const clips = this.getClipsAtTime(trackId, time);
        return clips[0] || null;
    }

    // ========== CLIP EDITING ==========

    splitClip(trackId, clipId, splitTime) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return null;

        // Validate split time is within clip
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            console.warn('Split time outside clip bounds');
            return null;
        }

        // Calculate durations
        const firstDuration = splitTime - clip.startTime;
        const secondDuration = clip.duration - firstDuration;

        // Create two new clips
        const firstClip = {
            id: this.generateClipId(),
            startTime: clip.startTime,
            duration: firstDuration,
            audioBuffer: clip.audioBuffer, // Same buffer, different playback range
            audioBlob: clip.audioBlob,
            bufferOffset: clip.bufferOffset || 0
        };

        const secondClip = {
            id: this.generateClipId(),
            startTime: splitTime,
            duration: secondDuration,
            audioBuffer: clip.audioBuffer,
            audioBlob: clip.audioBlob,
            bufferOffset: (clip.bufferOffset || 0) + firstDuration
        };

        // Remove original clip
        this.removeClip(trackId, clipId);

        // Add new clips
        this.addClip(trackId, firstClip);
        this.addClip(trackId, secondClip);

        console.log(`Clip ${clipId} split at ${splitTime}s`);
        return { firstClip, secondClip };
    }

    trimClip(trackId, clipId, newStartTime, newDuration) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        // Validate new bounds
        if (newDuration <= 0) {
            console.warn('Invalid clip duration');
            return false;
        }

        // Update clip
        const offsetChange = newStartTime - clip.startTime;
        clip.bufferOffset = (clip.bufferOffset || 0) + offsetChange;
        clip.startTime = newStartTime;
        clip.duration = newDuration;

        console.log(`Clip ${clipId} trimmed to [${newStartTime}, ${newStartTime + newDuration}]`);
        return true;
    }

    moveClip(trackId, clipId, newStartTime) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        clip.startTime = newStartTime;

        // Re-sort clips
        const clips = this.getClips(trackId);
        clips.sort((a, b) => a.startTime - b.startTime);

        console.log(`Clip ${clipId} moved to ${newStartTime}s`);
        return true;
    }

    // ========== SELECTION ==========

    selectClip(trackId, clipId) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        this.selectedClip = { trackId, clipId, clip };
        console.log('Clip selected:', this.selectedClip);
        return true;
    }

    deselectClip() {
        this.selectedClip = null;
    }

    getSelectedClip() {
        return this.selectedClip;
    }

    // ========== PLAYHEAD ==========

    setPlayheadPosition(time) {
        this.playheadPosition = Math.max(0, time);
    }

    getPlayheadPosition() {
        return this.playheadPosition;
    }

    // ========== UTILITIES ==========

    generateClipId() {
        return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    clearTrack(trackId) {
        this.clips.set(trackId, []);
        console.log(`Track ${trackId} cleared`);
    }

    getTrackDuration(trackId) {
        const clips = this.getClips(trackId);
        if (clips.length === 0) return 0;

        const lastClip = clips[clips.length - 1];
        return lastClip.startTime + lastClip.duration;
    }

    getTotalDuration() {
        let maxDuration = 0;

        for (const [trackId, clips] of this.clips) {
            const trackDuration = this.getTrackDuration(trackId);
            maxDuration = Math.max(maxDuration, trackDuration);
        }

        return maxDuration;
    }

    // ========== DEBUG ==========

    getState() {
        const state = {
            playheadPosition: this.playheadPosition,
            selectedClip: this.selectedClip,
            tracks: {}
        };

        for (const [trackId, clips] of this.clips) {
            state.tracks[trackId] = clips.map(c => ({
                id: c.id,
                startTime: c.startTime,
                duration: c.duration,
                bufferOffset: c.bufferOffset || 0
            }));
        }

        return state;
    }
}
