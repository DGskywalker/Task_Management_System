const BASE_URL = 'https://task-management-system-d7gl.onrender.com'; // ✅ CHANGE THIS TO YOUR ACTUAL BACKEND URL

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    console.log(data);

    if (res.status === 201) {
      alert('Signup successful!');
      window.location.href = 'index.html';
    } else {
      alert(data.message || 'Signup failed');
    }
  } catch (err) {
    console.error(err);
    alert('Server error');
  }
});
