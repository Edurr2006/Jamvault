/**
 * ExerciseState.js
 * Manages the data model and persistence for exercises.
 * Refactored for a unified 'Step' model to support Scales and Chords interchangeably.
 */

export class ExerciseState {
    constructor() {
        this.STORAGE_KEY = 'jamvault_custom_exercises';
        this.currentExercise = null;
    }

    /**
     * Creates a new normalized exercise object.
     */
    createNew(name, type, level, bpm) {
        this.currentExercise = {
            id: Date.now(),
            name: name || "Nuevo Ejercicio",
            type: type || 'scale', // 'scale' or 'chord'
            level: level || 'Principiante',
            bpm: bpm || 120,
            metronomeEnabled: true,
            createdAt: new Date().toISOString(),
            steps: [] // Unified array of { kind, data, duration, id }
        };
        // If scale, we might want to store context
        if (type === 'scale') {
            this.currentExercise.scaleRoot = "";
            this.currentExercise.scaleType = "";
        }
        return this.currentExercise;
    }

    // --- MANIPULATION ---

    setBpm(bpm) {
        if (this.currentExercise) this.currentExercise.bpm = bpm;
    }

    setMetronome(enabled) {
        if (this.currentExercise) this.currentExercise.metronomeEnabled = enabled;
    }

    updateName(newName) {
        if (this.currentExercise) this.currentExercise.name = newName;
    }

    setScaleContext(root, type) {
        if (this.currentExercise && this.currentExercise.type === 'scale') {
            this.currentExercise.scaleRoot = root;
            this.currentExercise.scaleType = type;
        }
    }

    /**
     * Adds a note step to the current exercise.
     */
    addNoteStep(noteData, duration = 1) {
        if (!this.currentExercise) return;
        const step = {
            id: 'step_' + Date.now() + Math.random().toString(36).substr(2, 5),
            kind: 'note',
            data: {
                note: noteData.note,
                string: noteData.string,
                fret: noteData.fret,
                octave: noteData.octave || 3
            },
            duration: duration
        };
        this.currentExercise.steps.push(step);
        return step;
    }

    /**
     * Toggles a note step. If the exact note exists, removes the last occurrence.
     * Otherwise adds it.
     */
    toggleNoteStep(noteData, duration = 1) {
        if (!this.currentExercise) return;

        const existingIndex = [...this.currentExercise.steps].reverse().findIndex(s =>
            s.kind === 'note' &&
            s.data.string === noteData.string &&
            s.data.fret === noteData.fret
        );

        if (existingIndex !== -1) {
            // Adjust index because we reversed the search
            const realIndex = (this.currentExercise.steps.length - 1) - existingIndex;
            this.removeStep(realIndex);
            return null; // Indicates removal
        } else {
            return this.addNoteStep(noteData, duration);
        }
    }

    /**
     * Adds a chord step to the current exercise.
     */
    addChordStep(chordData, duration = 4) {
        if (!this.currentExercise) return;
        const step = {
            id: 'step_' + Date.now() + Math.random().toString(36).substr(2, 5),
            kind: 'chord',
            data: {
                root: chordData.root,
                type: chordData.type,
                position: chordData.position || 0
            },
            duration: duration
        };
        this.currentExercise.steps.push(step);
        return step;
    }

    removeStep(index) {
        if (this.currentExercise && this.currentExercise.steps[index]) {
            this.currentExercise.steps.splice(index, 1);
        }
    }

    updateStepDuration(index, duration) {
        if (this.currentExercise && this.currentExercise.steps[index]) {
            this.currentExercise.steps[index].duration = parseFloat(duration);
        }
    }

    moveStep(fromIndex, toIndex) {
        if (!this.currentExercise) return;
        const steps = this.currentExercise.steps;
        if (toIndex < 0 || toIndex >= steps.length) return;

        const element = steps.splice(fromIndex, 1)[0];
        steps.splice(toIndex, 0, element);
    }

    // --- PERSISTENCE ---

    save() {
        if (!this.currentExercise) return;
        const exercises = this.getAll();
        const index = exercises.findIndex(ex => ex.id === this.currentExercise.id);

        if (index > -1) {
            exercises[index] = this.currentExercise;
        } else {
            exercises.push(this.currentExercise);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(exercises));
    }

    load(id) {
        const exercises = this.getAll();
        const found = exercises.find(ex => ex.id === id);
        if (found) {
            this.currentExercise = found;
            // Migration check: if old structure, normalize
            if (!this.currentExercise.steps) {
                this.currentExercise.steps = [];
                if (this.currentExercise.sequence) {
                    this.currentExercise.sequence.forEach(n => this.addNoteStep(n));
                    delete this.currentExercise.sequence;
                }
                if (this.currentExercise.progression) {
                    this.currentExercise.progression.forEach(c => this.addChordStep(c, c.duration));
                    delete this.currentExercise.progression;
                }
            }
            return this.currentExercise;
        }
        return null;
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    }

    delete(id) {
        const exercises = this.getAll().filter(ex => ex.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(exercises));
    }
}
