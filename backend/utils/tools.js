const ResumeParserAgent = require('../agents/resumeParserAgent');
const JobSearchAgent = require('../agents/jobSearchAgent');
const JobMatcherAgent = require('../agents/jobMatcherAgent');
const ApplicationAgent = require('../agents/applicationAgent');
const ApplicationTrackerAgent = require('../agents/applicationTrackerAgent');

let resumeParser = new ResumeParserAgent();
let jobSearchAgent = new JobSearchAgent();
let jobMatcherAgent = new JobMatcherAgent();
let applicationAgent = new ApplicationAgent();
let applicationTrackerAgent = new ApplicationTrackerAgent();

function setDependencies() {
  resumeParser = new ResumeParserAgent();
  jobSearchAgent = new JobSearchAgent();
  jobMatcherAgent = new JobMatcherAgent();
  applicationAgent = new ApplicationAgent();
  applicationTrackerAgent = new ApplicationTrackerAgent();
}

const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'searchJobs',
      description: 'Search for jobs based on query and location',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Job title or keywords' },
          location: { type: 'string', description: 'Location preference' },
          remote: { type: 'boolean', description: 'Whether remote only' }
        },
        required: ['query']
      }
    }
  }
];

const tools = {
  async searchJobs({ query, location, remote }) {
    try {
      const jobs = await jobSearchAgent.search(query, location, remote);
      return { success: true, data: jobs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = { toolSchemas, tools, setDependencies };
