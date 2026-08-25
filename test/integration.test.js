// test/integration.test.js -- 用 v1.5.3 真實備份跑 v1.5.172 fix
// 驗證: 跨 sub 任務不污染地理 unit (v1.5.171 bug 防復發)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex, loadBackupPlans } = require('./helpers');

/**
 * 從備份 plans 構造 multiData.masters:
 * - 每個 unitId 一個 unit, range = 該 unit 所有 task 的 min-max page
 * - sub = 該 unit 第一個 task 的 subject
 *
 * @param {Array} backupPlans 來自 window._v153_BACKUP_PLANS_STR
 * @returns {{masters: object, unitInfo: object}}
 */
function buildMasters(backupPlans) {
    // 抽 unitId → { subject, min, max }
    const unitInfo = {};
    backupPlans.forEach(plan => {
        Object.values(plan.grid || {}).forEach(tasks => {
            tasks.forEach(t => {
                if (!t.unitId || t.startPage === undefined || t.endPage === undefined) return;
                if (!unitInfo[t.unitId]) {
                    unitInfo[t.unitId] = { subject: t.subject, min: t.startPage, max: t.endPage };
                } else {
                    unitInfo[t.unitId].min = Math.min(unitInfo[t.unitId].min, t.startPage);
                    unitInfo[t.unitId].max = Math.max(unitInfo[t.unitId].max, t.endPage);
                }
            });
        });
    });

    // 按 subject 分群
    const bySub = {};
    Object.entries(unitInfo).forEach(([uid, info]) => {
        if (!info.subject) return;
        if (!bySub[info.subject]) bySub[info.subject] = [];
        bySub[info.subject].push({ id: uid, start: info.min, end: info.max });
    });

    // 構造 masters[cat][sub]
    const masters = { '會考複習': {} };
    Object.entries(bySub).forEach(([sub, units]) => {
        masters['會考複習'][sub] = {
            materials: {
                default: { instances: [{ name: 'default', vols: { default: units } }] }
            }
        };
    });

    return { masters, unitInfo, bySub };
}

/**
 * 從備份算「真實地理任務」對地理 unit 的貢獻 pages (Set size)
 * 這是 v1.5.172 fix 應該達成的 ground truth
 */
function realGeoDone(backupPlans, unitId, unitRange) {
    const pages = new Set();
    backupPlans.forEach(plan => {
        Object.values(plan.grid || {}).forEach(tasks => {
            tasks.forEach(t => {
                if (t.unitId === unitId && t.subject === '地理' && t.isDone) {
                    const s = Math.max(t.startPage, unitRange.start);
                    const e = Math.min(t.endPage, unitRange.end);
                    for (let p = s; p <= e; p++) pages.add(p);
                }
            });
        });
    });
    return pages.size;
}

test('integration: 備份資料存在且 parse 成功', () => {
    const plans = loadBackupPlans();
    assert.ok(Array.isArray(plans));
    assert.ok(plans.length > 0, '備份 plans 不應為空');
    // sanity: 第一個 plan 應該有 grid
    assert.ok(plans[0].grid && Object.keys(plans[0].grid).length > 0);
});

test('integration: 跑 v1.5.172 fix 不 crash 且有結果', () => {
    const win = loadIndex();
    const backupPlans = loadBackupPlans();
    const { masters } = buildMasters(backupPlans);

    win.multiData = { user_test: { name: 'T', masters, missions: {}, plans: [] } };
    win.currentUserId = 'user_test';
    win.appPlans = backupPlans;

    const result = win.getUnitDonePagesByUnitIdMatch('會考複習', 'ALL');
    assert.ok(result && typeof result === 'object');
    assert.ok(Object.keys(result).length > 0, 'result 不應為空');
});

test('integration: v1.5.172 fix — 地理 unit 不被跨 sub 任務污染', () => {
    const win = loadIndex();
    const backupPlans = loadBackupPlans();
    const { masters, bySub } = buildMasters(backupPlans);

    win.multiData = { user_test: { name: 'T', masters, missions: {}, plans: [] } };
    win.currentUserId = 'user_test';
    win.appPlans = backupPlans;

    const result = win.getUnitDonePagesByUnitIdMatch('會考複習', 'ALL');

    const geoUnits = bySub['地理'] || [];
    assert.ok(geoUnits.length > 0, '備份裡應該有地理 unit');

    for (const u of geoUnits) {
        const expected = realGeoDone(backupPlans, u.id, u);
        const actual = result[u.id] || 0;

        assert.strictEqual(actual, expected,
            `${u.id} (P.${u.start}-${u.end}): expected ${expected} (只算地理任務), got ${actual} (跨 sub 污染?)`);
    }
});

test('integration: 地理 modal 不會全部 100% (v1.5.171 bug 反指標)', () => {
    const win = loadIndex();
    const backupPlans = loadBackupPlans();
    const { masters, bySub } = buildMasters(backupPlans);

    win.multiData = { user_test: { name: 'T', masters, missions: {}, plans: [] } };
    win.currentUserId = 'user_test';
    win.appPlans = backupPlans;

    const result = win.getUnitDonePagesByUnitIdMatch('會考複習', 'ALL');

    // 反指標: 在 v1.5.171 bug 下, 所有地理 unit 都會 == pTotal (= 100%)
    // v1.5.172 fix 後, 大多數地理 unit 應該沒有 result entry (沒真實地理任務)
    const geoUnits = bySub['地理'] || [];
    const totalDone = geoUnits.filter(u => (result[u.id] || 0) > 0).length;
    const totalGeo = geoUnits.length;

    // 反指標: 不該 totalDone == totalGeo (那代表全部 100%)
    assert.ok(totalDone < totalGeo,
        `反指標觸發: ${totalDone}/${totalGeo} 地理 unit 都顯示 done (>0) — 看起來 v1.5.171 bug 復活了`);
});
