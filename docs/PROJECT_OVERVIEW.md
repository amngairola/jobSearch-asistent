# Project Overview: AI Job Assistant MVP

## 1. Executive Summary

**AI Job Assistant** is an intelligent, multi-agent web application designed to transform the modern job-hunting workflow. Instead of acting as a generic conversational chatbot or a passive job scraper, the system operates as an end-to-end **autonomous job-search agent**. It ingests candidate resumes (in PDF or DOCX formats), extracts structured professional profiles using coordinate-aware parsing and Large Language Models (LLMs), conducts live web searches for individual job postings, evaluates candidate-job skill matches with explainable scoring, crafts tailored cover letters, and tracks the lifecycle of job applications.

---

## 2. The Problem It Solves

Job seeking today suffers from significant friction:
1. **Inefficient Search:** Job seekers spend dozens of hours sifting through noisy job board search aggregator pages (Glassdoor, Indeed, Naukri directory queries) that display outdated listings or repetitive promotions.
2. **Opaque Matching:** Standard keyword search engines match simple keywords without analyzing domain skills, requirements, or experience depth, leaving candidates uncertain about why they match or what skills they lack.
3. **Application Fatigue:** Writing personalized, tailored cover letters that connect actual resume experience to target job requirements without hallucination is time-consuming.
4. **Fragmented Tracking:** Candidates lose track of where they applied, which version of their resume was submitted, and the current status of each application.
5. **Over-Automation Risks:** Unchecked "bot" auto-submission tools often spam employers, violate terms of service, and fail on dynamic application forms.

**AI Job Assistant** solves these problems by combining deterministic data cleaning, coordinate-aware document parsing, real-time web discovery via Tavily, and fast inference via Groq (`openai/gpt-oss-20b`) into a unified, user-controlled workflow.

---

## 3. Target Users

- **Early-Career & Mid-Level Software Engineers:** Seeking verified engineering openings matching their specific tech stack (e.g., React.js, Node.js, TypeScript, MERN).
- **Career Switchers:** Needing clear gap analysis to identify missing skills between their current profile and target job descriptions.
- **Active Applicants:** Needing instant, tailored cover letters and clean, one-click access to official employer portals without automated spamming.

---

## 4. Key Functional Features

| Feature | Description | Key Tech / Agent |
|---|---|---|
| **Coordinate-Aware Resume Parsing** | Extracts candidate details from PDF/DOCX preserving visual structure, section hierarchy, and multi-column layouts without line concatenation. | `pdfreader`, `mammoth`, `resumeParserAgent.js` |
| **Structured Groq Profile Extraction** | Converts raw resume text into a validated JSON schema (contact, categorized skills, professional experience, education, projects, certifications) with strict anti-hallucination rules. | Groq API (`openai/gpt-oss-20b`), `orchestratorAgent.js`, Ajv |
| **Review & Manual Profile Editing** | Allows candidates to review extracted information in the UI, make corrections, and persist edits to JSON storage, instantly re-matching all jobs. | `ResumeViewer.tsx`, Express PUT API |
| **Live Web Job Discovery** | Performs real-time search queries targeting verified individual postings across direct ATS boards (Greenhouse, Lever) and company portals. | Tavily Core SDK, Cheerio, `jobSearchAgent.js` |
| **Deterministic Data Cleaning** | Strips Markdown headers, repeated social share tags, advertisements, and promotional buttons without deleting real job requirements. | RegEx cleaners, `jobSearchAgent.js` |
| **Aggregator & Directory Rejection** | Automatically discards directory search listings (Glassdoor queries, Indeed search loops, Reddit discussions) to ensure only genuine job openings are surfaced. | Domain & URL filter, `jobSearchAgent.js` |
| **Explainable Multi-Factor Matching** | Computes match percentage based on direct skill overlap, title compatibility, and location alignment, providing specific matching/missing skill tags. | `jobMatcherAgent.js` |
| **Tailored AI Cover Letters** | Generates concise, professional cover letters tailored to the candidate's actual background and target job description with 1-click clipboard copy. | `applicationAgent.js`, Groq API |
| **Safe Manual Apply Workflow** | Opens verified official application URLs in a new browser tab and identifies whether the link is an Official ATS portal or a Third-Party listing. | `urlHelper.js`, `urlUtils.ts`, `JobCard.tsx` |
| **Application Tracker** | Records application history with statuses (`Saved`, `Interested`, `Prepared`, `Applied`, `Interview`, `Offer`, `Rejected`). | `applicationTrackerAgent.js`, `fileStore.js` |
| **Interactive AI Agent Chat** | Conversational assistant capable of executing tools (`searchJobs`, `matchJobs`, `prepareApplication`, `getApplicationHistory`) and returning concise summaries. | Groq tool calling, `ChatWindow.tsx` |

---

## 5. Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5 (Hot Module Replacement, fast production bundling)
- **Styling:** Tailwind CSS v3, PostCSS, Autoprefixer
- **UI & Icons:** Lucide React, Radix UI primitives, Framer Motion
- **State & Server Cache:** TanStack React Query v5, custom `useSession` hook
- **Markdown & Notifications:** React Markdown, React Hot Toast

### Backend
- **Runtime & Server:** Node.js (v20+ / v22+) & Express.js
- **File Uploads:** Multer (multipart/form-data)
- **Document Extractors:** `pdfreader` (coordinate grouping), `pdf-parse` (fallback), `mammoth` (DOCX to Markdown)
- **Schema Validation:** Ajv & Ajv-Formats (JSON schema enforcement)
- **HTML Scraping:** Cheerio (parsing Greenhouse/Lever public boards)
- **Browser Automation & Testing:** Playwright (headless browser verification)
- **Local Persistence:** Atomic JSON file store (`fileStore.js`)

### Artificial Intelligence & External APIs
- **LLM Engine:** Groq SDK (`openai/gpt-oss-20b` / `llama-3.3-70b-versatile`)
- **Web Search API:** Tavily Core SDK (`@tavily/core` / REST API)

---

## 6. High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  React 18 + Vite + Tailwind CSS + TanStack Query [Port 3000] │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (HTTP)
┌──────────────────────────────▼──────────────────────────────┐
│                  Express.js Backend [Port 5000]             │
│  Rate Limiting, CORS, Multer File Uploads, Route Handlers   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 ┌──────────────────────┐             ┌──────────────────────┐
 │  Orchestrator Agent  │             │   Atomic FileStore   │
 │   (Groq LPUs & Tool  │             │  (Local JSON Storage │
 │    Calling Engine)   │             │   backend/data/)     │
 └──────────┬───────────┘             └──────────────────────┘
            │
   ┌────────┴────────┬───────────────────┬────────────────────┐
   ▼                 ▼                   ▼                    ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ ResumeParser │ │  JobSearch   │ │  JobMatcher  │ │   ApplicationAgent   │
│ (pdfreader + │ │ (Tavily API  │ │ (Skill match │ │ (Groq Cover Letter + │
│   mammoth)   │ │  + Cheerio)  │ │   scoring)   │ │    URL Validation)   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘
```

---

## 7. Important Technical Decisions

1. **Local File-Based JSON Persistence instead of MongoDB:**
   - *Rationale:* Eliminates costly external database cluster dependencies (e.g. MongoDB Atlas) and complex connection state handling. Using atomic temp-write-and-rename operations (`fs.renameSync`) prevents file corruption and provides zero-latency local operations that can be mounted to a persistent disk on Render (`/data`).
2. **Groq LPU Inference over Traditional Cloud APIs:**
   - *Rationale:* Groq's Language Processing Units (LPUs) provide near-instantaneous token generation (300+ tokens/sec), allowing real-time multi-step tool calling without the typical 5–10 second latency of conventional LLM endpoints.
3. **Tavily Core Search over Generic Web Crawlers:**
   - *Rationale:* Tavily is optimized specifically for LLM context, returning clean content extracts rather than raw minified scripts and CSS.
4. **Coordinate-Aware Text Extraction over Linear Stream Parsers:**
   - *Rationale:* Conventional PDF readers process raw glyph streams that merge multi-column layouts into single concatenated lines. Sorting by vertical coordinate `y` and horizontal coordinate `x` preserves paragraphs, sections, and bullet lists.
5. **Safe Manual Application by Default:**
   - *Rationale:* Enforces `AGENT_ALLOW_AUTOMATION=false` by default. Instead of brittle form-filling scripts that get blocked by CAPTCHAs or employer firewalls, the assistant opens the verified URL in a new tab, equips the candidate with a tailored cover letter, and updates the tracker only upon explicit candidate confirmation.
