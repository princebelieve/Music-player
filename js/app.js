// ================================================
// APP STATE & INITIALIZATION
// ================================================

// Global state
window.state = {
  token: localStorage.getItem(CONFIG.STORAGE_KEY),
  user: null,
  songs: [],
  currentSongId: null,
  unlocked: false,
  selectedAmount: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Setup audio controls
  setupAudioControls();

  // Wire search UI
  setupSearchControls();
  
  // Check auth
  if (window.state.token) {
    await verifyToken();
  }
  
  // Load songs
  await loadSongs();
  
  // Setup donation
  setupDonation();
  
  // Setup particles
  setupParticles();
  
  // Setup share buttons
  setupShareButtons();
  
  // Check payment verification
  await verifyPayment();
  
  console.log('🎵 Gospel Music Platform loaded!');
  console.log(`📚 ${window.state.songs.length} songs loaded`);
  console.log(`👤 ${window.state.user ? 'Logged in as ' + window.state.user.name : 'Not logged in'}`);
});