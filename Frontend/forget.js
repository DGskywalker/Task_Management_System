document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;

  try {
    const res = await fetch(`${BASE_URL}/api/password/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    alert(data.errors ? data.errors.join('\n') : data.message);
  } catch (err) {
    console.error(err);
    alert('Server error. Please try again later.');
  }
});
