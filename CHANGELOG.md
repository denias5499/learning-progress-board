# 版本演進 (CHANGELOG)

## v1.3 (2026-07-28) — 知識星空圖 🌌

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