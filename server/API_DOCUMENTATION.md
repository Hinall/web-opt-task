# Task Manager API Documentation

This API supports user authentication and a CRUD system for managing tasks. It is built with Node.js, Express, and MongoDB.

## Table of Contents
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Authentication Routes](#authentication-routes)
  - [Task Routes](#task-routes)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas cluster)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs nodemon):
   ```bash
   npm run dev
   ```
3. Start in production mode:
   ```bash
   npm start
   ```

---

## Environment Variables

Create a `.env` file in the root of the server directory. Refer to `.env.example` for details:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | The port the server runs on | `5000` |
| `MONGODB_URI` | Connection string for MongoDB | `mongodb://localhost:27017/taskmanager` |
| `JWT_SECRET` | Secret key used to sign JWTs | `your_jwt_secret_key` |
| `JWT_EXPIRES_IN` | JWT token expiration time | `7d` |
| `NODE_ENV` | Application environment | `development` |
| `CLIENT_URL` | URL of the frontend for CORS policy | `http://localhost:3000` |

---

## Authentication

All protected endpoints require a valid JSON Web Token (JWT) sent via the `Authorization` header.

### Format
```http
Authorization: Bearer <your_jwt_token>
```

---

## Error Handling

Standard HTTP status codes are returned to indicate the success or failure of API requests:

- `200 OK` - Request succeeded.
- `201 Created` - Resource created successfully.
- `400 Bad Request` - Missing or invalid request body/parameters.
- `401 Unauthorized` - Authentication failed or token is missing/expired.
- `404 Not Found` - The requested resource or endpoint could not be found.
- `500 Internal Server Error` - Server-side error.

Error responses return a JSON body in the following format:
```json
{
  "message": "Error details or reason for failure"
}
```

---

## Data Models

### User Schema
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier | Auto-generated |
| `name` | String | Name of the user | Required |
| `email` | String | Email address of the user | Required, Unique |
| `password` | String | Hashed password | Required, Excluded in queries by default |
| `createdAt` | Date | Creation timestamp | Auto-generated |
| `updatedAt` | Date | Last update timestamp | Auto-generated |

### Task Schema
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier | Auto-generated |
| `title` | String | Title of the task | Required |
| `description` | String | Description of the task | Required |
| `status` | String | Current task status | Enum: `['pending', 'in-progress', 'done']` (Default: `'pending'`) |
| `dueDate` | Date | Due date of the task | Required |
| `userId` | ObjectId | Reference to the User owner | Required |
| `createdAt` | Date | Creation timestamp | Auto-generated |
| `updatedAt` | Date | Last update timestamp | Auto-generated |

---

## API Endpoints

### Health Check

#### `GET /api/health`
Verify if the API server is up and running.

- **Authentication Required:** No
- **Response (200 OK):**
  ```json
  {
    "status": "OK"
  }
  ```

---

### Authentication Routes

#### `POST /api/auth/register`
Register a new user account and receive an access token.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "647e30d1c7f55b1111111111",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Missing fields or email already registered)
  - `500 Internal Server Error`

#### `POST /api/auth/login`
Authenticate an existing user and retrieve an access token.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "647e30d1c7f55b1111111111",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Missing fields)
  - `401 Unauthorized` (Invalid credentials)
  - `500 Internal Server Error`

#### `GET /api/auth/me`
Retrieve details of the currently authenticated user.

- **Authentication Required:** Yes (`Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "647e30d1c7f55b1111111111",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (Token missing, expired, or invalid)
  - `500 Internal Server Error`

---

### Task Routes

All task routes are fully protected and require authentication. Tasks are scoped to the authenticated user.

#### `GET /api/tasks`
Fetch all tasks owned by the authenticated user. Tasks are sorted by creation date in descending order (`createdAt: -1`).

- **Authentication Required:** Yes (`Bearer <token>`)
- **Query Parameters:**
  - `status` (Optional): Filter tasks by status. Accepted values: `pending`, `in-progress`, `done`.
- **Response (200 OK):**
  ```json
  {
    "tasks": [
      {
        "_id": "647e31b8c7f55b2222222222",
        "title": "Complete project documentation",
        "description": "Create detailed md file and postman collection",
        "status": "in-progress",
        "dueDate": "2026-06-20T00:00:00.000Z",
        "userId": "647e30d1c7f55b1111111111",
        "createdAt": "2026-06-18T20:30:00.000Z",
        "updatedAt": "2026-06-18T20:31:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`
  - `500 Internal Server Error`

#### `POST /api/tasks`
Create a new task.

- **Authentication Required:** Yes (`Bearer <token>`)
- **Request Body:**
  ```json
  {
    "title": "Complete project documentation",
    "description": "Create detailed md file and postman collection",
    "status": "pending",
    "dueDate": "2026-06-20T00:00:00.000Z"
  }
  ```
  *Note: `status` is optional and defaults to `"pending"` if not provided.*
- **Response (201 Created):**
  ```json
  {
    "task": {
      "_id": "647e31b8c7f55b2222222222",
      "title": "Complete project documentation",
      "description": "Create detailed md file and postman collection",
      "status": "pending",
      "dueDate": "2026-06-20T00:00:00.000Z",
      "userId": "647e30d1c7f55b1111111111",
      "createdAt": "2026-06-18T20:30:00.000Z",
      "updatedAt": "2026-06-18T20:30:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Missing `title` or `dueDate`)
  - `401 Unauthorized`
  - `500 Internal Server Error`

#### `PUT /api/tasks/:id`
Update an existing task owned by the authenticated user.

- **Authentication Required:** Yes (`Bearer <token>`)
- **URL Parameters:**
  - `id` (Required): The ID of the task to update.
- **Request Body:**
  Provide any of the following fields to update them:
  ```json
  {
    "title": "Updated documentation title",
    "description": "Updated description",
    "status": "done",
    "dueDate": "2026-06-21T00:00:00.000Z"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "task": {
      "_id": "647e31b8c7f55b2222222222",
      "title": "Updated documentation title",
      "description": "Updated description",
      "status": "done",
      "dueDate": "2026-06-21T00:00:00.000Z",
      "userId": "647e30d1c7f55b1111111111",
      "createdAt": "2026-06-18T20:30:00.000Z",
      "updatedAt": "2026-06-18T20:35:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`
  - `404 Not Found` (Task not found or not owned by user)
  - `500 Internal Server Error`

#### `DELETE /api/tasks/:id`
Delete an existing task owned by the authenticated user.

- **Authentication Required:** Yes (`Bearer <token>`)
- **URL Parameters:**
  - `id` (Required): The ID of the task to delete.
- **Response (200 OK):**
  ```json
  {
    "message": "Task deleted successfully"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`
  - `404 Not Found` (Task not found or not owned by user)
  - `500 Internal Server Error`
