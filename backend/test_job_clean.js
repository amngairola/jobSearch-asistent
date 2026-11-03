require('dotenv').config();
const { getGroqClient } = require('./utils/groqClient');
const client = getGroqClient();

const rawSnippet = "Bachelor’s/Master’s degree in Computer Science (or equivalent experience) Experience building complex web apps using React.js as well as a strong command of modern HTML, and CSS experience Work full-time (40 hours/week) ##### Details ##### PAY RANGE $200,000 USD/year ##### LOCATION Openings available to job seekers in India ##### Share #### Share [...] Boost your creativity by developing interactive user interfaces and web applications quickly and efficiently. APPLY NOW Earn up t";

const systemPrompt = `You are an expert Job Data Normalizer. Given a messy raw job posting or search snippet, extract a clean structured JSON object matching this schema exactly:
{
  "title": "Clean individual job title (e.g. 'React Developer')",
  "company": "Clean company name",
  "location": "Clean location or 'Remote'",
  "employmentType": "Full-time, Part-time, Contract, or Internship",
  "experienceLevel": "Entry-level, Mid-level, Senior, or null",
  "salary": "Salary string or null",
  "description": "Clean, polished 2-3 sentence overview describing the role. Absolutely remove all markdown headings like ##### Details, Share buttons, ads, and callouts",
  "responsibilities": ["List of concrete responsibilities"],
  "requirements": ["List of qualifications, degrees, experience"],
  "skills": ["List of technical skills, e.g. React.js, HTML, CSS"]
}
Rules:
- NEVER invent information not present.
- Strip all boilerplate like '##### Details', 'Share #### Share', social links, 'APPLY NOW', 'Earn up to'.
- Output ONLY valid JSON.`;

async function run() {
  const start = Date.now();
  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Raw Job Snippet (Candidate Job: React Developer at TechCorp, URL: https://example.com/jobs/react-dev):\n${rawSnippet}` }
    ],
    response_format: { type: 'json_object' }
  });
  console.log('Took:', Date.now() - start, 'ms');
  console.log('Result:\n', JSON.stringify(JSON.parse(response.choices[0].message.content), null, 2));
}

run().catch(console.error);
