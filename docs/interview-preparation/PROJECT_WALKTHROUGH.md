# AI Job Assistant: Complete Project Walkthrough

---

## 1. Executive Summary & Problem Statement

### 1.1 What the Project Does
The **AI Job Assistant** is an autonomous full-stack agentic platform that streamlines the software engineering job-hunt workflow. Rather than functioning as a passive aggregator or a basic chatbot, it operates as an active recruitment copilot that:
1. Ingests raw candidate resumes in **PDF** or **DOCX** formats.
2. Performs coordinate-aware text extraction and converts messy document data into a strictly structured JSON profile using Groq's high-speed LPU inference (`openai/gpt-oss-20b`) with zero hallucination.
3. Interprets natural language search queries (e.g. *"Fresher React Developer jobs in India"* or *"Remote Node.js internships"*), decomposes them into semantic search queries, and retrieves active job listings via the Tavily Search API.
4. Performs real-time HTTP reachability validation to weed out expired listings (404/410), redirects to search aggregators, and malformed URLs.
5. Classifies target URLs into **Official ATS Portals** (Greenhouse, Lever, Ashby, Workday), **Direct Company Career Pages**, or **Third-Party Job Boards** (LinkedIn, Indeed, Naukri).
6. Evaluates candidate-job compatibility using a transparent, deterministic mathematical scoring formula across direct skills, title hierarchy, location, and experience.
7. Generates customized, 3-paragraph cover letters tailored to the candidate's achievements and the specific job requirements.
8. Implements an ethical, **Human-in-the-Loop Safe Apply Workflow** (`AGENT_ALLOW_AUTOMATION=false`) that opens the verified official portal in a secure window and requires explicit candidate confirmation before committing status updates to the application tracker.

### 1.2 The Problem It Solves
Traditional tech recruitment creates friction for both candidates and recruiters:
- **Keyword Noise & Black-Box Scraping:** Generic job boards surface hundreds of outdated, expired, or repetitive listings. Candidates spend hours clicking broken links or third-party lead-generation aggregators.
- **Bot Spam & Candidate Blacklisting:** Automated browser form-fillers ("job botting") spam ATS portals with low-quality generic applications, triggering Cloudflare blocks, CAPTCHA hurdles, and candidate blacklists.
- **Generic Cover Letters:** Manually tailoring cover letters for dozens of applications is tedious, leading candidates to submit generic templates that recruiters ignore.
- **Lack of Explainability:** Typical recommendation algorithms output arbitrary ratings without explaining *why* a candidate matched or *what specific skills* they need to prepare before an interview.

### 1.3 Target Users
- **Freshers & Early-Career Developers:** Looking for entry-level, junior, or internship roles without getting drowned in senior-level job listings.
- **Career Switchers & Full-Stack Developers:** Needing immediate feedback on technical skill gaps and tailored application materials.
- **Software Engineers:** Seeking direct, verified ATS links to companies rather than navigating third-party intermediary portals.

---

## 2. Complete Technology Stack

```
┌─────────────────────────┬─────────────────────────┬────────────────────────────────────────┐
│ Layer                   │ Technology              │ Purpose & Architectural Rationale       │
├─────────────────────────┼─────────────────────────┼────────────────────────────────────────┤
│ Frontend Client         │ React 18, TypeScript    │ Type-safe UI, reactive state           │
│ Build Tooling           │ Vite 5, Rollup          │ Sub-second HMR, optimized static assets│
│ Styling & Components    │ Tailwind CSS, Lucide    │ Modern SaaS aesthetic, responsive design│
│ Server & Routing        │ Node.js 18+, Express.js │ Lightweight, event-driven REST backend │
│ Multipart File Intake   │ Multer (diskStorage)    │ Streams PDF/DOCX to verified disk      │
│ Binary Document Extract │ pdf-parse, mammoth      │ Extracts raw text streams from docs    │
│ Generative AI Engine    │ Groq SDK (gpt-oss-20b)  │ 300+ tok/sec inference for parsing     │
│ Web Search API          │ Tavily Search API       │ Clean markdown job discovery           │
│ HTML Parsing & Scraping │ Cheerio                 │ Extracts structured fields from ATSs   │
│ Persistence Layer       │ Atomic JSON FileStore   │ Posix-atomic temp-rename file storage  │
│ Browser Testing         │ Playwright (Chromium)   │ End-to-end browser user workflow tests │
│ Cloud Hosting           │ Vercel + Render         │ Decoupled static SPA + Node Web Service│
└─────────────────────────┴─────────────────────────┴────────────────────────────────────────┘
```

---

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    User([Candidate / Browser Client]) <--> Frontend["React 18 + Vite SPA (Vercel)"]
    Frontend <-->|REST API + CORS (Normalized)| Backend["Express.js Server (Render)"]

    subgraph Backend_Pipeline["Express Application Pipeline"]
        Backend --> Router["REST Route Handlers"]
        Router --> Multer["Multer File Intake"]
        Router --> ResumeParser["Resume Parser Agent (pdf-parse / mammoth)"]
        Router --> Orchestrator["Orchestrator Agent (ReAct Loop)"]
        Router --> SearchAgent["Job Search Agent"]
        Router --> MatcherAgent["Job Matcher Agent"]
        Router --> AppAgent["Application Agent"]
    end

    subgraph External_Services["External AI & Search Services"]
        ResumeParser <-->|Structured JSON Mode| Groq["Groq LPU (openai/gpt-oss-20b)"]
        Orchestrator <-->|Multi-Turn ReAct Loop| Groq
        AppAgent <-->|Tailored Cover Letters| Groq
        SearchAgent <-->|Targeted Boolean Search| Tavily["Tavily Search API"]
        SearchAgent <-->|Direct Public Board API| ATS["Greenhouse / Lever APIs"]
    end

    subgraph Persistence["Local Atomic Persistence"]
        Backend --> FileStore["FileStore (fs.renameSync atomic writes)"]
        FileStore --> JSONData[("applications.json\njobs.json\nresumes.json\nuploads/")]
    end
```

---

## 4. End-to-End User Journey Walkthrough

### Phase 1: Intake & Resume Parsing
1. **File Selection:** The candidate drags and drops a PDF or DOCX file into the `ResumeUploader` component.
2. **Multipart Streaming:** The browser sends `POST /api/upload-resume` as `multipart/form-data`.
3. **MIME Verification:** `server.js` verifies the extension (`.pdf`, `.docx`) and file size limit (10MB).
4. **Binary Text Extraction:** The backend passes the buffer to `pdf-parse` or `mammoth` to extract clean raw text.
5. **Structured LLM Extraction:** The raw text is passed to Groq (`openai/gpt-oss-20b`) with an anti-hallucination prompt and JSON schema. Groq extracts candidate name, contact info, categorized technical skills, experience, education, and projects.
6. **Deterministic Fallback:** If the LLM experiences rate limits or JSON format failures, an automated regex fallback parser extracts contact info and cross-references skills against a dictionary of 200+ technologies.
7. **Profile Review & Edit:** The candidate reviews their profile in `ResumeViewer` and can manually correct any field with 1-click persistent saving via `PUT /api/session/:sessionId/resume`.

### Phase 2: Natural Language Job Discovery
1. **User Prompt:** The candidate types in chat: *"Find fresher React developer jobs in India"*.
2. **Intent Parsing:** `jobSearchAgent` detects experience intent (`isFresher = true`, `isIntern = false`).
3. **Boolean Query Generation:**
   - ATS Boards: `("React Developer") (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com) India (junior OR entry OR intern)`
   - Direct Postings: `"React Developer" job hiring "India" ("fresher" OR "entry level" OR "junior" OR "0-1 year") -intitle:"senior" -intitle:"lead" -intitle:"principal" -intitle:"vacancies"`
4. **Multi-Source Retrieval:** The agent executes parallel searches across Tavily and direct Greenhouse/Lever APIs.
5. **Quality Filtering:**
   - Aggregator landing pages (`/jobs?q=`, `/search?`, Glassdoor search, Reddit forums) are discarded.
   - Irrelevant non-technical roles from board queries are stripped.
6. **Real-Time URL Reachability Check:** The agent tests application URLs via `verifyUrlReachability()`:
   - Valid, active HTTP 200 links are marked `verified`.
   - Broken or 404/410 links are discarded.
   - Cloudflare-protected corporate portals (403/401) are retained as `unverified` without falsely treating them as expired.
7. **Seniority Guard:** If the user requested a fresher role, any job with "Senior", "Lead", "Staff", or "Architect" in the title is strictly pruned.

### Phase 3: Deterministic Compatibility Matching
1. **Vector Comparison:** The candidate's parsed skills and job requirements are normalized into lowercase tokens.
2. **Formula Execution:** `jobMatcherAgent.matchJob()` calculates the weighted score:
   $$\text{Score} = \min(100, \max(10, \text{Round}(S_{\text{skill}} + S_{\text{title}} + S_{\text{location}} + S_{\text{experience}})))$$
3. **Explainability Generation:** The engine computes the exact set of matching skills and missing skill gaps.
4. **Card Rendering:** The frontend displays rich `JobCard` components featuring the match badge, verified active indicators, company metadata, and expandable responsibilities.

### Phase 4: Safe Apply & Application Tracking
1. **Apply Trigger:** The user clicks **Apply** on a job card.
2. **Outbound Navigation:** The browser opens the verified application portal in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
3. **Safe Apply Modal:** The modal displays the classified portal type (Official ATS vs Third-Party), instructions for manual submission, and a tailored AI-generated cover letter.
4. **Status Guard:** The application record is initialized in status `'prepared'`—it is **never** automatically marked `'applied'`.
5. **Explicit Confirmation:** Only when the user manually submits the application on the employer's portal and clicks **"I Have Submitted This Application"** does the backend commit `status: 'applied'` with a timestamp.
6. **Pipeline Management:** The candidate tracks their lifecycle across `Saved`, `Interested`, `Prepared`, `Applied`, `Interview`, `Offer`, and `Rejected` with instant stage transitions.
