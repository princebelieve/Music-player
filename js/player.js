// ================================================
// AUDIO PLAYER
// ================================================

let audio = document.getElementById('audioPlayer');
let isPlaying = false;

function setupAudioControls() {
  if (!audio) return;

  const playBtn = document.getElementById('playBtn');
  const stopBtn = document.getElementById('stopBtn');
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
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');
      }
      const donationSection = document.getElementById('donationSection');
      if (donationSection) donationSection.scrollIntoView({ behavior: 'smooth' });

      const donationMessage = document.getElementById('donationMessage');
      const donateStatus = document.getElementById('donateStatus');
      if (donationMessage) donationMessage.innerHTML = '❤️ <span>Preview complete. Donate to unlock the full song!</span>';
      if (donateStatus) donateStatus.textContent = '🎵 Donate to unlock the full song forever!';
    }
  });
  if (playBtn) {
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
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      audio.pause();
      audio.currentTime = 0;
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');
      }
      if (progressBar) progressBar.value = 0;
      updateTimeDisplay();
    });
  }
  
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
    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
    }
    if (progressBar) progressBar.value = 0;
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
  if (!audio) return;
  audio.play().catch(() => {});
  const playBtnEl = document.getElementById('playBtn');
  if (playBtnEl) {
    playBtnEl.textContent = '⏸';
    playBtnEl.classList.add('playing');
  }
}

function pauseSong() {
  if (!audio) return;
  audio.pause();
  const playBtnEl = document.getElementById('playBtn');
  if (playBtnEl) {
    playBtnEl.textContent = '▶';
    playBtnEl.classList.remove('playing');
  }
}