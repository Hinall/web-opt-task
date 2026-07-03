# Task Manager — MERN Stack Application

A secure, full-stack Task Manager built with MongoDB Atlas, Express.js, React, and Node.js. Users can register an account, log in with JWT authentication, and manage personal tasks through a clean, warm editorial UI — with full Create, Read, Update, and Delete (CRUD) support. Every task is strictly scoped to its owner; no user can access another's data.

frontend is deployed on vercel and backend on render

demo:https://web-opt-task.vercel.app/
---

## Project Structure

```
web-opt-task/
├── client/          # React + Vite frontend
└── server/          # Express.js + MongoDB backend
```

---

## Prerequisites

Before running the application, ensure the following are in place:

| Requirement | Details |
| :--- | :--- |
| **Node.js** | Version `18.x` or higher (v20+ / v22+ recommended) |
| **npm** | Comes bundled with Node.js |
| **MongoDB Atlas** | A free or paid cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). No local MongoDB installation is required — the connection string is provided via environment variable. |

> **Getting your Atlas connection string:**
> 1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
> 2. Go to your cluster → **Connect** → **Connect your application**
> 3. Copy the URI and replace `<password>` with your database user's password
> 4. Set it as `MONGODB_URI` in `server/.env`

---

## Environment Variables

Both the server and client require a `.env` file. Reference templates are provided in `server/.env.example` and `client/.env.example`.

### Server — `server/.env`

Create this file by copying `server/.env.example`:

```bash
cp server/.env.example server/.env
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | ✅ | Port the Express server listens on. Default: `5000` |
| `MONGODB_URI` | ✅ | Full MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/taskmanager`) |
| `JWT_SECRET` | ✅ | A long, random secret string used to sign and verify JSON Web Tokens. **Never expose this.** |
| `JWT_EXPIRES_IN` | ✅ | How long a JWT token stays valid (e.g. `7d`, `24h`, `30m`) |
| `NODE_ENV` | ✅ | Runtime environment — set to `development` locally |
| `CLIENT_URL` | ✅ | The origin URL of the React frontend, used to configure CORS. Vite defaults to `http://localhost:5173` |

### Client — `client/.env`

Create this file by copying `client/.env.example`:

```bash
cp client/.env.example client/.env
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | ✅ | Base URL of the running backend API (e.g. `http://localhost:5000`). All Axios requests are prefixed with this value. |

---

## AI Chat Assistant

This project includes an AI-powered chat assistant built into the frontend. It uses the Express backend to proxy chat requests to an AI provider via environment-configured API credentials.

- The chat assistant appears as an in-app task support widget.
- It is designed to answer questions about productivity, task management, and time management.
- Requests are streamed from the backend using Server-Sent Events (SSE) to show progressive assistant output.
- Provider configuration is controlled entirely through server environment variables, so switching providers only requires updating `server/.env`.

Required server env vars for chat:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `AI_API_KEY` | ✅ | API key for the configured AI provider |
| `AI_BASE_URL` | ✅ | Base URL for the provider’s OpenAI-compatible API endpoint |
| `AI_MODEL` | ✅ | Model name to use for chat completions |

---

## Running the Backend Locally

Open a terminal and follow these steps:

```bash
# 1. Navigate to the server directory
cd server

# 2. Install all dependencies
npm install

# 3. Create and fill in your environment file
cp .env.example .env
# → Edit .env and set MONGODB_URI to your Atlas connection string

# 4. Start the development server (with hot-reload via nodemon)
npm run dev
```

**Expected output:**
```
Server running on port 5000
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
```

The API will be available at `http://localhost:5000`.

---

## Running the Frontend Locally

Open a **new terminal window** and follow these steps:

```bash
# 1. Navigate to the client directory
cd client

# 2. Install all dependencies
npm install

# 3. Create and fill in your environment file
cp .env.example .env
# → Ensure VITE_API_URL=http://localhost:5000

# 4. Start the Vite development server
npm run dev
```

**Expected output:**
```
VITE v8.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser. You should see the Task Manager login screen.

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/health`  | Server health check |
| `POST` | `/api/auth/register`  | Register a new user |
| `POST` | `/api/auth/login`  | Login and receive a JWT |
| `GET` | `/api/auth/me`  | Get the authenticated user's profile |
| `GET` | `/api/tasks` | Fetch tasks for the logged-in user. Supports `?status=pending\|in-progress\|done`, `?sortBy=dueDate\|createdAt`, `?order=asc\|desc` |
| `POST` | `/api/tasks`  | Create a new task |
| `PUT` | `/api/tasks/:id`  | Update a task (owner only) |
| `DELETE` | `/api/tasks/:id`  | Delete a task (owner only) |

Protected routes require `Authorization: Bearer <token>` in the request header.

---

## Assumptions & Known Limitations

- **MongoDB Atlas only**: This project is configured for MongoDB Atlas. If you prefer a local instance, replace the `MONGODB_URI` with `mongodb://localhost:27017/taskmanager` — no other changes are needed.
- **Task ownership**: All task queries, updates, and deletes are scoped to the authenticated user via the `userId` foreign key. Cross-user access is blocked at the database query level.
- **API-driven filtering & sorting**: Status filtering (All / Pending / In Progress / Done) and due-date sorting are handled entirely by the backend. The frontend passes `?status=` and `?sortBy=dueDate&order=asc|desc` query params — no client-side array filtering is used. Stat counters (totals) are fetched once without a filter so they always reflect accurate counts even when a filter is active.
- **Password strength**: The frontend enforces a minimum 6-character password. Passwords are hashed server-side with `bcryptjs` (12 salt rounds) before storage — plain-text passwords are never saved.
- **CORS policy**: The server dynamically allows any `localhost` origin in development. In production, only the exact `CLIENT_URL` is permitted.

