const fs = require('fs');
const path = require('path');

// Let's create a valid PDF binary
function createSimplePdf(lines) {
  let contentStream = 'BT\n/F1 12 Tf\n72 720 Td\n';
  lines.forEach((line, i) => {
    if (i > 0) contentStream += '0 -16 Td\n';
    contentStream += `(${line.replace(/[()\\]/g, '')}) Tj\n`;
  });
  contentStream += 'ET\n';

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  let body = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`5 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj`);

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 0; i < 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'utf8');
}

const resumeLines = [
  'Aman Sharma',
  'Software Engineer',
  'Email: aman.sharma@example.com',
  'Phone: +91-9876543210',
  'Location: Bangalore, India',
  '',
  'Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Tailwind CSS, Python, Git',
  '',
  'Experience:',
  'Senior Full Stack Developer at TechSolutions (2022 - Present)',
  'Built scalable web applications using React and Node.js with microservices architecture.',
  'Frontend Developer at WebCraft (2020 - 2022)',
  'Developed responsive web interfaces using React, Redux, and Tailwind CSS.',
  '',
  'Education:',
  'Bachelor of Technology in Computer Science (2016 - 2020)',
  'Bangalore Institute of Technology',
  '',
  'Projects:',
  'AI Job Assistant - Full-stack career portal using React and Node.js',
  'E-Commerce Platform - Scalable online store built with React and Express',
  '',
  'Certifications:',
  'AWS Certified Developer, Certified React Professional'
];

const pdfBuffer = createSimplePdf(resumeLines);
fs.writeFileSync(path.join(__dirname, '../sample_resume.pdf'), pdfBuffer);
console.log('Created valid sample_resume.pdf');

// Also create a sample DOCX file
// A docx file is a ZIP containing [Content_Types].xml and word/document.xml
// Let's create one using archiver or mammoth-compatible zip
const archiver = (() => {
  // Let's check if archiver or similar is installed or write minimal zip
  try {
    return require('archiver');
  } catch (_) {
    return null;
  }
})();

if (!archiver) {
  console.log('Archiver not installed, DOCX generation skipped (sample_resume.pdf is ready)');
}
