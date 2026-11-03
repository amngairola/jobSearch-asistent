with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'r', encoding='utf-8') as f:
    s = f.read()

target = "var obj1 = parser.getObj();\n      var obj2 = parser.getObj();\n      var obj3 = parser.getObj();"
replacement = """var obj1 = parser.getObj();
      var obj2 = parser.getObj();
      var obj3 = parser.getObj();
      console.log('RAW PARSED OBJS:', { obj1, obj2, obj3 });"""

s = s.replace(target, replacement, 1)
with open('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js', 'w', encoding='utf-8') as f:
    f.write(s)
print("Updated raw parsed objs print!")
