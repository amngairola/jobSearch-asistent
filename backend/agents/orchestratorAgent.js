const { v4: uuidv4 } = require('uuid');
const BaseAgent = require('./baseAgent');
const JobSearchAgent = require('./jobSearchAgent');
const JobMatcherAgent = require('./jobMatcherAgent');
const ApplicationAgent = require('./applicationAgent');
const ApplicationTrackerAgent = require('./applicationTrackerAgent');
const fileStore = require('../utils/fileStore');
const database = require('../utils/database');
const { getGroqClient } = require('../utils/groqClient');
const { validateResume } = require('../utils/validation');
require('dotenv').config();

/**
 * OrchestratorAgent maintains per-session state and routes user messages to sub-agents.
 * It uses the BaseAgent runChat method which handles Groq tool calling, validation,
 * and iteration limits.
 */
class OrchestratorAgent extends BaseAgent {
  constructor() {
    super();
    this.sessions = new Map();
    this._loadPersistedSessions();
    this._setupTools();
  }

  /** Load all persisted sessions from file store */
  _loadPersistedSessions() {
    try {
      const persisted = fileStore.findOne('sessions', d => d.id === 'all');
      if (persisted && Array.isArray(persisted.data)) {
        persisted.data.forEach(s => {
          if (s.sessionId) this.sessions.set(s.sessionId, s);
        });
        console.log(`Loaded ${this.sessions.size} persisted sessions`);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e.message);
    }
  }

  /** Register all tools with concrete implementations */
  _setupTools() {
    const self = this;

    this.registerTool({
      name: 'searchJobs',
      description: 'Search for real job listings on the internet. Use this when the user asks to find, search, or look for jobs.',
      parameters: {
        type: 'object',
        properties: {
          query:    { type: 'string', description: 'Job title, role, or keywords (e.g., "React developer", "Python engineer")' },
          location: { type: 'string', description: 'City, country, or "remote" (e.g., "India", "New York", "remote")' },
          remote:   { type: 'boolean', description: 'Whether to filter for remote jobs only' }
        },
        required: ['query']
      },
      func: async ({ query, location = '', remote = false }) => {
        const jobSearch = new JobSearchAgent();
        const jobs = await jobSearch.search(query, location, remote);
        return { jobs_found: jobs.length, jobs: jobs.slice(0, 10) };
      }
    });

    this.registerTool({
      name: 'matchJobs',
      description: 'Match the user\'s resume skills against current job listings. Use this when the user asks to match jobs to their resume or profile.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The session ID' }
        },
        required: ['sessionId']
      },
      func: async ({ sessionId }) => {
        const session = await self._getSession(sessionId);
        if (!session.parsedResume) return { error: 'No resume uploaded. Please upload your resume first.' };
        const matcher = new JobMatcherAgent();
        const matches = matcher.match(session.parsedResume, null);
        session.matched = matches;
        self._persistSessions();
        return { matches: matches.slice(0, 10) };
      }
    });

    this.registerTool({
      name: 'prepareApplication',
      description: 'Generate a personalized cover letter and prepare a job application. Use when the user wants to apply or generate a cover letter.',
      parameters: {
        type: 'object',
        properties: {
          jobId:     { type: 'string', description: 'The ID of the job to apply for' },
          sessionId: { type: 'string', description: 'The session ID' }
        },
        required: ['jobId', 'sessionId']
      },
      func: async ({ jobId, sessionId }) => {
        const appAgent = new ApplicationAgent();
        return await appAgent.prepareApplication(jobId, sessionId);
      }
    });

    this.registerTool({
      name: 'getApplicationHistory',
      description: 'Get the list of all job applications the user has prepared or submitted.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The session ID' }
        },
        required: ['sessionId']
      },
      func: async ({ sessionId }) => {
        const tracker = new ApplicationTrackerAgent();
        const apps = await tracker.getUserApplications(sessionId);
        return { applications: apps };
      }
    });
  }

  _persistSessions() {
    try {
      const arr = Array.from(this.sessions.values()).map(s => ({
        sessionId: s.sessionId,
        parsedResume: s.parsedResume,
        resumeMetadata: s.resumeMetadata || null,
        jobs: s.jobs || [],
        matched: s.matched || [],
        conversationHistory: (s.conversationHistory || []).slice(-20)
      }));
      fileStore.upsert('sessions', { id: 'all', data: arr });
    } catch (e) {
      console.error('Failed to persist sessions:', e.message);
    }
  }

  async _getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      let parsedResume = null;
      let resumeMetadata = null;
      try {
        const resumeDoc = await database.findOne('resumes', { session_id: sessionId });
        if (resumeDoc) {
          parsedResume = resumeDoc.data || null;
          resumeMetadata = resumeDoc.data?._metadata || resumeDoc._metadata || null;
        }
      } catch (error) {
        console.error('Error loading resume from storage:', error.message);
      }

      this.sessions.set(sessionId, {
        sessionId,
        parsedResume,
        resumeMetadata,
        jobs: [],
        matched: [],
        selectedJob: null,
        pendingApplication: null,
        conversationHistory: []
      });
    }
    return this.sessions.get(sessionId);
  }

  /** Set session resume after parsing */
  async setSessionResume(sessionId, parsedData, metadata = null) {
    const session = await this._getSession(sessionId);
    session.parsedResume = parsedData;
    if (metadata) session.resumeMetadata = metadata;
    this._persistSessions();
  }

  /** Update session resume from user manual edit and persist */
  async updateSessionResume(sessionId, updatedData) {
    const session = await this._getSession(sessionId);

    // Validate updated data
    if (!updatedData.name || typeof updatedData.name !== 'string' || updatedData.name.trim().length === 0) {
      throw new Error('Candidate name is required.');
    }

    // Ensure flat skills list is synchronized
    if (updatedData.skillsByCategory && typeof updatedData.skillsByCategory === 'object') {
      const catSkills = Object.values(updatedData.skillsByCategory).flat().filter(Boolean);
      const combined = new Set([...(updatedData.skills || []), ...catSkills]);
      updatedData.skills = Array.from(combined);
    }

    session.parsedResume = updatedData;
    this._persistSessions();

    await this.saveResumeToDatabase(sessionId, {
      ...updatedData,
      _metadata: session.resumeMetadata || null
    });

    // If session has jobs, re-run matching automatically with updated profile
    if (session.jobs && session.jobs.length > 0) {
      const matcher = new JobMatcherAgent();
      session.matched = matcher.match(updatedData, null);
      this._persistSessions();
    }

    return session.parsedResume;
  }

  /** Save resume document to database/storage */
  async saveResumeToDatabase(sessionId, parsedData) {
    try {
      await database.upsert('resumes', sessionId, {
        session_id: sessionId,
        data: parsedData,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving resume to storage:', error.message);
    }
    this._persistSessions();
  }

  /** Parse raw resume text into structured JSON using Groq with json_object */
  async structureResume(rawText) {
    const client = getGroqClient();

    const systemPrompt = `You are a high-accuracy Resume Information Extractor.
Convert the provided raw resume text into a clean, verified JSON object matching this schema EXACTLY:
{
  "name": "Full Name (string)",
  "email": "Email address or null",
  "phone": "Phone number or null",
  "location": "City, State/Country or null",
  "designation": "Current or target professional title (e.g. 'Senior Full Stack Developer') or null",
  "skills": ["Array of all technical and professional skills as strings"],
  "skillsByCategory": {
    "languages": ["Programming languages, e.g. JavaScript, Python, TypeScript"],
    "frameworks": ["Frameworks, e.g. React, Next.js, Express, Django"],
    "developerTools": ["Tools & Platforms, e.g. Git, Docker, AWS, Webpack"],
    "librariesAndDatabases": ["Databases & Libraries, e.g. MongoDB, PostgreSQL, Redux, Tailwind CSS"],
    "other": ["Other skills"]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title / Role",
      "duration": "Dates worked (e.g. '2022 - Present' or 'Jun 2020 - Aug 2022')",
      "startDate": "Start date or null",
      "endDate": "End date or null",
      "achievements": ["List of achievements and responsibilities"],
      "description": "Short summary of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree and Major (e.g. 'Bachelor of Technology in Computer Science')",
      "institution": "University / College name",
      "dates": "Dates attended (e.g. '2016 - 2020')",
      "year": "Graduation year or null",
      "cgpa": "CGPA / GPA / Percentage if explicitly mentioned, otherwise null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "technologies": ["Technologies used"],
      "description": "Concise description of the project and impact"
    }
  ],
  "certifications": ["List of certification titles"]
}

STRICT ANTI-HALLUCINATION RULES:
1. Extract ONLY information that is explicitly stated in the resume text.
2. NEVER invent, extrapolate, or hallucinate missing phone numbers, emails, dates, CGPA, or companies.
3. Preserve exact candidate names, company names, project names, and dates.
4. Do NOT confuse project experience with professional work experience:
   - Projects done independently or in school must go under 'projects'.
   - Employment at an employer/company must go under 'experience'.
5. Do NOT confuse education dates with employment dates.
6. Do NOT invent years of experience if not stated.
7. Return null for missing scalar fields, and empty arrays [] for missing lists.
8. Output ONLY a valid JSON object.`;

    let text;
    try {
      const response = await client.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please return a valid JSON object extracting the profile from this resume content:\n\n${rawText.substring(0, 10000)}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      text = response.choices[0].message.content.trim();
    } catch (apiErr) {
      if (apiErr.message && (apiErr.message.includes('json_validate_failed') || apiErr.status === 400)) {
        console.warn('Groq json_validate_failed, retrying with raw JSON extraction prompt...');
        const retryRes = await client.chat.completions.create({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: systemPrompt + '\nRespond ONLY with a valid JSON object starting with { and ending with } without extra commentary.' },
            { role: 'user', content: `Extract the resume profile as a JSON object:\n\n${rawText.substring(0, 10000)}` }
          ],
          temperature: 0.1
        });
        text = retryRes.choices[0].message.content.trim();
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();
      } else {
        throw apiErr;
      }
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse resume JSON response:', text.substring(0, 200));
      throw new Error('AI returned invalid JSON for resume parsing.');
    }

    // Post-process & guarantee flat skills array
    if (!Array.isArray(parsed.skills)) parsed.skills = [];
    if (parsed.skillsByCategory && typeof parsed.skillsByCategory === 'object') {
      const fromCats = Object.values(parsed.skillsByCategory).flat().filter(Boolean);
      const combined = new Set([...parsed.skills, ...fromCats]);
      parsed.skills = Array.from(combined);
    }

    // Ensure array fields exist
    if (!Array.isArray(parsed.experience)) parsed.experience = [];
    if (!Array.isArray(parsed.education)) parsed.education = [];
    if (!Array.isArray(parsed.projects)) parsed.projects = [];
    if (!Array.isArray(parsed.certifications)) parsed.certifications = [];

    return parsed;
  }

  /** Main entry point for /api/chat */
  async processMessage(message, sessionId = null) {
    if (!sessionId) sessionId = `session_${uuidv4()}`;
    const session = await this._getSession(sessionId);
    session.conversationHistory.push({ role: 'user', content: message });

    let resumeContext = 'No resume uploaded.';
    if (session.parsedResume) {
      const r = session.parsedResume;
      resumeContext = `Candidate: ${r.name || 'User'}. Target Role: ${r.designation || 'Software Engineer'}. Location: ${r.location || 'Any'}. Top Skills: ${(r.skills || []).slice(0, 15).join(', ')}.`;
    }

    const systemPrompt = `You are an AI Job Search and Application Assistant.
Session ID: ${sessionId}
Resume Context: ${resumeContext}
Jobs in session: ${session.jobs.length}

BEHAVIORAL INSTRUCTIONS:
1. When user asks to search/find jobs:
   - Use the 'searchJobs' tool with relevant query, location, and remote arguments.
   - In your final response, provide a brief, professional summary (1-2 sentences) of the jobs found.
   - DO NOT dump full raw job descriptions or long lists of text into the chat response, because the UI renders structured interactive Job Cards directly underneath your message.
2. When user asks to match jobs:
   - Call 'matchJobs' with sessionId "${sessionId}".
   - Summarize the top matches and explain why they align with candidate skills.
3. When user asks to apply or generate a cover letter:
   - Use 'prepareApplication' tool.
4. When user asks about application history:
   - Use 'getApplicationHistory' tool.
5. Always pass sessionId "${sessionId}" to tools that require it.
6. Be concise, professional, and helpful.`;

    const recentHistory = session.conversationHistory.slice(-10);
    let responseText;
    try {
      responseText = await this.runChat(systemPrompt, message, recentHistory);
    } catch (err) {
      console.error('Orchestrator processMessage error:', err.message);
      responseText = `I encountered an issue processing your request: ${err.message}. Please try again.`;
    }

    session.conversationHistory.push({ role: 'assistant', content: responseText });

    // Update session jobs from latest file store if a search was performed
    const latestJobs = fileStore.findOne('jobs', d => d.id === 'latest');
    if (latestJobs && latestJobs.data && latestJobs.data.length > 0) {
      session.jobs = latestJobs.data;
    }

    this._persistSessions();

    return {
      response: responseText,
      session_id: sessionId,
      parsed_resume: session.parsedResume,
      recommended_jobs: session.jobs.length ? session.jobs : null,
      applied_jobs: null
    };
  }
}

module.exports = OrchestratorAgent;
