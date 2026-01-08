let api;
let currentTab = null;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const playerSection = document.getElementById('playerSection');
const alphaTabDiv = document.getElementById('alphaTab');
const playPauseBtn = document.getElementById('at-play-pause');
const stopBtn = document.getElementById('at-stop');
const trackSelect = document.getElementById('at-track-select');

// Initialize AlphaTab
function initAlphaTab() {
  api = new AlphaTab.AlphaTabApi(alphaTabDiv, {
    player: {
      enablePlayer: true,
      enableUserInteraction: true,
      enableCursor: true,
      soundFont: 'https://cdn.jsdelivr.net/npm/@alphatab/alphatab@latest/dist/soundfont/sonivox.sf2'
    }
  });

  // Handle track changes
  api.scoreLoaded.on((score) => {
    trackSelect.innerHTML = '';
    score.tracks.forEach((track) => {
      const option = document.createElement('option');
      option.value = track.index;
      option.innerText = track.name;
      trackSelect.appendChild(option);
    });
  });

  trackSelect.addEventListener('change', (e) => {
    const trackIndex = parseInt(e.target.value);
    api.renderTracks([api.score.tracks[trackIndex]]);
  });

  // Play/Pause button logic
  api.playerReady.on(() => {
    playPauseBtn.disabled = false;
    stopBtn.disabled = false;
  });

  api.playbackStatusChanged.on((args) => {
    if (args.stopped) {
      playPauseBtn.innerText = '▶️ Reproducir';
    } else {
      playPauseBtn.innerText = api.player.isPaused ? '▶️ Reproducir' : '⏸️ Pausar';
    }
  });
}

playPauseBtn.addEventListener('click', () => {
  api.playPause();
});

stopBtn.addEventListener('click', () => {
  api.stop();
});

// Search Logic
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  loadingDiv.style.display = 'block';
  resultsDiv.innerHTML = '';
  playerSection.style.display = 'none';

  try {
    const response = await fetch(`https://www.songsterr.com/api/search?pattern=${encodeURIComponent(query)}&size=10`);
    const data = await response.json();
    const songs = data.records || [];

    loadingDiv.style.display = 'none';

    if (songs.length === 0) {
      resultsDiv.innerHTML = '<p>No se encontraron canciones. 🎸</p>';
      return;
    }

    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'menu'; // Reusing existing card style
      card.style.width = 'auto';
      card.style.margin = '0';
      card.style.padding = '1rem';
      card.style.textAlign = 'left';
      card.innerHTML = `
                <h4 style="margin:0">${song.title}</h4>
                <p style="margin:0.5rem 0; font-size:0.8rem;">${song.artist}</p>
                <button class="btn" style="width:100%; padding:0.4rem;" onclick="loadSong(${song.songId})">Ver Tab</button>
            `;
      resultsDiv.appendChild(card);
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    loadingDiv.style.display = 'none';
    resultsDiv.innerHTML = '<p>Error al buscar canciones. Inténtalo de nuevo.</p>';
  }
});

async function loadSong(songId) {
  playerSection.style.display = 'block';
  resultsDiv.style.opacity = '0.3';
  resultsDiv.style.pointerEvents = 'none';

  // Songsterr GP files are accessed via their revision API
  const tabUrl = `https://www.songsterr.com/a/ra/player/song/${songId}.gp5`;

  alphaTabDiv.innerHTML = '<div style="color:#fff; padding:3rem; font-size:1.2rem; text-align:center;">🤘 Generando partitura interactiva...</div>';

  try {
    api.tex(tabUrl);

    // Listen for load failure (CORS or file access issues)
    api.error.on((err) => {
      console.error('AlphaTab Error:', err);
      alphaTabDiv.innerHTML = `
                <div style="color:#ff4444; padding:3rem; text-align:center;">
                    <h3>Oops! No pudimos cargar esta partitura directamente.</h3>
                    <p>Songsterr a veces protege sus archivos. Intenta con otra canción.</p>
                    <button class="btn" onclick="document.getElementById('playerSection').style.display='none'; document.getElementById('results').style.opacity='1'; document.getElementById('results').style.pointerEvents='all';">Volver</button>
                </div>`;
    });

    window.scrollTo({
      top: playerSection.offsetTop - 80,
      behavior: 'smooth'
    });

  } catch (e) {
    console.error('Failure starting load:', e);
    alphaTabDiv.innerHTML = '<div style="color:#ff4444; padding:3rem;">Error técnico al iniciar el reproductor.</div>';
  }
}

// Global exposure for onclick
window.loadSong = loadSong;

// Initialize on load
document.addEventListener('DOMContentLoaded', initAlphaTab);
