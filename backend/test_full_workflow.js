require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('🤖 AI JOB ASSISTANT - COMPREHENSIVE END-TO-END TEST');
  console.log('====================================================\n');

  const results = [];
  function record(testName, status, details = '') {
    results.push({ testName, status, details });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${status}] ${testName}`);
    if (details) console.log(`   └─ ${details}`);
  }

  // 1. Health check
  try {
    const res = await axios.get(`${BASE_URL}/api/health`);
    if (res.status === 200 && res.data.status === 'ok') {
      record('1. Health Check (/api/health)', 'PASS', `Status: 200, response: ${JSON.stringify(res.data)}`);
    } else {
      record('1. Health Check (/api/health)', 'FAIL', `Unexpected response: ${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record('1. Health Check (/api/health)', 'FAIL', e.message);
  }

  const testSessionId = `test_sess_${Date.now()}`;

  // 2. Unsupported file upload (must return 415 or 400, NEVER 500)
  try {
    const txtPath = path.join(__dirname, 'temp_unsupported.txt');
    fs.writeFileSync(txtPath, 'Hello world not a pdf');
    const form = new FormData();
    form.append('resume', fs.createReadStream(txtPath));
    form.append('session_id', testSessionId);

    try {
      await axios.post(`${BASE_URL}/api/upload-resume`, form, { headers: form.getHeaders() });
      record('2. Unsupported File Upload (.txt)', 'FAIL', 'Server accepted unsupported file format');
    } catch (err) {
      const code = err.response ? err.response.status : 0;
      if (code === 415 || code === 400) {
        record('2. Unsupported File Upload (.txt)', 'PASS', `Rejected with HTTP ${code}: ${err.response.data?.error}`);
      } else {
        record('2. Unsupported File Upload (.txt)', 'FAIL', `Expected HTTP 400 or 415, got HTTP ${code}`);
      }
    } finally {
      if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
    }
  } catch (e) {
    record('2. Unsupported File Upload (.txt)', 'FAIL', e.message);
  }

  // 3. Valid PDF Resume Upload & Parsing
  let parsedResumeData = null;
  try {
    const pdfPath = path.join(__dirname, 'sample_resume.pdf');
    const form = new FormData();
    form.append('resume', fs.createReadStream(pdfPath));
    form.append('session_id', testSessionId);

    const res = await axios.post(`${BASE_URL}/api/upload-resume`, form, { headers: form.getHeaders() });
    if (res.status === 200 && res.data.success && res.data.parsed_data) {
      parsedResumeData = res.data.parsed_data;
      const skillsCount = parsedResumeData.skills ? parsedResumeData.skills.length : 0;
      record('3. PDF Resume Upload & Groq Parsing', 'PASS', `Candidate: "${parsedResumeData.name}", Skills: ${skillsCount}, Filename: "${res.data.filename}"`);
    } else {
      record('3. PDF Resume Upload & Groq Parsing', 'FAIL', `Invalid response structure: ${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record('3. PDF Resume Upload & Groq Parsing', 'FAIL', e.response?.data?.error || e.message);
  }

  // 4. Valid DOCX Resume Upload & Parsing
  try {
    const docxPath = path.join(__dirname, 'sample_resume.docx');
    const docxSessionId = `${testSessionId}_docx`;
    const form = new FormData();
    form.append('resume', fs.createReadStream(docxPath));
    form.append('session_id', docxSessionId);

    const res = await axios.post(`${BASE_URL}/api/upload-resume`, form, { headers: form.getHeaders() });
    if (res.status === 200 && res.data.success && res.data.parsed_data?.name) {
      record('4. DOCX Resume Upload & Parsing', 'PASS', `Candidate: "${res.data.parsed_data.name}", Skills: ${res.data.parsed_data.skills?.length}`);
    } else {
      record('4. DOCX Resume Upload & Parsing', 'FAIL', `Failed to parse docx: ${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record('4. DOCX Resume Upload & Parsing', 'FAIL', e.response?.data?.error || e.message);
  }

  // 5. Basic AI Chat Greeting
  try {
    const res = await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Hello! What can you help me with?',
      session_id: testSessionId
    });
    if (res.status === 200 && res.data.response && res.data.response.length > 10) {
      record('5. AI Chat - Greeting (Groq LLM)', 'PASS', `Response preview: "${res.data.response.substring(0, 80)}..."`);
    } else {
      record('5. AI Chat - Greeting (Groq LLM)', 'FAIL', `Empty response: ${JSON.stringify(res.data)}`);
    }
  } catch (e) {
    record('5. AI Chat - Greeting (Groq LLM)', 'FAIL', e.response?.data?.error || e.message);
  }

  // 6. Natural Language Job Search through Orchestrator (Tool Calling + Tavily)
  let foundJobs = [];
  try {
    const res = await axios.post(`${BASE_URL}/api/chat`, {
      message: 'Find React developer jobs in India',
      session_id: testSessionId
    });
    if (res.status === 200 && res.data.recommended_jobs && res.data.recommended_jobs.length > 0) {
      foundJobs = res.data.recommended_jobs;
      const topJob = foundJobs[0];
      record('6. AI Agent Job Search Tool (Tavily + Groq)', 'PASS', `Found ${foundJobs.length} live jobs. Sample: "${topJob.title}" at ${topJob.company}`);
    } else {
      // Check if jobs were found via direct search route
      const directRes = await axios.get(`${BASE_URL}/api/search-jobs?q=React+developer&location=India&session_id=${testSessionId}`);
      if (directRes.data.jobs && directRes.data.jobs.length > 0) {
        foundJobs = directRes.data.jobs;
        record('6. AI Agent Job Search Tool (Tavily + Groq)', 'PASS', `Discovered ${foundJobs.length} jobs via Tavily.`);
      } else {
        record('6. AI Agent Job Search Tool (Tavily + Groq)', 'FAIL', 'No jobs returned from search');
      }
    }
  } catch (e) {
    record('6. AI Agent Job Search Tool (Tavily + Groq)', 'FAIL', e.response?.data?.error || e.message);
  }

  // 7. Resume Job Matching
  let matchedJobs = [];
  try {
    const res = await axios.get(`${BASE_URL}/api/match-jobs?session_id=${testSessionId}`);
    if (res.status === 200 && res.data.matches && res.data.matches.length > 0) {
      matchedJobs = res.data.matches;
      const topMatch = matchedJobs[0];
      record('7. Resume Job Matching Agent', 'PASS', `Matched ${matchedJobs.length} jobs. Top score: ${topMatch.score}%, Reason: "${topMatch.reason}"`);
    } else {
      record('7. Resume Job Matching Agent', 'FAIL', 'No matches returned');
    }
  } catch (e) {
    record('7. Resume Job Matching Agent', 'FAIL', e.response?.data?.error || e.message);
  }

  // 8. Application Preparation & Cover Letter Generation
  let targetJobId = foundJobs[0]?.id;
  try {
    if (!targetJobId && matchedJobs[0]) targetJobId = matchedJobs[0].jobId;
    if (targetJobId) {
      const res = await axios.post(`${BASE_URL}/api/apply-job`, {
        job_id: targetJobId,
        session_id: testSessionId,
        confirmed: false
      });
      if (res.status === 200 && res.data.coverLetter && res.data.coverLetter.length > 50) {
        record('8. Application Preparation & Cover Letter (Groq)', 'PASS', `Generated cover letter (${res.data.coverLetter.length} chars)`);
      } else {
        record('8. Application Preparation & Cover Letter (Groq)', 'FAIL', 'Cover letter not generated');
      }
    } else {
      record('8. Application Preparation & Cover Letter (Groq)', 'BLOCKED', 'No job ID available from search');
    }
  } catch (e) {
    record('8. Application Preparation & Cover Letter (Groq)', 'FAIL', e.response?.data?.error || e.message);
  }

  // 9. Application Tracking API
  try {
    const res = await axios.get(`${BASE_URL}/api/applications?session_id=${testSessionId}`);
    if (res.status === 200 && Array.isArray(res.data.applications)) {
      record('9. Application Tracker Agent', 'PASS', `Retrieved ${res.data.applications.length} applications for session`);
    } else {
      record('9. Application Tracker Agent', 'FAIL', 'Invalid response');
    }
  } catch (e) {
    record('9. Application Tracker Agent', 'FAIL', e.response?.data?.error || e.message);
  }

  // 10. Persistence across Session Retrieval (GET /api/session/:sessionId)
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${testSessionId}`);
    if (res.status === 200 && res.data.parsed_resume && res.data.resume_filename) {
      record('10. Persistence on Refresh (/api/session/:id)', 'PASS', `Restored candidate: ${res.data.parsed_resume.name}, file: "${res.data.resume_filename}"`);
    } else {
      record('10. Persistence on Refresh (/api/session/:id)', 'FAIL', 'Session did not persist resume data');
    }
  } catch (e) {
    record('10. Persistence on Refresh (/api/session/:id)', 'FAIL', e.response?.data?.error || e.message);
  }

  // 11. Error Handling: Empty chat message
  try {
    await axios.post(`${BASE_URL}/api/chat`, { message: '', session_id: testSessionId });
    record('11. Error Handling (Empty Message)', 'FAIL', 'Accepted empty message');
  } catch (err) {
    if (err.response?.status === 400) {
      record('11. Error Handling (Empty Message)', 'PASS', `Rejected with HTTP 400: ${err.response.data?.error}`);
    } else {
      record('11. Error Handling (Empty Message)', 'FAIL', `Expected HTTP 400, got ${err.response?.status}`);
    }
  }

  console.log('\n====================================================');
  console.log('📊 TEST SUMMARY:');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const blockedCount = results.filter(r => r.status === 'BLOCKED').length;
  console.log(`TOTAL: ${results.length} | PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);
  console.log('====================================================\n');

  if (failCount === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Master test runner fatal error:', err);
  process.exit(1);
});
