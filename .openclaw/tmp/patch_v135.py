"""
v1.6.135: 5 個修改
(1) header 對齊 dashboard 寬度
(2) 完成選取時檢查 cards-slider 是否為空
(3) 移除附件的使用者下拉選單 (用 localStorage 讀 current user)
(4) 修 saveNotes() 不動作的 bug
(5) note page 對齊 dashboard 寬度
"""
with open('wrong-notes/index.html', 'r') as f:
    c = f.read()

# (1) + (5) 拿掉 max-width 限制 + 拿掉 padding
# .app-container 是 max-width: 100%; width: 100%; max-width: 100%; — 但內部某些 wrapper 有 max-width
# 找 .app-container CSS 跟 note-modal-container
old_app_container = '.app-container { margin: 20px auto; padding: 20px; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; min-height: calc(100vh - 90px); max-width: 100%; width: 100%; }'
if old_app_container in c:
    new_app_container = '.app-container { margin: 0 auto; padding: 0; background: transparent; box-shadow: none; display: flex; flex-direction: column; min-height: calc(100vh - 90px); max-width: 100%; width: 100%; }'
    c = c.replace(old_app_container, new_app_container)
    print('(1) app-container: 拿掉 padding + max-width 100%')
else:
    print('(1) app-container old not found — 可能已經改過')

# note-modal-container 對齊 (note page)
old_modal_container = 'width: 100%; max-width: 800px; border-radius: 12px 12px 0 0; box-shadow: 0 2px 10px rgba(0,0,0,0.05);'
if old_modal_container in c:
    new_modal_container = 'width: 100%; max-width: 100%; border-radius: 0; box-shadow: none;'
    c = c.replace(old_modal_container, new_modal_container)
    print('(5) note-modal-container 對齊 dashboard')
else:
    print('(5) note-modal-container not found')

# note-img-area 跟 note-slot padding — 因為 .note-slot 本身有 padding
old_note_slot = '.note-slot { background: #fff; border-radius: 12px; padding: 0; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; transition: box-shadow 0.3s; }'
if old_note_slot in c:
    new_note_slot = '.note-slot { background: #fff; border-radius: 0; padding: 0; margin-bottom: 25px; box-shadow: none; overflow: hidden; transition: box-shadow 0.3s; border: 1px solid #eee; }'
    c = c.replace(old_note_slot, new_note_slot)
    print('note-slot 對齊 + 拿掉 padding')
else:
    print('note-slot old not found')

# (2) finishCropping 加檢查
old_finish = '''function finishCropping() {
        document.getElementById('crop-modal').style.display = 'none';
        if(document.getElementById('settings-container').style.display === 'block') {
            document.getElementById('settings-container').scrollIntoView({ behavior: 'smooth' });
        }
    }'''
new_finish = '''function finishCropping() {
        // v1.6.135: 檢查 cards-slider 內這 batch 是否有卡片
        const batchCards = document.querySelectorAll('.file-card[data-batch-id="' + batchCounter + '"]');
        if (batchCards.length === 0) {
            alert('⚠️ 尚未完成錯題選擇!\\n請按「+」按鈕將框選的題目加入清單。');
            return;
        }
        document.getElementById('crop-modal').style.display = 'none';
        if(document.getElementById('settings-container').style.display === 'block') {
            document.getElementById('settings-container').scrollIntoView({ behavior: 'smooth' });
        }
    }'''
assert old_finish in c, 'finishCropping old not found'
c = c.replace(old_finish, new_finish)

# (3) 移除使用者 dropdown HTML 跟 JS
old_dropdown_html = '''<div class="student-panel">
            <div class="sp-avatar"><span id="sp-avatar-emoji">👦</span></div>
            <div class="sp-select-wrapper"><select id="student-name"></select></div>
        </div>'''
new_dropdown_html = '<div id="current-user-display" style="color:var(--theme-blue);font-weight:bold;font-size:14px;padding:6px 12px;"></div>'
assert old_dropdown_html in c, 'student-panel HTML not found'
c = c.replace(old_dropdown_html, new_dropdown_html)

# 移除 studentsData 跟 window.onload populate
old_students = '''let studentsData = [{ id: 'stu1', name: '高二 (大寶)', type: 'emoji', value: '👦' }];
    
    let isManualAdding = false;
    let manualBoxes = [];

    window.onload = () => {
        const select = document.getElementById('student-name');
        studentsData.forEach(s => select.add(new Option(s.name, s.id)));
        
        const fSubj = document.getElementById('filter-subject');
        Object.keys(syllabusDB).forEach(sub => fSubj.add(new Option(sub, sub)));
        
        setupDragAndDrop();
    };'''
new_students = '''let isManualAdding = false;
    let manualBoxes = [];

    // v1.6.135: 從 localStorage 讀當前使用者 (附件跟主專案共用 StudyMap_CurrentUserId_V20)
    function getCurrentUser() {
        try {
            var uid = localStorage.getItem('StudyMap_CurrentUserId_V20');
            var raw = localStorage.getItem('StudyMap_Family_Data_V20');
            if (!uid || !raw) return { name: '未登入', emoji: '👤' };
            var data = JSON.parse(raw);
            var user = data[uid];
            if (!user) return { name: '未登入', emoji: '👤' };
            return {
                name: user.name || uid,
                emoji: user.avatar || user.emoji || '👤'
            };
        } catch(e) {
            console.error('[v1.6.135 getCurrentUser]', e);
            return { name: '未登入', emoji: '👤' };
        }
    }

    function refreshUserDisplay() {
        var user = getCurrentUser();
        var display = document.getElementById('current-user-display');
        if (display) display.textContent = user.emoji + ' ' + user.name;
    }

    document.addEventListener('DOMContentLoaded', function() {
        refreshUserDisplay();
        var fSubj = document.getElementById('filter-subject');
        if (fSubj) Object.keys(syllabusDB).forEach(function(sub) {
            var opt = document.createElement('option');
            opt.value = sub; opt.textContent = sub;
            fSubj.appendChild(opt);
        });
        setupDragAndDrop();
    });'''
assert old_students in c, 'studentsData not found'
c = c.replace(old_students, new_students)

# (4) saveNotes() 修 bug — 用 typeName/instanceName 取代 volume + 加 try/catch 保護
old_save = '''function saveNotes() {
        const slots = document.querySelectorAll('.editable-slot');
        let savedNotes = JSON.parse(localStorage.getItem('myStudyNotes') || '[]');
        
        slots.forEach(slot => {
            savedNotes.unshift({ 
                date: slot.dataset.date,
                timestamp: Date.now() + Math.random(),
                subject: slot.dataset.subject,
                volume: slot.dataset.volume,
                unit: slot.dataset.unit,
                source: slot.dataset.source,
                reasons: JSON.parse(slot.dataset.reasons),
                imgUrl: slot.querySelector('img').src,
                content: slot.querySelector('.note-grid-area').innerHTML
            });
        });

        localStorage.setItem('myStudyNotes', JSON.stringify(savedNotes));
        hasUnsavedNotes = false; 
        
        alert("✅ 筆記已成功儲存！");
        document.getElementById('cards-slider').innerHTML = '';
        document.getElementById('settings-container').style.display = 'none';
        currentFilesData = [];

        goToPage('view-page', document.getElementById('nav-view'));
    }'''
new_save = '''function saveNotes() {
        // v1.6.135: 修 v1.6.132 拆 dropdown 之後 slot.dataset.volume 變 undefined 的問題
        // 改用 typeName + instanceName 取代 volume
        const slots = document.querySelectorAll('.editable-slot');
        let savedNotes = [];
        try { savedNotes = JSON.parse(localStorage.getItem('myStudyNotes') || '[]'); }
        catch(e) { console.error('[v1.6.135 saveNotes] parse 失敗:', e); savedNotes = []; }
        
        slots.forEach(function(slot) {
            savedNotes.unshift({
                date: slot.dataset.date,
                timestamp: Date.now() + Math.random(),
                subject: slot.dataset.subject,
                typeName: slot.dataset.typeName,
                instanceName: slot.dataset.instanceName,
                unit: slot.dataset.unit,
                source: slot.dataset.source,
                reasons: JSON.parse(slot.dataset.reasons || '[]'),
                imgUrl: slot.querySelector('img') ? slot.querySelector('img').src : '',
                content: slot.querySelector('.note-grid-area') ? slot.querySelector('.note-grid-area').innerHTML : ''
            });
        });

        try {
            localStorage.setItem('myStudyNotes', JSON.stringify(savedNotes));
        } catch(e) {
            alert('❌ 儲存失敗:' + e.message);
            return;
        }
        hasUnsavedNotes = false;

        alert('✅ 筆記已成功儲存!');
        try {
            document.getElementById('cards-slider').innerHTML = '';
            document.getElementById('settings-container').style.display = 'none';
            currentFilesData = [];
            goToPage('view-page', document.getElementById('nav-view'));
        } catch(e) {
            console.error('[v1.6.135 saveNotes] UI reset 失敗:', e);
            // 即便 UI reset 失敗, 儲存已成功, 提示 user 手動切到查看頁
            if (confirm('筆記已儲存,但頁面跳轉失敗,要手動切到「查看錯題筆記」嗎?')) {
                window.location.reload();
            }
        }
    }'''
assert old_save in c, 'saveNotes old not found'
c = c.replace(old_save, new_save)

# title
with open('index.html', 'r') as f:
    idx = f.read()
idx = idx.replace('[v1.6.134]', '[v1.6.135]', 1)

with open('index.html', 'w') as f:
    f.write(idx)
with open('wrong-notes/index.html', 'w') as f:
    f.write(c)

print('OK — v1.6.135 patch 完成')
