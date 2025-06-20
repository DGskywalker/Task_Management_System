window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('login-form');
    console.log("Form loaded:", form); // should not be null
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log("Form submitted");
  
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
      try {
        // ✅ Store the fetch response
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
  
        const data = await res.json();
        console.log("Response status:", res.status);
        console.log("Response data:", data);
  
        if (res.status === 200) {
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
  