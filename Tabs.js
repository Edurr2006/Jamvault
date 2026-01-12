/**
 * JamVault - Tabs.js
 * Native Engine = AlphaTab Vector Rendering + Native Audio
 * 100% Songsterr-quality synchronization and musical notation.
 */

// Global State
let alphaApi = null;
let currentScore = null;
let currentTrack = null;
let isPlaying = false;

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
    const popularQueries = ['Metallica', 'Led Zeppelin', 'AC/DC', 'Nirvana', 'Guns N Roses'];
    const results = await Promise.all(popularQueries.map(q => fetchSongs(q)));
    allSongs = results.flat().sort((a, b) => (b.views || 0) - (a.views || 0));
    loadingDiv.style.display = 'none';
    renderSongsList(allSongs);
  } catch (error) {
    console.error('Error initializing discovery:', error);
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

async function fetchSongs(query) {
  const targetUrl = `https://www.songsterr.com/api/search?pattern=${encodeURIComponent(query)}&size=15`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    const data = await response.json();
    return data.records || data;
  } catch (e) { return []; }
}

function renderSongsList(songs) {
  if (!songsListBody) return;
  songsListBody.innerHTML = '';
  songs.forEach((song, index) => {
    const tr = document.createElement('tr');
    const views = song.tracks?.reduce((acc, t) => acc + (t.views || 0), 0) || 0;
    const displayViews = views > 1000 ? (views / 1000).toFixed(1) + 'k' : views;

    const diffs = song.tracks?.map(t => t.difficulty).filter(d => d > 0) || [];
    const avg = diffs.length > 0 ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : 1;
    let diffHTML = '<div class="difficulty-dots">';
    for (let i = 1; i <= 5; i++) diffHTML += `<div class="dot ${i <= avg ? 'active' : ''}"></div>`;
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
    tr.onclick = () => loadSong(song.songId || song.id);
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

// --- 2. THE ALPHATAB ENGINE (NATIVE-FIRST) ---

function initAlphaTab() {
  if (alphaApi) alphaApi.destroy();

  const settings = {
    core: { engine: 'svg' },
    display: {
      layout: 'horizontal',
      hideStandardNotation: true,
      staveSpacing: 10, // Added spacing for better visibility
      padding: [40, 40, 40, 40] // Increased padding
    },
    player: {
      enablePlayer: true,
      enableUserInteraction: true,
      soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',
      scrollElement: '#at-player-content'
    },
    ui: {
      cursor: true
    }
  };

  alphaApi = new alphaTab.AlphaTabApi(document.getElementById('alphaTab'), settings);

  // DEBUG: Monitor Cursor DOM
  alphaApi.playerPositionChanged.on(args => {
    const cursor = document.querySelector('.at-cursor, .at-cursor-bar');
    if (!cursor) {
      console.warn('JamVault Debug: Cursor element NOT found in DOM during playback.');
    } else if (window.getComputedStyle(cursor).display === 'none') {
      console.warn('JamVault Debug: Cursor found but display is NONE.');
    }
  });

  // Score Loaded: Find the track that starts earliest
  alphaApi.scoreLoaded.on(score => {
    currentScore = score;
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
    renderTrackSidebar(score);

    if (loadingDiv) loadingDiv.style.display = 'none';
    if (controlsBar) controlsBar.classList.add('visible');

    // Force Top Start
    const container = document.getElementById('at-player-content');
    if (container) container.scrollTop = 0;
  });


  // Continuous smooth laser animation (Reverted to Safe Lerp)
  let animationFrameId = null;
  let targetX = 0, targetY = 0, targetHeight = 100;
  let currentX = 0, currentY = 0, currentHeight = 100;

  function startLaserAnimation() {
    if (animationFrameId) return;

    // Initialize starting values from DOM
    const alphaCursor = document.querySelector('.at-cursor-bar');
    if (alphaCursor) {
      const cursorRect = alphaCursor.getBoundingClientRect();
      const container = document.getElementById('at-player-content');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        currentX = cursorRect.left - containerRect.left + container.scrollLeft;
        currentY = cursorRect.top - containerRect.top + container.scrollTop;
        currentHeight = cursorRect.height;

        targetX = currentX;
        targetY = currentY;
        targetHeight = currentHeight;
      }
    }

    function animate() {
      const laser = document.getElementById('customLaser');
      const alphaCursor = document.querySelector('.at-cursor-bar');
      const container = document.getElementById('at-player-content');

      if (!laser || !isPlaying || !container) {
        animationFrameId = null;
        return;
      }

      // Update target from AlphaTab cursor
      if (alphaCursor) {
        const cursorRect = alphaCursor.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        targetX = cursorRect.left - containerRect.left + container.scrollLeft;
        targetY = cursorRect.top - containerRect.top + container.scrollTop;
        targetHeight = cursorRect.height;
      }

      // Smooth interpolation (lerp)
      const smoothness = 0.2;

      if (Math.abs(targetY - currentY) > 50) {
        currentX = targetX;
        currentY = targetY;
        currentHeight = targetHeight;
      } else {
        currentX += (targetX - currentX) * smoothness;
        currentY += (targetY - currentY) * smoothness;
        currentHeight += (targetHeight - currentHeight) * smoothness;
      }

      laser.style.left = currentX + 'px';
      laser.style.top = currentY + 'px';
      laser.style.height = currentHeight + 'px';

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  function stopLaserAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  alphaApi.playerStateChanged.on(args => {
    isPlaying = (args.state === 1);
    if (playPauseBtn) playPauseBtn.innerText = isPlaying ? '⏸' : '▶';

    // Control custom laser visibility and animation
    const laser = document.getElementById('customLaser');
    if (laser) {
      laser.style.display = isPlaying ? 'block' : 'none';
    }

    if (isPlaying) {
      startLaserAnimation();
    } else {
      stopLaserAnimation();
    }
  });


  alphaApi.playerPositionChanged.on(args => {
    if (currentScore && progressBar) {
      const duration = currentScore.masterBars.reduce((a, b) => a + (b.tickDuration || 0), 0) || 100000;
      progressBar.style.width = ((args.currentTick / duration) * 100) + '%';
    }
  });

  alphaApi.playerFinished.on(() => {
    stopLaserAnimation();
    const laser = document.getElementById('customLaser');
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

  try {
    const url = `https://www.songsterr.com/a/wa/song?id=${songId}`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    const html = await res.text();
    const stateTag = new DOMParser().parseFromString(html, 'text/html').getElementById('state');
    if (!stateTag) throw new Error("No state found");

    const state = JSON.parse(stateTag.textContent);
    const tabUrl = `https://corsproxy.io/?${encodeURIComponent(state.meta.current.source)}`;

    initAlphaTab();
    alphaApi.load(tabUrl);

  } catch (e) {
    console.error("Load Failed", e);
    if (loadingDiv) loadingDiv.style.display = 'none';
    alert("Error al cargar la partitura.");
  }
}

function renderTrackSidebar(score) {
  if (!trackSidebar) return;
  trackSidebar.innerHTML = '<div class="sidebar-title">Instrumentos</div>';
  (score.tracks || []).filter(t => !t.name.match(/vocal|voice|voz|lyric|capo/i)).forEach(t => {
    const div = document.createElement('div');
    div.className = 'track-item' + (t === currentTrack ? ' active' : '');
    let icon = t.name.toLowerCase().includes('drum') ? '🥁' : '🎸';
    div.innerHTML = `<i>${icon}</i> <span>${t.name}</span>`;
    div.onclick = () => {
      currentTrack = t;
      alphaApi.renderTracks([t]);
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

// Global Listeners
if (playPauseBtn) playPauseBtn.onclick = () => alphaApi?.playPause();
if (stopBtn) stopBtn.onclick = () => alphaApi?.stop();
if (closeBtn) closeBtn.onclick = () => {
  alphaApi?.stop();
  playerSection.style.display = 'none';
  searchInput.disabled = false;
};
if (speedSlider) speedSlider.oninput = (e) => {
  if (alphaApi) alphaApi.playbackSpeed = e.target.value / 100;
  if (speedLabel) speedLabel.innerText = e.target.value + '%';
};
if (document.getElementById('at-volume')) document.getElementById('at-volume').oninput = (e) => {
  if (alphaApi) alphaApi.masterVolume = e.target.value / 100;
};

window.onload = () => {
  initDiscovery();
  applyThemeColors();
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
