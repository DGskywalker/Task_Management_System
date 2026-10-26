const token = new URLSearchParams(window.location.search).get('token');

document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!token) return alert('This reset link is missing its token. Request a new one.');

  const password = document.getElementById('new-password').value;

  try {
    const res = await fetch(`${BASE_URL}/api/password/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    alert(data.errors ? data.errors.join('\n') : data.message);
    if (res.ok) window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    alert('Server error. Please try again later.');
  }
});
