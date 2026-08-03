// ================================================
// AUTHENTICATION
// ================================================

async function verifyToken() {
  try {
    const data = await apiFetch('/auth/verify');
    if (data.success) {
      window.state.user = data.user;
      showUserUI(data.user);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function showUserUI(user) {
  document.getElementById('authBtn').style.display = 'none';
  const menu = document.getElementById('userMenu');
  menu.style.display = 'flex';
  document.getElementById('userNameDisplay').textContent = user.name || user.email;
  document.getElementById('avatarText').textContent = (user.name || 'U')[0].toUpperCase();
  
  if (user.isCreator) {
    document.getElementById('creatorDashboard').style.display = 'block';
    loadMySongs();
  }

  if (user.isAdmin) {
    document.getElementById('adminDashboard').style.display = 'block';
    loadAdminStats();
  }
}

async function loadAdminStats() {
  try {
    const data = await apiFetch('/admin/stats');
    const adminStats = document.getElementById('adminStats');
    if (data.success && adminStats) {
      const stats = data.stats || {};
      adminStats.textContent = `Total users: ${stats.totalUsers || 0} • Published songs: ${stats.publishedSongs || 0} • Total songs: ${stats.totalSongs || 0} • Creators: ${stats.totalCreators || 0}`;
    }

    await loadAdminUsers();
  } catch (e) {
    console.error('Load admin stats error:', e);
  }
}

async function loadAdminUsers() {
  try {
    const data = await apiFetch('/admin/users');
    const container = document.getElementById('adminUsersList');
    if (!data.success || !container) return;

    container.innerHTML = data.users.map(user => `
      <div class="my-song-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <span><strong>${user.name || user.email}</strong> — ${user.email}</span>
        <span style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn" onclick="window.promoteUserToCreator('${user.email}')">${user.isCreator ? 'Creator' : 'Make Creator'}</button>
          <button class="btn" onclick="window.promoteUserToAdmin('${user.email}')">${user.isAdmin ? 'Admin' : 'Make Admin'}</button>
        </span>
      </div>
    `).join('');
  } catch (e) {
    console.error('Load admin users error:', e);
  }
}

async function promoteUserToCreator(email) {
  try {
    const data = await apiFetch('/admin/make-creator', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to update creator role');
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

async function promoteUserToAdmin(email) {
  try {
    const data = await apiFetch('/admin/make-admin', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to update admin role');
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

function showAuthModal() {
  document.getElementById('authModal').classList.add('show');
  document.getElementById('authTitle').textContent = 'Sign In';
  document.getElementById('authName').style.display = 'none';
  document.getElementById('authSubmitBtn').textContent = 'Sign In';
  document.getElementById('authSwitchText').textContent = "Don't have an account?";
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
}

function toggleAuthMode() {
  const isSignup = document.getElementById('authTitle').textContent === 'Sign Up';
  document.getElementById('authTitle').textContent = isSignup ? 'Sign In' : 'Sign Up';
  document.getElementById('authName').style.display = isSignup ? 'none' : 'block';
  document.getElementById('authSubmitBtn').textContent = isSignup ? 'Sign In' : 'Sign Up';
  document.getElementById('authSwitchText').textContent = isSignup ? "Don't have an account?" : 'Already have an account?';
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value;
  const isSignup = document.getElementById('authTitle').textContent === 'Sign Up';
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    const body = isSignup ? { email, name, password } : { email, password };
    
    const data = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    if (data.success) {
      localStorage.setItem(CONFIG.STORAGE_KEY, data.token);
      window.state.user = data.user;
      closeAuthModal();
      showUserUI(data.user);
      if (data.user.isCreator) {
        document.getElementById('creatorDashboard').style.display = 'block';
        loadMySongs();
      }
      location.reload();
    } else {
      alert(data.error || 'Authentication failed');
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

function loginWithGoogle() {
  alert('Google login coming soon! Use email/password for now.');
}

function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  window.state.user = null;
  location.reload();
}

// Expose to window
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.promoteUserToCreator = promoteUserToCreator;
window.promoteUserToAdmin = promoteUserToAdmin;