"""
v1.6.133: Step 6 錯誤原因 = user 自己填 (checkbox 常見 + 其他自填)
- 之前: 純 checkbox 寫死 觀念模糊/題目陷阱/粗心
- 現在: 4 個 checkbox 常見 + 「其他」自填 input
- 收集: checkbox 值 + 其他 input 值 (如果有填)
"""
with open('wrong-notes/index.html', 'r') as f:
    c = f.read()

old_reason = '''<div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 6：錯誤原因</div>
            <div class="checkbox-group reasons-group">
                <label><input type="checkbox" value="觀念模糊"> 觀念模糊</label>
                <label><input type="checkbox" value="題目陷阱"> 題目陷阱</label>
                <label><input type="checkbox" value="粗心"> 粗心</label>
            </div>'''

new_reason = '''<div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 6：錯誤原因 (可複選 + 其他自填)</div>
            <div class="checkbox-group reasons-group">
                <label><input type="checkbox" value="粗心"> 粗心</label>
                <label><input type="checkbox" value="觀念不清"> 觀念不清</label>
                <label><input type="checkbox" value="計算錯誤"> 計算錯誤</label>
                <label><input type="checkbox" value="背不起來"> 背不起來</label>
            </div>
            <input type="text" class="custom-reason" placeholder="或自填其他原因..." style="margin-top:5px;width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;">'''

assert old_reason in c, 'old Step 6 not found'
c = c.replace(old_reason, new_reason)

# generateNote 收集 reason (改用 custom-reason + reasons-group)
old_collect = '''const checkboxes = card.querySelectorAll('.reasons-group input:checked');
            const reasons = Array.from(checkboxes).map(cb => cb.value);'''
new_collect = '''const checkboxes = card.querySelectorAll('.reasons-group input:checked');
            const reasons = Array.from(checkboxes).map(cb => cb.value);
            const customReason = (card.querySelector('.custom-reason') || {}).value || '';
            if (customReason) reasons.push(customReason);'''
assert old_collect in c, 'old collect not found'
c = c.replace(old_collect, new_collect)

# title
c = c.replace('[v1.6.132]', '[v1.6.133]', 1)
with open('index.html', 'r') as f:
    idx = f.read()
idx = idx.replace('[v1.6.132]', '[v1.6.133]', 1)
with open('index.html', 'w') as f:
    f.write(idx)

with open('wrong-notes/index.html', 'w') as f:
    f.write(c)
print('OK')
