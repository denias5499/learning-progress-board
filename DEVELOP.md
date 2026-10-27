# 🛠️ 開發指南

給「要在自己電腦上改這個專案」的人看。純前端、**沒有 build step**，主要就是 `index.html` 一個檔。

---

## 📥 1. 取得程式碼

**Repo（公開）**
```
https://github.com/denias5499/learning-progress-board
```

```bash
git clone https://github.com/denias5499/learning-progress-board.git
cd learning-progress-board
```

預設分支 `main` 就是最新版本。

### 🔐 要推回去才需要認證

| 方式 | 設定 | 備註 |
|---|---|---|
| **SSH**（推薦） | 把公鑰貼到 GitHub → Settings → SSH and GPG keys | 免每次輸入 |
| **HTTPS + PAT** | clone 時用 `https://<token>@github.com/...` | 需要 Personal Access Token |

產生 SSH key：
```bash
ssh-keygen -t ed25519 -C "your@email.com"
cat ~/.ssh/id_ed25519.pub    # 整段貼到 GitHub
```

---

## 🖥️ 2. 本機執行

**不要用 `file://` 直接開** —— localStorage 的行為跟 http 不一樣，會踩到奇怪的 bug。

```bash
# 任選一個
python3 -m http.server 8080
npx serve -l 8080
php -S localhost:8080
```

然後開 <http://localhost:8080>

> 💡 資料存在瀏覽器的 localStorage，**每個 port 是一份獨立的資料**。
> 換 port = 換一份空白資料。測試時記得固定用同一個 port。

---

## 🧪 3. 測試

```bash
npm install     # jsdom + playwright
npm test        # node --test test/*.test.js
```

### 這專案特有的三種測試層級

| 層級 | 指令 | 用途 |
|---|---|---|
| **純邏輯單元測試** | `npm test` | 抽出 `index.html` 裡的 function，用 jsdom 跑 |
| **語法檢查** | 見下方 script | `index.html` 內含 4 個 inline `<script>`，改錯只會在瀏覽器爆 |
| **真實瀏覽器 e2e** | `node test/e2e/master-purge.e2e.js` | headless Chrome + CDP，測 migration／localStorage 真實行為 |

> 📊 **目前狀態**（v2.3.2.145）：477 個測試、315 通過、0 失敗、162 個 skip，跑完約 20 秒。
>
> 162 個 skip 是**已知失敗**（斷言對應到 UI 演化前的舊實作），完整清單與原因見
> **`test/known-failures.md`**。另有 7 個檔案在 `test/legacy/`（整個功能已被重寫移除）。
>
> 這個數字是好的 —— 在 v2.3.2.145 之前，CI 從 v1.6.x 時代起就**卡住超過 3.8 小時**，
> 所有測試等於從沒回報過結果。修好之後才有辦法看到真正的迴歸。

#### 語法檢查（改完 `index.html` 一定要跑）

`index.html` 是單一巨大檔，裡面有 4 個 `<script>` block。**改壞語法不會在編輯器跳出來，只會在瀏覽器白畫面。**

```bash
# 抽出每個 inline script block 並檢查語法
python3 - <<'PY'
import io, re, os
s = io.open('index.html', encoding='utf-8').read()
blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
os.makedirs('.tmp-blocks', exist_ok=True)
for i, b in enumerate(blocks):
    io.open(f'.tmp-blocks/block{i}.js', 'w', encoding='utf-8').write(b)
print(f'抽取 {len(blocks)} 個 block')
PY
for f in .tmp-blocks/*.js; do node --check "$f" || echo "❌ $f"; done
rm -rf .tmp-blocks
```

#### 真實瀏覽器 e2e

```bash
node test/e2e/master-purge.e2e.js
```

需要 Chrome / Chromium。路徑可用環境變數指定：
```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node test/e2e/master-purge.e2e.js
```

> ⚠️ 這支測試會起一個本機 HTTP server 與 headless Chrome，跑完自動關掉。
> 它用獨立的 `localStorage` profile，**不會碰到你自己瀏覽器的資料**。

> 🐛 **已知 flaky**：約 8 次裡會有 2～4 次失敗。
>
> 原因：CDP 的 `Runtime.evaluate` 讀 `localStorage` 時，偶發會讀到**上一次寫入**的值
> （頁面內的寫入是 async、evaluate 跑在另一個 execution context → 競態）。
> 這是**測試讀取側**的問題，不是應用邏輯錯 —— 應用端已確認有把清除後的狀態寫進去
> （可在 console 看到 `🧹 已自動清除「張裕如」`）。
>
> 想自己查：
> ```bash
> E2E_DEBUG=1 node test/e2e/master-purge.e2e.js   # 失敗時印出完整寫入序列
> ```
> 寫入序列長這樣（`#1` = 髒資料 → `#2`/`#3` = 清除後）：
> ```
> #1 cats=2 subs=17 units=147 plans=1 empty=false
> #2 cats=0 subs=0  units=0   plans=0 empty=true
> #3 cats=0 subs=0  units=0   plans=0 empty=true
> ```

---

## 📎 3.1 測試檔的三個目錄

```
test/
├── *.test.js          # ★ CI 會跑（npm test 的 glob）
├── legacy/            # 整個功能已被重寫移除 → 不跑
├── e2e/               # 真實瀏覽器 e2e → 手動跑
├── helpers.js         # jsdom loader（會 eval index.html 的所有 script block）
└── known-failures.md  # 哪些測試被 skip、為什麼
```

### 寫新測試時注意

1. **不要硬編碼路徑**
   ```js
   // ❌ 在別的機器會讀不到
   const HTML_PATH = '/mnt/my_book/Denias/projects/learning-progress-board/index.html';
   // ✅
   const HTML_PATH = path.join(__dirname, '..', 'index.html');
   ```

2. **JSDOM 一定要記得 close**，否則 `node --test` 的 event loop 永遠不結束：
   ```js
   const { JSDOM } = require('jsdom');
   const _allDoms = [];
   function _mkDom(...args) { const d = new JSDOM(...args); _allDoms.push(d); return d; }
   require('node:test').after(() => {
       _allDoms.forEach(d => { try { d.window.close(); } catch (e) {} });
   });
   ```

3. **不要用 `resources: 'usable'`** —— 會去抓 index.html 裡的外部資源，網路一慢就卡住。

4. **斷言版本號不要寫死**
   ```js
   // ❌ 每次升版就紅
   assert.ok(/\[v1\.6\.101\]/.test(html));
   // ✅
   assert.ok(/\[v2\.3\.2\.\d+\]/.test(html));
   ```

---

## 🚀 4. 部署

```bash
git add -A
git commit -m "描述你的修改"
git push origin main
```

GitHub Pages 會自動部署（約 1–2 分鐘）。

線上網址：
```
https://denias5499.github.io/learning-progress-board/
```

### ⚠️ 快取問題（超容易踩）

Pages 回應的 header 是 `cache-control: max-age=600`，**改了程式碼但畫面沒變**通常是快取，不是沒部署。

解法：**版本參數**
```
https://denias5499.github.io/learning-progress-board/?v=145
```
每次改版就換一個數字。

頁面右上角有 **版本徽章**（v2.3.2.x），一眼看得出載入的是哪一版。

---

## 📐 5. 專案結構

```
.
├── index.html          # ★ 主程式（CSS + JS 全在這裡，~1.2 MB）
├── DEVELOP.md          # 本檔
├── README.md           # 使用者說明（給一般使用者看）
├── CHANGELOG.md        # 版本演進紀錄
├── package.json        # 只有 devDependencies + npm test
├── test/
│   ├── *.test.js       # 單元測試（npm test 會抓）
│   ├── helpers.js      # jsdom loader + 共用 fixture
│   ├── fixtures/       # 測試資料
│   └── e2e/            # 真實瀏覽器 e2e（不跑在 npm test 裡）
└── .github/workflows/
    └── test.yml        # CI：push main 自動跑 npm test
```

### `index.html` 內部的 script block

這個檔有 **4 個 inline `<script>`**，每個都是獨立的 scope。改動時注意：

- **block 0**：樣式 + 工具函式
- **block 1**：核心資料模型（`multiData`、migration、教材庫）
- **block 2**：月曆 / 排程 / 繪圖
- **block 3**：UI 綁定、事件、初始化

---

## ⚠️ 6. 開發時的幾個地雷

這專案踩過的坑，幫你省時間：

### 📌 `multiData` 是**參照**，不是複本
```js
// ❌ 錯誤：這樣寫會把「別人的教材庫」寫回去
appMaster = multiData[currentUserId].masters[appCurrentCat];
// ✅ 寫回前先確認這物件確實屬於目前使用者
```

`appMaster` / `appPlans` / `appLogs` 這些全域變數是**目前使用者資料的參照**。
在 `saveToLocal()` 寫回前，務必確認它指向的物件真的屬於 `multiData[currentUserId]`。

### 📌 migration 每次載入都會執行
`_v154Migrate` / `_v158Migrate` 等在 `initUsers()` 裡跑，**每次重新整理都會跑**。

→ 這代表「清掉」的資料，下次載入可能又被重建。
→ v2.3.2.144 為此加了 `_v144Empty` 標記，改 migration 前先看這裡。

### 📌 localStorage 有 ~5MB 配額
整包 `multiData`（含教材庫）很容易爆。
- 安全備份只存 `plans / logs / missions`，**不要**存整包
- 寫入前先 `_quotaSafeSetBackup()`

### 📌 日期不要用 `new Date('YYYY-MM-DD')`
那會被當成 UTC 解析，在 UTC+8 會差一天。
用 `parseLocalDateStr(s)`。

### 📌 `setMonth()` 在月底會溢位
1/31 加一個月會跑到 3/3。用 `addMonthsClamped(d, n)`。

---

## 🧭 7. 常見任務速查

| 想做的事 | 從哪看 |
|---|---|
| 加一個科目 / 教材 | 教材庫頁 → `renderMasterEditor()` |
| 改排程演算法 | `_generatePlanInner()` |
| 改月曆畫面 | `renderCalendar()` |
| 加診斷工具 | 參考 `diagnoseCalendarGaps()`、`diagnoseMasterIsolation()` 的寫法（唯讀 + `window.` 掛載） |
| 資料壞掉想救 | `window.diagnose*` 系列工具，全是 **dry-run**，先診斷再手動套用 |

### 診斷工具的慣例
```js
window.diagnoseXxx = function () {
    // 只讀，不改任何資料
    return report;
};
window.fixXxx = function (apply, sel) {
    // 預設 dry-run，必須明確傳 true 才動手
    if (!apply) { console.log('這是 dry-run，傳 true 才會套用'); return; }
    // 套用前：pushUndoSnapshot() + pushSafetyBackup()
};
```
**新工具請遵守這個慣例** —— 使用者很信任「不會亂刪資料」這件事。

---

## 🤝 8. 多人協作

**`index.html` 是單一巨大檔，兩邊同時改一定衝突。**

建議：**同一個時間只有一邊在改**，改完先 push，另一邊再 pull。

```bash
git pull --rebase origin main
```

---

## 📞 9. 出問題了

1. **先看版本徽章** —— 確定載入的是不是最新版
2. **開 F12 Console** —— 這專案有大量 `window.diagnose*()` 工具可以直接打
3. **匯出 JSON 備份** —— 教材庫頁有匯出，資料只存在 localStorage，清掉瀏覽器資料就沒了
