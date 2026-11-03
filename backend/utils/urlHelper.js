/**
 * Utility functions for validating and classifying job application URLs.
 */

function isValidUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (trimmed === '' || trimmed === '#' || trimmed.startsWith('javascript:')) return false;

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function classifyApplicationUrl(urlString) {
  if (!isValidUrl(urlString)) {
    return {
      isValid: false,
      isDirectPortal: false,
      type: 'invalid',
      badge: 'Invalid URL',
      label: 'Invalid or Missing Link',
      warning: 'This job listing does not have a valid web address.',
      domain: ''
    };
  }

  const parsed = new URL(urlString.trim());
  const hostname = parsed.hostname.toLowerCase();

  // Known aggregators and third-party job boards
  const thirdPartyDomains = [
    'linkedin.com', 'indeed.com', 'glassdoor.com', 'glassdoor.co.in',
    'naukri.com', 'instahyre.com', 'foundit.in', 'monster.com',
    'shine.com', 'upwork.com', 'freelancer.com', 'fiverr.com',
    'ziprecruiter.com', 'simplyhired.com', 'careerbuilder.com',
    'iitjobs.com', 'freshersworld.com', 'internshala.com', 'wellfound.com'
  ];

  const isThirdParty = thirdPartyDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

  // Direct ATS portals
  const directAtsDomains = [
    'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com',
    'smartrecruiters.com', 'workable.com', 'bamboohr.com', 'icims.com',
    'taleo.net', 'jobvite.com', 'breezy.hr', 'recruitee.com'
  ];

  const isDirectAts = directAtsDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

  if (isDirectAts) {
    return {
      isValid: true,
      isDirectPortal: true,
      type: 'official_ats',
      badge: 'Official ATS Portal',
      label: 'Official Company Application Portal',
      warning: null,
      domain: hostname
    };
  }

  if (isThirdParty) {
    return {
      isValid: true,
      isDirectPortal: false,
      type: 'third_party',
      badge: 'Third-Party Listing',
      label: 'Third-Party Job Board Listing',
      warning: 'This link opens a third-party job board listing rather than a direct company career portal.',
      domain: hostname
    };
  }

  return {
    isValid: true,
    isDirectPortal: true,
    type: 'company_direct',
    badge: 'Direct Company Career Page',
    label: 'Company Career Page',
    warning: null,
    domain: hostname
  };
}

module.exports = {
  isValidUrl,
  classifyApplicationUrl
};
