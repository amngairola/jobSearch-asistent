const assert = require('assert');
const { isValidUrl, classifyApplicationUrl } = require('../utils/urlHelper');
const ApplicationAgent = require('../agents/applicationAgent');

async function testInvalidUrlHandling() {
  console.log('Testing URL validation & classification...');

  // Invalid URLs
  assert.strictEqual(isValidUrl(null), false);
  assert.strictEqual(isValidUrl(undefined), false);
  assert.strictEqual(isValidUrl(''), false);
  assert.strictEqual(isValidUrl('#'), false);
  assert.strictEqual(isValidUrl('javascript:void(0)'), false);
  assert.strictEqual(isValidUrl('not-a-valid-url'), false);
  console.log('✓ Invalid URLs correctly detected');

  // Valid URLs
  assert.strictEqual(isValidUrl('https://boards.greenhouse.io/techcorp/jobs/12345'), true);
  assert.strictEqual(isValidUrl('https://in.linkedin.com/jobs/view/12345'), true);
  console.log('✓ Valid URLs correctly approved');

  // Classification
  const greenhouseCls = classifyApplicationUrl('https://boards.greenhouse.io/techcorp/jobs/12345');
  assert.strictEqual(greenhouseCls.isDirectPortal, true);
  assert.strictEqual(greenhouseCls.badge, 'Official ATS Portal');
  console.log('✓ Greenhouse classified as Official ATS Portal');

  const linkedinCls = classifyApplicationUrl('https://in.linkedin.com/jobs/view/12345');
  assert.strictEqual(linkedinCls.isDirectPortal, false);
  assert.strictEqual(linkedinCls.badge, 'Third-Party Listing');
  assert(linkedinCls.warning.includes('third-party job board'));
  console.log('✓ LinkedIn classified as Third-Party Listing with warning notice');

  console.log('✅ URL helper tests passed!');
}

testInvalidUrlHandling().catch(console.error);
