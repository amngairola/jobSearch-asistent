require('dotenv').config();
const database = require('./utils/database');

async function testStorage() {
  console.log('Testing JSON file storage...');
  
  const testSessionId = 'test_session_' + Date.now();
  
  try {
    // Test insert
    console.log('1. Testing insert...');
    await database.insert('resumes', {
      session_id: testSessionId,
      data: { name: 'Test User', email: 'test@example.com' }
    });
    console.log('✓ Insert successful');
    
    // Test find
    console.log('2. Testing find...');
    const found = await database.findOne('resumes', { session_id: testSessionId });
    if (found && found.data.name === 'Test User') {
      console.log('✓ Find successful:', found.data.name);
    } else {
      throw new Error('Find failed or data mismatch');
    }
    
    // Test update
    console.log('3. Testing update...');
    await database.update('resumes', testSessionId, {
      data: { name: 'Test User Updated', email: 'test@example.com' }
    });
    const updated = await database.findOne('resumes', { session_id: testSessionId });
    if (updated.data.name === 'Test User Updated') {
      console.log('✓ Update successful:', updated.data.name);
    } else {
      throw new Error('Update failed');
    }
    
    // Test upsert (insert new)
    console.log('4. Testing upsert (new)...');
    const newSessionId = 'test_session_' + Date.now() + '_2';
    await database.upsert('applications', newSessionId, {
      job_id: 'job_123',
      status: 'pending'
    });
    const upserted = await database.findOne('applications', { id: newSessionId });
    if (upserted && upserted.job_id === 'job_123') {
      console.log('✓ Upsert (new) successful');
    } else {
      throw new Error('Upsert (new) failed');
    }
    
    // Test upsert (update existing)
    console.log('5. Testing upsert (existing)...');
    await database.upsert('applications', newSessionId, {
      status: 'submitted'
    });
    const upsertedUpdated = await database.findOne('applications', { id: newSessionId });
    if (upsertedUpdated.status === 'submitted') {
      console.log('✓ Upsert (existing) successful');
    } else {
      throw new Error('Upsert (existing) failed');
    }
    
    // Test delete
    console.log('6. Testing delete...');
    await database.delete('resumes', testSessionId);
    const deleted = await database.findOne('resumes', { session_id: testSessionId });
    if (deleted === null) {
      console.log('✓ Delete successful');
    } else {
      throw new Error('Delete failed');
    }
    
    // Cleanup
    await database.delete('applications', newSessionId);
    
    console.log('\n✅ All storage tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Storage test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testStorage();
