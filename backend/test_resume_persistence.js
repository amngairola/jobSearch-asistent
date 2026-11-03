require('dotenv').config();
const database = require('./utils/database');

async function testResumePersistence() {
  console.log('Testing resume persistence...');
  
  const testSessionId = 'test_resume_session_' + Date.now();
  const testResumeData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    location: 'San Francisco, CA',
    designation: 'Software Engineer',
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    experience: [
      { title: 'Senior Developer', company: 'Tech Corp', duration: '2020-Present' }
    ],
    education: [
      { degree: 'BS Computer Science', institution: 'UC Berkeley', year: '2017' }
    ]
  };
  
  try {
    // Save resume
    console.log('1. Saving resume to storage...');
    await database.upsert('resumes', testSessionId, {
      session_id: testSessionId,
      data: testResumeData,
      updated_at: new Date().toISOString()
    });
    console.log('✓ Resume saved');
    
    // Retrieve resume
    console.log('2. Retrieving resume from storage...');
    const retrieved = await database.findOne('resumes', { session_id: testSessionId });
    if (retrieved && retrieved.data.name === 'John Doe') {
      console.log('✓ Resume retrieved:', retrieved.data.name);
    } else {
      throw new Error('Resume retrieval failed');
    }
    
    // Verify all fields
    console.log('3. Verifying all fields...');
    if (retrieved.data.skills.length === 4 && retrieved.data.experience.length === 1) {
      console.log('✓ All fields preserved');
    } else {
      throw new Error('Field data mismatch');
    }
    
    // Cleanup
    await database.delete('resumes', testSessionId);
    
    console.log('\n✅ Resume persistence test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Resume persistence test failed:', error.message);
    process.exit(1);
  }
}

testResumePersistence();
