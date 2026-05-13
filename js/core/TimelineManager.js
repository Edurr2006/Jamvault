// ========== GESTOR DE LÍNEA DE TIEMPO ==========
// Gestiona clips, posición del cabezal de reproducción y operaciones de la línea de tiempo

export class TimelineManager {
    constructor() {
        this.clips = new Map(); // trackId -> clips[]
        this.playheadPosition = 0; // segundos
        this.selectedClip = null;
    }

    // ========== GESTIÓN DE CLIPS ==========

    addClip(trackId, clip, ripple = false) {
        trackId = Number(trackId);
        if (!this.clips.has(trackId)) {
            this.clips.set(trackId, []);
        }

        const clips = this.clips.get(trackId);
        const newStart = clip.startTime;
        const newEnd = clip.startTime + clip.duration;

        // Si NO es ripple (Modo Punch-in/Sobrescribir - predeterminado para grabación)
        if (!ripple) {
            // Comprobar solapamientos y manejar el reemplazo de forma no destructiva
            const overlapping = this.getOverlappingClips(trackId, newStart, newEnd);

            overlapping.forEach(existingClip => {
                const existingStart = existingClip.startTime;
                const existingEnd = existingClip.startTime + existingClip.duration;

                // Caso 1: El nuevo clip cubre completamente al clip existente
                if (newStart <= existingStart && newEnd >= existingEnd) {
                    this.removeClip(trackId, existingClip.id);
                }
                // Caso 2: El nuevo clip está estrictamente dentro del clip existente (Dividir)
                else if (newStart > existingStart && newEnd < existingEnd) {
                    // Dividir el clip existente en dos partes: antes y después del nuevo clip

                    // Parte 1: Antes del nuevo clip
                    const firstDuration = newStart - existingStart;
                    const firstClip = {
                        id: this.generateClipId(),
                        startTime: existingStart,
                        duration: firstDuration,
                        audioBuffer: existingClip.audioBuffer,
                        audioBlob: existingClip.audioBlob,
                        bufferOffset: existingClip.bufferOffset || 0
                    };

                    // Parte 2: Después del nuevo clip
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
                // Caso 3: Solapamiento al final (El nuevo clip comienza durante el clip existente)
                else if (newStart > existingStart && newStart < existingEnd) {
                    // Recortar el final del clip existente
                    existingClip.duration = newStart - existingStart;
                }
                // Caso 4: Solapamiento al inicio (El nuevo clip termina durante el clip existente)
                else if (newEnd > existingStart && newEnd < existingEnd) {
                    // Recortar el inicio del clip existente
                    const trimAmount = newEnd - existingStart;
                    existingClip.startTime = newEnd;
                    existingClip.duration -= trimAmount;
                    existingClip.bufferOffset = (existingClip.bufferOffset || 0) + trimAmount;
                }
            });
        }

        clips.push(clip);

        // Ordenar por startTime
        clips.sort((a, b) => a.startTime - b.startTime);

        // Si es modo Ripple, resolver solapamientos empujando
        if (ripple) {
            this.resolveOverlaps(trackId);
        }

        console.log(`Clip añadido a la pista ${trackId} (Ripple: ${ripple})`, clip);
        return clip;
    }

    resolveOverlaps(trackId) {
        if (!this.clips.has(trackId)) return;
        const clips = this.clips.get(trackId);

        // Ordenar clips por tiempo de inicio
        clips.sort((a, b) => a.startTime - b.startTime);

        for (let i = 0; i < clips.length - 1; i++) {
            const current = clips[i];
            const next = clips[i + 1];
            const currentEnd = current.startTime + current.duration;

            if (currentEnd > next.startTime) {
                // ¡Solapamiento detectado! Empujar el 'siguiente' clip hacia adelante
                const shiftAmount = currentEnd - next.startTime;
                next.startTime += shiftAmount;
                // Continuar el bucle, este desplazamiento podría causar solapamiento con el *siguiente* clip
            }
        }
    }

    removeClip(trackId, clipId) {
        trackId = Number(trackId);
        if (!this.clips.has(trackId)) return false;

        const clips = this.clips.get(trackId);
        const index = clips.findIndex(c => c.id === clipId);

        if (index !== -1) {
            clips.splice(index, 1);
            console.log(`Clip ${clipId} eliminado de la pista ${trackId}`);
            return true;
        }

        return false;
    }

    getClip(trackId, clipId) {
        if (!this.clips.has(trackId)) return null;
        return this.clips.get(trackId).find(c => c.id === clipId);
    }

    getClips(trackId) {
        return this.clips.get(Number(trackId)) || [];
    }

    getAllClips(trackId) {
        return this.getClips(trackId);
    }

    // ========== CONSULTAS DE CLIPS ==========

    getClipsInRange(trackId, startTime, endTime) {
        const clips = this.getClips(trackId);
        return clips.filter(clip => {
            const clipEnd = clip.startTime + clip.duration;
            // El clip se solapa con el rango si:
            // el clip comienza antes de que termine el rango Y el clip termina después de que comience el rango
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

    // ========== EDICIÓN DE CLIPS ==========

    splitClip(trackId, clipId, splitTime) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return null;

        // Validar que el tiempo de división esté dentro del clip
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            console.warn('Tiempo de división fuera de los límites del clip');
            return null;
        }

        // Calcular duraciones
        const firstDuration = splitTime - clip.startTime;
        const secondDuration = clip.duration - firstDuration;

        // Crear dos nuevos clips
        const firstClip = {
            id: this.generateClipId(),
            startTime: clip.startTime,
            duration: firstDuration,
            audioBuffer: clip.audioBuffer, // Mismo buffer, diferente rango de reproducción
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

        // Eliminar clip original
        this.removeClip(trackId, clipId);

        // Añadir nuevos clips
        this.addClip(trackId, firstClip);
        this.addClip(trackId, secondClip);

        console.log(`Clip ${clipId} dividido en ${splitTime}s`);
        return { firstClip, secondClip };
    }

    trimClip(trackId, clipId, newStartTime, newDuration) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        // Validar nuevos límites
        if (newDuration <= 0) {
            console.warn('Duración del clip inválida');
            return false;
        }

        // Actualizar clip
        const offsetChange = newStartTime - clip.startTime;
        clip.bufferOffset = (clip.bufferOffset || 0) + offsetChange;
        clip.startTime = newStartTime;
        clip.duration = newDuration;

        console.log(`Clip ${clipId} recortado a [${newStartTime}, ${newStartTime + newDuration}]`);
        return true;
    }

    moveClip(trackId, clipId, newStartTime, targetTrackId = null) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        // Crear una copia del clip con nuevas propiedades para asegurar un estado limpio
        const newClip = { ...clip, startTime: newStartTime };

        // Si se mueve a una pista diferente
        if (targetTrackId && targetTrackId !== trackId) {
            // Eliminar de la pista vieja PRIMERO
            this.removeClip(trackId, clipId);

            // Añadir a la nueva pista (esto maneja solapamientos en la nueva pista)
            // Usamos el mismo ID para preservar la identidad si es posible, o dejamos que addClip lo maneje
            // Idealmente queremos mantener el ID a menos que haya conflicto
            this.addClip(targetTrackId, newClip, true);

            console.log(`Clip ${clipId} movido de la pista ${trackId} a ${targetTrackId} en ${newStartTime}s`);
        } else {
            // Mover dentro de la misma pista
            this.removeClip(trackId, clipId);
            this.addClip(trackId, newClip, true);

            console.log(`Clip ${clipId} movido a ${newStartTime}s en la pista ${trackId}`);
        }

        return true;
    }

    // ========== SELECCIÓN ==========

    selectClip(trackId, clipId) {
        const clip = this.getClip(trackId, clipId);
        if (!clip) return false;

        this.selectedClip = { trackId, clipId, clip };
        console.log('Clip seleccionado:', this.selectedClip);
        return true;
    }

    deselectClip() {
        this.selectedClip = null;
    }

    getSelectedClip() {
        return this.selectedClip;
    }

    // ========== CABEZAL DE REPRODUCCIÓN ==========

    setPlayheadPosition(time) {
        this.playheadPosition = Math.max(0, time);
    }

    getPlayheadPosition() {
        return this.playheadPosition;
    }

    // ========== UTILIDADES ==========

    generateClipId() {
        return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    clearTrack(trackId) {
        this.clips.set(trackId, []);
        console.log(`Pista ${trackId} limpiada`);
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

    // ========== DEPURACIÓN ==========

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
