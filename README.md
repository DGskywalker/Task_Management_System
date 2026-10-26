<div align="center">

# Task Management System

**A full-stack task manager with JWT authentication, per-user data isolation, priorities, deadlines and progress tracking.**

Node.js &nbsp;·&nbsp; Express 5 &nbsp;·&nbsp; PostgreSQL &nbsp;·&nbsp; JWT &nbsp;·&nbsp; Jest &nbsp;·&nbsp; Docker &nbsp;·&nbsp; GitHub Actions

![Node](https://img.shields.io/badge/node-20-3b5bdb?style=flat-square)
![Express](https://img.shields.io/badge/express-5.x-3b5bdb?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-3b5bdb?style=flat-square)
![Tests](https://img.shields.io/badge/tests-72%20passing-16a34a?style=flat-square)
![Coverage](https://img.shields.io/badge/line%20coverage-99%25-16a34a?style=flat-square)

</div>

---

## Overview

Users sign up, log in and manage their own list of tasks. Each task has a title, description, category, deadline, priority, status and notes. The dashboard shows progress counts, filters by status, sorts by date, priority or deadline, and opens a detail view for each task.

The backend is an Express REST API backed by PostgreSQL. Logins return a signed JWT, and every task query is scoped to the user in that token, so one user can never see or change another user's tasks. The frontend is plain HTML, CSS and JavaScript served by the same Express app.

<br>

## Features

<table>
<tr>
<td width="50%" valign="top">

### Accounts and security
- Sign up and log in; passwords hashed with bcrypt
- JWT access tokens (1 day) on every task request
- Ownership enforced in SQL on every task query
- Password reset by email with single-use, hashed tokens that expire after 1 hour
- Input validation on every write endpoint
- Helmet security headers, rate limiting and a CORS allow-list

</td>
<td width="50%" valign="top">

### Tasks
- Create tasks with title, description, category, deadline, priority and notes
- Track status: `Not Started` → `In Progress` → `Completed`
- Edit task details through the API
- Filter by status; sort by latest, priority or deadline
- Progress counters, task detail view, avatar upload and dark mode
- Expired or invalid sessions return the user to the login page

</td>
</tr>
</table>

<br>

## Architecture

```
 Browser (HTML, CSS, JavaScript)
   │   Authorization: Bearer <JWT>
   ▼
 Express app ─────────────────────────────────────────────────────────
   helmet  ·  CORS allow-list  ·  JSON body limit  ·  rate limiting
   │
   ├── /api/auth       signup, login (issues JWT)        strict rate limit
   ├── /api/password   forgot, reset                     strict rate limit
   ├── /api/tasks      requireAuth ─► validation ─► SQL scoped by user_id
   ├── /health         liveness check
   └── /               static frontend files
   │                                   │
   ▼                                   ▼
 PostgreSQL (pg Pool, SSL)          SMTP server (Nodemailer)
 users, tasks                       password reset emails
```

<br>

## Quick start

### With Docker

Requires Docker. Starts the app and PostgreSQL, and loads `schema.sql` on the first start.

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

Open `http://localhost:5000`. On macOS, port 5000 may already be used by AirPlay Receiver; change the left side of `"5000:5000"` in `docker-compose.yml` if so.

### Without Docker

Requires Node.js 20 and a PostgreSQL database.

```bash
cd Backend
npm install
cp ../.env.example .env                       # fill in your values
psql -h <host> -U <user> -d <database> -f ../schema.sql
npm start
```

Without SMTP settings, password reset links are printed to the server console during development and never in production.

### Pointing the frontend at another backend

The frontend calls the API on the same origin that serves it. To use a different backend during development, run this in the browser console:

```js
localStorage.setItem('apiBaseUrl', 'http://localhost:5000')
```

<br>

## Configuration

Set these in `Backend/.env`. See [`.env.example`](.env.example).

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `JWT_SECRET` | yes | | Secret used to sign tokens. The server refuses to start without it. |
| `DB_HOST` | yes | | PostgreSQL host |
| `DB_PORT` | | `5432` | PostgreSQL port |
| `DB_USER` | yes | | Database user |
| `DB_PASSWORD` | yes | | Database password |
| `DB_NAME` | yes | | Database name |
| `DB_SSL` | | `true` | Set to `false` for a local or Docker database. SSL is on by default for Render. |
| `PORT` | | `5000` | HTTP port |
| `NODE_ENV` | | | Set to `production` in deployment |
| `APP_URL` | in production | `http://localhost:<PORT>` | Public URL used in password reset links |
| `CORS_ORIGINS` | | | Comma-separated origins allowed to call the API. Empty means same-origin only. |
| `SMTP_HOST` | for email | | SMTP server |
| `SMTP_PORT` | | `587` | SMTP port (`465` uses TLS) |
| `SMTP_USER` | for email | | SMTP username |
| `SMTP_PASS` | for email | | SMTP password |
| `SMTP_FROM` | | `SMTP_USER` | Sender address |
| `AUTH_RATE_LIMIT` | | `20` | Requests per 15 minutes per IP to `/api/auth` and `/api/password` |
| `API_RATE_LIMIT` | | `300` | Requests per 15 minutes per IP to the whole API |

<br>

## API reference

All task routes require `Authorization: Bearer <token>`. The user always comes from the token; any `userId` in a request is ignored. Requesting another user's task returns `404`.

<details open>
<summary><b>Authentication</b> &nbsp; <code>/api/auth</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/signup` | `name`, `email`, `password` | Create an account. Password 8 to 72 characters. |
| `POST` | `/login` | `email`, `password` | Returns `token`, `expiresIn`, `userId`, `userName`, `email` |

</details>

<details open>
<summary><b>Tasks</b> &nbsp; <code>/api/tasks</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | | List your tasks, newest first |
| `POST` | `/` | `title`, `priority`, and optional `description`, `deadline`, `status`, `notes`, `category` | Create a task |
| `GET` | `/:taskId` | | Get one of your tasks |
| `PUT` | `/:taskId` | any of `title`, `description`, `deadline`, `priority`, `category`, `notes` | Edit task details |
| `PUT` | `/:taskId/status` | `status` | Change status |
| `DELETE` | `/:taskId` | | Delete a task |

Allowed values: `priority` is `High`, `Medium` or `Low`; `status` is `Not Started`, `In Progress` or `Completed`; `deadline` is `YYYY-MM-DD`.

</details>

<details open>
<summary><b>Password reset</b> &nbsp; <code>/api/password</code></summary>

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/forgot-password` | `email` | Emails a reset link. Always returns the same message. |
| `POST` | `/reset-password/:token` | `password` | Sets a new password with a valid token |

</details>

<details open>
<summary><b>Other</b></summary>

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns `{"status":"ok"}` |

</details>

Validation errors return `400` with `{ "message": "Validation failed", "errors": [...] }`.

<br>

## Database schema

Defined in [`schema.sql`](schema.sql).

| Table | Columns |
| :--- | :--- |
| **users** | `id`, `name`, `email` (unique), `password` (bcrypt hash), `reset_token` (SHA-256 hash), `reset_token_expires`, `created_at` |
| **tasks** | `id`, `user_id` → `users.id` (cascade delete), `title`, `description`, `deadline`, `priority`, `status`, `notes`, `category`, `created_at` |

CHECK constraints limit `priority` and `status` to the allowed values and reject blank titles. An index on `(user_id, created_at DESC)` serves the task list query.

<br>

## Security notes

- **Authentication:** JWTs are signed with `JWT_SECRET` and expire after one day. The frontend stores the token in `localStorage` and escapes all task text before inserting it into the page.
- **Authorization:** every task `SELECT`, `UPDATE` and `DELETE` includes `AND user_id = $n`, taken from the token.
- **Passwords:** hashed with bcrypt (cost 10). Login gives the same error for an unknown email and a wrong password.
- **Password reset:** the forgot-password response never reveals whether an email is registered and never contains the link. Only a SHA-256 hash of the token is stored, and it is cleared after use.
- **Transport and headers:** Helmet sets security headers including a Content Security Policy. CORS is closed to other origins unless listed in `CORS_ORIGINS`.
- **Abuse limits:** 20 requests per 15 minutes per IP to auth and password routes, 300 to the API overall, and a 100 KB body limit.

<br>

## Testing

```bash
cd Backend
npm test                  # 72 tests
npm run test:coverage     # with coverage report
```

Tests use Jest and Supertest. `db.js` is replaced with [pg-mem](https://github.com/oguimbal/pg-mem), an in-memory PostgreSQL loaded with the real `schema.sql`, so no database server is needed. They cover signup, login, token checks, task CRUD, ownership between two users, validation, the password reset flow, rate limiting, CORS, security headers and database errors.

CI runs the tests with coverage and builds the Docker image on every push and pull request.

<br>

## Project structure

```
.
├── Backend/
│   ├── server.js                Starts the HTTP server
│   ├── app.js                   Express app: security middleware, routes, static files
│   ├── db.js                    PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js              JWT signing and requireAuth
│   │   └── validate.js          Request validation
│   ├── models/
│   │   └── userModel.js         User queries
│   ├── routes/
│   │   ├── auth.js              Signup and login
│   │   ├── tasks.js             Task CRUD scoped to the signed-in user
│   │   └── passwordReset.js     Forgot and reset password
│   ├── utils/
│   │   └── mailer.js            Password reset email
│   └── tests/                   Jest and Supertest suites
├── Frontend/
│   ├── api.js                   Base URL, authenticated fetch, HTML escaping
│   ├── index.html, script.js    Login
│   ├── signup.html, signup.js   Signup
│   ├── dashboard.html, .js      Task dashboard
│   ├── forget.html, forget.js   Forgot password
│   ├── reset.html, reset.js     Reset password
│   └── *.css                    Styles
├── schema.sql                   Database schema
├── Dockerfile                   Production image (non-root, health check)
├── docker-compose.yml           App and PostgreSQL for local use
├── .env.example                 Environment variable template
└── .github/workflows/ci.yml     Tests and Docker build
```

<br>

## Roadmap

- Edit form in the dashboard (editing is available in the API only)
- Show deadlines as dates in the dashboard instead of full timestamps
- Add the missing `default-avatar.png` image
- Move the token from `localStorage` to an `httpOnly` cookie

<br>

---

<div align="center">
<sub>Built with Node.js, Express and PostgreSQL.</sub>
</div>
