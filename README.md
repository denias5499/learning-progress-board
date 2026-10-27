# 📊 學習進度看板 (Learning Progress Board)

一個純前端、可離線使用、單檔 HTML 的學習進度看板。
支援多學生管理、月曆排程、智慧排程精靈、歷史紀錄、列印月曆、JSON 備份/還原。

## 🚀 線上使用

啟用 GitHub Pages 後，可直接從以下網址開啟：

**https://denias5499.github.io/learning-progress-board/**

## ✨ 功能特色

- 👥 **多學生管理** — 每個學生獨立頭貼、獨立資料
- 📅 **月曆排程** — 拖拉式管理每日進度，落後自動順延
- 🪄 **智慧排程精靈** — 依每日可用時數自動分配進度
- 📝 **歷史紀錄** — 完整 Log，可編輯、可匯出
- 🖨️ **列印月曆** — A4 橫式每月一頁
- 💾 **JSON 備份/還原** — 全機資料一鍵打包
- 🔔 **重要提醒** — 日曆上可標示重點事件

## 🛠️ 使用方式

### 網頁版
直接開啟 `index.html` 即可使用，無需安裝。

### 本地使用
1. 下載整個 repo
2. 雙擊 `index.html` 用瀏覽器開啟
3. 首次使用請進入「教材庫與備份」建立科目與單元

## 💾 資料儲存

資料分散在幾個地方，**「匯出 JSON 備份」會全部打包**：

| 位置 | 內容 | 備份涵蓋 |
|---|---|---|
| `localStorage['StudyMap_*']` | 教材庫、計畫、紀錄、答對率、看板設定、安全備份 | ✅ |
| `localStorage['myStudyNotes']` | **錯題本文字**（錯題結構、原因、內容） | ✅ v2.3.2.146 起 |
| `IndexedDB['wrongNoteImgDB'].images` | **錯題本圖片** | ✅ v2.3.2.146 起 |
| `IndexedDB['mockExamImgDB'].mockExamImages` | **模考卷圖片** | ✅ v2.3.2.147 起 |
| `IndexedDB['mockExamReviewDB'].mockExamReviewImages` | **模考複盤照片** | ✅ v2.3.2.147 起 |

> ⚠️ v2.3.2.146 之前，`myStudyNotes` 因為沒有 `StudyMap_` 前綴、圖片又在 IndexedDB，
> **錯題本從來沒被備份過**。v2.3.2.147 之前，**模考的圖片也從來沒被備份過**。
> 舊的備份檔還原後這些會是空的。

每個 domain / file:// 路徑 獨立一份資料。

### 怎麼備份

**⚙️ 教材庫與備份 → 「⚠️ 全機資料備份與還原」→ 💾 備份所有資料**（推薦）

一次打包全部東西（上面表格的所有項目）+ 同步到你綁定的 iCloud/Dropbox/NAS 資料夾。

其他兩個按鈕：
- **📥 匯出 JSON 備份** — 只匯出 JSON（內容相同，不含資料夾同步）
- **📤 匯入 JSON 還原** — 從備份檔還原

想確認備份涵蓋了什麼，在 console 執行：
```js
await diagnoseBackupCoverageAsync()
```

## 📂 檔案結構

```
.
├── index.html         # 主程式 (含 CSS + JS)
├── README.md          # 本檔
└── CHANGELOG.md       # 版本演進紀錄
```

## 📋 版本

- **v1.0 (2026-07-28)** — 初版上線 (進度看板131)

---

_Made with ❤️ by Denias_

## 開發者

### 跑測試

```bash
npm install --no-bin-links   # fs 不支援 symlink 的環境要加
npm test                       # 跑 17 個 test (jsdom + node:test)
```

### 測試結構

- `test/fixtures/studymap-backup-2026-07-28.json` — v1.5.3 真實備份 (原為 index.html 內的 `_v153_BACKUP_PLANS_STR` / `_v153_BACKUP_MASTER_STR` inline 字串, v2.3.2.131 搬出來。⚠️ `config.name = '張裕宣'`, 是同學的資料不是 Denias 的)
- `test/helpers.js` — jsdom loader + fixture builder + 備份 fixture 讀取 (`loadBackupPlans` / `loadBackupMaster`)
- `test/progress.test.js` — mock unit test (12 個) + 邊界測試
- `test/integration.test.js` — 用 `test/fixtures/` 真實備份跑 (4 個)

### 開發流程

進度條算法相關改動 (`getUnitDonePagesByUnitIdMatch`, `getUnitDonePagesByOverlap`):
1. 開 GitHub Issue 描述預期行為
2. 先寫 red test (`test/progress.test.js` 加 case, 跑 `npm test` 確認 fail)
3. 修 `index.html`
4. `npm test` 全綠才 push
5. push → 瀏覽器實測 → close issue
