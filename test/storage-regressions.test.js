const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(start, end) {
    const a = html.indexOf(start);
    assert.ok(a >= 0, start);
    const b = html.indexOf(end, a + start.length);
    assert.ok(b > a, end);
    return html.slice(a, b);
}
function context(extra = {}) {
    const storage = new Map();
    return vm.createContext({
        console: { log() {}, warn() {}, error() {} }, Blob, Uint8Array, atob,
        localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) ?? null },
        storage, ...extra
    });
}
function logContext() {
    const user = { masters: {}, logs: [{ id: 'a' }, { id: 'b' }], plans: [], missions: {} };
    const c = context({ multiData: { user, other: { logs: [{ id: 'other' }] } }, currentUserId: 'user',
        appLogs: user.logs, appPlans: user.plans, appMissions: user.missions, appCurrentCat: '',
        confirm: () => true, el: () => null, renderHistoryTable() {}, renderDashboard() {},
        invalidateSchedCache() {}, pushSafetyBackup() {}, pushUndoSnapshot() {},
        deduplicateMasterUnits: () => 0, deduplicateLegacyMaster: () => 0,
        STORAGE_KEY_FAMILY: 'family', showSaveErrorToast(e) { throw e; }
    });
    if (html.includes('function filterAppLogs(')) {
        vm.runInContext(section('function filterAppLogs(', 'function saveToLocal('), c);
    }
    vm.runInContext(section('function saveToLocal(', '// v1.5.102: Undo'), c);
    vm.runInContext(section('function deleteLog(', 'function openEditLog('), c);
    return c;
}
test('刪除歷史紀錄後存檔並重新讀取，紀錄不會復活', () => {
    const c = logContext();
    c.deleteLog('a');
    assert.deepEqual(JSON.parse(c.storage.get('family')).user.logs, [{ id: 'b' }]);
    c.saveToLocal();
    assert.deepEqual(JSON.parse(c.storage.get('family')).user.logs, [{ id: 'b' }]);
    assert.equal(c.multiData.other.logs[0].id, 'other');
});
test('存檔守門員仍拒絕把清理前的 stale 紀錄寫回', () => {
    const c = logContext();
    c.multiData.user.logs = [];
    c.saveToLocal();
    assert.deepEqual(JSON.parse(c.storage.get('family')).user.logs, []);
});
test('取消刪除不更動紀錄', () => {
    const c = logContext(); c.confirm = () => false;
    c.deleteLog('a');
    assert.equal(c.appLogs.length, 2);
});

function restoreContext(outcomes, unavailable = false) {
    let index = 0;
    const stored = [];
    const c = context({ stored, _v147OpenDb: async () => unavailable ? null : {
        transaction() {
            const outcome = outcomes[index++] || 'complete';
            if (outcome === 'transaction-throw') throw new Error('transaction failed');
            const tx = { error: new Error(outcome), objectStore: () => ({ put(record) {
                if (outcome === 'put-throw') throw new Error('put failed');
                queueMicrotask(() => {
                    if (outcome === 'complete') { stored.push(record); tx.oncomplete(); }
                    else if (outcome === 'abort') tx.onabort();
                    else tx.onerror();
                });
            } }) };
            return tx;
        }
    } });
    vm.runInContext(section('function _v146DataUrlToBlob(', '// 匯出單一 IDB 來源'), c);
    vm.runInContext(section('async function _v147RestoreIdbSource(', '// 還原錯題本圖片'), c);
    return c;
}
const src = { db: 'mockExamReviewDB', store: 'mockExamReviewImages', label: '覆盤照片' };
test('還原只計算 transaction 完成的圖片，失敗不妨礙後續圖片', async () => {
    const c = restoreContext(['complete', 'abort', 'error', 'put-throw', 'transaction-throw', 'complete']);
    const errors = [];
    const n = await c._v147RestoreIdbSource(src, Array.from({ length: 6 }, (_, i) => ({ id: String(i), data: 'image', examId: 'exam', slot: i })), errors);
    assert.equal(n, 2); assert.equal(c.stored.length, 2); assert.equal(errors.length, 4);
    assert.equal(c.stored[1].examId, 'exam'); assert.equal(c.stored[1].slot, 5);
});
test('無法開啟圖片資料庫時回報失敗', async () => {
    const c = restoreContext([], true), errors = [];
    assert.equal(await c._v147RestoreIdbSource(src, [{ id: 'a' }], errors), 0);
    assert.ok(errors.length > 0);
});
test('損壞圖片與缺少 ID 的紀錄不算還原成功', async () => {
    const c = restoreContext([]), errors = [];
    assert.equal(await c._v147RestoreIdbSource(src, [null, { data: 'image' }, { id: 'a', data: 'bad', _v147DataType: 'blob' }], errors), 0);
    assert.equal(errors.length, 3);
});
test('Blob 圖片還原保留內容與覆盤關聯欄位', async () => {
    const c = restoreContext([]), errors = [];
    assert.equal(await c._v147RestoreIdbSource(src, [{ id: 'a', data: 'data:image/png;base64,YWJj', _v147DataType: 'blob', examId: 'exam', slot: 2 }], errors), 1);
    assert.equal(await c.stored[0].data.text(), 'abc');
    assert.equal(c.stored[0].data.type, 'image/png');
    assert.equal(c.stored[0].examId, 'exam');
    assert.equal(c.stored[0].slot, 2);
    assert.equal(c.stored[0]._v147DataType, undefined);
    assert.equal(errors.length, 0);
});
test('舊 v146 圖片格式仍可還原', async () => {
    const c = restoreContext([]);
    Object.assign(c, { WN_IMG_DB: 'wrongNoteImgDB', WN_IMG_STORE: 'images' });
    vm.runInContext(section('async function _v146RestoreWrongNoteImages(', '// 錯題本文字'), c);
    assert.equal(await c._v146RestoreWrongNoteImages([{ id: 'old', type: 'blob', data: 'data:image/png;base64,YWJj', createdAt: '2026-10-27' }]), 1);
    assert.equal(await c.stored[0].data.text(), 'abc');
    assert.equal(c.stored[0].createdAt, '2026-10-27');
});

async function importBackup(outcomes, options = {}) {
    const c = restoreContext(outcomes), alerts = [];
    let handler, reader;
    Object.assign(c, {
        document: { getElementById: () => ({ addEventListener: (_, fn) => { handler = fn; } }) },
        FileReader: class { constructor() { reader = this; } readAsText(file) { this.done = this.onload({ target: { result: file.text } }); } },
        confirm: () => true, alert: msg => alerts.push(msg), WN_STORAGE_KEY_NOTES: 'myStudyNotes',
        STORAGE_KEY_FAMILY: 'family', V147_IDB_SOURCES: [src], window: { location: { reload() {} } }
    });
    if (options.unavailable) c._v147OpenDb = async () => null;
    if (options.storageFailure) c.localStorage.setItem = () => { throw new Error('quota exceeded'); };
    vm.runInContext(section("document.getElementById('import-file').addEventListener('change'", '// v1.5.226: 全機備份 / 離開提醒模組'), c);
    handler({ target: { files: [{ text: JSON.stringify({ _meta: { app: 'StudyMap' }, keys: { myStudyNotes: [{ imageId: 'a' }] }, idb: { [src.db]: options.bucket || { records: [{ id: 'a', data: 'image' }] } } }) }], value: '' } });
    await reader.done;
    return alerts.join('\n');
}
test('真正匯入入口在圖片失敗時顯示部分完成，不能宣稱全部還原成功', async () => {
    const message = await importBackup(['abort']);
    assert.match(message, /部分完成/);
    assert.match(message, /失敗.*1|1.*失敗/);
    assert.doesNotMatch(message, /🎉 還原完成/);
});
test('真正匯入入口在圖片寫入成功時顯示完成', async () => {
    assert.match(await importBackup(['complete']), /🎉 還原完成/);
});
test('圖片資料庫無法開啟時，匯入入口提示部分完成', async () => {
    const message = await importBackup([], { unavailable: true });
    assert.match(message, /部分完成/);
    assert.match(message, /圖片成功 0、失敗 1/);
});
test('圖片清單格式錯誤時，匯入入口不能顯示成功', async () => {
    assert.match(await importBackup([], { bucket: { records: 'invalid' } }), /部分完成/);
});
test('文字儲存失敗時，匯入入口不能顯示全部完成', async () => {
    assert.match(await importBackup(['complete'], { storageFailure: true }), /部分完成/);
});
