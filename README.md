<div align="center">

# Task Management System

**A full-stack task manager with user accounts, priorities, deadlines and progress tracking.**

Node.js &nbsp;·&nbsp; Express 5 &nbsp;·&nbsp; PostgreSQL &nbsp;·&nbsp; bcrypt &nbsp;·&nbsp; HTML, CSS and JavaScript &nbsp;·&nbsp; Render

![Node](https://img.shields.io/badge/node-18%2B-3b5bdb?style=flat-square)
![Express](https://img.shields.io/badge/express-5.x-3b5bdb?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/postgresql-14%2B-3b5bdb?style=flat-square)
![Deployed on Render](https://img.shields.io/badge/deployed%20on-Render-16a34a?style=flat-square)

**[Live demo](https://task-management-system-d7gl.onrender.com)**

</div>

---

## Overview

Task Management System lets each user sign up, log in and manage their own list of tasks. Every task has a title, description, category, deadline, priority and status, and the dashboard lets users filter and sort their work to see what needs attention next.

The backend is a REST API built with Express and PostgreSQL. Passwords are hashed with bcrypt. The frontend is plain HTML, CSS and JavaScript served by the same Express server, so there is no build step.

<br>

## Features

<table>
<tr>
<td width="50%" valign="top">

### Accounts
- Sign up with name, email and password
- Secure login with bcrypt-hashed passwords
- Duplicate-email protection
- Token-based password reset with a one-hour expiry

</td>
<td width="50%" valign="top">

### Tasks
- Create tasks with title, description, category, deadline, priority and notes
- Track status: `Not Started` → `In Progress` → `Completed`
- Filter by status
- Sort by latest, priority or deadline
- Update status or delete tasks in one click

</td>
</tr>
</table>

<br>

## Quick start

Requires **Node.js 18+** and a **PostgreSQL** database.

```bash
# 1. Clone the repository
git clone https://github.com/DGskywalker/Task_Management_System.git
cd Task_Management_System

# 2. Install backend dependencies
cd Backend
npm install

# 3. Configure environment variables
cp ../.env.example .env        # then edit .env with your database details

# 4. Create the database tables
psql -h <host> -U <user> -d <database> -f ../schema.sql

# 5. Start the server
npm start
```

Open `http://localhost:5000` to use the app.

> The frontend scripts call the deployed backend through `BASE_URL` at the top of `script.js`, `login.js`, `signup.js` and `dashboard.js`. To run fully locally, change it to `http://localhost:5000`.

<br>

## Configuration

Environment variables live in `Backend/.env`. See [`.env.example`](.env.example) for a template.

| Variable | Description |
| :--- | :--- |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (the connection currently uses `5432`) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `PORT` | Port for the Express server (default `5000`) |

The database connection uses SSL, as required by Render's managed PostgreSQL.

<br>

## Database schema

Defined in [`schema.sql`](schema.sql).

| Table | Columns |
| :--- | :--- |
| **users** | `id`, `name`, `email` (unique), `password` (bcrypt hash), `reset_token`, `reset_token_expires`, `created_at` |
| **tasks** | `id`, `user_id` → `users.id`, `title`, `description`, `deadline`, `priority`, `status`, `notes`, `category`, `created_at` |

Deleting a user removes their tasks.

<br>

## API reference

<details open>
<summary><b>Authentication</b> &nbsp; <code>/api/auth</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/signup` | `name`, `email`, `password` | Create an account |
| `POST` | `/login` | `email`, `password` | Log in and receive the user's id, name and email |

</details>

<details open>
<summary><b>Tasks</b> &nbsp; <code>/api/tasks</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/new` | `userId`, `title`, `description`, `deadline`, `priority`, `status`, `notes`, `category` | Create a task |
| `GET` | `/user/:userId` | | List a user's tasks, newest first |
| `PUT` | `/:taskId/status` | `status` | Update a task's status |
| `DELETE` | `/:taskId` | | Delete a task |

</details>

<details open>
<summary><b>Password reset</b> &nbsp; <code>/api/password</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/forgot-password` | `email` | Generate a reset token valid for one hour |
| `POST` | `/reset-password/:token` | `password` | Set a new password using a valid token |

</details>

<br>

## Project structure

```
.
├── Backend/
│   ├── server.js              Express app, static files and route mounting
│   ├── db.js                  PostgreSQL connection pool
│   ├── models/
│   │   └── userModel.js       User queries
│   └── routes/
│       ├── auth.js            Signup and login
│       ├── tasks.js           Task CRUD and status updates
│       └── passwordReset.js   Forgot and reset password
├── Frontend/
│   ├── index.html             Login page
│   ├── signup.html            Signup page
│   ├── dashboard.html         Task dashboard
│   ├── forget.html            Forgot password form
│   ├── reset.html             Reset password form
│   ├── *.js                   Page scripts
│   └── *.css                  Styles
├── schema.sql                 Database schema
└── .env.example               Environment variable template
```

<br>

## Roadmap

- Send password reset links by email with Nodemailer
- Token-based sessions (JWT) to protect task endpoints
- Edit task details after creation
- Read the API base URL from a single config file

<br>

---

<div align="center">
<sub>Built with Node.js, Express and PostgreSQL.</sub>
</div>
