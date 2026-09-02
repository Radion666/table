import pathlib 
p = pathlib.Path(r'c:/Users/admin/Desktop/table/table/timesheet/src/main.ts') 
t = p.read_text(encoding='utf-8') 
old = 'await app.listen(PORT, () =' + chr(62) 
new = 'await app.listen(PORT, ' + chr(39) + '0.0.0.0' + chr(39) + ', () =' + chr(62) 
t = t.replace(old, new) 
p.write_text(t, encoding='utf-8') 
print('done') 
