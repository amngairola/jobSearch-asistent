const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const fileStore = require('../utils/fileStore');
const { getGroqClient } = require('../utils/groqClient');
const { verifyUrlReachability, classifyApplicationUrl } = require('../utils/urlHelper');
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

  /** Helper to infer experience level from title and text */
  static inferExperienceLevel(titleText, snippet = '') {
    const combined = `${titleText} ${snippet}`.toLowerCase();
    if (combined.includes('internship') || combined.includes('intern') || combined.includes('trainee')) {
      return 'Internship';
    }
    if (
      combined.includes('fresher') ||
      combined.includes('entry-level') ||
      combined.includes('entry level') ||
      combined.includes('junior') ||
      combined.includes('jr.') ||
      combined.includes('jr ') ||
      combined.includes('associate') ||
      combined.includes('graduate') ||
      combined.includes('0-1 year') ||
      combined.includes('0 to 1 year')
    ) {
      return 'Entry-level';
    }
    if (
      combined.includes('senior') ||
      combined.includes('sr.') ||
      combined.includes('sr ') ||
      combined.includes('lead') ||
      combined.includes('principal') ||
      combined.includes('staff') ||
      combined.includes('architect') ||
      combined.includes('director') ||
      combined.includes('head of')
    ) {
      return 'Senior';
    }
    if (combined.includes('mid') || combined.includes('intermediate')) {
      return 'Mid-level';
    }
    return null;
  }

  /** Fetch structured jobs from Greenhouse with Cheerio HTML cleaning and role filtering */
  async _fetchGreenhouseJobs(slug, queryTokens = [], isFresher = false) {
    try {
      const ghUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
      const { data } = await axios.get(ghUrl, { timeout: 8000 });
      if (!data || !Array.isArray(data.jobs)) return [];

      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      // Filter jobs by query relevance so unrelated company jobs (e.g. Sales, Legal) aren't dumped into results
      const relevantJobs = data.jobs.filter(job => {
        const titleLower = (job.title || '').toLowerCase();
        // If fresher requested, exclude senior positions
        if (isFresher && /\b(senior|sr\b|lead|principal|staff|architect|director|vp|head of)\b/i.test(titleLower)) {
          return false;
        }
        // If query tokens present, must match at least one relevant token or general software roles
        if (queryTokens.length > 0) {
          const matchesToken = queryTokens.some(t => titleLower.includes(t));
          const isTechRole = /\b(developer|engineer|software|frontend|backend|fullstack|full stack|web|programmer|coder|tech)\b/i.test(titleLower);
          return matchesToken || isTechRole;
        }
        return true;
      });

      return relevantJobs.slice(0, 8).map(job => {
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

        const expLevel = JobSearchAgent.inferExperienceLevel(job.title, cleanDesc);

        return {
          id: uuidv4(),
          title: cleanJobTitle(job.title || 'Untitled'),
          company: companyName,
          location: (job.location && job.location.name) || 'Remote',
          employmentType: 'Full-time',
          experienceLevel: expLevel,
          salary: null,
          description: cleanDesc,
          responsibilities,
          requirements,
          skills,
          applicationUrl: job.absolute_url || `https://boards.greenhouse.io/${slug}`,
          sourceUrl: job.absolute_url || `https://boards.greenhouse.io/${slug}`,
          source: 'greenhouse',
          publishedDate: job.updated_at ? new Date(job.updated_at).toISOString() : null,
          verificationStatus: 'verified',
          lastVerifiedAt: new Date().toISOString()
        };
      });
    } catch (e) {
      return [];
    }
  }

  /** Fetch structured jobs from Lever with Cheerio HTML cleaning and role filtering */
  async _fetchLeverJobs(company, queryTokens = [], isFresher = false) {
    try {
      const leverUrl = `https://api.lever.co/v0/postings/${company}`;
      const { data } = await axios.get(leverUrl, { timeout: 8000 });
      if (!Array.isArray(data)) return [];

      const companyName = company.charAt(0).toUpperCase() + company.slice(1);

      const relevantJobs = data.filter(job => {
        const titleLower = (job.text || '').toLowerCase();
        if (isFresher && /\b(senior|sr\b|lead|principal|staff|architect|director|vp|head of)\b/i.test(titleLower)) {
          return false;
        }
        if (queryTokens.length > 0) {
          const matchesToken = queryTokens.some(t => titleLower.includes(t));
          const isTechRole = /\b(developer|engineer|software|frontend|backend|fullstack|full stack|web|programmer|tech)\b/i.test(titleLower);
          return matchesToken || isTechRole;
        }
        return true;
      });

      return relevantJobs.slice(0, 8).map(job => {
        const rawContent = job.descriptionPlain || job.description || '';
        const $ = cheerio.load(job.description || '');

        const responsibilities = [];
        const requirements = [];

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

        const expLevel = JobSearchAgent.inferExperienceLevel(job.text, cleanDesc);

        return {
          id: uuidv4(),
          title: cleanJobTitle(job.text || 'Untitled'),
          company: companyName,
          location: (job.categories && job.categories.location) || 'Remote',
          employmentType: (job.categories && job.categories.commitment) || 'Full-time',
          experienceLevel: expLevel,
          salary: null,
          description: cleanDesc,
          responsibilities,
          requirements,
          skills,
          applicationUrl: job.hostedUrl || `https://jobs.lever.co/${company}`,
          sourceUrl: job.hostedUrl || `https://jobs.lever.co/${company}`,
          source: 'lever',
          publishedDate: job.createdAt ? new Date(job.createdAt).toISOString() : null,
          verificationStatus: 'verified',
          lastVerifiedAt: new Date().toISOString()
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

    // Clean tracking query parameters from URL
    let cleanAppUrl = result.url || '';
    try {
      const u = new URL(cleanAppUrl);
      const paramsToDelete = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'gh_src', 'src'];
      paramsToDelete.forEach(p => u.searchParams.delete(p));
      cleanAppUrl = u.toString();
    } catch (_) {}

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
    const experienceLevel = JobSearchAgent.inferExperienceLevel(title, cleanText);

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
      applicationUrl: cleanAppUrl,
      sourceUrl: result.url,
      source: 'tavily',
      publishedDate: result.published_date || null,
      verificationStatus: 'unverified',
      lastVerifiedAt: null
    };
  }

  /** Deduplicate jobs by URL and title+company */
  _dedupe(jobs) {
    const seenUrls = new Set();
    const seenPairs = new Set();

    return jobs.filter(job => {
      // Normalize URL (strip tracking params and trailing slash)
      let normUrl = (job.applicationUrl || '').replace(/\/+$/, '');
      try {
        const u = new URL(job.applicationUrl);
        normUrl = `${u.origin}${u.pathname}`.replace(/\/+$/, '');
      } catch (_) {}

      const pairKey = `${job.title.toLowerCase().replace(/[^a-z0-9]/g, '')}:${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      if (seenUrls.has(normUrl) || seenPairs.has(pairKey)) {
        return false;
      }

      seenUrls.add(normUrl);
      seenPairs.add(pairKey);
      return true;
    });
  }

  /** Main search method with experience-aware query generation & parallel URL verification */
  async search(query, location = '', remote = false) {
    const lowerQuery = (query || '').toLowerCase();
    const isFresher = /\b(fresher|entry[\s-]level|junior|jr\b|graduate|intern|internship|trainee|0[\s-]*1\s*year|campus)\b/i.test(lowerQuery);
    const isIntern = /\b(intern|internship|trainee)\b/i.test(lowerQuery);
    const isSenior = /\b(senior|sr\b|lead|principal|staff|architect|director|head of)\b/i.test(lowerQuery);

    // Extract core query tokens for relevance matching on company boards
    const stopWords = new Set(['jobs', 'job', 'hiring', 'fresher', 'entry', 'level', 'junior', 'senior', 'role', 'roles', 'india', 'remote', 'in', 'for', 'at', 'with', 'and', 'the']);
    const queryTokens = lowerQuery
      .replace(/[^a-z0-9#+.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
    if (lowerQuery.includes('react')) queryTokens.push('react');
    if (lowerQuery.includes('node')) queryTokens.push('node');
    if (lowerQuery.includes('frontend')) queryTokens.push('frontend');
    if (lowerQuery.includes('backend')) queryTokens.push('backend');
    if (lowerQuery.includes('fullstack') || lowerQuery.includes('full stack')) queryTokens.push('full stack');

    // 1. Build targeted search queries
    let boardSearch = `("${query}") (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com)`;
    if (location) boardSearch += ` ${location}`;
    if (isFresher) boardSearch += ` (junior OR entry OR intern OR associate)`;

    let directSearch = `"${query}" job hiring`;
    if (location) directSearch += ` "${location}"`;
    if (remote) directSearch += ` "remote"`;

    if (isFresher) {
      directSearch += ` ("fresher" OR "entry level" OR "junior" OR "intern" OR "0-1 year") -intitle:"senior" -intitle:"lead" -intitle:"principal" -intitle:"director" -intitle:"jobs in" -intitle:"vacancies"`;
    } else if (isSenior) {
      directSearch += ` ("senior" OR "lead" OR "principal") -intitle:"intern" -intitle:"junior" -intitle:"jobs in" -intitle:"vacancies"`;
    } else {
      directSearch += ` -intitle:"jobs in" -intitle:"vacancies" -intitle:"reviews in" -intitle:"salaries in"`;
    }

    // Execute searches
    const [boardResults, directResults] = await Promise.all([
      this._tavilySearch(boardSearch, 6),
      this._tavilySearch(directSearch, 10)
    ]);

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
            const ghJobs = await this._fetchGreenhouseJobs(slug, queryTokens, isFresher);
            structuredJobs.push(...ghJobs);
          }
        } else if (url.includes('lever.co')) {
          const comp = this._extractLeverCompany(url);
          if (comp && !slugsSeen.has(`lv:${comp}`)) {
            slugsSeen.add(`lv:${comp}`);
            const leverJobs = await this._fetchLeverJobs(comp, queryTokens, isFresher);
            structuredJobs.push(...leverJobs);
          }
        }
      } catch (e) {
        console.warn(`Structured ATS fetch error for ${url}:`, e.message);
      }
    }

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

    // Combine candidate jobs
    const candidateJobs = this._dedupe([...cleanTavilyJobs, ...structuredJobs]);

    // 2. Perform parallel URL verification to identify active, reachable links vs expired/broken
    const verifiedJobs = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < candidateJobs.length; i += BATCH_SIZE) {
      const batch = candidateJobs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (job) => {
        // Direct API jobs from Greenhouse/Lever boards are already verified active
        if (job.source === 'greenhouse' || job.source === 'lever') {
          job.verificationStatus = 'verified';
          job.lastVerifiedAt = new Date().toISOString();
          verifiedJobs.push(job);
          return;
        }

        try {
          const check = await verifyUrlReachability(job.applicationUrl, 2500);
          job.verificationStatus = check.verificationStatus;
          job.lastVerifiedAt = check.lastVerifiedAt;
          if (check.destinationUrl) {
            job.applicationUrl = check.destinationUrl;
          }

          // Discard expired (404, 410, redirect to search index) and invalid links
          if (job.verificationStatus !== 'expired' && job.verificationStatus !== 'invalid') {
            verifiedJobs.push(job);
          }
        } catch (_) {
          // In case of transient verification error, retain as unverified rather than dropping
          job.verificationStatus = 'unverified';
          job.lastVerifiedAt = new Date().toISOString();
          verifiedJobs.push(job);
        }
      }));
    }

    // 3. Strict experience level matching: filter out senior roles if fresher/intern requested
    let finalJobs = verifiedJobs;
    if (isFresher) {
      finalJobs = finalJobs.filter(job => {
        const titleLower = (job.title || '').toLowerCase();
        const isSeniorTitle = /\b(senior|sr\b|lead|principal|staff|architect|director|vp|head of)\b/i.test(titleLower);
        return !isSeniorTitle && job.experienceLevel !== 'Senior';
      });
    } else if (isIntern) {
      finalJobs.sort((a, b) => (b.employmentType === 'Internship' ? 1 : 0) - (a.employmentType === 'Internship' ? 1 : 0));
    }

    // Deduplicate once more after URL redirects
    const finalCleanJobs = this._dedupe(finalJobs);

    // Persist latest jobs to storage
    fileStore.upsert('jobs', { id: 'latest', data: finalCleanJobs });

    console.log(`[JobSearch] Discovered ${finalCleanJobs.length} active/verified listings for query "${query}" (${structuredJobs.length} direct ATS, ${cleanTavilyJobs.length} web candidates verified)`);
    return finalCleanJobs;
  }
}

JobSearchAgent.cleanRawJobSnippet = cleanRawJobSnippet;
JobSearchAgent.isIndividualJobListing = isIndividualJobListing;
JobSearchAgent.cleanCompanyName = cleanCompanyName;
JobSearchAgent.cleanJobTitle = cleanJobTitle;
JobSearchAgent.extractSkillsFromText = extractSkillsFromText;
JobSearchAgent.inferExperienceLevel = JobSearchAgent.inferExperienceLevel;

module.exports = JobSearchAgent;
