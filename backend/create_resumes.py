import zipfile
import os

# 1. Create DOCX
content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

resume_text = """Aman Sharma
Full Stack Developer
Email: aman.sharma@example.com
Phone: +91-9876543210
Location: Bangalore, India

Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Tailwind CSS, Python, Git

Experience:
Senior Full Stack Developer at TechSolutions (2022 - Present)
Built scalable web applications using React and Node.js with microservices architecture.

Frontend Developer at WebCraft (2020 - 2022)
Developed responsive web interfaces using React, Redux, and Tailwind CSS.

Education:
Bachelor of Technology in Computer Science (2016 - 2020)
Bangalore Institute of Technology

Projects:
AI Job Assistant - Career portal using React and Node.js
E-Commerce Platform - Scalable online store built with React and Express

Certifications:
AWS Certified Developer
"""

paragraphs = ''.join([f'<w:p><w:r><w:t>{line}</w:t></w:r></w:p>' for line in resume_text.split('\n')])

doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paragraphs}
  </w:body>
</w:document>'''

docx_path = os.path.join(os.path.dirname(__file__), 'sample_resume.docx')
with zipfile.ZipFile(docx_path, 'w', compression=zipfile.ZIP_DEFLATED) as docx:
    docx.writestr('[Content_Types].xml', content_types)
    docx.writestr('_rels/.rels', rels)
    docx.writestr('word/document.xml', doc_xml)

print(f"Generated {docx_path} successfully!")
