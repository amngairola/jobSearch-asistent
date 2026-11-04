const assert = require('assert');
const { verifyUrlReachability, isValidUrl, classifyApplicationUrl } = require('../utils/urlHelper');
const JobSearchAgent = require('../agents/jobSearchAgent');

async function runTests() {
  console.log('=== TESTING URL VERIFICATION & EXPERIENCE FILTERING ===\n');

  // Test 1: Syntax Validation
  console.log('Test 1: Syntax Validation...');
  assert.strictEqual(isValidUrl('javascript:alert(1)'), false);
  assert.strictEqual(isValidUrl('#'), false);
  assert.strictEqual(isValidUrl('not-a-url'), false);
  assert.strictEqual(isValidUrl('https://boards.greenhouse.io/stripe/jobs/123'), true);
  console.log('✓ Test 1 Passed: Valid and invalid URL syntax correctly handled.');

  // Test 2: Reachability on Invalid URL
  console.log('Test 2: Reachability verification on invalid URL...');
  const resInvalid = await verifyUrlReachability('not-a-valid-url');
  assert.strictEqual(resInvalid.verificationStatus, 'invalid');
  console.log('✓ Test 2 Passed: Malformed URL identified as invalid.');

  // Test 3: Reachability on Inactive / Expired pattern URL
  console.log('Test 3: Inactive URL pattern detection...');
  const resExpired = await verifyUrlReachability('https://example.com/careers/job-not-found');
  assert.strictEqual(resExpired.verificationStatus, 'expired');
  console.log('✓ Test 3 Passed: Inactive job pattern detected as expired.');

  // Test 4: Experience Level Inference
  console.log('Test 4: Experience Level Inference...');
  assert.strictEqual(JobSearchAgent.inferExperienceLevel('Senior Frontend Engineer'), 'Senior');
  assert.strictEqual(JobSearchAgent.inferExperienceLevel('Sr. React Developer'), 'Senior');
  assert.strictEqual(JobSearchAgent.inferExperienceLevel('Fresher Full Stack Developer'), 'Entry-level');
  assert.strictEqual(JobSearchAgent.inferExperienceLevel('Junior Node.js Developer'), 'Entry-level');
  assert.strictEqual(JobSearchAgent.inferExperienceLevel('Software Engineering Intern'), 'Internship');
  console.log('✓ Test 4 Passed: Accurate experience level inference across senior, junior, fresher, and intern.');

  // Test 5: ATS vs Third-Party Classification
  console.log('Test 5: Source and ATS Classification...');
  const atsClass = classifyApplicationUrl('https://jobs.lever.co/techcorp/abc-123');
  assert.strictEqual(atsClass.type, 'official_ats');
  assert.strictEqual(atsClass.badge, 'Official ATS Portal');

  const thirdPartyClass = classifyApplicationUrl('https://www.linkedin.com/jobs/view/123456');
  assert.strictEqual(thirdPartyClass.type, 'third_party');
  assert.strictEqual(thirdPartyClass.badge, 'Third-Party Listing');
  console.log('✓ Test 5 Passed: Official ATS distinguished from third-party aggregators.');

  console.log('\n======================================================');
  console.log('✅ ALL SEARCH & URL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
