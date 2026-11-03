const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000';
const RESUME_PATH = 'C:\\Users\\AMAN\\Desktop\\AmanGairola_fullStack_Resume.pdf';

async function runManualQualityCheck() {
  console.log('================================================================');
  console.log('🔍 FINAL QUALITY AUDIT: ACTUAL RESUME & LIVE JOB SEARCH PIPELINE');
  console.log('================================================================\n');

  // Verify file existence
  if (!fs.existsSync(RESUME_PATH)) {
    throw new Error(`Resume file not found at ${RESUME_PATH}`);
  }
  const stats = fs.statSync(RESUME_PATH);
  console.log(`[Step 1] Loading user resume: ${RESUME_PATH} (${stats.size} bytes)`);

  // 1. Upload actual resume
  const sessionId = 'audit-session-' + Date.now();
  const form = new FormData();
  form.append('resume', fs.createReadStream(RESUME_PATH));
  form.append('session_id', sessionId);

  console.log(`[Step 1] Uploading actual resume to ${BASE_URL}/api/upload-resume ...`);
  const uploadRes = await axios.post(`${BASE_URL}/api/upload-resume`, form, {
    headers: form.getHeaders()
  });

  console.log(`Upload status: ${uploadRes.status}`);
  const parsed = uploadRes.data.parsed_data;
  console.log('\n--- EXTRACTED RESUME PROFILE ---');
  console.log(JSON.stringify(parsed, null, 2));

  // 2 & 3. Verification of fields against original document
  console.log('\n--- VERIFYING EXTRACTED FIELDS AGAINST ORIGINAL DOCUMENT ---');
  console.log(`1. Candidate Name: "${parsed.name}" (Expected: Aman Gairola)`);
  console.log(`2. Email: "${parsed.email}" (Expected: amngairola@gmail.com)`);
  console.log(`3. Phone: "${parsed.phone}" (Expected: +91-9068487652 or 9068487652)`);
  console.log(`4. Location: "${parsed.location}" (Expected: Dehradun, India)`);
  console.log(`5. Designation: "${parsed.designation}" (Expected: Full Stack Developer / Software Engineer)`);

  console.log('\n--- CHECKING WORK EXPERIENCE VS PROJECTS CLASSIFICATION ---');
  console.log(`Experience count: ${parsed.experience ? parsed.experience.length : 0}`);
  if (parsed.experience) {
    parsed.experience.forEach((exp, i) => {
      console.log(`  [Exp ${i + 1}] Role: ${exp.role} | Company: ${exp.company} | Duration: ${exp.duration || (exp.startDate + ' - ' + exp.endDate)}`);
    });
  }

  console.log(`Projects count: ${parsed.projects ? parsed.projects.length : 0}`);
  if (parsed.projects) {
    parsed.projects.forEach((proj, i) => {
      console.log(`  [Proj ${i + 1}] Name: ${proj.name} | Tech: ${proj.technologies ? proj.technologies.join(', ') : 'N/A'}`);
    });
  }

  console.log('\n--- CHECKING EDUCATION ---');
  if (parsed.education) {
    parsed.education.forEach((edu, i) => {
      console.log(`  [Edu ${i + 1}] Degree: ${edu.degree} | Inst: ${edu.institution} | Dates: ${edu.dates || edu.year} | CGPA: ${edu.cgpa}`);
    });
  }

  console.log('\n--- CHECKING TECHNICAL SKILLS & CATEGORIES ---');
  console.log(`Total Flat Skills: ${parsed.skills ? parsed.skills.length : 0}`);
  if (parsed.skillsByCategory) {
    console.log('Categorized Skills:', JSON.stringify(parsed.skillsByCategory, null, 2));
  }

  // 4. Search for React.js, Node.js and Full Stack Developer jobs in India
  console.log('\n[Step 4] Searching for React.js, Node.js and Full Stack Developer jobs in India...');
  const searchQueries = [
    { q: 'Full Stack Developer React Node', location: 'India' },
    { q: 'React Developer', location: 'India' },
    { q: 'Node.js Developer', location: 'India' }
  ];

  let allDiscoveredJobs = [];
  for (const sq of searchQueries) {
    console.log(`\nQuery: "${sq.q}" | Location: "${sq.location}"`);
    const searchRes = await axios.get(`${BASE_URL}/api/search-jobs`, {
      params: { q: sq.q, location: sq.location, session_id: sessionId }
    });
    console.log(`  Found ${searchRes.data.jobs.length} jobs.`);
    allDiscoveredJobs = allDiscoveredJobs.concat(searchRes.data.jobs);
  }

  // Deduplicate
  const uniqueJobsMap = new Map();
  allDiscoveredJobs.forEach(j => {
    if (j.id && !uniqueJobsMap.has(j.id)) uniqueJobsMap.set(j.id, j);
  });
  const uniqueJobs = Array.from(uniqueJobsMap.values());
  console.log(`\nTotal unique jobs retrieved: ${uniqueJobs.length}`);

  // 5, 6, 7, 8. Inspect at least 5 individual job listings in detail
  console.log('\n================================================================');
  console.log('🔬 DETAILED INSPECTION OF TOP 5 INDIVIDUAL JOB LISTINGS');
  console.log('================================================================');

  const sampleJobs = uniqueJobs.slice(0, 5);
  sampleJobs.forEach((job, index) => {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`JOB #${index + 1}: ${job.title} at ${job.company}`);
    console.log(`----------------------------------------------------------------`);
    console.log(`ID:              ${job.id}`);
    console.log(`Company:         ${job.company}`);
    console.log(`Title:           ${job.title}`);
    console.log(`Location:        ${job.location}`);
    console.log(`Type:            ${job.employmentType || 'Not specified'}`);
    console.log(`Experience:      ${job.experienceLevel || 'Not specified'}`);
    console.log(`Salary:          ${job.salary || 'Not disclosed'}`);
    console.log(`Application URL: ${job.applicationUrl}`);
    console.log(`Source:          ${job.source} (${job.sourceUrl || job.applicationUrl})`);
    console.log(`Skills:          ${job.skills ? job.skills.join(', ') : 'None'}`);
    console.log(`Responsibilities (${job.responsibilities ? job.responsibilities.length : 0}):`);
    if (job.responsibilities && job.responsibilities.length > 0) {
      job.responsibilities.forEach(r => console.log(`  • ${r}`));
    } else {
      console.log('  (None parsed as explicit responsibilities)');
    }
    console.log(`Requirements (${job.requirements ? job.requirements.length : 0}):`);
    if (job.requirements && job.requirements.length > 0) {
      job.requirements.forEach(r => console.log(`  • ${r}`));
    } else {
      console.log('  (None parsed as explicit requirements)');
    }
    console.log(`Description preview (clean, no markdown artifacts):`);
    console.log(`  "${job.description ? job.description.slice(0, 200) : ''}..."`);

    // Quality assertions
    const rawCheck = (job.description || '') + (job.title || '') + (job.company || '');
    const hasMarkdownArtifacts = /#####|Share #### Share|APPLY NOW|Earn up t/i.test(rawCheck);
    console.log(`Artifact check: ${hasMarkdownArtifacts ? '❌ FAILED (Contains artifacts)' : '✅ PASSED (Clean)'}`);
  });

  // 9. Match Jobs
  console.log('\n================================================================');
  console.log('[Step 9] Requesting Job Matches for Parsed Resume...');
  console.log('================================================================');
  const matchRes = await axios.get(`${BASE_URL}/api/match-jobs`, {
    params: { session_id: sessionId }
  });

  const matches = matchRes.data.matches;
  console.log(`Total matched jobs: ${matches.length}`);
  console.log('\nTop 5 Job Matches:');
  matches.slice(0, 5).forEach((m, idx) => {
    console.log(`\nMatch #${idx + 1}: ${m.jobTitle || m.jobId} at ${m.company}`);
    console.log(`  Match Score:     ${m.score}%`);
    console.log(`  Reason:          ${m.reason}`);
    console.log(`  Matching Skills: ${m.matchingSkills ? m.matchingSkills.join(', ') : 'None'}`);
    console.log(`  Missing Skills:  ${m.missingSkills ? m.missingSkills.join(', ') : 'None'}`);
    console.log(`  Recommendation:  ${m.recommendation}`);
  });

  // 10. Verify that editing the resume updates future job recommendations
  console.log('\n================================================================');
  console.log('[Step 10] Testing Resume Editing and Impact on Recommendations...');
  console.log('================================================================');

  // Let's copy current parsed resume and add extra skills (e.g. AWS, GraphQL, Kubernetes)
  const modifiedResume = JSON.parse(JSON.stringify(parsed));
  modifiedResume.skills.push('AWS', 'GraphQL', 'Kubernetes');
  if (modifiedResume.skillsByCategory) {
    if (!modifiedResume.skillsByCategory.developerTools) modifiedResume.skillsByCategory.developerTools = [];
    modifiedResume.skillsByCategory.developerTools.push('Kubernetes', 'AWS');
  }

  console.log('Adding new skills: ["AWS", "GraphQL", "Kubernetes"] via PUT /api/session/:sessionId/resume ...');
  const updateRes = await axios.put(`${BASE_URL}/api/session/${sessionId}/resume`, {
    resume_data: modifiedResume
  });

  console.log(`Update response: success = ${updateRes.data.success}`);
  const updatedMatches = updateRes.data.matched;
  console.log(`Re-matched jobs count: ${updatedMatches ? updatedMatches.length : 0}`);

  // Compare previous vs new score for a job that required AWS/Kubernetes/GraphQL or skills
  if (updatedMatches && updatedMatches.length > 0) {
    console.log('\nUpdated Top 3 Matches after skill enhancement:');
    updatedMatches.slice(0, 3).forEach((m, idx) => {
      console.log(`  [Match #${idx + 1}] ${m.jobTitle} at ${m.company} - Score: ${m.score}% (Matching: ${m.matchingSkills ? m.matchingSkills.join(', ') : 'None'})`);
    });
  }

  // 11. Persistence check
  console.log('\n================================================================');
  console.log('[Step 11] Checking Session Persistence in JSON Storage...');
  console.log('================================================================');
  const sessionCheck = await axios.get(`${BASE_URL}/api/session/${sessionId}`);
  console.log(`Session ID: ${sessionCheck.data.session_id}`);
  console.log(`Candidate restored: ${sessionCheck.data.parsed_resume ? sessionCheck.data.parsed_resume.name : 'None'}`);
  console.log(`Skills count in restored session: ${sessionCheck.data.parsed_resume ? sessionCheck.data.parsed_resume.skills.length : 0}`);
  console.log(`Jobs in session: ${sessionCheck.data.jobs ? sessionCheck.data.jobs.length : 0}`);
  console.log(`Matched jobs in session: ${sessionCheck.data.matched ? sessionCheck.data.matched.length : 0}`);

  console.log('\n================================================================');
  console.log('✅ ALL MANUAL QUALITY CHECKS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runManualQualityCheck().catch(err => {
  console.error('Manual quality check failed:', err.response ? err.response.data : err);
  process.exit(1);
});
