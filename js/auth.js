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
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    return false;
  } catch (e) {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    return false;
  }
}

function showUserUI(user) {
  const authBtn = document.getElementById('authBtn');
  if (authBtn) authBtn.style.display = 'none';

  const menu = document.getElementById('userMenu');
  if (menu) menu.style.display = 'flex';

  const userNameDisplay = document.getElementById('userNameDisplay');
  if (userNameDisplay) userNameDisplay.textContent = user.name || user.email;

  const avatarText = document.getElementById('avatarText');
  if (avatarText) avatarText.textContent = (user.name || 'U')[0].toUpperCase();

  const creatorDashboard = document.getElementById('creatorDashboard');
  const creatorDashboardMessage = document.getElementById('creatorDashboardMessage');
  const creatorRequestContainer = document.getElementById('creatorRequestContainer');
  const uploadSongBtn = document.getElementById('uploadSongBtn');

  if (creatorDashboard) {
    creatorDashboard.style.display = 'block';
  }

  if (user.isCreator) {
    if (creatorDashboardMessage) {
      creatorDashboardMessage.textContent = 'Your creator account is active. You can upload songs below.';
    }
    if (creatorRequestContainer) {
      creatorRequestContainer.style.display = 'none';
    }
    if (uploadSongBtn) {
      uploadSongBtn.style.display = 'inline-block';
    }
    loadMySongs();
  } else {
    if (creatorDashboardMessage) {
      creatorDashboardMessage.textContent = 'You are signed in as a user. Request creator access or sign in as a creator to upload songs.';
    }
    if (creatorRequestContainer) {
      creatorRequestContainer.style.display = 'block';
    }
    if (uploadSongBtn) {
      uploadSongBtn.style.display = 'none';
    }
  }

  const adminDashboard = document.getElementById('adminDashboard');
  const adminNotice = document.getElementById('adminNotice');
  if (user.isAdmin && adminDashboard) {
    adminDashboard.style.display = 'block';
    if (adminNotice) {
      adminNotice.style.display = 'none';
    }
    loadAdminStats();
  }
}

async function loadAdminStats() {
  try {
    const data = await apiFetch('/admin/stats');
    const adminStats = document.getElementById('adminStats');
    if (data.success && adminStats) {
      const stats = data.stats || {};
      adminStats.textContent = `Total songs: ${stats.totalSongs || 0} • Published: ${stats.publishedSongs || 0} • Pending: ${stats.pendingSongs || 0} • Creators: ${stats.totalCreators || 0}`;
    }

    await Promise.all([loadAdminUsers(), loadAdminPendingSongs(), loadCreatorRequests()]);
  } catch (e) {
    console.error('Load admin stats error:', e);
  }
}

async function loadAdminPendingSongs() {
  try {
    const data = await apiFetch('/admin/pending-songs');
    const container = document.getElementById('adminPendingSongs');
    if (!container) return;

    if (data.success && Array.isArray(data.songs) && data.songs.length > 0) {
      container.innerHTML = `
        <h4 style="margin-bottom:10px;">🎵 Pending Songs for Approval</h4>
        <div class="pending-song-list">${data.songs.map(song => `
          <div class="my-song-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span><strong>${song.title}</strong> — ${song.artist}</span>
            <span style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn" onclick="window.approveSong('${song._id}')">Approve</button>
              <button class="btn btn-danger" onclick="window.rejectSong('${song._id}')">Reject</button>
            </span>
          </div>
        `).join('')}</div>
      `;
    } else {
      container.innerHTML = '<div style="color:#6a5d4a;font-size:0.9rem;margin-bottom:12px;">No pending song approval requests.</div>';
    }
  } catch (e) {
    console.error('Load pending songs error:', e);
  }
}

async function approveSong(songId) {
  try {
    const data = await apiFetch(`/admin/approve/${songId}`, { method: 'POST' });
    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to approve song');
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

async function rejectSong(songId) {
  try {
    const reason = prompt('Enter rejection reason (optional):');
    const data = await apiFetch(`/admin/reject/${songId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to reject song');
    }
  } catch (e) {
    alert('Network error. Please try again.');
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

async function loadCreatorRequests() {
  try {
    const data = await apiFetch('/admin/creator-requests');
    const container = document.getElementById('adminCreatorRequests');
    if (!container) return;

    if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
      container.innerHTML = `
        <h4 style="margin-bottom:10px;">👤 Pending Creator Requests</h4>
        <div class="pending-song-list">${data.requests.map(req => `
          <div class="my-song-item" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span><strong>${req.name}</strong> — ${req.email}</span>
            <span style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn" onclick="window.approveCreatorRequest('${req._id}')">Approve</button>
              <button class="btn btn-danger" onclick="window.rejectCreatorRequest('${req._id}')">Reject</button>
            </span>
          </div>
        `).join('')}</div>`;
    } else {
      container.innerHTML = '<div style="color:#6a5d4a;font-size:0.9rem;margin-bottom:12px;">No pending creator requests.</div>';
    }
  } catch (e) {
    console.error('Load creator requests error:', e);
  }
}

async function approveCreatorRequest(userId) {
  try {
    const data = await apiFetch(`/admin/creator-requests/${userId}/approve`, { method: 'POST' });
    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to approve request');
    }
  } catch (e) {
    alert('Network error. Please try again.');
  }
}

async function rejectCreatorRequest(userId) {
  try {
    const reason = prompt('Enter rejection reason (optional):');
    const data = await apiFetch(`/admin/creator-requests/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    if (data.success) {
      await loadAdminStats();
    } else {
      alert(data.error || 'Failed to reject request');
    }
  } catch (e) {
    alert('Network error. Please try again.');
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
  updateAuthForm(false);
  setAuthStatus('');
  document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
}

function updateAuthForm(isSignup) {
  const title = document.getElementById('authTitle');
  const authName = document.getElementById('authName');
  const authConfirmPassword = document.getElementById('authConfirmPassword');
  const authForgotLink = document.getElementById('authForgotLink');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSwitchText = document.getElementById('authSwitchText');
  const authSwitchLink = document.getElementById('authSwitchLink');

  if (title) title.textContent = isSignup ? 'Sign Up' : 'Sign In';
  if (authName) authName.style.display = isSignup ? 'block' : 'none';
  if (authConfirmPassword) authConfirmPassword.style.display = isSignup ? 'block' : 'none';
  if (authForgotLink) authForgotLink.style.display = isSignup ? 'none' : 'block';
  if (authSubmitBtn) authSubmitBtn.textContent = isSignup ? 'Sign Up' : 'Sign In';
  if (authSwitchText) authSwitchText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
  if (authSwitchLink) authSwitchLink.textContent = isSignup ? 'Sign In' : 'Sign Up';
}

function toggleAuthMode() {
  const isSignup = document.getElementById('authTitle').textContent === 'Sign Up';
  updateAuthForm(!isSignup);
  setAuthStatus('');
}

function setAuthStatus(message, color = '#f5c88a') {
  const status = document.getElementById('authStatus');
  if (status) {
    status.textContent = message;
    status.style.color = color;
  }
}

function togglePasswordVisibility() {
  const show = document.getElementById('authShowPassword')?.checked;
  const passwordField = document.getElementById('authPassword');
  const confirmPasswordField = document.getElementById('authConfirmPassword');
  if (passwordField) passwordField.type = show ? 'text' : 'password';
  if (confirmPasswordField) confirmPasswordField.type = show ? 'text' : 'password';
}

async function showForgotPassword() {
  window.location.href = 'forgot-password.html';
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();
  const confirmPassword = document.getElementById('authConfirmPassword').value;
  const isSignup = document.getElementById('authTitle').textContent === 'Sign Up';

  if (!email || !password) {
    setAuthStatus('❌ Please fill in email and password.', '#f87171');
    return;
  }

  if (isSignup) {
    if (!name) {
      setAuthStatus('❌ Please enter your full name.', '#f87171');
      return;
    }
    if (!confirmPassword) {
      setAuthStatus('❌ Please confirm your password.', '#f87171');
      return;
    }
    if (password !== confirmPassword) {
      setAuthStatus('❌ Passwords do not match.', '#f87171');
      return;
    }
  }

  setAuthStatus('⏳ Processing...', '#c3bfd0');

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
        const creatorDashboardEl = document.getElementById('creatorDashboard');
        if (creatorDashboardEl) {
          creatorDashboardEl.style.display = 'block';
        }
        loadMySongs();
      }
      location.reload();
    } else {
      setAuthStatus('❌ ' + (data.error || 'Authentication failed'), '#f87171');
    }
  } catch (e) {
    setAuthStatus('❌ Network error. Please try again.', '#f87171');
  }
}

function handleGoogleCredential(response) {
  if (!response || !response.credential) {
    setAuthStatus('❌ Google sign-in failed.', '#f87171');
    return;
  }

  apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: response.credential })
  }).then((data) => {
    if (data.success) {
      localStorage.setItem(CONFIG.STORAGE_KEY, data.token);
      window.state.user = data.user;
      closeAuthModal();
      showUserUI(data.user);
      location.reload();
    } else {
      setAuthStatus('❌ ' + (data.error || 'Google login failed'), '#f87171');
    }
  }).catch(() => {
    setAuthStatus('❌ Network error during Google login.', '#f87171');
  });
}

let googleInitAttempts = 0;
let googleLoginReady = false;
function initGoogleLogin() {
  if (!CONFIG.GOOGLE_CLIENT_ID) return;

  const tryInit = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true
      });
      googleLoginReady = true;
      return;
    }

    googleInitAttempts += 1;
    if (googleInitAttempts < 50) {
      setTimeout(tryInit, 200);
    } else {
      googleLoginReady = false;
      console.warn('Google Identity Services failed to initialize.');
    }
  };

  tryInit();
}

function loginWithGoogle() {
  if (!CONFIG.GOOGLE_CLIENT_ID) {
    alert('Google login is not configured.');
    return;
  }

  if (googleLoginReady && window.google && window.google.accounts && window.google.accounts.id) {
    try {
      window.google.accounts.id.prompt();
    } catch (err) {
      setAuthStatus('❌ Google login failed to open. Please reload the page.', '#f87171');
      console.error('Google prompt error:', err);
    }
  } else {
    setAuthStatus('❌ Google login is not ready yet. Please reload the page.', '#f87171');
  }
}

function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
  window.state.user = null;
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  const showPasswordToggle = document.getElementById('authShowPassword');
  if (showPasswordToggle) {
    showPasswordToggle.addEventListener('change', togglePasswordVisibility);
  }
  initGoogleLogin();
});

// Expose to window
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.showForgotPassword = showForgotPassword;
window.showForgotPassword = showForgotPassword;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.promoteUserToCreator = promoteUserToCreator;
window.promoteUserToAdmin = promoteUserToAdmin;
window.approveSong = approveSong;
window.rejectSong = rejectSong;
window.approveCreatorRequest = approveCreatorRequest;
window.rejectCreatorRequest = rejectCreatorRequest;
window.loadAdminStats = loadAdminStats;