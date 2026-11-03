const { v4: uuidv4 } = require('uuid');
const { getGroqClient } = require('../utils/groqClient');
const fileStore = require('../utils/fileStore');
const { isValidUrl, classifyApplicationUrl } = require('../utils/urlHelper');
require('dotenv').config();

/**
 * ApplicationAgent handles:
 * 1. Preparing application materials (tailored AI cover letter, link classification).
 * 2. Explicit user confirmation of manual submission to update the application tracker.
 *
 * Automated form filling is disabled by default (AGENT_ALLOW_AUTOMATION=false)
 * to respect employer terms and user control.
 */
class ApplicationAgent {
  constructor() {
    this.groq = getGroqClient();
    this.automationEnabled = process.env.AGENT_ALLOW_AUTOMATION === 'true';
  }

  /** Generate a concise, tailored cover letter using Groq */
  async _generateCoverLetter(resume, job) {
    const systemPrompt = `You are an AI assistant crafting a tailored, professional cover letter. Use the candidate's actual resume background and connect it specifically to the job role and requirements. Keep it under 280 words. Write ready-to-use prose. Never invent experiences or companies not present in the resume.`;
    const userPrompt = `Candidate Profile:
Name: ${resume.name || 'Candidate'}
Skills: ${(resume.skills || []).slice(0, 15).join(', ')}
Experience: ${(resume.experience || []).map(e => `${e.role} at ${e.company} (${e.duration || ''})`).join('; ')}
Education: ${(resume.education || []).map(e => `${e.degree} from ${e.institution}`).join('; ')}

Target Job:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'India / Remote'}
Requirements: ${Array.isArray(job.requirements) ? job.requirements.join('; ') : ''}
Description: ${(job.description || '').substring(0, 400)}`;

    try {
      const response = await this.groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.warn('Groq cover letter generation fallback:', err.message);
      return `Dear Hiring Team at ${job.company},\n\nI am writing to express my strong interest in the ${job.title} position. With my background in software engineering and hands-on experience in ${(resume.skills || []).slice(0, 4).join(', ')}, I am confident in delivering value to your engineering team.\n\nThank you for considering my application.\n\nSincerely,\n${resume.name || 'Applicant'}`;
    }
  }

  /** Find session data from fileStore */
  _getSessionData(sessionId) {
    const sessionDoc = fileStore.findOne('sessions', d => d.id === 'all');
    if (!sessionDoc || !sessionDoc.data) return null;
    return sessionDoc.data.find(s => s.sessionId === sessionId) || null;
  }

  /** Prepare the application data and tailored cover letter */
  async prepareApplication(jobId, sessionId) {
    const session = this._getSessionData(sessionId);
    if (!session || !session.parsedResume) {
      throw new Error('Resume not available for this session. Please upload a resume first.');
    }
    const resume = session.parsedResume;

    // Find job in session jobs
    const job = session.jobs && session.jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error('Job not found in session. Please search for jobs first.');
    }

    const applicationUrl = (job.applicationUrl || job.url || '').trim();
    const classification = classifyApplicationUrl(applicationUrl);

    if (!classification.isValid) {
      throw new Error('This job listing does not have a valid application URL.');
    }

    const coverLetter = await this._generateCoverLetter(resume, job);

    const preparation = {
      jobId,
      sessionId,
      coverLetter,
      jobUrl: applicationUrl,
      applicationUrl,
      urlClassification: classification,
      job: {
        title: job.title,
        company: job.company,
        location: job.location || '',
        applicationUrl
      }
    };

    // Store a pending application record (status: prepared, NOT applied)
    const apps = fileStore.findAll('applications');
    let appRecord = apps.find(a => a.jobId === jobId && a.sessionId === sessionId);

    if (!appRecord) {
      appRecord = {
        id: uuidv4(),
        sessionId,
        jobId,
        company: job.company || '',
        title: job.title || '',
        url: applicationUrl,
        appliedDate: new Date().toISOString(),
        status: 'prepared',
        coverLetter
      };
      fileStore.upsert('applications', appRecord);
    } else {
      appRecord.coverLetter = coverLetter;
      appRecord.url = applicationUrl;
      fileStore.upsert('applications', appRecord);
    }

    return preparation;
  }

  /**
   * Submit/Confirm application:
   * Called only when user explicitly confirms they finished submitting manually on the portal.
   * Updates tracker status to 'applied'.
   */
  async submitApplication(jobId, sessionId) {
    const session = this._getSessionData(sessionId);
    if (!session || !session.parsedResume) {
      throw new Error('Resume not available for this session.');
    }

    const job = session.jobs && session.jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error('Job not found in session.');
    }

    const jobUrl = (job.applicationUrl || job.url || '').trim();
    const classification = classifyApplicationUrl(jobUrl);

    if (!classification.isValid) {
      throw new Error('Cannot confirm application: Application URL is invalid or missing.');
    }

    // Find existing record or create new one with status 'applied'
    const apps = fileStore.findAll('applications');
    let app = apps.find(a => a.jobId === jobId && a.sessionId === sessionId);

    if (app) {
      app.status = 'applied';
      app.appliedDate = new Date().toISOString();
      fileStore.upsert('applications', app);
    } else {
      app = {
        id: uuidv4(),
        sessionId,
        jobId,
        company: job.company || '',
        title: job.title || '',
        url: jobUrl,
        appliedDate: new Date().toISOString(),
        status: 'applied',
        coverLetter: ''
      };
      fileStore.upsert('applications', app);
    }

    return {
      success: true,
      message: 'Application marked as submitted in your application tracker.',
      status: 'applied',
      applicationUrl: jobUrl,
      application: app
    };
  }
}

module.exports = ApplicationAgent;
