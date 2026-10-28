/* Shared persistence for student-owned exams and notes. No automatic ownership migration. */
(function (root) {
    'use strict';
    function create(storage) {
        const keys = { exams: 'StudyMap_MockExams', notes: 'myStudyNotes' };
        function read(kind) {
            const value = JSON.parse(storage.getItem(keys[kind]) || '[]');
            if (!Array.isArray(value)) throw new Error('資料格式錯誤，請先備份並檢查資料');
            return value;
        }
        function requireUser(uid) {
            if (!uid || uid === 'default') throw new Error('請先選擇學生');
        }
        function list(kind, uid) { requireUser(uid); return read(kind).filter(r => r && r.userId === uid); }
        function write(kind, records) { storage.setItem(keys[kind], JSON.stringify(records)); }
        function replace(kind, uid, records) {
            requireUser(uid);
            if (records.some(r => !r || r.userId !== uid)) throw new Error('不能寫入其他學生的資料');
            write(kind, read(kind).filter(r => !r || r.userId !== uid).concat(records));
        }
        function id(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12); }
        function validateExam(uid, examId) {
            if (!list('exams', uid).some(e => e.id === examId)) throw new Error('模考場次不屬於目前學生');
        }
        function saveExam(uid, exam) {
            requireUser(uid);
            if (exam.userId && exam.userId !== uid) throw new Error('不能修改其他學生的模考');
            const records = list('exams', uid), copy = { ...exam, userId: uid, id: exam.id || id('exam') };
            const i = records.findIndex(r => r.id === copy.id);
            if (i < 0 && read('exams').some(r => r && r.id === copy.id && r.userId !== uid)) throw new Error('模考 ID 衝突');
            if (i < 0) records.push(copy); else records[i] = copy;
            replace('exams', uid, records);
            return copy;
        }
        function createSession(uid, name, date) {
            return saveExam(uid, { name, examDate: date || '', createdAt: new Date().toISOString(), sessionOnly: true });
        }
        function appendNotes(uid, notes) {
            requireUser(uid);
            const incoming = notes.map(note => {
                if (note.userId && note.userId !== uid) throw new Error('不能寫入其他學生的錯題');
                if (note.sourceType === 'mockExam') validateExam(uid, note.examId);
                return { ...note, userId: uid, id: note.id || id('note') };
            });
            // Read immediately before commit; another open view may have saved in the meantime.
            write('notes', incoming.concat(read('notes')));
            return incoming;
        }
        function updateNote(uid, timestamp, change) {
            requireUser(uid);
            const all = read('notes');
            const note = all.find(r => r && r.userId === uid && String(r.timestamp) === String(timestamp));
            if (!note) throw new Error('找不到目前學生的錯題');
            if (change.userId && change.userId !== uid) throw new Error('不能轉移學生歸屬');
            Object.assign(note, change, { userId: uid });
            if (note.sourceType === 'mockExam') validateExam(uid, note.examId);
            write('notes', all);
        }
        function deleteNote(uid, timestamp) {
            requireUser(uid);
            const all = read('notes'), note = all.find(r => r && r.userId === uid && String(r.timestamp) === String(timestamp));
            if (!note) throw new Error('找不到目前學生的錯題');
            write('notes', all.filter(r => r !== note));
            return note;
        }
        const unowned = r => r && (!r.userId || r.userId === 'default');
        function pending(kind) { return read(kind).filter(unowned).map(r => ({ token: JSON.stringify(r), record: r })); }
        function claim(kind, uid, tokens, examId) {
            requireUser(uid);
            if (kind === 'notes' && examId) validateExam(uid, examId);
            const all = read(kind), wanted = new Set(tokens), selected = all.filter(r => unowned(r) && wanted.has(JSON.stringify(r)));
            if (!selected.length) throw new Error('資料已變動，請重新選取');
            selected.forEach(r => {
                r.userId = uid;
                if (kind === 'notes' && examId) { r.sourceType = 'mockExam'; r.examId = examId; r.source = '模考'; }
            });
            write(kind, all);
            return selected.length;
        }
        function hasImageReference(imageId) { return read('notes').some(r => r && r.imageId === imageId); }
        return { list, replace, saveExam, createSession, appendNotes, updateNote, deleteNote, pending, claim, validateExam, hasImageReference };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { create };
    else root.StudyRecords = create(root.localStorage);
})(typeof window !== 'undefined' ? window : globalThis);
