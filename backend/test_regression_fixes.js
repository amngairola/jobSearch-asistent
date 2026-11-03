const assert = require('assert');
const JobSearchAgent = require('./agents/jobSearchAgent');
const axios = require('axios');

async function runRegressionTests() {
  console.log('=== RUNNING REGRESSION TESTS FOR FIXES ===\n');

  const agent = new JobSearchAgent();

  // Test 1: Problematic Job Snippet Cleaning
  console.log('Test 1: Cleaning problematic job snippet specified by user...');
  const problematicSnippet = "Bachelor’s/Master’s degree in Computer Science (or equivalent experience) Experience building complex web apps using React.js as well as a strong command of modern HTML, and CSS experience Work full-time (40 hours/week) ##### Details ##### PAY RANGE $200,000 USD/year ##### LOCATION Openings available to job seekers in India ##### Share #### Share [...] Boost your creativity by developing interactive user interfaces and web applications quickly and efficiently. APPLY NOW Earn up t";

  const { cleanText: cleaned, salary, location } = JobSearchAgent.cleanRawJobSnippet(problematicSnippet);
  console.log('Cleaned snippet result:');
  console.log('--------------------------------------------------');
  console.log(cleaned);
  console.log('--------------------------------------------------');
  console.log(`Extracted Salary: "${salary}"`);
  console.log(`Extracted Location: "${location}"`);

  assert(!cleaned.includes('##### Details'), 'Snippet still contains "##### Details"');
  assert(!cleaned.includes('Share #### Share'), 'Snippet still contains "Share #### Share"');
  assert(!cleaned.includes('APPLY NOW'), 'Snippet still contains "APPLY NOW"');
  assert(!cleaned.includes('Earn up t'), 'Snippet still contains "Earn up t"');
  assert.strictEqual(salary, '$200,000 USD/year', `Expected salary "$200,000 USD/year", got "${salary}"`);
  assert.strictEqual(location, 'India', `Expected location "India", got "${location}"`);
  console.log('✓ Test 1 Passed: Artifacts, markdown headings, and promo buttons cleanly removed; salary and location extracted.');

  // Test 2: Structured Job Extraction from Problematic Snippet
  console.log('\nTest 2: Structuring Tavily result from problematic snippet...');
  const rawItem = {
    title: 'Senior Frontend Engineer - React.js at TechCorp',
    url: 'https://boards.greenhouse.io/techcorp/jobs/1234567',
    content: problematicSnippet
  };

  const structuredJob = agent._structureTavilyResult(rawItem);
  console.log('Structured Job Output:');
  console.log(JSON.stringify(structuredJob, null, 2));

  assert.strictEqual(structuredJob.salary, '$200,000 USD/year', `Expected salary "$200,000 USD/year", got "${structuredJob.salary}"`);
  assert.strictEqual(structuredJob.location, 'India', `Expected location "India", got "${structuredJob.location}"`);
  assert.strictEqual(structuredJob.employmentType, 'Full-time', `Expected employmentType "Full-time", got "${structuredJob.employmentType}"`);
  assert(structuredJob.requirements.length > 0, 'Expected non-empty requirements');
  assert(structuredJob.skills.includes('React.js') || structuredJob.skills.includes('React') || structuredJob.skills.includes('HTML') || structuredJob.skills.includes('CSS'), 'Expected extracted skills to include React/HTML/CSS');
  assert.strictEqual(structuredJob.applicationUrl, rawItem.url, 'Expected applicationUrl to match url');
  console.log('✓ Test 2 Passed: Structured job schema adheres to all required fields and extracted salary/location/type correctly.');

  // Test 3: Aggregator listing rejection
  console.log('\nTest 3: Aggregator / Directory listing rejection...');
  const aggregatorResult1 = {
    title: '2,685 React Developer Jobs in India (January 2026) | Glassdoor',
    url: 'https://www.glassdoor.co.in/Job/india-react-developer-jobs-SRCH_IL.0,5_IN115_KO6,21.htm',
    content: 'Search 2,685 React Developer jobs in India with company reviews & ratings. Browse top jobs in Bangalore, Mumbai, Remote.'
  };
  const isIndividual1 = JobSearchAgent.isIndividualJobListing(aggregatorResult1.title, aggregatorResult1.url, aggregatorResult1.content);
  assert(!isIndividual1, 'Failed to reject Glassdoor search aggregator page');

  const directJob = {
    title: 'Senior Full Stack Engineer',
    url: 'https://jobs.lever.co/stripe/abc-123',
    content: 'Stripe is looking for a Senior Full Stack Engineer in Bengaluru...'
  };
  const isIndividual2 = JobSearchAgent.isIndividualJobListing(directJob.title, directJob.url, directJob.content);
  assert(isIndividual2, 'Direct Lever job was incorrectly flagged as non-individual');
  console.log('✓ Test 3 Passed: Aggregator detection correctly identifies directory pages vs genuine job postings.');

  // Test 4: End-to-end Session Resume Edit and Persistence
  console.log('\nTest 4: Verifying PUT /api/session/:sessionId/resume endpoint & persistence...');
  const BASE_URL = 'http://localhost:5000';
  const sessionId = 'test-session-' + Date.now();
  console.log(`Using test session: ${sessionId}`);

  // Update resume manually via edit mode
  const updatedResumeData = {
    name: 'Aman Sharma (Updated)',
    email: 'aman.verified@example.com',
    phone: '+91 9876543210',
    location: 'Bengaluru, India',
    designation: 'Staff Software Engineer',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'System Design'],
    skillsByCategory: {
      languages: ['TypeScript', 'JavaScript', 'SQL'],
      frameworks: ['React', 'Node.js', 'Express'],
      developerTools: ['Docker', 'Git'],
      librariesAndDatabases: ['PostgreSQL']
    },
    experience: [
      {
        company: 'Apex Tech',
        role: 'Senior Software Engineer',
        duration: '2023 - Present',
        description: 'Led architecture and migration of core microservices.'
      }
    ],
    education: [
      {
        degree: 'B.Tech in Computer Science',
        institution: 'National Institute of Technology',
        dates: '2019 - 2023',
        cgpa: '9.2 / 10'
      }
    ],
    projects: [
      {
        name: 'AI Orchestrator',
        technologies: ['Node.js', 'Groq', 'React'],
        description: 'Real-time multi-agent job application assistant.'
      }
    ],
    certifications: ['AWS Certified Solutions Architect']
  };

  const updateRes = await axios.put(`${BASE_URL}/api/session/${sessionId}/resume`, { resume_data: updatedResumeData });
  assert.strictEqual(updateRes.data.success, true);
  assert.strictEqual(updateRes.data.parsed_data.name, 'Aman Sharma (Updated)');
  assert.strictEqual(updateRes.data.parsed_data.education[0].cgpa, '9.2 / 10');
  console.log('PUT /api/session/:sessionId/resume succeeded.');

  // Verify persistence by fetching session
  const fetchSessionRes = await axios.get(`${BASE_URL}/api/session/${sessionId}`);
  assert.strictEqual(fetchSessionRes.data.parsed_resume.name, 'Aman Sharma (Updated)');
  assert.strictEqual(fetchSessionRes.data.parsed_resume.designation, 'Staff Software Engineer');
  console.log('✓ Test 4 Passed: Resume edits correctly persisted to file storage and hydrated in session state.');

  console.log('\n========================================');
  console.log('ALL 4 REGRESSION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runRegressionTests().catch(err => {
  console.error('Regression test failed:', err);
  process.exit(1);
});
