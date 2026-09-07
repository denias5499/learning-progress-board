"""
v1.6.132b: 修 generateNote 用 Step 2~6 結構
"""
with open('wrong-notes/index.html', 'r') as f:
    c = f.read()

old = '''cards.forEach(card => {
            const imgUrl = card.querySelector('img').src;
            const subj = card.querySelector('.subj-sel').value || '未分類';
            const vol = card.querySelector('.vol-sel').style.display !== 'none' ? `[${card.querySelector('.vol-sel').value}]` : '';
            const unit = card.querySelector('.unit-sel').value || '';
            
            let source = card.querySelector('.source-sel').value;
            if(source === '其他') source = card.querySelector('.custom-source').value || '自訂來源';

            const checkboxes = card.querySelectorAll('.reasons-group input:checked');
            const reasons = Array.from(checkboxes).map(cb => cb.value);

            const slot = document.createElement('div');
            slot.className = 'note-slot editable-slot';
            slot.dataset.date = dateStr;
            slot.dataset.subject = subj;
            slot.dataset.volume = card.querySelector('.vol-sel').style.display !== 'none' ? card.querySelector('.vol-sel').value : '';
            slot.dataset.unit = unit;
            slot.dataset.source = source;
            slot.dataset.reasons = JSON.stringify(reasons);'''

new = '''cards.forEach(card => {
            const imgUrl = card.querySelector('img').src;
            const subj = card.querySelector('.subj-sel').value || '未分類';
            const typeName = card.querySelector('.type-sel').value || '';
            const instName = card.querySelector('.inst-sel').value || '';
            const unit = card.querySelector('.unit-sel').value || '';
            
            const checkboxes = card.querySelectorAll('.reasons-group input:checked');
            const reasons = Array.from(checkboxes).map(cb => cb.value);

            const slot = document.createElement('div');
            slot.className = 'note-slot editable-slot';
            slot.dataset.date = dateStr;
            slot.dataset.subject = subj;
            slot.dataset.typeName = typeName;
            slot.dataset.instanceName = instName;
            slot.dataset.unit = unit;
            slot.dataset.reasons = JSON.stringify(reasons);'''

assert old in c, 'old generateNote not found'
c = c.replace(old, new)

# 改 header 顯示用
old2 = '''<span>📖 ${subj} ${vol} ${unit}</span>
                    <span>🏷️ ${source}</span>'''
new2 = '''<span>📖 ${subj} / ${typeName} / ${instName} / ${unit}</span>'''
assert old2 in c, 'old header not found'
c = c.replace(old2, new2)

with open('wrong-notes/index.html', 'w') as f:
    f.write(c)
print('OK')
