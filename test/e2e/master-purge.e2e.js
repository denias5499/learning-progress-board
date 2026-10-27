#!/usr/bin/env node
/**
 * 真實瀏覽器 e2e — 教材庫污染自動清除 (v2.3.2.144)
 *
 * 為什麼需要這支：
 *   v2.3.2.143 的自動清除「其實有成功」，但畫面看起來像沒清掉，
 *   原因是 _v158Migrate / _v154Migrate 每次載入都會重建大分類與「地科」科目。
 *   這類問題純靠讀程式碼看不出來 —— 必須在真實瀏覽器裡跑完整 init pipeline。
 *
 * 做法：
 *   1. 起本機 HTTP server 服務 index.html
 *   2. 起 headless Chrome，用 CDP (Chrome DevTools Protocol) 控制
 *   3. Page.addScriptToEvaluateOnNewDocument → 在頁面任何 script 之前寫入 localStorage
 *   4. 導頁 → 等 init 跑完 → Runtime.evaluate 讀回真實狀態
 *   5. 重新導頁一次，驗證「重載後不會被 migration 重建」
 *
 * 用法：
 *   node test/e2e/master-purge.e2e.js
 *   CHROME_PATH="/path/to/chrome" node test/e2e/master-purge.e2e.js
 *
 * ⚠️ 需要 Node 22+（內建 fetch / WebSocket）
 */

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

// ── 設定 ──────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8895;
const CDP = 9227;
const KEY = 'StudyMap_Family_Data_V20';
const CUR = 'StudyMap_CurrentUserId_V20';

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}
const CHROME = findChrome();
if (!CHROME) {
  console.error('❌ 找不到 Chrome。請安裝 Chrome/Chromium，或用 CHROME_PATH 指定路徑。');
  process.exit(2);
}

// ── 從 index.html 抽出 v1.5.3 備份（污染來源指紋）──
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = idx.match(/window\._v153_BACKUP_MASTER_STR = `([\s\S]*?)`;/);
if (!m) {
  console.error('❌ index.html 裡找不到 window._v153_BACKUP_MASTER_STR（備份指紋來源已變，請更新本測試）');
  process.exit(2);
}
const BACKUP = JSON.parse(m[1]);
const ALL = [];
Object.values(BACKUP).forEach(s => {
  if (s.type === 'custom') s.units.forEach(u => ALL.push(u.id));
  else Object.values(s.vols).forEach(v => v.forEach(u => ALL.push(u.id)));
});

// ── fixture  builders ─────────────────────────────────
function mkSubject(n) {
  const s = BACKUP[n];
  const inst = { id: 'ins_' + n, name: '(原主教材)', type: s.type, units: [], vols: null, volOrder: null };
  if (s.type === 'custom') inst.units = s.units.map(u => ({ ...u }));
  else {
    Object.keys(s.vols).forEach(v => s.vols[v].forEach(u => inst.units.push({ ...u, vol: v })));
    inst.vols = s.vols; inst.volOrder = s.volOrder;
  }
  return { materials: { '複習講義': { id: 'mt_' + n, name: '複習講義', instances: [inst] } } };
}
function defSubs() {
  const o = {};
  ['國文', '數學', '英文', '歷史', '地理', '公民', '理化', '地科'].forEach(n => {
    o[n] = { materials: {
      '複習講義': { id: 'mt_' + n, name: '複習講義', instances: [] },
      '複習卷': { id: 'm2_' + n, name: '複習卷', instances: [] },
      '數字題本': { id: 'm3_' + n, name: '數字題本', instances: [] },
      '模擬題本': { id: 'm4_' + n, name: '模擬題本', instances: [] },
      '考古題': { id: 'm5_' + n, name: '考古題', instances: [] },
    } };
  });
  return o;
}
function mkTasks(n, manual) {
  const t = [];
  for (let i = 0; i < n; i++) t.push({
    id: 't' + i, subject: '國文', text: '[國文] U' + i, startPage: i, endPage: i + 1,
    isDone: false, cat: '📚 會考', mis: '一模', unitId: ALL[i % ALL.length],
    vol: 'custom', unitName: 'U' + i, postponeCount: 0,
  });
  for (let i = 0; i < (manual || 0); i++) t.push({
    id: 'm' + i, subject: '數學', text: '[數學] 我自己排的', startPage: 1, endPage: 5,
    isDone: false, cat: '📚 會考', mis: '一模', unitId: '', vol: '', unitName: '我自己排的', postponeCount: 0,
  });
  return t;
}
function allSubjects() {
  return Object.fromEntries(Object.keys(BACKUP).map(k => [k, mkSubject(k)]));
}
function mkOwnSubject(ids) {
  return { materials: { '複習講義': { id: 'mt1', name: '複習講義', instances: [
    { id: 'ins1', name: '(原主教材)', type: 'custom',
      units: ids.map((u, i) => ({ id: u, name: 'U' + i, start: i * 10 + 1, end: i * 10 + 10 })) },
  ] } } };
}

// ── 情境 ──────────────────────────────────────────────
const SCEN = {};
SCEN.ru_injected = () => ({
  name: '張裕如',
  masters: { '會考複習': allSubjects(), '段考複習': defSubs() },
  missions: { '會考複習': { '一模': [] }, '段考複習': {} },
  logs: [],
  plans: [{ id: 'p1', name: '會考計畫', start: '2026-07-01', end: '2026-10-01',
            grid: { '2026-07-01': mkTasks(156, 0) } }],
});
SCEN.ru_manual = () => { const u = SCEN.ru_injected(); u.plans[0].grid['2026-07-01'] = mkTasks(156, 3); return u; };
SCEN.ru_log = () => { const u = SCEN.ru_injected();
  u.logs = [{ id: 'l1', date: '2026-07-01', category: '📚 會考', subject: '國文',
              unitName: '字音', start: 6, end: 24, mission: '一模' }]; return u; };
SCEN.ru_own_unit = () => { const u = SCEN.ru_injected();
  u.masters['會考複習']['國文'].materials['複習講義'].instances[0].units
    .push({ id: 'my_own_1', name: '我加的', start: 1, end: 5 }); return u; };
SCEN.xuan_owner = () => {
  const m = { '會考複習': {}, '段考複習': defSubs() };
  Object.keys(BACKUP).forEach(k => {
    const sub = mkSubject(k);
    for (let i = 0; i < 40; i++) sub.materials['複習講義'].instances[0].units
      .push({ id: 'xuan_' + k + '_' + i, name: '自創' + i, start: 1, end: 2 });
    m['會考複習'][k] = sub;
  });
  return {
    name: '張裕宣', masters: m, missions: { '會考複習': { '一模': [] }, '段考複習': {} },
    logs: [{ id: 'l1', date: '2026-07-01', category: '📚 會考', subject: '國文',
             unitName: '字音', start: 6, end: 24, mission: '一模' }],
    plans: [{ id: 'p1', grid: { '2026-07-01': mkTasks(30, 0) } }],
  };
};
SCEN.normal = () => ({
  name: '正常學生',
  masters: { '會考複習': { '國文': mkOwnSubject(['n1', 'n2']) }, '段考複習': defSubs() },
  missions: { '會考複習': { '一模': [] }, '段考複習': {} },
  logs: [{ id: 'l1', date: '2026-07-01', category: '📚 會考', subject: '國文',
           unitName: 'U1', start: 1, end: 10, mission: '一模' }],
  plans: [{ id: 'p1', grid: { '2026-07-01': [{ id: 't1', subject: '國文', text: '[國文] U1',
           startPage: 1, endPage: 10, isDone: false, cat: '📚 會考', mis: '一模',
           unitId: 'n1', vol: 'custom', unitName: 'U1', postponeCount: 0 }] } }],
});
SCEN.empty = () => ({ name: '新學生', masters: { '會考複習': {}, '段考複習': defSubs() },
                      missions: {}, logs: [], plans: [] });

// ── CDP client ────────────────────────────────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, r) => {
  let p = q.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  r.end(fs.readFileSync(f));
});

let msgId = 0;
const pending = new Map();
let ws;
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}

// 在頁面裡數 unit 數量的 helper
const CNT = `function _cnt(o){try{var n=0;Object.values(o||{}).forEach(c=>Object.values(c||{}).forEach(s=>
 Object.values(s.materials||{}).forEach(t=>(t.instances||[]).forEach(i=>n+=(i.units||[]).length))));return n;}catch(e){return -1;}}`;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpb-e2e-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
    '--remote-allow-origins=*', 'about:blank',
  ], { stdio: 'ignore' });

  let ver = null;
  for (let i = 0; i < 80; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json(); break; }
    catch (e) { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!ver) { console.error('❌ Chrome 啟動失敗'); process.exit(1); }

  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  const logs = [];
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const t = (msg.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      logs.push(msg.params.type + '| ' + t);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('EXCEPTION| ' + (d.exception?.description || d.text));
    }
  });

  let tid = null, sid = null;
  async function open(seed, cur) {
    if (tid) await send('Target.closeTarget', { targetId: tid }).catch(() => {});
    const r = await send('Target.createTarget', { url: 'about:blank' });
    tid = r.targetId;
    const a = await send('Target.attachToTarget', { targetId: tid, flatten: true });
    sid = a.sessionId;
    await send('Page.enable', {}, sid);
    await send('Runtime.enable', {}, sid);
    // ★ 在頁面任何 script 之前寫入 localStorage
    await send('Page.addScriptToEvaluateOnNewDocument', { source:
      `try{localStorage.setItem(${JSON.stringify(KEY)},${JSON.stringify(JSON.stringify(seed))});` +
      `localStorage.setItem(${JSON.stringify(CUR)},${JSON.stringify(cur)});}catch(e){}` }, sid);
  }
  // ★ 等 localStorage 內容「穩定不變」再往下走
  //   （原本是固定等 3800ms，混合情境資料量大時 init 還沒跑完就讀狀態 → 誤判失敗）
  const waitStable = async (timeoutMs = 20000) => {
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < timeoutMs) {
      await new Promise(r => setTimeout(r, 500));
      const cur = await ev(`(function(){try{return localStorage.getItem('${KEY}')||'';}catch(e){return '';}})()`);
      if (cur && cur === last) return cur;
      last = cur;
    }
    return last;
  };
  const nav = async () => {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?e2e=${Date.now()}` }, sid);
    await waitStable();
  };
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid);
    if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
    return r.result.value;
  };

  const ST = `(()=>{${CNT}var ls=JSON.parse(localStorage.getItem('${KEY}')||'{}');
   var u=ls.user_A; return {units:_cnt(u.masters),cats:Object.keys(u.masters||{}),
   subs:(Object.keys(u.masters||{}).reduce((n,c)=>n+Object.keys(u.masters[c]||{}).length,0)),
   plans:(u.plans||[]).length, logs:(u.logs||[]).length, empty:!!u._v144Empty,
   ver:(document.title.match(/\\[(v[\\d.]+)\\]/)||[])[1]};})()`;

  for (const [name, build] of Object.entries(SCEN)) {
    console.log('\n▶ 情境: ' + name);
    await open({ user_A: build() }, 'user_A');
    await nav();
    const st = await ev(ST);
    if (name === 'ru_injected') {
      ok(st.ver === 'v2.3.2.144', '版本 = v2.3.2.144 (實際 ' + st.ver + ')');
      ok(st.units === 0, '★ 教材庫 0 單元 (實際 ' + st.units + ')');
      ok(st.cats.length === 0, '★ 進度大分類 0 個 (實際 ' + JSON.stringify(st.cats) + ')');
      ok(st.subs === 0, '★ 科目 0 個 (實際 ' + st.subs + ')');
      ok(st.plans === 0, '計畫 0 個');
      ok(st.logs === 0, 'log 0 筆');
      ok(st.empty === true, '★ 有 _v144Empty 標記');
      // ★★ 重載後大分類不該被 migration 重建
      await nav();
      const st2 = await ev(ST);
      ok(st2.cats.length === 0, '★★ 重載後大分類仍是 0 個 (實際 ' + JSON.stringify(st2.cats) + ')');
      ok(st2.subs === 0, '★★ 重載後科目仍是 0 個 (實際 ' + st2.subs + ')');
      ok(st2.units === 0, '★★ 重載後單元仍是 0 個 (實際 ' + st2.units + ')');
    } else if (name === 'empty') {
      ok(st.units === 0, '★ 空的新學生本來就沒單元 (units=' + st.units + ')');
      ok(st.cats.length > 0, '★ 大分類骨架還在 (' + JSON.stringify(st.cats) + ')');
      ok(st.empty === false, '★ 沒有被誤標成已清空');
    } else {
      ok(st.units > 0, '★ 教材庫沒被清空 (units=' + st.units + ')');
      ok(st.cats.length > 0, '★ 大分類還在 (' + JSON.stringify(st.cats) + ')');
      ok(st.empty === false, '★ 沒有被誤標成已清空');
    }
  }

  // 混合情境: 只有污染那位被清
  console.log('\n▶ 混合情境: 張裕如(污染) + 張裕宣(原主) + 正常學生');
  const mixed = { user_A: SCEN.ru_injected(), user_B: SCEN.xuan_owner(), user_C: SCEN.normal() };
  await open(mixed, 'user_A'); await nav();
  const M = `(()=>{${CNT}var ls=JSON.parse(localStorage.getItem('${KEY}'));var o={};
   for(var uid in ls){var u=ls[uid];o[uid]={name:u.name,units:_cnt(u.masters),cats:Object.keys(u.masters||{}),
   plans:(u.plans||[]).length,logs:(u.logs||[]).length};}return o;})()`;
  const ms = await ev(M);
  ok(ms.user_A.units === 0, '★ 張裕如已清空');
  ok(ms.user_A.cats.length === 0, '★ 張裕如大分類 0 個');
  ok(ms.user_B.units > 0, '★ 張裕宣完好 (units=' + ms.user_B.units + ')');
  ok(ms.user_B.plans === 1, '★ 張裕宣計畫完好');
  ok(ms.user_C.units > 0, '★ 正常學生完好 (units=' + ms.user_C.units + ')');
  ok(ms.user_C.logs === 1, '★ 正常學生紀錄完好');

  console.log('\n=== console 錯誤檢查 ===');
  const errs = logs.filter(l => /EXCEPTION|error\|/.test(l));
  ok(errs.length === 0, '沒有未捕捉的錯誤', errs.slice(0, 3).join(' ;; '));

  console.log('\n' + '─'.repeat(50));
  console.log(`結果： ${pass} 通過 / ${fail} 失敗`);
  ws.close(); chrome.kill(); server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
