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
    w.eval(text('tree-progress.js'));
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
        w.StudyRecords.appendNotes('A', [{ timestamp: 100+i, date: '2026/10/28', source, sourceType: 'other', content: '來源'+i, reasons: [] }]);
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
    w.getSyllabusDB = () => ({ '數學': { '複習講義': { '翰將': ['第二冊 / 二次函數'] }, '題本': { '3800': ['第二冊'] } } });
    const card = w.createSettingCard('data:image/png;base64,YQ==', 0, 'batch', 'crop');
    w.document.querySelector('#cards-slider').appendChild(card);
    card.querySelector('.subj-sel').value = '數學'; w.handleCardSubjectChange(card.querySelector('.subj-sel'));
    assert.deepEqual(Array.from(card.querySelector('.unit-sel').options, o => o.value), ['', '第二冊 / 二次函數']);
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
test('科目卡片按鈕實際點擊可進入該科目單元，重設後比較選單恢復', async t => {
    const w = await page(t, 'index.html', 'http://localhost/'); seedTree(w);
    const group = w.document.querySelector('#tree-review-filters');
    assert.equal(group.style.display, 'inline-flex');
    assert.match(group.textContent, /比較教材類型/); assert.match(group.textContent, /教材名稱/);
    const button = w.document.querySelector('.tree-subject-summary-header button');
    assert.equal(button.textContent, '查看教材與單元'); button.click();
    assert.equal(w.document.querySelector('#tree-subject-filter').value, '數學|||會考');
    assert.equal(group.style.display, 'none');
    assert.match(w.document.querySelector('#starmap-root').textContent, /數與數線/);
    w.resetTreeFilter(); assert.equal(group.style.display, 'inline-flex');
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
    assert.equal(w.document.querySelector('#tree-review-filters').style.display, 'none');
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
 assert.equal(root.querySelector('.tree-progress').textContent,'7 / 10 頁');
 assert.match(root.querySelector('.tree-unit-progress').textContent,/7\/10 \(70%\)/);
 assert.equal(master['英文'].materials['複習講義'].instances[0].volOrder.length,2,'不修改教材資料');
 w.document.querySelector('#tree-vol-filter').value='其他|||第四冊';w.renderTreeView();
 assert.match(root.textContent,/其他教材第四冊/);assert.equal(root.querySelector('.tree-progress').textContent,'0 / 30 頁');
});
test('右上角頁數採部分完成頁數加總，單元型教材獨立標示',async t=>{
 const w=await page(t,'index.html','http://localhost/');seedTree(w);
 w.appMaster['數學'].materials['複習卷'].unitBased=true;
 w.appPlans=[{grid:{'2026-10-28':[{unitId:'u-math',cat:'會考',isDone:true,startPage:1,endPage:1},{unitId:'u-review',cat:'會考',isDone:true}]}}];
 w._meExpandTreeSubject('數學|||會考');
 assert.equal(w.document.querySelector('.tree-progress').textContent,'1 / 2 頁 · 1 / 1 單元');
});
