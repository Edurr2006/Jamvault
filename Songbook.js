/**
 * JamVault - Songbook.js
 * Manages song search, drag-and-drop categorisation, and cloud persistence.
 * Requires authentication – guests see a lock overlay and cannot interact.
 */

// ── Global State ──────────────────────────────────────────────────────────────
let songLists = { want: [], progress: [], done: [] };
let isLoggedIn = false;
let wasEverLoggedIn = false; // tracks if user had an active session this visit

// ── UI Elements ───────────────────────────────────────────────────────────────
const searchInput  = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const loadingDiv   = document.getElementById('loading');
const discoveryArea = document.getElementById('discovery-area');
const authOverlay  = document.getElementById('songbook-auth-overlay');

const listsNodes = {
    want:     document.getElementById('want-list'),
    progress: document.getElementById('progress-list'),
    done:     document.getElementById('done-list'),
};
const columnNodes = document.querySelectorAll('.songbook-column');

// ── 1. INITIALISATION ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    renderAllLists();
    initDiscovery();
    // Check if user is already logged in (initial load)
    setTimeout(() => {
        if (window.jamvaultUser && !wasEverLoggedIn) {
            handleLogin();
        } else if (!window.jamvaultUser) {
            showOverlay();
        }
    }, 500);
});

// Listen for login / logout events dispatched by Auth.js
window.addEventListener('jamvault:auth_changed', (e) => {
    if (e.detail) {
        handleLogin();
    } else {
        // detail is null: either first load or logout
        if (wasEverLoggedIn) {
            handleLogout();
        } else {
            showOverlay();
        }
    }
});

async function handleLogin() {
    isLoggedIn = true;
    wasEverLoggedIn = true;
    hideOverlay();
    await fetchCloudSongbook();
    renderAllLists();
}

function handleLogout() {
    isLoggedIn = false;
    wasEverLoggedIn = false; // Reset to avoid double-processing
    songLists = { want: [], progress: [], done: [] };
    renderAllLists();
    showOverlay();
}

// ── 2. AUTH OVERLAY ───────────────────────────────────────────────────────────

function showOverlay() {
    if (authOverlay) authOverlay.style.display = 'flex';
}

function hideOverlay() {
    if (authOverlay) authOverlay.style.display = 'none';
}

// ── 3. DISCOVERY & SEARCH ─────────────────────────────────────────────────────

async function initDiscovery() {
    loadingDiv.style.display = 'block';
    const songs = await fetchSongs('');
    loadingDiv.style.display = 'none';
    renderSearchResults(songs, 'Biblioteca JamVault');
}

function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    searchInput.oninput = (e) => {
        const q = e.target.value.trim();
        clearSearchBtn.style.display = q ? 'flex' : 'none';
        clearTimeout(searchTimeout);
        if (!q) { initDiscovery(); return; }
        searchTimeout = setTimeout(async () => {
            loadingDiv.style.display = 'block';
            const results = await fetchSongs(q);
            loadingDiv.style.display = 'none';
            renderSearchResults(results, `Resultados para "${q}"`);
        }, 500);
    };

    clearSearchBtn.onclick = () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        initDiscovery();
    };

    // Drag-and-drop on Kanban columns
    columnNodes.forEach(column => {
        column.addEventListener('dragover', (e) => {
            if (!isLoggedIn) return;
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            if (!isLoggedIn) {
                showToast('Inicia sesión para guardar canciones', 'info');
                openAuthModal();
                return;
            }

            const songDataJson = e.dataTransfer.getData('application/json');
            if (!songDataJson) return;

            const songData = JSON.parse(songDataJson);
            const targetCategory = column.dataset.category;
            const sourceCategory = songData.sourceCategory;

            if (sourceCategory === 'search') {
                addSong(targetCategory, songData);
            } else if (sourceCategory !== targetCategory) {
                moveSong(sourceCategory, targetCategory, songData.id);
            }
        });
    });
}

// ── 4. API CALLS ──────────────────────────────────────────────────────────────

async function fetchSongs(query) {
    const url = query ? `api/tabs.php?q=${encodeURIComponent(query)}` : 'api/tabs.php';
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error fetching tabs:', e);
        return [];
    }
}

async function fetchCloudSongbook() {
    try {
        const res = await fetch('api/songbook.php?action=list');
        if (res.status === 401) return; // not logged in
        const data = await res.json();
        if (data.success) {
            songLists = data.songbook;
        }
    } catch (e) {
        console.error('Error fetching cloud songbook:', e);
    }
}

async function apiAdd(tabId, category) {
    try {
        await fetch('api/songbook.php?action=add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tab_id: tabId, category }),
        });
    } catch (e) { console.error('Error adding song to cloud:', e); }
}

async function apiMove(tabId, category) {
    try {
        await fetch('api/songbook.php?action=move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tab_id: tabId, category }),
        });
    } catch (e) { console.error('Error moving song in cloud:', e); }
}

async function apiRemove(tabId) {
    try {
        await fetch('api/songbook.php?action=remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tab_id: tabId }),
        });
    } catch (e) { console.error('Error removing song from cloud:', e); }
}

// ── 5. RENDERING ──────────────────────────────────────────────────────────────

function renderSearchResults(results, titleText) {
    discoveryArea.innerHTML = `<div class="discovery-title"><i class="fas fa-compact-disc"></i> ${titleText || 'Biblioteca JamVault'}</div>`;

    if (!Array.isArray(results) || results.length === 0) {
        discoveryArea.innerHTML += '<div style="padding:1.5rem; opacity:0.5; width:100%; text-align:center;">No se encontraron canciones disponibles</div>';
        return;
    }

    results.forEach(song => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.draggable = true;
        item.innerHTML = `
            <div class="result-info">
                <span class="result-title" title="${song.title}">${song.title}</span>
                <span class="result-artist" title="${song.artist}">${song.artist}</span>
            </div>
            <div class="result-actions" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; opacity:0.6; font-size:0.8rem;">
                <span><i class="fas fa-eye"></i> Ver</span>
                <span>Arrastrar <i class="fas fa-grip-vertical"></i></span>
            </div>
        `;
        item.style.cursor = 'pointer';

        item.addEventListener('dragstart', (e) => {
            if (!isLoggedIn) {
                e.preventDefault();
                showToast('Inicia sesión para guardar canciones', 'info');
                openAuthModal();
                return;
            }
            const data = {
                id: song.songId || song.id,
                title: song.title,
                artist: song.artist,
                sourceCategory: 'search',
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            item.style.opacity = '0.5';
        });

        item.addEventListener('dragend', () => { item.style.opacity = '1'; });

        item.onclick = () => {
            window.location.href = `Tabs.html?songId=${song.id || song.songId}`;
        };

        discoveryArea.appendChild(item);
    });
}

function renderAllLists() {
    Object.keys(songLists).forEach(cat => renderList(cat));
}

function renderList(category) {
    const listNode = listsNodes[category];
    const songs = songLists[category];
    listNode.innerHTML = '';

    // Update count badge
    const header = listNode.previousElementSibling;
    const countSpan = header ? header.querySelector('.count') : null;
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
            <button class="btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        `;

        card.addEventListener('dragstart', (e) => {
            const data = { id: song.id, title: song.title, artist: song.artist, sourceCategory: category };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            setTimeout(() => card.style.display = 'none', 0);
        });

        card.addEventListener('dragend', () => { card.style.display = 'flex'; });

        card.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            removeSong(category, song.id);
        };

        card.onclick = (e) => {
            if (!e.target.closest('.btn-delete')) {
                window.location.href = `Tabs.html?songId=${song.id}`;
            }
        };
        card.style.cursor = 'pointer';

        listNode.appendChild(card);
    });
}

// ── 6. DATA OPERATIONS ────────────────────────────────────────────────────────

async function addSong(category, songData) {
    const exists = Object.values(songLists).some(list => list.some(s => s.id === songData.id));
    if (exists) { showToast('Esta canción ya está en tu lista', 'info'); return; }

    songLists[category].push({ id: songData.id, title: songData.title, artist: songData.artist });
    renderList(category);
    showToast('Canción agregada!', 'success');

    await apiAdd(songData.id, category);
}

async function moveSong(fromCategory, toCategory, songId) {
    const idx = songLists[fromCategory].findIndex(s => s.id === songId);
    if (idx === -1) return;

    const [song] = songLists[fromCategory].splice(idx, 1);
    songLists[toCategory].push(song);
    renderList(fromCategory);
    renderList(toCategory);

    await apiMove(songId, toCategory);
}

async function removeSong(category, songId) {
    songLists[category] = songLists[category].filter(s => s.id !== songId);
    renderList(category);

    await apiRemove(songId);
}

// ── 7. HELPERS ────────────────────────────────────────────────────────────────

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('modal-active');
}
