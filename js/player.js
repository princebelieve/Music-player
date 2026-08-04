// ================================================
// AUDIO PLAYER
// ================================================

let audio = document.getElementById('audioPlayer');
let isPlaying = false;

function setupAudioControls() {
  if (!audio) return;

  const playBtn = document.getElementById('playBtn');
  const progressBar = document.getElementById('progressBar');
  const timeDisplay = document.getElementById('timeDisplay');
  const volumeSlider = document.getElementById('volumeSlider');
  
  if (audio) {
    audio.addEventListener('loadedmetadata', updateTimeDisplay);
  }
  
  audio.addEventListener('timeupdate', () => {
    updateTimeDisplay();
    
    const song = window.state.songs.find(s => s._id === window.state.currentSongId);
    if (song && song.lyrics && window.state.unlocked) {
      renderLyrics(song.lyrics, audio.currentTime);
    }
    
    const songData = window.state.songs.find(s => s._id === window.state.currentSongId);
    if (songData && !window.state.unlocked && audio.currentTime >= (songData.previewDuration || 30)) {
      audio.pause();
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
      const donationSection = document.getElementById('donationSection');
      if (donationSection) {
        donationSection.scrollIntoView({ behavior: 'smooth' });
      }
      
      document.getElementById('donationMessage').innerHTML =
        '❤️ <span>Preview complete. Donate to unlock the full song!</span>';
      document.getElementById('donateStatus').textContent = '🎵 Donate to unlock the full song forever!';
    }
  });
  
  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      const song = window.state.songs.find(s => s._id === window.state.currentSongId);
      if (!window.state.unlocked && audio.currentTime >= (song?.previewDuration || 30)) {
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
  
  if (progressBar) {
    progressBar.addEventListener('input', (e) => {
      if (audio.duration) {
        audio.currentTime = (e.target.value / 100) * audio.duration;
      }
    });
  }
  
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = e.target.value / 100;
    });
  }
  
  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶';
    playBtn.classList.remove('playing');
    progressBar.value = 0;
  });
}

function updateTimeDisplay() {
  if (!audio) return;
  const current = audio.currentTime || 0;
  const duration = audio.duration || 0;
  const timeDisplay = document.getElementById('timeDisplay');
  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  }
  const progressBar = document.getElementById('progressBar');
  if (duration > 0 && progressBar) {
    progressBar.value = (current / duration) * 100;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function playSong() {
  if (window.state.currentSongId) {
    apiFetch(`/songs/${window.state.currentSongId}/play`, { method: 'POST' }).catch(() => {});
  }

  audio.play();
  document.getElementById('playBtn').textContent = '⏸';
  document.getElementById('playBtn').classList.add('playing');
}

function pauseSong() {
  audio.pause();
  document.getElementById('playBtn').textContent = '▶';
  document.getElementById('playBtn').classList.remove('playing');
}