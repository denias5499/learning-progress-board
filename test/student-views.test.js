const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const family = { A: { name: '張裕宣', masters: { '會考': { '數學': {materials:{'複習講義':{instances:[{id:'bookA',name:'講義A',vols:{'第一冊':[{id:'unitA',name:'知識單元',start:1,end:2}]}}]}}}} }, missions: {'會考':{'一模':['unitA']}}, plans: [], logs: [], _v144Empty: true },
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
    w.eval(text('accuracy-duplicates.js'));
    w.eval(text('accuracy-duplicates-ui.js'));
    w.eval(text('note-links.js'));
    w.eval(text('student-records.js'));
    if(file !== 'index.html') w.eval(text('wrong-notes/note-links-ui.js'));
    w.eval(text('tree-progress.js'));
    w.eval(text('tree-scope.js'));
    w.eval(text('board-layout.js'));
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
    card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));
    card.querySelector('.unit-sel').selectedIndex=1;card.querySelector('.note-task').selectedIndex=1;
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
    card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));
    card.querySelector('.unit-sel').selectedIndex=1;card.querySelector('.note-task').selectedIndex=1;
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
    slot.querySelector('.saved-note-link-fields .unit-sel').selectedIndex=1;slot.querySelector('.saved-note-link-fields .note-task').selectedIndex=1;
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

test('反覆返回匯入頁後，同一次拖放仍只觸發一次匯入', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    let calls = 0; w.handleFilesForCrop = () => { calls++; };
    for (let i = 0; i < 3; i++) w.goToPage('import-page', null);
    const drop = new w.Event('drop', { bubbles: true, cancelable: true });
    drop.dataTransfer = { files: [new w.File(['photo'], 'question.jpg', { type: 'image/jpeg' })] };
    w.document.querySelector('.drop-zone').dispatchEvent(drop);
    assert.equal(calls, 1);
    const bodyDrop = new w.Event('drop', { bubbles: true, cancelable: true });
    bodyDrop.dataTransfer = drop.dataTransfer; w.document.body.dispatchEvent(bodyDrop);
    assert.equal(calls, 2, '頁面空白處拖放也只有一次');
});
test('同批重複照片只處理一次，處理中重入被忽略，完成後可再次匯入', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    let count = 0, release; w.renderImage = () => { count++; return new Promise(resolve => { release = resolve; }); };
    const file = new w.File(['photo'], 'question.jpg', { type: 'image/jpeg', lastModified: 1 });
    const first = w.handleFilesForCrop([file, file, file]);
    await w.handleFilesForCrop([file]); assert.equal(count, 1);
    release(); await first;
    w.renderImage = async () => { count++; }; await w.handleFilesForCrop([file]);
    assert.equal(count, 2);
});
test('匯入失敗後解除防重入，仍能重試並處理不同照片', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    const file = new w.File(['a'], 'a.jpg', { type: 'image/jpeg' });
    w.renderImage = async () => { throw new Error('failed'); }; await w.handleFilesForCrop([file]);
    let count = 0; w.renderImage = async () => { count++; };
    await w.handleFilesForCrop([file, new w.File(['bb'], 'b.jpg', { type: 'image/jpeg' })]);
    assert.equal(count, 2);
});
test('來源選單無圖示，選取115模考提醒場次，場次僅顯示名稱', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card);
    assert.deepEqual(Array.from(card.querySelector('.source-sel').options, o => o.textContent),
        ['請選擇來源', '複習卷', '數字題本', '模擬題本', '歷屆模考', '115模考']);
    const alerts = []; w.alert = text => alerts.push(text);
    const source = card.querySelector('.source-sel'); source.value = 'mockExam'; w.toggleCardSource(source);
    assert.deepEqual(alerts, ['請選擇模考場次']); assert.equal(card.querySelector('.mock-exam-fields').hidden, false);
    assert.equal(card.querySelector('.exam-sel option[value="a"]').textContent, '第一次模考');
    card.querySelector('.exam-sel').value = 'a'; w.toggleCardSource(source); assert.equal(alerts.length, 1);
});
test('查看頁各來源獨立篩選，切換非模考來源清除場次，保留舊自訂來源', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    for (const [i, source] of ['複習卷', '數字題本', '模擬題本', '歷屆模考', '舊自訂來源', ''].entries()) {
        w.StudyRecords.appendNotes('A', [{ noteLinkVersion:1,syllabus:w.NoteLinks.catalog('A')[0],task:w.NoteLinks.tasks('A',w.NoteLinks.catalog('A')[0].categoryId)[0],timestamp: 100+i, date: '2026/10/28', source, sourceType: 'other', content: '來源'+i, reasons: [] }]);
    }
    w.updateNoteViewFilters();
    const source = w.document.querySelector('#filter-source'), exam = w.document.querySelector('#filter-exam');
    for (const name of ['複習卷', '數字題本', '模擬題本', '歷屆模考', '舊自訂來源']) {
        source.value = name; source.onchange(); assert.equal(w.document.querySelectorAll('#view-slots-container .note-slot').length, 1);
    }
    source.value = 'mockExam'; source.onchange(); exam.value = 'a';
    assert.equal(exam.hidden, false);
    assert.match(w.document.querySelector('#view-slots-container').textContent, /A專屬/);
    source.value = '複習卷'; source.onchange(); assert.equal(exam.hidden, true); assert.equal(exam.value, '');
    assert.equal(w.document.querySelectorAll('#view-slots-container .note-slot').length, 1);
    source.value = '__unclassified'; source.onchange(); assert.equal(w.document.querySelectorAll('#view-slots-container .note-slot').length, 1);
});
test('單元仍以複習講義為標準，不混入以冊分類的題本', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    const f=JSON.parse(w.localStorage.getItem('StudyMap_Family_Data_V20'));
    f.A.masters['會考']['數學'].materials={'複習講義':{instances:[{id:'han',name:'翰將',vols:{'第二冊':[{id:'quad',name:'二次函數'}]}}]},'題本':{instances:[{id:'3800',name:'3800',units:[{id:'v2',name:'第二冊'}]}]}};
    w.localStorage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card);
    card.querySelector('.subj-sel').value = '數學'; w.handleCardSubjectChange(card.querySelector('.subj-sel'));
    assert.deepEqual(Array.from(card.querySelector('.unit-sel').options, o => o.textContent), ['請選擇知識單元', '第二冊 / 二次函數']);
});

test('儲存完成後從查看切回匯入會恢復選檔區', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card); w.syncImportView();
    w._onSaveSuccess(); w.goToPage('import-page', null);
    assert.equal(w.document.querySelector('#import-step1').style.display, 'block');
    assert.equal(w.document.querySelector('#settings-container').style.display, 'none');
});
test('取消裁切或移除最後一張設定卡片後恢復選檔區', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    w.renderImage = async () => {};
    await w.handleFilesForCrop([new w.File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
    w.cancelCropping();
    assert.equal(w.document.querySelector('#import-step1').style.display, 'block');
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card); w.syncImportView();
    w.removeCard(card.querySelector('.delete-card-btn'));
    assert.equal(w.document.querySelector('#import-step1').style.display, 'block');
});
test('切換查看及匯入頁保留既有設定卡片與來源', async t => {
    const w = await page(t, 'wrong-notes/index.html', 'http://localhost/wrong-notes/');
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card); card.querySelector('.source-sel').value = '複習卷';
    w.goToPage('view-page', null); w.goToPage('import-page', null);
    assert.equal(w.document.querySelector('#settings-container').style.display, 'block');
    assert.equal(w.document.querySelector('#import-step1').style.display, 'none');
    assert.equal(w.document.querySelector('.source-sel').value, '複習卷');
});
function seedTree(w) {
    const master = { '數學': { materials: {
        '複習講義': { instances: [{ name: '翰將', type: 'volume', vols: { '第一冊': [{ id: 'u-math', name: '數與數線', start: 1, end: 2 }] } }] },
        '複習卷': { instances: [{ name: '複習一', type: 'custom', units: [{ id: 'u-review', name: '練習一', start: 1, end: 1 }] }] }
    } } };
    w.multiData.A.masters = { '會考': master }; w.appMaster = master;
    w.openStats(); w.document.querySelector('#tree-subject-filter').value = 'ALL'; w.renderTreeView();
}
test('科目卡片按鈕可進入該科目單元，重設後仍不出現比較選單', async t => {
    const w = await page(t, 'index.html', 'http://localhost/'); seedTree(w);
    assert.equal(w.document.querySelector('#tree-review-filters'), null);
    const button = w.document.querySelector('.tree-subject-summary-header button');
    assert.equal(button.textContent, '▸ 展開'); button.click();
    assert.equal(w.document.querySelector('#tree-subject-filter').value, '數學|||會考');
    assert.equal(w.document.querySelector('#tree-review-filters'), null);
    assert.match(w.document.querySelector('#starmap-root').textContent, /數與數線/);
    w.resetTreeFilter(); assert.equal(w.document.querySelector('#tree-review-filters'), null);
    w.document.querySelector('.tree-subject-summary-name').click();
    assert.equal(w.document.querySelector('#tree-subject-filter').value, '數學|||會考');
});
test('科目名稱含引號時仍透過資料屬性傳入完整代碼，不拼接點擊程式', async t => {
    const w = await page(t, 'index.html', 'http://localhost/'); seedTree(w);
    const root = w.document.querySelector('#starmap-root'), key = '數學\'"&|||會考';
    let clicked; w._meExpandTreeSubject = value => { clicked = value; };
    w.renderTreeSubjectSummary(root, { [key]: { name: '數學', subj: w.appMaster['數學'] } });
    root.querySelector('.tree-subject-summary-header button').click();
    assert.equal(clicked, key);
    assert.equal(root.querySelector('.tree-subject-summary-header').getAttribute('onclick'), null);
});
test('沒有教材時隱藏無作用的比較選單', async t => {
    const w = await page(t, 'index.html', 'http://localhost/'); w.openStats();
    assert.equal(w.document.querySelector('#tree-review-filters'), null);
});

test('冊次篩選解析教材名稱及冊名，只顯示所選冊的單元及頁數', async t => {
 const w=await page(t,'index.html','http://localhost/');
 const units=[{id:'en4',name:'第四冊文法',start:1,end:10}];
 const master={'英文':{materials:{'複習講義':{instances:[
  {name:'麻辣',type:'volume',volOrder:['第三冊','第四冊'],vols:{'第三冊':[{id:'en3',name:'第三冊文法',start:1,end:20}],'第四冊':units},units:[{id:'mirror',name:'其他冊鏡像',start:1,end:99}]},
  {name:'其他',type:'volume',vols:{'第四冊':[{id:'other4',name:'其他教材第四冊',start:1,end:30}]}}
 ]}}}};
 w.multiData.A.masters={'會考':master};w.appMaster=master;w.appPlans=[{grid:{'2026-10-28':[
  {unitId:'en4',cat:'會考',subject:'英文',isDone:true,startPage:1,endPage:4},
  {unitId:'en4',cat:'會考',subject:'英文',isDone:true,startPage:3,endPage:7},
  {unitId:'en3',cat:'會考',subject:'英文',isDone:true,startPage:1,endPage:20}
 ]}}];
 w.openStats();w.document.querySelector('#tree-subject-filter').value='英文|||會考';w.renderTreeView();
 w.document.querySelector('#tree-type-filter').value='複習講義';w.renderTreeView();
 w.document.querySelector('#tree-vol-filter').value='麻辣|||第四冊';w.renderTreeView();
 const root=w.document.querySelector('#starmap-root');assert.match(root.textContent,/第四冊文法/);
 assert.doesNotMatch(root.textContent,/第三冊文法|其他教材第四冊|其他冊鏡像/);
 assert.match(root.querySelector('.tree-type-count').textContent,/已完成 0／1 單元/);
 assert.match(root.querySelector('.tree-type-state').textContent,/進行中 1/);
 assert.match(root.querySelector('.tree-unit-progress').textContent,/7\/10 \(70%\)/);
 assert.equal(master['英文'].materials['複習講義'].instances[0].volOrder.length,2,'不修改教材資料');
 w.document.querySelector('#tree-vol-filter').value='其他|||第四冊';w.renderTreeView();
 assert.match(root.textContent,/其他教材第四冊/);assert.match(root.querySelector('.tree-type-count').textContent,/已完成 0／1 單元/);
});
test('各教材類型分別統計完整完成單元，部分頁數不當作已完成',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.appMaster['數學'].materials['複習卷'].unitBased=true;
 w.appPlans=[{grid:{'2026-10-28':[{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:1},{unitId:'u-review',cat:'會考',isDone:true}]}}];
 w._meExpandTreeSubject('數學|||會考');
 const cards=Array.from(w.document.querySelectorAll('.tree-type-card'));
 assert.equal(cards.length,2);
 assert.match(cards[0].textContent,/已完成 0／1 單元/);assert.match(cards[0].textContent,/進行中 1/);
 assert.match(cards[1].textContent,/已完成 1／1 單元/);assert.equal(w.document.querySelector('.tree-progress'),null);
});

test('教材類型可收合明細，單元保留五欄、答對率與完成度數字及排程天數',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.appPlans=[{grid:{'2026-10-28':[{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:2}]}}];
 w.getUnitAccuracyRate=()=>0.98;
 w._meExpandTreeSubject('數學|||會考');
 const section=w.document.querySelector('.tree-type-section');
 assert.deepEqual(Array.from(section.querySelector('.tree-units-header').children,x=>x.textContent),['單元名稱','頁碼','答對率','完成度','排程天數']);
 assert.match(section.querySelector('.tree-unit-accuracy').textContent,/98%/);
 assert.match(section.querySelector('.tree-unit-progress').textContent,/2\/2 \(100%\)/);
 assert.match(section.querySelector('.tree-unit-clock').textContent,/1天/);
 assert.equal(section.querySelectorAll('.tree-meter').length,2);
 const button=section.querySelector('.tree-type-toggle'),details=section.querySelector('.tree-type-details');
 button.click();assert.equal(details.hidden,true);assert.equal(button.getAttribute('aria-expanded'),'false');
 button.click();assert.equal(details.hidden,false);
 assert.match(w.document.querySelector('link[href^="board-layout.css"]').href,/v=159/);
});
test('月曆兩列保留月份切換、篩選與原工具，更多可關閉並以Escape返回焦點',async t=>{
 const w=await page(t,'index.html','http://localhost/');const d=w.document;
 assert.ok(d.querySelector('.planner-heading #month-nav-row'));
 assert.ok(d.querySelector('.planner-toolbar #planner-cat-filter'));
 assert.ok(d.querySelector('.planner-toolbar #planner-mis-filter'));
 for(const name of ['planner-cat-filter','planner-mis-filter','planner-selector','current-month-display','calendar-highlight-banner'])assert.equal(d.querySelectorAll('#'+name).length,1);
 const menu=d.querySelector('#planner-more');menu.open=true;
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.open,false);assert.equal(d.activeElement,menu.querySelector('summary'));
 for(const fn of ['openDoubleCheck','showRevertWizardModal','performUndo','showSafetyBackups']){
  let calls=0;w[fn]=()=>calls++;
  const button=menu.querySelector('button[onclick="'+fn+'()"]');button.onclick=w.Function(button.getAttribute('onclick'));
  menu.open=true;button.click();assert.equal(calls,1);assert.equal(menu.open,false);
 }
 menu.open=true;d.body.click();assert.equal(menu.open,false);
});
test('同一單元重複任務只計一次完成，教材型別的未開始與缺頁碼各自列出',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 const subj=w.appMaster['數學'];subj.materials['複習講義'].instances[0].vols['第一冊'].push({id:'unknown',name:'待設定頁碼'});
 w._collectSubjectUnitsCache=new w.WeakMap();
 w.appPlans=[{grid:{'2026-10-28':[{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:2},{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:2}]}}];
 const stats=w.getTreeTypeStats(subj,{subject:'數學',category:'會考'});
 assert.equal(stats['複習講義'].done,1);assert.equal(stats['複習講義'].total,2);assert.equal(stats['複習講義'].missing,1);
 assert.equal(stats['複習卷'].todo,1);
});
test('尚未建立排程也顯示月份及篩選，切換月份仍會更新標題',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.openPlanner();
 assert.match(w.document.querySelector('#current-month-display').innerText,/\d{4}年 \d+月/);
 assert.equal(w.document.querySelector('#planner-cat-filter').value,'ALL');
 assert.equal(w.document.querySelector('#planner-mis-filter').value,'ALL');
 const previous=w.document.querySelector('#current-month-display').innerText;w.changeMonth(1);
 assert.notEqual(w.document.querySelector('#current-month-display').innerText,previous);
 assert.equal(w.document.querySelectorAll('#calendar-grid .calendar-day').length,42);
 assert.equal(w.document.querySelectorAll('#calendar-grid .add-event-btn').length,42);
 assert.equal(w.appPlans.length,0);
});

test('每本教材只設一組表頭，教材、冊次及全部展開收合均正常',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 const instance=w.appMaster['數學'].materials['複習講義'].instances[0];
 instance.vols['第二冊']=[{id:'math2',name:'第二冊單元',start:3,end:4}];
 w._collectSubjectUnitsCache=new w.WeakMap();w._meExpandTreeSubject('數學|||會考');
 const books=w.document.querySelectorAll('.tree-book');assert.equal(books.length,2);
 const book=books[0];assert.equal(book.querySelectorAll('.tree-units-header').length,1);
 assert.equal(book.querySelectorAll('.tree-volume-toggle').length,2);
 const volume=book.querySelector('.tree-volume-toggle'),units=volume.parentElement.querySelector('.tree-units');
 volume.click();assert.equal(units.hidden,true);volume.click();assert.equal(units.hidden,false);
 const bookButton=book.querySelector('.tree-book-toggle');bookButton.click();assert.equal(book.querySelector('.tree-book-details').hidden,true);
 w.document.querySelector('[data-tree-expand="true"]').click();assert.equal(book.querySelector('.tree-book-details').hidden,false);
 w.document.querySelector('[data-tree-expand="false"]').click();
 assert.ok(Array.from(w.document.querySelectorAll('.tree-book-details')).every(n=>n.hidden));
 assert.ok(Array.from(w.document.querySelectorAll('.tree-volume-toggle')).every(n=>n.getAttribute('aria-expanded')==='false'));
 w.document.querySelector('[data-tree-expand="true"]').click();assert.ok(Array.from(w.document.querySelectorAll('.tree-book-details')).every(n=>!n.hidden));
});
test('答對率沿用三段門檻，100%無斜線，缺少紀錄顯示置中短橫且不顯示bar',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 const style=w.document.createElement('style');style.textContent=text('board-layout.css');w.document.head.appendChild(style);
 for(const [rate,color,hasRemainder] of [[0,'#ef4444',true],[0.89,'#ef4444',true],[0.90,'#f59e0b',true],[0.95,'#f59e0b',true],[0.96,'#27ae60',true],[1,'#27ae60',false]]){
  w.getUnitAccuracyRate=()=>rate;w._meExpandTreeSubject('數學|||會考');
  const meter=w.document.querySelector('.tree-accuracy-meter');
  assert.equal(meter.classList.contains('has-remainder'),hasRemainder);
  assert.equal(meter.firstElementChild.style.width,Math.round(rate*100)+'%');
  const swatch=w.document.createElement('span');swatch.style.background=color;assert.equal(meter.firstElementChild.style.background,swatch.style.background);
  assert.ok(w.getComputedStyle(meter).width.includes('56px'),'窄欄採56px，寬欄由container query設為72px');
  assert.match(meter.parentElement.textContent,new RegExp(Math.round(rate*100)+'%'));
 }
 w.getUnitAccuracyRate=()=>null;w._meExpandTreeSubject('數學|||會考');
 const empty=w.document.querySelector('.tree-accuracy-empty');assert.equal(empty.textContent,'-');
 assert.equal(w.getComputedStyle(empty).textAlign,'center');assert.equal(empty.parentElement.querySelector('.tree-meter'),null);
 assert.equal(w.document.querySelector('.tree-book .tree-units-header').children.length,5);
});
test('進度列點擊不重複跳轉，原有答對率與排程天數入口仍存在',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.appPlans=[{grid:{'2026-10-29':[{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:1}]}}];w.getUnitAccuracyRate=()=>0.95;w.getUnitScheduledDays=()=>2;
 w._meExpandTreeSubject('數學|||會考');let calendarCalls=0,accuracyCalls=0;
 w.jumpToUnitCalendar=()=>calendarCalls++;w.jumpToAccuracyForUnitHighlight=()=>accuracyCalls++;
 const row=w.document.querySelector('.tree-unit[style*="display:grid"]');
 for(const node of [row,...row.querySelectorAll('[onclick]')])node.onclick=w.Function('event',node.getAttribute('onclick'));
 row.querySelector('.tree-unit-progress').click();assert.equal(calendarCalls,1);
 row.querySelector('.tree-unit-clock').click();assert.equal(calendarCalls,2);
 row.querySelector('.tree-unit-accuracy').click();assert.equal(accuracyCalls,1);assert.equal(calendarCalls,2);
});

test('任務只篩選顯示單元，完成度與排程天數累計同分類所有任務，空任務不退回全部教材',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 const subject=w.appMaster['數學'];subject.materials['複習講義'].instances[0].vols['第一冊']=[{id:'a',name:'甲單元',start:1,end:10},{id:'b',name:'乙單元',start:11,end:20}];
 w.multiData.A.missions={'會考':{'一模':['a'],'二模':['a','b'],'空任務':[]}};w.appMissions=w.multiData.A.missions;
 w.appPlans=[{grid:{'2026-10-01':[{unitId:'a',cat:'會考',mis:'一模',isDone:true,startPage:1,endPage:10}],
 '2026-10-02':[{unitId:'a',cat:'會考',mis:'二模',isDone:true,startPage:1,endPage:4}],
 '2026-10-03':[{unitId:'a',cat:'會考',mis:'二模',isDone:false,startPage:5,endPage:10},{unitId:'b',cat:'會考',mis:'二模',isDone:true,startPage:11,endPage:20}]}}];
 w._collectSubjectUnitsCache=new w.WeakMap();w.renderTreeView();
 const category=w.document.querySelector('#tree-category-filter'),mission=w.document.querySelector('#tree-mission-filter');category.value='會考';w.onTreeScopeChange(true);
 mission.value='二模';w.onTreeScopeChange(false);w._meExpandTreeSubject('數學|||會考');
 let root=w.document.querySelector('#starmap-root');assert.match(root.querySelector('.tree-type-count').textContent,/已完成 2／2 單元/);
 assert.match(root.querySelector('.tree-unit-progress').textContent,/10\/10 \(100%\)/);assert.match(root.querySelector('.tree-unit-clock').textContent,/3天/);
 assert.match(w.document.querySelector('#tree-scope-description').textContent,/二模/);
 mission.value='一模';w.onTreeScopeChange(false);w._meExpandTreeSubject('數學|||會考');
 assert.match(root.querySelector('.tree-type-count').textContent,/已完成 1／1 單元/);assert.doesNotMatch(root.textContent,/乙單元/);
 assert.match(root.querySelector('.tree-unit-progress').textContent,/10\/10 \(100%\)/);
 mission.value='空任務';w.onTreeScopeChange(false);assert.match(root.textContent,/此範圍沒有教材單元/);assert.equal(root.querySelector('.tree-type-card'),null);
 assert.equal(w.document.querySelector('#tree-subject-filter').options.length,1);
});
test('單科預設只展開複習講義，手動類型與全部展開收合尊重操作',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);w._meExpandTreeSubject('數學|||會考');
 function details(name){return Array.from(w.document.querySelectorAll('.tree-type-section')).find(s=>s.querySelector('[data-type-name]').dataset.typeName===name).querySelector('.tree-type-details');}
 assert.equal(details('複習講義').hidden,false);assert.equal(details('複習卷').hidden,true);
 w.document.querySelector('#tree-type-filter').value='複習卷';w.renderTreeView();assert.equal(details('複習卷').hidden,false);
 w._meExpandTreeSubject('數學|||會考');assert.equal(details('複習卷').hidden,true);
 w.document.querySelector('[data-tree-expand="true"]').click();assert.equal(details('複習卷').hidden,false);
 w.document.querySelector('[data-tree-expand="false"]').click();assert.equal(details('複習講義').hidden,true);assert.equal(details('複習卷').hidden,true);
 assert.equal(w.document.querySelector('button[onclick="resetTreeFilter()"]'),null);
});
test('切換學生清除舊分類任務選取；完成度使用固定數字槽位',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.multiData.A.missions={'會考':{'甲任務':['u-math']}};w.renderTreeView();w.document.querySelector('#tree-category-filter').value='會考';w.onTreeScopeChange(true);w.document.querySelector('#tree-mission-filter').value='甲任務';w.onTreeScopeChange(false);
 w.document.querySelector('#user-selector').value='B';w.switchUser();w.openStats();
 assert.equal(w.document.querySelector('#tree-category-filter').value,'ALL');assert.equal(w.document.querySelector('#tree-mission-filter').value,'ALL');
 assert.doesNotMatch(w.document.querySelector('#tree-mission-filter').textContent,/甲任務/);
 const meter=w.document.createElement('div');meter.innerHTML=w.treeMeter(100,'4/18 (22%)');
 assert.deepEqual(Array.from(meter.querySelectorAll('.tree-progress-number'),n=>n.textContent),['4','18']);assert.equal(meter.querySelector('.tree-progress-percent').textContent,' (22%)');
});

test('生物複習卷同冊P.1只完成指定回次，明細、教材與總覽統計一致且不改寫資料',async t=>{
 const w=await page(t,'index.html','http://localhost/');
 const units=[{id:'bio-a',name:'第1回',start:1,end:1},{id:'bio-b',name:'第2回',start:1,end:1},{id:'bio-c',name:'第3回',start:1,end:1}];
 const subject={materials:{'複習卷':{unitBased:false,instances:[{name:'麻辣甲',vols:{'第一冊':units}}]}}};
 w.multiData.A.masters={'會考':{'生物':subject}};w.appMaster=w.multiData.A.masters['會考'];
 w.appPlans=[{grid:{'2026-10-29':[{unitId:'bio-a',subject:'生物',cat:'會考',isDone:true,startPage:1,endPage:1},{unitId:'bio-c',subject:'生物',cat:'會考',isDone:false,startPage:1,endPage:1}]}}];
 const before=JSON.stringify({master:w.multiData.A.masters,plans:w.appPlans});
 w.openStats();w._meExpandTreeSubject('生物|||會考');w.document.querySelector('#tree-type-filter').value='複習卷';w.renderTreeView();
 const rows=Array.from(w.document.querySelectorAll('.tree-unit'));
 assert.equal(rows.length,3);assert.match(rows[0].querySelector('.tree-unit-progress').textContent,/1\/1 \(100%\)/);
 assert.match(rows[0].querySelector('.tree-unit-clock').textContent,/1天/);
 for(const row of rows.slice(1))assert.equal(row.querySelector('.tree-unit-progress').textContent,'—');
 assert.equal(rows[1].querySelector('.tree-unit-clock'),null);assert.match(rows[2].querySelector('.tree-unit-clock').textContent,/1天/);
 assert.match(w.document.querySelector('.tree-type-count').textContent,/已完成 1／3 單元/);
 assert.match(w.document.querySelector('.tree-book-count').textContent,/已完成 1／3 單元/);
 w.document.querySelector('#tree-subject-filter').value='ALL';w.renderTreeView();
 assert.match(w.document.querySelector('.tree-type-count').textContent,/已完成 1／3 單元/);
 assert.equal(JSON.stringify({master:w.multiData.A.masters,plans:w.appPlans}),before);
});

test('已確認重複修正檔只歸檔指定紀錄，總表排除、原文保留且可還原',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 const old={id:'old-attempt',date:'2026-07-14',subject:'數學',typeName:'複習卷',instanceId:'book',instanceName:'麻辣甲',correct:24,total:24,wrongUnits:['第3回'],extraExams:[]};const keep={...old,id:'canonical-attempt',wrongUnits:['第一冊|一元一次方程式']};
 w.saveAccuracyRecords([old,keep]);const before=w.loadAccuracyRecords(),plan={app:'StudyMap',schema:1,kind:'accuracy-dedup-plan',userId:'A',groups:[{keepId:keep.id,archiveIds:[old.id],expected:Object.fromEntries(before.map(r=>[r.id,w.AccuracyDuplicates.signature(r)]))}]};
 w.switchStatsView('accuracy');await w.AccuracyDuplicatesUI.readPlan({files:[{text:async()=>JSON.stringify(plan)}],value:'test'});
 assert.equal(w.loadAccuracyRecords().filter(r=>r._duplicateOf).length,0);w.document.querySelector('#accuracy-dedup-apply').click();await new Promise(r=>setTimeout(r,20));
 let saved=w.loadAccuracyRecords();assert.equal(saved.length,2);assert.equal(saved[0]._duplicateOf,keep.id);assert.equal(saved[0].wrongUnits[0],'第3回');assert.match(w.document.querySelector('#accuracy-root').textContent,/共 1 筆/);
 assert.ok(Object.keys(w.localStorage).some(k=>k.startsWith('StudyMap_AccuracyDedupBackup_A_')));
 w.AccuracyDuplicatesUI.review();const restore=w.document.querySelector('[data-restore]');restore.click();restore.click();await new Promise(r=>setTimeout(r,20));saved=w.loadAccuracyRecords();assert.equal(saved.filter(r=>r._duplicateOf).length,0);assert.match(w.document.querySelector('#accuracy-root').textContent,/共 2 筆/);
});

test('正式錯題缺任務或單元不產生草稿；完整保存ID後可依任務篩選且名稱跟隨改名',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/');const alerts=[];w.alert=m=>alerts.push(m);
 const card=w.createSettingCard('data:image/png;base64,YWJj',0,'new','crop');w.document.querySelector('#cards-slider').appendChild(card);
 card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));
 w.generateNote();assert.equal(w.document.querySelectorAll('.editable-slot').length,0);assert.match(alerts.pop(),/知識單元/);
 card.querySelector('.unit-sel').selectedIndex=1;w.generateNote();assert.match(alerts.pop(),/任務/);
 card.querySelector('.note-task').selectedIndex=1;w.generateNote();w._wnSaveImage=async()=> 'formal-image';await w.saveNotes();
 const note=w.StudyRecords.list('notes','A')[0];assert.equal(note.syllabus.unitId,'unitA');assert.ok(note.task.missionId);
 const cat=w.document.querySelector('#filter-note-category');cat.value=note.syllabus.categoryId;cat.onchange();
 const mission=w.document.querySelector('#filter-note-task');mission.value=note.task.missionId;mission.onchange();assert.equal(w.document.querySelectorAll('#view-slots-container .note-slot').length,1);
 const f=JSON.parse(w.localStorage.getItem('StudyMap_Family_Data_V20'));f.A.masters['會考']['數學'].materials['複習講義'].instances[0].vols['第一冊'][0].name='改名後的單元';w.localStorage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));w.renderViewPage();
 assert.match(w.document.querySelector('#view-slots-container').textContent,/改名後的單元/);assert.equal(w.StudyRecords.list('notes','A')[0].syllabus.unitId,'unitA');
});
test('草稿產生後單元被刪除時阻止存檔，不上傳圖片也不影響其他筆記',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/');const card=w.createSettingCard('data:image/png;base64,YWJj',0,'new','crop');w.document.querySelector('#cards-slider').appendChild(card);
 card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));card.querySelector('.unit-sel').selectedIndex=1;card.querySelector('.note-task').selectedIndex=1;w.generateNote();
 const f=JSON.parse(w.localStorage.getItem('StudyMap_Family_Data_V20'));f.A.masters['會考']['數學'].materials['複習講義'].instances=[];w.localStorage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));
 let uploaded=false;w._wnSaveImage=async()=>{uploaded=true;};const before=w.localStorage.getItem('myStudyNotes');await w.saveNotes();assert.equal(uploaded,false);assert.equal(w.localStorage.getItem('myStudyNotes'),before);assert.equal(w.document.querySelectorAll('.editable-slot').length,1);
});
test('測試錯題從歸屬頁移至回收區後清單消失，仍可透過正常畫面還原',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.openSettings();w.document.querySelector('#legacy-trash-test-notes').click();
 assert.equal(w.StudyRecords.pending('notes').length,0);assert.equal(w.StudyRecords.pending('exams').length,1);assert.equal(w.StudyRecords.noteTrash().length,1);
 w.document.querySelector('#note-trash-panel button').click();assert.equal(w.StudyRecords.pending('notes').length,1);assert.equal(w.document.querySelector('#legacy-ownership').hidden,false);assert.equal(w.StudyRecords.noteTrash().length,0);
});
test('正式匯出與還原流程保存錯題關聯登錄、原筆記與回收區，不靠重新配對名稱',async t=>{
 const w=await page(t,'index.html','http://localhost/');
 const s=w.NoteLinks.catalog('A')[0],mission=w.NoteLinks.tasks('A',s.categoryId)[0];
 w.StudyRecords.appendNotes('A',[{noteLinkVersion:1,syllabus:s,task:mission,timestamp:900,date:'2026/10/29',content:'正式'}]);
 w.StudyRecords.trashPendingNotes(w.StudyRecords.pending('notes').map(n=>n.token));
 let serialized='';w._v147ExportIdbSource=async()=>[];w._v146ExportWrongNoteImages=async()=>[];
 w.showSaveFilePicker=async()=>({createWritable:async()=>({write:async data=>serialized=data,close:async()=>{}})});
 await w.exportDataToFile();const snapshot=JSON.parse(serialized);
 assert.ok(snapshot.keys.StudyMap_NoteLinkRegistry_V1);assert.equal(snapshot.keys.StudyMap_WrongNotesTrash_V1.length,1);
 const restored=await page(t,'index.html','http://restored.local/');
 restored.FileReader=class{readAsText(){this.onload({target:{result:serialized}});}};
 const input=restored.document.querySelector('#import-file');Object.defineProperty(input,'files',{value:[{}]});input.dispatchEvent(new restored.Event('change'));await new Promise(r=>setTimeout(r,80));
 const n=restored.StudyRecords.list('notes','A').find(n=>n.timestamp===900);
 assert.equal(restored.NoteLinks.validate('A',n).task.missionId,mission.missionId);assert.equal(restored.StudyRecords.noteTrash().length,1);
});

test('張裕如空月曆可切月及取消手動新增，始終不建立空計畫或改動另一學生',async t=>{
 const w=await page(t,'index.html','http://localhost/');
 w.multiData.A.plans=[{id:'A-plan',name:'A既有排程',grid:{'2026-10-29':[{id:'A-task',subject:'數學',text:'A',isDone:true}]}}];w.appPlans=w.multiData.A.plans;const before=JSON.stringify(w.multiData.A);
 w.document.querySelector('#user-selector').value='B';w.switchUser();w.openPlanner();
 assert.equal(w.document.querySelectorAll('.calendar-day').length,42);assert.equal(w.document.querySelectorAll('.add-event-btn').length,42);
 w.changeMonth(1);const date=w.getLocalDateString(w.currentViewDate);w.openAddEventModal(date,'');w.closeAddEventPage();
 assert.equal(w.appPlans.length,0);assert.equal(w.multiData.B.plans.length,0);assert.equal(JSON.stringify(w.multiData.A),before);
});
test('空月曆首次手動儲存才建立目前學生計畫，後續新增沿用同一計畫且可重讀',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.document.querySelector('#user-selector').value='B';w.switchUser();w.openPlanner();
 const date='2026-10-29';w.openAddEventModal(date,'');w.saveNewEvent();assert.equal(w.appPlans.length,0,'空白表單不建立計畫');
 w.document.querySelector('#ae-subject').value='數學';w.document.querySelector('#ae-text').value='閱讀講義';w.saveNewEvent();
 assert.equal(w.appPlans.length,1);const plan=w.appPlans[0];assert.equal(plan.grid[date][0].subject,'數學');assert.equal(w.document.querySelector('#planner-selector').value,plan.id);
 assert.equal(w.multiData.A.plans.length,0);assert.equal(JSON.parse(w.localStorage.getItem('StudyMap_Family_Data_V20')).B.plans[0].id,plan.id);
 w.openAddEventModal('2026-11-01',plan.id);w.document.querySelector('#ae-subject').value='英文';w.saveNewEvent();
 assert.equal(w.appPlans.length,1);assert.equal(plan.end,'2026-11-01');assert.equal(plan.grid['2026-11-01'][0].subject,'英文');
 w.document.querySelector('#user-selector').value='A';w.switchUser();w.document.querySelector('#user-selector').value='B';w.switchUser();w.openPlanner();
 assert.equal(w.appPlans.length,1);assert.equal(w.appPlans[0].grid[date].length,1);
});
test('空月曆草稿切換學生後不可儲存，已刪除計畫也不自動重建',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.openPlanner();w.openAddEventModal('2026-10-29','');w.document.querySelector('#ae-subject').value='A的草稿';
 w.document.querySelector('#user-selector').value='B';w.switchUser();w.saveNewEvent();assert.equal(w.multiData.A.plans.length,0);assert.equal(w.multiData.B.plans.length,0);
 w.openAddEventModal('2026-10-29','removed-plan');w.document.querySelector('#ae-subject').value='不可重建';w.saveNewEvent();assert.equal(w.appPlans.length,0);
});

test('科目選單預設數學排第一，明確選英文時不被切回數學，也不改動教材資料',async t=>{
 const w=await page(t,'index.html','http://localhost/');
 const names=['新科目','英文','數學','國文'];const original=names.slice();
 w.populateSelect('master-subject',names);
 const s=w.document.querySelector('#master-subject');assert.equal(s.options[0].value,'數學');assert.equal(s.value,'數學');assert.deepEqual(names,original);
 w.populateSelect('master-subject',names,'英文');assert.equal(s.value,'英文');assert.equal(s.options[0].value,'數學');
 w.populateSelect('filter-category',names);assert.equal(w.document.querySelector('#filter-category').options[0].value,'新科目','其他選單順序不變');
});
test('新增分類對話框不自動建立新科目，空教材庫只提示新增，取消後保持空白',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.appMaster={};const before=JSON.stringify(w.multiData.A.masters);
 w.addCatWithSubject();assert.deepEqual(Object.keys(w.appMaster),[]);assert.equal(w.document.querySelector('#add-cat-subject').value,'');assert.match(w.document.querySelector('#add-cat-subject').textContent,/尚無科目/);
 w.closeModal('modal-add-cat');w.addCatWithSubject();assert.deepEqual(Object.keys(w.appMaster),[]);assert.equal(JSON.stringify(w.multiData.A.masters),before);
});
test('分類對話框也以數學為首選，缺少數學時不建立假科目',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.appMaster={'英文':{materials:{}},'數學':{materials:{}}};const before=JSON.stringify(w.appMaster);
 w.addCatWithSubject();assert.equal(w.document.querySelector('#add-cat-subject').value,'數學');assert.equal(JSON.stringify(w.appMaster),before);
 w.appMaster={'英文':{materials:{}}};w.addCatWithSubject();assert.equal(w.document.querySelector('#add-cat-subject').value,'英文');assert.equal(Object.hasOwn(w.appMaster,'數學'),false);assert.equal(Object.hasOwn(w.appMaster,'新科目'),false);
});
test('首頁沒有排程仍顯示任務已勾選的教材零進度，未勾選才沒有卡片',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.multiData.A.missions={'會考':{'一模':['u-math']}};w.appMissions=w.multiData.A.missions;w.multiData.A.plans=[];w.appPlans=w.multiData.A.plans;w.multiData.A.logs=[];w.appLogs=w.multiData.A.logs;
 w.updateFilters();w.renderDashboard();const root=w.document.querySelector('#dashboard-root');assert.match(root.textContent,/數學/);assert.match(root.textContent,/0\/2/);assert.doesNotMatch(root.textContent,/目前篩選的範圍內沒有內容/);
 w.appMissions['會考']['一模']=[];w.renderDashboard();assert.match(root.textContent,/目前篩選的範圍內沒有內容/);assert.equal(w.appPlans.length,0);
});
test('實際開啟教材庫與重建畫面皆數學排第一，手動改選其他科目仍保留',async t=>{
 const w=await page(t,'index.html','http://localhost/');const master={'新科目':{materials:{}},'英文':{materials:{}},'數學':{materials:{}}};
 w.multiData.A.masters={'會考':master};w.appMaster=master;w.appCurrentCat='會考';w.document.querySelector('#master-subject').replaceChildren();
 w.openSettings();const select=w.document.querySelector('#master-subject');assert.equal(select.options[0].value,'數學');assert.equal(select.value,'數學');
 select.value='英文';w.handleMasterSubjectChange();w._v139SyncMasterUI('switchTab');assert.equal(select.options[0].value,'數學');assert.equal(select.value,'英文');
 assert.deepEqual(Object.keys(master),['新科目','英文','數學'],'僅調整顯示，不刪除或重排教材資料');
});
