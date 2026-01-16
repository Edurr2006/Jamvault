/**
 * JamVault - Songbook.js
 * Manages song search, drag-and-drop categorization, and persistence.
 */

// Global State
let songLists = {
    want: [],
    progress: [],
    done: []
};

// UI Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const loadingDiv = document.getElementById('loading');
const resultsArea = document.getElementById('search-results-area');

const listsNodes = {
    want: document.getElementById('want-list'),
    progress: document.getElementById('progress-list'),
    done: document.getElementById('done-list')
};

const columnNodes = document.querySelectorAll('.songbook-column');

// --- 1. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    setupEventListeners();
    renderAllLists();
});

function setupEventListeners() {
    // Search input with debounce
    let searchTimeout;
    searchInput.oninput = (e) => {
        const q = e.target.value.trim();
        clearSearchBtn.style.display = q ? 'flex' : 'none';

        clearTimeout(searchTimeout);
        if (!q) {
            resultsArea.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(async () => {
            loadingDiv.style.display = 'block';
            resultsArea.style.display = 'none';

            const results = await fetchSongs(q);
            renderSearchResults(results);

            loadingDiv.style.display = 'none';
            if (results.length > 0) {
                resultsArea.style.display = 'flex'; // Changed to flex to match CSS
            }
        }, 500);
    };

    clearSearchBtn.onclick = () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        resultsArea.style.display = 'none';
    };

    // Drag and Drop for Columns
    columnNodes.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const songDataJson = e.dataTransfer.getData('application/json');
            if (!songDataJson) return;

            const songData = JSON.parse(songDataJson);
            const targetCategory = column.dataset.category;
            const sourceCategory = songData.sourceCategory;

            // If it's a new song from search
            if (sourceCategory === 'search') {
                addSong(targetCategory, songData);
            } else if (sourceCategory !== targetCategory) {
                // Moving between columns
                moveSong(sourceCategory, targetCategory, songData.id);
            }
        });
    });
}

// --- 2. SONGSTERR API ---

async function fetchSongs(query) {
    const targetUrl = `https://www.songsterr.com/api/search?pattern=${encodeURIComponent(query)}&size=10`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const data = await response.json();
        return data.records || data;
    } catch (e) {
        console.error('Fetch error:', e);
        return [];
    }
}

// --- 3. RENDERING ---

function renderSearchResults(results) {
    resultsArea.innerHTML = '';
    results.forEach(song => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.draggable = true;

        item.innerHTML = `
            <span class="result-title" title="${song.title}">${song.title}</span>
            <span class="result-artist" title="${song.artist}">${song.artist}</span>
            <span style="font-size: 0.8rem; opacity: 0.4; margin-top: 5px;"><i>click to view</i></span>
            <span style="font-size: 0.9rem; opacity: 0.4; margin-top: 2px;">drag ⣿</span>
        `;

        item.style.cursor = 'pointer'; // Make it clear it's clickable

        item.addEventListener('dragstart', (e) => {
            const data = {
                id: song.songId || song.id,
                title: song.title,
                artist: song.artist,
                sourceCategory: 'search'
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            item.style.opacity = '0.5';
        });

        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
        });

        // Click to view immediately
        item.onclick = (e) => {
            // Prevent interference with drag if possible, but basic click is fine
            window.location.href = `Tabs.html?songId=${song.id || song.songId}`;
        };

        resultsArea.appendChild(item);
    });
}

function renderAllLists() {
    Object.keys(songLists).forEach(category => {
        renderList(category);
    });
}

function renderList(category) {
    const listNode = listsNodes[category];
    const songs = songLists[category];
    listNode.innerHTML = '';

    // Update count in header
    const header = listNode.previousElementSibling;
    const countSpan = header.querySelector('.count');
    if (countSpan) countSpan.textContent = songs.length;

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.draggable = true;

        card.innerHTML = `
            <div class="song-card-info">
                <span class="song-card-title">${song.title}</span>
                <span class="song-card-artist">${song.artist}</span>
            </div>
            <button class="btn-delete" title="Eliminar">🗑</button>
        `;

        // Drag Start
        card.addEventListener('dragstart', (e) => {
            const data = {
                id: song.id,
                title: song.title,
                artist: song.artist,
                sourceCategory: category
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            setTimeout(() => card.style.display = 'none', 0);
        });

        card.addEventListener('dragend', () => {
            card.style.display = 'flex';
        });

        // Delete Logic
        card.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            removeSong(category, song.id);
        };

        // Click to view (Redundant with Tabs but useful)
        card.onclick = () => {
            window.location.href = `Tabs.html?songId=${song.id}`;
        };
        card.style.cursor = 'pointer';

        listNode.appendChild(card);
    });
}

// --- 4. DATA OPERATIONS ---

function addSong(category, songData) {
    // Check if song already exists in any list
    const exists = Object.values(songLists).some(list =>
        list.some(s => s.id === songData.id)
    );

    if (exists) {
        showToast('Esta canción ya está en tu lista', 'info');
        return;
    }

    songLists[category].push({
        id: songData.id,
        title: songData.title,
        artist: songData.artist
    });

    saveToLocalStorage();
    renderList(category);
    showToast('Canción agregada!', 'success');
}

function moveSong(fromCategory, toCategory, songId) {
    const songIndex = songLists[fromCategory].findIndex(s => s.id === songId);
    if (songIndex === -1) return;

    const [song] = songLists[fromCategory].splice(songIndex, 1);
    songLists[toCategory].push(song);

    saveToLocalStorage();
    renderList(fromCategory);
    renderList(toCategory);
}

function removeSong(category, songId) {
    songLists[category] = songLists[category].filter(s => s.id !== songId);
    saveToLocalStorage();
    renderList(category);
}

// --- 5. PERSISTENCE ---

function saveToLocalStorage() {
    localStorage.setItem('jamvault_songbook', JSON.stringify(songLists));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('jamvault_songbook');
    if (saved) {
        try {
            songLists = JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing local storage');
        }
    }
}
