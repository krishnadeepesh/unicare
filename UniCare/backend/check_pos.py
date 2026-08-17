content = open(r'D:\MINI PROJECT\UniCare\backend\super_admin\workflows.py', encoding='utf-8').read()
lines = content.splitlines()
for i in range(245, 265):
    print(f'Line {i+1}: {repr(lines[i])}')
