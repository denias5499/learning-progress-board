/* Shared persistence for student-owned exams and notes. No automatic ownership migration. */
(function (root) {
    'use strict';
    function create(storage) {
        const noteLinks = typeof module !== 'undefined' && module.exports ? require('./note-links').create(storage) : root.NoteLinks;
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
                return { ...noteLinks.validate(uid, note), id: note.id || id('note') };
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
            if (change.noteLinkVersion !== undefined && change.noteLinkVersion !== 1) throw new Error('不能移除錯題關聯');
            let updated = { ...note, ...change, userId: uid };
            if (note.noteLinkVersion === 1 || change.noteLinkVersion === 1) updated = noteLinks.validate(uid, updated);
            if (updated.sourceType === 'mockExam') validateExam(uid, updated.examId);
            Object.assign(note, updated);
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
        const trashKey = 'StudyMap_WrongNotesTrash_V1';
        function noteTrash() { const rows = JSON.parse(storage.getItem(trashKey) || '[]'); if (!Array.isArray(rows)) throw new Error('回收區格式錯誤'); return rows; }
        function trashPendingNotes(tokens) {
            const all = read('notes'), wanted = new Set(tokens);
            const selected = all.filter(r => unowned(r) && wanted.has(JSON.stringify(r)));
            if (!selected.length || selected.length !== wanted.size) throw new Error('資料已變動，請重新確認測試錯題');
            const trash = noteTrash();
            selected.forEach(record => { const token = JSON.stringify(record); if (!trash.some(e => JSON.stringify(e.record) === token)) trash.push({ id: id('trash'), removedAt: new Date().toISOString(), reason: '使用者確認為測試錯題', record }); });
            // Archive first. If the second write fails the original still exists and remains recoverable.
            const snapshot = JSON.stringify(trash); storage.setItem(trashKey, snapshot);
            if (storage.getItem(trashKey) !== snapshot) throw new Error('回收區回讀核對失敗，未移除原始錯題');
            write('notes', all.filter(r => !selected.includes(r)));
            return selected.length;
        }
        function restoreTrashedNote(trashId) {
            const trash = noteTrash(), entry = trash.find(e => e.id === trashId);
            if (!entry) throw new Error('找不到回收資料');
            const all = read('notes'), record = entry.record;
            const same = all.some(r => JSON.stringify(r) === JSON.stringify(record));
            if (!same && all.some(r => (r.userId || '') === (record.userId || '') && (record.id ? r.id === record.id : String(r.timestamp) === String(record.timestamp)))) throw new Error('已存在同編號筆記，請先核對');
            if (!same) write('notes', [record].concat(all));
            storage.setItem(trashKey, JSON.stringify(trash.filter(e => e.id !== trashId)));
        }
        function hasImageReference(imageId) { return read('notes').some(r => r && r.imageId === imageId) || noteTrash().some(e => e.record && e.record.imageId === imageId); }
        return { list, replace, saveExam, createSession, appendNotes, updateNote, deleteNote, pending, claim, validateExam, hasImageReference, noteTrash, trashPendingNotes, restoreTrashedNote };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { create };
    else root.StudyRecords = create(root.localStorage);
})(typeof window !== 'undefined' ? window : globalThis);
