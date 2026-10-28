const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const family = { A: { name: '張裕宣', masters: {}, missions: {}, plans: [], logs: [], _v144Empty: true },
    B: { name: '張裕如', masters: {}, missions: {}, plans: [], logs: [], _v144Empty: true } };
const exams = [{ id: 'a', userId: 'A', name: '第一次模考', examDate: '2026-10-01', subjects: {} },
    { id: 'b', userId: 'B', name: '第一次模考', examDate: '2026-10-02', subjects: {} },
    { id: 'old', name: '未歸屬模考', subjects: {} }];
const notes = [{ timestamp: 1, userId: 'A', sourceType: 'mockExam', examId: 'a', subject: '數學', date: '2026/10/28', reasons: [], content: 'A專屬錯題', source: '模考' },
    { timestamp: 2, userId: 'B', sourceType: 'mockExam', examId: 'b', subject: '數學', date: '2026/10/28', reasons: [], content: 'B專屬錯題', source: '模考' },
    { timestamp: 3, subject: '英文', date: '2026/10/28', reasons: [], content: '未歸屬錯題' }];
async function page(t, file, url) {
    const dom = new JSDOM(text(file), { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
    t.after(() => dom.window.close()); const w = dom.window;
    w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
    w.pdfjsLib = { GlobalWorkerOptions: {} };
    w.localStorage.setItem('StudyMap_CurrentUserId_V20', 'A');
    w.localStorage.setItem('StudyMap_Family_Data_V20', JSON.stringify(family));
    w.localStorage.setItem('StudyMap_MockExams', JSON.stringify(exams));
    w.localStorage.setItem('myStudyNotes', JSON.stringify(notes));
    w.eval(text('student-records.js'));
    w.eval(text(file === 'index.html' ? 'exam-student-ui.js' : 'wrong-notes/student-ui.js'));
    const errors = [];
    for (const m of text(file).matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
        try { w.eval(m[1]); } catch(e) { errors.push(e.message); }
    }
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(errors, [], 'inline scripts initialize');
    if (file === 'index.html') w._meGetReviewImages = async () => [];
    return w;
}
test('模考總覽、輸入與檢討跟隨學生切換，同名模考不顯示其他人資料', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    w.openMockExam();
    assert.equal(w.document.querySelector('#me-overview-exam-picker').value, 'a');
    w.document.querySelector('#user-selector').value = 'B'; w.switchUser();
    assert.equal(w._meCurrentExam, null); assert.equal(w._meLevelImageData, null);
    assert.equal(w.document.querySelector('#me-overview-exam-picker').value, 'b');
    assert.deepEqual(Array.from(w.appMockExams, e => e.id), ['b']);
    w.switchMockExamView('review');
    assert.equal(w.document.querySelector('#me-review-text-0').dataset.exam, 'b');
    w.switchMockExamView('notes');
    assert.match(w.document.querySelector('#mockexam-content iframe').src, /mode=mockExam/);
    assert.equal(w.document.querySelector('[data-metab="import"]'), null);
});
test('從成績表單儲存張裕如的同名模考，不覆蓋張裕宣', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    w.document.querySelector('#user-selector').value = 'B'; w.switchUser();
    w.switchMockExamView('input');
    w.loadExamToForm(w.appMockExams[0]);
    w.document.querySelector('#me-guo-correct').value = '20';
    w.saveMockExam();
    const saved = JSON.parse(w.localStorage.getItem('StudyMap_MockExams'));
    assert.equal(saved.find(e => e.id === 'a').subjects.國文, undefined);
    assert.equal(saved.find(e => e.id === 'b').subjects.國文.correct, 20);
    assert.equal(saved.find(e => e.id === 'old').userId, undefined);
});
test('錯題庫只顯示目前學生，模考檢視是同一份資料的篩選結果', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/?mode=mockExam');
    const root = w.document.querySelector('#view-slots-container');
    assert.match(root.textContent, /A專屬錯題/); assert.doesNotMatch(root.textContent, /B專屬|未歸屬錯題/);
    assert.equal(w.document.querySelector('#filter-exam').options.length, 2);
    assert.equal(w.document.querySelector('.top-navbar').hidden, true);
    assert.equal(w.StudyRecords.pending('notes').length, 1);
});
test('統一匯入頁可預填模考場次，儲存後使用學生與場次 ID', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/?view=import&source=mockExam&examId=a');
    const card = w.createSettingCard('data:image/png;base64,YWJj', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card);
    assert.equal(card.querySelector('.source-sel').value, 'mockExam');
    assert.equal(card.querySelector('.exam-sel').value, 'a');
    w._wnSaveImage = async () => 'saved-img';
    w.generateNote(); await w.saveNotes();
    const saved = w.StudyRecords.list('notes', 'A')[0];
    assert.equal(saved.userId, 'A'); assert.equal(saved.examId, 'a'); assert.equal(saved.sourceType, 'mockExam');
    assert.equal(saved.imageId, 'saved-img');
    assert.equal(w.StudyRecords.list('notes', 'B').length, 1);
});
test('沒有學生歸屬的舊資料需要明確勾選與確認，不會自動分配', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    w.openSettings();
    const box = w.document.querySelector('#legacy-ownership');
    assert.equal(box.hidden, false);
    assert.equal(w.document.querySelector('#legacy-owner').value, '');
    const owner = w.document.querySelector('#legacy-owner'); owner.value = 'B'; owner.dispatchEvent(new w.Event('change'));
    w.document.querySelector('input[data-legacy-kind="exams"]').checked = true;
    const button = Array.from(box.querySelectorAll('button')).find(b => b.textContent.includes('所選模考'));
    button.click();
    assert.equal(w.StudyRecords.list('exams', 'B').some(e => e.id === 'old'), true);
    assert.equal(w.StudyRecords.pending('notes').length, 1);
});
test('debug 重置按鈕與 Instance 說明不出現在頁面', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    assert.equal(w.document.querySelector('button[onclick="resetCurrentMaster()"]'), null);
    assert.equal(w.document.querySelector('button[onclick="resetAllUserData(currentUserId)"]'), null);
    assert.doesNotMatch(w.document.querySelector('#pane-master').textContent, /Instance 是同類型/);
});
test('切換學生後完成的舊級距圖讀取不會蓋掉新學生圖片', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    const data = exams.map(e => ({ ...e, levelChartImageId: e.id + '-image' }));
    w.localStorage.setItem('StudyMap_MockExams', JSON.stringify(data));
    const pending = { 'a-image': [], 'b-image': [] };
    w.loadMockExamImage = id => new Promise(resolve => pending[id].push(resolve));
    w.openMockExam();
    w.document.querySelector('#user-selector').value = 'B'; w.switchUser();
    pending['b-image'].forEach(resolve => resolve('data:image/png;base64,Qg=='));
    await new Promise(resolve => setTimeout(resolve, 0));
    pending['a-image'].forEach(resolve => resolve('data:image/png;base64,QQ=='));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.match(w.document.querySelector('#me-overview-level-img img').src, /Qg==/);
});
test('級距圖片儲存途中切換學生，完成後仍只更新原學生的模考', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    w.switchMockExamView('input'); w.loadExamToForm(w.appMockExams[0]);
    w._meLevelImageData = 'data:image/png;base64,QQ==';
    let finish; w.saveMockExamImage = () => new Promise(resolve => { finish = resolve; });
    w.saveMockExam();
    w.document.querySelector('#user-selector').value = 'B'; w.switchUser();
    finish('new-image-for-A'); await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(w.StudyRecords.list('exams', 'A')[0].levelChartImageId, 'new-image-for-A');
    assert.equal(w.StudyRecords.list('exams', 'B')[0].levelChartImageId, undefined);
    assert.equal(w.appMockExams[0].id, 'b');
});
test('錯題圖片上傳途中切換學生，不把待儲存筆記歸到新學生', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/?source=mockExam&examId=a');
    const card = w.createSettingCard('data:image/png;base64,YWJj', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card);
    let finish; w._wnSaveImage = () => new Promise(resolve => { finish = resolve; });
    w.generateNote(); const saving = w.saveNotes();
    w.localStorage.setItem('StudyMap_CurrentUserId_V20', 'B');
    finish('orphan-image'); await saving;
    assert.equal(w.StudyRecords.list('notes', 'A').length, 1);
    assert.equal(w.StudyRecords.list('notes', 'B').length, 1);
});
test('已確認歸屬的舊錯題可後補模考場次，兩個檢視讀取同一筆', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    w.StudyRecords.updateNote('A', 1, { sourceType: 'other', examId: '', source: '115模考-一模' });
    w.goToPage('view-page', w.document.querySelector('#nav-view'));
    const slot = w.document.querySelector('#view-slots-container .note-slot');
    w.enableViewEdit(1, slot.querySelector('.btn-edit-note'));
    slot.querySelector('.saved-source').value = 'mockExam';
    slot.querySelector('.saved-exam').value = 'a';
    w.saveViewEdit(1, slot.querySelector('.btn-save-note'));
    assert.equal(w.StudyRecords.list('notes', 'A').length, 1);
    assert.equal(w.StudyRecords.list('notes', 'A')[0].examId, 'a');
    assert.equal(w.StudyRecords.list('notes', 'B')[0].content, 'B專屬錯題');
});
test('新增同名的新場次使用新 ID，不能隱式覆蓋舊年度成績', async t => {
    const w = await page(t, 'index.html', 'http://localhost/');
    w.switchMockExamView('input');
    w.document.querySelector('#me-exam-name').value = '第一次模考';
    w.onMeExamNameChange(); w.saveMockExam();
    const own = w.StudyRecords.list('exams', 'A');
    assert.equal(own.length, 2);
    assert.equal(own.find(e => e.id === 'a').examDate, '2026-10-01');
    assert.equal(w.StudyRecords.list('exams', 'B').length, 1);
});
