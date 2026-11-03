const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const fileStore = require('../utils/fileStore');
const { getGroqClient } = require('../utils/groqClient');
require('dotenv').config();

/**
 * Deterministic cleaning helper for job snippets.
 * Strips boilerplate artifacts, social shares, ad text, and extracts inline salary/location.
 */
function cleanRawJobSnippet(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { cleanText: '', salary: null, location: null };
  }

  let text = rawText;

  // 1. Extract salary if present
  let salary = null;
  const salaryMatch = text.match(/(?:PAY RANGE|Salary|Compensation)[\s:#]*([$₹€£][\d,]+(?:\s*-\s*[$₹€£]?[\d,]+)?(?:\s*(?:USD|INR|EUR|GBP))?(?:\s*\/\s*(?:year|yr|annual|month|mo|hr|hour))?)/i);
  if (salaryMatch) {
    salary = salaryMatch[1].trim();
  }

  // 2. Extract location if embedded in header
  let location = null;
  const locMatch = text.match(/(?:#####\s*)?LOCATION[\s:#]*([A-Za-z\s,]+?(?=\s*(?:#####|Share|Full-time|Part-time|\.|$)))/i);
  if (locMatch) {
    location = locMatch[1].replace(/Openings available to job seekers in /i, '').trim();
  }

  // 3. Remove known Markdown header & banner artifacts
  text = text.replace(/#{1,6}\s*(?:Details|Overview|About the role|Job Description|Requirements|Responsibilities)\s*#{0,6}/gi, ' ');
  text = text.replace(/#{1,6}\s*PAY RANGE[^\n#]+#{0,6}/gi, ' ');
  text = text.replace(/PAY RANGE\s*[$₹€£][\d,]+[^\n#]+/gi, ' ');
  text = text.replace(/#{1,6}\s*LOCATION[^\n#]+#{0,6}/gi, ' ');
  text = text.replace(/LOCATION\s*Openings available[^\n#]+/gi, ' ');
  text = text.replace(/(?:#+\s*)?Share(?:\s*#+\s*Share)*/gi, ' ');
  text = text.replace(/\bShare on (?:LinkedIn|Facebook|Twitter|X|Email)\b/gi, ' ');
  text = text.replace(/\[\.\.\.\]/g, ' ');
  text = text.replace(/\bAPPLY NOW\b/gi, ' ');
  text = text.replace(/\bApply (?:Now|Online|Today)\b/gi, ' ');
  text = text.replace(/\bSign in to apply\b/gi, ' ');
  text = text.replace(/\bEasy Apply\b/gi, ' ');
  text = text.replace(/\bEarn up t(?:o)?\b/gi, ' ');
  text = text.replace(/Boost your creativity by developing interactive user interfaces and web applications quickly and efficiently\.?/gi, ' ');
  text = text.replace(/Work full-time \(\d+\s*hours\/week\)/gi, ' ');

  // 4. Normalize excessive spaces and clean dangling punctuation
  text = text.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

  return { cleanText: text, salary, location };
}

/**
 * Filter out generic aggregator search results, job board landing pages, and directories.
 */
function isIndividualJobListing(title, url, snippet = '') {
  const t = (title || '').toLowerCase();
  const u = (url || '').toLowerCase();
  const s = (snippet || '').toLowerCase();

  // Rejection patterns for aggregate directories
  const aggregatorPatterns = [
    /\b\d+[\d,]*\+?\s+(?:[a-z0-9\s-]{0,35})?\s*(?:jobs|openings|vacancies|positions)\b/i,
    /\b(?:search results|browse jobs|job search engine|job alert|salaries in|reviews in)\b/i,
    /\b(?:best \d+ jobs|top \d+ jobs|find jobs on)\b/i,
    /\b(?:trending searches|create job alert|sign in to view|openings available to job seekers)\b/i,
    /\b[a-z0-9\s-]{2,30}\s+jobs\s+in\s+[a-z\s]+(?:[-|–]|\d{4}|$)/i
  ];

  for (const pattern of aggregatorPatterns) {
    if (pattern.test(t)) return false;
  }

  // Check URL patterns that indicate search results, directories, or aggregator searches
  if (
    u.includes('/jobs?q=') ||
    u.includes('/search?') ||
    u.includes('/explore/jobs') ||
    u.includes('/job-search') ||
    u.includes('wellfound.com/role/') ||
    (u.includes('naukri.com/') && !u.includes('-job-')) ||
    (u.includes('glassdoor') && (u.includes('-srch_') || u.includes('/job/'))) ||
    (u.includes('indeed') && (u.includes('/jobs?q=') || u.includes('/q-'))) ||
    u.includes('linkedin.com/jobs/search') ||
    u.includes('reddit.com') ||
    u.includes('quora.com') ||
    u.includes('medium.com') ||
    u.includes('dev.to') ||
    u.includes('youtube.com')
  ) {
    return false;
  }

  // Must have a minimum substantive title and not be a forum question
  if (
    !t ||
    t.length < 3 ||
    t === 'untitled' ||
    t.includes('job opportunity') ||
    t.startsWith('apply for jobs') ||
    t.startsWith('can i ') ||
    t.startsWith('how to ') ||
    t.startsWith('is it possible') ||
    t.endsWith('?')
  ) {
    return false;
  }

  return true;
}

/**
 * Extract clean company name from URL or title
 */
function cleanCompanyName(rawCompany, url, title) {
  if (rawCompany && rawCompany !== 'Unknown Company' && rawCompany.length > 1) {
    return rawCompany.replace(/\s*[-|–]\s*(?:Careers|Jobs|Glassdoor|Indeed|LinkedIn).*/i, '').trim();
  }

  // Check URL pathname for Greenhouse or Lever (e.g., boards.greenhouse.io/techcorp/jobs/...)
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('greenhouse.io') || parsedUrl.hostname.includes('lever.co')) {
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0] !== 'jobs') {
        return parts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  } catch {}

  // Try extracting from title (e.g. "React Developer at Acme Corp" or "Acme Corp - Senior Engineer")
  const atMatch = title.match(/(?:at|@)\s+([A-Za-z0-9&.\s]{2,30})(?:\s*[-|(]|$)/i);
  if (atMatch) return atMatch[1].trim();

  // Only consider dashMatch if prefix is not a typical job title
  const dashMatch = title.match(/^([A-Za-z0-9&.\s]{2,30})\s*[-|–]\s*[A-Z]/);
  if (dashMatch) {
    const prefix = dashMatch[1].trim().toLowerCase();
    const commonTitleWords = ['senior', 'junior', 'lead', 'staff', 'principal', 'software', 'frontend', 'backend', 'full stack', 'developer', 'engineer'];
    const isJobTitle = commonTitleWords.some(w => prefix.includes(w));
    if (!isJobTitle) {
      return dashMatch[1].trim();
    }
  }

  // Extract from hostname
  try {
    const hostname = new URL(url).hostname;
    return hostname
      .replace(/^(?:www|jobs|careers|boards|apply)\./i, '')
      .replace(/\.(?:com|io|co|org|net|jobs|ai|app)$/i, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  } catch {
    return 'Company';
  }
}

/**
 * Clean Job Title
 */
function cleanJobTitle(title) {
  return title
    .replace(/\s*[-|–]\s*(?:Glassdoor|Indeed|LinkedIn|Careers|Greenhouse|Lever|Remote).*$/i, '')
    .replace(/\s*at\s+[A-Za-z0-9&.\s]{2,30}$/i, '')
    .replace(/\s*\([^)]*job[^)]*\)/gi, '')
    .trim();
}

/**
 * Extract technical skills from text using vocabulary matching
 */
function extractSkillsFromText(text) {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'React', 'React.js', 'Next.js', 'Node.js', 'Express',
    'Python', 'Django', 'Flask', 'Java', 'Spring', 'C#', '.NET', 'Go', 'Golang', 'Rust',
    'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind CSS', 'Bootstrap', 'Sass', 'Redux',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'RESTful',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GitHub',
    'Microservices', 'Jest', 'Cypress', 'Webpack', 'Vite', 'Linux'
  ];

  const lower = text.toLowerCase();
  const matched = [];

  for (const skill of commonSkills) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,.;:/()])${escaped}(?:$|[\\s,.;:/()])`, 'i');
    if (regex.test(lower)) {
      matched.push(skill);
    }
  }

  return Array.from(new Set(matched));
}

/**
 * JobSearchAgent performs high-accuracy job discovery with structured normalization.
 */
class JobSearchAgent {
  constructor() {
    this.tavilyKey = process.env.TAVILY_API_KEY;
    if (!this.tavilyKey) {
      throw new Error('TAVILY_API_KEY is required for job search');
    }
    this.groq = getGroqClient();
  }

  /** Perform a Tavily web search */
  async _tavilySearch(query, maxResults = 10) {
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyKey,
        query,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      });
      return response.data.results || [];
    } catch (e) {
      console.error('Tavily search error:', e.message);
      return [];
    }
  }

  _extractGreenhouseSlug(url) {
    const match = url.match(/https?:\/\/boards\.greenhouse\.io\/([^/?#]+)/i);
    return match ? match[1] : null;
  }

  _extractLeverCompany(url) {
    const match = url.match(/https?:\/\/jobs\.lever\.co\/([^/?#]+)/i);
    return match ? match[1] : null;
  }

  /** Fetch structured jobs from Greenhouse with Cheerio HTML cleaning */
  async _fetchGreenhouseJobs(slug) {
    try {
      const ghUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
      const { data } = await axios.get(ghUrl, { timeout: 10000 });
      if (!data || !Array.isArray(data.jobs)) return [];

      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      return data.jobs.slice(0, 10).map(job => {
        // Parse HTML content using Cheerio
        const $ = cheerio.load(job.content || '');
        const paragraphs = [];
        $('p').each((_, el) => {
          const t = $(el).text().trim();
          if (t.length > 20) paragraphs.push(t);
        });

        const listItems = [];
        $('li').each((_, el) => {
          const t = $(el).text().trim();
          if (t.length > 10 && t.length < 250) listItems.push(t);
        });

        const fullText = $.text();
        const skills = extractSkillsFromText(fullText);

        const responsibilities = listItems.slice(0, 4);
        const requirements = listItems.slice(4, 9);

        const cleanDesc = paragraphs.slice(0, 2).join(' ') ||
          `Open position for ${job.title} at ${companyName}. Explore requirements and responsibilities below.`;

        return {
          id: uuidv4(),
          title: cleanJobTitle(job.title || 'Untitled'),
          company: companyName,
          location: (job.location && job.location.name) || 'Remote',
          employmentType: 'Full-time',
          experienceLevel: null,
          salary: null,
          description: cleanDesc,
          responsibilities,
          requirements,
          skills,
          applicationUrl: job.absolute_url || `https://boards.greenhouse.io/${slug}`,
          sourceUrl: job.absolute_url || `https://boards.greenhouse.io/${slug}`,
          source: 'greenhouse',
          publishedDate: job.updated_at ? new Date(job.updated_at).toISOString() : null
        };
      });
    } catch (e) {
      return [];
    }
  }

  /** Fetch structured jobs from Lever with Cheerio HTML cleaning */
  async _fetchLeverJobs(company) {
    try {
      const leverUrl = `https://api.lever.co/v0/postings/${company}`;
      const { data } = await axios.get(leverUrl, { timeout: 10000 });
      if (!Array.isArray(data)) return [];

      const companyName = company.charAt(0).toUpperCase() + company.slice(1);

      return data.slice(0, 10).map(job => {
        const rawContent = job.descriptionPlain || job.description || '';
        const $ = cheerio.load(job.description || '');

        const responsibilities = [];
        const requirements = [];

        // Lever lists
        $('li').each((i, el) => {
          const t = $(el).text().trim();
          if (t.length > 10 && t.length < 250) {
            if (i < 4) responsibilities.push(t);
            else if (requirements.length < 5) requirements.push(t);
          }
        });

        const fullText = rawContent || $.text();
        const skills = extractSkillsFromText(fullText);

        const cleanDesc = rawContent.split('\n').filter(p => p.trim().length > 30).slice(0, 2).join(' ') ||
          `Exciting role for a ${job.text} joining the team at ${companyName}.`;

        return {
          id: uuidv4(),
          title: cleanJobTitle(job.text || 'Untitled'),
          company: companyName,
          location: (job.categories && job.categories.location) || 'Remote',
          employmentType: (job.categories && job.categories.commitment) || 'Full-time',
          experienceLevel: null,
          salary: null,
          description: cleanDesc,
          responsibilities,
          requirements,
          skills,
          applicationUrl: job.hostedUrl || `https://jobs.lever.co/${company}`,
          sourceUrl: job.hostedUrl || `https://jobs.lever.co/${company}`,
          source: 'lever',
          publishedDate: job.createdAt ? new Date(job.createdAt).toISOString() : null
        };
      });
    } catch (e) {
      return [];
    }
  }

  /**
   * Structure a messy Tavily search result using deterministic extraction & cleaning.
   * Ensures the exact required output schema without raw Markdown artifacts.
   */
  _structureTavilyResult(result) {
    const rawSnippet = result.content || result.snippet || '';
    const { cleanText, salary, location: inlineLoc } = cleanRawJobSnippet(rawSnippet);

    const rawTitle = result.title || '';
    const company = cleanCompanyName('', result.url, rawTitle);
    const title = cleanJobTitle(rawTitle);
    const skills = extractSkillsFromText(`${title} ${cleanText}`);

    // Break cleanText into sentences for requirements and description
    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);

    // Identify requirements (sentences containing experience, degree, skills, must, require)
    const reqSentences = [];
    const descSentences = [];
    const respSentences = [];

    for (const s of sentences) {
      const lower = s.toLowerCase();
      if (lower.includes('degree') || lower.includes('experience') || lower.includes('require') || lower.includes('must have') || lower.includes('knowledge of') || lower.includes('proficien')) {
        if (reqSentences.length < 5) reqSentences.push(s.trim());
      } else if (lower.includes('build') || lower.includes('develop') || lower.includes('collaborate') || lower.includes('lead') || lower.includes('responsible') || lower.includes('create')) {
        if (respSentences.length < 4) respSentences.push(s.trim());
      } else {
        if (descSentences.length < 3) descSentences.push(s.trim());
      }
    }

    // Build readable description
    let description = descSentences.join(' ');
    if (description.length < 30) {
      description = `Opportunity for a ${title} at ${company}. Explore responsibilities, requirements, and required skills below.`;
    }

    // Infer experience level
    let experienceLevel = null;
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('senior') || lowerTitle.includes('sr') || lowerTitle.includes('lead') || lowerTitle.includes('principal')) {
      experienceLevel = 'Senior';
    } else if (lowerTitle.includes('junior') || lowerTitle.includes('jr') || lowerTitle.includes('entry') || lowerTitle.includes('intern')) {
      experienceLevel = 'Entry-level';
    } else if (lowerTitle.includes('mid') || lowerTitle.includes('intermediate')) {
      experienceLevel = 'Mid-level';
    }

    // Infer employment type
    let employmentType = 'Full-time';
    const lowerAll = `${title} ${cleanText}`.toLowerCase();
    if (lowerAll.includes('internship') || lowerAll.includes('intern')) employmentType = 'Internship';
    else if (lowerAll.includes('part-time') || lowerAll.includes('part time')) employmentType = 'Part-time';
    else if (lowerAll.includes('contract')) employmentType = 'Contract';

    // Location
    let location = inlineLoc || 'Remote / Unspecified';
    if (lowerAll.includes('remote') || lowerAll.includes('work from home')) {
      location = inlineLoc ? `${inlineLoc} (Remote)` : 'Remote';
    }

    return {
      id: uuidv4(),
      title,
      company,
      location,
      employmentType,
      experienceLevel,
      salary: salary || null,
      description,
      responsibilities: respSentences,
      requirements: reqSentences,
      skills,
      applicationUrl: result.url,
      sourceUrl: result.url,
      source: 'tavily',
      publishedDate: result.published_date || null
    };
  }

  /** Deduplicate jobs by URL and title+company */
  _dedupe(jobs) {
    const seenUrls = new Set();
    const seenPairs = new Set();

    return jobs.filter(job => {
      // Normalize URL (strip tracking params)
      let normUrl = job.applicationUrl;
      try {
        const u = new URL(job.applicationUrl);
        normUrl = `${u.origin}${u.pathname}`;
      } catch (_) {}

      const pairKey = `${job.title.toLowerCase().replace(/\s+/g, '')}:${job.company.toLowerCase().replace(/\s+/g, '')}`;

      if (seenUrls.has(normUrl) || seenPairs.has(pairKey)) {
        return false;
      }

      seenUrls.add(normUrl);
      seenPairs.add(pairKey);
      return true;
    });
  }

  /** Main search method */
  async search(query, location = '', remote = false) {
    // 1. Target individual job postings with search modifier
    let baseQuery = `${query}`;
    if (location) baseQuery += ` in ${location}`;
    if (remote) baseQuery += ' remote';

    // Targeted ATS search for high-fidelity structured boards
    const boardSearch = `("${query}") (site:boards.greenhouse.io OR site:jobs.lever.co) ${location ? location : ''}`;
    const boardResults = await this._tavilySearch(boardSearch, 6);

    const structuredJobs = [];
    const slugsSeen = new Set();

    for (const result of boardResults) {
      const url = result.url;
      if (!url) continue;

      try {
        if (url.includes('greenhouse.io')) {
          const slug = this._extractGreenhouseSlug(url);
          if (slug && !slugsSeen.has(`gh:${slug}`)) {
            slugsSeen.add(`gh:${slug}`);
            const ghJobs = await this._fetchGreenhouseJobs(slug);
            structuredJobs.push(...ghJobs);
          }
        } else if (url.includes('lever.co')) {
          const comp = this._extractLeverCompany(url);
          if (comp && !slugsSeen.has(`lv:${comp}`)) {
            slugsSeen.add(`lv:${comp}`);
            const leverJobs = await this._fetchLeverJobs(comp);
            structuredJobs.push(...leverJobs);
          }
        }
      } catch (e) {
        console.warn(`Structured ATS fetch error for ${url}:`, e.message);
      }
    }

    // Direct job postings search via Tavily
    const directSearch = `"${query}" job posting hiring ${location} -intitle:"202" -intitle:"jobs in" -intitle:"vacancies"`;
    const directResults = await this._tavilySearch(directSearch, 10);

    // Filter out aggregator pages & normalize individual listings
    const cleanTavilyJobs = [];
    for (const r of directResults) {
      if (!isIndividualJobListing(r.title || '', r.url || '', r.content || '')) {
        continue;
      }
      const structured = this._structureTavilyResult(r);
      // Validate that it has at least a meaningful title and description
      if (structured.title.length >= 3 && structured.description.length >= 20) {
        cleanTavilyJobs.push(structured);
      }
    }

    // Combine direct jobs matching user query/location first, then structured ATS board jobs
    const allJobs = this._dedupe([...cleanTavilyJobs, ...structuredJobs]);

    // Persist latest jobs to storage
    fileStore.upsert('jobs', { id: 'latest', data: allJobs });

    console.log(`[JobSearch] Discovered ${allJobs.length} verified individual listings for query "${query}" (${structuredJobs.length} ATS, ${cleanTavilyJobs.length} web)`);
    return allJobs;
  }
}

JobSearchAgent.cleanRawJobSnippet = cleanRawJobSnippet;
JobSearchAgent.isIndividualJobListing = isIndividualJobListing;
JobSearchAgent.cleanCompanyName = cleanCompanyName;
JobSearchAgent.cleanJobTitle = cleanJobTitle;
JobSearchAgent.extractSkillsFromText = extractSkillsFromText;

module.exports = JobSearchAgent;
