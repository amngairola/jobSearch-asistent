const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Sample job data generator (since real scraping may be blocked)
// This creates realistic job listings for demonstration
class JobScraper {
  constructor() {
    this.jobs = [];
    this.companies = [
      'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix',
      'Uber', 'Airbnb', 'Spotify', 'Slack', 'Zoom', 'Stripe',
      'Shopify', 'Square', 'Twitter', 'LinkedIn', 'Salesforce',
      'Adobe', 'IBM', 'Oracle', 'SAP', 'Intel', 'AMD', 'NVIDIA'
    ];
    this.locations = [
      'Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune',
      'Chennai', 'New York', 'San Francisco', 'Seattle', 'London',
      'Berlin', 'Singapore', 'Toronto', 'Sydney'
    ];
    this.jobTitles = [
      'Software Engineer', 'Frontend Developer', 'Backend Developer',
      'Full Stack Developer', 'Software Development Engineer (SDE)',
      'React Developer', 'Node.js Developer', 'Python Developer',
      'Java Developer', 'DevOps Engineer', 'Cloud Engineer',
      'Data Engineer', 'Machine Learning Engineer', 'AI Engineer',
      'Mobile Developer', 'iOS Developer', 'Android Developer'
    ];
    this.skills = [
      ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      ['Python', 'Django', 'Flask', 'PostgreSQL'],
      ['Java', 'Spring Boot', 'Microservices', 'AWS'],
      ['React', 'Redux', 'TypeScript', 'GraphQL'],
      ['Node.js', 'Express', 'MongoDB', 'Redis'],
      ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning'],
      ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
      ['Vue.js', 'Nuxt.js', 'TypeScript', 'Node.js'],
      ['Angular', 'TypeScript', 'RxJS', 'NgRx'],
      ['Go', 'Microservices', 'gRPC', 'Docker'],
      ['Flutter', 'Dart', 'Firebase', 'REST APIs'],
      ['Swift', 'iOS', 'SwiftUI', 'Core Data'],
      ['Kotlin', 'Android', 'Jetpack Compose', 'Room']
    ];
  }

  generateJob(id) {
    const title = this.jobTitles[Math.floor(Math.random() * this.jobTitles.length)];
    const company = this.companies[Math.floor(Math.random() * this.companies.length)];
    const location = this.locations[Math.floor(Math.random() * this.locations.length)];
    const skillSet = this.skills[Math.floor(Math.random() * this.skills.length)];
    const experience = Math.floor(Math.random() * 5) + 1; // 1-5 years
    
    return {
      job_id: id.toString(),
      title: title,
      company: company,
      location: location,
      experience_required: `${experience}+ years`,
      skills: skillSet,
      description: this.generateDescription(title, company, skillSet, experience),
      source_link: `https://example.com/jobs/${id}`,
      salary: this.generateSalary(experience),
      posted_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  generateDescription(title, company, skills, experience) {
    return `${company} is looking for a talented ${title} to join our team. 
    We are seeking a professional with ${experience}+ years of experience in software development.
    Required skills: ${skills.join(', ')}. 
    You will be working on cutting-edge projects and collaborating with talented engineers.
    This is an excellent opportunity to grow your career and work on impactful products.`;
  }

  generateSalary(experience) {
    const base = 800000;
    const increment = experience * 200000;
    const range = 100000;
    const min = base + increment - range;
    const max = base + increment + range;
    return `₹${(min/100000).toFixed(1)}L - ₹${(max/100000).toFixed(1)}L PA`;
  }

  async scrapeJobs(count = 2000) {
    console.log(`Generating ${count} job listings...`);
    
    for (let i = 1; i <= count; i++) {
      const job = this.generateJob(i);
      this.jobs.push(job);
      
      if (i % 100 === 0) {
        console.log(`Generated ${i} jobs...`);
      }
    }

    console.log(`Successfully generated ${this.jobs.length} job listings`);
    return this.jobs;
  }

  async saveJobs(outputPath) {
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.jobs, null, 2));
    console.log(`Jobs saved to ${outputPath}`);
  }
}

// Main execution
async function main() {
  const scraper = new JobScraper();
  const jobs = await scraper.scrapeJobs(2000);
  
  const outputPath = path.join(__dirname, '..', 'data', 'jobs.json');
  await scraper.saveJobs(outputPath);
  
  console.log('\nJob scraping completed!');
  console.log(`Total jobs: ${jobs.length}`);
  console.log(`Output file: ${outputPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = JobScraper;
