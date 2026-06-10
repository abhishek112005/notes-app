# My Notes — AI-Powered Notes App

A full-stack MERN notes application with AI features, real-time sync, and a clean glassmorphism UI.

**Live Demo**: [notes-app-frontend-indol-ten.vercel.app](https://notes-app-frontend-indol-ten.vercel.app)

---

## Features

### Core
- JWT authentication with 60-min access tokens + 7-day refresh tokens
- bcrypt password hashing with automatic migration from legacy plain-text passwords
- Create, edit, delete, pin, archive, and search notes
- Soft-delete trash with restore and permanent delete
- Version history — up to 5 previous versions per note, with restore
- Public share links — shareable read-only URL per note (no login required)
- Sort by newest, oldest, A→Z, or last edited
- Filter by category (Work, Personal, Ideas, Meeting Notes, Journal)
- Color labels and custom tags per note

### AI (powered by Groq — llama-3.1-8b-instant)
- **Summarize** — generates a concise summary of any note
- **Auto-tag** — suggests relevant tags based on content
- **Mood detection** — detects emotional tone with an emoji
- **Writing assist** — continue writing, make it formal, or shorten
- **Title suggest** — generates a title from note content

### Editor
- Markdown editor with live preview
- Toolbar shortcuts (bold, italic, heading, code, list, checkbox)
- 5 note templates — Meeting Notes, Daily Journal, Idea Capture, Task List

### Other
- Real-time sync via Socket.io (local dev)
- Progressive Web App (PWA) — installable, works offline
- Keyboard shortcuts — `Ctrl+N` new note, `Ctrl+K` focus search, `Esc` close
- PDF export via jsPDF
- Text-to-speech read aloud
- Fully responsive — mobile sidebar drawer + FAB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Groq SDK (llama-3.1-8b-instant) |
| Real-time | Socket.io |
| PWA | vite-plugin-pwa, Workbox |
| Deployment | Vercel (frontend + backend) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Groq API key — [console.groq.com](https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/abhishek112005/notes-app.git
cd notes-app
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
CONNECTION_STRING=your_mongodb_atlas_uri
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
# runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend/notes-app
npm install
npm run dev
# runs on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `CONNECTION_STRING` | MongoDB Atlas connection URI |
| `ACCESS_TOKEN_SECRET` | Secret for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | Secret for signing JWT refresh tokens |
| `GROQ_API_KEY` | Groq API key for AI features |
| `FRONTEND_URL` | Frontend origin (for CORS) |

### Frontend (`frontend/notes-app/.env`)

| Variable | Description |
|---|---|
| `VITE_BASE_URL` | Backend API URL |

---

## Deployment

Both frontend and backend are deployed on **Vercel**.

- Backend — Express app served as a Vercel serverless function
- Frontend — Vite/React static build

> Note: Socket.io real-time sync is disabled on Vercel serverless. All other features including AI work fully.

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/create-account` | Register |
| POST | `/login` | Login |
| POST | `/refresh-token` | Refresh access token |
| POST | `/logout` | Logout |
| GET | `/get-user` | Get current user |

### Notes
| Method | Route | Description |
|---|---|---|
| GET | `/get-all-notes` | Get all notes (sort, category filter) |
| POST | `/add-note` | Create note |
| PUT | `/edit-note/:id` | Update note (saves version) |
| DELETE | `/delete-note/:id` | Soft delete (move to trash) |
| PUT | `/update-note-pinned/:id` | Toggle pin |
| PUT | `/archive-note/:id` | Toggle archive |
| GET | `/search-notes?q=` | Search by title, content, tags |

### Trash & Archive
| Method | Route | Description |
|---|---|---|
| GET | `/get-trash` | Get trashed notes |
| PUT | `/restore-note/:id` | Restore from trash |
| DELETE | `/permanent-delete/:id` | Permanently delete |
| GET | `/get-archived` | Get archived notes |

### Share & Versions
| Method | Route | Description |
|---|---|---|
| POST | `/generate-share/:id` | Generate share link |
| DELETE | `/remove-share/:id` | Remove share link |
| GET | `/share/:token` | Public view (no auth) |
| GET | `/versions/:id` | Get version history |
| POST | `/restore-version/:id/:index` | Restore a version |

### AI
| Method | Route | Description |
|---|---|---|
| POST | `/ai/summarize` | Summarize note content |
| POST | `/ai/auto-tag` | Generate tags |
| POST | `/ai/mood` | Detect mood |
| POST | `/ai/writing-assist` | Writing assistance |
| POST | `/ai/suggest-title` | Suggest a title |

---

## Author

**Abhishek** — [github.com/abhishek112005](https://github.com/abhishek112005)
