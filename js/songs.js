// ================================================
// SONGS
// ================================================

function setupSearchControls() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const libraryGrid = document.getElementById('songGrid');

  if (!searchInput || !searchBtn || !clearSearchBtn || !libraryGrid) return;

  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    await searchSongs(query);
  });

  clearSearchBtn.addEventListener('click', async () => {
    searchInput.value = '';
    await loadSongs();
  });

  searchInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      const query = searchInput.value.trim();
      await searchSongs(query);
    }
  });
}

async function loadSongs() {
  try {
    const data = await apiFetch('/songs');
    if (data.success) {
      window.state.songs = data.songs;
      renderLibrary();
      if (window.state.songs.length > 0) {
        await loadSong(window.state.songs[0]._id);
      }
    }
  } catch (e) {
    console.error('Load songs error:', e);
    document.getElementById('songGrid').innerHTML = 
      '<div class="loading">Failed to load songs. Please refresh.</div>';
  }
}

async function searchSongs(query) {
  const trimmed = query.trim();

  if (!trimmed) {
    await loadSongs();
    return;
  }

  try {
    const data = await apiFetch(`/songs/search?q=${encodeURIComponent(trimmed)}`);
    if (data.success) {
      window.state.songs = data.songs;
      renderLibrary();
      if (window.state.songs.length > 0) {
        await loadSong(window.state.songs[0]._id);
      }
    }
  } catch (e) {
    console.error('Search songs error:', e);
    document.getElementById('songGrid').innerHTML =
      '<div class="loading">Search failed. Please try again.</div>';
  }
}

async function loadFeaturedSongs() {
  try {
    const data = await apiFetch('/songs/featured');
    if (data.success && data.songs?.length > 0) {
      window.state.songs = data.songs;
      renderLibrary();
      await loadSong(data.songs[0]._id);
    }
  } catch (e) {
    console.error('Featured songs error:', e);
  }
}

async function loadSong(songId) {
  window.state.currentSongId = songId;
  const song = window.state.songs.find(s => s._id === songId);
  if (!song) return;
  
  // Update UI
  document.getElementById('currentTitle').textContent = song.title;
  document.getElementById('currentArtist').textContent = song.artist;
  document.getElementById('currentCover').src = song.coverUrl;
  document.getElementById('donationSongName').textContent = song.title;
  
  const audioPlayer = document.getElementById('audioPlayer');
  if (audioPlayer) {
    audioPlayer.src = song.audioUrl;
    audioPlayer.load();
  }
  
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
    const email = window.state.user?.email || localStorage.getItem(CONFIG.EMAIL_KEY);
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
  
  if (!lyrics || lyrics.length === 0) {
    display.innerHTML = '<span style="color:#6a5d4a;">No lyrics available</span>';
    return;
  }
  
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
  
  if (!window.state.songs || window.state.songs.length === 0) {
    grid.innerHTML = '<div class="loading">No songs available</div>';
    return;
  }
  
  grid.innerHTML = window.state.songs.map(song => `
    <div class="song-card" data-song-id="${song._id}" onclick="window.loadSong('${song._id}')">
      <img src="${song.coverUrl}" alt="${song.title}" loading="lazy">
      <div class="card-title">${song.title}</div>
      <div class="card-artist">${song.artist}</div>
      <span class="card-badge badge-locked" id="badge-${song._id}">🔒 Locked</span>
    </div>
  `).join('');
}

// Expose to window
window.loadSong = loadSong;
window.searchSongs = searchSongs;
window.loadFeaturedSongs = loadFeaturedSongs;
window.setupSearchControls = setupSearchControls;