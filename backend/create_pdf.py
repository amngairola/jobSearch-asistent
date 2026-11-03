import os

# Create valid minimal PDF with exact cross-reference table
def create_pdf(filename, text_lines):
    # PDF Header
    pdf = b"%PDF-1.4\n"
    offsets = {}

    def add_object(obj_num, data):
        nonlocal pdf
        offsets[obj_num] = len(pdf)
        pdf += f"{obj_num} 0 obj\n".encode('ascii') + data + b"\nendobj\n"

    # Catalog
    add_object(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    # Pages
    add_object(2, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    
    # Text stream
    stream_content = b"BT\n/F1 12 Tf\n50 750 Td\n15 TL\n"
    for line in text_lines:
        safe_line = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        stream_content += f"({safe_line}) '\n".encode('utf-8')
    stream_content += b"ET\n"

    # Page
    add_object(3, b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>")
    # Font
    add_object(4, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    # Contents
    add_object(5, f"<< /Length {len(stream_content)} >>\nstream\n".encode('ascii') + stream_content + b"endstream")

    # XRef
    xref_offset = len(pdf)
    num_objs = 6
    xref = f"xref\n0 {num_objs}\n0000000000 65535 f \r\n".encode('ascii')
    for i in range(1, num_objs):
        xref += f"{offsets[i]:010d} 00000 n \r\n".encode('ascii')

    pdf += xref
    trailer = f"trailer\n<< /Size {num_objs} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode('ascii')
    pdf += trailer

    with open(filename, 'wb') as f:
        f.write(pdf)
    print(f"Created valid PDF {filename} ({len(pdf)} bytes)")

resume_lines = [
    "Aman Sharma",
    "Senior Full Stack Engineer",
    "Email: aman.sharma@example.com | Phone: +91-9876543210",
    "Location: Bangalore, India",
    "",
    "Summary: Experienced software engineer specializing in React, Node.js, and TypeScript.",
    "",
    "Skills: JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB, Tailwind CSS, Python",
    "",
    "Experience:",
    "Senior Full Stack Developer at TechSolutions (2022 - Present)",
    "- Built web apps with React and microservices in Node.js.",
    "Frontend Developer at WebCraft (2020 - 2022)",
    "- Designed UI components using React, Redux, and Tailwind CSS.",
    "",
    "Education:",
    "Bachelor of Engineering in Computer Science, 2020",
    "Bangalore Institute of Technology",
    "",
    "Projects:",
    "AI Job Assistant - Multi-agent job search and application portal",
    "",
    "Certifications:",
    "AWS Certified Solutions Architect"
]

out_pdf = os.path.join(os.path.dirname(__file__), 'sample_resume.pdf')
create_pdf(out_pdf, resume_lines)
