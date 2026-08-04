// ================================================
// CREATOR UPLOAD FLOW
// ================================================

function showUploadModal() {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function showCreatorRequestModal() {
  const modal = document.getElementById('creatorRequestModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeCreatorRequestModal() {
  const modal = document.getElementById('creatorRequestModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

async function submitCreatorRequest() {
  const name = document.getElementById('creatorName').value.trim();
  const email = document.getElementById('creatorEmail').value.trim();
  const stageName = document.getElementById('creatorStageName').value.trim();
  const bio = document.getElementById('creatorBio').value.trim();
  const statusEl = document.getElementById('creatorRequestStatus');

  if (!name || !email || !stageName) {
    statusEl.textContent = '⚠️ Name, email and stage name are required';
    return;
  }

  statusEl.textContent = '⏳ Sending creator request...';
  statusEl.style.color = '#8a7d6a';

  try {
    const data = await apiFetch('/admin/make-creator', {
      method: 'POST',
      body: JSON.stringify({ email, name, stageName, bio })
    });

    if (data.success) {
      statusEl.textContent = '✅ Creator request received. An admin will review it.';
      statusEl.style.color = '#4ade80';
      setTimeout(() => {
        closeCreatorRequestModal();
        statusEl.textContent = '';
      }, 2500);
    } else {
      statusEl.textContent = '❌ ' + (data.error || 'Request failed');
      statusEl.style.color = '#f87171';
    }
  } catch (e) {
    statusEl.textContent = '❌ Network error. Please try again.';
    statusEl.style.color = '#f87171';
  }
}

async function submitUpload() {
  const title = document.getElementById('uploadTitle').value.trim();
  const artist = document.getElementById('uploadArtist').value.trim();
  const preview = parseInt(document.getElementById('uploadPreview').value) || 30;
  const lyricsText = document.getElementById('uploadLyrics').value.trim();
  const audioFile = document.getElementById('uploadAudio').files[0];
  const coverFile = document.getElementById('uploadCover').files[0];
  const statusEl = document.getElementById('uploadStatus');

  if (!title || !artist) {
    statusEl.textContent = '⚠️ Title and Artist are required';
    return;
  }

  if (!audioFile || !coverFile) {
    statusEl.textContent = '⚠️ Audio and Cover files are required';
    return;
  }

  let lyrics = [];
  if (lyricsText) {
    lyrics = parseLyricsInput(lyricsText);
    if (!Array.isArray(lyrics)) {
      statusEl.textContent = '⚠️ Invalid lyrics format. Timestamps are required: [00:15] Verse line';
      return;
    }
  }

  const token = getToken();
  if (!token) {
    statusEl.textContent = '⚠️ Please sign in as a creator first';
    return;
  }

  statusEl.textContent = '⏳ Uploading...';
  statusEl.style.color = '#8a7d6a';

  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('previewDuration', preview);
  formData.append('lyrics', JSON.stringify(lyrics));
  formData.append('audio', audioFile);
  formData.append('cover', coverFile);

  try {
    const response = await fetch(`${CONFIG.API_BASE}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      statusEl.textContent = '✅ ' + data.message;
      statusEl.style.color = '#4ade80';

      setTimeout(() => {
        closeUploadModal();
        loadMySongs();
        document.getElementById('uploadTitle').value = '';
        document.getElementById('uploadArtist').value = '';
        document.getElementById('uploadPreview').value = '30';
        document.getElementById('uploadLyrics').value = '';
        document.getElementById('uploadAudio').value = '';
        document.getElementById('uploadCover').value = '';
        statusEl.textContent = '';
        statusEl.style.color = '#8a7d6a';
      }, 2500);
    } else {
      statusEl.textContent = '❌ ' + (data.error || 'Upload failed');
      statusEl.style.color = '#f87171';
    }
  } catch (e) {
    statusEl.textContent = '❌ Network error. Try again.';
    statusEl.style.color = '#f87171';
    console.error('Upload error:', e);
  }
}

async function loadMySongs() {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE}/upload/my-songs`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const container = document.getElementById('mySongsList');

    if (!container) {
      return;
    }

    if (data.songs && data.songs.length > 0) {
      container.innerHTML = data.songs.map(song => `
        <div class="my-song-item">
          <span><strong>${song.title}</strong> - ${song.artist}</span>
          <span class="status status-${song.isPublished ? 'approved' : 'pending'}">
            ${song.isPublished ? '✅ Published' : '⏳ Pending'}
          </span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p style="color:#6a5d4a;font-size:0.85rem;">No songs uploaded yet.</p>';
    }
  } catch (e) {
    console.error('Load my songs error:', e);
  }
}

window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.showCreatorRequestModal = showCreatorRequestModal;
window.closeCreatorRequestModal = closeCreatorRequestModal;
window.submitCreatorRequest = submitCreatorRequest;
window.submitUpload = submitUpload;
window.loadMySongs = loadMySongs;
