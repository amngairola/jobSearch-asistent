with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'r', encoding='utf-8') as f:
    s = f.read()

target = "var stream = this.stream.makeSubStream(xrefEntry.offset + this.stream.start);"
replacement = "console.log('ENTRY DEBUG:', xrefEntry, 'start:', this.stream.start); var stream = this.stream.makeSubStream(xrefEntry.offset + this.stream.start);"

s = s.replace(target, replacement, 1)
with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'w', encoding='utf-8') as f:
    f.write(s)
print("Updated!")
