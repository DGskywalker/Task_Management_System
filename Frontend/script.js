window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('login-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.status === 200) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          name: data.userName,
          email: data.email,
          id: data.userId
        }));
        window.location.href = 'dashboard.html'; // ✅ Redirect
      } else {
        alert(data.message || 'Invalid email or password');
      }

    } catch (err) {
      console.error('Server error:', err);
      alert('Server error. Please try again later.');
    }
  });
});
