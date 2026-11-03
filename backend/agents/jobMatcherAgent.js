const fileStore = require('../utils/fileStore');

/**
 * JobMatcherAgent compares a parsed resume with clean structured jobs.
 * Scores on:
 * - Direct skill match against required job skills (45%)
 * - Requirements overlap (25%)
 * - Job title and domain alignment (15%)
 * - Location alignment (15%)
 */
class JobMatcherAgent {
  /**
   * Compute a match score for a single job against resume profile.
   */
  matchJob(resume, job) {
    const resumeSkills = (resume.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);
    const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim()).filter(Boolean);

    // Also look at requirements text for skills
    const reqText = (job.requirements || []).join(' ').toLowerCase();
    const descText = (job.description || '').toLowerCase();
    const titleText = (job.title || '').toLowerCase();

    // 1. Skill Overlap
    const matchingSkills = [];
    const missingSkills = [];

    // Check direct job skills
    for (const js of jobSkills) {
      if (resumeSkills.some(rs => rs === js || rs.includes(js) || js.includes(rs))) {
        matchingSkills.push(js);
      } else {
        missingSkills.push(js);
      }
    }

    // Also check if any resume skills appear in requirements
    for (const rs of resumeSkills) {
      if (reqText.includes(rs) || descText.includes(rs)) {
        if (!matchingSkills.includes(rs)) {
          matchingSkills.push(rs);
        }
      }
    }

    // Skill Score (0 - 45)
    let skillScore = 0;
    if (jobSkills.length > 0) {
      const matchRatio = matchingSkills.length / Math.max(jobSkills.length, 1);
      skillScore = Math.min(45, Math.round(matchRatio * 45));
    } else if (matchingSkills.length > 0) {
      skillScore = Math.min(45, matchingSkills.length * 9);
    }

    // 2. Title & Role Alignment (0 - 25)
    let titleScore = 0;
    const userRole = (resume.designation || '').toLowerCase();
    if (userRole) {
      const roleTokens = userRole.split(/\s+/).filter(w => w.length > 2);
      const matchedTokens = roleTokens.filter(t => titleText.includes(t));
      if (matchedTokens.length > 0) {
        titleScore = Math.round((matchedTokens.length / roleTokens.length) * 25);
      }
    } else {
      titleScore = 12; // neutral
    }

    // 3. Location Alignment (0 - 15)
    let locationScore = 0;
    const userLoc = (resume.location || '').toLowerCase();
    const jobLoc = (job.location || '').toLowerCase();
    if (jobLoc.includes('remote')) {
      locationScore = 15;
    } else if (userLoc && (jobLoc.includes(userLoc) || userLoc.includes(jobLoc))) {
      locationScore = 15;
    } else {
      locationScore = 5;
    }

    // 4. Experience & Requirements Match (0 - 15)
    let expScore = 0;
    if (resume.experience && resume.experience.length > 0) {
      expScore = 10;
      // Bonus if candidate has worked on technologies mentioned in requirements
      const expDetails = resume.experience.map(e => `${e.role || ''} ${e.company || ''} ${e.description || ''}`).join(' ').toLowerCase();
      const hits = matchingSkills.filter(s => expDetails.includes(s));
      if (hits.length > 0) expScore = 15;
    }

    const totalScore = Math.min(100, Math.max(10, Math.round(skillScore + titleScore + locationScore + expScore)));

    // Generate descriptive reason
    const reasonParts = [];
    if (matchingSkills.length > 0) {
      reasonParts.push(`Matches on skills: ${matchingSkills.slice(0, 4).join(', ')}`);
    }
    if (titleScore >= 18) {
      reasonParts.push(`Strong title alignment with ${job.title}`);
    }
    if (jobLoc.includes('remote') || locationScore === 15) {
      reasonParts.push(`Location is compatible (${job.location})`);
    }

    const reason = reasonParts.join(' · ') || 'Relevant software engineering opportunity';

    let recommendation;
    if (totalScore >= 70) recommendation = 'High Match – Strongly recommended to apply';
    else if (totalScore >= 45) recommendation = 'Good Match – Meets core profile skills';
    else recommendation = 'Potential Match – Review missing requirements';

    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      score: totalScore,
      matchingSkills: Array.from(new Set(matchingSkills)),
      missingSkills: Array.from(new Set(missingSkills)),
      reason,
      recommendation
    };
  }

  /**
   * Match a resume against an array of jobs.
   */
  match(resume, jobIds = null) {
    const latest = fileStore.findOne('jobs', d => d.id === 'latest');
    const allJobs = (latest && latest.data) || [];
    const jobsToMatch = jobIds ? allJobs.filter(j => jobIds.includes(j.id)) : allJobs;
    const matches = jobsToMatch.map(job => this.matchJob(resume, job));
    return matches.sort((a, b) => b.score - a.score);
  }
}

module.exports = JobMatcherAgent;
