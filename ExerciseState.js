/**
 * ExerciseState.js
 * Gestiona el modelo de datos y la persistencia de los ejercicios.
 * Refactorizado para un modelo de 'Paso' (Step) unificado para soportar Escalas y Acordes de forma intercambiable.
 */

export class ExerciseState {
    constructor() {
        this.STORAGE_KEY = 'jamvault_custom_exercises';
        this.currentExercise = null;
        this.cloudExercises = null; // null significa no cargado/sesión no iniciada
    }

    /**
     * Crea un nuevo objeto de ejercicio normalizado.
     */
    createNew(name, type, level, bpm) {
        this.currentExercise = {
            id: Date.now(),
            name: name || "Nuevo Ejercicio",
            type: type || 'scale', // 'scale' (escala) o 'chord' (acorde)
            level: level || 'Principiante',
            bpm: bpm || 120,
            metronomeEnabled: true,
            createdAt: new Date().toISOString(),
            steps: [] // Array unificado de { kind, data, duration, id }
        };
        // Si es una escala, podríamos querer almacenar el contexto
        if (type === 'scale') {
            this.currentExercise.scaleRoot = "";
            this.currentExercise.scaleType = "";
        }
        return this.currentExercise;
    }

    // --- MANIPULACIÓN ---

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
     * Añade un paso de nota al ejercicio actual.
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
     * Alterna un paso de nota. Si la nota exacta existe, elimina la última ocurrencia.
     * De lo contrario, la añade.
     */
    toggleNoteStep(noteData, duration = 1) {
        if (!this.currentExercise) return;

        const existingIndex = [...this.currentExercise.steps].reverse().findIndex(s =>
            s.kind === 'note' &&
            s.data.string === noteData.string &&
            s.data.fret === noteData.fret
        );

        if (existingIndex !== -1) {
            // Ajustar el índice porque invertimos la búsqueda
            const realIndex = (this.currentExercise.steps.length - 1) - existingIndex;
            this.removeStep(realIndex);
            return null; // Indica eliminación
        } else {
            return this.addNoteStep(noteData, duration);
        }
    }

    /**
     * Añade un paso de acorde al ejercicio actual.
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

    // --- PERSISTENCIA ---

    async save() {
        if (!this.currentExercise) return;

        // Si el usuario está logueado, sincronicemos con el backend
        if (window.jamvaultUser) {
            try {
                const response = await fetch('api/exercises.php?action=save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.currentExercise)
                });
                const data = await response.json();
                if (data.success && data.db_id) {
                    this.currentExercise._db_id = data.db_id;
                }
            } catch(e) {
                console.error("Error al guardar en la nube", e);
            }
        }

        const exercises = this.getAllRaw();
        const index = exercises.findIndex(ex => ex.id === this.currentExercise.id);

        if (index > -1) {
            exercises[index] = this.currentExercise;
        } else {
            exercises.push(this.currentExercise);
        }

        if (this.cloudExercises !== null) {
            // Actualizar el caché local de la nube
            this.cloudExercises = exercises;
        } else {
            // Fallback a localStorage para invitados
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(exercises));
        }
    }

    load(id) {
        const exercises = this.getAllRaw();
        const found = exercises.find(ex => ex.id === id);
        if (found) {
            this.currentExercise = found;
            // Comprobación de migración: si es la estructura antigua, normalizar
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

    getAllRaw() {
        if (this.cloudExercises !== null) {
            return this.cloudExercises;
        }
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    }

    getAll() {
        return this.getAllRaw();
    }

    async delete(id) {
        const exercises = this.getAllRaw();
        const target = exercises.find(ex => ex.id === id);
        
        if (target && target._db_id && window.jamvaultUser) {
            try {
                await fetch('api/exercises.php?action=delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ db_id: target._db_id })
                });
            } catch(e) {
                console.error("Error al eliminar de la nube", e);
            }
        }

        const filtered = exercises.filter(ex => ex.id !== id);
        if (this.cloudExercises !== null) {
            this.cloudExercises = filtered;
        } else {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
        }
    }

    // Nueva función de sincronización para llamar al iniciar sesión/cargar
    async fetchCloudExercises() {
        if (!window.jamvaultUser) {
            this.cloudExercises = null;
            return;
        }
        try {
            const response = await fetch('api/exercises.php?action=list');
            const data = await response.json();
            if (data.success) {
                this.cloudExercises = data.exercises;
            }
        } catch(e) {
            console.error("Error al obtener los ejercicios de la nube", e);
        }
    }
}
