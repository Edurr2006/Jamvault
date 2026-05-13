/**
 * JamVault - Perfil.js
 * Gestiona la edición del perfil de usuario a través de la interfaz dedicada Perfil.html.
 */

document.addEventListener('DOMContentLoaded', () => {
    const profForm = document.getElementById('perfilForm');
    const msgDiv = document.getElementById('perfilResponseMsg');
    
    // Escuchar cambios de autenticación para redirigir si se cierra sesión, o rellenar si se inicia sesión
    window.addEventListener('jamvault:auth_changed', (e) => {
        const user = e.detail;
        if (!user) {
            // Redirigir a inicio si se cierra sesión
            window.location.href = 'index.html';
        } else {
            // Rellenar formulario
            document.getElementById('perfilUsername').value = user.username || '';
            document.getElementById('perfilEmail').value = user.email || '';
        }
    });

    // Envío del formulario
    if (profForm) {
        profForm.onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('perfilUsername').value;
            const email = document.getElementById('perfilEmail').value;
            const password = document.getElementById('perfilPassword').value;

            const payload = { username, email };
            if (password) payload.password = password;

            try {
                const response = await fetch('api/auth.php?action=update_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (data.error) {
                    msgDiv.textContent = data.error;
                    msgDiv.style.color = '#ff4444';
                    msgDiv.style.background = 'rgba(255, 68, 68, 0.1)';
                    msgDiv.style.border = '1px solid rgba(255, 68, 68, 0.3)';
                    msgDiv.style.display = 'block';
                } else if (data.success) {
                    msgDiv.textContent = 'Perfil actualizado correctamente.';
                    msgDiv.style.color = '#10D96A';
                    msgDiv.style.background = 'rgba(16, 217, 106, 0.1)';
                    msgDiv.style.border = '1px solid rgba(16, 217, 106, 0.3)';
                    msgDiv.style.display = 'block';
                    
                    // Limpiar campo de contraseña
                    document.getElementById('perfilPassword').value = '';

                    // Actualizar estado global
                    window.jamvaultUser = data.user;
                    // Disparar evento para que Auth.js sincronice #userMenu dentro del Header
                    window.dispatchEvent(new CustomEvent('jamvault:auth_changed', { detail: data.user }));
                    
                    if (typeof showToast === 'function') {
                        showToast('Perfil actualizado correctamente', 'success');
                    }
                }
            } catch (err) {
                console.error('Profile update error:', err);
                msgDiv.textContent = 'Error de conexión. Inténtalo de nuevo.';
                msgDiv.style.color = '#ff4444';
                msgDiv.style.background = 'rgba(255, 68, 68, 0.1)';
                msgDiv.style.display = 'block';
            }
        };
    }
});
