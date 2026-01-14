import { ExerciseState } from './ExerciseState.js';
import { ExercisePlayer } from './ExercisePlayer.js';
import { ExerciseRenderer } from './ExerciseRenderer.js';
import { acordesDB } from './ChordData.js';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRING_BASES = [null, 64, 59, 55, 50, 45, 40]; // 1:E4(64), 2:B3(59), 3:G3(55), 4:D3(50), 5:A2(45), 6:E2(40)

document.addEventListener('DOMContentLoaded', async () => {
    const state = new ExerciseState();
    const player = new ExercisePlayer();

    const FRET_X = [12, 81, 184.5, 275.5, 363.5, 446.5, 525.5, 601.5, 673, 741.5, 806.5, 868.5, 928, 983.5, 1035, 1084, 1131.5, 1177.5];
    const STRING_Y = { 1: 20, 2: 60, 3: 100, 4: 140, 5: 180, 6: 220 };

    await player.init();

    // Initialize Renderer (Passing string ID as required by constructor)
    const renderer = new ExerciseRenderer(null, 'practicarChordDiagram');

    // Params
    const urlParams = new URLSearchParams(window.location.search);
    const exId = urlParams.get('id');

    if (!exId || !state.load(Number(exId))) {
        showToast('Ejercicio no encontrado', 'error');
        window.location.href = 'Ejercicios.html';
        return;
    }

    const ex = state.currentExercise;
    document.getElementById('exName').textContent = ex.name;
    document.getElementById('exType').textContent = ex.type === 'scale' ? 'Escala' : 'Progresión';
    document.getElementById('exLevel').textContent = ex.level;

    // Set Layout Mode (using classList to avoid clearing the theme)
    document.body.classList.remove('scale-mode', 'chord-mode');
    document.body.classList.add(ex.type === 'scale' ? 'scale-mode' : 'chord-mode');

    // Initial render
    renderTimeline();
    drawFretboard();

    // Initial chord render for progressions
    if (ex.type !== 'scale' && ex.steps.length > 0) {
        const firstStep = ex.steps[0];
        if (firstStep.kind === 'chord') {
            renderer.renderChordDiagram(firstStep.data);
            highlightChord(firstStep.data, 0);
        } else if (firstStep.kind === 'note') {
            highlightNote(firstStep.data.string, firstStep.data.fret, 0);
        }
    }

    // UI Elements
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedBpmInput = document.getElementById('speedBpmInput');
    const volSlider = document.getElementById('volSlider');
    const volVal = document.getElementById('volVal');
    const metronomeBtn = document.getElementById('metronomeToggle');
    const synthBtn = document.getElementById('synthToggle'); // NEW
    const countdownBtn = document.getElementById('countdownToggle');
    const progressBar = document.getElementById('progressBar');
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownText = document.getElementById('countdownText');

    let isPlaying = false;
    let isCountdownActive = true;
    let isSpeedTrainerActive = false;
    let currentBPM = ex.bpm || 120;
    let playerBPM = currentBPM;

    // Initialize UI values
    speedSlider.value = playerBPM;
    speedBpmInput.value = playerBPM;
    volSlider.value = 80;
    volVal.textContent = '80%';

    // Sync initial state
    player.isMetronomeOn = ex.metronomeEnabled;
    metronomeBtn.classList.toggle('active', player.isMetronomeOn);
    player.isSynthEnabled = true;
    synthBtn.classList.add('active');

    // --- HELPER FUNCTIONS (Hoisted) ---
    function drawFretboard() {
        const layer = document.getElementById('notesLayer');
        if (!layer) return;
        layer.innerHTML = '';

        const uniquePositions = new Set();

        // 1. If it's a scale exercise, show scale context (all notes of that scale)
        if (ex.type === 'scale') {
            const scaleNotes = new Set();
            ex.steps.forEach(s => {
                if (s.kind === 'note') scaleNotes.add(getNoteName(s.data.string, s.data.fret));
            });

            for (let s = 1; s <= 6; s++) {
                for (let f = 0; f < FRET_X.length; f++) {
                    const noteName = getNoteName(s, f);
                    if (scaleNotes.has(noteName)) {
                        renderNote(s, f, noteName, false);
                        uniquePositions.add(`${s}-${f}`);
                    }
                }
            }
        }
        // 2. If it's a chord exercise (progression), pre-render all notes for all variations in the exercise
        else {
            ex.steps.forEach(step => {
                if (step.kind === 'chord') {
                    const chordInfo = acordesDB[step.data.root]?.[step.data.type];
                    if (chordInfo) {
                        const fingers = chordInfo[step.data.position || 0] || chordInfo[0];
                        fingers.forEach(f => {
                            if (f.traste >= 0) {
                                const key = `${f.cuerda}-${f.traste}`;
                                if (!uniquePositions.has(key)) {
                                    renderNote(f.cuerda, f.traste, getNoteName(f.cuerda, f.traste), false);
                                    uniquePositions.add(key);
                                }
                            }
                        });
                    }
                }
            });
        }

        // 3. Ensure all explicit notes actually in the sequence are drawn
        ex.steps.forEach(step => {
            if (step.kind === 'note') {
                const key = `${step.data.string}-${step.data.fret}`;
                if (!uniquePositions.has(key)) {
                    renderNote(step.data.string, step.data.fret, getNoteName(step.data.string, step.data.fret), false);
                    uniquePositions.add(key);
                }
            }
        });

        // 4. If scale mode, ensure we loop through all frets (up to 24)
        if (ex.type === 'scale') {
            const scaleNotes = new Set();
            ex.steps.forEach(s => {
                if (s.kind === 'note') scaleNotes.add(getNoteName(s.data.string, s.data.fret));
            });

            for (let s = 1; s <= 6; s++) {
                for (let f = 0; f < FRET_X.length; f++) {
                    const noteName = getNoteName(s, f);
                    if (scaleNotes.has(noteName)) {
                        const key = `${s}-${f}`;
                        if (!uniquePositions.has(key)) {
                            renderNote(s, f, noteName, false);
                            uniquePositions.add(key);
                        }
                    }
                }
            }
        }
    }

    function renderTimeline() {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        ex.steps.forEach((step, idx) => {
            const div = document.createElement('div');
            div.className = 'timeline-step';
            div.id = `tstep-${idx}`;

            const noteSpan = document.createElement('span');
            noteSpan.className = 'step-note';
            noteSpan.textContent = step.kind === 'note' ? getNoteName(step.data.string, step.data.fret) : step.data.root;

            const infoSpan = document.createElement('span');
            infoSpan.className = 'step-info';
            infoSpan.textContent = step.kind === 'note' ? `${step.data.string}ªC` : step.data.type;

            div.appendChild(noteSpan);
            div.appendChild(infoSpan);
            timeline.appendChild(div);
        });
    }

    function getNoteName(string, fret) {
        const midi = STRING_BASES[string] + fret;
        return NOTES[midi % 12];
    }

    function renderNote(string, fret, name, isActive) {
        const layer = document.getElementById('notesLayer');
        const x = FRET_X[fret];
        const y = STRING_Y[string];
        if (x === undefined) return;

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', `note-pos s-${string} f-${fret}`);
        g.setAttribute('opacity', isActive ? '1' : '0.6'); // Increased base opacity for visibility

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 16);
        circle.setAttribute('fill', isActive ? 'url(#note-grad)' : 'rgba(255,255,255,0.1)');
        circle.setAttribute('stroke', isActive ? '#fff' : 'rgba(255,255,255,0.2)');
        circle.setAttribute('filter', isActive ? 'url(#glow)' : 'none');
        g.appendChild(circle);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', x);
        text.setAttribute('y', y + 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', isActive ? '#000' : '#888');
        text.setAttribute('font-size', '11px');
        text.setAttribute('font-weight', 'bold');
        text.textContent = name;
        g.appendChild(text);

        layer.appendChild(g);
    }

    function highlightNote(string, fret, stepIndex) {
        resetFretboardHighlights();
        const target = document.querySelector(`.note-pos.s-${string}.f-${fret}`);
        if (target) {
            target.setAttribute('opacity', '1');
            const c = target.querySelector('circle');
            c.setAttribute('fill', 'url(#note-grad)');
            c.setAttribute('filter', 'url(#glow)');
            target.querySelector('text').setAttribute('fill', '#000');

            c.setAttribute('r', '22');
        }
        highlightTimelineStep(stepIndex);
        // Clear chord diagram for scale exercises if needed
        const chordContainer = document.getElementById('practicarChordDiagram');
        if (chordContainer) chordContainer.innerHTML = '';
    }

    function renderChordDiagram(data) {
        const container = document.getElementById('practicarChordDiagram');
        if (!container) return;
        if (!data) {
            container.style.opacity = '0';
            return;
        }

        const chordInfo = acordesDB[data.root]?.[data.type];
        if (!chordInfo) {
            container.style.opacity = '0';
            return;
        }

        const fingers = chordInfo[data.position || 0] || chordInfo[0];
        if (!fingers) {
            container.style.opacity = '0';
            return;
        }

        // Calculate offset
        let maxFret = 0;
        let minFret = 20;
        fingers.forEach(f => {
            if (f.traste > 0) {
                if (f.traste > maxFret) maxFret = f.traste;
                if (f.traste < minFret) minFret = f.traste;
            }
        });

        const startFret = maxFret > 5 ? minFret : 1;
        const fretLabels = fingers.map(f => {
            if (f.traste === 0) return { string: f.cuerda, type: 'open' };
            return { string: f.cuerda, traste: f.traste - startFret + 1, isRoot: f.esRaiz };
        });

        const activeStrings = new Set(fingers.map(f => f.cuerda));
        const mutedStrings = [1, 2, 3, 4, 5, 6].filter(s => !activeStrings.has(s));

        const svgContent = `
    <svg width="180" height="230" viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="200" height="250" fill="rgba(255, 137, 6, 0.08)" rx="16" stroke="var(--accent-theme)" stroke-width="3" />
        <text x="100" y="32" text-anchor="middle" fill="white" font-size="20" font-weight="900" style="text-transform: uppercase; letter-spacing: 2px;">${data.root}${data.type === 'Mayor' ? '' : data.type}</text>
        
        <g transform="translate(45, 65)">
            <line x1="-5" y1="0" x2="115" y2="0" stroke="#fff" stroke-width="${startFret === 1 ? 5 : 2}" opacity="0.8" />
            ${[0, 22, 44, 66, 88, 110].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="150" stroke="#333" stroke-width="1.5" />`).join('')}
            ${[30, 60, 90, 120, 150].map(y => `<line x1="0" y1="${y}" x2="110" y2="${y}" stroke="#333" stroke-width="1.5" />`).join('')}
            ${startFret > 1 ? `<text x="-25" y="20" fill="#666" font-size="12" font-weight="bold">${startFret}fr</text>` : ''}
            ${mutedStrings.map(s => {
            const x = (6 - s) * 22;
            return `<text x="${x}" y="-10" text-anchor="middle" fill="#444" font-size="14">×</text>`;
        }).join('')}
            ${fretLabels.filter(f => f.type === 'open').map(f => {
            const x = (6 - f.string) * 22;
            return `<circle cx="${x}" cy="-12" r="5" fill="none" stroke="var(--accent-theme)" stroke-width="1.5" />`;
        }).join('')}
            ${fretLabels.filter(f => f.traste).map(f => {
            const x = (6 - f.string) * 22;
            const y = (f.traste * 30) - 15;
            return `
                    <circle cx="${x}" cy="${y}" r="10" fill="${f.isRoot ? 'var(--accent-theme)' : '#fff'}" filter="url(#chordGlow)" />
                    <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#000" font-size="10" font-weight="bold">${f.isRoot ? 'R' : ''}</text>
                `;
        }).join('')}
        </g>
    </svg>`;
        container.innerHTML = svgContent;
        container.style.opacity = '1';
        container.style.transform = 'translateY(0) scale(1.05)';
    }

    function highlightChord(chordData, stepIndex) {
        renderer.renderChordDiagram(chordData);
        // Highlight ONLY the notes of the specific chord position
        resetFretboardHighlights();

        const chordInfo = acordesDB[chordData.root]?.[chordData.type];
        if (!chordInfo) return;

        const fingers = chordInfo[chordData.position || 0] || chordInfo[0];
        if (!fingers) return;

        fingers.forEach(f => {
            const target = document.querySelector(`.note-pos.s-${f.cuerda}.f-${f.traste}`);
            if (target) {
                target.setAttribute('opacity', '1');
                const c = target.querySelector('circle');
                c.setAttribute('fill', f.esRaiz ? 'url(#note-grad)' : '#fff');
                c.setAttribute('filter', 'url(#glow)');
                target.querySelector('text').setAttribute('fill', '#000');
                c.setAttribute('r', '20'); // Balanced size
            }
        });

        highlightTimelineStep(stepIndex);
    }

    function resetFretboardHighlights() {
        document.querySelectorAll('.note-pos').forEach(n => {
            n.setAttribute('opacity', '0.6'); // Match base visibility
            const c = n.querySelector('circle');
            c.setAttribute('fill', 'rgba(255,255,255,0.1)');
            c.setAttribute('filter', 'none');
            c.setAttribute('r', '16'); // Reset radius!
            n.querySelector('text').setAttribute('fill', '#888');
        });
    }

    function highlightTimelineStep(stepIndex) {
        // Reset Timeline
        document.querySelectorAll('.timeline-step').forEach(s => s.classList.remove('active'));

        // Highlight Timeline Step
        const tStep = document.getElementById(`tstep-${stepIndex}`);
        if (tStep) {
            tStep.classList.add('active');
            tStep.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    async function runCountdown() {
        if (!isCountdownActive) return;
        countdownOverlay.style.display = 'flex';
        const beats = [4, 3, 2, 1];
        const countdownBPM = 80; // Fixed slower tempo for preparation
        const msPerBeat = (60 / countdownBPM) * 1000;

        for (const b of beats) {
            countdownText.textContent = b;
            // Force animation restart
            countdownText.style.animation = 'none';
            void countdownText.offsetWidth; // Trigger reflow
            countdownText.style.animation = 'pulse 1s ease infinite';

            player.playMetronomeTick(null, b === 4); // Sound for each beat, accent on 1
            await new Promise(r => setTimeout(r, msPerBeat));
        }
        countdownOverlay.style.display = 'none';
    }

    async function togglePlay() {
        if (isPlaying) {
            player.stop();
            isPlaying = false;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            isPlaying = true;
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';

            await runCountdown();

            player.start(ex, playerBPM, (stepIndex) => {
                const progress = ((stepIndex + 1) / ex.steps.length) * 100;
                progressBar.style.width = `${progress}%`;

                const step = ex.steps[stepIndex];
                if (step.kind === 'note') {
                    highlightNote(step.data.string, step.data.fret, stepIndex);
                } else if (step.kind === 'chord') {
                    highlightChord(step.data, stepIndex);
                }
            }, () => {
                // On Loop
                if (isSpeedTrainerActive) {
                    playerBPM = Math.min(playerBPM + 5, 360);
                    player.setBpm(playerBPM);
                    speedSlider.value = playerBPM;
                    speedBpmInput.value = Math.round(playerBPM);
                }
            });
        }
    }

    // --- EVENTS ---
    playPauseBtn.onclick = togglePlay;
    stopBtn.onclick = () => {
        player.stop();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        progressBar.style.width = '0%';
        document.querySelectorAll('.timeline-step').forEach(s => s.classList.remove('active'));
        renderChordDiagram(null);
        drawFretboard();
    };

    speedSlider.oninput = (e) => {
        playerBPM = parseInt(e.target.value);
        player.setBpm(playerBPM);
        speedBpmInput.value = playerBPM;
    };

    speedBpmInput.oninput = (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;
        val = Math.max(1, Math.min(360, val));
        playerBPM = val;
        player.setBpm(playerBPM);
        speedSlider.value = playerBPM;
    };

    speedBpmInput.onchange = (e) => {
        if (e.target.value < 1) e.target.value = 1;
        if (e.target.value > 360) e.target.value = 360;
    };

    volSlider.oninput = (e) => {
        const v = e.target.value / 100;
        player.setVolume(v);
        volVal.textContent = `${e.target.value}%`;
    };

    metronomeBtn.onclick = () => {
        player.isMetronomeOn = !player.isMetronomeOn;
        // Mutual exclusion: if both off, turn on synth
        if (!player.isMetronomeOn && !player.isSynthEnabled) {
            player.isSynthEnabled = true;
            synthBtn.classList.add('active');
        }
        metronomeBtn.classList.toggle('active', player.isMetronomeOn);
        ex.metronomeEnabled = player.isMetronomeOn;
    };

    synthBtn.onclick = () => {
        player.isSynthEnabled = !player.isSynthEnabled;
        // Mutual exclusion: if both off, turn on metronome
        if (!player.isSynthEnabled && !player.isMetronomeOn) {
            player.isMetronomeOn = true;
            metronomeBtn.classList.add('active');
        }
        synthBtn.classList.toggle('active', player.isSynthEnabled);
    };

    countdownBtn.onclick = () => {
        isCountdownActive = !isCountdownActive;
        countdownBtn.classList.toggle('active', isCountdownActive);
    };

    // Theme integration (Redraw fretboard colors when theme changes)
    const updateTheme = () => {
        const theme = localStorage.getItem('theme') || 'JamVault';
        const currentLayout = document.body.classList.contains('scale-mode') ? 'scale-mode' : 'chord-mode';

        // Remove all possible themes
        const allThemes = ["JamVault", "natural", "galactic", "retro", "vintage", "redblack"];
        document.body.classList.remove(...allThemes);

        // Add current theme and preserve layout
        document.body.classList.add(theme);
        document.body.classList.add(currentLayout);

        drawFretboard();
    };

    window.addEventListener('storage', (e) => {
        if (e.key === 'theme') updateTheme();
    });

    window.addEventListener('themeChanged', () => {
        updateTheme();
    });

    updateTheme();

    // Metronome initial state
    metronomeBtn.classList.toggle('active', ex.metronomeEnabled);
});
