const JobSearchAgent = require('../agents/jobSearchAgent');

async function testTavilyJobsDirect() {
  const agent = new JobSearchAgent();
  console.log('Running direct Tavily search for: Full Stack Developer React Node in India...');
  const directResults = await agent._tavilySearch('("Full Stack Developer" OR "React Developer" OR "Node.js Developer") India ("apply" OR "job" OR "career")', 10);

  console.log(`Received ${directResults.length} raw results from Tavily.`);
  for (let i = 0; i < directResults.length; i++) {
    const r = directResults[i];
    console.log(`\n--- RAW RESULT #${i + 1} ---`);
    console.log(`Title: ${r.title}`);
    console.log(`URL:   ${r.url}`);
    console.log(`Snippet:\n${r.content ? r.content.slice(0, 300) : ''}...`);

    const isIndiv = JobSearchAgent.isIndividualJobListing(r.title, r.url, r.content);
    console.log(`isIndividualJobListing? ${isIndiv}`);

    if (isIndiv) {
      const structured = agent._structureTavilyResult(r);
      console.log('Structured Job Output:');
      console.log(JSON.stringify(structured, null, 2));
    }
  }
}

testTavilyJobsDirect().catch(console.error);
