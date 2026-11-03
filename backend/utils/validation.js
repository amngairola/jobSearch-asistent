const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Resume schema — supports flat skills, categorized skills, cgpa, achievements
const resumeSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    designation: { type: ['string', 'null'] },
    skills: { type: 'array', items: { type: 'string' } },
    skillsByCategory: {
      type: 'object',
      properties: {
        languages: { type: 'array', items: { type: 'string' } },
        frameworks: { type: 'array', items: { type: 'string' } },
        developerTools: { type: 'array', items: { type: 'string' } },
        librariesAndDatabases: { type: 'array', items: { type: 'string' } },
        other: { type: 'array', items: { type: 'string' } }
      },
      additionalProperties: true
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          role: { type: 'string' },
          duration: { type: ['string', 'null'] },
          startDate: { type: ['string', 'null'] },
          endDate: { type: ['string', 'null'] },
          achievements: { type: 'array', items: { type: 'string' } },
          description: { type: ['string', 'null'] }
        },
        additionalProperties: true
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          degree: { type: 'string' },
          institution: { type: 'string' },
          dates: { type: ['string', 'null'] },
          year: { type: ['string', 'null'] },
          cgpa: { type: ['string', 'null'] }
        },
        additionalProperties: true
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          description: { type: ['string', 'null'] }
        },
        additionalProperties: true
      }
    },
    certifications: { type: 'array', items: { type: ['object', 'string'] } }
  },
  required: ['name'],
  additionalProperties: true
};

// Normalized Job schema matching user specification:
// id, title, company, location, employmentType, experienceLevel, salary, description, responsibilities, requirements, skills, applicationUrl, sourceUrl, source, publishedDate
const jobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    employmentType: { type: ['string', 'null'] },
    experienceLevel: { type: ['string', 'null'] },
    salary: { type: ['string', 'null'] },
    description: { type: 'string' },
    responsibilities: { type: 'array', items: { type: 'string' } },
    requirements: { type: 'array', items: { type: 'string' } },
    skills: { type: 'array', items: { type: 'string' } },
    applicationUrl: { type: 'string' },
    sourceUrl: { type: 'string' },
    source: { type: 'string' },
    publishedDate: { type: ['string', 'null'] }
  },
  required: ['id', 'title', 'company'],
  additionalProperties: true
};

// Application record schema
const applicationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sessionId: { type: 'string' },
    jobId: { type: 'string' },
    company: { type: 'string' },
    title: { type: 'string' },
    url: { type: 'string' },
    appliedDate: { type: 'string' },
    status: { type: 'string', enum: ['saved', 'interested', 'prepared', 'pending', 'applied', 'submitted', 'interview', 'rejected', 'offer', 'failed'] },
    coverLetter: { type: 'string' }
  },
  required: ['id', 'sessionId', 'jobId', 'title', 'status'],
  additionalProperties: true
};

module.exports = {
  validateResume: ajv.compile(resumeSchema),
  validateJob: ajv.compile(jobSchema),
  validateApplication: ajv.compile(applicationSchema)
};
