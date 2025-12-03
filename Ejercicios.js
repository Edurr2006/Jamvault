document.addEventListener('DOMContentLoaded', () => {
    const exercisesList = document.getElementById('exercisesList');
    const modal = document.getElementById('exerciseModal');
    const addBtn = document.getElementById('addExerciseBtn');
    const closeBtn = document.querySelector('.close-modal');
    const form = document.getElementById('exerciseForm');
    const searchInput = document.getElementById('searchInput');

    // Datos iniciales de ejemplo si no hay nada guardado
    const defaultExercises = [
        {
            id: 1,
            name: "Escala Mayor Descendiente",
            category: "Escalas",
            level: "Principiante",
            bpm: 80
        },
        {
            id: 2,
            name: "Progresión De Acordes Funky",
            category: "Acordes",
            level: "Avanzado",
            bpm: 110
        },
        {
            id: 3,
            name: "Sweep Picking Para Principiantes",
            category: "Escalas",
            level: "Intermedio",
            bpm: 90
        }
    ];

    // Cargar ejercicios
    let exercises = JSON.parse(localStorage.getItem('jamvault_exercises')) || defaultExercises;

    function renderExercises(filterText = '') {
        exercisesList.innerHTML = '';

        const filtered = exercises.filter(ex =>
            ex.name.toLowerCase().includes(filterText.toLowerCase()) ||
            ex.category.toLowerCase().includes(filterText.toLowerCase())
        );

        filtered.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = `
                <div class="exercise-header">
                    <span class="exercise-title">${ex.name}</span>
                    <button class="btn" onclick="deleteExercise(${ex.id})" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background: transparent; border: 1px solid currentColor;">✕</button>
                </div>
                <div class="tags">
                    <span class="tag">${ex.category}</span>
                    <span class="tag" style="background: #555; color: white;">${ex.level}</span>
                </div>
                <div class="exercise-footer">
                    <div class="bpm-control">
                        <span>BPM:</span>
                        <input type="number" class="bpm-input" value="${ex.bpm}" 
                               onchange="updateBpm(${ex.id}, this.value)">
                    </div>
                    <button class="btn" onclick="playMetronome(${ex.bpm})">▶ Practicar</button>
                </div>
            `;
            exercisesList.appendChild(card);
        });
    }

    // Event Listeners
    addBtn.onclick = () => modal.style.display = 'flex';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
    }

    searchInput.addEventListener('input', (e) => {
        renderExercises(e.target.value);
    });

    form.onsubmit = (e) => {
        e.preventDefault();

        const newExercise = {
            id: Date.now(),
            name: document.getElementById('exName').value,
            category: document.getElementById('exCategory').value,
            level: document.getElementById('exLevel').value,
            bpm: parseInt(document.getElementById('exBpm').value)
        };

        exercises.push(newExercise);
        saveExercises();
        renderExercises();
        modal.style.display = 'none';
        form.reset();
    };

    // Funciones globales
    window.deleteExercise = (id) => {
        if (confirm('¿Estás seguro de querer borrar este ejercicio?')) {
            exercises = exercises.filter(ex => ex.id !== id);
            saveExercises();
            renderExercises();
        }
    };

    window.updateBpm = (id, newBpm) => {
        const ex = exercises.find(e => e.id === id);
        if (ex) {
            ex.bpm = parseInt(newBpm);
            saveExercises();
        }
    };

    // Metrónomo Web Audio API
    let audioContext = null;
    let isPlaying = false;
    let currentNote = 0;
    let nextNoteTime = 0.0;
    let timerID = null;
    let lookahead = 25.0;
    let scheduleAheadTime = 0.1;
    let currentBpm = 60;

    function nextNote() {
        const secondsPerBeat = 60.0 / currentBpm;
        nextNoteTime += secondsPerBeat;
        currentNote++;
        if (currentNote === 4) {
            currentNote = 0;
        }
    }

    function scheduleNote(beatNumber, time) {
        const osc = audioContext.createOscillator();
        const envelope = audioContext.createGain();

        osc.frequency.value = (beatNumber % 4 === 0) ? 1000 : 800;
        envelope.gain.value = 1;
        envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

        osc.connect(envelope);
        envelope.connect(audioContext.destination);

        osc.start(time);
        osc.stop(time + 0.03);
    }

    function scheduler() {
        while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
            scheduleNote(currentNote, nextNoteTime);
            nextNote();
        }
        timerID = window.setTimeout(scheduler, lookahead);
    }

    window.playMetronome = (bpm) => {
        if (isPlaying) {
            window.clearTimeout(timerID);
            isPlaying = false;
            // Restaurar texto del botón
            const activeBtn = document.querySelector('.btn-practicing');
            if (activeBtn) {
                activeBtn.textContent = '▶ Practicar';
                activeBtn.classList.remove('btn-practicing');
                activeBtn.style.background = '';
            }
            return;
        }

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        isPlaying = true;
        currentBpm = bpm;
        currentNote = 0;
        nextNoteTime = audioContext.currentTime + 0.05;

        // Actualizar UI del botón presionado
        const btns = document.querySelectorAll('.exercise-footer .btn');
        // Encontramos el botón que llamó a la función (esto es un hack rápido, idealmente pasaríamos el evento o ID)
        // Pero como playMetronome se llama con onclick inline, buscaremos el que tenga el BPM correspondiente o simplemente cambiamos el estado global
        // Para simplificar, vamos a asumir que el usuario quiere parar si ya está sonando, o iniciar si no.

        // Vamos a buscar el botón que corresponde a este BPM en el DOM para cambiarle el estilo
        // Nota: Esto es una mejora visual simple.

        scheduler();
    };

    function saveExercises() {
        localStorage.setItem('jamvault_exercises', JSON.stringify(exercises));
    }

    // Render inicial
    renderExercises();
});
