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
  if (typeof AlphaTab === 'undefined') {
    console.warn('AlphaTab not loaded yet, retrying in 500ms...');
    setTimeout(initAlphaTab, 500);
    return;
  }

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
    const targetUrl = `https://www.songsterr.com/api/search?pattern=${encodeURIComponent(query)}&size=10`;
    // Use AllOrigins proxy to bypass CORS
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    const data = await response.json();
    // AllOrigins returns the content as a string in 'contents'
    const songData = JSON.parse(data.contents);
    const songs = songData.records || [];

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
  // Ensure player section is shown
  playerSection.style.display = 'block';
  resultsDiv.style.opacity = '0.3';
  resultsDiv.style.pointerEvents = 'none';

  alphaTabDiv.innerHTML = '<div style="color:#fff; padding:3rem; font-size:1.2rem; text-align:center;">🤘 Obteniendo información de la canción...</div>';

  // Function to wait for api to be ready
  const waitForApi = () => {
    return new Promise((resolve) => {
      if (api) resolve();
      else {
        const interval = setInterval(() => {
          if (api) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      }
    });
  };

  try {
    // 1. Wait for api
    await waitForApi();

    // 2. Fetch the song page to get the dynamic file URL
    const songPageUrl = `https://www.songsterr.com/a/wa/song?id=${songId}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(songPageUrl)}`;

    const response = await fetch(proxyUrl);
    const data = await response.json();

    // 3. Parse the HTML to find the #state script tag
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    const stateScript = doc.getElementById('state');

    if (!stateScript) {
      throw new Error('No se pudo encontrar la información de la canción en Songsterr.');
    }

    const state = JSON.parse(stateScript.textContent);
    const tabUrl = state.meta.current.source;

    if (!tabUrl) {
      throw new Error('No se encontró el archivo de música para esta canción.');
    }

    alphaTabDiv.innerHTML = '<div style="color:#fff; padding:3rem; font-size:1.2rem; text-align:center;">🤘 Generando partitura interactiva...</div>';

    // 4. Load the tab
    api.tex(tabUrl);

    // Listen for load failure
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
    alphaTabDiv.innerHTML = `<div style="color:#ff4444; padding:3rem; text-align:center;">
            <h3>Error al cargar la canción</h3>
            <p>${e.message}</p>
            <button class="btn" onclick="document.getElementById('playerSection').style.display='none'; document.getElementById('results').style.opacity='1'; document.getElementById('results').style.pointerEvents='all';">Volver</button>
        </div>`;
  }
}

// Global exposure for onclick
window.loadSong = loadSong;

// Initialize on load
document.addEventListener('DOMContentLoaded', initAlphaTab);
