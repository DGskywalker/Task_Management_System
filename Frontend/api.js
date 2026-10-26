// Shared API helpers for every page.
//
// BASE_URL defaults to the same origin that serves the frontend. To point the
// frontend at another backend during development, run this in the browser console:
//   localStorage.setItem('apiBaseUrl', 'http://localhost:5000')
// and remove it again with localStorage.removeItem('apiBaseUrl').
const BASE_URL = (() => {
  try {
    return localStorage.getItem('apiBaseUrl') || window.location.origin;
  } catch (e) {
    return window.location.origin;
  }
})();

function getToken() {
  return localStorage.getItem('token');
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// fetch() wrapper that sends the JWT and sends the user back to login on 401.
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401 && token) {
    clearSession();
    window.location.href = 'index.html';
    throw new Error('Session expired');
  }
  return res;
}

// Escapes text before it is inserted into HTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
