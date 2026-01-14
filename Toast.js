/**
 * JamVault Toast System 🔔
 * Replaces native alert() with professional, animated notifications.
 */

// Ensure the container exists
const createToastContainer = () => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
};

/**
 * Shows a professional toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - info, success, warning, error.
 * @param {number} duration - Auto-close duration in ms (default 4000).
 */
window.showToast = (message, type = 'info', duration = 2500) => {
    const container = createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon mapping
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
        <div class="toast-close" onclick="this.parentElement.classList.add('toast-exit'); setTimeout(()=>this.parentElement.remove(), 400)">
            <i class="fas fa-times"></i>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 400);
        }
    }, duration);
};

/**
 * Creates a premium modal for confirmations.
 */
window.showConfirm = (message, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-icon warning">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="modal-content">
                <p class="modal-message">${message}</p>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" id="modalCancel">Cancelar</button>
                <button class="modal-btn confirm" id="modalConfirm">Aceptar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
        overlay.classList.add('modal-exit');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#modalCancel').onclick = cleanup;
    overlay.querySelector('#modalConfirm').onclick = () => {
        onConfirm();
        cleanup();
    };

    // Smooth entry
    requestAnimationFrame(() => overlay.classList.add('modal-active'));
};

/**
 * Creates a premium modal for prompts (text input).
 */
window.showPrompt = (message, defaultValue, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-icon info">
                <i class="fas fa-edit"></i>
            </div>
            <div class="modal-content">
                <p class="modal-message" style="margin-bottom: 1rem;">${message}</p>
                <input type="text" id="modalPromptInput" class="modal-input" value="${defaultValue}" autocomplete="off">
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" id="modalCancel">Cancelar</button>
                <button class="modal-btn confirm" id="modalConfirm">Cambiar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#modalPromptInput');
    input.focus();
    input.select();

    const cleanup = () => {
        overlay.classList.add('modal-exit');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#modalCancel').onclick = cleanup;
    overlay.querySelector('#modalConfirm').onclick = () => {
        if (input.value.trim()) {
            onConfirm(input.value.trim());
            cleanup();
        }
    };

    // Support ENTER key
    input.onkeyup = (e) => {
        if (e.key === 'Enter') overlay.querySelector('#modalConfirm').click();
        if (e.key === 'Escape') cleanup();
    };

    requestAnimationFrame(() => overlay.classList.add('modal-active'));
};

/**
 * Creates a premium modal for DAW Export.
 */
window.showExportModal = (onExport) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
        <div class="modal-box">
            <div class="modal-icon info">
                <i class="fas fa-file-export"></i>
            </div>
            <div class="modal-content">
                <p class="modal-message">Exportar Proyecto</p>
                
                <div class="modal-field" style="text-align: left; margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Nombre del archivo</label>
                    <input type="text" id="exportFileName" class="modal-input" value="Mi Mezcla JamVault" autocomplete="off" style="width: 100%; box-sizing: border-box;">
                </div>
                
                <div class="modal-field" style="text-align: left; margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); margin-bottom: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Formato de audio</label>
                    <select id="exportFormat" class="modal-input" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; border-radius: 0.75rem;">
                        <option value="wav">WAV (Alta Calidad / Sin Pérdida)</option>
                        <option value="ogg">OGG (Comprimido / Web)</option>
                    </select>
                </div>
                
                <p class="modal-note" style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.3); font-style: italic; margin: 1rem 0;">El navegador te preguntará dónde guardarlo al terminar.</p>
            </div>
            <div class="modal-actions">
                <button class="modal-btn cancel" id="modalCancel">Cancelar</button>
                <button class="modal-btn confirm" id="modalConfirm">Exportar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const nameInput = overlay.querySelector('#exportFileName');
    nameInput.focus();
    nameInput.select();

    const cleanup = () => {
        overlay.classList.add('modal-exit');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#modalCancel').onclick = cleanup;
    overlay.querySelector('#modalConfirm').onclick = () => {
        const name = nameInput.value.trim() || 'JamVault Export';
        const format = overlay.querySelector('#exportFormat').value;
        onExport(name, format);
        cleanup();
    };

    requestAnimationFrame(() => overlay.classList.add('modal-active'));
};

/**
 * Creates a premium modal for Theme Selection.
 */
window.showThemeModal = (currentTheme, onSelect) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const themes = [
        { id: 'JamVault', name: 'JamVault', alt: 'Original', color: '#FF8906', icon: 'fa-rocket' },
        { id: 'galactic', name: 'Galáctica', alt: 'Espacial', color: '#1E90FF', icon: 'fa-user-astronaut' },
        { id: 'natural', name: 'Natural', alt: 'Bosque', color: '#10D96A', icon: 'fa-leaf' },
        { id: 'retro', name: 'Retro 80s', alt: 'Neon', color: '#D81B60', icon: 'fa-gamepad' },
        { id: 'vintage', name: 'Vintage', alt: 'Clásico', color: '#F1C40F', icon: 'fa-record-vinyl' },
        { id: 'redblack', name: 'Inferno', alt: 'Potente', color: '#E81F2B', icon: 'fa-fire' }
    ];

    let themeCards = themes.map(t => `
        <div class="theme-card ${t.id === currentTheme ? 'active' : ''}" data-theme="${t.id}">
            <div class="theme-preview" style="background: ${t.color}">
                <i class="fas ${t.icon}"></i>
            </div>
            <div class="theme-info">
                <span class="theme-name">${t.name}</span>
                <span class="theme-alt">${t.alt}</span>
            </div>
            ${t.id === currentTheme ? '<div class="theme-status"><i class="fas fa-check"></i></div>' : ''}
        </div>
    `).join('');

    overlay.innerHTML = `
        <div class="modal-box theme-modal">
            <div class="modal-header">
                <h2 class="modal-title">Personalizar JamVault</h2>
                <p class="modal-subtitle">Elige una estética que se adapte a tu estilo</p>
            </div>
            
            <div class="theme-grid">
                ${themeCards}
            </div>
            
            <div class="modal-actions" style="margin-top: 1.5rem;">
                <button class="modal-btn cancel" id="modalCancel">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
        overlay.classList.add('modal-exit');
        setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#modalCancel').onclick = cleanup;

    overlay.querySelectorAll('.theme-card').forEach(card => {
        card.onclick = () => {
            const selected = card.dataset.theme;
            onSelect(selected);
            cleanup();
        };
    });

    requestAnimationFrame(() => overlay.classList.add('modal-active'));
};

// Optional: Override native alert (use with caution, better to replace calls manually)
// window.alert = (msg) => window.showToast(msg, 'info');
