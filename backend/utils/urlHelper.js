const axios = require('axios');

/**
 * Utility functions for validating, classifying, and verifying job application URLs.
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
    'iitjobs.com', 'freshersworld.com', 'internshala.com', 'wellfound.com',
    'cutshort.io', 'hirist.tech', 'cuvette.tech', 'unstop.com'
  ];

  const isThirdParty = thirdPartyDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));

  // Direct ATS portals
  const directAtsDomains = [
    'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com',
    'smartrecruiters.com', 'workable.com', 'bamboohr.com', 'icims.com',
    'taleo.net', 'jobvite.com', 'breezy.hr', 'recruitee.com',
    'pinpointhq.com', 'rippling.com', 'polymer.co'
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

/**
 * Robust asynchronous URL reachability and expiration verifier.
 * Checks HTTP status and redirect targets with strict timeouts.
 * Does NOT classify Cloudflare / anti-bot 403 as expired.
 */
async function verifyUrlReachability(urlString, timeoutMs = 2500) {
  if (!isValidUrl(urlString)) {
    return {
      verificationStatus: 'invalid',
      destinationUrl: null,
      lastVerifiedAt: new Date().toISOString(),
      reason: 'Malformed or non-HTTP URL'
    };
  }

  const cleanUrl = urlString.trim();
  const lowerUrl = cleanUrl.toLowerCase();

  // Known inactive URL patterns
  if (
    lowerUrl.includes('/expired') ||
    lowerUrl.includes('/job-not-found') ||
    lowerUrl.includes('/job-closed') ||
    lowerUrl.includes('/inactive-job') ||
    lowerUrl.includes('/error404')
  ) {
    return {
      verificationStatus: 'expired',
      destinationUrl: cleanUrl,
      lastVerifiedAt: new Date().toISOString(),
      reason: 'URL indicates closed or expired position'
    };
  }

  try {
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: timeoutMs,
      maxRedirects: 4,
      validateStatus: () => true // Catch all statuses without throwing
    });

    const status = response.status;
    const finalUrl = (response.request && response.request.res && response.request.res.responseUrl) || cleanUrl;
    const lowerFinal = finalUrl.toLowerCase();

    // Obvious expired HTTP codes
    if (status === 404 || status === 410) {
      return {
        verificationStatus: 'expired',
        destinationUrl: finalUrl,
        lastVerifiedAt: new Date().toISOString(),
        reason: `HTTP ${status} Not Found`
      };
    }

    // Detected redirects to search indexes or expired pages
    if (
      lowerFinal.includes('/jobs?q=') ||
      lowerFinal.includes('/search?') ||
      lowerFinal.includes('/job-search') ||
      lowerFinal.includes('/expired') ||
      lowerFinal.includes('/job-not-found') ||
      lowerFinal.includes('/job_closed')
    ) {
      return {
        verificationStatus: 'expired',
        destinationUrl: finalUrl,
        lastVerifiedAt: new Date().toISOString(),
        reason: 'Redirected to generic search or expired listing'
      };
    }

    // Check HTML snippet for closed indicators if status is 200
    if (status >= 200 && status < 300 && typeof response.data === 'string') {
      const lowerBody = response.data.toLowerCase();
      if (
        (lowerBody.includes('this job has expired') ||
         lowerBody.includes('position has been filled') ||
         lowerBody.includes('job is no longer available') ||
         lowerBody.includes('this vacancy is closed')) &&
        !lowerBody.includes('apply now') &&
        !lowerBody.includes('submit application')
      ) {
        return {
          verificationStatus: 'expired',
          destinationUrl: finalUrl,
          lastVerifiedAt: new Date().toISOString(),
          reason: 'Posting indicates vacancy is closed or filled'
        };
      }

      return {
        verificationStatus: 'verified',
        destinationUrl: finalUrl,
        lastVerifiedAt: new Date().toISOString(),
        reason: 'Confirmed active and reachable'
      };
    }

    // Anti-bot or auth requirements (e.g. 403, 401, 429) -> keep as unverified, do not discard
    if (status === 403 || status === 401 || status === 429) {
      return {
        verificationStatus: 'unverified',
        destinationUrl: finalUrl,
        lastVerifiedAt: new Date().toISOString(),
        reason: `Protected portal (HTTP ${status})`
      };
    }

    return {
      verificationStatus: 'unverified',
      destinationUrl: finalUrl,
      lastVerifiedAt: new Date().toISOString(),
      reason: `HTTP ${status}`
    };
  } catch (err) {
    // Timeout or DNS error -> treat as unverified rather than expired to avoid false positives
    return {
      verificationStatus: 'unverified',
      destinationUrl: cleanUrl,
      lastVerifiedAt: new Date().toISOString(),
      reason: err.code === 'ECONNABORTED' ? 'Verification timeout' : 'Reachable check blocked'
    };
  }
}

module.exports = {
  isValidUrl,
  classifyApplicationUrl,
  verifyUrlReachability
};
