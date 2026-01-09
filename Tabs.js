let api;
let currentTab = null;

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const songsListBody = document.getElementById('songsListBody');
const discoveryContainer = document.getElementById('discoveryContainer');
const discoveryTitle = document.getElementById('discoveryTitle');
const discoverySubtitle = document.getElementById('discoverySubtitle');
const loadingDiv = document.getElementById('loading');
const playerSection = document.getElementById('playerSection');
const alphaTabDiv = document.getElementById('alphaTab');
const playPauseBtn = document.getElementById('at-play-pause');
const stopBtn = document.getElementById('at-stop');
const closeBtn = document.getElementById('at-close');
const speedSlider = document.getElementById('at-speed');
const speedLabel = document.getElementById('at-speed-label');
const trackSidebar = document.getElementById('at-track-sidebar');
const controlsBar = document.getElementById('atControlsBar');
const progressBar = document.getElementById('at-progress-bar');
const metronomeBtn = document.getElementById('at-metronome');
const countInBtn = document.getElementById('at-count-in');

// Variables para el suavizado del cursor (Seguidor Suavizado / Smoothed Follower)
let proPlayhead = null;
let layoutCache = []; // { tick, x, y, h, lineId }
let currentVisualX = 0;
let currentVisualY = 0;
let currentVisualH = 0;
let isPlaying = false;
let isMetronomeActive = false;
let isCountInActive = false;
let animationFrameId = null;

// MOTOR DE ANIMACIÓN: Smoothed Follower
function updateSmoothCursor() {
  if (!isPlaying || !api || !api.player || layoutCache.length === 0 || !proPlayhead) {
    animationFrameId = null;
    return;
  }

  const tick = api.player.tickPosition;
  const target = getBoundsForTick(tick);

  if (target) {
    const lerp = 0.25; // Factor de suavizado (estilo Songsterr)

    // Si el salto es demasiado grande, saltamos instantáneamente para evitar "vuelos"
    if (Math.abs(currentVisualX - target.x) > 200 || Math.abs(currentVisualY - target.y) > 80) {
      currentVisualX = target.x;
      currentVisualY = target.y;
      currentVisualH = target.h;
    } else {
      currentVisualX += (target.x - currentVisualX) * lerp;
      currentVisualY += (target.y - currentVisualY) * lerp;
      currentVisualH += (target.h - currentVisualH) * lerp;
    }

    proPlayhead.style.display = 'block';
    proPlayhead.style.transform = `translate3d(${currentVisualX}px, ${currentVisualY}px, 0)`;
    proPlayhead.style.height = `${currentVisualH}px`;
  }

  animationFrameId = requestAnimationFrame(updateSmoothCursor);
}

// BÚSQUEDA BINARIA + INTERPOLACIÓN PARA POSICIÓN EXACTA
function getBoundsForTick(tick) {
  if (!layoutCache || layoutCache.length === 0) return null;

  let low = 0, high = layoutCache.length - 1;
  while (low <= high) {
    let mid = (low + high) >> 1;
    if (layoutCache[mid].tick < tick) low = mid + 1;
    else high = mid - 1;
  }

  const i = Math.max(0, low - 1);
  const a = layoutCache[i];
  const b = layoutCache[i + 1];

  if (a) {
    if (b && b.lineId === a.lineId && b.tick > a.tick) {
      const factor = (tick - a.tick) / (b.tick - a.tick);
      return {
        x: a.x + (b.x - a.x) * factor,
        y: a.y + (b.y - a.y) * factor,
        h: a.h + (b.h - a.h) * factor
      };
    }
    return { x: a.x, y: a.y, h: a.h };
  }
  return null;
}


// Loading overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'at-loading-overlay';
loadingOverlay.style.cssText = `
  color:#fff; padding:3rem; font-size:1.2rem; text-align:center; 
  position:absolute; width:100%; top:0; left:0; z-index:10; 
  background:rgba(0,0,0,0.85); display:none; border-radius:12px;
`;
alphaTabDiv.style.position = 'relative';
alphaTabDiv.appendChild(loadingOverlay);

function showLoading(msg) {
  loadingOverlay.innerText = '🤘 ' + msg;
  loadingOverlay.style.display = 'block';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

// Theme Colors Mapping
const themeColors = {
  'JamVault': '#F39C12',
  'natural': '#27AE60',
  'galactic': '#2980B9',
  'retro': '#D81B60',
  'vintage': '#B7950B',
  'redblack': '#C0392B'
};

function getActiveThemeColor() {
  const body = document.body;
  for (const theme in themeColors) {
    if (body.classList.contains(theme)) return themeColors[theme];
  }
  return '#FF8906';
}

// Initialize AlphaTab
function initAlphaTab() {
  if (typeof alphaTab === 'undefined') {
    console.warn('AlphaTab not loaded yet, retrying in 500ms...');
    setTimeout(initAlphaTab, 500);
    return;
  }

  // 1. Forzar visibilidad inicial para que AlphaTab detecte el ancho (Evita Error Width=0)
  const accentColor = getActiveThemeColor();
  updateAlphaTabColors(accentColor);

  api = new alphaTab.AlphaTabApi(alphaTabDiv, {
    display: {
      staves: ['tab'],
      resources: {
        mainColor: accentColor,
        backgroundColor: '#000000',
        fontColor: '#ffffff'
      }
    },
    player: {
      enablePlayer: true,
      enableUserInteraction: true,
      enableCursor: false, // Desactivar nativo
      soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2'
    }
  });

  proPlayhead = document.getElementById('proPlayhead');

  // Observe theme changes
  const themeObserver = new MutationObserver(() => {
    const newColor = getActiveThemeColor();
    updateAlphaTabColors(newColor);
    if (api) {
      api.settings.display.resources.mainColor = newColor;
      api.updateSettings();
      api.render();
    }
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Evento para Seek en barra de progreso
  const progressContainer = document.getElementById('at-progress-container');
  if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
      if (!api || !api.score) return;
      const rect = progressContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const totalTicks = api.score.durationTicks || api.score.masterBars.reduce((a, b) => a + b.ticks, 0);
      api.player.tickPosition = totalTicks * pct;
    });
  }

  // Handle score loaded
  api.scoreLoaded.on((score) => {
    hideLoading();
    renderTrackSidebar(score);
    controlsBar.classList.add('visible');
  });

  // Generar layoutCache (CRAWLER)
  api.renderFinished.on(() => {
    layoutCache = [];
    const lookup = api.renderer.boundsLookup;
    if (lookup && api.score) {
      api.score.masterBars.forEach(mb => {
        mb.beats.forEach(beat => {
          const bb = lookup.findBeat(beat.playbackRange.start);
          if (bb && bb.visualBounds) {
            layoutCache.push({
              tick: beat.playbackRange.start,
              x: bb.visualBounds.left,
              y: bb.visualBounds.top,
              h: bb.visualBounds.height,
              lineId: beat.voice.staff.system.index
            });
          }
        });
      });
      layoutCache.sort((a, b) => a.tick - b.tick);
    }
    // Race condition: si ya estaba en play, iniciamos RAF
    if (isPlaying && layoutCache.length > 0 && !animationFrameId) {
      animationFrameId = requestAnimationFrame(updateSmoothCursor);
    }
  });

  function renderTrackSidebar(score) {
    trackSidebar.innerHTML = '<div class="sidebar-title">Instrumentos</div>';

    score.tracks.forEach((track) => {
      const item = document.createElement('div');
      item.className = 'track-item' + (track.index === api.renderTracks[0]?.index ? ' active' : '');

      const icon = getInstrumentIcon(track.name);
      item.innerHTML = `<i>${icon}</i> <span>${track.name}</span>`;

      item.onclick = () => {
        document.querySelectorAll('.track-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        api.renderTracks([track]);
      };

      trackSidebar.appendChild(item);
    });
  }

  function getInstrumentIcon(name) {
    name = name.toLowerCase();
    if (name.includes('guitar')) return '🎸';
    if (name.includes('bass')) return '🎸';
    if (name.includes('drum')) return '🥁';
    if (name.includes('piano') || name.includes('key') || name.includes('synth')) return '🎹';
    if (name.includes('sax')) return '🎷';
    if (name.includes('vocal')) return '🎤';
    if (name.includes('string') || name.includes('violin')) return '🎻';
    if (name.includes('cello')) return '🎻';
    if (name.includes('horn') || name.includes('trumpet') || name.includes('brass')) return '🎺';
    return '🎸'; // default to guitar as it's the most common in tabs
  }

  // 4. Cursor nativo desactivado
  api.settings.player.enableCursor = false;
  api.updateSettings();

  // 5. Gestión de Eventos del Reproductor
  api.playerReady.on(() => {
    console.log('AlphaTab Player Ready');

    api.player.stateChanged.on((args) => {
      isPlaying = args.state === 1;
      playPauseBtn.innerText = isPlaying ? '⏸' : '▶';

      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (isPlaying && layoutCache.length > 0) {
        animationFrameId = requestAnimationFrame(updateSmoothCursor);
      } else {
        // Instant sync on pause
        const target = getBoundsForTick(api.player.tickPosition);
        if (target && proPlayhead) {
          proPlayhead.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
          proPlayhead.style.height = `${target.h}px`;
        }
      }
    });

    api.player.positionChanged.on((args) => {
      // 1. Progress Bar
      const totalTicks = api.score.durationTicks || api.score.masterBars.reduce((a, b) => a + b.ticks, 0);
      if (totalTicks > 0) {
        progressBar.style.width = ((args.tickPosition / totalTicks) * 100) + '%';
      }

      // 2. Auto-Scroll & Instant Sync (Seek)
      const target = getBoundsForTick(args.tickPosition);
      if (target) {
        const contentArea = document.getElementById('at-player-content');
        if (contentArea) {
          const targetY = target.y - (contentArea.clientHeight / 3);
          if (isPlaying) {
            contentArea.scrollTop = targetY; // Snap during play
          } else {
            contentArea.scrollTo({ top: targetY, behavior: 'smooth' }); // Smooth on seek
            // Instant sync playhead on seek
            if (proPlayhead) {
              proPlayhead.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
              proPlayhead.style.height = `${target.h}px`;
            }
          }
        }
      }
    });

    hideLoading();
  });
}

metronomeBtn.addEventListener('click', () => {
  isMetronomeActive = !isMetronomeActive;
  metronomeBtn.classList.toggle('active', isMetronomeActive);
  if (api && api.player) {
    api.player.metronomeVolume = isMetronomeActive ? 1 : 0;
  }
});

countInBtn.addEventListener('click', () => {
  isCountInActive = !isCountInActive;
  countInBtn.classList.toggle('active', isCountInActive);
  if (api && api.player) {
    api.player.countInSteps = isCountInActive ? 4 : 0;
  }
});

playPauseBtn.addEventListener('click', () => {
  if (api) api.playPause();
});

stopBtn.addEventListener('click', () => {
  if (api) api.stop();
});

document.getElementById('at-volume').addEventListener('input', (e) => {
  if (api && api.player) {
    api.player.masterVolume = parseInt(e.target.value) / 100;
  }
});

document.getElementById('at-speed').addEventListener('input', (e) => {
  if (api && api.player) {
    const speed = parseInt(e.target.value) / 100;
    api.player.playbackSpeed = speed;
    document.getElementById('at-speed-label').innerText = `${Math.round(speed * 100)}%`;
  }
});

closeBtn.addEventListener('click', () => {
  if (api) {
    api.stop();
  }
  playerSection.style.display = 'none';
  controlsBar.classList.remove('visible');
  discoveryContainer.style.display = 'block';

  // Restore animations
  setTimeout(() => {
    discoveryContainer.style.opacity = '1';
    discoveryContainer.style.transform = 'translateY(0)';
  }, 50);

  // Re-habilitar búsqueda
  searchInput.disabled = false;
  searchInput.closest('.search-area').style.opacity = '1';

  window.scrollTo({ top: discoveryContainer.offsetTop - 100, behavior: 'smooth' });
});

// --- Unified Discovery Logic ---

let allSongs = [];
let currentFilters = {
  instrument: 'all',
  tuning: 'all',
  difficulty: 'all',
  query: ''
};

async function initDiscovery() {
  loadingDiv.style.display = 'block';
  try {
    // Fetch a base set of popular songs (e.g., Metallica, Led Zeppelin, AC/DC)
    const popularQueries = ['Metallica', 'Led Zeppelin', 'AC/DC', 'Nirvana', 'Guns N Roses'];
    const results = await Promise.all(popularQueries.map(q => fetchSongs(q)));
    allSongs = results.flat().sort((a, b) => (b.views || 0) - (a.views || 0));

    loadingDiv.style.display = 'none';
    applyFilters();
  } catch (error) {
    console.error('Error initializing discovery:', error);
    loadingDiv.style.display = 'none';
  }
}

async function fetchSongs(query) {
  const targetUrl = `https://www.songsterr.com/api/search?pattern=${encodeURIComponent(query)}&size=15`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) return [];
  const data = await response.json();
  return data.records || data; // Handle both search and other possible array responses
}

function applyFilters() {
  let filtered = allSongs.filter(song => {
    // Text Search
    const matchesQuery = !currentFilters.query ||
      song.title.toLowerCase().includes(currentFilters.query.toLowerCase()) ||
      song.artist.toLowerCase().includes(currentFilters.query.toLowerCase());

    // Instrument Filter (Mock logic based on tracks names/instrumentIds)
    const matchesInstrument = currentFilters.instrument === 'all' ||
      song.tracks.some(t => t.instrument.toLowerCase().includes(currentFilters.instrument));

    // Tuning Filter (Mock logic based on usual tunings for these songs)
    // In a real app, we'd parse the 'tuning' array in the tracks
    const matchesTuning = currentFilters.tuning === 'all' || checkTuning(song, currentFilters.tuning);

    // Difficulty Filter
    const matchesDifficulty = currentFilters.difficulty === 'all' ||
      song.tracks.some(t => t.difficulty == currentFilters.difficulty);

    return matchesQuery && matchesInstrument && matchesTuning && matchesDifficulty;
  });

  renderSongsList(filtered);
}

function checkTuning(song, tuningType) {
  // Basic heuristic for common tunings
  const tracks = song.tracks || [];
  if (tuningType === 'standard') return tracks.some(t => t.tuning?.join(',') === '64,59,55,50,45,40');
  if (tuningType === 'dropd') return tracks.some(t => t.tuning?.join(',') === '64,59,55,50,45,38');
  if (tuningType === 'halfstep') return tracks.some(t => t.tuning?.join(',') === '63,58,54,49,44,39');
  return false;
}

function renderSongsList(songs) {
  if (!songsListBody) return;
  songsListBody.innerHTML = '';

  if (songs.length === 0) {
    songsListBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:3rem; opacity:0.5;">No se encontraron canciones con estos filtros. 🎸</td></tr>';
    return;
  }

  songs.forEach((song, index) => {
    const tr = document.createElement('tr');
    const totalViews = song.tracks?.reduce((acc, t) => acc + (t.views || 0), 0) || 0;
    const displayViews = totalViews > 1000 ? (totalViews / 1000).toFixed(1) + 'k' : totalViews;

    // Calculate difficulty (1-5)
    // We take the average or the max difficulty found in the tracks
    const difficulties = song.tracks?.map(t => t.difficulty).filter(d => d > 0) || [];
    const avgDifficulty = difficulties.length > 0
      ? Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length)
      : 1;

    let difficultyHTML = '<div class="difficulty-dots">';
    for (let i = 1; i <= 5; i++) {
      difficultyHTML += `<div class="dot ${i <= avgDifficulty ? 'active' : ''}"></div>`;
    }
    difficultyHTML += '</div>';

    tr.innerHTML = `
          <td>
            <div class="song-rank-info">
                <span class="rank-number">${(index + 1).toString().padStart(2, '0')}</span>
                <div class="song-details">
                    <span class="song-title-cell">${song.title}</span>
                    <span class="song-artist-cell">${song.artist}</span>
                    ${difficultyHTML}
                </div>
            </div>
          </td>
          <td>
            <span class="popularity-badge">🔥 ${displayViews || 'New'}</span>
          </td>
        `;

    tr.addEventListener('click', () => {
      discoveryContainer.style.opacity = '0';
      discoveryContainer.style.transform = 'translateY(20px)';
      setTimeout(() => {
        discoveryContainer.style.display = 'none';
        loadSong(song.songId || song.id);
      }, 300);
    });

    songsListBody.appendChild(tr);
  });

  // Update titles based on state
  if (currentFilters.query) {
    discoveryTitle.innerText = `Resultados para "${currentFilters.query}"`;
    discoverySubtitle.innerText = `${songs.length} canciones encontradas`;
  } else {
    discoveryTitle.innerText = `Descubre el Top Global 🔥`;
    discoverySubtitle.innerText = `Ranking Global Semanal`;
  }
}

// Event Listeners for Filters
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  currentFilters.query = query;

  // Toggle clear button visibility
  clearSearchBtn.style.display = query ? 'flex' : 'none';

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    if (!query) {
      initDiscovery();
      return;
    }

    loadingDiv.style.display = 'block';
    const searchResults = await fetchSongs(query);
    allSongs = searchResults;
    loadingDiv.style.display = 'none';
    applyFilters();
  }, 500);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  currentFilters.query = '';
  clearSearchBtn.style.display = 'none';
  initDiscovery();
});

document.getElementById('filterInstrument').addEventListener('change', (e) => {
  currentFilters.instrument = e.target.value;
  applyFilters();
});

document.getElementById('filterTuning').addEventListener('change', (e) => {
  currentFilters.tuning = e.target.value;
  applyFilters();
});

document.getElementById('filterDifficulty').addEventListener('change', (e) => {
  currentFilters.difficulty = e.target.value;
  applyFilters();
});

async function loadSong(songId) {
  // Limpiar estado (Songsterr Reset)
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isPlaying = false;
  layoutCache = [];
  currentVisualX = 0; currentVisualY = 0; currentVisualH = 0;
  if (proPlayhead) proPlayhead.style.display = 'none';
  if (progressBar) progressBar.style.width = '0%';

  playerSection.style.display = 'flex'; // Usar flex para el layout
  discoveryContainer.style.display = 'none';

  // Bloquear búsqueda
  searchInput.disabled = true;
  searchInput.closest('.search-area').style.opacity = '0.5';

  showLoading('Preparando Tablatura...');

  try {
    while (!api) await new Promise(r => setTimeout(r, 100));

    const songPageUrl = `https://www.songsterr.com/a/wa/song?id=${songId}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(songPageUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('No se pudo conectar con Songsterr.');
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const stateScript = doc.getElementById('state');
    if (!stateScript) throw new Error('No se pudo encontrar la información.');

    const state = JSON.parse(stateScript.textContent);
    const tabUrl = state.meta.current.source;
    if (!tabUrl) throw new Error('No se encontró el archivo fuente.');

    const finalTabUrl = `https://corsproxy.io/?${encodeURIComponent(tabUrl)}`;

    await new Promise(r => requestAnimationFrame(r));
    showLoading('Cargando partitura...');
    api.load(finalTabUrl);

    // No hace falta scroll manual si el player es fixed overlay
  } catch (e) {
    console.error('Failure in loadSong:', e);
    hideLoading();
    alphaTabDiv.innerHTML = `
      <div style="color:#ff4444; padding:3rem; text-align:center;">
        <h3>Error: ${e.message}</h3>
        <button class="btn" onclick="location.reload()">Reiniciar</button>
      </div>`;
  }
}

window.loadSong = loadSong;
document.addEventListener('DOMContentLoaded', () => {
  initAlphaTab();
  initDiscovery();
});

function updateAlphaTabColors(color) {
  document.body.style.setProperty('--at-accent-color', color);
}
