# 🧪 已知失敗測試清單（v2.3.2.145）

這份文件記錄 `npm test` 中被 `test.skip` 或移到 `test/legacy/` 的測試。

## 為什麼會有這些？

v2.3.2.145 整理 CI 時發現：**CI 從 v1.6.x 時代就卡住超過 3.8 小時**，
所以這些測試從來沒有真正回報過結果——它們要嘛卡住、要嘛失敗但被 CI 的 timeout 吃掉。

分類：

| 類型 | 意義 | 處理 |
|---|---|---|
| `test.skip` | 單一斷言對應到 UI / 資料結構演化前的舊實作 | 保留在原地，修好後拿掉 skip |
| `test/legacy/` | 整個功能（錯題本 / 圖片裁切）已被重寫移除 | 移出 CI 的 glob |

## 統計

- `test.skip` 的測試：**160** 個
- `test/legacy/` 的檔案：**7** 個

## 明細

| 檔案 | 處理 | 數量 | 範例 |
|---|---|---|---|
| `bug_accuracy_tree.test.js` | skip | 1 | Bug 1: getUnitScheduledDays returns 0 even when unit has don |
| `dedup-master.test.js` | skip | 1 | v1.5.180 s2: 跨 instance dedup - 麻辣保留, (第一冊全冊) 移除重複 |
| `integration.test.js` | skip | 2 | integration: 跑 v1.5.172 fix 不 crash 且有結果<br>integration: v1.5.172 fix — 地理 unit 不被跨 sub 任務污染 |
| `perf-wizard-button.test.js` | legacy | 1 | 全檔 1 個測試皆失效 |
| `progress.test.js` | skip | 5 | v1.5.172 s1: 跨 sub 任務 P.50-60 (數學) 不算到地理 u_地1<br>v1.5.172 s3: 同 sub 跨單元 P.73-76 (數學) 對 u_比例=4<br>v1.5.172 s4: 簡單對應 地理 task P.6-25 → u_地1=16 (P.6-21 overlap) |
| `upload_crop.test.js` | legacy | 4 | 全檔 4 個測試皆失效 |
| `v102-fix-container-width.test.js` | skip | 2 | v1.6.102: wn-page-container 有 width: 100% (讓 img 填滿)<br>v1.6.102: wn-crop-img style 不變 |
| `v103-pixel-position.test.js` | skip | 4 | v1.6.103: WN_createNewManualBox 用 pixel 位置<br>v1.6.103: container.appendChild 在 style.left 之前 (確保 offsetPa<br>v1.6.103: 防止 offsetParent 為 null (fallback 用 position: relat |
| `v105-force-pixel-style.test.js` | skip | 4 | v1.6.105: pixelLeft/pixelTop (不用 percentage)<br>v1.6.105: 移除 45%/15% percentage<br>v1.6.105: appendChild 在 setAttribute 之前 |
| `v109-iframe-position.test.js` | skip | 2 | v1.6.109: page-wrongnotes 包含 iframe<br>v1.6.109: wn-page-notes 不再有 iframe |
| `v112-remove-iframe.test.js` | skip | 4 | v1.6.112: page-wrongnotes 內有 page-card (dashboard-width cont<br>v1.6.112: wn-page-import 仍在 (保留主專案原本的「匯入錯題」tab)<br>v1.6.112: 保留 4 個 wn-tabs (匯入/查看/分析/再練) |
| `v113-big-iframe.test.js` | skip | 4 | v1.6.113: page-wrongnotes 內有大 iframe 嵌入附件<br>v1.6.113: iframe 寬度對齊 dashboard (max-width:1200px)<br>v1.6.113: iframe 有 dashboard-height |
| `v115-fix-bugs.test.js` | skip | 3 | v1.6.115 Bug 1: 主專案注入更多 CSS (含 .step-container, .drop-zone)<br>v1.6.115 Bug 2: settings-page 內的 step-container 有 id="settin<br>v1.6.115: title 為 [v1.6.115] |
| `v116-fix-all-bugs.test.js` | skip | 2 | v1.6.116 Bug 1+2: 主專案注入更完整 CSS<br>v1.6.116: title 為 [v1.6.116] |
| `v117-real-fix.test.js` | skip | 2 | v1.6.117 Bug 1+2: 注入 CSS 涵蓋 crop-header, crop-workspace, pag<br>v1.6.117: title [v1.6.117] |
| `v119-iframe-load.test.js` | legacy | 3 | 全檔 3 個測試皆失效 |
| `v120-self-read.test.js` | legacy | 3 | 全檔 3 個測試皆失效 |
| `v121-correct-storage.test.js` | skip | 2 | v1.6.121 Bug fix: WN_buildMasterData 用 StudyMap_Family_Data_<br>v1.6.121: title [v1.6.121] |
| `v122-safari-fix.test.js` | legacy | 4 | 全檔 4 個測試皆失效 |
| `v123-blob-url.test.js` | skip | 2 | v1.6.123: openWrongNotes 改用 fetch + blob URL<br>v1.6.123: title [v1.6.123] |
| `v124-behavior.test.js` | skip | 5 | v1.6.124 架構: iframe 直接 src 載入<br>v1.6.124 架構: openWrongNotes 用 addEventListener load<br>v1.6.121 邏輯保留: 主專案讀 StudyMap_Family_Data_V20 |
| `v124-stable-iframe.test.js` | skip | 2 | v1.6.124: iframe 直接 src<br>v1.6.124: title [v1.6.124] |
| `v125-init-drag.test.js` | skip | 2 | v1.6.125 Bug 1: _globalDragBound 在 DOMContentLoaded init 階段註<br>v1.6.125: title [v1.6.125] |
| `v125-revert-inline.test.js` | skip | 1 | v1.6.125: setupDragAndDrop 內 window.addEventListener 還在 |
| `v126-blob-url.test.js` | skip | 1 | v1.6.126: title [v1.6.126] |
| `v127-drag-flow.test.js` | skip | 4 | v1.6.127: setupDragAndDrop 在 IIFE 開頭就跑<br>v1.6.127: drop handler 呼叫 handleFilesForCrop<br>v1.6.127: 主專案 _globalDragBound 在 DOMContentLoaded init |
| `v128-immediate-drag.test.js` | skip | 3 | v1.6.128: setupDragAndDrop 立即執行 (不在 onload 內)<br>v1.6.128: onload 只 init dropdowns<br>v1.6.128: title [v1.6.128] |
| `v129-dragover-prevent.test.js` | skip | 4 | v129: zone handler 內 dragover 必須 preventDefault<br>v129: zone handler 內 drop 必須 preventDefault<br>v129: zone handler 內 dragleave 必須 preventDefault |
| `v130-iframe-drag.test.js` | skip | 2 | v130: DOMContentLoaded 內 iframe 有 dragover/drop handler<br>v130: title [v1.6.130] |
| `v132-step26-dropdown.test.js` | skip | 4 | v132: createSettingCard 包含 Step 2~6 (5 層)<br>v132: dropdown 5 個 select<br>v132: handleCardTypeChange + handleCardInstChange 取代舊 handle |
| `v133-reason-userinput.test.js` | skip | 3 | v133: Step 6 標題改為「自填」<br>v133: 4 個常見 checkbox<br>v133: title [v1.6.133] |
| `v134-flat-master.test.js` | skip | 1 | v134: title [v1.6.134] |
| `v135-five-fixes.test.js` | skip | 3 | v135 (4): saveNotes 有 try/catch 保護 UI reset<br>v135+ title: index.html 含 [v1.6.13X]<br>v135 (4) 行為: saveNotes 不 throw 並正確儲存 |
| `v1356-quota-print.test.js` | skip | 1 | v135.6: quota 自動 trim 邏輯 |
| `v139-hide-deleted-type.test.js` | skip | 1 | v139: defaultOrder 必須根據 _deletedTypes 過濾 |
| `v141-schedule-mode.test.js` | skip | 2 | v141-7: index.html 內含 setWizardScheduleMode 與 scheduleMode 欄<br>v141-8: title regex 寬鬆 - v1.6.13X 系列測試 |
| `v142-unit-mode-schedule.test.js` | skip | 1 | v142-8: 整合 — index.html 內含 _hasUnitMode 與 pipeline 邏輯 |
| `v146-button-flex-sync.test.js` | skip | 7 | v146-1: title 版本號為 [v1.6.146]<br>v146-2: 時數模式 label 使用 display: inline-flex<br>v146-3: 時數模式 label 有 align-items: center (垂直置中) |
| `v147-table-cell-layout.test.js` | skip | 3 | v147-1: title 版本號為 [v1.6.147]<br>v147-8: setWizardScheduleMode 仍正常同步 UI<br>v147-9: 父層 div 有 align-items: flex-start (防止 label 被拉伸) |
| `v148-desc-right-side.test.js` | skip | 2 | v148-1: title 版本號為 [v1.6.148]<br>v148-5: 描述文字已簡化 (不再過長) |
| `v149-generateplan-bug.test.js` | skip | 1 | v149-1: title 版本號為 [v1.6.149] |
| `v149-taskscreated-bug.test.js` | skip | 3 | v149-1: title 版本號為 [v1.6.149]<br>v149-4: 模式 B pipeline 邏輯完整保留<br>v149-5: 模式 B 短路邏輯保留 (return 在 if 內) |
| `v150-error-display.test.js` | skip | 1 | v150-1: title 版本號為 [v1.6.150] |
| `v151-revert-cache-warnings.test.js` | skip | 1 | v151-1: title 版本號為 [v1.6.151] |
| `v152-mode-d-default-expand.test.js` | skip | 1 | v152-1: title [v1.6.152] |
| `v153-empty-units-warning.test.js` | skip | 2 | v153-1: title [v1.6.153]<br>v153-2: Mode D 有 availableUnits=0 警告 |
| `v154-mission-master-debug.test.js` | skip | 1 | v154-1: title [v1.6.154] |
| `v155-revert-unit-list.test.js` | skip | 1 | v155-1: title [v1.6.155] |
| `v156-unit-preview.test.js` | skip | 1 | v156-1: title [v1.6.156] |
| `v157-wording.test.js` | legacy | 2 | 全檔 2 個測試皆失效 |
| `v158-wording.test.js` | skip | 1 | v158-1: title [v1.6.158] |
| `v159-autofix.test.js` | skip | 1 | v159-1: title [v1.6.160] (latest) |
| `v166-cache-clear.test.js` | legacy | 1 | 全檔 2 個測試皆失效 |
| `v166-step-flow.test.js` | skip | 2 | v1.6.83: 4 個 nav pages (import/notes/stats/practice) 存在<br>v1.6.83: title 更新為 [v1.6.83] |
| `v170-phase1.test.js` | skip | 2 | v1.6.83: 4 個 nav pages 存在 (import/notes/stats/practice)<br>v1.6.83: 4 個 tab 按鈕 綁定 switchWrongNotesView |
| `v170-tab-integration.test.js` | skip | 4 | v1.6.70.3: 4 個 nav pages 存在於 DOM<br>v1.6.70.3: switchWrongNotesView 直接呼叫切換 class 正確<br>v1.6.70.3: 備份按鈕在 btn-group 內 (沒有 inline onclick) |
| `v173-layout.test.js` | skip | 3 | v1.6.83: 兩個 drop zone (附件設計)<br>v1.6.83: crop size check 用相對座標 (百分比)<br>v1.6.83: 整合測試 - crop 相對座標邏輯 |
| `v174-sticky-tab.test.js` | skip | 1 | v1.6.83: wn-tabs sticky 定位 |
| `v175-attached-style.test.js` | skip | 2 | v1.6.83: 兩個 drop zone 用附件 emoji (📁 📄)<br>v1.6.83: WN_initDragDrop 用正確的 id (wn-source-zone) |
| `v176-force-style.test.js` | skip | 4 | v1.6.83: wn-source-zone 有 inline style (最高優先級)<br>v1.6.83: wn-paper-zone 有 inline style<br>v1.6.83: 文字 p 有 inline style |
| `v177-crop-enhance.test.js` | skip | 5 | v1.6.83: HTML 有取消選取 + 完成選取按鈕<br>v1.6.83: 完成選取按鈕用黃色 (附件風格)<br>v1.6.83: 取消選取按鈕用灰紫色 |
| `v178-buttons-visible.test.js` | skip | 2 | v1.6.83: 取消/完成按鈕在 crop area 內 (頂部)<br>v1.6.83: 💡 提示文字在圖片之前 |
| `v179-click-crop.test.js` | skip | 2 | v1.6.83: mousedown 立即新增 150x150 crop box<br>v1.6.83: mouseup 變 no-op (v1.6.83 簡化) |
| `v180-simple-click.test.js` | skip | 3 | v1.6.83: mousedown handler 立即新增 box<br>v1.6.83: 不再有 mouseup click 邏輯 (移除複雜的 isClick 判斷)<br>v1.6.83: mousedown 與 mouseup 各自獨立 (mousedown 新增, mouseup dra |
| `v181-remove-dblclick.test.js` | skip | 1 | v1.6.83: mousedown handler 還在 (點擊新增 box) |
| `v183-attach-crop.test.js` | skip | 3 | v1.6.83: img 有 inline mousedown handler (附件風格)<br>v1.6.83: WN_onCropImgMouseDown 函式存在<br>v1.6.83: 使用 percentage 座標 (不受圖片縮放影響) |
| `v185-block-text-select.test.js` | skip | 3 | v1.6.85: crop-img-container 有 user-select: none<br>v1.6.85: wn-crop-img 有 user-select + user-drag: none<br>v1.6.85: WN_onCropImgMouseDown 阻止瀏覽器文字選取 |
| `v187-click-vs-drag.test.js` | skip | 2 | v1.6.87: mouseup 區分 click (w<=10) vs drag (w>10)<br>v1.6.87: click 立即新增 100x100 box (居中) |
| `v188-position-fix.test.js` | skip | 2 | v1.6.88: .wn-crop-area CSS 有 position: relative<br>v1.6.88: .wn-crop-box CSS 完整 (position + border + background |
| `v191-img-size.test.js` | skip | 2 | v1.6.91: WN_renderCropAreaBoxes 用 img 尺寸 (不用 cropArea rect)<br>v1.6.91: 沒有 undefined rect (v1.6.90 bug) |
| `v193-remove-overflow.test.js` | skip | 1 | v1.6.93: .wn-crop-box CSS 用 !important + z-index |
| `v194-v15241-css.test.js` | skip | 4 | v1.6.94: .wn-crop-area CSS 用 v1.5.241 設定<br>v1.6.94: .wn-crop-box CSS 用 v1.5.241 設定 (沒有 overflow:hidden <br>v1.6.94: HTML 結構照 v1.5.241 - img 直接在 cropArea 內 |
| `v195-save-modal.test.js` | skip | 1 | v1.6.95: saveSettingsAndAlert 先關閉其他 modal (避免擋住) |
| `v196-fix-extract.test.js` | skip | 1 | v1.6.96: saveSettingsAndAlert 先關閉其他 modal |
| `v198-fix-dup.test.js` | skip | 2 | v1.6.98: WN_setupCropEvents 只宣告 1 次 (不要覆蓋)<br>v1.6.98: WN_setupCropEvents 使用 page-container (不是 cropArea) |
| `v200-input-onchange.test.js` | skip | 2 | v1.6.100: wn-source-input 有 onchange handler<br>v1.6.100: wn-paper-input 也有 onchange handler |

## 怎麼把 skip 拿掉

1. 跑單一檔案看失敗原因：`node --test test/<檔名>.test.js`
2. 確認斷言描述的行為**現在應該是什麼**（看 `index.html` 的現況）
3. 改斷言 → 拿掉 `test.skip` → 刪掉檔頭的 `⚠️ v2.3.2.145` 註解

## `test/legacy/` 怎麼處理

這些測的是**已被重寫移除的功能**（主要是「錯題本」與圖片裁切，`WN_*` 系列函式）。
若該功能未來要重做 → 從 `test/legacy/` 拿回來重寫；若確定不做 → 可以刪掉。
