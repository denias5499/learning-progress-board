# v1.4.0 測試版

這是從 git tag `v1.4.0` 抽出的歷史版本,**不會自動更新**。

## 怎麼用

### 方式 1 — 直接從檔案系統開啟 (推薦)
1. 開瀏覽器 (Chrome / Safari / Firefox)
2. 在網址列輸入 (macOS): `file:///mnt/my_book/Denias/projects/learning-progress-board/_test_v140/index.html`
3. **注意**: 從 `file://` 開啟時,localStorage 跟 Pages 的 localStorage 是分開的 — 不會互相干擾

### 方式 2 — 從 GitHub raw 直接看
https://raw.githubusercontent.com/denias5499/learning-progress-board/v1.4.0/index.html
但這是 raw HTML,直接開會變純文字。**不推薦。**

## ⚠️ 這個版本會看到的狀況
- v1.4.0 沒有「各科整體進度 bar」summary (跟現在的 v1.5.5 對照)
- 但 `renderDashboard()` 內有 mission bar — **要選 mission filter 才會顯示**
- 試試 filter 設成 `ALL 全部 / ALL 全部任務` 然後看下面有沒有 bar

## 🔄 localStorage 提醒
- v1.4.0 用 `localStorage` 存資料, key 是 `StudyMap_Family_Data_V20`
- 從 `file:///` 開啟時:
  - 瀏覽器通常**仍會給 localStorage** (除非你開無痕模式)
  - 但 localStorage 是按 **origin** 區分 — `file://` 跟 `https://` 完全隔離
  - **所以你 Pages 上的資料不會跑到 v1.4.0 來**
  - **v1.4.0 也會是空資料** (除非你之前用 file:// 玩過)
- 空資料時 v1.4.0 會顯示「學生 A」預設 user — 進度條都不會有
- 要看進度條,你需要先在 v1.4.0 裡建教材 + missions + 加 logs (很麻煩)

## 預期結果 (我已經查證 v1.4.0 source code)
- ✗ 沒「各科整體進度 bar」 summary (只有 4 個總統計 + 7-day bar)
- ✓ 篩選 mission 後, renderDashboard() 內會跑 mission bar (但要看 appMissions 當時的狀態)

## 回報
告訴我:
1. v1.4.0 的首頁有沒有任何 progress bar?
2. 有沒有 mission filter 後才看到 bar?
