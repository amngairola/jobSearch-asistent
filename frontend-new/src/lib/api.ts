import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL });

export interface ExperienceItem {
  company: string;
  role: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  achievements?: string[];
  description?: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  dates?: string;
  year?: string;
  cgpa?: string | null;
}

export interface ProjectItem {
  name: string;
  technologies?: string[];
  description?: string;
}

export interface ParsedResume {
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  designation?: string | null;
  skills: string[];
  skillsByCategory?: {
    languages?: string[];
    frameworks?: string[];
    developerTools?: string[];
    librariesAndDatabases?: string[];
    other?: string[];
    [key: string]: any;
  };
  experience?: ExperienceItem[];
  education?: EducationItem[];
  projects?: ProjectItem[];
  certifications?: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: string | null;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  skills?: string[];
  applicationUrl: string;
  url?: string;
  sourceUrl?: string;
  source: string;
  publishedDate?: string;
}

export interface JobMatch {
  jobId: string;
  jobTitle?: string;
  company?: string;
  score: number;
  reason: string;
  missingSkills: string[];
  matchingSkills?: string[];
  recommendation?: string;
}

export interface UrlClassification {
  isValid: boolean;
  isDirectPortal: boolean;
  type: string;
  badge: string;
  label: string;
  warning?: string | null;
  domain: string;
}

export interface ApplicationPreparation {
  jobId: string;
  sessionId: string;
  coverLetter: string;
  jobUrl: string;
  applicationUrl: string;
  urlClassification?: UrlClassification;
  job: {
    title: string;
    company: string;
    location: string;
    applicationUrl: string;
  };
}

export interface Application {
  id: string;
  sessionId: string;
  jobId: string;
  company: string;
  title: string;
  url: string;
  appliedDate: string;
  status: 'saved' | 'interested' | 'prepared' | 'pending' | 'applied' | 'submitted' | 'interview' | 'rejected' | 'offer' | 'failed';
  coverLetter?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  parsed_resume?: ParsedResume;
  recommended_jobs?: Job[];
  applied_jobs?: Application[];
}

export interface SessionResponse {
  session_id: string;
  parsed_resume: ParsedResume | null;
  resume_filename: string | null;
  jobs: Job[];
  matched: JobMatch[];
  conversation_history: any[];
}

// Fetch existing session state (for persistence on refresh)
export async function getSession(sessionId: string): Promise<SessionResponse> {
  const { data } = await api.get(`/api/session/${sessionId}`);
  return data;
}

// Upload resume
export async function uploadResume(file: File, sessionId?: string): Promise<{ success: boolean; filename: string; parsed_data: ParsedResume; session_id: string }> {
  const formData = new FormData();
  formData.append('resume', file);
  if (sessionId) formData.append('session_id', sessionId);
  const { data } = await api.post('/api/upload-resume', formData);
  return data;
}

// Update resume (user review & manual corrections)
export async function updateResume(sessionId: string, resumeData: ParsedResume): Promise<{ success: boolean; parsed_data: ParsedResume; matched: JobMatch[] }> {
  const { data } = await api.put(`/api/session/${sessionId}/resume`, { resume_data: resumeData });
  return data;
}

// Chat
export async function sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const { data } = await api.post('/api/chat', { message, session_id: sessionId });
  return data;
}

// Search jobs
export async function searchJobs(query: string, location?: string, remote?: boolean, sessionId?: string): Promise<{ jobs: Job[] }> {
  const { data } = await api.get('/api/search-jobs', {
    params: { q: query, location, remote: remote ? 'true' : 'false', session_id: sessionId }
  });
  return data;
}

// Match jobs
export async function matchJobs(sessionId: string): Promise<{ matches: JobMatch[] }> {
  const { data } = await api.get('/api/match-jobs', { params: { session_id: sessionId } });
  return data;
}

// Prepare application
export async function prepareApplication(jobId: string, sessionId: string): Promise<any> {
  const { data } = await api.post('/api/apply-job', { job_id: jobId, session_id: sessionId, confirmed: false });
  return data;
}

// Submit application
export async function submitApplication(jobId: string, sessionId: string): Promise<any> {
  const { data } = await api.post('/api/apply-job', { job_id: jobId, session_id: sessionId, confirmed: true });
  return data;
}

// Get application history
export async function getApplications(sessionId: string): Promise<{ applications: Application[] }> {
  const { data } = await api.get('/api/applications', { params: { session_id: sessionId } });
  return data;
}

export default api;
