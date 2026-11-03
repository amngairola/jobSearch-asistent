const { chromium } = require('playwright');
const assert = require('assert');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const fileStore = require('../utils/fileStore');

const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';
const RESUME_PATH = 'C:\\Users\\AMAN\\Desktop\\AmanGairola_fullStack_Resume.pdf';

async function testApplyFlowInBrowser() {
  console.log('===============================================================');
  console.log('🧪 TESTING APPLY BUTTON FLOW & APPLICATION TRACKER IN BROWSER');
  console.log('===============================================================\n');

  // Step 1: Upload resume to create session
  const sessionId = 'test-apply-flow-' + Date.now();
  console.log(`[Step 1] Preparing session ${sessionId}...`);

  const form = new FormData();
  form.append('resume', fs.createReadStream(RESUME_PATH));
  form.append('session_id', sessionId);
  await axios.post(`${BASE_URL}/api/upload-resume`, form, { headers: form.getHeaders() });
  console.log('[Step 1] Resume uploaded successfully.');

  // Search for real live jobs in India for this session
  console.log('[Step 1] Searching jobs for session via /api/search-jobs...');
  const searchRes = await axios.get(`${BASE_URL}/api/search-jobs`, {
    params: { q: 'React Developer', location: 'India', session_id: sessionId }
  });
  const discoveredJobs = searchRes.data.jobs;
  console.log(`[Step 1] Retrieved and attached ${discoveredJobs.length} live jobs to session.`);
  assert(discoveredJobs.length > 0, 'Expected at least 1 job discovered in live search');

  const targetJob = discoveredJobs[0];
  console.log(`Selected target job for UI test: "${targetJob.title}" at "${targetJob.company}"`);
  console.log(`Target application URL: ${targetJob.applicationUrl}`);

  // Step 2: Launch browser with Playwright
  console.log('\n[Step 2] Launching browser to test UI interaction...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept window.open calls to verify exact target URLs
  const openedTabs = [];
  await page.exposeFunction('onWindowOpenCall', (url) => {
    console.log(`  -> Browser called window.open with URL: "${url}"`);
    openedTabs.push(url);
  });

  await page.addInitScript(() => {
    window.open = function(url, target, features) {
      if (window.onWindowOpenCall) {
        window.onWindowOpenCall(url);
      }
      return { focus: () => {}, close: () => {} };
    };
  });

  // Inject session ID into localStorage before loading
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((sid) => {
    localStorage.setItem('ai_job_assistant_session_id', sid);
  }, sessionId);

  // Reload page so it hydrates the active session
  console.log('[Step 3] Loading frontend with active session...');
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click "Recommended Jobs" view in the navigation
  console.log('[Step 4] Navigating to Recommended Jobs view...');
  const jobsNavButton = page.locator('button', { hasText: 'Recommended Jobs' }).first();
  await jobsNavButton.click();
  await page.waitForTimeout(1500);

  // Verify that job cards are visible
  const jobCards = page.locator('button:has-text("Apply")');
  const count = await jobCards.count();
  console.log(`Found ${count} Job Cards with Apply button in the UI.`);
  assert(count > 0, 'Expected at least 1 Job Card with Apply button');

  // Verify link classifications on cards (either "Official Portal" or "Third-Party Listing")
  const linkBadges = page.locator('span:has-text("Official Portal"), span:has-text("Third-Party Listing")');
  const badgeCount = await linkBadges.count();
  console.log(`Found ${badgeCount} classified link badges on job cards.`);

  // Step 5: Test Clicking "Apply" on the target job card
  console.log('\n[Step 5] Clicking "Apply" on target job card in browser...');
  openedTabs.length = 0; // reset
  const firstApplyButton = jobCards.first();
  await firstApplyButton.click();
  await page.waitForTimeout(1500);

  // Verify that window.open opened the verified application URL
  assert.strictEqual(openedTabs.length, 1, 'Expected window.open to be called exactly once upon clicking Apply');
  assert.strictEqual(openedTabs[0], targetJob.applicationUrl, `Expected window.open with "${targetJob.applicationUrl}", got "${openedTabs[0]}"`);
  console.log(`✓ window.open was triggered with verified URL: ${openedTabs[0]}`);

  // Verify ApplyModal opened up
  const modalHeader = page.locator('text=Manual Job Application');
  await modalHeader.waitFor({ timeout: 5000 });
  console.log('✓ ApplyModal appeared with "Manual Job Application" header');

  // Verify modal displays the target URL cleanly
  const modalUrlLink = page.locator(`a[href="${targetJob.applicationUrl}"]`);
  assert(await modalUrlLink.count() > 0, 'Expected verified application link in modal');
  console.log('✓ Verified: Modal contains the verified application link');

  // Verify that application status in tracker is NOT 'applied'
  const initialApps = fileStore.findAll('applications').filter(a => a.sessionId === sessionId);
  const initialTargetApp = initialApps.find(a => a.jobId === targetJob.id);
  console.log(`Application record status before user confirmation: "${initialTargetApp ? initialTargetApp.status : 'none'}"`);
  assert(!initialTargetApp || initialTargetApp.status !== 'applied', 'Application status should NOT be "applied" before user confirms!');
  console.log('✓ Verified: Status is NOT "applied" simply from clicking Apply');

  // Step 6: Explicitly Confirm Application in Modal
  console.log('\n[Step 6] Clicking "I Have Submitted This Application" in modal...');
  const confirmButton = page.locator('button:has-text("I Have Submitted This Application")');
  await confirmButton.click();
  await page.waitForTimeout(2000);

  // Verify application record now has status 'applied'
  const updatedApps = fileStore.findAll('applications').filter(a => a.sessionId === sessionId);
  const updatedTargetApp = updatedApps.find(a => a.jobId === targetJob.id);
  console.log(`Application record status after user confirmation: "${updatedTargetApp ? updatedTargetApp.status : 'none'}"`);
  assert.strictEqual(updatedTargetApp.status, 'applied', 'Application status should be "applied" after explicit confirmation');
  assert(updatedTargetApp.appliedDate, 'Expected appliedDate to be populated');
  console.log(`✓ Verified: Status updated to "applied" with appliedDate: ${updatedTargetApp.appliedDate}`);

  // Step 7: Check Application Tracker view in UI
  console.log('\n[Step 7] Checking Application Tracker view in UI...');
  const trackerNavButton = page.locator('button', { hasText: 'Application Tracker' }).first();
  await trackerNavButton.click();
  await page.waitForTimeout(1500);

  const trackerItem = page.locator(`text=${targetJob.title}`);
  await trackerItem.waitFor({ timeout: 5000 });
  console.log('✓ Job is now visible in Application Tracker with confirmed status!');

  await browser.close();
  console.log('\n===============================================================');
  console.log('✅ ALL BROWSER APPLY FLOW TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

testApplyFlowInBrowser().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
