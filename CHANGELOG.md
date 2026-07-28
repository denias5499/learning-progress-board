# 版本演進 (CHANGELOG)

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