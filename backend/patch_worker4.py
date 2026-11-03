with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'r', encoding='utf-8') as f:
    s = f.read()

target = "var obj1 = parser.getObj();"
replacement = "console.log('STREAM BYTES AT OFFSET:', stream.bytes ? String.fromCharCode.apply(null, stream.bytes.subarray(stream.start, stream.start + 20)) : 'none'); var obj1 = parser.getObj();"

s = s.replace(target, replacement, 1)
with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'w', encoding='utf-8') as f:
    f.write(s)
print("Updated stream print!")
