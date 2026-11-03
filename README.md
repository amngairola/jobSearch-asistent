# AI Job Assistant MVP

An intelligent, multi-agent Job Search and Application Assistant powered by Groq LLMs, Tavily web search, and local JSON persistence.

---

## Architecture

```
User (Browser) → Frontend (Vite + React + Tailwind v3 + TS) [Port 3000]
                      │ (Proxy / Direct REST API)
                  Backend (Express + Node.js) [Port 5000]
                      │
               OrchestratorAgent (Groq Tool Calling + Session Management)
                      ├── ResumeParserAgent (PdfReader + Mammoth for PDF/DOCX)
                      ├── JobSearchAgent (Tavily Real-Time Discovery + Greenhouse + Lever)
                      ├── JobMatcherAgent (Skill Overlap + Experience Scoring)
                      ├── ApplicationAgent (Groq Cover Letter Generator)
                      └── ApplicationTrackerAgent (JSON Persistence Layer)
```

---

## Key Features

1. **Prominent Resume Upload**: Drag-and-drop support for PDF and DOCX documents with immediate profile extraction.
2. **Groq AI Resume Parsing**: Extracts candidate name, email, phone, location, skills, experience, education, and projects into structured JSON.
3. **Session Persistence**: Uploaded filenames, extracted profiles, chat messages, and search results survive browser refreshes and backend restarts.
4. **Live Job Discovery**: Uses Tavily web search to discover genuine, up-to-date job postings (including Greenhouse and Lever boards).
5. **Skill Match Scoring**: Compares resume skills against job requirements, highlighting matching and missing skills.
6. **Tailored Cover Letters**: Generates customized cover letters using candidate experience and target job descriptions.
7. **Application Tracker**: Tracks application status (`Saved`, `Interested`, `Prepared`, `Applied`, `Interview`, `Offer`, `Rejected`).
8. **Interactive AI Chat**: Markdown-rendered chat with auto-scroll, structured inline job cards, and tool calling.

---

## Environment Setup

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

TAVILY_API_KEY=your_tavily_api_key_here

STORAGE_DIR=
AGENT_ALLOW_AUTOMATION=false
```

### Frontend (`frontend-new/.env`)

```env
VITE_BACKEND_URL=http://localhost:5000
```

---

## Local Development Commands

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend-new
npm install
```

### 2. Run the Application

Open two terminals:

**Terminal 1 (Backend - Port 5000):**
```bash
cd backend
node server.js
```

**Terminal 2 (Frontend - Port 3000):**
```bash
cd frontend-new
npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## Running the Automated Test Suite

To run the complete 11-step integration test:

```bash
cd backend
node test_full_workflow.js
```

Expected result:
```
====================================================
📊 TEST SUMMARY:
TOTAL: 11 | PASS: 11 | FAIL: 0 | BLOCKED: 0
====================================================
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/session/:sessionId` | Retrieve persisted session state (survives refresh) |
| `POST` | `/api/upload-resume` | Upload PDF/DOCX resume & extract profile |
| `POST` | `/api/chat` | AI agent conversation with tool calling |
| `GET` | `/api/search-jobs` | Natural language job search via Tavily |
| `GET` | `/api/match-jobs` | Score jobs against candidate resume |
| `POST` | `/api/apply-job` | Generate cover letter & prepare application |
| `GET` | `/api/applications` | Retrieve user application history |

---

## Deployment Instructions

### Backend (Render)
1. Create a new Web Service pointing to `backend`.
2. Build command: `npm install`
3. Start command: `node server.js`
4. Attach a persistent disk mounted at `/data` (1 GB).
5. Set `STORAGE_DIR=/data`, `PORT=10000`, `NODE_ENV=production`.
6. Add `GROQ_API_KEY`, `TAVILY_API_KEY`, and `FRONTEND_URL`.

### Frontend (Vercel)
1. Import repository and set Root Directory to `frontend-new`.
2. Framework: Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set `VITE_BACKEND_URL` to your Render backend URL.
