import { acordesDB } from './ChordData.js';

export class ExerciseRenderer {
    constructor(scaleContainerId, chordContainerId) {
        this.scaleContainer = document.getElementById(scaleContainerId);
        this.chordContainer = document.getElementById(chordContainerId);

        // Coordenadas de los trastes
        this.FRET_X = [12, 81, 184.5, 275.5, 363.5, 446.5, 525.5, 601.5, 673, 741.5, 806.5, 868.5, 928, 983.5, 1035, 1084, 1131.5, 1177.5];
        this.STRING_Y = { 1: 20, 2: 60, 3: 100, 4: 140, 5: 180, 6: 220 };

        this.initScaleCanvas();
    }

    initScaleCanvas() {
        if (!this.scaleContainer) return;
        const svgContent = `
        <svg id="exFretboard" width="100%" height="100%" viewBox="-30 0 1260 272" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="chordGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <radialGradient id="note-active-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#fff;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:var(--accent-theme);stop-opacity:1" />
                </radialGradient>
                <radialGradient id="note-playback-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#fff;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#fff;stop-opacity:1" />
                </radialGradient>
            </defs>

            <!-- Fondo del mástil -->
            <rect x="0" y="20" width="1209" height="200" fill="#141416" rx="8" />
            
            <!-- Marcadores de posición (Inlays) -->
            <g opacity="0.15">
                ${[275.5, 446.5, 601.5, 741.5, 1084, 1177.5].map(x => `<circle cx="${x}" cy="120" r="6" fill="white" />`).join('')}
                <circle cx="928" cy="60" r="6" fill="white" />
                <circle cx="928" cy="180" r="6" fill="white" />
            </g>

            <!-- Cuerdas -->
            <g stroke="#fff" stroke-opacity="0.3">
                ${[20, 60, 100, 140, 180, 220].map((y, i) => `<line x1="24" y1="${y}" x2="1209" y2="${y}" stroke-width="${1 + (i * 0.2)}" />`).join('')}
            </g>

            <!-- Cejuela -->
            <line x1="23.99" y1="20" x2="23.99" y2="220" stroke="white" stroke-width="5" opacity="0.9" />

            <!-- Trastes -->
            ${[138, 231, 320, 407, 486, 565, 638, 708, 775, 838, 899, 957, 1010, 1060, 1108, 1155, 1200].map(x => `<line x1="${x}" y1="20" x2="${x}" y2="220" stroke="#fff" stroke-width="2" opacity="0.4" />`).join('')}
            
            <g id="exNotesLayer"></g>
        </svg>`;
        this.scaleContainer.innerHTML = svgContent;
    }

    renderScaleNotes(allNotes, steps, onNoteClick, onNoteRightClick) {
        const layer = document.getElementById('exNotesLayer');
        if (!layer) return;
        layer.innerHTML = '';

        allNotes.forEach(note => {
            const x = this.FRET_X[note.fret];
            const y = this.STRING_Y[note.string];

            const stepIndices = steps
                .map((s, i) => (s.kind === 'note' && s.data.string === note.string && s.data.fret === note.fret ? i + 1 : null))
                .filter(i => i !== null);

            const isSelected = stepIndices.length > 0;

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute('class', 'ex-note');
            g.style.cursor = 'pointer';
            g.onclick = (e) => onNoteClick(note, e);
            g.oncontextmenu = (e) => {
                if (onNoteRightClick) {
                    e.preventDefault();
                    onNoteRightClick(note, e);
                }
            };

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 16);
            circle.setAttribute('class', 'note-circle');
            circle.setAttribute('data-string', note.string);
            circle.setAttribute('data-fret', note.fret);

            if (isSelected) {
                circle.setAttribute('fill', 'url(#note-active-gradient)');
                circle.setAttribute('filter', 'url(#glow)');
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', '1.5');
            } else {
                circle.setAttribute('fill', '#2a2a2e');
                circle.setAttribute('fill-opacity', '0.8');
                circle.setAttribute('stroke', '#444');
                circle.setAttribute('stroke-width', '1');
            }

            g.appendChild(circle);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', x);
            text.setAttribute('y', y + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', isSelected ? '#000' : '#888');
            text.setAttribute('font-size', '11px');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('pointer-events', 'none');
            text.textContent = isSelected ? stepIndices.join(',') : note.note;
            g.appendChild(text);

            layer.appendChild(g);
        });
    }

    renderChordDiagram(data) {
        if (!this.chordContainer) return;
        if (!data) {
            this.chordContainer.innerHTML = '';
            return;
        }

        // Previsualización grande dedicada para acordes individuales
        const svg = this._generateChordSVG(data, {
            width: 320,
            height: 420,
            viewBox: "0 0 220 280",
            isHighlighted: true,
            isLarge: true
        });

        this.chordContainer.innerHTML = `
            <div class="chord-preview-large" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; animation: fadeIn 0.3s ease;">
                ${svg}
            </div>
        `;
    }

    /**
     * Ayuda interna para generar una cadena SVG de acorde.
     */
    _generateChordSVG(data, options = {}) {
        const { width = 140, height = 210, viewBox = "0 0 220 280", isHighlighted = false, isLarge = false } = options;

        const chordInfo = acordesDB[data.root]?.[data.type];
        if (!chordInfo) return '';

        const fingers = chordInfo[data.position || 0] || chordInfo[0];
        if (!fingers) return '';

        // Calcular desplazamiento
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
            const visualFret = f.traste - startFret + 1;
            return { string: f.cuerda, traste: visualFret, realTraste: f.traste, isRoot: f.esRaiz };
        });

        const activeStrings = new Set(fingers.map(f => f.cuerda));
        const mutedStrings = [1, 2, 3, 4, 5, 6].filter(s => !activeStrings.has(s));

        // --- DETECTAR CEJILLAS ---
        const barreGroups = {};
        fingers.forEach(f => {
            if (f.dedo === 1 && f.traste > 0) {
                if (!barreGroups[f.traste]) barreGroups[f.traste] = [];
                barreGroups[f.traste].push(f);
            }
        });

        const barreNotes = new Set();
        let barreSvg = "";
        Object.keys(barreGroups).forEach(t => {
            const notes = barreGroups[t];
            if (notes.length >= 2) {
                const traste = parseInt(t);
                const visualFret = traste - startFret + 1;
                const y = (visualFret * 35) - 17.5;

                let minX = 1000, maxX = 0;
                notes.forEach(n => {
                    barreNotes.add(n);
                    const x = (6 - n.cuerda) * 25;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                });

                const w = (maxX - minX) + 20;
                barreSvg += `
                    <g class="barre-group">
                        <rect x="${minX - 10}" y="${y - 12}" width="${w}" height="24" rx="12" 
                              fill="${isHighlighted ? '#fff' : 'var(--accent-theme)'}" filter="url(#chordGlow)" />
                        <text x="${(minX + maxX) / 2}" y="${y + 5}" text-anchor="middle" fill="#000" font-size="12" font-weight="bold">1</text>
                    </g>
                `;
            }
        });

        return `
            <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="chordGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect x="5" y="5" width="210" height="270" fill="${isHighlighted ? 'rgba(255,137,6,0.12)' : '#050505'}" rx="16" 
                      stroke="${isHighlighted ? 'var(--accent-theme)' : 'rgba(255,255,255,0.1)'}" 
                      stroke-width="${isHighlighted ? '3' : '1'}" 
                      style="transition: all 0.2s ease;" />
                
                <text x="110" y="35" text-anchor="middle" fill="${isHighlighted ? 'white' : 'var(--accent-theme)'}" 
                      font-size="22" font-weight="900" style="text-transform: uppercase; letter-spacing: 2px;">${data.root}${data.type === 'Mayor' ? '' : data.type}</text>
                
                <text x="110" y="55" text-anchor="middle" fill="#888" 
                      font-size="14" font-weight="bold" style="letter-spacing: 3px;">${[6, 5, 4, 3, 2, 1].map(s => {
            const f = fingers.find(f => f.cuerda === s);
            return f ? f.traste : 'X';
        }).join(' ')}</text>

                <g transform="translate(45, 90)">
                    <line x1="-5" y1="0" x2="130" y2="0" stroke="#fff" stroke-width="${startFret === 1 ? 6 : 2}" opacity="0.9" />
                    ${[0, 25, 50, 75, 100, 125].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="175" stroke="#333" stroke-width="1.5" />`).join('')}
                    ${[35, 70, 105, 140, 175].map(y => `<line x1="0" y1="${y}" x2="125" y2="${y}" stroke="#333" stroke-width="1.5" />`).join('')}
                    
                    ${startFret > 1 ? `
                    <g transform="translate(-35, 15)">
                        <text fill="var(--accent-theme)" font-size="14" font-weight="900" text-anchor="middle">${startFret}</text>
                        <text y="12" fill="#444" font-size="8" font-weight="bold" text-anchor="middle">FR</text>
                    </g>` : ''}

                    ${mutedStrings.map(s => {
            const x = (6 - s) * 25;
            return `<text x="${x}" y="-12" text-anchor="middle" fill="#333" font-size="16" font-weight="bold">×</text>`;
        }).join('')}
                    ${fretLabels.filter(f => f.type === 'open').map(f => {
            const x = (6 - f.string) * 25;
            return `<circle cx="${x}" cy="-15" r="6" fill="none" stroke="var(--accent-theme)" stroke-width="2" />`;
        }).join('')}

                    ${barreSvg}

                    ${fingers.filter(f => f.traste > 0 && !barreNotes.has(f)).map(f => {
            const visualFret = f.traste - startFret + 1;
            const x = (6 - f.cuerda) * 25;
            const y = (visualFret * 35) - 17.5;
            return `
                            <g class="finger-dot">
                                <circle cx="${x}" cy="${y}" r="12" fill="${f.esRaiz ? 'var(--accent-theme)' : '#fff'}" filter="url(#chordGlow)" />
                                <text x="${x}" y="${y + 5}" text-anchor="middle" fill="#000" font-size="11" font-weight="bold">${f.dedo > 0 ? f.dedo : ''}</text>
                            </g>
                        `;
        }).join('')}
                </g>
            </svg>
        `;
    }

    /**
     * Renderiza una fila de diagramas de acordes para una progresión.
     * @param {Array} steps - Los pasos de la progresión a renderizar.
     * @param {number} activeIndex - Índice opcional del acorde que se está reproduciendo actualmente para resaltar.
     */
    renderChordProgression(steps, activeIndex = -1) {
        if (!this.chordContainer) return;

        const chords = steps.filter(s => s.kind === 'chord');
        if (chords.length === 0) {
            this.chordContainer.innerHTML = '<div style="color:#666; font-size: 0.8rem; text-transform: uppercase;">Añade acordes para ver la progresión</div>';
            return;
        }

        let html = `<div class="chord-progression-row" style="display: flex; gap: 12px; padding: 10px; overflow-x: auto; width: 100%; justify-content: center; align-items: flex-start;">`;

        // Usamos el índice absoluto del array de pasos original para una sincronización de resaltado correcta
        let chordCount = 0;
        steps.forEach((step, absoluteIdx) => {
            if (step.kind !== 'chord') return;

            const data = step.data;
            const isHighlighted = (absoluteIdx === activeIndex);
            const svg = this._generateChordSVG(data, {
                width: 180,
                height: 240,
                isHighlighted
            });

            html += `
            <div class="chord-diagram-item" data-prog-index="${absoluteIdx}" style="flex-shrink: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: ${isHighlighted ? 'scale(1.1)' : 'scale(1)'}">
                ${svg}
            </div>`;
        });

        html += `</div>`;
        this.chordContainer.innerHTML = html;
        this.chordContainer.style.display = 'flex';
    }

    highlightStep(step, stepIndex) {
        // Restablecer resaltados de escala
        const allCircles = document.querySelectorAll('.note-circle');
        allCircles.forEach(c => {
            const isSelected = c.getAttribute('stroke') === '#fff';
            if (isSelected) {
                c.setAttribute('fill', 'url(#note-active-gradient)');
            } else {
                c.setAttribute('fill', '#2a2a2e');
            }
            c.setAttribute('r', '16');
        });

        // Restablecer resaltados de la progresión de acordes
        const allDiags = document.querySelectorAll('.chord-diagram-item');
        allDiags.forEach(d => {
            d.style.transform = 'scale(1)';
            const rect = d.querySelector('rect');
            if (rect) {
                rect.style.stroke = '#222';
                rect.style.strokeWidth = '1';
            }
        });

        if (step.kind === 'note') {
            const noteEl = document.querySelector(`.note-circle[data-string="${step.data.string}"][data-fret="${step.data.fret}"]`);
            if (noteEl) {
                noteEl.setAttribute('fill', '#fff');
                noteEl.setAttribute('r', '20');
            }
        } else if (step.kind === 'chord') {
            // Encontrar el diagrama en la fila de progresión si es posible
            // Nota: necesitamos encontrar qué "índice de paso de acorde" es este
            // Por ahora, más simple: resaltar basado en la coincidencia de raíz/tipo si es única, o encontrar el índice en el subconjunto de acordes
            const progItems = document.querySelectorAll('.chord-diagram-item');
            // Necesitamos conocer el índice relativo solo a otros acordes
            // Confiemos en data-prog-index si podemos pasarlo, pero highlightStep solo recibe el paso
            // Mejor: Ejercicios.js llamará a renderer.renderChordProgression(steps, activeChordIndex) 
            // para una claridad absoluta. Pero highlightStep es el callback estandarizado.
            // Usaremos el stepIndex para filtrar los acordes.
        }
    }
}
