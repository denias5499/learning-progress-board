var noteStudentId = localStorage.getItem('StudyMap_CurrentUserId_V20') || '';
var notePageOptions = new URLSearchParams(location.search);
function requireNoteStudent() {
    var uid = localStorage.getItem('StudyMap_CurrentUserId_V20') || '';
    if (!uid || uid !== noteStudentId) throw new Error('學生已切換，請重新開啟錯題頁');
    return uid;
}
function currentStudentNotes() { return StudyRecords.list('notes', requireNoteStudent()); }
function studentExamLabel(exam) { return exam.name; }
var noteSourceNames = ['複習卷', '數字題本', '模擬題本', '歷屆模考'];
function refreshNoteSourceOptions() {
    var select = document.getElementById('filter-source');
    if (!select) return;
    var chosen = select.value;
    select.innerHTML = ''; select.add(new Option('全部來源', ''));
    noteSourceNames.forEach(function(name) { select.add(new Option(name, name)); });
    select.add(new Option('115模考', 'mockExam'));
    var legacy = new Set();
    currentStudentNotes().forEach(function(note) {
        if (note.sourceType !== 'mockExam' && note.source && !noteSourceNames.includes(note.source)) legacy.add(note.source);
    });
    legacy.forEach(function(name) { select.add(new Option(name, name)); });
    select.add(new Option('未分類來源', '__unclassified'));
    if (Array.from(select.options).some(function(option) { return option.value === chosen; })) select.value = chosen;
}
function syncNoteSourceFilter() {
    var source = document.getElementById('filter-source');
    var exam = document.getElementById('filter-exam');
    var showExam = notePageOptions.get('mode') === 'mockExam' || source.value === 'mockExam';
    exam.hidden = !showExam;
    if (!showExam) exam.value = '';
}
function fillStudentExamSelect(select, chosen) {
    select.innerHTML = ''; select.add(new Option('請選擇模考場次', ''));
    StudyRecords.list('exams', requireNoteStudent()).forEach(function(exam) { select.add(new Option(studentExamLabel(exam), exam.id)); });
    if (chosen && Array.from(select.options).some(function(option) { return option.value === chosen; })) select.value = chosen;
}
function addCardExamFields(card) {
    card.dataset.userId = requireNoteStudent();
    var source = card.querySelector('.source-sel');
    var box = document.createElement('div'); box.className = 'mock-exam-fields';
    var select = document.createElement('select'); select.className = 'exam-sel';
    fillStudentExamSelect(select, notePageOptions.get('examId'));
    var label = document.createElement('label'); label.textContent = '模考場次'; label.appendChild(select); box.appendChild(label);
    var button = document.createElement('button'); button.type = 'button'; button.textContent = '新增模考場次（可稍後輸入成績）';
    button.onclick = function() {
        var uid = requireNoteStudent();
        var name = prompt('模考場次名稱', '第一次模考'); if (!name || !name.trim()) return;
        var date = prompt('考試日期（YYYY-MM-DD，可留空）', ''); if (date === null) return;
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('請使用 YYYY-MM-DD 格式');
        var exam = StudyRecords.createSession(uid, name.trim(), date);
        document.querySelectorAll('.exam-sel').forEach(function(el) { fillStudentExamSelect(el, el === select ? exam.id : el.value); });
    };
    box.appendChild(button); source.insertAdjacentElement('afterend', box);
    if (notePageOptions.get('source') === 'mockExam') source.value = 'mockExam';
    box.hidden = source.value !== 'mockExam';
}
function updateNoteViewFilters() {
    var exam = document.getElementById('filter-exam');
    if (exam) { var chosen = exam.value; fillStudentExamSelect(exam, chosen); exam.options[0].text = '全部模考場次'; }
    refreshNoteSourceOptions(); syncNoteSourceFilter();
    renderViewPage();
}
function noteMatchesSource(note) {
    var source = document.getElementById('filter-source').value;
    var exam = document.getElementById('filter-exam').value;
    if (notePageOptions.get('mode') === 'mockExam' || source === 'mockExam') {
        return note.sourceType === 'mockExam' && (!exam || note.examId === exam);
    }
    if (source === '__unclassified') return note.sourceType !== 'mockExam' && !note.source;
    if (source) return note.sourceType !== 'mockExam' && note.source === source;
    return true;
}
function requestUnifiedImport() {
    var examId = document.getElementById('filter-exam').value;
    if (parent !== window) parent.postMessage({ type: 'studymap-import-notes', examId: examId }, location.origin);
    else location.href = './?v=159&view=import' + (examId ? '&source=mockExam&examId=' + encodeURIComponent(examId) : '');
}
function addSavedNoteAssociationControls(slot, note) {
    var box = document.createElement('div'); box.className = 'saved-note-fields'; box.hidden = true;
    var source = document.createElement('select'); source.className = 'saved-source';
    source.add(new Option('其他來源／保留原來源', 'other')); source.add(new Option('115模考', 'mockExam'));
    source.value = note.sourceType === 'mockExam' ? 'mockExam' : 'other';
    var exam = document.createElement('select'); exam.className = 'saved-exam'; fillStudentExamSelect(exam, note.examId);
    exam.hidden = source.value !== 'mockExam'; source.onchange = function() { exam.hidden = source.value !== 'mockExam'; };
    var label = document.createElement('label'); label.textContent = '錯題來源與模考場次'; box.append(label, source, exam);
    slot.querySelector('.note-left').appendChild(box);
}
document.addEventListener('DOMContentLoaded', function() {
    var bar = document.querySelector('.filter-bar');
    var source = document.createElement('select'); source.id = 'filter-source'; source.className = 'filter-select';
    source.onchange = function() { syncNoteSourceFilter(); renderViewPage(); }; bar.prepend(source);
    refreshNoteSourceOptions();
    var exam = document.createElement('select'); exam.id = 'filter-exam'; exam.className = 'filter-select';
    fillStudentExamSelect(exam); exam.options[0].text = '全部模考場次'; exam.onchange = renderViewPage; source.insertAdjacentElement('afterend', exam);
    document.getElementById('filter-time').value = 'all';
    var info = document.createElement('div'); info.style.cssText = 'padding:10px;background:#fff8da;margin:8px 0;';
    var family = JSON.parse(localStorage.getItem('StudyMap_Family_Data_V20') || '{}');
    info.textContent = '目前學生：' + ((family[noteStudentId] || {}).name || '請先選擇學生');
    var pending = StudyRecords.pending('notes').length;
    if (pending) {
        info.appendChild(document.createTextNode('｜有 ' + pending + ' 筆舊錯題待確認歸屬，原始資料仍保留。'));
        var button = document.createElement('button'); button.textContent = '前往歸屬確認';
        button.onclick = function() { if (parent !== window) parent.postMessage({ type: 'studymap-legacy-settings' }, location.origin); };
        info.appendChild(button);
    }
    document.querySelector('.app-container').prepend(info);
    if (notePageOptions.get('mode') === 'mockExam') {
        document.querySelector('.top-navbar').hidden = true;
        var style = document.createElement('style');
        style.textContent = '.top-navbar[hidden],.note-action-btns,.btn-delete-note{display:none!important}';
        document.head.appendChild(style);
        source.value = 'mockExam'; source.hidden = true;
        var add = document.createElement('button'); add.textContent = '新增模考錯題'; add.onclick = requestUnifiedImport; bar.prepend(add);
        goToPage('view-page', null);
    } else if (notePageOptions.get('view') === 'import') goToPage('import-page', document.getElementById('nav-import'));
    syncNoteSourceFilter();
});
window.addEventListener('storage', function(event) {
    if (event.key === 'StudyMap_CurrentUserId_V20' && localStorage.getItem(event.key) !== noteStudentId) location.reload();
    else if (event.key === 'myStudyNotes' || event.key === 'StudyMap_MockExams') updateNoteViewFilters();
});
window.addEventListener('message', function(event) {
    if (event.origin !== location.origin || event.source !== parent || !event.data) return;
    if (event.data.type === 'studymap-user-changed' && localStorage.getItem('StudyMap_CurrentUserId_V20') !== noteStudentId) location.reload();
});
