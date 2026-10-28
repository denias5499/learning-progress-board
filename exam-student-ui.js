/* One student-scoped exam context, shared with the wrong-note application. */
var appMockExams = [];
var _meStudentEpoch = 0;
function loadStudentMockExams() {
    appMockExams = StudyRecords.list('exams', currentUserId);
    return appMockExams;
}
function saveStudentMockExams() {
    StudyRecords.replace('exams', currentUserId, appMockExams);
}
function resetStudentExamContext() {
    _meStudentEpoch++;
    loadStudentMockExams();
    _meCurrentExam = null;
    _meLevelImageData = null;
    _meReviewEditMode = {};
    var content = document.getElementById('mockexam-content');
    if (content) content.innerHTML = '';
    var page = document.getElementById('page-mockexam');
    if (page && page.style.display !== 'none') switchMockExamView('overview');
    document.querySelectorAll('iframe[src*="wrong-notes/"]').forEach(function(frame) {
        frame.contentWindow.postMessage({ type: 'studymap-user-changed' }, location.origin);
    });
}
function renderMockExamNotes(content) {
    content.innerHTML = '<p>目前學生：' + escapeHtml(multiData[currentUserId].name) +
        '。以下只顯示本學生的模考錯題；新增錯題將前往統一匯入頁。</p>' +
        '<iframe title="模考錯題" src="wrong-notes/?v=155&mode=mockExam" style="width:100%;height:75vh;min-height:600px;border:0;"></iframe>';
}
function appendPendingExamNotice(content) {
    var pending = StudyRecords.pending('exams').length;
    if (!pending) return;
    var note = document.createElement('div');
    note.style.cssText = 'padding:10px;background:#fff8da;border-radius:6px;margin-bottom:10px;';
    note.textContent = '有 ' + pending + ' 筆舊模考尚未確認學生歸屬；原始資料仍保留，不會混入目前學生。';
    var button = document.createElement('button'); button.textContent = '確認舊資料歸屬';
    button.onclick = function() { openSettings(); document.getElementById('legacy-ownership').scrollIntoView(); };
    note.appendChild(button); content.prepend(note);
}
function openUnifiedWrongNoteImport(examId) {
    if (examId) StudyRecords.validateExam(currentUserId, examId);
    showPage('page-wrongnotes');
    var frame = document.querySelector('#page-wrongnotes iframe');
    frame.src = 'wrong-notes/?v=155&view=import&source=mockExam' + (examId ? '&examId=' + encodeURIComponent(examId) : '');
}

// Legacy records remain intact until the owner is explicitly chosen and confirmed.
var _pendingOwnership = { exams: [], notes: [] };
function renderLegacyOwnership() {
    var root = document.getElementById('legacy-ownership');
    if (!root) return;
    var previous = document.getElementById('legacy-owner');
    var owner = previous ? previous.value : '';
    _pendingOwnership = { exams: StudyRecords.pending('exams'), notes: StudyRecords.pending('notes') };
    var count = _pendingOwnership.exams.length + _pendingOwnership.notes.length;
    root.hidden = count === 0;
    if (!count) { root.innerHTML = ''; return; }
    root.innerHTML = '<h3>舊資料歸屬確認（' + count + ' 筆）</h3>' +
        '<p>這些資料沒有學生身分，已保留但不混入任何學生的成績或錯題。請先備份，再勾選並指定歸屬。</p>' +
        '<label>歸屬學生 <select id="legacy-owner" onchange="renderLegacyOwnership()"><option value="">請明確選擇學生</option>' +
        Object.keys(multiData).map(function(uid) { return '<option value="' + escapeHtml(uid) + '"' + (uid === owner ? ' selected' : '') + '>' + escapeHtml(multiData[uid].name) + '</option>'; }).join('') + '</select></label>';
    root.querySelector('#legacy-owner').onchange = renderLegacyOwnership;
    ['exams', 'notes'].forEach(function(kind) {
        var box = document.createElement('div');
        var title = document.createElement('h4'); title.textContent = kind === 'exams' ? '模考成績／場次' : '錯題'; box.appendChild(title);
        _pendingOwnership[kind].forEach(function(item, index) {
            var label = document.createElement('label'); label.style.display = 'block';
            var input = document.createElement('input'); input.type = 'checkbox'; input.dataset.legacyKind = kind; input.value = index; input.style.width = 'auto';
            label.appendChild(input);
            var r = item.record;
            label.appendChild(document.createTextNode(' ' + (r.name || r.subject || '未命名') + ' ' + (r.examDate || r.date || '') + (r.source ? '｜' + r.source : '')));
            box.appendChild(label);
        });
        if (kind === 'notes') {
            var select = document.createElement('select'); select.id = 'legacy-exam';
            select.add(new Option('可選：關聯此學生的模考場次', ''));
            if (owner) StudyRecords.list('exams', owner).forEach(function(exam) { select.add(new Option(exam.name + ' ' + (exam.examDate || ''), exam.id)); });
            box.appendChild(select);
        }
        var button = document.createElement('button'); button.textContent = '確認所選' + (kind === 'exams' ? '模考' : '錯題') + '的歸屬';
        button.onclick = function() {
            if (!owner) return alert('請先選擇歸屬學生');
            var selected = Array.from(root.querySelectorAll('input[data-legacy-kind="' + kind + '"]:checked'));
            if (!selected.length) return alert('請先勾選資料');
            if (!confirm('確定將這 ' + selected.length + ' 筆資料歸給「' + multiData[owner].name + '」？')) return;
            try {
                StudyRecords.claim(kind, owner, selected.map(function(input) { return _pendingOwnership[kind][Number(input.value)].token; }), kind === 'notes' ? document.getElementById('legacy-exam').value : '');
                loadStudentMockExams(); renderLegacyOwnership();
                alert('已確認歸屬，原始內容與圖片保留。');
            } catch (e) { alert('歸屬確認失敗：' + e.message); }
        };
        box.appendChild(button); root.appendChild(box);
    });
}
window.addEventListener('message', function(event) {
    if (event.origin !== location.origin || !event.data) return;
    var ownFrame = Array.from(document.querySelectorAll('iframe[src*="wrong-notes/"]')).some(function(frame) { return frame.contentWindow === event.source; });
    if (!ownFrame) return;
    if (event.data.type === 'studymap-import-notes') openUnifiedWrongNoteImport(event.data.examId || '');
    if (event.data.type === 'studymap-legacy-settings') { openSettings(); document.getElementById('legacy-ownership').scrollIntoView(); }
});
window.addEventListener('storage', function(event) {
    if (event.key === 'StudyMap_MockExams' && typeof currentUserId !== 'undefined') resetStudentExamContext();
});
