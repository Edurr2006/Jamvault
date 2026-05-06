/**
 * JamVault - Tabs.js
 * Native Engine = AlphaTab Vector Rendering + Native Audio
 * 100% professional-quality synchronization and musical notation.
 */

let alphaApi = null;
let currentScore = null;
let currentTrack = null;
let isPlaying = false;
let isSoloMode = false;
let totalScoreTicks = 0; // Pre-calculated for performance

// UI Elements
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

// --- 1. SEARCH & DISCOVERY ---
let allSongs = [];
async function initDiscovery() {
  if (!loadingDiv) return;
  loadingDiv.style.display = 'block';
  try {
    const results = await fetchSongs('');
    allSongs = results;
    loadingDiv.style.display = 'none';
    renderSongsList(allSongs);
  } catch (error) {
    console.error('Error initializing discovery:', error);
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
    const tr = document.createElement('tr');
    const displayViews = song.views > 1000 ? (song.views / 1000).toFixed(1) + 'k' : song.views;

    const diff = parseInt(song.difficulty) || 1;
    let diffHTML = '<div class="difficulty-dots">';
    for (let i = 1; i <= 5; i++) diffHTML += `<div class="dot ${i <= diff ? 'active' : ''}"></div>`;
    diffHTML += '</div>';

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

// Search Logic
let searchTimeout;
if (searchInput) {
  searchInput.oninput = (e) => {
    const q = e.target.value.trim();
    if (clearSearchBtn) clearSearchBtn.style.display = q ? 'flex' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      if (!q) { initDiscovery(); return; }
      loadingDiv.style.display = 'block';
      const results = await fetchSongs(q);
      renderSongsList(results);
      loadingDiv.style.display = 'none';
    }, 500);
  };
}
if (clearSearchBtn) clearSearchBtn.onclick = () => {
  searchInput.value = ''; clearSearchBtn.style.display = 'none'; initDiscovery();
};

// --- 2. THE ALPHATAB ENGINE ---

function initAlphaTab() {
  if (alphaApi) alphaApi.destroy();

  const settings = {
    core: { engine: 'svg' },
    display: {
      layout: { mode: 'page' },       // Vertical layout, line by line
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
    ui: { cursor: true }   // Keep native cursor for beat interaction; we overlay our smoother one
  };

  alphaApi = new alphaTab.AlphaTabApi(document.getElementById('alphaTab'), settings);

  // Score Loaded: Find the track that starts earliest
  alphaApi.scoreLoaded.on(score => {
    currentScore = score;
    // PRE-CALCULATE DURATION ONCE (Optimization)
    totalScoreTicks = score.masterBars.reduce((a, b) => a + (b.tickDuration || 0), 0) || 100000;
    
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
    
    // Restore Multi-Track Playback: Ensure all tracks are unmuted and respect solo mode
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

  // ─── OPTIMIZED CSS-BASED OVERLAY CURSOR ───────────────────────
  
  // Caching elements for laser performance
  const laser = document.getElementById('customLaser');
  const cont = document.getElementById('at-player-content');

  let lastATTime = 0; // For detecting manual seeks

  alphaApi.playerPositionChanged.on(args => {
    // Progress bar update - Optimized with pre-calculated totalScoreTicks
    if (progressBar) {
      progressBar.style.width = ((args.currentTick / totalScoreTicks) * 100) + '%';
    }

    // Snap the laser overlay exactly over the AlphaTab internal selection
    const el = document.querySelector('.at-cursor') || document.querySelector('.at-cursor-bar');
    
    if (laser && el && cont) {
      const elRect = el.getBoundingClientRect();
      const contRect = cont.getBoundingClientRect();
      
      laser.style.left = (elRect.left - contRect.left + cont.scrollLeft - 3) + 'px';
      laser.style.top = (elRect.top - contRect.top + cont.scrollTop) + 'px';
      laser.style.width = '4px';
      laser.style.height = elRect.height + 'px';
    }
  });

  alphaApi.playerStateChanged.on(args => {
    isPlaying = (args.state === 1);
    if (playPauseBtn) playPauseBtn.innerText = isPlaying ? '⏸' : '▶';

    // Show or hide the laser when we start/stop playing
    if (laser) {
      laser.style.display = isPlaying ? 'block' : 'none';
    }
  });

  alphaApi.playerFinished.on(() => {
    isPlaying = false;
    if (laser) laser.style.display = 'none';
  });

  // Handle Resize
  window.addEventListener('resize', () => {
    if (alphaApi) alphaApi.updateSettings();
  });
}


// --- 3. LOADING LOGIC ---
async function loadSong(songId) {
  if (loadingDiv) {
    loadingDiv.style.display = 'block';
    loadingDiv.innerText = "🤘 Cargando Tablatura...";
  }
  if (playerSection) playerSection.style.display = 'flex';
  if (searchInput) searchInput.disabled = true;

  // Reset Audio UI

  try {
    // Fetch tab metadata from local API
    const response = await fetch(`api/tabs.php?id=${songId}`);
    if (!response.ok) throw new Error('Tab no encontrado en la BD');
    const tab = await response.json();
    if (tab.error) throw new Error(tab.error);

    console.log(`📋 Cargando: ${tab.title} by ${tab.artist}`);

    // Build the URL pointing to the local .gpx file (relative to project root)
    const tabUrl = tab.file;

    // Initialize AlphaTab and load
    initAlphaTab();
    alphaApi.load(tabUrl);

    alphaApi.scoreLoaded.on(() => {
      // nothing extra on load
    }, true);

  } catch (e) {
    console.error("❌ Load Failed", e);
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
    let icon = t.name.toLowerCase().includes('drum') ? '🥁' : '🎸';
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

// Global Listeners with Safety Guards
if (playPauseBtn) playPauseBtn.onclick = () => {
  resumeAudioContext();
  try {
    alphaApi?.playPause();
  } catch (e) {
    console.warn("AlphaTab Play/Pause suppressed:", e);
  }
};

if (stopBtn) stopBtn.onclick = () => {
  try {
    alphaApi?.stop();
  } catch (e) {
    console.warn("AlphaTab Stop suppressed:", e);
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
  soloToggleBtn.innerText = isSoloMode ? '🎧 Solo: ON' : '🎧 Solo: OFF';
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
  metronomeBtn.innerText = !isActive ? '🔔 Metrónomo: ON' : '🔔 Metrónomo';
};

const countInBtn = document.getElementById('at-count-in');
if (countInBtn) countInBtn.onclick = () => {
  if (!alphaApi) return;
  const isActive = alphaApi.countInVolume > 0;
  alphaApi.countInVolume = isActive ? 0 : 1;
  countInBtn.style.color = !isActive ? 'var(--at-accent-color)' : '#fff';
  countInBtn.innerText = !isActive ? '🔢 Cuenta atrás: ON' : '🔢 Cuenta atrás';
};

// Slider Helper
window.adjustSlider = (id, delta) => {
  const slider = document.getElementById(id);
  if (slider) {
    let newVal = parseFloat(slider.value) + delta;
    newVal = Math.min(parseFloat(slider.max), Math.max(parseFloat(slider.min), newVal));
    slider.value = newVal;
    slider.dispatchEvent(new Event('input'));
  }
};

// AudioContext Resume Helper
function resumeAudioContext() {
  if (alphaApi && alphaApi.renderer && alphaApi.renderer.engine && alphaApi.renderer.engine.audioContext) {
    const ctx = alphaApi.renderer.engine.audioContext;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => console.log("🔊 AudioContext resumed via gesture"));
    }
  }
  if (window.Tone && Tone.State === 'suspended') {
    Tone.start();
  }
}

// Global gesture to unlock audio
document.addEventListener('click', resumeAudioContext, { once: true });

window.onload = () => {
  initDiscovery();
  applyThemeColors();

  // Load song if songId is in URL
  const params = new URLSearchParams(window.location.search);
  const songId = params.get('songId') || params.get('id');
  if (songId) {
    loadSong(songId);
  }
};
window.loadSong = loadSong;

// Theme Synchronization logic
function applyThemeColors() {
  const currentTheme = document.body.className.split(' ')[0] || 'JamVault';
  const color = themeColors[currentTheme] || '#F39C12';
  document.documentElement.style.setProperty('--at-accent-color', color);

  // Convert hex to rgb for opacity-based effects in CSS
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '243, 156, 18';
  document.documentElement.style.setProperty('--at-accent-rgb', rgb);

  if (alphaApi) alphaApi.updateSettings();
}

window.addEventListener('themeChanged', applyThemeColors);

