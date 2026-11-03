require('dotenv').config();
const { getGroqClient, isGroqConfigured } = require('./utils/groqClient');

async function testGroq() {
  console.log('Testing Groq API...');
  console.log('GROQ_API_KEY configured:', isGroqConfigured());
  
  if (!isGroqConfigured()) {
    console.error('ERROR: GROQ_API_KEY is not set in .env');
    process.exit(1);
  }
  
  try {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Groq API is working" in exactly those words.' }
      ]
    });
    
    console.log('SUCCESS: Groq API responded');
    console.log('Response:', response.choices[0].message.content);
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Groq API request failed');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testGroq();
