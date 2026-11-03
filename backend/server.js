const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const OrchestratorAgent = require('./agents/orchestratorAgent');
const ResumeParserAgent = require('./agents/resumeParserAgent');
const JobSearchAgent = require('./agents/jobSearchAgent');
const JobMatcherAgent = require('./agents/jobMatcherAgent');
const ApplicationAgent = require('./agents/applicationAgent');
const ApplicationTrackerAgent = require('./agents/applicationTrackerAgent');
const fileStore = require('./utils/fileStore');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Storage directories ──────────────────────────────────────────────────────
const DEFAULT_STORAGE_DIR = path.join(__dirname, 'data');
let resolvedStorageDir = process.env.STORAGE_DIR || DEFAULT_STORAGE_DIR;

function testDirectoryWritable(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.write_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);
    return true;
  } catch (err) {
    return false;
  }
}

if (!testDirectoryWritable(resolvedStorageDir)) {
  console.warn(`[WARN] Configured storage directory "${resolvedStorageDir}" is not writable. Falling back to local directory "${DEFAULT_STORAGE_DIR}".`);
  resolvedStorageDir = DEFAULT_STORAGE_DIR;
  if (!testDirectoryWritable(resolvedStorageDir)) {
    throw new Error(`CRITICAL: Storage directory "${resolvedStorageDir}" is not writable.`);
  }
}

process.env.STORAGE_DIR = resolvedStorageDir;
const STORAGE_DIR = resolvedStorageDir;
const RESUMES_DIR = path.join(STORAGE_DIR, 'uploads');
if (!fs.existsSync(RESUMES_DIR)) {
  try { fs.mkdirSync(RESUMES_DIR, { recursive: true }); } catch (_) {}
}

// ─── CORS ────────────────────────────────────────────────────────────────────
const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...frontendUrls,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : null;
    if (!origin || allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// ─── Agents ───────────────────────────────────────────────────────────────────
const orchestrator = new OrchestratorAgent();
const resumeParser = new ResumeParserAgent();

// ─── Multer Configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RESUMES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream'
    ];

    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error('Only PDF and DOCX files are allowed');
      err.status = 415;
      cb(err, false);
    }
  }
});

// Catch Multer errors cleanly and return 400 or 415 instead of 500
const handleResumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum allowed size is 10MB.' });
      }
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      const status = err.status || 415;
      return res.status(status).json({ error: err.message || 'Only PDF and DOCX files are allowed.' });
    }
    next();
  });
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  try {
    const testFile = path.join(STORAGE_DIR, `.health_probe_${Date.now()}`);
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    res.json({
      status: 'ok',
      storage: 'writable',
      storageDir: STORAGE_DIR,
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', storage: 'unwritable', error: err.message });
  }
});

app.get('/', (_req, res) => res.json({ message: 'AI Job Assistant API', status: 'running' }));

// Get session state (for persistence on refresh)
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    const session = await orchestrator._getSession(sessionId);
    res.json({
      session_id: sessionId,
      parsed_resume: session.parsedResume || null,
      resume_filename: session.resumeMetadata ? session.resumeMetadata.filename : null,
      jobs: session.jobs || [],
      matched: session.matched || [],
      conversation_history: session.conversationHistory || []
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update parsed resume manually (allows reviewing, correcting, and saving to JSON)
app.put('/api/session/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { resume_data } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    if (!resume_data || typeof resume_data !== 'object') {
      return res.status(400).json({ error: 'resume_data object is required' });
    }

    const updated = await orchestrator.updateSessionResume(sessionId, resume_data);
    const session = await orchestrator._getSession(sessionId);

    res.json({
      success: true,
      message: 'Resume updated and re-matched successfully',
      parsed_data: updated,
      matched: session.matched || []
    });
  } catch (error) {
    console.error('Resume update error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/update-resume', async (req, res) => {
  try {
    const { session_id, resume_data } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    if (!resume_data || typeof resume_data !== 'object') {
      return res.status(400).json({ error: 'resume_data object is required' });
    }

    const updated = await orchestrator.updateSessionResume(session_id, resume_data);
    const session = await orchestrator._getSession(session_id);

    res.json({
      success: true,
      message: 'Resume updated successfully',
      parsed_data: updated,
      matched: session.matched || []
    });
  } catch (error) {
    console.error('Resume update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message is too long (max 5000 characters)' });
    }
    const response = await orchestrator.processMessage(message.trim(), session_id);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error processing chat message' });
  }
});

// Upload & parse resume
app.post('/api/upload-resume', handleResumeUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a PDF or DOCX file.' });
    }

    // Extract structured raw text
    let rawText = '';
    try {
      const extracted = await resumeParser.parseResume(req.file.path);
      rawText = extracted.rawText;
    } catch (parseError) {
      console.error('Resume text extraction failed:', parseError.message);
      return res.status(422).json({ error: `Could not read resume file: ${parseError.message}` });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({
        error: 'Could not extract sufficient text from resume. Ensure the file contains selectable text and is not empty or image-only.'
      });
    }

    // Structure using Groq LLM
    let parsedData;
    try {
      parsedData = await orchestrator.structureResume(rawText);
    } catch (e) {
      console.error('Resume structuring failed:', e);
      return res.status(422).json({ error: `Resume parsing failed: ${e.message}` });
    }

    if (!parsedData || !parsedData.name) {
      return res.status(422).json({
        error: 'Could not extract structured profile from resume. Please ensure the document is formatted clearly.'
      });
    }

    const session_id = req.body.session_id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store metadata & parsed resume (PRESERVE ORIGINAL FILE)
    const resumeMetadata = {
      filename: req.file.originalname,
      storedPath: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    const session = await orchestrator._getSession(session_id);
    session.parsedResume = parsedData;
    session.resumeMetadata = resumeMetadata;
    orchestrator._persistSessions();

    await orchestrator.saveResumeToDatabase(session_id, {
      ...parsedData,
      _metadata: resumeMetadata
    });

    res.json({
      success: true,
      filename: req.file.originalname,
      parsed_data: parsedData,
      session_id
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: `Failed to process resume: ${error.message}` });
  }
});

// Search jobs
app.get('/api/search-jobs', async (req, res) => {
  try {
    const { q, location = '', remote = 'false', session_id } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const jobSearch = new JobSearchAgent();
    const jobs = await jobSearch.search(q, location, remote === 'true');

    // If session_id provided, store jobs in session & match against resume if present
    if (session_id) {
      const session = await orchestrator._getSession(session_id);
      session.jobs = jobs;
      if (session.parsedResume) {
        const matcher = new JobMatcherAgent();
        session.matched = matcher.match(session.parsedResume, null);
      }
      orchestrator._persistSessions();
    }

    res.json({ jobs });
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Match jobs to resume
app.get('/api/match-jobs', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    const session = await orchestrator._getSession(session_id);
    if (!session.parsedResume) {
      return res.status(400).json({ error: 'No resume found for this session. Upload a resume first.' });
    }

    const matcher = new JobMatcherAgent();
    const matches = matcher.match(session.parsedResume, null);
    matches.sort((a, b) => b.score - a.score);
    session.matched = matches;
    orchestrator._persistSessions();

    res.json({ matches });
  } catch (error) {
    console.error('Match jobs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Prepare / confirm application
app.post('/api/apply-job', async (req, res) => {
  try {
    const { job_id, session_id, confirmed } = req.body;
    if (!job_id || typeof job_id !== 'string') return res.status(400).json({ error: 'job_id is required' });
    if (!session_id || typeof session_id !== 'string') return res.status(400).json({ error: 'session_id is required' });

    const appAgent = new ApplicationAgent();

    if (confirmed) {
      const result = await appAgent.submitApplication(job_id, session_id);
      return res.json(result);
    } else {
      const prep = await appAgent.prepareApplication(job_id, session_id);
      return res.json(prep);
    }
  } catch (error) {
    console.error('Apply job error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Application history
app.get('/api/applications', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    const tracker = new ApplicationTrackerAgent();
    const applications = await tracker.getUserApplications(session_id);
    res.json({ applications });
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`STORAGE_DIR: ${STORAGE_DIR}`);
  console.log(`GROQ_MODEL: ${process.env.GROQ_MODEL}`);
  console.log(`Automation: ${process.env.AGENT_ALLOW_AUTOMATION}`);
});
