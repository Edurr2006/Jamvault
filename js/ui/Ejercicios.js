/**
 * Ejercicios.js
 * Controlador integral para el Sistema de Ejercicios Personalizables.
 * Refactorizado para arrastrar y soltar (Drag & Drop) y adición instantánea de notas.
 */

import { ExerciseState } from '../core/ExerciseState.js';
import { ExerciseRenderer } from './ExerciseRenderer.js';
import { ExercisePlayer } from './ExercisePlayer.js';
import { acordesDB } from '../utils/ChordData.js';

// --- TEORÍA MUSICAL (Desacoplado) ---
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    natural_minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic_minor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    // MODOS GRIEGOS
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    // OTRAS ESCALAS
    harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
    melodic_minor: [0, 2, 3, 5, 7, 9, 11]
};

document.addEventListener('DOMContentLoaded', async () => {
    const state = new ExerciseState();
    const renderer = new ExerciseRenderer('scaleCanvasContainer', 'chordCanvasContainer');
    const player = new ExercisePlayer();

    // --- AYUDAS DE SUPERPOSICIÓN DE AUTENTICACIÓN (AUTH OVERLAY) ---
    let wasEverLoggedInEx = false;
    const authOverlayEx = document.getElementById('exercises-auth-overlay');

    const showExOverlay = () => {
        if (authOverlayEx) authOverlayEx.style.display = 'flex';
    };
    const hideExOverlay = () => {
        if (authOverlayEx) authOverlayEx.style.display = 'none';
    };

    // --- INTEGRACIÓN DE AUTENTICACIÓN (AUTH) - Movido arriba para evitar race conditions ---
    window.addEventListener('jamvault:auth_changed', async (e) => {
        if (e.detail) {
            wasEverLoggedInEx = true;
            hideExOverlay();
            await state.fetchCloudExercises();
            renderMainList();
        } else if (wasEverLoggedInEx) {
            wasEverLoggedInEx = false;
            await state.fetchCloudExercises();
            showExOverlay();
            renderMainList();
        } else {
            showExOverlay();
        }
    });

    // Comprobación inicial inmediata
    if (window.jamvaultUser) {
        wasEverLoggedInEx = true;
        hideExOverlay();
    } else {
        showExOverlay();
    }

    // --- CARGA ASÍNCRONA DEL REPRODUCTOR ---
    await player.init();
    if (window.jamvaultUser) {
        await state.fetchCloudExercises();
        renderMainList();
    }

    // --- ELEMENTOS DEL DOM: FLUJO DE TRABAJO DE CREACIÓN ---
    const addExerciseBtn = document.getElementById('addExerciseBtn');
    const creationModal = document.getElementById('creationModal');
    const confirmCreationBtn = document.getElementById('confirmCreationBtn');
    const cancelCreationBtn = document.getElementById('cancelCreationBtn');

    // --- ELEMENTOS DEL DOM: EDITOR ---
    const editorModal = document.getElementById('exerciseEditor');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const playBtn = document.getElementById('editorPlayBtn');
    const stopBtn = document.getElementById('editorStopBtn');
    const saveBtn = document.getElementById('editorSaveBtn');
    const bpmInput = document.getElementById('editorBpm');
    const metronomeCheck = document.getElementById('editorMetronome');
    const sequenceList = document.getElementById('sequenceList');
    const scaleSelectors = document.getElementById('scaleSelectors');
    const scaleRootSel = document.getElementById('scaleRoot');
    const scaleTypeSel = document.getElementById('scaleType');
    const loadScaleBtn = document.getElementById('loadScaleBtn');
    const chordSelectors = document.getElementById('chordSelectorControls');
    const chordRootSel = document.getElementById('editorChordRoot');
    const chordTypeSel = document.getElementById('editorChordType');
    const chordPosSel = document.getElementById('editorChordPosition');
    const addChordBtn = document.getElementById('addChordToTimelineBtn');
    const scaleCanvasContainer = document.getElementById('scaleCanvasContainer');
    const chordCanvasContainer = document.getElementById('chordCanvasContainer');

    // --- ESTADO ---
    let currentScaleContextNotes = [];
    let draggedItemIndex = null;

    renderMainList();

    // --- CALLBACKS DEL REPRODUCTOR (Sincronización visual) ---
    player.setCallbacks(
        (index) => {
            const step = state.currentExercise.steps[index];
            if (step) {
                if (step.kind === 'note') {
                    renderer.highlightStep(step, index);
                } else {
                    // Volver a renderizar la progresión con resaltado específico
                    renderer.renderChordProgression(state.currentExercise.steps, index);
                }
            }
            // Resaltar en la lista
            document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-playing'));
            const activeEl = document.querySelector(`.step-item[data-index="${index}"]`);
            if (activeEl) {
                activeEl.classList.add('active-playing');
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        },
        () => {
            document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-playing'));
            // Restablecer resaltados de progresión
            if (state.currentExercise.type === 'progression') {
                renderer.renderChordProgression(state.currentExercise.steps);
            }
        }
    );

    // --- 1. EVENTOS DEL FLUJO DE TRABAJO DE CREACIÓN ---

    addExerciseBtn.onclick = () => {
        if (!window.jamvaultUser) {
            // Usuario invitado: mostrar modal de login en lugar de crear
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.classList.add('modal-active');
            else showToast("Inicia sesión para crear ejercicios", "info");
            return;
        }
        creationModal.style.display = 'flex';
    };

    cancelCreationBtn.onclick = () => {
        creationModal.style.display = 'none';
        resetCreationForm();
    };

    confirmCreationBtn.onclick = () => {
        const name = document.getElementById('createExName').value;
        const cat = document.getElementById('createExCategory').value;
        const level = document.getElementById('createExLevel').value;
        const bpm = parseInt(document.getElementById('createExBpm').value);

        if (!name) return showToast("Por favor, introduce un nombre", "warning");

        state.createNew(name, cat, level, bpm);
        creationModal.style.display = 'none';
        openEditor();
    };

    // --- 2. NAVEGACIÓN DEL EDITOR ---

    function openEditor(isEdit = false) {
        editorModal.style.display = 'flex';
        const ex = state.currentExercise;
        const editorExName = document.getElementById('editorExName');
        editorExName.value = ex.name;

        // Manejar Renombrado en el Editor
        editorExName.oninput = () => {
            state.updateName(editorExName.value);
        };
        // Feedback visual al enfocar
        editorExName.onfocus = () => editorExName.style.borderColor = 'var(--accent-theme)';
        editorExName.onblur = () => editorExName.style.borderColor = 'transparent';

        bpmInput.value = ex.bpm;
        metronomeCheck.checked = ex.metronomeEnabled;

        // Configuración del modo visual
        if (ex.type === 'scale') {
            scaleSelectors.style.display = 'flex';
            scaleCanvasContainer.style.display = 'block';
            chordSelectors.style.display = 'none';
            chordCanvasContainer.style.display = 'none';

            if (ex.scaleRoot && ex.scaleType) {
                scaleRootSel.value = ex.scaleRoot;
                scaleTypeSel.value = ex.scaleType;
                loadScaleNotes();
            } else {
                // Limpiar estado para nuevo ejercicio
                scaleRootSel.value = "";
                scaleTypeSel.value = "";
                currentScaleContextNotes = [];
                renderer.renderScaleNotes([], [], onNoteSelect, onNoteRightClick);
            }
        } else {
            scaleSelectors.style.display = 'none';
            scaleCanvasContainer.style.display = 'none';
            chordSelectors.style.display = 'block';
            chordCanvasContainer.style.display = 'flex';

            // Para los acordes, también queremos empezar de cero
            chordRootSel.value = "C";
            chordTypeSel.value = "Mayor";
            updateChordPositionSelector();
        }
        refreshAllUI();
    }

    closeEditorBtn.onclick = () => {
        player.stop();
        editorModal.style.display = 'none';
        renderMainList();
    };

    // --- 3. ACCIONES DEL EDITOR ---

    playBtn.onclick = () => {
        if (!state.currentExercise || state.currentExercise.steps.length === 0) return showToast("Añade algunos pasos primero", "info");
        player.setExercise(state.currentExercise);
        player.play();
    };

    stopBtn.onclick = () => player.stop();

    bpmInput.oninput = (e) => {
        const val = parseInt(e.target.value);
        if (isNaN(val)) return;
        state.setBpm(val);
        player.bpm = val;
    };

    metronomeCheck.onchange = (e) => {
        state.setMetronome(e.target.checked);
        player.isMetronomeOn = e.target.checked;
    };

    saveBtn.onclick = async () => {
        await state.save();
        showToast("¡Ejercicio guardado correctamente!", "success");
    };

    // LÓGICA DE ESCALAS
    loadScaleBtn.onclick = loadScaleNotes;

    const onNoteSelect = (note) => {
        state.addNoteStep(note);
        refreshAllUI();
    };

    const onNoteRightClick = (note, e) => {
        const indices = state.currentExercise.steps
            .map((s, i) => (s.kind === 'note' && s.data.string === note.string && s.data.fret === note.fret ? i : null))
            .filter(i => i !== null);

        if (indices.length === 0) return;
        showDeletionMenu(indices, e.clientX, e.clientY);
    };

    function loadScaleNotes() {
        const root = scaleRootSel.value;
        const type = scaleTypeSel.value;
        if (!root || !type) return;

        state.setScaleContext(root, type);
        currentScaleContextNotes = generateScaleTheory(root, type);

        renderer.renderScaleNotes(currentScaleContextNotes, state.currentExercise.steps, onNoteSelect, onNoteRightClick);
    }

    function showDeletionMenu(indices, x, y) {
        // Eliminar menú existente si lo hay
        const existing = document.getElementById('noteContextMenu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'noteContextMenu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.background = '#1a1a1a';
        menu.style.border = '1px solid var(--accent-theme)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '10px';
        menu.style.zIndex = '3000';
        menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        menu.style.minWidth = '120px';

        const title = document.createElement('div');
        title.innerText = 'Eliminar paso:';
        title.style.color = '#888';
        title.style.fontSize = '0.7rem';
        title.style.marginBottom = '8px';
        title.style.textTransform = 'uppercase';
        menu.appendChild(title);

        indices.forEach(idx => {
            const item = document.createElement('button');
            item.className = 'btn';
            item.style.display = 'block';
            item.style.width = '100%';
            item.style.textAlign = 'left';
            item.style.background = 'transparent';
            item.style.color = '#fff';
            item.style.fontSize = '0.8rem';
            item.style.padding = '5px 10px';
            item.style.marginBottom = '2px';

            item.innerText = `Paso ${idx + 1}`;
            item.onmouseover = () => item.style.background = 'var(--accent-dim)';
            item.onmouseout = () => item.style.background = 'transparent';

            item.onclick = () => {
                state.removeStep(idx);
                refreshAllUI();
                menu.remove();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Cerrar menú al hacer clic fuera
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
    }

    // LÓGICA DE ACORDES
    chordRootSel.onchange = updateChordPositionSelector;
    chordTypeSel.onchange = updateChordPositionSelector;
    chordPosSel.onchange = previewSelectedChord;

    function updateChordPositionSelector() {
        const root = chordRootSel.value;
        const type = chordTypeSel.value;
        const positions = acordesDB[root]?.[type] || [];

        chordPosSel.innerHTML = positions.map((_, i) =>
            `<option value="${i}">Variación ${i + 1}</option>`
        ).join('');

        previewSelectedChord();
    }

    function previewSelectedChord() {
        const root = chordRootSel.value;
        const type = chordTypeSel.value;
        const position = parseInt(chordPosSel.value) || 0;
        renderer.renderChordDiagram({ root, type, position });
    }

    addChordBtn.onclick = () => {
        const root = chordRootSel.value;
        const type = chordTypeSel.value;
        const position = parseInt(chordPosSel.value) || 0;
        if (!root || !type) return;

        state.addChordStep({ root, type, position }, 4);
        refreshAllUI();
    };

    function refreshAllUI() {
        updateSequenceUI();
        if (state.currentExercise.type === 'scale') {
            loadScaleNotes();
        } else {
            renderer.renderChordProgression(state.currentExercise.steps);
        }
    }

    // --- 4. LÓGICA DE LA INTERFAZ DE PASOS (CON ARRASTRAR Y SOLTAR) ---

    function updateSequenceUI() {
        sequenceList.innerHTML = '';
        if (state.currentExercise.steps.length === 0) {
            sequenceList.innerHTML = '<div style="color: #444; text-align: center; margin-top: 2rem; font-style: italic;">Sin pasos aún.</div>';
            return;
        }

        state.currentExercise.steps.forEach((step, index) => {
            const div = document.createElement('div');
            div.className = 'step-item';
            div.dataset.index = index;
            div.draggable = true; // IMPORTANTE para DnD

            div.style.background = '#222';
            div.style.border = '1px solid #333';
            div.style.borderRadius = '8px';
            div.style.padding = '12px 15px';
            div.style.marginBottom = '10px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.transition = 'all 0.2s ease';
            div.style.cursor = 'grab';

            const title = step.kind === 'note' ? `${step.data.note}` : `${step.data.root} ${step.data.type}`;
            const sub = step.kind === 'note' ? `str:${step.data.string} fr:${step.data.fret}` : `Acorde`;

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                    <i class="fas fa-ellipsis-v" style="color: #444; font-size: 0.8rem;"></i>
                    <div>
                        <span style="color: var(--accent-theme); font-weight: bold; font-size: 0.9rem;">${index + 1}. ${title}</span>
                        <div style="color: #555; font-size: 0.7rem;">${sub}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="color: #444; font-size: 0.6rem; text-align: center;">DUR</span>
                        <input type="number" step="0.5" value="${step.duration}" class="step-duration" data-index="${index}"
                               style="width: 45px; background: #000; border: 1px solid #333; color: #fff; padding: 2px 4px; border-radius: 4px; font-size: 0.8rem;">
                    </div>
                        <button class="del-btn" data-index="${index}" 
                                style="background: rgba(192, 57, 43, 0.1); border: 1px solid rgba(192, 57, 43, 0.2); color: #E74C3C; 
                                       width: 36px; height: 36px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
                                       display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: bold;"
                                onmouseover="this.style.background='rgba(192, 57, 43, 0.2)'; this.style.borderColor='#C0392B';"
                                onmouseout="this.style.background='rgba(192, 57, 43, 0.1)'; this.style.borderColor='rgba(192, 57, 43, 0.2)';"
                                title="Borrar paso"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                </div>
            `;

            // --- MANEJADORES DE ARRASTRAR Y SOLTAR (DRAG & DROP) ---
            div.ondragstart = (e) => {
                draggedItemIndex = index;
                div.style.opacity = '0.3';
                div.style.background = '#111';
                div.style.border = '1px dashed var(--accent-theme)';
                e.dataTransfer.effectAllowed = 'move';
            };

            div.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                div.style.borderTop = '4px solid var(--accent-theme)';
                div.style.transform = 'translateY(2px)';
                div.style.background = 'var(--accent-dim)';
            };

            div.ondragleave = () => {
                div.style.borderTop = '1px solid #333';
                div.style.transform = 'none';
                div.style.background = '#222';
            };

            div.ondrop = (e) => {
                e.preventDefault();
                div.style.borderTop = '1px solid #333';
                div.style.transform = 'none';
                div.style.background = '#222';
                if (draggedItemIndex !== null && draggedItemIndex !== index) {
                    state.moveStep(draggedItemIndex, index);
                    refreshAllUI();
                }
            };

            div.ondragend = () => {
                div.style.opacity = '1';
                div.style.background = '#222';
                div.style.border = '1px solid #333';
                div.style.transform = 'none';
                draggedItemIndex = null;
            };

            // Vinculación de eventos para los controles
            div.querySelector('.step-duration').onchange = (e) => {
                state.updateStepDuration(index, e.target.value);
            };

            div.querySelector('.del-btn').onclick = () => {
                state.removeStep(index);
                refreshAllUI();
            };

            sequenceList.appendChild(div);
        });
    }

    function refreshAllUI() {
        updateSequenceUI();
        if (state.currentExercise.type === 'scale') {
            loadScaleNotes();
        } else {
            renderer.renderChordProgression(state.currentExercise.steps);
        }
    }

    // --- 5. AYUDAS (HELPERS) ---

    function resetCreationForm() {
        document.getElementById('createExName').value = '';
        document.getElementById('createExBpm').value = '120';
    }

    function generateScaleTheory(root, type) {
        const rootIdx = NOTES.indexOf(root);
        const pattern = SCALES[type];
        if (!pattern) return [];
        const allowed = pattern.map(i => (rootIdx + i) % 12);
        const res = [];

        // Base de tono científico para cuerdas al aire: 
        // 6:Mi2(40), 5:La2(45), 4:Re3(50), 3:Sol3(55), 2:Si3(59), 1:Mi4(64)
        const stringBases = {
            6: { idx: 4, oct: 2 },
            5: { idx: 9, oct: 2 },
            4: { idx: 2, oct: 3 },
            3: { idx: 7, oct: 3 },
            2: { idx: 11, oct: 3 },
            1: { idx: 4, oct: 4 }
        };

        for (let s = 1; s <= 6; s++) {
            const base = stringBases[s];
            for (let f = 0; f <= 17; f++) {
                const totalSemi = (base.oct + 1) * 12 + base.idx + f;
                const noteOctave = Math.floor(totalSemi / 12) - 1;
                const nIdx = totalSemi % 12;

                if (allowed.includes(nIdx)) {
                    res.push({ note: NOTES[nIdx], string: s, fret: f, octave: noteOctave });
                }
            }
        }
        return res;
    }

    function renderMainList() {
        const listContainer = document.getElementById('exercisesList');
        if (!listContainer) return;
        const exercises = state.getAll();
        listContainer.innerHTML = '';

        if (exercises.length === 0) {
            listContainer.innerHTML = '<p style="color:#666; text-align:center;">No hay ejercicios personalizados.</p>';
            return;
        }

        exercises.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';

            // Generate clean class names for badges (Matches CSS now)
            const typeClass = `tag-category-${ex.type.toLowerCase()}`;
            const levelClass = `tag-level-${ex.level.toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')}`;

            card.innerHTML = `
                <div class="exercise-main-info" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="exercise-header">
                        <span class="exercise-title">${ex.name}</span>
                        <div class="tags">
                            <span class="tag ${typeClass}">${ex.type === 'scale' ? 'Escalas' : 'Acordes'}</span>
                            <span class="tag ${levelClass}">${ex.level}</span>
                        </div>
                    </div>
                </div>
                <div class="exercise-actions">
                    <button class="action-btn practice-btn"><i class="fas fa-play-circle" style="margin-right: 8px;"></i>PRACTICAR</button>
                    <button class="action-btn edit-btn"><i class="fas fa-edit" style="margin-right: 8px;"></i>EDITAR</button>
                    <button class="action-btn rename-btn" style="background: rgba(255,255,255,0.05); color: #888; border: 1px solid rgba(255,255,255,0.1);"><i class="fas fa-font" style="margin-right: 8px;"></i>RENOMBRAR</button>
                    <button class="delete-ex-btn" title="Eliminar"><i class="fas fa-trash-alt" style="margin-right: 8px;"></i>ELIMINAR</button>
                </div>
            `;

            // El clic en la tarjeta alterna la expansión
            card.onclick = (e) => {
                // Ignorar si se hace clic en borrar o en los botones de acción
                if (e.target.closest('.delete-ex-btn') || e.target.closest('.action-btn')) return;

                const wasActive = card.classList.contains('active');
                // Cerrar otros
                document.querySelectorAll('.exercise-card').forEach(c => c.classList.remove('active'));
                // Alternar este
                if (!wasActive) card.classList.add('active');
            };

            // Edit Button
            card.querySelector('.edit-btn').onclick = (e) => {
                e.stopPropagation();
                state.load(ex.id);
                openEditor(true);
            };

            // Rename Button
            card.querySelector('.rename-btn').onclick = (e) => {
                e.stopPropagation();
                showPrompt(`Nuevo nombre para "${ex.name}":`, ex.name, async (newName) => {
                    state.load(ex.id);
                    state.updateName(newName);
                    await state.save();
                    renderMainList();
                    showToast("¡Renombrado con éxito!", "success");
                });
            };

            // Practice Button
            card.querySelector('.practice-btn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = `Practicar.html?id=${ex.id}`;
            };

            // El clic en borrar gestiona la eliminación
            card.querySelector('.delete-ex-btn').onclick = (e) => {
                e.stopPropagation();
                showConfirm(`¿Estás seguro de que quieres borrar "${ex.name}"?`, async () => {
                    await state.delete(ex.id);
                    renderMainList();
                    showToast("Ejercicio eliminado", "info");
                });
            };

            listContainer.appendChild(card);
        });
    }

    // Comprobar en la carga inicial si el usuario ya está establecido (Ya manejado arriba)
});
