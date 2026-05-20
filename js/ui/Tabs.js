/**
 * JamVault - Tabs.js
 * Motor Nativo = Renderizado de Vectores AlphaTab + Audio Nativo
 * Sincronización y notación musical de calidad 100% profesional.
 */

let alphaApi = null;
let currentScore = null;
let currentTrack = null;
let isPlaying = false;
let isSoloMode = false;
let totalScoreTicks = 0; // Pre-calculado para rendimiento

// Elementos de la UI
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const songsListBody = document.getElementById('songsListBody');
const loadingDiv = document.getElementById('loading');
const playerSection = document.getElementById('playerSection');
const playPauseBtn = document.getElementById('at-play-pause');
const stopBtn = document.getElementById('at-stop');
const closeBtn = document.getElementById('at-close');
const speedSlider = document.getElementById('at-speed');
const speedLabel = document.getElementById('at-speed-label');
const trackSidebar = document.getElementById('at-track-sidebar');
const controlsBar = document.getElementById('atControlsBar');
const progressBar = document.getElementById('at-progress-bar');
const progressContainer = document.querySelector('.at-progress-container');

// Selectores de Filtro de la barra de herramientas
const filterInstrument = document.getElementById('filterInstrument');
const filterTuning = document.getElementById('filterTuning');
const filterDifficulty = document.getElementById('filterDifficulty');

// --- 1. BÚSQUEDA Y DESCUBRIMIENTO ---
let loadedSongs = [];

// Función para aplicar filtros localmente sobre los metadatos y renderizar la lista
function applyFiltersAndRender() {
  if (!songsListBody) return;
  
  const instrument = filterInstrument ? filterInstrument.value : 'all';
  const tuning = filterTuning ? filterTuning.value : 'all';
  const difficulty = filterDifficulty ? filterDifficulty.value : 'all';

  const filteredSongs = loadedSongs.filter(song => {
    // Filtro de Instrumento: verificar si el instrumento seleccionado está en el campo 'instruments'
    if (instrument !== 'all') {
      const songInsts = song.instruments ? song.instruments.split(',') : [];
      if (!songInsts.includes(instrument)) return false;
    }

    // Filtro de Afinación
    if (tuning !== 'all' && song.tuning !== tuning) {
      return false;
    }

    // Filtro de Dificultad
    if (difficulty !== 'all' && String(song.difficulty) !== String(difficulty)) {
      return false;
    }

    return true;
  });

  renderSongsList(filteredSongs);
}

async function initDiscovery() {
  if (!loadingDiv) return;
  loadingDiv.style.display = 'block';
  try {
    const results = await fetchSongs('');
    loadedSongs = results;
    loadingDiv.style.display = 'none';
    applyFiltersAndRender();
  } catch (error) {
    console.error('Error al inicializar el descubrimiento:', error);
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

async function fetchSongs(query) {
  const url = query
    ? `api/tabs.php?q=${encodeURIComponent(query)}`
    : 'api/tabs.php';
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    console.error('❌ Error al obtener tabs:', e);
    return [];
  }
}

function renderSongsList(songs) {
  if (!songsListBody) return;
  songsListBody.innerHTML = '';
  if (songs.length === 0) {
    songsListBody.innerHTML = '<tr><td colspan="2" style="text-align:center;opacity:0.5;padding:2rem">No se encontraron resultados</td></tr>';
    return;
  }
  songs.forEach((song, index) => {
    const displayViews = song.views > 1000 ? (song.views / 1000).toFixed(1) + 'k' : song.views;

    const diff = parseInt(song.difficulty) || 1;
    let diffHTML = '<div class="difficulty-dots">';
    for (let i = 1; i <= 5; i++) diffHTML += `<div class="dot ${i <= diff ? 'active' : ''}"></div>`;
    diffHTML += '</div>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <div class="song-rank-info">
                <span class="rank-number">${(index + 1).toString().padStart(2, '0')}</span>
                <div class="song-details">
                    <span class="song-title-cell">${song.title}</span>
                    <span class="song-artist-cell">${song.artist}</span>
                    ${diffHTML}
                </div>
            </div>
        </td>
        <td style="text-align:right"><span class="popularity-badge">🔥 ${displayViews}</span></td>
    `;
    tr.onclick = () => loadSong(song.id);
    songsListBody.appendChild(tr);
  });
}

// Lógica de Búsqueda
let searchTimeout;
if (searchInput) {
  searchInput.oninput = (e) => {
    const q = e.target.value.trim();
    if (clearSearchBtn) clearSearchBtn.style.display = q ? 'flex' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      loadingDiv.style.display = 'block';
      const results = await fetchSongs(q);
      loadedSongs = results;
      applyFiltersAndRender();
      loadingDiv.style.display = 'none';
    }, 500);
  };
}
if (clearSearchBtn) clearSearchBtn.onclick = () => {
  searchInput.value = ''; clearSearchBtn.style.display = 'none'; initDiscovery();
};

// Escuchadores de eventos para los cambios en los filtros selectores
if (filterInstrument) filterInstrument.onchange = applyFiltersAndRender;
if (filterTuning) filterTuning.onchange = applyFiltersAndRender;
if (filterDifficulty) filterDifficulty.onchange = applyFiltersAndRender;

// --- 2. EL MOTOR ALPHATAB ---

function initAlphaTab() {
  if (alphaApi) alphaApi.destroy();

  const settings = {
    core: { engine: 'svg' },
    display: {
      layout: { mode: 'page' },       // Diseño vertical, línea por línea
      hideStandardNotation: true,
      staveSpacing: 10,
      padding: [40, 40, 40, 40]
    },
    player: {
      enablePlayer: true,
      enableUserInteraction: true,
      soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
      scrollElement: '#at-player-content',
      scrollOffsetY: -80
    },
    ui: { cursor: true }   // Mantener el cursor nativo para la interacción con los pulsos; superponemos el nuestro más fluido
  };

  alphaApi = new alphaTab.AlphaTabApi(document.getElementById('alphaTab'), settings);

  // Partitura Cargada: Buscar la pista que comienza antes
  alphaApi.scoreLoaded.on(score => {
    currentScore = score;
    totalScoreTicks = score.tickCount || 100000;
    
    const validTracks = (score.tracks || []).filter(t => !t.name.match(/vocal|voice|voz|lyric|capo/i));

    const getStartTick = (tr) => {
      for (let s of (tr.staves || [])) {
        for (let b of (s.bars || [])) {
          for (let v of (b.voices || [])) {
            for (let beat of (v.beats || [])) {
              if (beat.notes && beat.notes.length > 0) return beat.playbackStart ?? beat.start ?? 0;
            }
          }
        }
      }
      return 9999999;
    };

    validTracks.sort((a, b) => getStartTick(a) - getStartTick(b));
    currentTrack = validTracks[0] || score.tracks[0];

    alphaApi.renderTracks([currentTrack]);
    
    // Restaurar Reproducción Multi-Pista: Asegurar que todas las pistas estén activas y respetar el modo solo
    if (score.tracks) {
      alphaApi.changeTrackMute(score.tracks, false);
      if (isSoloMode) {
        alphaApi.changeTrackSolo(score.tracks, false);
        alphaApi.changeTrackSolo([currentTrack], true);
      } else {
        alphaApi.changeTrackSolo(score.tracks, false);
      }
    }
    
    renderTrackSidebar(score);

    if (loadingDiv) loadingDiv.style.display = 'none';
    if (controlsBar) controlsBar.classList.add('visible');

    const container = document.getElementById('at-player-content');
    if (container) container.scrollTop = 0;
  });

  // Ticks Totales Actualizados cuando el reproductor está listo (maneja repeticiones)
  alphaApi.playerReady.on(() => {
    if (alphaApi.player && alphaApi.player.totalTicks > 0) {
      totalScoreTicks = alphaApi.player.totalTicks;
      console.log("📏 Ticks Totales de Reproducción:", totalScoreTicks);
    }
  });

  // Clic para Buscar (Seek)
  if (progressContainer) {
    progressContainer.onclick = (e) => {
      if (!alphaApi || totalScoreTicks <= 0) return;
      const rect = progressContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      
      // Seguimiento suave: si se está reproduciendo, podría tartamudear menos si pausamos/reanudamos o simplemente establecemos el tick
      alphaApi.player.tick = percentage * totalScoreTicks;
      
      // Feedback visual: actualización inmediata
      if (progressBar) {
        progressBar.style.width = (percentage * 100) + '%';
      }
    };
  }

  // ─── CURSOR SUPERPUESTO OPTIMIZADO BASADO EN CSS ───────────────────────
  
  // Caché de elementos para un rendimiento máximo
  const laser = document.getElementById('customLaser');
  const cont = document.getElementById('at-player-content');

  let lastTickUpdate = 0;
  let laserUpdatePending = false;

  alphaApi.playerPositionChanged.on(args => {
    // 1. Barra de Progreso Optimizada: Limitada a unos 60fps (cada 16ms)
    const now = Date.now();
    if (now - lastTickUpdate > 16) {
      if (progressBar && totalScoreTicks > 0) {
        // Usar args.tick para la posición de la línea de tiempo de reproducción
        progressBar.style.width = ((args.tick / totalScoreTicks) * 100) + '%';
      }
      lastTickUpdate = now;
    }

    // 2. Láser Superpuesto Optimizado: Usar requestAnimationFrame para evitar el caos en el diseño (layout thrashing)
    if (!laserUpdatePending && laser && isPlaying) {
      laserUpdatePending = true;
      requestAnimationFrame(() => {
        const el = document.querySelector('.at-cursor') || document.querySelector('.at-cursor-bar');
        if (el && cont) {
          const elRect = el.getBoundingClientRect();
          const contRect = cont.getBoundingClientRect();
          
          laser.style.left = (elRect.left - contRect.left + cont.scrollLeft - 3) + 'px';
          laser.style.top = (elRect.top - contRect.top + cont.scrollTop) + 'px';
          laser.style.width = '4px';
          laser.style.height = elRect.height + 'px';
        }
        laserUpdatePending = false;
      });
    }
  });

  alphaApi.playerStateChanged.on(args => {
    isPlaying = (args.state === 1);
    if (playPauseBtn) playPauseBtn.innerHTML = isPlaying ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 3px; pointer-events: none;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

    // Mostrar u ocultar el láser cuando comenzamos/detenemos la reproducción
    if (laser) {
      laser.style.display = isPlaying ? 'block' : 'none';
    }
  });

  alphaApi.playerFinished.on(() => {
    isPlaying = false;
    if (laser) laser.style.display = 'none';
  });

  // Manejar Redimensionamiento
  window.addEventListener('resize', () => {
    if (alphaApi) alphaApi.updateSettings();
  });
}


// --- 3. LÓGICA DE CARGA ---
async function loadSong(songId) {
  if (loadingDiv) {
    loadingDiv.style.display = 'block';
    loadingDiv.innerText = "🤘 Cargando Tablatura...";
  }
  if (playerSection) playerSection.style.display = 'flex';
  if (searchInput) searchInput.disabled = true;

  // Restablecer la UI de Audio

  try {
    // Obtener metadatos de la tablatura desde la API local
    const response = await fetch(`api/tabs.php?id=${songId}`);
    if (!response.ok) throw new Error('Tab no encontrado en la BD');
    const tab = await response.json();
    if (tab.error) throw new Error(tab.error);

    console.log(`📋 Cargando: ${tab.title} by ${tab.artist}`);

    // Construir la URL que apunta al archivo .gpx local (relativa a la raíz del proyecto)
    const tabUrl = tab.file;

    // Inicializar AlphaTab y cargar
    initAlphaTab();
    alphaApi.load(tabUrl);

    alphaApi.scoreLoaded.on(() => {
      // nada extra al cargar
    }, true);

  } catch (e) {
    console.error("❌ Carga Fallida", e);
    if (loadingDiv) loadingDiv.style.display = 'none';
    showToast("Error al cargar la partitura: " + e.message, "error");
  }
}

function renderTrackSidebar(score) {
  if (!trackSidebar) return;
  trackSidebar.innerHTML = '<div class="sidebar-title">Instrumentos</div>';
  (score.tracks || []).filter(t => !t.name.match(/vocal|voice|voz|lyric|capo/i)).forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'track-item' + (t === currentTrack ? ' active' : '');
    let icon = t.name.toLowerCase().includes('drum') ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><circle cx="12" cy="12" r="9"></circle><path d="M12 3v18"></path><path d="M3 12h18"></path></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M8 12l-4 4-2-2 4-4"></path><path d="M12 8l4-4 2 2-4 4"></path><path d="M14 10l-4 4"></path></svg>';
    const finalName = t.name && t.name.trim() !== '' ? t.name : `Instrumento ${i + 1}`;
    div.innerHTML = `<i>${icon}</i> <span>${finalName}</span>`;
    div.onclick = () => {
      currentTrack = t;
      alphaApi.renderTracks([t]);
      
      if (isSoloMode) {
        alphaApi.changeTrackSolo(alphaApi.score.tracks, false);
        alphaApi.changeTrackSolo([t], true);
      }

      document.querySelectorAll('.track-item').forEach(i => i.classList.remove('active'));
      div.classList.add('active');
    };
    trackSidebar.appendChild(div);
  });
}

function getActiveThemeColor() {
  return themeColors[document.body.className.split(' ')[0]] || '#FF8906';
}
const themeColors = {
  'JamVault': '#F39C12', 'natural': '#27AE60', 'galactic': '#2980B9',
  'retro': '#D81B60', 'vintage': '#B7950B', 'redblack': '#C0392B'
};

// Escuchadores Globales con Guardas de Seguridad
if (playPauseBtn) playPauseBtn.onclick = () => {
  resumeAudioContext();
  try {
    alphaApi?.playPause();
  } catch (e) {
    console.warn("AlphaTab Play/Pause suprimido:", e);
  }
};

if (stopBtn) stopBtn.onclick = () => {
  try {
    alphaApi?.stop();
  } catch (e) {
    console.warn("AlphaTab Stop suprimido:", e);
  }
};

if (closeBtn) closeBtn.onclick = () => {
  try {
    alphaApi?.stop();
  } catch (e) { }
  playerSection.style.display = 'none';
  searchInput.disabled = false;
};

if (speedSlider) speedSlider.oninput = (e) => {
  if (alphaApi) alphaApi.playbackSpeed = e.target.value / 100;
  if (speedLabel) speedLabel.innerText = e.target.value + '%';
};

if (document.getElementById('at-volume')) document.getElementById('at-volume').oninput = (e) => {
  const vol = e.target.value / 100;
  if (alphaApi) alphaApi.masterVolume = vol;
};

const soloToggleBtn = document.getElementById('at-solo-toggle');
if (soloToggleBtn) soloToggleBtn.onclick = () => {
  isSoloMode = !isSoloMode;
  soloToggleBtn.innerHTML = (isSoloMode ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>Solo: ON' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>Solo: OFF');
  soloToggleBtn.style.color = isSoloMode ? 'var(--at-accent-color)' : '#fff';
  
  if (alphaApi && alphaApi.score) {
    if (isSoloMode) {
      alphaApi.changeTrackSolo(alphaApi.score.tracks, false);
      alphaApi.changeTrackSolo([currentTrack], true);
    } else {
      alphaApi.changeTrackSolo(alphaApi.score.tracks, false);
    }
  }
};

const metronomeBtn = document.getElementById('at-metronome');
if (metronomeBtn) metronomeBtn.onclick = () => {
  if (!alphaApi) return;
  const isActive = alphaApi.metronomeVolume > 0;
  alphaApi.metronomeVolume = isActive ? 0 : 1;
  metronomeBtn.style.color = !isActive ? 'var(--at-accent-color)' : '#fff';
  metronomeBtn.innerHTML = (!isActive ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Metrónomo: ON' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>Metrónomo');
};

const countInBtn = document.getElementById('at-count-in');
if (countInBtn) countInBtn.onclick = () => {
  if (!alphaApi) return;
  const isActive = alphaApi.countInVolume > 0;
  alphaApi.countInVolume = isActive ? 0 : 1;
  countInBtn.style.color = !isActive ? 'var(--at-accent-color)' : '#fff';
  countInBtn.innerHTML = (!isActive ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Cuenta atrás: ON' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; margin-right: 5px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>Cuenta atrás');
};

// Ayudante de Deslizador (Slider)
window.adjustSlider = (id, delta) => {
  const slider = document.getElementById(id);
  if (slider) {
    let newVal = parseFloat(slider.value) + delta;
    newVal = Math.min(parseFloat(slider.max), Math.max(parseFloat(slider.min), newVal));
    slider.value = newVal;
    slider.dispatchEvent(new Event('input'));
  }
};

// Ayudante de Reanudación de AudioContext
function resumeAudioContext() {
  if (alphaApi && alphaApi.renderer && alphaApi.renderer.engine && alphaApi.renderer.engine.audioContext) {
    const ctx = alphaApi.renderer.engine.audioContext;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => console.log("🔊 AudioContext reanudado mediante gesto"));
    }
  }
  if (window.Tone && Tone.State === 'suspended') {
    Tone.start();
  }
}

// Gesto global para desbloquear el audio
document.addEventListener('click', resumeAudioContext, { once: true });

window.onload = () => {
  initDiscovery();
  applyThemeColors();

  // Cargar canción si songId está en la URL
  const params = new URLSearchParams(window.location.search);
  const songId = params.get('songId') || params.get('id');
  if (songId) {
    loadSong(songId);
  }
};
window.loadSong = loadSong;

// Lógica de Sincronización de Temas
function applyThemeColors() {
  const currentTheme = document.body.className.split(' ')[0] || 'JamVault';
  const color = themeColors[currentTheme] || '#F39C12';
  document.documentElement.style.setProperty('--at-accent-color', color);

  // Convertir hex a rgb para efectos basados en opacidad en CSS
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '243, 156, 18';
  document.documentElement.style.setProperty('--at-accent-rgb', rgb);

  if (alphaApi) alphaApi.updateSettings();
}

window.addEventListener('themeChanged', applyThemeColors);

