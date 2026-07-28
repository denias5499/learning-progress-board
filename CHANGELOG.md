# 版本演進 (CHANGELOG)

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