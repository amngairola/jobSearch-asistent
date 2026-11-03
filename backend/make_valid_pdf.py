def build_valid_pdf(filename, text_lines):
    # PDF specification ISO 32000-1 section 7.5.4:
    # Each entry in xref table is EXACTLY 20 bytes long:
    # 10 digits + space + 5 digits + space + 'n' (or 'f') + '\r\n' (or ' \n')
    
    bt = ["BT", "/F1 12 Tf", "72 750 Td", "14 TL"]
    for line in text_lines:
        clean = line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        bt.append(f"({clean}) '")
    bt.append("ET")
    content_str = "\n".join(bt) + "\n"
    content_bytes = content_str.encode('latin1')
    
    header = b"%PDF-1.4\n"
    
    obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    obj3 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
    obj4 = b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    obj5 = f"5 0 obj\n<< /Length {len(content_bytes)} >>\nstream\n".encode('latin1') + content_bytes + b"endstream\nendobj\n"
    
    offsets = [0]
    cur = len(header)
    
    offsets.append(cur)
    cur += len(obj1)
    
    offsets.append(cur)
    cur += len(obj2)
    
    offsets.append(cur)
    cur += len(obj3)
    
    offsets.append(cur)
    cur += len(obj4)
    
    offsets.append(cur)
    cur += len(obj5)
    
    xref_offset = cur
    # Exactly 20 bytes per entry:
    xref = b"xref\r\n0 6\r\n0000000000 65535 f\r\n"
    for i in range(1, 6):
        entry = f"{offsets[i]:010d} 00000 n\r\n".encode('latin1')
        assert len(entry) == 20, f"Entry length is {len(entry)}"
        xref += entry
        
    trailer = b"trailer\r\n<< /Size 6 /Root 1 0 R >>\r\nstartxref\r\n" + str(xref_offset).encode('latin1') + b"\r\n%%EOF\r\n"
    
    full_pdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer
    
    with open(filename, 'wb') as f:
        f.write(full_pdf)
    print(f"Generated {filename} with size {len(full_pdf)} bytes")

resume_lines = [
    "Aman Sharma",
    "Senior Full Stack Engineer",
    "Email: aman.sharma@example.com | Phone: +91-9876543210 | Location: Bangalore, India",
    "",
    "Skills: JavaScript, TypeScript, React, Next.js, Node.js, Express, MongoDB, Tailwind CSS, Python, Docker",
    "",
    "Experience:",
    "Senior Full Stack Developer at TechSolutions (2022 - Present)",
    "Architected scalable microservices and responsive web applications with React.",
    "Frontend Developer at WebCraft Systems (2020 - 2022)",
    "Developed reusable UI components using React, Redux, and Tailwind CSS.",
    "",
    "Education:",
    "Bachelor of Engineering in Computer Science, 2020",
    "Bangalore Institute of Technology",
    "",
    "Projects:",
    "AI Job Assistant - Career search and auto-matching platform with Groq LLM",
    "",
    "Certifications:",
    "AWS Certified Solutions Architect"
]

build_valid_pdf("sample_resume.pdf", resume_lines)
