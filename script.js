// ================================================
// COMPLETE FRONTEND ENGINE
// ================================================

const API_BASE = 'https://abanabame-backend.onrender.com/api';
const APP_URL = 'https://abanabame.globalcreest.com';

// ================================================
// STATE
// ================================================
const state = {
  token: localStorage.getItem('gospel_token'),
  user: null,
  songs: [],
  currentSongId: null,
  unlocked: false,
  selectedAmount: 2000,
  isPlaying: false,
  audio: null
};

// ================================================
// INITIALIZE
// ================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Setup audio
  state.audio = new Audio();
  setupAudioControls();
  
  // Check auth
  if (state.token) {
    await verifyToken();
  }
  
  // Load songs
  await loadSongs();
  
  // Setup particles
  setupParticles();
  
  // Setup share buttons
  setupShareButtons();
  
  // Check payment verification
  await verifyPayment();
});

// ================================================
// API HELPERS
// ================================================
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  return response.json();
}

// ================================================
// AUTH
// ================================================
async function verifyToken() {
  try {
    const data = await apiFetch('/auth/verify');
    if (data.success) {
      state.user = data.user;
      showUserUI(data.user);
    } else {
      logout();
    }
  } catch (e) {
    logout();
  }
}

function showUserUI(user) {
  document.getElementById('authBtn').style.display = 'none';
  document.getElementById('userMenu').style.display = 'flex';
  document.getElementById('userNameDisplay').textContent = user.name || user.email;
  document.getElementById('avatarText').textContent = (user.name || 'U')[0].toUpperCase();
  
  if (user.isCreator) {
    document.getElementById('creatorDashboard').style.display = 'block';
    loadMySongs();
  }
}

async function login(email, password) {
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('gospel_token', data.token);
      closeAuthModal();
      showUserUI(data.user);
      location.reload();
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (e) {
    alert('Network error');
  }
}

async function signup(email, name, password) {
  try {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, password })
    });
    
    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('gospel_token', data.token);
      closeAuthModal();
      showUserUI(data.user);
      location.reload();
    } else {
      alert(data.error || 'Signup failed');
    }
  } catch (e) {
    alert('Network error');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('gospel_token');
  location.reload();
}

// ================================================
// SONGS
// ================================================
async function loadSongs() {
  try {
    const data = await apiFetch('/songs');
    if (data.success) {
      state.songs = data.songs;
      renderLibrary();
      if (state.songs.length > 0) {
        await loadSong(state.songs[0]._id);
      }
    }
  } catch (e) {
    console.error('Load songs error:', e);
  }
}

async function loadSong(songId) {
  state.currentSongId = songId;
  const song = state.songs.find(s => s._id === songId);
  if (!song) return;
  
  // Update UI
  document.getElementById('currentTitle').textContent = song.title;
  document.getElementById('currentArtist').textContent = song.artist;
  document.getElementById('currentCover').src = song.coverUrl;
  document.getElementById('donationSongName').textContent = song.title;
  
  // Load audio
  state.audio.src = song.audioUrl;
  state.audio.load();
  
  // Check unlock
  await checkUnlock(songId);
  
  // Update active card
  document.querySelectorAll('.song-card').forEach(card => {
    card.classList.toggle('active', card.dataset.songId === songId);
  });
  
  // Load lyrics
  await loadLyrics(songId);
}

async function loadLyrics(songId) {
  try {
    const email = state.user?.email || localStorage.getItem('gospel_email');
    const data = await apiFetch(`/songs/${songId}/lyrics`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    if (data.success) {
      renderLyrics(data.lyrics, 0);
    }
  } catch (e) {
    console.error('Load lyrics error:', e);
  }
}

function renderLyrics(lyrics, currentTime) {
  const display = document.getElementById('lyricsDisplay');
  
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      activeIndex = i;
    } else {
      break;
    }
  }
  
  let html = '';
  for (let i = 0; i < lyrics.length; i++) {
    const isActive = i === activeIndex;
    html += `<span class="lyric-line ${isActive ? 'lyric-line-active' : ''}">${lyrics[i].text}</span>`;
  }
  
  display.innerHTML = html;
  
  if (activeIndex >= 0) {
    const active = display.querySelector('.lyric-line-active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function renderLibrary() {
  const grid = document.getElementById('songGrid');
  grid.innerHTML = state.songs.map(song => `
    <div class="song-card" data-song-id="${song._id}" onclick="loadSong('${song._id}')">
      <img src="${song.coverUrl}" alt="${song.title}" loading="lazy">
      <div class="card-title">${song.title}</div>
      <div class="card-artist">${song.artist}</div>
      <span class="card-badge badge-locked" id="badge-${song._id}">🔒 Locked</span>
    </div>
  `).join('');
}

// ================================================
// UNLOCK
// ================================================
async function checkUnlock(songId) {
  if (!state.token) {
    updateUnlockUI(songId, false);
    return;
  }
  
  try {
    const email = state.user?.email || localStorage.getItem('gospel_email');
    const data = await apiFetch('/unlock/check', {
      method: 'POST',
      body: JSON.stringify({ email, songId })
    });
    
    updateUnlockUI(songId, data.unlocked);
  } catch (e) {
    updateUnlockUI(songId, false);
  }
}

function updateUnlockUI(songId, unlocked) {
  state.unlocked = unlocked;
  
  // Update badge
  const badge = document.getElementById(`badge-${songId}`);
  if (badge) {
    badge.textContent = unlocked ? '🔓 Unlocked' : '🔒 Locked';
    badge.className = `card-badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}`;
  }
  
  // Update status
  const status = document.getElementById('songStatus');
  status.textContent = unlocked ? '🔓 Unlocked' : '🔒 Locked';
  status.className = `song-status ${unlocked ? 'status-unlocked' : 'status-locked'}`;
  
  // Update donate button
  const btn = document.getElementById('donateBtn');
  if (unlocked) {
    btn.textContent = '✅ Already Unlocked';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    document.getElementById('donationMessage').innerHTML = 
      `✅ <span style="color:#4ade80;">Permanent Access Unlocked!</span>`;
  } else {
    btn.textContent = '💖 Donate & Unlock';
    btn.disabled = false;
    btn.style.opacity = '1';
    const song = state.songs.find(s => s._id === songId);
    document.getElementById('donationMessage').innerHTML = 
      `❤️ Support <span id="donationSongName">${song?.title || 'this song'}</span>`;
  }
}

// ================================================
// AUDIO CONTROLS
// ================================================
function setupAudioControls() {
  const audio = state.audio;
  const playBtn = document.getElementById('playBtn');
  const progressBar = document.getElementById('progressBar');
  const timeDisplay = document.getElementById('timeDisplay');
  const volumeSlider = document.getElementById('volumeSlider');
  
  audio.addEventListener('loadedmetadata', updateTimeDisplay);
  
  audio.addEventListener('timeupdate', () => {
    updateTimeDisplay();
    // Update lyrics if we have them
    const song = state.songs.find(s => s._id === state.currentSongId);
    if (song && song.lyrics) {
      renderLyrics(song.lyrics, audio.currentTime);
    }
    
    // Preview limit
    const songData = state.songs.find(s => s._id === state.currentSongId);
    if (songData && !state.unlocked && audio.currentTime >= (songData.previewDuration || 30)) {
      audio.pause();
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
      document.getElementById('donationSection').scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      const song = state.songs.find(s => s._id === state.currentSongId);
      if (!state.unlocked && audio.currentTime >= (song?.previewDuration || 30)) {
        audio.currentTime = 0;
      }
      audio.play();
      playBtn.textContent = '⏸';
      playBtn.classList.add('playing');
    } else {
      audio.pause();
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
    }
  });
  
  progressBar.addEventListener('input', (e) => {
    if (audio.duration) {
      audio.currentTime = (e.target.value / 100) * audio.duration;
    }
  });
  
  volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100;
  });
  
  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
    playBtn.classList.remove('playing');
    progressBar.value = 0;
  });
}

function updateTimeDisplay() {
  const audio = state.audio;
  const current = audio.currentTime || 0;
  const duration = audio.duration || 0;
  document.getElementById('timeDisplay').textContent = 
    `${formatTime(current)} / ${formatTime(duration)}`;
  if (duration > 0) {
    document.getElementById('progressBar').value = (current / duration) * 100;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ================================================
// DONATION
// ================================================
function setupDonation() {
  const amountBtns = document.querySelectorAll('#donationAmounts button');
  const customInput = document.getElementById('customAmount');
  
  amountBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      amountBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (this.dataset.amount === 'custom') {
        customInput.disabled = false;
        customInput.focus();
        state.selectedAmount = parseInt(customInput.value) || 100;
      } else {
        customInput.disabled = true;
        state.selectedAmount = parseInt(this.dataset.amount);
        customInput.value = state.selectedAmount;
      }
    });
  });
  
  customInput.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val > 0) {
      state.selectedAmount = val;
      amountBtns.forEach(b => b.classList.remove('active'));
      document.querySelector('#donationAmounts button[data-amount="custom"]')?.classList.add('active');
    }
  });
  
  const savedEmail = localStorage.getItem('gospel_email');
  if (savedEmail) {
    document.getElementById('donorEmail').value = savedEmail;
  }
  
  document.getElementById('donateBtn').addEventListener('click', handleDonate);
}

async function handleDonate() {
  if (state.unlocked) {
    document.getElementById('donateStatus').textContent = '✅ Already unlocked!';
    return;
  }
  
  const email = document.getElementById('donorEmail').value.trim();
  const amount = state.selectedAmount;
  const songId = state.currentSongId;
  
  if (!email || !email.includes('@')) {
    document.getElementById('donateStatus').textContent = '⚠️ Please enter a valid email';
    return;
  }
  
  if (!amount || amount < 100) {
    document.getElementById('donateStatus').textContent = '⚠️ Minimum donation is ₦100';
    return;
  }
  
  localStorage.setItem('gospel_email', email);
  
  document.getElementById('donateStatus').textContent = '⏳ Processing...';
  document.getElementById('donateBtn').disabled = true;
  
  try {
    const data = await apiFetch('/donation/initialize', {
      method: 'POST',
      body: JSON.stringify({ amount, email, songId })
    });
    
    if (data.success && data.authorization_url) {
      window.location.href = data.authorization_url;
    } else if (data.alreadyUnlocked) {
      state.unlocked = true;
      updateUnlockUI(songId, true);
      document.getElementById('donateStatus').textContent = '✅ Already unlocked!';
      document.getElementById('donateBtn').disabled = false;
    } else {
      document.getElementById('donateStatus').textContent = '❌ ' + (data.error || 'Payment failed');
      document.getElementById('donateBtn').disabled = false;
    }
  } catch (e) {
    document.getElementById('donateStatus').textContent = '❌ Network error. Try again.';
    document.getElementById('donateBtn').disabled = false;
    console.error(e);
  }
}

// ================================================
// PAYMENT VERIFICATION
// ================================================
async function verifyPayment() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('reference');
  const songId = params.get('songId');
  
  if (ref) {
    try {
      const data = await apiFetch('/donation/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: ref })
      });
      
      if (data.verified) {
        state.unlocked = true;
        localStorage.setItem('gospel_email', data.email);
        if (songId) {
          updateUnlockUI(songId, true);
        }
        document.getElementById('donateStatus').textContent = '🎉 Thank you! Song unlocked!';
        document.getElementById('donateStatus').style.color = '#4ade80';
        
        // Play full song
        state.audio.play();
        document.getElementById('playBtn').textContent = '⏸';
        document.getElementById('playBtn').classList.add('playing');
        
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Verify error:', e);
    }
  }
}

// ================================================
// SHARE
// ================================================
function setupShareButtons() {
  document.getElementById('shareWhatsAppBtn').addEventListener('click', () => {
    const song = state.songs.find(s => s._id === state.currentSongId);
    const msg = encodeURIComponent(
      `🎵 Listen to "${song?.title || 'this song'}" by ${song?.artist || 'artist'}!\n` +
      `🔗 ${APP_URL}\n` +
      `❤️ Support the ministry!`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  });
  
  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(APP_URL).then(() => {
        showCopySuccess();
      });
    } else {
      const input = document.createElement('input');
      input.value = APP_URL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showCopySuccess();
    }
  });
}

function showCopySuccess() {
  const status = document.getElementById('donateStatus');
  status.textContent = '✅ Link copied!';
  status.style.color = '#4ade80';
  setTimeout(() => {
    status.textContent = '✨ Share the blessing';
    status.style.color = '#8a7d6a';
  }, 2500);
}

// ================================================
// PARTICLES
// ================================================
function setupParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  document.body.prepend(canvas);
  
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = 0, mouseY = 0;
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.2;
      this.speedY = (Math.random() - 0.5) * 0.2;
      this.opacity = Math.random() * 0.2 + 0.05;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 100) {
        this.x -= dx * 0.01;
        this.y -= dy * 0.01;
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 150, ${this.opacity})`;
      ctx.fill();
    }
  }
  
  for (let i = 0; i < 60; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

// ================================================
// MODALS
// ================================================
function showAuthModal() {
  document.getElementById('authModal').classList.add('show');
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
  
  if (isSignup) {
    await signup(email, name, password);
  } else {
    await login(email, password);
  }
}

async function loginWithGoogle() {
  // For Google OAuth, you'd redirect to backend
  // Or use Firebase/Auth0 etc.
  alert('Google login coming soon! Use email/password for now.');
}

function showUploadModal() {
  document.getElementById('uploadModal').classList.add('show');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.remove('show');
}

// ================================================
// CREATOR UPLOAD
// ================================================
async function submitUpload() {
  const title = document.getElementById('uploadTitle').value.trim();
  const artist = document.getElementById('uploadArtist').value.trim();
  const price = parseInt(document.getElementById('uploadPrice').value) || 2000;
  const preview = parseInt(document.getElementById('uploadPreview').value) || 30;
  const lyricsText = document.getElementById('uploadLyrics').value.trim();
  const audioFile = document.getElementById('uploadAudio').files[0];
  const coverFile = document.getElementById('uploadCover').files[0];
  
  if (!title || !artist) {
    document.getElementById('uploadStatus').textContent = '⚠️ Title and Artist are required';
    return;
  }
  
  if (!audioFile || !coverFile) {
    document.getElementById('uploadStatus').textContent = '⚠️ Audio and Cover files are required';
    return;
  }
  
  let lyrics = [];
  if (lyricsText) {
    try {
      lyrics = JSON.parse(lyricsText);
    } catch (e) {
      document.getElementById('uploadStatus').textContent = '⚠️ Invalid JSON format for lyrics';
      return;
    }
  }
  
  document.getElementById('uploadStatus').textContent = '⏳ Uploading...';
  
  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('price', price);
  formData.append('previewDuration', preview);
  formData.append('lyrics', JSON.stringify(lyrics));
  formData.append('audio', audioFile);
  formData.append('cover', coverFile);
  
  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('uploadStatus').textContent = '✅ ' + data.message;
      document.getElementById('uploadStatus').style.color = '#4ade80';
      setTimeout(() => {
        closeUploadModal();
        loadMySongs();
        document.getElementById('uploadTitle').value = '';
        document.getElementById('uploadArtist').value = '';
        document.getElementById('uploadLyrics').value = '';
        document.getElementById('uploadStatus').textContent = '';
        document.getElementById('uploadStatus').style.color = '#8a7d6a';
      }, 3000);
    } else {
      document.getElementById('uploadStatus').textContent = '❌ ' + (data.error || 'Upload failed');
    }
  } catch (e) {
    document.getElementById('uploadStatus').textContent = '❌ Network error. Try again.';
    console.error(e);
  }
}

async function loadMySongs() {
  try {
    const response = await fetch(`${API_BASE}/upload/my-songs`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const container = document.getElementById('mySongsList');
      
      if (data.songs && data.songs.length > 0) {
        container.innerHTML = data.songs.map(song => `
          <div class="my-song-item">
            <span><strong>${song.title}</strong> - ${song.artist}</span>
            <span class="status status-${song.isPublished ? 'approved' : 'pending'}">${song.isPublished ? '✅ Published' : '⏳ Pending'}</span>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<p style="color:#6a5d4a;font-size:0.85rem;">No songs uploaded yet.</p>';
      }
    }
  } catch (e) {
    console.error('Load my songs error:', e);
  }
}

// ================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ================================================
window.loadSong = loadSong;
window.loginWithGoogle = loginWithGoogle;
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.logout = logout;
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.submitUpload = submitUpload;