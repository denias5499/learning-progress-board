// test/helpers.js -- 共用 fixture + jsdom loader
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.join(__dirname, '..', 'index.html');

/**
 * 載入 index.html 的 <script> block 到 jsdom。
 *
 * 用 runScripts: 'outside-only' + 手動 eval(script)。
 * Init 邏輯會碰到 DOM 不完整而 throw，但 function declarations
 * (例如 getUnitDonePagesByUnitIdMatch) 在 throw 之前已註冊到 window。
 * try-catch 吃掉 init 錯誤，只保留函式定義。
 */
function loadIndex() {
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    const m = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!m) throw new Error('No <script> block found in index.html');

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'http://localhost/',  // 啟用 localStorage (jsdom about:blank 沒 storage)
    });

    const win = dom.window;
    try {
        win.eval(m[1]);
    } catch (e) {
        // Init 邏輯可能在 jsdom 環境下因 DOM 不完整而 throw
        // 我們只需要 function declarations，這些通常在 throw 之前已宣告
        // 例如 getUnitDonePagesByUnitIdMatch (line 4596) 在 throw (line 8803) 之前
        // eslint-disable-next-line no-console
        if (process.env.TEST_DEBUG) console.warn('init throw (ignored):', e.message);
    }

    if (typeof win.getUnitDonePagesByUnitIdMatch !== 'function') {
        throw new Error('getUnitDonePagesByUnitIdMatch not defined after eval');
    }
    return win;
}

/**
 * 構造 v1.5.172 commit message 描述的 fixture：
 *   - 會考複習 cat
 *   - 地理 sub: 12 個 unit (P.6-21, 22-37, ..., 對齊 _v153_BACKUP_PLANS_STR 範圍)
 *   - 數學 sub: u_直 (P.50-72), u_比例 (P.73-100) — 同 sub 跨單元用
 *   - 英文 sub: 1 個 unit — 跨 sub 任務用
 */
function makeMultiData() {
    const geoUnits = [];
    for (let i = 0; i < 12; i++) {
        const start = 6 + i * 16;
        const end = start + 15;
        geoUnits.push({ id: `u_地${i+1}`, name: `geo unit ${i+1}`, start, end });
    }

    const mathUnits = [
        { id: 'u_直', name: '直線方程式', start: 50, end: 72 },
        { id: 'u_比例', name: '比例', start: 73, end: 100 },
    ];

    const engUnits = [
        { id: 'u_U2', name: 'U2', start: 24, end: 28 },
    ];

    function makeSub(units) {
        return {
            materials: {
                default: {
                    instances: [{ name: 'default', vols: { default: units } }]
                }
            }
        };
    }

    return {
        user_test: {
            name: 'Test User',
            masters: {
                '會考複習': {
                    '地理': makeSub(geoUnits),
                    '數學': makeSub(mathUnits),
                    '英文': makeSub(engUnits),
                }
            },
            missions: {},
            plans: [],
        }
    };
}

/**
 * 構造單一 mission 的 plans
 * @param {Array<{unitId, startPage, endPage, subject, isDone?}>} tasks
 */
function makePlans(tasks) {
    return [{
        id: 'plan1',
        name: 'test mission',
        grid: {
            '2026-08-16': tasks.map((t, i) => ({
                id: `t${i}`,
                isDone: t.isDone !== false,
                cat: '會考複習',
                mis: 'plan1',
                unitId: t.unitId,
                startPage: t.startPage,
                endPage: t.endPage,
                subject: t.subject,
            }))
        }
    }];
}

module.exports = { loadIndex, makeMultiData, makePlans, loadBackupPlans };

/**
 * 直接從 index.html 抓 window._v153_BACKUP_PLANS_STR 字串內容
 * (備份字串在 function initUsers() 內, jsdom 跑不到這段,
 *  用 fs + regex 直接從 source 抓更可靠)
 */
function loadBackupPlans() {
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    const m = html.match(/window\._v153_BACKUP_PLANS_STR\s*=\s*(`[\s\S]*?`);/);
    if (!m) throw new Error('_v153_BACKUP_PLANS_STR not found in index.html');
    // m[1] 含頭尾反引號 (template literal), 去頭尾後 parse JSON
    const inner = m[1].slice(1, -1);
    return JSON.parse(inner);
}

