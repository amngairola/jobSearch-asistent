const { chromium } = require('playwright');

async function checkBrowserConsole() {
  console.log('Launching Playwright Chromium browser to inspect frontend at http://localhost:3000 ...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.log('Chromium browser binary not installed in Playwright cache, trying system msedge / chrome...');
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    if (type === 'error') {
      console.error(`[Browser Console Error]: ${text}`);
    } else {
      console.log(`[Browser Console ${type.toUpperCase()}]: ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[Browser Page Error]: ${err.message}`);
    pageErrors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });

  // Wait a couple seconds to allow React hydration and query checks
  await page.waitForTimeout(2000);

  const title = await page.title();
  console.log(`Page title: "${title}"`);

  // Check if main UI elements are visible
  const appContainer = await page.$('#root');
  console.log(`Root container rendered: ${!!appContainer}`);

  const headingText = await page.textContent('body');
  const hasAppContent = headingText.includes('AI Job Assistant') || headingText.includes('Career') || headingText.includes('Assistant');
  console.log(`Core application content rendered: ${hasAppContent}`);

  await browser.close();

  console.log('\n--- BROWSER CONSOLE REPORT ---');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Page errors: ${pageErrors.length}`);

  const criticalErrors = pageErrors.concat(
    consoleMessages.filter(m => m.type === 'error').map(m => m.text)
  );

  if (criticalErrors.length === 0) {
    console.log('✅ ZERO errors detected in browser console!');
  } else {
    console.warn(`⚠️ Detected errors:`, criticalErrors);
  }
}

checkBrowserConsole().catch(err => {
  console.error('Playwright inspection error:', err.message);
  process.exit(1);
});
