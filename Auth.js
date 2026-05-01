/**
 * JamVault - Auth.js
 * Handles user authentication, session management, and UI updates across all pages.
 */

function initAuth() {
    injectAuthUI();
    checkAuthStatus();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

function injectAuthUI() {
    // Inject FontAwesome if not present
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(faLink);
    }

    // Inject the Auth Button into the header navigation
    const header = document.querySelector('header');
    const navLinks = document.querySelector('.nav-links');
    if (!header && !navLinks) return;

    // Create auth button container
    const authContainer = document.createElement('div');
    authContainer.className = 'auth-container';
    authContainer.innerHTML = `
        <button id="authBtn" class="btn btn-outline" style="margin-left: 1rem;"><i class="fas fa-user"></i> Iniciar Sesión</button>
        <div id="userMenu" class="user-menu" style="display: none;">
            <span id="welcomeMsg" style="color: white; margin-right: 15px; font-weight: bold;"></span>
            <button id="logoutBtn" class="btn btn-outline" style="background: rgba(255, 68, 68, 0.1); color: #ff4444; border-color: rgba(255, 68, 68, 0.3);"><i class="fas fa-sign-out-alt"></i> Salir</button>
        </div>
    `;
    
    const toggleBtn = document.getElementById('toggleTheme');
    
    try {
        let actionsGroup = document.querySelector('.header-actions');
        if (!actionsGroup) {
            actionsGroup = document.createElement('div');
            actionsGroup.className = 'header-actions';
            actionsGroup.style.display = 'flex';
            actionsGroup.style.alignItems = 'center';
            actionsGroup.style.gap = '15px';
            header.appendChild(actionsGroup);
        }

        if (toggleBtn) {
            actionsGroup.appendChild(toggleBtn);
        }
        
        actionsGroup.insertBefore(authContainer, toggleBtn);
    } catch (e) {
        console.error("Error modifying header:", e);
        if (navLinks) navLinks.appendChild(authContainer);
    }

    // Inject the Modal HTML to the body
    const modalHTML = `
    <div id="authModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); z-index: 10000; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: rgba(20, 20, 25, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); overflow: hidden;">
            <div class="modal-header" style="padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
                <h2 class="modal-title" id="authTitle" style="margin: 0; font-size: 1.5rem; color: #fff;">Iniciar Sesión</h2>
                <button class="modal-close" id="closeAuthModal" style="background: none; border: none; color: rgba(255,255,255,0.5); font-size: 2rem; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <form id="authForm">
                    <div id="registerFields" style="display: none;">
                        <input type="email" id="authEmail" class="modal-input" placeholder="Correo electrónico" autocomplete="email" style="width: 100%; padding: 1rem; margin-bottom: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; box-sizing: border-box;">
                    </div>
                    <input type="text" id="authUsername" class="modal-input" placeholder="Usuario" required autocomplete="username" style="width: 100%; padding: 1rem; margin-bottom: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; box-sizing: border-box;">
                    <input type="password" id="authPassword" class="modal-input" placeholder="Contraseña" required autocomplete="current-password" style="width: 100%; padding: 1rem; margin-bottom: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; box-sizing: border-box;">
                    <div id="authError" style="color: #ff4444; margin-top: 10px; font-size: 0.9rem; text-align: center; display: none;"></div>
                    <button type="submit" class="btn" style="width: 100%; margin-top: 20px;" id="authSubmitBtn">Entrar</button>
                </form>
                <div style="text-align: center; margin-top: 15px; font-size: 0.9rem; color: rgba(255,255,255,0.6);">
                    <span id="authToggleText">¿No tienes cuenta?</span> 
                    <a href="#" id="toggleAuthMode" style="color: var(--theme-accent, #FF9F1C); text-decoration: none; font-weight: bold;">Regístrate</a>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind events
    setupAuthEvents();
}

let isLoginMode = true;

function setupAuthEvents() {
    // Use event delegation for robust click handling
    document.addEventListener('click', (e) => {
        const authBtnClicked = e.target.closest('#authBtn');
        const closeBtnClicked = e.target.closest('#closeAuthModal');
        const logoutBtnClicked = e.target.closest('#logoutBtn');
        const toggleModeClicked = e.target.closest('#toggleAuthMode');

        if (authBtnClicked) {
            e.preventDefault();
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.style.display = 'flex';
                // Force an exact layout check
                setTimeout(() => {
                    const rect = modal.getBoundingClientRect();
                    const comp = window.getComputedStyle(modal);
                    alert("Modal Stats:\nDisplay: " + comp.display + "\nPosition: " + comp.position + "\nZ-Index: " + comp.zIndex + "\nOpacity: " + comp.opacity + "\nVisibility: " + comp.visibility + "\nRect: " + rect.width + "x" + rect.height + " at " + rect.top + "," + rect.left);
                }, 100);
            } else {
                alert("ERROR: No se encontró el modal en el HTML."); // DEBUG
            }
        }

        if (closeBtnClicked) {
            e.preventDefault();
            const modal = document.getElementById('authModal');
            if (modal) modal.style.display = 'none';
        }

        if (logoutBtnClicked) {
            e.preventDefault();
            handleLogout();
        }

        if (toggleModeClicked) {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            document.getElementById('authTitle').textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
            document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Entrar' : 'Registrarse';
            document.getElementById('registerFields').style.display = isLoginMode ? 'none' : 'block';
            document.getElementById('authToggleText').textContent = isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
            toggleModeClicked.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión';
            document.getElementById('authError').style.display = 'none';
        }
    });

    const form = document.getElementById('authForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const action = isLoginMode ? 'login' : 'register';
            const username = document.getElementById('authUsername').value;
            const password = document.getElementById('authPassword').value;
            const email = document.getElementById('authEmail').value;

            const payload = { username, password };
            if (!isLoginMode) payload.email = email;

            try {
                const response = await fetch(`api/auth.php?action=${action}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (data.error) {
                    const errDiv = document.getElementById('authError');
                    errDiv.textContent = data.error;
                    errDiv.style.display = 'block';
                } else if (data.success) {
                    modal.style.display = 'none';
                    if (typeof showToast === 'function') {
                        showToast(`Bienvenido, ${data.user.username}!`, 'success');
                    }
                    updateUIForUser(data.user);
                    // Disparar evento para que otras partes de la app recarguen sus datos
                    window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: data.user }));
                }
            } catch (err) {
                console.error('Auth error:', err);
            }
        };
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('api/auth.php?action=me');
        const data = await response.json();
        if (data.loggedIn) {
            updateUIForUser(data.user);
            window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: data.user }));
        } else {
            updateUIForGuest();
            window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: null }));
        }
    } catch (e) {
        console.error('Failed to check auth status', e);
    }
}

function updateUIForUser(user) {
    const authBtn = document.getElementById('authBtn');
    const userMenu = document.getElementById('userMenu');
    const welcomeMsg = document.getElementById('welcomeMsg');

    if (authBtn) authBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (welcomeMsg) welcomeMsg.innerHTML = `<i class="fas fa-user-circle"></i> ${user.username}`;
    window.jamvaultUser = user;
}

function updateUIForGuest() {
    const authBtn = document.getElementById('authBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (authBtn) authBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
    window.jamvaultUser = null;
}

async function handleLogout() {
    try {
        await fetch('api/auth.php?action=logout', { method: 'POST' });
        updateUIForGuest();
        if (typeof showToast === 'function') {
            showToast('Sesión cerrada', 'info');
        }
        window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: null }));
    } catch (e) {
        console.error('Logout error', e);
    }
}
