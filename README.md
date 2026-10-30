# AI Job Chat Assistant

A conversational AI-powered job assistant that parses resumes, recommends matching jobs, and applies to them on request. Built with Node.js/Express backend and React frontend.

## Features

- **Resume Parsing**: Automatically extracts name, contact, designation, skills, experience, education, and projects from PDF/DOCX resumes
- **Job Matching**: Intelligent matching algorithm that recommends jobs based on skills, experience, and designation
- **Conversational Interface**: Natural language chat interface to refine results (e.g., "show only remote roles", "jobs needing React")
- **Application Tracking**: Track applied jobs with status and timestamps
- **Agent-Based Architecture**: Orchestrator agent coordinates sub-agents for parsing, matching, and application tracking
- **No API Keys Required**: Rule-based system using local file operations - no external AI/LLM services needed

## Tech Stack

### Backend
- **Node.js** with **Express.js** - REST API server
- **Multer** - File upload handling
- **pdf-parse** - PDF parsing
- **mammoth** - DOCX parsing
- **Axios** - HTTP client
- **uuid** - Session ID generation
- **dotenv** - Environment variable management

### Frontend
- **React 18** - UI framework
- **Axios** - API client
- **Lucide React** - Icons

### Data Storage
- JSON files for jobs database and application tracking (no external database required)

## Environment Variables

### Backend (.env)
```bash
PORT=8000
```

**Note**: No API keys are required. This is a rule-based system using local file operations.

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8000
```

For production deployment, set `REACT_APP_API_URL` to your deployed backend URL.

## Project Structure

```
assesment/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.js       # Main orchestrator agent
│   │   ├── resumeParser.js       # Resume parsing agent
│   │   ├── jobMatcher.js         # Job matching agent
│   │   └── applicationTracker.js # Application tracking agent
│   ├── data/
│   │   ├── jobs.json             # Job database
│   │   ├── applications.json     # Application records
│   │   └── resumes/              # Uploaded resumes
│   ├── scripts/
│   │   └── scrape-jobs.js        # Job scraping script
│   ├── server.js                 # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── .env
└── README.md
```

## Agent Architecture

### 1. Orchestrator Agent
- Coordinates all sub-agents
- Manages conversation sessions
- Routes user messages to appropriate agents
- Maintains conversation context

### 2. Resume Parser Agent
- Extracts structured data from resumes
- Supports PDF and DOCX formats
- Parses: name, email, phone, designation, skills, experience, education, projects

### 3. Job Matcher Agent
- Matches resume data against job database
- Calculates match scores based on:
  - Title/designation similarity (30%)
  - Skill overlap (40%)
  - Experience requirements (20%)
  - Location preferences (10%)
- Returns top 20 matching jobs with reasons

### 4. Application Tracker Agent
- Records job applications
- Prevents duplicate applications
- Tracks application status and timestamps
- Provides application history

## Data Flow

1. **User uploads resume** → Resume Parser Agent extracts data
2. **Orchestrator receives parsed data** → Stores in session context
3. **User requests recommendations** → Job Matcher Agent finds matching jobs
4. **User refines results** → Orchestrator filters based on natural language
5. **User applies to job** → Application Tracker Agent records application
6. **User checks status** → Application Tracker Agent returns history

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Generate job database (2,000 jobs):
```bash
npm run scrape
```

5. Start backend server:
```bash
npm start
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start frontend development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Chat & Conversation
- `POST /api/chat` - Send chat message and get AI response
  - Body: `{ message: string, session_id?: string }`
  - Response: `{ response, session_id, parsed_resume?, recommended_jobs?, applied_jobs? }`

### Resume Handling
- `POST /api/upload-resume` - Upload and parse resume
  - Body: `multipart/form-data` with `resume` file
  - Response: `{ success, parsed_data, file_path }`

### Jobs
- `GET /api/jobs` - Get all jobs from database
  - Response: `{ jobs: [] }`

### Applications
- `GET /api/applications` - Get all applications
  - Response: `{ applications: [] }`
- `POST /api/apply-job` - Apply to a specific job
  - Body: `{ job_id: string, session_id: string }`
  - Response: `{ success, message, application }`

## User Flow

1. **Upload Resume**: User uploads PDF/DOCX resume through chat interface
2. **Auto-Parse**: System extracts and displays resume details (name, skills, experience, etc.)
3. **Get Recommendations**: System automatically shows matching jobs with match scores and reasons
4. **Refine Results**: User chats naturally to filter (e.g., "show only remote roles", "jobs needing React")
5. **Apply to Jobs**: User clicks "Apply" button or types "apply to job 3"
6. **Track Applications**: User can check application status anytime

## Error Handling

- **Unreadable resumes**: Clear error message with file format requirements
- **No matching jobs**: Informative message suggesting skill updates or broader search
- **Invalid job references**: Validation with user-friendly error messages
- **Duplicate applications**: Prevents re-application with confirmation message

## Job Database

The job database (`backend/data/jobs.json`) contains 2,000 realistic job listings with:
- Job ID
- Title
- Company
- Location
- Experience required
- Skills
- Description
- Source link
- Salary range
- Posted date

## Deployment

### Backend Deployment (Render, Railway, or similar)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables:
   - `PORT=8000`
4. Configure build command: `npm install`
5. Configure start command: `npm start`
6. Deploy

**Important**: The backend uses local JSON files for data storage. For production, you may need to:
- Use a persistent file system or
- Migrate to a cloud database (MongoDB, PostgreSQL, etc.)

### Frontend Deployment (Vercel, Netlify, or similar)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variable:
   - `REACT_APP_API_URL=https://your-backend-url.com`
4. Configure build command: `npm run build`
5. Configure output directory: `build`
6. Deploy

### Environment Variables Summary

**Local Development:**
- Backend: `PORT=8000`
- Frontend: `REACT_APP_API_URL=http://localhost:8000`

**Production (Render + Vercel):**
- Backend (Render): `PORT=8000` (automatically set by Render)
- Frontend (Vercel): `REACT_APP_API_URL=https://your-backend.onrender.com`

## Development

### Running in Development Mode

Backend:
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

Frontend:
```bash
cd frontend
npm start
```

### Adding New Features

1. **New Agent**: Create new file in `backend/agents/`
2. **New API Endpoint**: Add route in `backend/server.js`
3. **New UI Component**: Add component in `frontend/src/`

## Testing

Test the complete flow:
1. Upload a sample resume
2. Verify parsed data is correct
3. Check job recommendations appear
4. Try filtering (remote, specific skills)
5. Apply to a job
6. Verify application is tracked
7. Check application status

## License

This project is built for assessment purposes.

## Contact

For questions about this project, please contact the development team.
#   j o b S e a r c h - a s i s t e n t  
 