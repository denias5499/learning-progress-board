#!/usr/bin/env python3
with open('/mnt/my_book/Denias/projects/learning-progress-board/index.html') as f:
    lines = f.readlines()

# Line 12530 (0-indexed: 12529) is the var rowHtml li.tree-unit line
# We need to add onclick before the style= attribute
TARGET = "                        var rowHtml = '<li class=\"tree-unit\" style=\"display:grid; grid-template-columns: 1fr 100px 110px 150px 90px; gap:24px; align-items:center; padding:4px 24px; cursor:pointer; border-bottom:1px dashed #e2e8f0;">';"

REPLACEMENT = "                        var rowHtml = '<li class=\"tree-unit\" onclick=\"jumpToUnitCalendar(\\47' + u.id + '\\47, \\47' + escapeHtml(cat4jump) + '\\47, \\47' + escapeHtml(mis4jump) + '\\47);\" style=\"display:grid; grid-template-columns: 1fr 100px 110px 150px 90px; gap:24px; align-items:center; padding:4px 24px; cursor:pointer; border-bottom:1px dashed #e2e8f0;">';"

for i, line in enumerate(lines):
    if TARGET in line:
        print(f'Found at line {i+1}')
        lines[i] = REPLACEMENT + '\n'
        print('Replaced!')
        break
else:
    print('NOT FOUND')

with open('/mnt/my_book/Denias/projects/learning-progress-board/index.html', 'w') as f:
    f.writelines(lines)
