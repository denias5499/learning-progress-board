const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../student-records');
function fixture() {
    const values = new Map();
    const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
    const records = create(storage);
    storage.setItem('StudyMap_MockExams', JSON.stringify([
        { id: 'a', userId: 'A', name: '第一次模考', subjects: { 數學: { score: { got: 5 } } } },
        { id: 'b', userId: 'B', name: '第一次模考' },
        { id: 'old', name: '115模考-一模', levelChartImageId: 'old-image' }
    ]));
    storage.setItem('myStudyNotes', JSON.stringify([
        { id: 'nA', userId: 'A', timestamp: 1, content: 'A', imageId: 'image-A' },
        { id: 'nB', userId: 'B', timestamp: 1, content: 'B' },
        { timestamp: 3, source: '115模考-一模', content: '待確認', imageId: 'old-note-image' }
    ]));
    return { storage, records };
}
test('同名模考依學生讀取，未確認舊資料不自動歸給目前學生', () => {
    const { records } = fixture();
    assert.deepEqual(records.list('exams', 'A').map(e => e.id), ['a']);
    assert.deepEqual(records.list('exams', 'B').map(e => e.id), ['b']);
    assert.equal(records.pending('exams').length, 1);
});
test('更新 A 成績時保留 B 的同名成績與未歸屬舊資料', () => {
    const { storage, records } = fixture();
    records.saveExam('A', { ...records.list('exams', 'A')[0], review: { text: 'A檢討' } });
    assert.equal(records.list('exams', 'A')[0].review.text, 'A檢討');
    assert.equal(records.list('exams', 'B')[0].review, undefined);
    assert.equal(JSON.parse(storage.getItem('StudyMap_MockExams')).length, 3);
});
test('拒絕用 B 身分更新 A 的模考或使用 A 的模考場次', () => {
    const { records } = fixture();
    assert.throws(() => records.saveExam('B', records.list('exams', 'A')[0]));
    assert.throws(() => records.appendNotes('B', [{ sourceType: 'mockExam', examId: 'a' }]));
});
test('錯題獨立依學生讀取，新增與編輯保留其他學生和舊資料', () => {
    const { storage, records } = fixture();
    records.appendNotes('A', [{ timestamp: 4, sourceType: 'mockExam', examId: 'a', imageId: 'new' }]);
    records.updateNote('A', 1, { content: '更新A' });
    assert.equal(records.list('notes', 'B')[0].content, 'B');
    assert.equal(records.list('notes', 'A')[0].examId, 'a');
    assert.equal(records.pending('notes')[0].record.imageId, 'old-note-image');
    assert.equal(JSON.parse(storage.getItem('myStudyNotes')).length, 4);
});
test('相同 timestamp 的筆記只刪除目前學生的資料', () => {
    const { records } = fixture();
    records.deleteNote('A', 1);
    assert.equal(records.list('notes', 'A').length, 0);
    assert.equal(records.list('notes', 'B').length, 1);
    assert.throws(() => records.updateNote('A', 1, { content: '不能改B' }));
});
test('歸屬確認只處理明確選取的舊資料，保留圖片 ID 並建立場次關聯', () => {
    const { records } = fixture();
    records.claim('exams', 'A', [records.pending('exams')[0].token]);
    assert.equal(records.list('exams', 'A')[1].levelChartImageId, 'old-image');
    records.claim('notes', 'A', [records.pending('notes')[0].token], 'old');
    const claimed = records.list('notes', 'A').find(n => n.timestamp === 3);
    assert.equal(claimed.imageId, 'old-note-image'); assert.equal(claimed.examId, 'old');
    assert.equal(claimed.sourceType, 'mockExam');
});
test('舊資料歸屬確認不允許重新指定其他學生已有的資料', () => {
    const { records } = fixture();
    assert.throws(() => records.claim('exams', 'B', [JSON.stringify(records.list('exams', 'A')[0])]));
    const token = records.pending('exams')[0].token;
    records.claim('exams', 'A', [token]);
    assert.throws(() => records.claim('exams', 'B', [token]));
});
test('可先建立場次與錯題，再補入成績，ID 與錯題關聯不變', () => {
    const { records } = fixture();
    const session = records.createSession('B', '第二次模考', '2026-11-01');
    records.appendNotes('B', [{ timestamp: 5, sourceType: 'mockExam', examId: session.id }]);
    records.saveExam('B', { ...session, sessionOnly: false, subjects: { 數學: { correct: 10 } } });
    assert.equal(records.list('exams', 'B').find(e => e.id === session.id).subjects.數學.correct, 10);
    assert.equal(records.list('notes', 'B')[0].examId, session.id);
});
test('JSON 備份重讀後保留學生、場次、圖片與未歸屬資料', () => {
    const { storage, records } = fixture();
    records.appendNotes('A', [{ timestamp: 6, sourceType: 'mockExam', examId: 'a', imageId: 'image-a' }]);
    const snapshot = JSON.parse(JSON.stringify({ exams: JSON.parse(storage.getItem('StudyMap_MockExams')), notes: JSON.parse(storage.getItem('myStudyNotes')) }));
    const restored = fixture();
    restored.storage.setItem('StudyMap_MockExams', JSON.stringify(snapshot.exams));
    restored.storage.setItem('myStudyNotes', JSON.stringify(snapshot.notes));
    assert.equal(restored.records.list('notes', 'A')[0].examId, 'a');
    assert.equal(restored.records.list('notes', 'A')[0].imageId, 'image-a');
    assert.equal(restored.records.pending('notes').length, 1);
});
test('容量不足或損壞資料不會清除既有筆記', () => {
    const { storage, records } = fixture(); const before = storage.getItem('myStudyNotes');
    storage.setItem = () => { throw new Error('quota exceeded'); };
    assert.throws(() => records.appendNotes('A', [{ timestamp: 8 }]));
    assert.equal(storage.getItem('myStudyNotes'), before);
    const malformed = create({ getItem: () => '{broken', setItem: () => assert.fail('must not write') });
    assert.throws(() => malformed.appendNotes('A', [{ timestamp: 8 }]));
});
