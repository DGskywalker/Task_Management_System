const BASE_URL = 'https://task-management-system-d7gl.onrender.com'; // ✅ Use your live backend URL

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
        localStorage.setItem('user', JSON.stringify({
          name: data.userName,
          email: data.email,
          id: data.userId
        }));
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Invalid email or password');
      }

    } catch (err) {
      console.error('Login error:', err);
      alert('Server error. Please try again later.');
    }
  });
});
