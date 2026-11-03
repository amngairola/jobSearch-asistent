require('dotenv').config();
const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

async function testResumeUpload() {
  console.log('Testing /api/upload-resume endpoint...');
  
  // Create a simple test resume file
  const testResumePath = './test_resume_upload.txt';
  const testResumeContent = `John Doe
Software Engineer
Email: john@example.com
Phone: 555-0123
Location: San Francisco, CA

Skills: JavaScript, React, Node.js, Python, MongoDB

Experience:
Senior Developer at Tech Corp (2020-Present)
- Led team of 5 developers
- Built microservices architecture

Junior Developer at Startup (2018-2020)
- Developed React applications
- Implemented CI/CD pipelines`;
  
  fs.writeFileSync(testResumePath, testResumeContent);
  
  const sessionId = 'test_session_' + Date.now();
  
  const form = new FormData();
  form.append('resume', fs.createReadStream(testResumePath));
  form.append('session_id', sessionId);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/upload-resume',
    method: 'POST',
    headers: form.getHeaders()
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('SUCCESS: Resume upload endpoint responded');
            console.log('Parsed data keys:', Object.keys(response.parsed_data || {}));
            console.log('Session ID:', response.session_id);
            resolve();
          } else {
            console.error('ERROR: Resume upload failed');
            console.error('Status:', res.statusCode);
            console.error('Response:', response);
            reject(new Error('Upload failed'));
          }
        } catch (e) {
          console.error('ERROR: Failed to parse response');
          console.error('Raw response:', data);
          reject(e);
        }
        // Cleanup
        fs.unlinkSync(testResumePath);
      });
    });
    
    req.on('error', (error) => {
      console.error('ERROR: Request failed');
      console.error('Error:', error.message);
      fs.unlinkSync(testResumePath);
      reject(error);
    });
    
    form.pipe(req);
  });
}

testResumeUpload()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
