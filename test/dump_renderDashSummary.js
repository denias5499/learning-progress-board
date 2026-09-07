const fs = require('node:fs');
const JSDOM = require('jsdom').JSDOM;
const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
const html = fs.readFileSync(HTML_PATH, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const win = dom.window;
try { win.eval(m[1]); } catch(e) {}

const backup = JSON.parse(fs.readFileSync('/mnt/my_book/Denias/.openclaw/workspace/.openclaw/tmp/backup_0030.json', 'utf8'));
const config = backup.keys.StudyMap_Family_Data_V20.config;
win.appMaster = config.masters['會考複習'];
win.multiData = { user_A: { name: 'A', masters: config.masters, missions: config.missions, plans: config.plans, logs: [], avatar: '' } };
win.currentUserId = 'user_A';
win.appMissions = config.missions;
win.appPlans = config.plans;
win.appLogs = [];
win.appCurrentCat = '會考複習';
win._collectSubjectUnitsCache = new win.WeakMap();

// 直接呼叫 renderDashSummary 並用日誌看迭代
const log = [];
const origLog = win.console.log;
win.console.log = (...args) => log.push(args.join(' '));

// 暫時 patch renderDashSummary 來看內部狀態
const result = win.eval('renderDashSummary()');
win.console.log = origLog;

console.log('Return length:', result.length);
console.log('Has bar-card:', result.includes('dash-subject-bar-card'));

// 找出函式定義並 patch 加日誌
const script = m[1];
// 找 renderDashSummary 的位置
const fnStart = script.indexOf('function renderDashSummary()');
console.log('renderDashSummary at offset:', fnStart);

// 在 catCards += 的地方加日誌
const newScript = script.substring(0, fnStart) + 
`
function _logRenderDashSummaryInner() {
    const sb = '';
    let userForBars = multiData[currentUserId];
    if (userForBars && userForBars.masters && Object.keys(userForBars.masters).length > 0) {
        let log = [];
        Object.keys(userForBars.masters).forEach(function(catName) {
            const catSubjects = userForBars.masters[catName];
            if (!catSubjects || Object.keys(catSubjects).length === 0) { log.push(catName + ': skip'); return; }
            let catCards = '';
            Object.keys(catSubjects).forEach(function(sub) {
                const subj = catSubjects[sub];
                if (!subj) { log.push(sub + ': subj null'); return; }
                let totalUnits = 0, doneUnits = 0;
                function accUnit(u) {
                    const ctx = findUnitContext(u.id);
                    const typeObj = ctx ? ctx.typeObj : null;
                    const total = getUnitTotalCount(u, typeObj);
                    const done = getUnitDoneCount(u, typeObj, null, null);
                    totalUnits += total;
                    doneUnits += done;
                }
                if (subj.type === 'custom' && Array.isArray(subj.units)) {
                    log.push(catName+'/'+sub+': custom path, units=' + subj.units.length);
                    subj.units.forEach(accUnit);
                } else if (subj.vols) {
                    log.push(catName+'/'+sub+': vols path');
                } else {
                    _collectSubjectUnitsCache = new WeakMap();
                    const uL = _collectSubjectUnits(subj);
                    log.push(catName+'/'+sub+': _collectSubjectUnits, count=' + uL.length);
                    uL.forEach(accUnit);
                }
                log.push(catName+'/'+sub+': totalUnits=' + totalUnits + ' doneUnits=' + doneUnits);
                if (totalUnits <= 0) { log.push(catName+'/'+sub+': SKIP (totalUnits=0)'); return; }
                catCards += 'X';
            });
            if (catCards) log.push(catName + ': catCards.length=' + catCards.length);
            else log.push(catName + ': catCards empty');
        });
        return log;
    }
    return ['no masters'];
}
_logRenderDashSummaryInner();
` + script.substring(fnStart);

// 把 modified script 重新 eval
try { win.eval(newScript); } catch(e) {}
const logResult = win._logRenderDashSummaryInner();
logResult.forEach(l => console.log(l));
