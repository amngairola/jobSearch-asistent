require('dotenv').config();

async function testChat() {
  console.log('Testing /api/chat endpoint...');
  
  const sessionId = 'test_session_' + Date.now();
  
  try {
    const response = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'hello',
        session_id: sessionId
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('ERROR: Chat endpoint failed');
      console.error('Status:', response.status);
      console.error('Response:', data);
      process.exit(1);
    }
    
    console.log('SUCCESS: Chat endpoint responded');
    console.log('Response:', data.response || data);
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Chat endpoint request failed');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testChat();
