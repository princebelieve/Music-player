// ================================================
// GENERIC UI HELPERS
// ================================================

function setStatusText(id, text, color = '#8a7d6a') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

function showToast(message, tone = 'info') {
  const tint = {
    info: '#8a7d6a',
    success: '#4ade80',
    error: '#f87171'
  };

  setStatusText('donateStatus', message, tint[tone] || tint.info);
}

window.setStatusText = setStatusText;
window.showToast = showToast;
