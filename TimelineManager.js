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
        const newStart = clip.startTime;
        const newEnd = clip.startTime + clip.duration;

        // Check for overlaps and handle replacement non-destructively
        const overlapping = this.getOverlappingClips(trackId, newStart, newEnd);

        overlapping.forEach(existingClip => {
            const existingStart = existingClip.startTime;
            const existingEnd = existingClip.startTime + existingClip.duration;

            // Case 1: New clip completely covers existing clip
            if (newStart <= existingStart && newEnd >= existingEnd) {
                this.removeClip(trackId, existingClip.id);
            }
            // Case 2: New clip is strictly inside existing clip (Split)
            else if (newStart > existingStart && newEnd < existingEnd) {
                // Split existing clip into two parts: before and after the new clip

                // Part 1: Before new clip
                const firstDuration = newStart - existingStart;
                const firstClip = {
                    id: this.generateClipId(),
                    startTime: existingStart,
                    duration: firstDuration,
                    audioBuffer: existingClip.audioBuffer,
                    audioBlob: existingClip.audioBlob,
                    bufferOffset: existingClip.bufferOffset || 0
                };

                // Part 2: After new clip
                const secondDuration = existingEnd - newEnd;
                const secondClip = {
                    id: this.generateClipId(),
                    startTime: newEnd,
                    duration: secondDuration,
                    audioBuffer: existingClip.audioBuffer,
                    audioBlob: existingClip.audioBlob,
                    bufferOffset: (existingClip.bufferOffset || 0) + (newEnd - existingStart)
                };

                this.removeClip(trackId, existingClip.id);
                clips.push(firstClip);
                clips.push(secondClip);
            }
            // Case 3: Tail Overlap (New clip starts during existing clip)
            else if (newStart > existingStart && newStart < existingEnd) {
                // Trim end of existing clip
                existingClip.duration = newStart - existingStart;
            }
            // Case 4: Head Overlap (New clip ends during existing clip)
            else if (newEnd > existingStart && newEnd < existingEnd) {
                // Trim start of existing clip
                const trimAmount = newEnd - existingStart;
                existingClip.startTime = newEnd;
                existingClip.duration -= trimAmount;
                existingClip.bufferOffset = (existingClip.bufferOffset || 0) + trimAmount;
            }
        });

        clips.push(clip);

        // Sort by startTime
        clips.sort((a, b) => a.startTime - b.startTime);

        console.log(`Clip added to track ${trackId} (Punch-in applied):`, clip);
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

    moveClip(trackId, clipId, newStartTime, targetTrackId = null) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        // If moving to a different track
        if (targetTrackId && targetTrackId !== trackId) {
            // Remove from old track
            this.removeClip(trackId, clipId);

            // Update clip properties
            clip.startTime = newStartTime;

            // Add to new track (this handles overlaps in the new track)
            this.addClip(targetTrackId, clip);

            console.log(`Clip ${clipId} moved from track ${trackId} to ${targetTrackId} at ${newStartTime}s`);
        } else {
            // Moving within same track
            // We need to temporarily remove it to avoid self-overlap detection issues if we were to use addClip
            // But since we are just changing start time, we can check for overlaps manually or just use addClip logic

            this.removeClip(trackId, clipId);
            clip.startTime = newStartTime;
            this.addClip(trackId, clip);

            console.log(`Clip ${clipId} moved to ${newStartTime}s in track ${trackId}`);
        }

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
