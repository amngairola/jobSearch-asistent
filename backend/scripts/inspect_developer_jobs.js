const JobSearchAgent = require('../agents/jobSearchAgent');

async function testDeveloperJobs() {
  const agent = new JobSearchAgent();
  console.log('Searching for "Full Stack Developer React Node" in "India" via JobSearchAgent...');
  const jobs = await agent.search('Full Stack Developer React Node', 'India');

  console.log(`Discovered ${jobs.length} jobs.`);
  console.log('\nTop 5 specific developer jobs:');
  const sample = jobs.filter(j => j.title.toLowerCase().includes('developer') || j.title.toLowerCase().includes('engineer')).slice(0, 5);

  sample.forEach((j, i) => {
    console.log(`\n================ JOB #${i + 1} ================`);
    console.log(`Title:           ${j.title}`);
    console.log(`Company:         ${j.company}`);
    console.log(`Location:        ${j.location}`);
    console.log(`Salary:          ${j.salary || 'Not specified'}`);
    console.log(`Employment Type: ${j.employmentType || 'Not specified'}`);
    console.log(`Experience:      ${j.experienceLevel || 'Not specified'}`);
    console.log(`Application URL: ${j.applicationUrl}`);
    console.log(`Source:          ${j.source} (${j.sourceUrl})`);
    console.log(`Skills:          ${j.skills ? j.skills.join(', ') : 'None'}`);
    console.log(`Requirements:    ${j.requirements ? j.requirements.length : 0} items`);
    if (j.requirements && j.requirements.length > 0) {
      j.requirements.forEach(r => console.log(`   - ${r}`));
    }
    console.log(`Responsibilities:${j.responsibilities ? j.responsibilities.length : 0} items`);
    if (j.responsibilities && j.responsibilities.length > 0) {
      j.responsibilities.forEach(r => console.log(`   - ${r}`));
    }
    console.log(`Description:     ${j.description.slice(0, 200)}...`);
  });
}

testDeveloperJobs().catch(console.error);
