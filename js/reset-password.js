function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setResetStatus(message, color = '#f5c88a') {
  const status = document.getElementById('resetStatus');
  if (status) {
    status.textContent = message;
    status.style.color = color;
  }
}

async function submitResetPassword() {
  const token = getQueryParam('token');
  const password = document.getElementById('resetPassword')?.value;
  const confirmPassword = document.getElementById('resetConfirmPassword')?.value;

  if (!token) {
    setResetStatus('❌ Reset token is missing from the URL.', '#f87171');
    return;
  }

  if (!password || !confirmPassword) {
    setResetStatus('❌ Please enter and confirm your new password.', '#f87171');
    return;
  }

  if (password !== confirmPassword) {
    setResetStatus('❌ Passwords do not match.', '#f87171');
    return;
  }

  setResetStatus('⏳ Updating password...', '#c3bfd0');

  try {
    const data = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });

    if (data.success) {
      setResetStatus('✅ Your password has been reset. Please sign in.', '#4ade80');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2500);
    } else {
      setResetStatus('❌ ' + (data.error || 'Unable to reset password'), '#f87171');
    }
  } catch (e) {
    setResetStatus('❌ Network error. Please try again.', '#f87171');
  }
}

window.submitResetPassword = submitResetPassword;