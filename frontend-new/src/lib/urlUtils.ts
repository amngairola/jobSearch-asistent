export interface UrlClassification {
  isValid: boolean;
  isDirectPortal: boolean;
  type: 'official_ats' | 'third_party' | 'company_direct' | 'invalid';
  badge: string;
  label: string;
  warning: string | null;
  domain: string;
}

export function isValidUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.startsWith('javascript:')) return false;

  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function classifyUrl(url?: string | null): UrlClassification {
  if (!isValidUrl(url)) {
    return {
      isValid: false,
      isDirectPortal: false,
      type: 'invalid',
      badge: 'Invalid Link',
      label: 'Invalid or Missing Link',
      warning: 'This job listing does not have a valid application link.',
      domain: ''
    };
  }

  const parsed = new URL(url!.trim());
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
      badge: 'Third-Party Job Listing',
      label: 'Third-Party Job Board Listing',
      warning: 'This link is hosted on a third-party job board rather than a direct company career portal.',
      domain: hostname
    };
  }

  return {
    isValid: true,
    isDirectPortal: true,
    type: 'company_direct',
    badge: 'Company Career Website',
    label: 'Company Career Page',
    warning: null,
    domain: hostname
  };
}
