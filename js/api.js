// ================================================
// API HELPERS
// ================================================

function getToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEY);
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  
  return response.json();
}