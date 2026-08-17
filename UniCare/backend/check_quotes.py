content = open(r'D:\MINI PROJECT\UniCare\backend\super_admin\workflows.py', 'rb').read()
i = 0
opens = []
while i < len(content):
    if content[i:i+3] == b'"""':
        opens.append(i)
        i += 3
    else:
        i += 1
print('Triple-quote count:', len(opens))
print('Balanced:', 'YES' if len(opens) % 2 == 0 else 'NO - MISMATCHED!')
# Show byte offsets around each and the line number
text = content.decode('utf-8', errors='replace')
for pos in opens:
    line_no = text[:pos].count('\n') + 1
    snippet = text[pos:pos+80].replace('\n', '\\n')
    print(f'  Line {line_no}: {snippet!r}')
