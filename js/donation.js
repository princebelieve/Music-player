// ================================================
// DONATION & UNLOCK
// ================================================

async function checkUnlock(songId) {
  if (!getToken()) {
    updateUnlockUI(songId, false);
    return;
  }
  
  try {
    const email = window.state.user?.email || localStorage.getItem(CONFIG.EMAIL_KEY);
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
  window.state.unlocked = unlocked;
  
  const badge = document.getElementById(`badge-${songId}`);
  if (badge) {
    badge.textContent = unlocked ? '🔓 Unlocked' : '🔒 Locked';
    badge.className = `card-badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}`;
  }
  
  const status = document.getElementById('songStatus');
  status.textContent = unlocked ? '🔓 Unlocked' : '🔒 Locked';
  status.className = `song-status ${unlocked ? 'status-unlocked' : 'status-locked'}`;
  
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
    const song = window.state.songs.find(s => s._id === songId);
    document.getElementById('donationMessage').innerHTML = 
      `❤️ Support <span id="donationSongName">${song?.title || 'this song'}</span>`;
  }
}

function setupDonation() {
  const amountBtns = document.querySelectorAll('#donationAmounts button');
  const customInput = document.getElementById('customAmount');
  
  amountBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      amountBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (this.dataset.amount === 'custom') {
        customInput.disabled = false;
        customInput.value = '';
        customInput.placeholder = 'Enter amount';
        customInput.focus();
        window.state.selectedAmount = 0;
      } else {
        customInput.disabled = true;
        customInput.value = this.dataset.amount;
        window.state.selectedAmount = parseInt(this.dataset.amount);
      }
    });
  });
  
  customInput.addEventListener('input', function() {
    const val = parseInt(this.value);
    window.state.selectedAmount = val > 0 ? val : 0;
    amountBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('#donationAmounts button[data-amount="custom"]')?.classList.add('active');
  });
  
  const savedEmail = localStorage.getItem(CONFIG.EMAIL_KEY);
  if (savedEmail) {
    document.getElementById('donorEmail').value = savedEmail;
  }
  
  document.getElementById('donateBtn').addEventListener('click', handleDonate);
}

async function handleDonate() {
  if (window.state.unlocked) {
    document.getElementById('donateStatus').textContent = '✅ Already unlocked!';
    return;
  }
  
  const email = document.getElementById('donorEmail').value.trim();
  const amount = window.state.selectedAmount;
  const songId = window.state.currentSongId;
  
  if (!email || !email.includes('@')) {
    document.getElementById('donateStatus').textContent = '⚠️ Please enter a valid email';
    return;
  }
  
  if (!amount || amount < 100) {
    document.getElementById('donateStatus').textContent = '⚠️ Minimum donation is ₦100';
    return;
  }
  
  localStorage.setItem(CONFIG.EMAIL_KEY, email);
  
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
      window.state.unlocked = true;
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

async function verifyPayment() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('reference') || params.get('trxref');
  const songId = params.get('songId') || window.state.currentSongId;
  
  if (ref) {
    try {
      const data = await apiFetch('/donation/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: ref })
      });
      
      if (data.verified) {
        window.state.unlocked = true;
        localStorage.setItem(CONFIG.EMAIL_KEY, data.email);
        if (songId) {
          updateUnlockUI(songId, true);
        }
        document.getElementById('donateStatus').textContent = '🎉 Thank you! Song unlocked!';
        document.getElementById('donateStatus').style.color = '#4ade80';
        
        // Play full song
        playSong();
        
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Verify error:', e);
    }
  }
}

// Setup share buttons
function setupShareButtons() {
  document.getElementById('shareWhatsAppBtn').addEventListener('click', () => {
    const song = window.state.songs.find(s => s._id === window.state.currentSongId);
    const msg = encodeURIComponent(
      `🎵 Listen to "${song?.title || 'this song'}" by ${song?.artist || 'artist'}!\n` +
      `🔗 ${CONFIG.APP_URL}\n` +
      `❤️ Support the ministry!`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  });
  
  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(CONFIG.APP_URL).then(() => {
        showCopySuccess();
      });
    } else {
      const input = document.createElement('input');
      input.value = CONFIG.APP_URL;
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