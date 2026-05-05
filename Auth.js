/**
 * JamVault - Auth.js
 * Handles user authentication, session management, and UI updates across all pages.
 */

// Guards against spurious logout events / toasts when no session was ever active
let _authSessionActive = false;
let _authEventsSetup = false;

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
        <div id="userMenu" class="user-menu" style="display: none; align-items: center; gap: 10px;">
            <span id="welcomeMsg" style="color: white; margin-right: 15px; font-weight: bold;"></span>
            <button id="profileBtn" class="btn btn-outline" style="background: rgba(255, 255, 255, 0.1); color: #fff; border-color: rgba(255, 255, 255, 0.3); padding: 8px 15px;"><i class="fas fa-cog"></i> Perfil</button>
            <button id="logoutBtn" class="btn btn-outline" style="background: rgba(255, 68, 68, 0.1); color: #ff4444; border-color: rgba(255, 68, 68, 0.3); padding: 8px 15px;"><i class="fas fa-sign-out-alt"></i> Salir</button>
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
    <div id="authModal" class="modal-overlay">
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h2 id="authTitle">Iniciar Sesión</h2>
                <button class="auth-modal-close" id="closeAuthModal"><i class="fas fa-times"></i></button>
            </div>
            <div class="auth-modal-body">
                <form id="authForm">
                    <div class="auth-input-group">
                        <input type="text" id="authUsername" class="auth-input" placeholder="Nombre de usuario" required autocomplete="username">
                        <i class="fas fa-user" style="position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none;"></i>
                    </div>
                    <div id="registerEmailField" style="display: none;">
                        <div class="auth-input-group">
                            <input type="email" id="authEmail" class="auth-input" placeholder="Correo electrónico" autocomplete="email">
                            <i class="fas fa-envelope" style="position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none;"></i>
                        </div>
                    </div>
                    <div class="auth-input-group">
                        <input type="password" id="authPassword" class="auth-input" placeholder="Contraseña" required autocomplete="current-password">
                        <i class="fas fa-lock" style="position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none;"></i>
                    </div>
                    <div id="registerConfirmField" style="display: none;">
                        <div class="auth-input-group">
                            <input type="password" id="authConfirmPassword" class="auth-input" placeholder="Repetir contraseña" autocomplete="new-password">
                            <i class="fas fa-lock" style="position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.4); pointer-events: none;"></i>
                        </div>
                    </div>
                    <div id="authError" style="color: #ff4444; margin-bottom: 1.5rem; font-size: 0.95rem; text-align: center; display: none; background: rgba(255, 68, 68, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 68, 68, 0.3);"></div>
                    <button type="submit" class="auth-submit-btn" id="authSubmitBtn">ENTRAR</button>
                </form>
                <div class="auth-footer">
                    <span id="authToggleText">¿No tienes cuenta?</span> 
                    <a href="#" id="toggleAuthMode">Regístrate</a>
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
    if (_authEventsSetup) return; // Prevent multiple listeners
    _authEventsSetup = true;

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
                modal.classList.add('modal-active');
            }
        }

        if (closeBtnClicked) {
            e.preventDefault();
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.remove('modal-active');
        }

        const profileBtnClicked = e.target.closest('#profileBtn');

        if (profileBtnClicked) {
            e.preventDefault();
            window.location.href = 'Perfil.html';
        }

        if (logoutBtnClicked) {
            e.preventDefault();
            if (typeof window.showConfirm === 'function') {
                window.showConfirm("¿Estás seguro de que deseas cerrar sesión?", () => {
                    handleLogout();
                });
            } else {
                handleLogout();
            }
            return;
        }
        
        if (toggleModeClicked) {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            document.getElementById('authTitle').textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
            document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Entrar' : 'Registrarse';
            document.getElementById('registerEmailField').style.display = isLoginMode ? 'none' : 'block';
            document.getElementById('registerConfirmField').style.display = isLoginMode ? 'none' : 'block';
            document.getElementById('authToggleText').textContent = isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
            toggleModeClicked.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión';
            document.getElementById('authError').style.display = 'none';
        }
    });

    const form = document.getElementById('authForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const modal = document.getElementById('authModal');
            const action = isLoginMode ? 'login' : 'register';
            const username = document.getElementById('authUsername').value;
            const password = document.getElementById('authPassword').value;
            const confirmPassword = document.getElementById('authConfirmPassword')?.value;
            const email = document.getElementById('authEmail').value;

            if (!isLoginMode && password !== confirmPassword) {
                const errDiv = document.getElementById('authError');
                errDiv.textContent = "Las contraseñas no coinciden";
                errDiv.style.display = 'block';
                return;
            }

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
                    if (modal) modal.classList.remove('modal-active');
                    if (typeof showToast === 'function') {
                        showToast(`¡Bienvenido, ${data.user.username}!`, 'success');
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
    _authSessionActive = true;
}

function updateUIForGuest() {
    const authBtn = document.getElementById('authBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (authBtn) authBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
    window.jamvaultUser = null;
}

async function handleLogout() {
    if (!_authSessionActive) return; // Already logged out or no session
    _authSessionActive = false;

    try {
        await fetch('api/auth.php?action=logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout fetch error', e);
    }
    
    // Always clear UI and dispatch even if logout fetch failed (local session is done)
    updateUIForGuest();
    if (typeof showToast === 'function') {
        showToast('Sesión cerrada', 'info');
    }
    window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: null }));
}
