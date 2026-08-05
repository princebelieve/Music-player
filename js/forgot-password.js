function setForgotStatus(message, color = '#f5c88a') {
  const status = document.getElementById('forgotStatus');
  if (status) {
    status.textContent = message;
    status.style.color = color;
  }
}

async function submitForgotPassword() {
  const email = document.getElementById('forgotEmail')?.value.trim();
  if (!email) {
    setForgotStatus('❌ Please enter your email address.', '#f87171');
    return;
  }

  setForgotStatus('⏳ Sending reset link...', '#c3bfd0');

  try {
    const data = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (data.success) {
      setForgotStatus('✅ If that account exists, a reset email was sent.', '#4ade80');
    } else {
      setForgotStatus('❌ ' + (data.error || 'Unable to send reset email'), '#f87171');
    }
  } catch (e) {
    setForgotStatus('❌ Network error. Please try again.', '#f87171');
  }
}

window.submitForgotPassword = submitForgotPassword;
