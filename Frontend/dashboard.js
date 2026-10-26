document.addEventListener('DOMContentLoaded', () => {
    // BASE_URL, apiFetch and escapeHtml come from api.js
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !getToken()) return (window.location.href = 'index.html');

    document.getElementById('logout-link')?.addEventListener('click', clearSession);

    // 👤 Load user info
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('welcome-name').textContent = user.name;
  
    // 🎨 Avatar logic
    const avatarInput = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');
    const removeButton = document.getElementById('remove-avatar');
    const DEFAULT_AVATAR = 'default-avatar.png';
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) avatarPreview.src = savedAvatar;
  
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          avatarPreview.src = reader.result;
          localStorage.setItem('userAvatar', reader.result);
        };
        reader.readAsDataURL(file);
      }
    });
  
    removeButton.addEventListener('click', () => {
      localStorage.removeItem('userAvatar');
      avatarPreview.src = DEFAULT_AVATAR;
      avatarInput.value = '';
    });
  
    // 🌙 Dark mode
    const toggleBtn = document.getElementById('toggle-dark-mode');
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const mode = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', mode);
      });
    }
  
    // 📂 Section switching
    const links = document.querySelectorAll('.nav-links a[data-section]');
    const sections = document.querySelectorAll('.section');
    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.getAttribute('data-section');
        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        if (target === 'projects') loadTasks();
      });
    });
  
    const createTaskBtn = document.getElementById('create-task-btn');
    const taskForm = document.getElementById('task-form');
    if (createTaskBtn && taskForm) {
      createTaskBtn.addEventListener('click', () => {
        taskForm.style.display = 'flex';
        createTaskBtn.style.display = 'none';
      });
    }
  
    if (taskForm && user) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
          title: taskForm.title.value,
          description: taskForm.description.value,
          deadline: taskForm.deadline.value,
          category: taskForm.category.value,
          priority: taskForm.priority.value,
          status: taskForm.status.value,
          notes: taskForm.notes.value
        };
  
        try {
          const res = await apiFetch('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
          });
  
          const result = await res.json();
          if (res.status === 201) {
            alert('✅ Task created successfully!');
            taskForm.reset();
            taskForm.style.display = 'none';
            createTaskBtn.style.display = 'inline-block';
            loadTasks();
          } else {
            alert(result.errors ? result.errors.join('\n') : (result.message || '❌ Failed to create task.'));
          }
        } catch (error) {
          console.error('❌ Error submitting task:', error);
          alert('Server error while saving task.');
        }
      });
    }
  
    async function updateTaskStatus(taskId, newStatus) {
      try {
        await apiFetch(`/api/tasks/${taskId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        });
      } catch (err) {
        console.error('❌ Error updating status:', err);
      }
    }
  
    async function deleteTask(taskId) {
      try {
        await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        loadTasks();
      } catch (err) {
        console.error('❌ Error deleting task:', err);
      }
    }
  
    async function loadTasks() {
      const spinner = document.getElementById('loading-spinner');
      spinner && (spinner.style.display = 'block');
  
      try {
        const res = await apiFetch('/api/tasks');
        if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`);
        const { tasks } = await res.json();
  
        // 📊 Stats reset
        let completed = 0, inProgress = 0, notStarted = 0;
  
        const taskList = document.getElementById('task-list');
        const taskListContainer = document.getElementById('task-list-container');
        const detailSection = document.getElementById('task-detail-section');
        const detailContent = document.getElementById('task-detail-content');
        const backButton = document.getElementById('back-to-list');
        taskList.innerHTML = '';
        detailSection.style.display = 'none';
        taskListContainer.style.display = 'block';
  
        const filter = document.getElementById('filter-status')?.value || "All";
        const sort = document.getElementById('sort-tasks')?.value || "latest";
  
        let filteredTasks = [...tasks];
        if (filter !== "All") {
          filteredTasks = filteredTasks.filter(t => t.status === filter);
        }
  
        if (sort === 'priority') {
          const order = { High: 1, Medium: 2, Low: 3 };
          filteredTasks.sort((a, b) => order[a.priority] - order[b.priority]);
        } else if (sort === 'deadline') {
          filteredTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        } // "latest" keeps the server order, which is newest first
  
        filteredTasks.forEach(task => {
          if (task.status === 'Completed') completed++;
          else if (task.status === 'In Progress') inProgress++;
          else notStarted++;
  
          const taskCard = document.createElement('div');
          taskCard.className = 'task-card';
          const badgeClass = task.status === 'Completed' ? 'completed' :
                             task.status === 'In Progress' ? 'in-progress' : 'not-started';
  
          const sliderValue = {
            'Completed': 100,
            'In Progress': 50,
            'Not Started': 0
          }[task.status] || 0;
  
          taskCard.innerHTML = `
            <div>
              <div class="task-title">${escapeHtml(task.title)}</div>
              <div class="task-deadline">📅 ${escapeHtml(task.deadline || 'No Deadline')}</div>
              <div class="task-status-text">
                <strong>Status:</strong> ${escapeHtml(task.status)}
                <span class="status-badge ${badgeClass}">${escapeHtml(task.status)}</span>
              </div>
            </div>
            <input type="range" min="0" max="100" value="${sliderValue}" class="status-slider" />
            <button class="delete-btn" style="display: ${task.status === 'Completed' ? 'block' : 'none'}">🗑️</button>
          `;
  
          const slider = taskCard.querySelector('.status-slider');
          const deleteBtn = taskCard.querySelector('.delete-btn');
          const statusText = taskCard.querySelector('.task-status-text');
  
          slider.addEventListener('click', e => e.stopPropagation());
          slider.addEventListener('input', async () => {
            const val = parseInt(slider.value);
            let newStatus = 'Not Started';
            if (val === 100) newStatus = 'Completed';
            else if (val >= 50) newStatus = 'In Progress';
  
            statusText.innerHTML = `<strong>Status:</strong> ${newStatus}
              <span class="status-badge ${newStatus === 'Completed' ? 'completed' : newStatus === 'In Progress' ? 'in-progress' : 'not-started'}">${newStatus}</span>`;
            await updateTaskStatus(task.id, newStatus);
            deleteBtn.style.display = newStatus === 'Completed' ? 'block' : 'none';
          });
  
          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this task?')) {
              await deleteTask(task.id);
            }
          });
  
          taskCard.addEventListener('click', () => {
            taskListContainer.style.display = 'none';
            detailSection.style.display = 'block';
            detailContent.innerHTML = `
              <h2>${escapeHtml(task.title)}</h2>
              <p><strong>Description:</strong> ${escapeHtml(task.description || '—')}</p>
              <p><strong>Deadline:</strong> ${escapeHtml(task.deadline || '—')}</p>
              <p><strong>Category:</strong> ${escapeHtml(task.category || '—')}</p>
              <p><strong>Priority:</strong> ${escapeHtml(task.priority)}</p>
              <p><strong>Status:</strong> ${escapeHtml(task.status)}</p>
              <p><strong>Notes:</strong> ${escapeHtml(task.notes || '—')}</p>
            `;
          });
  
          taskList.appendChild(taskCard);
        });
  
        // 📊 Update stats
        document.getElementById('stat-completed').textContent = `✅ Completed Tasks: ${completed}`;
        document.getElementById('stat-inprogress').textContent = `⚙️ In Progress: ${inProgress}`;
        document.getElementById('stat-pending').textContent = `⏸️ Not Started: ${notStarted}`;
  
        if (backButton) {
          backButton.onclick = () => {
            detailSection.style.display = 'none';
            taskListContainer.style.display = 'block';
          };
        }
  
      } catch (err) {
        console.error('❌ Error fetching tasks:', err);
      } finally {
        spinner && (spinner.style.display = 'none');
      }
    }
  
    // 🎯 Filter/Sort Triggers
    const filterSelect = document.getElementById('filter-status');
    const sortSelect = document.getElementById('sort-tasks');
    filterSelect?.addEventListener('change', loadTasks);
    sortSelect?.addEventListener('change', loadTasks);
  });
  