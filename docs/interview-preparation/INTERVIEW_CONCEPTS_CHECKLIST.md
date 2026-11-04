# Technical Interview Concepts Checklist

This checklist connects every core computer science and software engineering concept implemented in the **AI Job Assistant** codebase to interview questions and talking points. Use this to review before technical interviews.

---

## 1. JavaScript & TypeScript Fundamentals

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Promises & Async/Await** | `jobSearchAgent.js`, `api.ts`, `fileStore.js` | Built on top of the JavaScript microtask queue. Handles asynchronous network I/O without blocking the single-threaded Node event loop. | [x] |
| **Event Loop & Microtasks** | Express request lifecycle, async tool calling | Node.js processes synchronous code in the call stack, microtasks (`Promise.then`, `process.nextTick`) immediately after, and macrotasks (`setTimeout`, I/O) in subsequent phases (timers, poll, check). | [x] |
| **TypeScript Interfaces & Generics** | `frontend-new/src/lib/api.ts` | Strongly typed API contracts (`Job`, `Application`, `ParsedResume`) prevent runtime `undefined is not a function` errors. Generics used in Axios request/response wrappers. | [x] |
| **Destructuring & Rest/Spread** | State updates in `App.tsx`, options parsing | Shallow copy semantics vs deep copy. Used for immutable state updates in React (`setApplications(prev => [...prev, newApp])`). | [x] |
| **Error Handling (try/catch/finally)** | `verifyUrlReachability`, `server.js` | Defensive handling of network timeouts, JSON parsing errors, and file system I/O with clear fallback responses. | [x] |
| **Closures** | Middleware, rate limiter, state setters | Functions retaining lexical environment variables even after outer functions have executed (e.g. rate-limit sliding windows). | [x] |

---

## 2. React & Frontend Architecture

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Component Lifecycle & Hooks** | `App.tsx`, `JobCard.tsx`, `ChatWindow.tsx` | Functional components with `useState`, `useEffect`, `useCallback`, and `useMemo`. Separation of presentation from business logic. | [x] |
| **Server State vs Client State** | `@tanstack/react-query` in `App.tsx` | Separation of asynchronous server cache (jobs, applications) with automatic refetching, deduping, and caching from local UI state (active tab, search filter). | [x] |
| **Optimistic UI Updates** | `ApplicationHistory.tsx` status change | Changing the status pill instantly in the UI while dispatching `PATCH /api/applications/:id` in the background for zero-latency user experience. | [x] |
| **Virtual DOM & Reconciliation** | Job listings feed, skills tag lists | React's diffing algorithm ($O(n)$) compares virtual trees using unique `key` props (`job.id`) to avoid expensive real-DOM re-renders. | [x] |
| **Controlled Components** | Search bar, chat input, filter inputs | Single source of truth: form values are driven by React state and updated via `onChange` handlers. | [x] |
| **Tailwind CSS & Design Tokens** | `JobCard.tsx`, `ApplicationHistory.tsx` | Utility-first CSS compiled at build-time with zero runtime CSS-in-JS overhead; responsive design via breakpoints (`md:`, `lg:`). | [x] |
| **SPA Client-Side Routing** | `frontend-new/vercel.json` | Rewriting all incoming browser requests `/(.*)` to `/index.html` so client-side history navigation functions without 404s. | [x] |

---

## 3. Node.js & Backend Architecture

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Express Middleware Pipeline** | `server.js` (`helmet`, `cors`, `json`) | Chain of Responsibility design pattern: sequential functions `(req, res, next)` intercepting, parsing, and securing HTTP traffic before route handlers. | [x] |
| **Multer & Multi-part Form Data** | `POST /api/resume/upload` | Streaming binary multipart uploads into temporary memory buffers or disk storage for PDF/DOCX processing. | [x] |
| **Stream Processing vs Buffering** | `pdf-parse`, `mammoth` document extraction | Loading document binary buffers and streaming raw text without leaking memory or blocking server workers. | [x] |
| **RESTful API Principles** | `server.js` routes | Proper HTTP verbs (`GET` for idempotent retrieval, `POST` for creation, `PATCH` for partial state updates) and standardized status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Server Error`). | [x] |
| **Graceful Degraded State** | Storage disk write-probe in `server.js` | Probing `/data` on boot: if EACCES/read-only on Render free tier, fallback automatically to local directory `./data` without crashing. | [x] |

---

## 4. Storage, Persistence & Systems Design

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Atomic File Writes** | `backend/utils/fileStore.js` | Writing payload to a temporary file (`.tmp.UUID`) and executing `fs.renameSync`. Operates at the OS inode level, guaranteeing atomic file replacement even during power loss. | [x] |
| **ACID Principles in Micro-Stores** | `fileStore.js` | **Atomicity:** rename guarantees all-or-nothing write. **Consistency:** JSON validated before write. **Isolation:** synchronous single-process lock. **Durability:** flushed to disk. | [x] |
| **JSON Store vs SQL/NoSQL Trade-Offs** | Storage architecture decision | Zero external database overhead for single-user assistant vs trade-offs in horizontal scaling, indexing, and high-concurrency multi-tenancy. | [x] |
| **Idempotency** | Job deduplication & status updates | Repeating an identical search or updating an application to the same status multiple times leaves the system in the exact same state. | [x] |

---

## 5. Generative AI, LLMs & Agents

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **ReAct Loop (Reason + Act)** | `orchestratorAgent.js` | Iterative execution loop where the LLM reasons, calls tools, observes outputs, and reasons again until completing the user goal. | [x] |
| **Function / Tool Calling** | Groq API `tools` array | Providing JSON schemas of backend functions to the LLM so it generates structured JSON arguments instead of unstructured conversational text. | [x] |
| **Token Budgeting & Context Windows** | `resumeAgent.js` text truncation | Enforcing an 8,000-character cap on raw resume text to avoid exceeding token limits and prevent context dilution. | [x] |
| **Prompt Engineering & Zero-Shot** | `applicationAgent.js` (Cover Letter) | Role prompting, task boundaries, output format constraints, and negative constraints to eliminate generic AI cliches. | [x] |
| **Deterministic Information Extraction** | `resumeAgent.js` with $T=0.1$ | Using near-zero temperature to force greedy token selection, preventing hallucinations during skill and date parsing. | [x] |
| **Human-in-the-Loop AI Guardrail** | `AGENT_ALLOW_AUTOMATION=false` | AI handles preparation, search, and matching, but human explicitly verifies and submits to respect employer Terms of Service and prevent disqualification. | [x] |

---

## 6. Information Retrieval, Search & Scraping

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Web Retrieval Grounding** | Tavily Search API in `jobSearchAgent.js` | Overcoming static LLM knowledge cutoffs by fetching live, indexable job listings published within the last 7–30 days. | [x] |
| **Parallel Batch Verification** | `verifyUrlReachability` in `urlHelper.js` | Executing HTTP `HEAD` / `GET` checks concurrently across 5 connections with strict 2.5s timeouts to weed out dead 404 links. | [x] |
| **Anti-Bot Response Handling** | Handling 401/403 Cloudflare blocks | Distinguishing between dead links (404/410) and corporate anti-bot challenges (403), preserving genuine listings as `unverified` instead of discarding. | [x] |
| **URL Normalization & Deduplication** | URL sanitization in `urlHelper.js` | Stripping tracking tokens (`utm_source`, `ref`, `gh_src`) and hashing title+company pairs to avoid duplicate cards. | [x] |

---

## 7. Security & Production Engineering

| Concept | Where It Is Used in This Project | Interview Talking Point / Key Explanation | Status |
| :--- | :--- | :--- | :---: |
| **Cross-Origin Resource Sharing (CORS)** | `server.js` | Whitelisting specific trusted origins (deployed Vercel domain and local dev) while rejecting arbitrary origins. | [x] |
| **HTTP Security Headers** | `helmet` in `server.js` | Mitigating Cross-Site Scripting (XSS), clickjacking, and MIME-sniffing by setting `X-Frame-Options`, `Content-Security-Policy`, and `Strict-Transport-Security`. | [x] |
| **Open Redirect & Tabnabbing Protection** | `openExternalUrl` in `urlUtils.ts` | Validating `http:`/`https:` protocols and opening new tabs with `rel="noopener noreferrer"` to prevent opened pages from hijacking `window.opener`. | [x] |
| **Secrets & Environment Isolation** | `.env` vs `.env.example` | Keeping API keys (`GROQ_API_KEY`, `TAVILY_API_KEY`) out of Git version control using `.gitignore` and injecting them at runtime via cloud host secrets. | [x] |

---

## 8. Summary Checklist for Interview Day

- [ ] Can draw the end-to-end architecture on a whiteboard in 2 minutes.
- [ ] Can write the ReAct loop algorithm in pseudocode.
- [ ] Can calculate a job match score with numbers on paper.
- [ ] Can explain how atomic file writes work at the OS level.
- [ ] Can explain why `AGENT_ALLOW_AUTOMATION=false` is a deliberate engineering decision.
- [ ] Can discuss how to scale this architecture to 100,000 users with PostgreSQL, Redis, and Vector DB.
