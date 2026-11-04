const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '../..');
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
    w.eval(text('calendar-print.js'));
    w.eval(text('unit-reminders.js'));
    w.eval(text('calendar-replan.js'));
    w.eval(text('calendar-replan-ui.js'));
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

module.exports={page,text,family};
