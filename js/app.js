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
  if (document.getElementById('audioPlayer')) {
    setupAudioControls();
  }

  if (document.getElementById('searchInput')) {
    setupSearchControls();
  }
  
  if (window.state.token) {
    await verifyToken();
  }
  
  if (document.getElementById('songGrid') || document.getElementById('audioPlayer')) {
    await loadSongs();
  }
  
  if (document.getElementById('donateBtn')) {
    setupDonation();
  }
  
  if (document.getElementById('shareWhatsAppBtn')) {
    setupShareButtons();
  }
  
  if (window.location.search.includes('reference') || window.location.search.includes('trxref')) {
    await verifyPayment();
  }
  
  console.log('🎵 Gospel Music Platform loaded!');
  console.log(`📚 ${window.state.songs.length} songs loaded`);
  console.log(`👤 ${window.state.user ? 'Logged in as ' + window.state.user.name : 'Not logged in'}`);
});