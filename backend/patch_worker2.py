with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'r', encoding='utf-8') as f:
    s = f.read()

target = 'console.log("XREF DEBUG:", obj1, num, obj2, gen, obj3);'
replacement = 'console.log("XREF DEBUG:", {obj1, num, obj2, gen, obj3, pos: this.buf.pos, bytes: this.buf.bytes ? String.fromCharCode.apply(null, this.buf.bytes.subarray(this.buf.pos - 10, this.buf.pos + 30)) : "no bytes"});'

s = s.replace(target, replacement, 1)
with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'w', encoding='utf-8') as f:
    f.write(s)
print("Updated debug log!")
