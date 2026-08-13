// ================================================
// CONFIGURATION
// ================================================
const CONFIG = {
  API_BASE: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://127.0.0.1:3000/api'
    : 'https://abanabame-backend.onrender.com/api',
  APP_URL: 'https://abanabame.globalcreest.com',
  STORAGE_KEY: 'gospel_token',
  EMAIL_KEY: 'gospel_email',
  GOOGLE_CLIENT_ID: '205085299512-2ir3nv05qefrq58899bsouqgb97r2gch.apps.googleusercontent.com'
};