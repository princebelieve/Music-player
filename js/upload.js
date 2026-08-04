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
    const data = await apiFetch('/admin/creator-requests', {
      method: 'POST',
      body: JSON.stringify({ stageName, bio })
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
    lyrics = parseLyricsInput(lyricsText, true);
    if (!Array.isArray(lyrics) || lyrics.length === 0) {
      statusEl.textContent = '⚠️ Lyrics must include timestamps on every line if provided.';
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

  const uploadBtn = document.getElementById('uploadSubmitBtn');
  if (uploadBtn) uploadBtn.disabled = true;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('previewDuration', preview);
  if (lyrics.length > 0) {
    formData.append('lyrics', JSON.stringify(lyrics));
  }
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

    let data = null;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Upload response parse error:', jsonError);
      data = null;
    }

    if (response.ok && data && data.success) {
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
        updateLyricsPreview();
        statusEl.textContent = '';
        statusEl.style.color = '#8a7d6a';
        if (uploadBtn) uploadBtn.disabled = false;
      }, 2500);
    } else {
      const message = data?.error || response.statusText || `Upload failed (${response.status})`;
      statusEl.textContent = '❌ ' + message;
      statusEl.style.color = '#f87171';
      if (uploadBtn) uploadBtn.disabled = false;
    }
  } catch (e) {
    statusEl.textContent = '❌ Network error. Try again.';
    statusEl.style.color = '#f87171';
    if (uploadBtn) uploadBtn.disabled = false;
    console.error('Upload error:', e);
  }
}

function parseLyricsInput(text, requireTimestamps = false) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      if (!requireTimestamps || parsed.every(item => item && typeof item.time === 'number' && typeof item.text === 'string')) {
        return parsed;
      }
      return null;
    }
  } catch (e) {
    // fallback to plain text format
  }

  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const parsed = [];
  let currentTime = 0;
  const timestampRegex = /(?:\[(\d{1,2}):(\d{2})(?:[\.:](\d{1,2}))?\])|(\d{1,2}):(\d{2})(?:[\.:](\d{1,2}))?/;

  for (const line of lines) {
    let time = null;
    let textLine = line;
    const match = line.match(timestampRegex);

    if (match) {
      const minutes = parseInt(match[1] ?? match[4], 10);
      const seconds = parseInt(match[2] ?? match[5], 10);
      const fraction = parseInt((match[3] ?? match[6] ?? '0').padEnd(2, '0'), 10);
      time = minutes * 60 + seconds + fraction / 100;
      textLine = line.replace(match[0], '').trim();
    }

    if (!textLine) continue;
    if (time === null) {
      if (requireTimestamps) return null;
      time = currentTime;
      currentTime += 5;
    } else {
      currentTime = time + 1;
    }

    parsed.push({ time, text: textLine });
  }

  return parsed;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateLyricsPreview() {
  const previewEl = document.getElementById('lyricsPreview');
  const lyricsText = document.getElementById('uploadLyrics')?.value || '';
  if (!previewEl) return;

  const trimmed = lyricsText.trim();
  if (!trimmed) {
    previewEl.textContent = 'Lyrics preview will appear here after you type timestamped lines.';
    previewEl.style.color = '#6a5d4a';
    return;
  }

  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    previewEl.textContent = 'Lyrics preview will appear here after you type timestamped lines.';
    previewEl.style.color = '#6a5d4a';
    return;
  }

  const parsed = parseLyricsInput(trimmed, false);
  if (!Array.isArray(parsed)) {
    previewEl.innerHTML = '<span style="color:#f87171;">Invalid lyrics: every line must include a timestamp like [00:15].</span>';
    return;
  }

  const html = parsed.map(item => `<div><strong>${formatTime(item.time)}</strong> ${escapeHtml(item.text)}</div>`).join('');
  previewEl.innerHTML = html;
  previewEl.style.color = '#4b5563';
}

const uploadLyricsInput = document.getElementById('uploadLyrics');
if (uploadLyricsInput) {
  uploadLyricsInput.addEventListener('input', updateLyricsPreview);
}

const uploadLyricsFileInput = document.getElementById('uploadLyricsFile');
if (uploadLyricsFileInput) {
  uploadLyricsFileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      document.getElementById('uploadLyrics').value = text;
      updateLyricsPreview();
    } catch (e) {
      console.error('Lyrics file read error:', e);
      const statusEl = document.getElementById('uploadStatus');
      if (statusEl) {
        statusEl.textContent = '❌ Unable to read lyrics file. Please try a plain text file.';
        statusEl.style.color = '#f87171';
      }
    }
  });
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
