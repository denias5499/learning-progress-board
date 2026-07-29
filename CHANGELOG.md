# 版本演進 (CHANGELOG)

## v1.3 (2026-07-28) — 知識星空圖 🌌

### v1.4.23 (2026-07-29) — Debug dump 模式

**Denias 15:17 提供截圖:**
6 筆缺失任務中 5 筆 category 是「會考複習」
1 筆 (7/3 英文 U1 P.19~23) category 是「系統重排」

**關鍵問題:**
5 筆「會考複習」任務為什麼 v1.4.21 debug 看不到?
category filter 移除後應該看到, 但 Denias 15:05 截圖還是看不到

**推測根因:**
這些 log 不在 appLogs 裡, 或者月曆 task 顯示為完成但沒 push log
可能是:
- 月曆 task 被勾 done 後 log 被刪除 (例如 plan 被刪)
- 任務從 plan grid 但 log 不同步
- task.unitId 找不到 master unit 對應

**v1.4.23 dump 模式:**
- 顯示每月所有 logs (含 system 重排)
- 每筆標 ✓/✗ 加上排除原因
- 顯示 uid/cat/mis/id 完整資料

檔案: 5261 → 5280 行 (+19)

### v1.4.22 (2026-07-29) — Debug panel 不過濾 category

**Denias 15:05 提供完整 debug panel:**
- W1: 89 頁 (14 筆), W2: 147 頁 (22 筆), W3: 154 頁 (25 筆), W4: 92 頁 (18 筆), W5: 28 頁 (9 筆)
- appLogs 總計: 510 頁, 但系統顯示 452 頁 (dedup 移 58)

**仍然缺的 6 筆 log (歷史紀錄內有, W1/W2 沒有):**
- 7/3 地理位置 P.18~21 (4頁)
- 7/3 公民人性尊嚴 P.5~9 (5頁)
- 7/3 英文 U1 P.19~23 (5頁)
- 7/7 歷史大航海 P.23~28 (6頁)
- 7/8 歷史大航海 P.29~33 (5頁)
- 7/8 地理臺灣 P.30~37 (8頁)
- 共 33 頁

**推測根因:**
這 6 筆 log 的 category 是 '🔄 系統重排' 或 '🗓️ 計畫管理'
v1.4.21 debug panel 還是有 filter 排除這兩個 category
所以 debug 看不到, 但「歷史紀錄」看得到 (歷史紀錄沒 filter)

**修復:**
- debug panel 不過濾 category, 顯示全部 appLogs

檔案: 5258 → 5261 行 (+3)

### v1.4.21 (2026-07-29) — Debug panel 不套用 filter

**Denias 14:44 反映:**
v1.4.20 debug 還是被 filter 過濾掉, W1 缺 3 筆 (地理位置、公民、英文 U1 P.19~23)
W2 也缺一些

**根因:**
debug panel 讀 `byMonth.weekLogs` — 這是 renderMonthlyAnalysis 過濾後的資料
filter 掉的 log 不會出現在 debug

**修復:**
- debug panel 改用 unfiltered appLogs
- 按 mission 分組顯示
- 顯示 unitId
- 每筆標 ✓/✗ 讓 Denias 看到是否被 filter 排除

檔案: 5214 → 5258 行 (+44)

### v1.4.20 (2026-07-29) — Debug panel 顯示 mission

**Denias 12:11 反映:**
W1 還缺 3 筆 log (歷史、地理、公民), 英文那筆之前有看到

**推測:**
- 這 3 筆 log 的 mission 是「會考複習」
- Denias 在月份分析選了別的 mission filter (如「暑期複習進度」)
- filter 把會考複習的 log 過濾掉

**修復:**
- debug panel 顯示 mission 欄位, 方便辨識每筆 log 屬於哪個任務
- Denias 可以直接對應缺哪個 mission 的 log

檔案: 5210 → 5214 行 (+4)

### v1.4.19 (2026-07-29) — 週次改用 Denias 的定義

**Denias 11:57 反映:**
週次定義錯誤, 應該是 7/1~7/5 = W1, 7/6~7/12 = W2 (而非全部 7/1~7/12 都是 W1)。

**新週次定義:**
- W1 = 月初到本月第一個週日 (不一定 7 天)
- W2+ = 第一個週一開始每 7 天
- 例: 7 月: W1=7/1~7/5 (5天), W2=7/6~7/12 (7天), W3=7/13~7/19, W4=7/20~7/26, W5=7/27~7/31

**修改:**
- getMonthWeek 改用新邏輯
- 月份分析 bar chart wkStart/wkEnd 也同步改

檔案: 5166 → 5210 行 (+44)

### v1.4.18 (2026-07-29) — Debug panel 加 date 欄位

**Denias 11:53 反映:**
歷史紀錄頁面中那 6 筆 log 都存在, 但月份分析 W1 debug 沒看到。

**發現原因:**
- v1.4.16 我收集 weekLogs 時忘了存 date 欄位
- debug panel 顯示 'undefined' (l.date)

**修復:**
- 補 date 到 weekLogs 收集

檔案: 5164 → 5166 行 (+2)

### v1.4.17 (2026-07-29) — Debug panel 預設展開 (不用 toggle)

**Denias 03:40 反映:**
W1=203 還是不對, v1.4.16 debug 按鈕他沒看到 (可能是 cache)。

**修復:**
- 移除 toggle 按鈕, 直接在月份分析頁面預設展開 logs
- 黃底面板顯示每周每筆 log 詳情
- 隨月份分析同步 render, 不用點按鈕

檔案: 5147 → 5164 行 (+17)

### v1.4.16 (2026-07-29) — Debug 工具: 看本月所有 Logs

**Denias 03:26 反映:**
W1=203 還是不對, 實際 168, 差 35 頁。

**未解問題:**
- 40 → 241 → 203 都在改善, 但還差 35 頁
- 重複來源不明, 需要看實際 logs 才能診斷

**修復 (Debug 工具):**
- 月份分析頁面加 「📋 看本月 Logs」 按鈕
- 點下去展開本月所有 logs (按週分類)
- 顯示: 日期 | 科目 | 單元 | P.~ | 頁數 | id
- 方便 Denias 找出哪幾筆是重複

檔案: 5106 → 5147 行 (+41)

### v1.4.15 (2026-07-29) — Dedup 改為 (subject+date+pages)

**Denias 03:21 反映:**
W1 顯示 241 頁, 但實際加總是 168, 差 73 頁。

**根因 (v1.4.11 修正不全):**
- dedup 用 (subject+unitName+start+end+date)
- 但 plan 自動重複 task 加上手動標記完成可能產生 unitName/start/end 微差的 log
- 結果仍有重複計算

**修復:**
- dedup key 改為 (subject+date+pages)
- user 不可能在同一天同樣科目讀兩次同樣頁數
- 加 (date+pages) 跨科目防護, 處理 subject/unitName 微差

檔案: 5097 → 5106 行 (+9)

### v1.4.14 (2026-07-29) — 緊急 fix: Can't find variable: byMonth

**Denias 03:07 反映:**
整個程式壞掉, 無法進入 (系統初始化錯誤 → Can't find variable: byMonth)

**根因 (v1.4.10 移除 bug):**
- v1.4.10 我加 dedup 邏輯時, 重複宣告區塊, 不小心覆蓋
- 原本 `var byMonth = {};` 被刪掉
- appLogs.forEach 內用到 byMonth 但沒宣告 → 程式崩潰

**修復:**
- 加回 `var byMonth = {};` 在 seenLogs 旁邊
- 驗證 v1.4.10/v1.4.11/v1.4.12 deploy 後從未正常運作 (因 byMonth 始終找不到)

**諷刺的是:** Denias 之前看 340, 是因為 byMonth 變數引用失敗之前
產生其他 error, 可能是其他 path 走到的, 或 byMonth 偶然是 undefined 物件
以某種方式處理
- 這次 v1.4.13 後 cache control + 強制重整後才看到「Can't find variable: byMonth」

**為什麼之前 Denias 能看 340:**
- 可能是某個 code path 偶然能跑 (如 filter 導致直接 return)
- 或 cached 舊版還沒清掉

檔案: 5096 → 5097 行 (+1)

### v1.4.13 (2026-07-29) — Cache busting meta + 版本戳記

**Denias 03:00 反映:**
v1.4.12 部署後還是看到「系統載入異常」訊息。

**根因:**
- v1.4.12 實際有部署 (alert 訊息已改為「系統初始化錯誤」)
- 但 Denias 看到的還是「系統載入異常」→ browser HTTP cache
- GitHub Pages 有時候 cache 很久, 強制重整不一定夠

**修復:**
- 加 no-cache, no-store, must-revalidate meta
- title 加 [v1.4.13] 戳記, Denias 可以看是否加載新版
- 若還是看到「系統載入異常」, 表示 localStorage 真的壞了
  需要 Denias dump 出來手動修

檔案: 5089 → 5096 行 (+7)

### v1.4.12 (2026-07-29) — 系統載入異常錯誤訊息改進

**Denias 02:55 反映:**
「系統載入異常」錯誤 (系統載入异常, 請確保您的資料檔案沒有毁損)

**根因:**
- initUsers 整個 try 包住
- JSON.parse(localStorage) 失敗 → 整個 init 崩潰
- 錯誤訊息太抽象, 不知道哪裡壞了

**修復:**
- JSON.parse 獨立 try-catch, 失敗時:
  - 自動備份毀損資料到 `*_backup_<timestamp>` key
  - 給詳細錯誤訊息 (含 parseErr.message)
  - 用空白資料繼續, 不卡死整個 app
- 最後 catch 加詳細訊息 (含 e.message, 提示開 F12 看 console)

檔案: 5071 → 5089 行 (+18)

### v1.4.11 (2026-07-29) — 月份分析 dedup 改進 (W1=340 bug)

**Denias 02:48 反映:**
從月曆加總 W1=168 頁, 系統顯示 340, 不正確。

**從 Denias 月曆續看:**
- 7/10 有兩個 [理化] 波浪與聲音 P.35~49 (同個 task 重複)
- 表示 plan 內有重複 task

**v1.4.10 修正不全:**
- dedup key 用 (unitId, date), 但不同 plan 重複 task 有不同 task.id, unitId 也可能不同
- 沒去除真正重複的 task

**修復:**
- dedup key 改為 (subject + unitName + start + end + date)
- 同個 unit 同個 page range 同一天只算一次
- 例如 7/10 兩個理化波浪 P.35~49 會被去重為一次 (15 頁)

檔案: 5064 → 5071 行 (+7)

### v1.4.10 (2026-07-29) — 月份分析去重 (W1=340 bug)

**Denias 02:42 反映:**
實際計算 W1 只有 168 頁, 系統顯示 340, 不正確。

**根因 (v1.4.9 修正不全):**
- 月份分析沒有去重邏輯
- 同一個 (unitId, date) 在多個 plan 重複 task, 每次完成 push 一個 log
- 導致同一個 unitId 同一天被加總多次

**修復:**
- renderMonthlyAnalysis 加 seenLogs Map
- 同 (unitId, date) 只算一次最大 pages
- 避免重複加總

檔案: 5044 → 5064 行 (+20)

### v1.4.9 (2026-07-29) — 月份分析套用看板篩選

**Denias 02:34 反映:**
W1 有 340 頁, 統計數字似乎不正確。

**根因 (v1.4.8 修正不全):**
- renderTreeView 已套用看板篩選 (v1.4.8)
- 但 renderMonthlyAnalysis 完全沒套用
- 不管選什麼任務, 月份分析都顯示全部 log 總和
- 實際選任務看到的頁數不會跟「全部顯示」一樣

**修復:**
- renderMonthlyAnalysis 套用跟 renderTreeView 一樣的 filter 邏輯
- 讀 filter-category + filter-mission
- 算 allowedUnitIds Set
- log.unitId 不在內則 return

檔案: 5010 → 5044 行 (+34)

### v1.4.8 (2026-07-29) — 樹狀圖 bug: 不同任務顯示不同內容

**Denias 02:26 反映:**
不管選「暑期複習進度」或「一模」, 樹狀圖顯示都一樣。

**根因 (v1.4.6/v1.4.7 bug 1 + 1):**

**Bug 1: filter 邏輯錯**
- v1.4.6 的 filter 要求 `filterCat !== 'ALL' && filterMis !== 'ALL'`
- 但 cat dropdown 預設是 ALL, mis 切換時 cat 不一定動
- 只要 cat=ALL, allowedUnitIds=null, 全部 units 都顯示
- -> 不同任務看到一模一樣 (全部)

**Bug 2: 切 filter 後 tree/monthly 不重繪**
- onFilterCategoryChange 只叫 renderDashboard()
- filter-mission onchange 也只叫 renderDashboard()
- 樹狀圖/月分析不會重畫, 看到的是旧狀態

**修復:**
- 重寫 filter 邏輯: 只要 mis 不是 ALL 就用 mis 查 unitIds
  (搜尋 appMissions 找 mis 實際所屬 cat, 不依賴 filterCat)
- onFilterCategoryChange 加 renderTreeView() + renderMonthlyAnalysis()
- filter-mission onchange 加 renderTreeView() + renderMonthlyAnalysis()

檔案: 4995 → 5010 行 (+15)

### v1.4.7 (2026-07-29) — X 軸軸線對齊 Y=0

**Denias 02:11 反映:**
X 軸軸線無法對齊刻度 0, 軸線在「日期範圍」上方 (但 Y 軸 0 標籤在下方) 。

**根因 (v1.4.6 bug):**
- monthly-weeks border-bottom 在 weeks 底部, 位置在 caption 之上
- 但 Y 軸 0 標籤在 chart-area 底部 (caption 下方)
- 結果 X 軸線跟 Y=0 標籤不在同一條水平線上

**修復:**
- 改用 .monthly-weeks::after 畫 X 軸線, position absolute top: 208px
- 208px = pages(20) + margin-top(8) + area(180) = Y=0 位置
- Y 軸 (yaxis-wrap) top: 0, yaxis height: 180px, 從 title 後 (~y=28) 到 y=208 = Y=0 ✓
- Y=340 在 y=28 (對齊 area top), Y=0 在 y=208 (對齊 X 軸線) ✓

檔案: 4989 → 4995 行 (+6)

### v1.4.6 (2026-07-29) — 4 個修正

**Denias 02:04 反應:**

1. ✅ **X 軸軸線** — monthly-weeks border 2px → 3px 深色 (`var(--primary)`)
2. ✅ **Y 軸加「頁數」標籤** + caption 簡化
   - 新增 .monthly-yaxis-wrap + .monthly-yaxis-title (上方標題 「頁數」)
   - caption: 「週次 · 日期範圍 (頁數 / Y 軸)」 → 「週次 · 日期範圍」
3. ✅ **樹狀圖同步看板篩選** (大改)
   - 讀 filter-category + filter-mission 選擇
   - 算出 allowedUnitIds Set
   - 過濾 custom units + vols units
   - 過濾掉完全空的 vols
   - 樹狀圖只顯示選中 mission/cat 內的 unit 進度
4. ✅ **刪除「學習統計分析」右側回首頁按鍵** (看板篩選已有, 重複)

檔案: 4909 → 4989 行 (+80)

### v1.4.5 (2026-07-29) — bar 從 0 往上長 (CSS 重寫)

**Denias 01:51 反映:**
W4=30 bar 看起來對齊到 Y=85 (看起來超過 85), 而不是從 Y=0 往上。

**根因 (v1.4.4 仍未根本解決):**
- wrap 用 `grid-template-rows: auto 180px auto auto` 複雜結構
- area 設 height 但 grid child 撐不開
- 第二個 `.monthly-week-bar-area` CSS 覆蓋第一個, 衝突
- wrap 沒 height, bar 從 area 底部往上, 但 area 不一定是 180px

**根本修复 (重寫 layout):**
- 拋棄 grid 複雜度, 改用 flex column + order 控制順序
- `.monthly-week-bar-wrap` flex column, 4 child 用 order 排序: pages/area/label/range
- `.monthly-week-bar-area` 用 `flex: 0 0 180px` 固定 180, 不縮不伸
- 合併兩個重複的 `.monthly-week-bar-area` CSS
- bar 在 area 內 `align-items: flex-end` 對齊底部, 從 0 往上長

**驗證:**
- W4=30, bar = 16px, 在 Y=0~85 之間下 1/3 ✓
- W1=340, bar = 180px, 到 Y=340 ✓

檔案: 4902 → 4909 行 (+7)

### v1.4.4 (2026-07-29) — 月份分析 bar 從 0 往上長 (真 fix)

**Denias 01:47 反映:**
從圖看, W4 bar 不從 Y=0 開始往上長, 反而從 ~Y=85 起算, 違反長條圖原則。

**根因 (v1.4.3 仍未解決):**
- wrap 用 `grid-template-rows: auto 180px auto auto`, 但 `monthly-week-bar-area` 沒有 height
- area 被 bar 內容撐大 (只有 16px), 而非 180px
- 結果: bar 從 area 底部往上長, 但 area 高度不對, 看起來不是從 0 開始

**修复:**
- `.monthly-week-bar-area` 加 `height: 180px; min-height: 180px;`
- JS 內 inline `style=\"height:180px\"` 雙重保險
- 驗證: W4 bar = 16px 從 Y=0 開始 (之前從 ~Y=85 起算, 現修正)

檔案: 4899 → 4902 行 (+3)

### v1.4.3 (2026-07-29) — 月份分析 bar 比例錯位 fix

**Denias 01:44 反映:**
月份分析 W4=30 頁的 bar 視覺上像對齊到 Y=85 那條線, 看起來好像 85+ 頁。

**根因 (v1.4.2 bug):**
- 原本用 `grid-template-rows: auto 1fr auto auto` 的 `1fr` 是彈性, 會把 bar 撐大到剩餘空間, 不是真正的比例
- W4 bar 變成被 grid 撐大, 看起來跟 Y=85 對齊

**修復:**
1. wrap 改用 `grid-template-rows: auto 180px auto auto` (固定 180px)
2. 加 `.monthly-week-bar-area` wrapper 固定 180px 高, bar 從底部往上長
3. bar 高度公式: `(pages / maxWeekPages) * 180` (不用 * 110)
4. Y 軸固定 180px 高, top: 28px 對齊 bar-area 頂部

**驗證:**
- W1=340 → bar 180px (到 Y=340)
- W4=30 → bar 16px (在 Y=0~85 之間, 清楚不到 85)

檔案: 4880 → 4899 行 (+19)

### v1.4.2 (2026-07-29) — 3 個修正

**Denias 01:34 反應:**

1. ✅ **平均值跟當天頁數統計疊在一起**
   - 平均值字體: 2em → 1.3em (跟近 7 日學習量 h3 差不多)
   - 換 <b> 為 <span class="avg-num"> 黃底 pill
   - margin-bottom: 10px → 20px (多空一行)
   - 變成上下分離的區塊

2. ✅ **樹狀圖還是看不到 (v1.4.1 未根本解決)**
   - **根因**: `returnToHome()` 內 `el('starmap-root').style.display = 'none'` 把 page-stats 內的 starmap-root 隱藏了
   - openStats 呼叫 renderTreeView, 但 element 仍是 display:none → render 後什麼都看不到
   - **修复**: openStats 內加 `sm.style.display = ''` 取消隱藏

3. ✅ **月份分析 bar 視覺修正**
   - 原本用 flex `justify-content: flex-end` → bar 從底部往上長但底部空很大
   - 改用 grid-template-rows: `auto 1fr auto auto` (pages / bar / label / range)
   - bar 從 0 往上長, label 跟 range 統一在下方 (X 軸下方)
   - X 軸 border-bottom 保留, 看起來是正常 Y 軸

檔案: 4773 → 4880 行 (+107, CSS 大改)

### v1.4.1 (2026-07-29) — 5 個修正 + CSS 補上

**Denias 01:13 反應的 5 個問題:**
1. 「16.4 黏在一起」 → 平均值放大 (2em, 黃底 pill, 900 weight)
2. Bar 顏色 → 改為 `#D6C3BF` (儀表板 + 月份分析都改)
3. 總計 109 頁底色 → `#99F2E2` (深綠字)
4. **樹狀圖不見了** → **v1.4.0 漏掉了 `.stats-tab` / `.stats-view` / `.tree-*` / `.monthly-*` 所有 CSS, 本次補上**
5. 月份分析長條圖強化 → 加 Y 軸刻度 (5 等分頁數) + X 軸 caption + 套用 #D6C3BF

**根因 (v1.4.0 bug):**
v1.4.0 的 patch script 從 step 4+5 開始出現 anchor 錯誤 (8 spaces vs 4 spaces 混淆), 所有 CSS 都未生效。HTML + JS 都有, 所以「點下去什麼都沒出現」。

**修复:**
- 補上 `.stats-tab` / `.stats-view` / `.stats-card-header` CSS
- 補上完整 `.tree-container` / `.tree-subject` / `.tree-dot` / `.tree-unit` CSS (nested ul)
- 補上完整 `.monthly-block` / `.monthly-weeks` / `.monthly-week-bar` CSS + Y 軸
- 修飾平均值樣式 (放大 2em + 黃底 pill)

檔案: 4634 → 4773 行 (+139)

### v1.4.0 (2026-07-28) — 學習統計分析 + Dashboard 強化 📊

**Denias 17:10 一次提了 5 個需求:**

1. ✅ **7 日 bar 加 (頁) 單位、平均線、總計**
   - h3 標題: 「📊 近 7 日學習量 (頁)」
   - 右上角: 「總計 162 頁」 (gradient pill)
   - 平均線: 紅色 dashed 線 + avg 標記
   - 平均文字: 「7 日平均 23 頁/天」

2. ✅ **星期旁加日期 (e.g., 三 7/23)**
   - 星期標籤下加 .dash-week-date

3. ✅ **月份分析 (月→週 bar chart)**
   - 新函數 renderMonthlyAnalysis()
   - 以月份為單位, 每週一個 bar
   - 顯示該週日期範圍 (e.g., W3 7/15~7/21)
   - 過濾掉系統重排 + 計畫管理 log (跟 v1.3.6 fix 一致)

4. ✅ **首頁加 「學習統計分析」 icon (第五個 nav button)**
   - 新增 nav-btn-stats
   - 淺藍色背景

5. ✅ **樹狀圖 + 月份分析 從首頁搬到 「學習統計分析」 頁**
   - 首頁 dash-tabs 移除 (只剩下儀表板)
   - 新頁 page-stats, 含 3 個 tab: 樹狀圖 / 月份分析
   - switchStatsView() 函數處理切換
   - openStats() 函數處理進頁

**檔案: 4430 → 4634 行 (+204, 大版)**

### v1.3.6 (2026-07-28) — 近 7 日學習量 bug fix

**Denias 16:54 反應:** 週日顯示 42 頁, 但月曆加起來只有 15 頁

**根因:** `renderDashSummary` 裡的 7 日計算沒過濾掉 `🔄 系統重排` 和 `🗓️ 計畫管理` 類型的 log。這些 log 是「手動拖曳順延 / 計畫管理」產生的, 並不是真正的學習, 但 pages 欄位不為 0 (例如 「連動順延」 log 會帶 `pages: maxUnitEnd - currentStart + 1`)。

42 頁 = 實際學習 15 頁 + 系統重排 27 頁

**修復:** 在 appLogs.forEach 加一行過濾:
```js
if (l.category === '🔄 系統重排' || l.category === '🗓️ 計畫管理') return;
```

這樣本週學習量、7 日 bar chart、本月學習量都會正確顯示「真正學習」的頁數。

### v1.3.5 (2026-07-28) — 退回 v1.3.1 並放大版

**Denias 16:22 反應:**
- v1.3.4 (SVG 倒樹垂直堆疊) 仍太小, 完全無法辨識
- 要求退回 v1.3.1 版 (HTML nested ul 樹狀圖)

**但保留 v1.3.1 原結構, 加大為放大版:**
- grid 寬度: 280px → **380px** (範圍更寬)
- 圓點: 14×14px → **18×18px**
- 文字: 0.95em → **1.05em** (單元名)
- 冊標題: 0.95em → **1.1em**
- padding: 16/20 → **22/26** (內距放大)
- 保留 ⏰ 排程鐘 (v1.3.3 加入)
- Tab 文字: 「進度樹」 → 「樹狀圖」 (跟 v1.3.1 一致)
- 結構 = v1.3.1 的 nested ul tree, 只是視覺放大
- 檔案: 4405 → 4430 行 (+25)

### v1.3.4 (2026-07-28) — SVG 倒樹垂直堆疊 (方案 D)
- **被 v1.3.5 取代**

### v1.3.2 (2026-07-28) — SVG 倒樹進度樹 🌳

**Denias 15:53 決定:** 方案 A, 自下而上倒樹 (按參考圖)

設計變更 (vs v1.3.1):
- 移除 HTML nested ul tree
- 改為 SVG 自下而上倒樹
- 每個科目一棵樹, 橫向並排
- 結構 (從底到頂):
  - 🟫 L0 底部 = 科目 root (深棕, 含科目名 + 完成計數)
  - 🟩 L1 中層 = 冊 (深綠, 含冊名 + 進度)
  - 🟨 L2 頂部 = 單元 (亮黃=完成/藍邊=進行中/白=未完成)
- 連線用平滑 Bézier 曲線 (從下指向上)
- 🖱️ Hover tooltip 顯示: 科目 › 冊 › 單元 + 頁碼 + 狀態
- Tab 改名: 「樹狀圖」 → 「進度樹」

### v1.3.1 (2026-07-28) — 重做为樹狀圖 🌳

## v1.3 (2026-07-28) — 知識星空圖 🌌
- 🌟 **新 tab「星空圖」**: Dashboard 上方加兩個 tab (儀表板 / 星空圖), 點切換
- 🌌 **Constellation Star Map**: 根據 plan (專案) 繪製所有 mission 的星空
  - 每個 mission = 一個 cluster (圓形區域)
  - Cluster 內每個 unit = 一顆星
  - 同 subject 的 unit 用細線連成星座
- ✨ **完成度視覺化**:
  - 100% 完成 = 金色亮星 + glow 光暈 + ✓ 標記
  - 1-99% 進行中 = 藍色漸層星
  - 0% 未開始 = 灰色描邊 (反白)
- 📅 **Plan Selector**: 星空圖頂部 dropdown 切換不同 plan
- 🖱️ **Hover Tooltip**: 顯示「科目 / 單元名 / 頁數 X/Y / 完成率」
- 🎨 **背景星空**: 80 顆隨機背景裝飾星
- 📊 **Cluster summary**: 每個 mission 下方顯示「N / M 單元完成」
- 🛠️ **底層**: 純 SVG, 無外部 library, 保持單檔 SPA 架構

## v1.2 (2026-07-28) — 預定完成日提示
- 📅 Dashboard 未完成單元 modal 狀態欄智能化：
  - 如果月曆有排程到這個單元,顯示「預定 M/D 完成」(藍色,粗體)
  - 如果沒排程,顯示「待安排」(灰色)
- 🔍 新增 `findUnitScheduledDate(unitId)` 函數,從所有 plan 的 grid 找最後一個未來排程日
- 📊 processUnit 收集 `id` + `expected` 到 todoUnits

### v1.2.2 (2026-07-28) — Debug 資訊加强
- 📊 Modal 標題加 summary: 「教材庫 N 頁 / 已完成 M / 剩餘 K」
- 📌 每個 row 加教材庫頁碼範圍 (e.g., `P.68~87`)
- ⚠ 未勾選 task 計數: 「⚠ N 未勾」讓 Denias 一眼看出哪個 unit 在月曆上還有未勾 task

背景: Denias 2026-07-28 13:32 報告 U4 「原排 7/24 逾期」但他已勾完成。
	root cause 是 v1.2 跳過過去日期,v1.2.1 修了。
	v1.2.2 加 debug 是因為 v1.2.1 還可能誤判有其他未勾 task。
	Denias 13:49 提供教材庫截圖證明 U4 = P.68-87 (20 頁) → 之前剩 1 頁是教材庫是 5 頁的舊狀態。

### v1.2.1 (2026-07-28) — Bug fix
- 🐛 **修正**: v1.2 的 `findUnitScheduledDate` 不該跳過過去日期,導致「已排過但過期」的單元誤顯示「待安排」
- ✨ 改用 `!t.isDone` 過濾已勾選完成的 task,過去/未來日期都保留
- 🏷️ 新增三種狀態顯示：
  - 未來排程 → 「預定 M/D 完成」(藍)
  - 今日排程 → 「今天 M/D 完成」(藍)
  - 過去排程 → 「原排 M/D (逾期)」(橘粗)
  - 無排程 → 「待安排」(灰)

## v1.1 (2026-07-28) — 暗色模式 + 進度儀表板
- 🌙 **深色模式** — 一鍵切換，自動跟隨系統偏好，偏好記住到 localStorage
  - 完整顏色覆寫：背景、卡片、按鈕、表格、輸入框、modal
  - 過場 0.3s 漸變，不刺眼
- 📊 **進度儀表板** — Dashboard 上方加入 4 個統計卡 + 7 日學習量長條圖
  - 👥 學生人數 (含姓名清單)
  - 🎯 任務/分類總數
  - 📚 歷史學習活動筆數
  - 📅 本週/本月學習頁數
  - 📊 近 7 日 bar chart (hover 看日期+頁數)
- 🔧 CSS 結構：所有顏色改用 `:root` variables，主題切換零延遲
- 💾 Theme 偏好：`localStorage['StudyMap_Theme_V21']`

## v1.0 (2026-07-28) — 初版
- 從 local file `進度看板131` 移轉上 GitHub
- 加入 README.md 與本 CHANGELOG