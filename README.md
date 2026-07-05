# Task Manager — MERN Stack Application with AI Agent

A secure, full-stack Task Manager built with MongoDB Atlas, Express.js, React, and Node.js — extended with an AI assistant capable of managing tasks through natural language. Users can register an account, log in with JWT authentication, and manage personal tasks through a clean, warm editorial UI — either manually through the standard CRUD interface, or conversationally through an AI chat assistant with real tool-calling capabilities. Every task, whether created through the UI or the AI, is strictly scoped to its owner; no user can access another's data.

Frontend is deployed on Vercel and backend on Render.

Demo: https://web-opt-task.vercel.app/

---

## What Makes This Different: The AI Assistant

Most "AI chat" features in portfolio projects are a thin wrapper that just talks. This one **acts** — it can create, update, delete, and list real tasks in MongoDB by reasoning through natural language requests, while enforcing the same ownership and safety rules as the rest of the app.

### Core AI capabilities

- **Natural language task management** — "Add a task to finish the quarterly report by Friday" creates a real task; "mark the report task as done" finds and updates it.
- **Multi-step agentic reasoning** — the assistant can chain multiple tool calls automatically. For example, "mark my report task as done" internally triggers a `listTasks` call to find the matching task, then an `updateTask` call with the correct ID — no manual ID lookup required from the user.
- **Ambiguity resolution** — if a request matches more than one task, the assistant lists the candidates with distinguishing details and asks the user to clarify before taking any action.
- **Destructive-action confirmation** — before deleting a task, the assistant always describes the task and asks for explicit confirmation. No delete fires on the first ambiguous or implicit request.
- **Auth-scoped tool execution** — the AI never receives or sets `userId` directly. Every tool call is executed server-side using the authenticated user's ID from the verified JWT, identical to every other protected route in this app. The AI can only ever act on the logged-in user's own tasks.
- **Provider-agnostic backend** — the AI provider (currently Gemini or Groq, via their OpenAI-compatible endpoints) is fully configured through environment variables. Switching providers or models requires no code changes.
- **Streaming and tool-calling endpoints** — a lightweight streaming endpoint for plain conversational responses, and a separate multi-step tool-calling endpoint for task actions.

### How it works (architecture)

```
User message (React chat UI)
        │
        ▼
POST /api/ai/chat/tools   (Authorization: Bearer <JWT>)
        │
        ▼
Express controller
  ├─ Verifies JWT → extracts userId (never trusts client-provided userId)
  ├─ Sends message + tool schemas to the LLM
  ├─ LLM responds with either:
  │     • plain text → returned directly, or
  │     • a tool_call (e.g., addTask, updateTask, deleteTask, listTasks)
  ├─ Server executes the matching function in taskService.js against
  │   MongoDB, scoped to the authenticated userId
  ├─ Result is sent back to the LLM
  └─ Loop continues (max 5 iterations) until the LLM returns a final
     natural-language reply — enabling multi-step chains like
     "find task → then update it" in a single user request
        │
        ▼
{ reply: "..." } → rendered in chat UI
```

### AI-specific endpoints

| Method | Endpoint | Auth | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/ai/chat` | ✅ | Single-turn chat, no tool access — general Q&A |
| `POST` | `/api/ai/chat/stream` | ✅ | Same as above, streamed via Server-Sent Events |
| `POST` | `/api/ai/chat/tools` | ✅ | Multi-step tool-calling endpoint — the AI can add, update, delete, and list the authenticated user's tasks |

All AI endpoints require `Authorization: Bearer <token>`, identical to the task endpoints below. `userId` is derived from the token server-side and is never accepted from the request body.

### Available tools (functions the AI can call)

| Tool | Description | Safety behavior |
| :--- | :--- | :--- |
| `addTask` | Creates a new task (title, description, status, dueDate) | Scoped to authenticated user automatically |
| `listTasks` | Retrieves the user's tasks | Read-only, used internally for lookups (e.g., resolving a title to an ID) |
| `updateTask` | Updates an existing task by ID | If multiple tasks match a description, the assistant asks which one before acting |
| `deleteTask` | Deletes a task by ID | Always requires explicit user confirmation before execution |

---

## Project Structure

```
web-opt-task/
├── client/          # React + Vite frontend
└── server/          # Express.js + MongoDB backend
```

---

## Prerequisites

| Requirement | Details |
| :--- | :--- |
| **Node.js** | Version `18.x` or higher (v20+ / v22+ recommended) |
| **npm** | Comes bundled with Node.js |
| **MongoDB Atlas** | A free or paid cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). No local MongoDB installation is required. |
| **AI Provider Key** | A free API key from an OpenAI-compatible provider — e.g., [Google AI Studio](https://aistudio.google.com) (Gemini) or [Groq](https://console.groq.com) |

> **Getting your Atlas connection string:**
> 1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
> 2. Go to your cluster → **Connect** → **Connect your application**
> 3. Copy the URI and replace `<password>` with your database user's password
> 4. Set it as `MONGODB_URI` in `server/.env`

---

## Environment Variables

### Server — `server/.env`

```bash
cp server/.env.example server/.env
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | ✅ | Port the Express server listens on. Default: `5000` |
| `MONGODB_URI` | ✅ | Full MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | A long, random secret used to sign/verify JWTs. **Never expose this.** |
| `JWT_EXPIRES_IN` | ✅ | How long a JWT stays valid (e.g. `7d`, `24h`) |
| `NODE_ENV` | ✅ | `development` locally |
| `CLIENT_URL` | ✅ | Frontend origin, used for CORS |
| `AI_API_KEY` | ✅ | API key for the configured AI provider |
| `AI_BASE_URL` | ✅ | Base URL of the provider's OpenAI-compatible endpoint (e.g. `https://generativelanguage.googleapis.com/v1beta/openai/` for Gemini, or `https://api.groq.com/openai/v1` for Groq) |
| `AI_MODEL` | ✅ | Model name used for chat completions (e.g. `gemini-2.0-flash`, `llama-3.3-70b-versatile`) |

The server validates on startup that `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` are all set, and exits with a clear error if any are missing.

### Client — `client/.env`

```bash
cp client/.env.example client/.env
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | ✅ | Base URL of the running backend API |

---

## Running the Backend Locally

```bash
cd server
npm install
cp .env.example .env
# → Fill in MONGODB_URI, JWT_SECRET, and AI_API_KEY / AI_BASE_URL / AI_MODEL
npm run dev
```

**Expected output:**
```
Server running on port 5000
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
```

---

## Running the Frontend Locally

```bash
cd client
npm install
cp .env.example .env
# → Ensure VITE_API_URL=http://localhost:5000
npm run dev
```

Open `http://localhost:5173`. You'll see the login screen; the AI chat widget is available once logged in.

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/health` |  | Server health check |
| `POST` | `/api/auth/register` |  | Register a new user |
| `POST` | `/api/auth/login` |  | Login and receive a JWT |
| `GET` | `/api/auth/me` | ✅ | Get the authenticated user's profile |
| `GET` | `/api/tasks` | ✅ | Fetch tasks for the logged-in user. Supports `?status=`, `?sortBy=`, `?order=` |
| `POST` | `/api/tasks` | ✅ | Create a new task |
| `PUT` | `/api/tasks/:id` | ✅ | Update a task (owner only) |
| `DELETE` | `/api/tasks/:id` | ✅ | Delete a task (owner only) |
| `POST` | `/api/ai/chat` | ✅ | AI chat — plain conversation |
| `POST` | `/api/ai/chat/stream` | ✅ | AI chat — streamed conversation |
| `POST` | `/api/ai/chat/tools` | ✅ | AI chat — task management via tool calling |

Protected routes require `Authorization: Bearer <token>`.

---

## Assumptions & Known Limitations

- **MongoDB Atlas only**: Configured for Atlas. For a local instance, replace `MONGODB_URI` with `mongodb://localhost:27017/taskmanager` — no other changes needed.
- **Task ownership**: All task queries, updates, and deletes — whether via the UI or the AI assistant — are scoped to the authenticated user via the `userId` foreign key. Cross-user access is blocked at the database query level, and the AI cannot override this since it never controls `userId`.
- **API-driven filtering & sorting**: Status filtering and due-date sorting are handled entirely by the backend, not client-side.
- **Password strength**: Minimum 6 characters, enforced on the frontend. Hashed server-side with `bcryptjs` (12 salt rounds).
- **CORS policy**: Any `localhost` origin allowed in development; only the exact `CLIENT_URL` permitted in production.
- **AI tool-calling loop cap**: The assistant's multi-step reasoning is capped at 5 internal iterations per request to prevent runaway loops. If a request can't be resolved within that limit, the assistant returns a fallback message asking the user to rephrase.
- **AI provider free tiers**: Gemini and Groq's free tiers have rate limits. The provider-agnostic config means switching between them (or adding others) only requires updating three environment variables — no code changes.