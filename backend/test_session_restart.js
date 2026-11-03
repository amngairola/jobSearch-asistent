require('dotenv').config();
const database = require('./utils/database');

async function testSessionPersistence() {
  console.log('Testing session persistence...');
  
  const testSessionId = 'test_session_' + Date.now();
  
  try {
    // Save session data
    console.log('1. Saving session data...');
    await database.upsert('sessions', testSessionId, {
      session_id: testSessionId,
      parsedResume: { name: 'Test User', skills: ['JavaScript'] },
      jobs: [{ title: 'Developer', company: 'Test Corp' }],
      conversationHistory: [{ role: 'user', content: 'hello' }]
    });
    console.log('✓ Session data saved');
    
    // Retrieve session data
    console.log('2. Retrieving session data...');
    const retrieved = await database.findOne('sessions', { session_id: testSessionId });
    if (retrieved && retrieved.parsedResume.name === 'Test User') {
      console.log('✓ Session data retrieved');
    } else {
      throw new Error('Session retrieval failed');
    }
    
    // Verify all fields
    console.log('3. Verifying all session fields...');
    if (retrieved.jobs.length === 1 && retrieved.conversationHistory.length === 1) {
      console.log('✓ All session fields preserved');
    } else {
      throw new Error('Session field data mismatch');
    }
    
    // Cleanup
    await database.delete('sessions', testSessionId);
    
    console.log('\n✅ Session persistence test passed!');
    console.log('Note: To test persistence across server restart, the data directory');
    console.log('("C:\\Users\\AMAN\\Desktop\\assesment\\data") must persist between restarts.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Session persistence test failed:', error.message);
    process.exit(1);
  }
}

testSessionPersistence();
