with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'r', encoding='utf-8') as f:
    s = f.read()

target = 'if (obj1 !== num || obj2 !== gen || !(0, _primitives.isCmd)(obj3)) {'
replacement = 'if (obj1 !== num || obj2 !== gen || !(0, _primitives.isCmd)(obj3)) { console.log("XREF DEBUG:", obj1, num, obj2, gen, obj3);'

if target in s:
    s = s.replace(target, replacement, 1)
    with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'w', encoding='utf-8') as f:
        f.write(s)
    print("Patched successfully!")
else:
    print("Target already patched or not found")
