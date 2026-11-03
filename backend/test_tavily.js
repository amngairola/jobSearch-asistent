require('dotenv').config();

async function testTavily() {
  console.log('Testing Tavily API...');
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.error('ERROR: TAVILY_API_KEY is not set in .env');
    process.exit(1);
  }
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'React developer jobs San Francisco',
        max_results: 5
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('ERROR: Tavily API request failed');
      console.error('Status:', response.status);
      console.error('Response:', data);
      process.exit(1);
    }
    
    console.log('SUCCESS: Tavily API responded');
    console.log('Results found:', data.results?.length || 0);
    if (data.results && data.results.length > 0) {
      console.log('Sample result:', data.results[0].title);
    }
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Tavily API request failed');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testTavily();
