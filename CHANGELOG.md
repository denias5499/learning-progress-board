# 版本演進 (CHANGELOG)

## v1.5.18 (2026-08-01) — 修 renderMissionCheckboxes volume 沒有按 冊 分組

### 問題

Denias 16:43 反映: v1.5.17 修好後 教材庫 tab 1 / 數學 / 複習講義 / Instance「大滿貫」有 7 冊 (第一冊 到 模擬試題), 但 tab 2 勾選任務範圍 顯示「複習講義-大滿貫(全冊)」(一個 group, 全部 25 個 unit 合併)。

預期 應該 顯示:
```
📦 複習講義 - 大滿貫
📚 第一冊 (全冊)
  ☐ 數與數線
  ☐ 標準分解式
  ...
📚 第二冊 (全冊)
  ☐ 直角坐標
  ...
```

### 根因

`renderMissionCheckboxes` line 5071 label 寫死 為 `info.typeName + '-' + info.instanceName`, 對 volume 跟 custom 用 同一個 邏輯。 對 volume 應該 用 冊名 (key) 當 label, 對 custom 維持 `typeName-instanceName`。

### 修法 (v1.5.18)

修 `renderMissionCheckboxes` 的 label 邏輯:

```js
// v1.5.18 新邏輯:
var isVolume = (key !== '_single' && key.indexOf('|') === -1);
if (isVolume) {
    label = key;  // 冊名: 第一冊 / 第二冊 / ...
} else {
    label = info.typeName + '-' + info.instanceName;  // 自定義 (custom)
}
```

同時 加 instance header (blue header `📦 複習講義 - 大滿貫`), 只 對 volume 顯示 (對 custom 保持 `📚 複習卷-麻辣甲 (全冊)` 不變).

### 效果

**數學 card 顯示** (volume instance):
```
📘 數學
📦 複習講義 - 大滿貫
📚 第一冊 (全冊)
  ☐ 數與數線
  ☐ 標準分解式與分數運算
  ☐ 一元一次方程式
  ☐ 二元一次聯立方程式
📚 第二冊 (全冊)
  ☐ 直角坐標與二元一次方程式的圖形
  ☐ 比例
  ☐ 一元一次不等式
  ☐ 線對稱與三視圖
  ☐ 統計圖表與資料分析
📚 模擬試題 (全冊)
  ☐ ...
```

**國文 card 顯示** (custom instance, 維持 不變):
```
📘 國文
📚 複習講義-勝經 (全冊)
  ☐ ...
```

### 教訓

- **★ label 邏輯 要根據 物件 類型 區分** — volume 跟 custom 兩個 結構 不同, 不能 用 同一個 label formula
- **★ byVol key 在 _collectSubjectUnits 就 已 區分** — key 含 '|' 是 custom, key 不含 '|' 是 volume
- **★ 加 instance header 讓 context 清楚** — 冊 上面 有 一個 紫色 header 顯示 「複習講義 - 大滿貫」 較 user-friendly

---

## v1.5.17 (2026-08-01) — 修 _collectSubjectUnits volume branch 漏 _typeName/_instanceName + 教材操作自動 saveToLocal + 改用 custom modal

### 問題

Denias 16:25 反映: 教材庫 tab 1 顯示「會考複習 / 數學 / 複習講義 / 複習講義 (instance)」有第一冊 + 第二冊內容 (數與數線、標準分解式與分數運算、一元一次方程式... 計 9 個 unit), 但 tab 2 「勾選任務範圍」頁面顯示「數學 card: (沒有「複習講義」類型的教材)」。

### 根因

**`_collectSubjectUnits` 的 v1.5.2+ volume instance 分支漏寫 `_typeName` / `_instanceName`** (line ~2299):

```js
// 原本 (bug):
if (ins.type === 'volume' && ins.vols && typeof ins.vols === 'object') {
    (ins.volOrder || Object.keys(ins.vols)).forEach(function(volName) {
        (ins.vols[volName] || []).forEach(function(u) {
            out2.push(Object.assign({}, u, { vol: volName }));   // ← 漏寫 _typeName + _instanceName!
        });
    });
}
// custom branch 有寫 _typeName + _instanceName
```

但 `renderMissionCheckboxes` line 5063:
```js
if (globalTypeFilter !== 'ALL' && info.typeName !== globalTypeFilter) return;
```

會因為 volume instance 的 `info.typeName === ''` 而被 filter 掉 → `anyShown = false` → 顯示「(沒有「複習講義」類型的教材)」。

### 4 個修法 (v1.5.17 一次修)

#### 1. 修 _collectSubjectUnits volume branch 漏寫欄位 (必修)
```js
// v1.5.17 修正:
if (ins.type === 'volume' && ins.vols && typeof ins.vols === 'object') {
    (ins.volOrder || Object.keys(ins.vols)).forEach(function(volName) {
        (ins.vols[volName] || []).forEach(function(u) {
            out2.push(Object.assign({}, u, {
                vol: volName,
                _typeName: typeName,
                _instanceName: ins.name
            }));
        });
    });
}
```

#### 2. 教材操作直接 saveToLocal (不依賴手動「💾 儲存教材庫變更」按鈕)
所有教材 CRUD (addMasterSubject / renameMasterSubject / deleteMasterSubject / addMaterialType / renameMaterialType / deleteMaterialType / addInstance / renameInstance / deleteInstance) 從 `window.isMasterDirty = true` 改成直接呼叫 `saveToLocal()`。

理由: Denias 之前改了東西忘記按「💾 儲存教材庫變更」按鈕, 結果某些變更沒存到 localStorage。「💾 儲存教材庫變更」按鈕保留 (供批量編輯後一次儲存), 但單一操作要即時存。

#### 3. Safari 撋 native confirm() 換 custom modal
- `addInstance` 的 `confirm('這個教材需「分冊」嗎?')` 換 `openChoiceModal()` 兩鍵 modal
- `deleteInstance` 的 `confirm()` 換 custom modal
- `deleteMasterSubject` 的 `confirm()` 換 custom modal
- `deleteMaterialType` 的 `confirm()` 換 custom modal

加 `openChoiceModal(title, message, optA, optB, onA, onB)` helper (跟 v1.5.9 `openSaveConfirmModal` 同樣的 dynamic createElement pattern)。

理由: Safari 偶爾會擋 browser confirm() (v1.5.9 教訓), 改成 custom modal 可靠。

#### 4. saveToLocal 加 try/catch + UI 警告
```js
// v1.5.17:
try {
    localStorage.setItem(STORAGE_KEY_FAMILY, JSON.stringify(multiData));
} catch(e) {
    console.error('v1.5.17 saveToLocal FAILED:', e.message);
    showSaveErrorToast(e);  // 右下角紅色警告
}
```

加 `showSaveErrorToast(err)` function: 顯示「⚠️ 資料儲存失敗! 資料只在記憶體, reload 會丟失! 請清理瀏覽器 cache」。

理由: 防未來 setItem 真正失敗 (容量爆 / permission) 時不被發現。

### 教訓

- **★ 不要只看示意圖** — 5 層架構示意圖隱藏了 volume vs custom 的 instance metadata 差異
- **★ trace script 結果要完全一致才動手** — Denias 16:32 跑出 「_typeName undefined, 有 _typeName 的 unit 數 = 1」 才 commit
- **★ 用 `custom modal` 取代 `confirm()`** — Safari 不可靠
- **★ 教材操作要即時 saveToLocal** — 別依賴手動儲存按鈕
- **★ saveToLocal 要 try/catch** — silent failure 是最大凶手

---

## v1.5.16 (2026-07-31) — 修 v1.5.13 污染段考複習 + restoreMathLecture 找現有 instance 改名

### 問題
Denias 23:08 回報: 切到「段考複習」時, 教材類型 dropdown 顯示「複習講義/複習卷/數字題本/模擬題本/考古題」這些會考 type — 但 v1.5.8 的核心設計是「Category 完全獨立教材庫」, 段考複習跟會考複習用完全不同教材 (段考用課本/習作/隨堂測驗, 跟會考的複習講義/數字題本完全不同)。

### 根因
**v1.5.13 的 switchUser repair 邏輯寫錯** (line 2176-2194):

```js
// v1.5.13 錯誤邏輯 (原):
Object.keys(user.masters).forEach(function(catName) {  // 遍歷所有 cat
    Object.keys(user.masters[catName]).forEach(function(subName) {  // 包括段考複習
        // 補上 5 個會考 type
    });
});
```

這邏輯在 switchUser 時, 會把所有 cat 的所有 subject 都補上 5 個會考 type — **段考複習被會考 type 污染**, 違反 v1.5.8 「Category 完全獨立教材庫」的核心設計。

### 修法 (v1.5.16)

**1. 修 switchUser repair 邏輯** (line 2176+):
```js
// v1.5.16 新邏輯: 只 repair 會考複習
if (user.masters['會考複習']) {
    Object.keys(user.masters['會考複習']).forEach(function(subName) {
        // 只補會考複習的 subject
    });
}
// 段考複習不碰 (Denias 23:13: 自己手動加段考 type)
```

**2. 修 restoreMathLecture** (line 6354+):
v1.5.15 的邏輯檢查 `hasInst = instances.some(i => i.name === '複習講義')` 才跳過。但 Denias 之前手動加的 instance name 是「大滿貫」(不是「複習講義」), v1.5.15 跑時 `hasInst = false`, 會 push 新 instance, 結果數學 / 複習講義 type 變成 2 個 instance (「大滿貫」 + 「複習講義」)。

v1.5.16 新邏輯:
1. 先找 name 完全匹配「複習講義」的 instance — 有就跳過
2. 找現有 volume type instance (例如「大滿貫」) — 有就改名成「複習講義」+ 補 volOrder
3. 完全沒有 volume instance 才從備份 push 新 instance

**3. 加「🧹 清段考複習的會考 type」按鈕**:
讓 Denias 一鍵清掉 v1.5.13 遺留的 5 個會考 type × 8 個 subject = 40 個污染。Denias 23:13 確認: 段考 type 自己手動加, 不預設。

### 教訓

- **★ v1.5.8 「Category 完全獨立教材庫」是核心設計** — 不同 cat 用不同教材, repair 邏輯不能跨 cat 用同一個 default type list
- **★ repair 邏輯要限制範圍** — 不要 Object.keys 整個 user.masters, 應該只 repair 特定 cat (會考複習)
- **★ restoreMathLecture 不要只看 instance name 完全匹配** — 也要找現有 volume type instance 改名, 避免重複
- **★ 不要假設 user 加的 instance name 會是什麼** — Denias 可能用任何名字 (例如「大滿貫」)
- **★ 「預設 type」是 cat-specific** — 會考有 5 個預設 type, 段考不該有會考的預設 type

## v1.3 (2026-07-28) — 知識星空圖 🌌

### v1.5.15 (2026-07-31) — 專門按鈕補數學「複習講義」instance (不動其他科目)

**Denias 22:19 指定:** 
- 選項 A: 7 冊 merge 到「複習講義」type
- Instance 名稱叫「複習講義」(不是 v1.5.2 預設的「(原主教材)」)
- 其他科目 (英文/理化/歷史/地理/公民/生物) 都不動

**為什麼是專門按鈕:**

不用 v1.5.14 的 `restoreFromOldBackup` (要 user 貼 JSON 進來, complex), 改成寫一個專門的 `restoreMathLecture` function:
1. 從 `window._v153_BACKUP_MASTER_STR` (硬編碼 v1.5.3 備份) 直接 parse `數學` 物件
2. 確保 `mathSub.materials['複習講義']` 存在
3. 檢查是否已有「複習講義」instance — 有就跳過 (不重複加)
4. 沒有就 push 新 instance:
   - name: '複習講義'
   - type: 'volume'
   - vols: 備份檔的 7 冊內容
   - volOrder: 備份檔的 volOrder
5. saveToLocal() 存檔
6. alert 顯示 vol 數 + unit 數

**根因重述:**

數學的 7 冊從未寫入 localStorage:
- v1.5.3 的 `_v153RestoreFromBackup` 只在 `masterEmpty` 時跑
- 數學可能被某個 intermediate state 導致 `user.master` 不空, 所以被跳過
- 結果 v1.5.2 migrate 對數學跑時, `subj.materials` 已有 partial 結構, `if (!subj.materials)` 跳過
- 沒補「複習講義」type, 也沒搬 vols 到「(原主教材)」instance

其他 6 個科目 (英文/理化/歷史/地理/公民/生物) 正常: 因為它們都成功被 v1.5.3 復原, 然後 v1.5.2 migrate 也有跑成功, 「複習講義」type + 「(原主教材)」instance 都建了。

### v1.5.14 (2026-07-31) — 從舊備份還原功能 (補 v1.5.2 migrate 跳過沒建「複習講義」的 sub)

**Denias 21:58 提供 2026-07-28 備份檔:**

Denias 反映 v1.5.13 沒解決, 數學複習講義內容還是不見。我看了備份檔, 是 v1.5.1 之前的舊格式 (没有 `masters` 結構, 只有 `master`)。備份裡也沒有「複習講義」這個 type, 因為「複習講義」是 v1.5.2 migrate 才建立的。

**真正的根因**: 數學原本是 `type: 'volume'` 有 7 個 vol (第一冊~第六冊+模擬試題)。在 v1.5.2 migrate 時:
- migrate 見到 `subj.materials` 已存在 (從某個 intermediate state), `if (!subj.materials)` 跳過
- 所以「複習講義」這個 type 沒被建立, 原本的 7 個 vol 也沒被搬到「複習講義」的「(原主教材)」instance
- v1.5.13 的 switchUser repair 只補空的 type, 不補上「(原主教材)」instance 的 units

**修復 (v1.5.14):**

加「📦 從舊備份還原」按鈕 (在備份區旁邊), 讓 Denias:
1. 點按鈕
2. 貼上備份檔的 `config.master` JSON (只要 `{...}` 那段)
3. 自動 merge 進現有 `user.masters['會考複習']`:
   - 對每個 sub: 確保 `materials['複習講義']` 存在
   - 檢查是否已有「(原主教材)」instance (有就跳過, 不重複加)
   - custom sub (如國文): 加 `units: backupSub.units`
   - volume sub (如數學/英文): 加 `vols: backupSub.vols, volOrder: backupSub.volOrder, type: 'volume'`
4. Alert 列出哪些 sub 恢復了 / 跳過

**如何操作:**

1. 打開備份檔, 找 `master` 物件 (從 `{` 開始, 到 `}` 結束, 包含 國文/數學/英文/理化/歷史/地理/公民/生物)
2. 強制重整 v1.5.14
3. 進教材庫 → 拉到下面「全機資料備份與還原」區
4. 點「📦 從舊備份還原」→ 貼上 JSON → 按 OK
5. 應該看到 alert 列出「已恢復: 數學 (volume, 27 個 unit, 7 冊)」「已恢復: 國文 (custom, 21 個 unit)」

### v1.5.13 (2026-07-31) — type filter dropdown 移到 onSetCatChange + 自動補缺 5 個預設 type

**Denias 18:24 回報 v1.5.12 測試:**

1. **數學教材類型 dropdown 只有 5 個 type**(複習卷/數字題本/模擬題本/考古題/自修) — **少複習講義, 多自修**。Denias 18:24 問「自修是哪來的? 是段考複習的選項吧?」

   **根因**: 我懷疑 v1.5.2 之前的某個版本, `數學` subject 已經有部分 type 但不是 5 個, 所以 v1.5.2 migrate 的 `if (!subj.materials)` 跳過, 沒補上 5 個預設 type。「自修」是 Denias v1.5.11 測試時手動加的。

2. **Type filter dropdown 還是寫死的** — 即使切到段考複習沒有任何 type, 還是出現「複習講義/複習卷/數字題本/模擬題本/考古題」這 5 個。

   **根因**: v1.5.12 的動態生成邏輯放在 `renderMissionCheckboxes` 開頭, 但這個 function 在沒選任務時第一行就 `return`, 根本沒跑到動態生成。改為在 `onSetCatChange` (切換 cat 時) 就生成。

**修復 (v1.5.13):**

1. **抽出 `_updateMisTypeFilterDropdown()` helper** — 動態 scan appMaster 的所有 typeName, 填入 dropdown。連接到「當前分類還沒有教材類型」disabled 提示。
2. **`onSetCatChange` 呼叫 helper** — 切換 cat 時就更新 (即使不選 mission)。
3. **`renderMissionCheckboxes` 也呼叫 helper** — 重複保証 (但不重複跑 inline 邏輯, 只呼叫一次)。
4. **`switchUser` 加 missing type 自動補上** — 任何 subject 只要有 `materials` 但缺「複習講義/複習卷/數字題本/模擬題本/考古題」, 自動補上缺失的 (空的)。Console log 數量。不會跳提示。

**為什麼數學會缺複習講義:**

我懷疑 v1.5.2 migrate 之前, `數學` subject 已經在 v1.4 階段有部分 type (從 v1.4 升上來的不是空 subj), 但不見得是 5 個。「自修」是 Denias v1.5.11 測試時手動加的。在 v1.5.13 加了 repair 邏輯, 強制補上缺失的 5 個預設 type。

### v1.5.12 (2026-07-31) — 教材類型 filter dropdown 改動態生成 + 修互動型 cat 教材庫隔離

**Denias 18:02 回報 v1.5.11 測試:**

1. **數學的複習講義內容不見了** — 國文/英文的複習講義還在, 但數學的複習講義內容不見了
2. **教材類型 filter dropdown 出現所有 type** — 包括會考複習的「複習講義/複習卷/數字題本/模擬題本/考古題」, Denias 18:02 問為何段考複習使用不同教材庫但 dropdown 卻包含會考的 type

**根因 + 修復 (v1.5.12):**

1. **Type filter dropdown 改成動態生成** — 原本是寫死 5 個 type option。改成在 `renderMissionCheckboxes` 開頭 scan 當前 `appMaster` 的所有 subject.materials 裡有的唯一 typeName, 動態填入 dropdown。這樣段考複習只有「測驗卷」這些 custom type 就只列出那些, 不會顯示會考複習的 type。
2. **Previous value 保留** — 改 dropdown 時如果上一個 filter 選項現在不存在了, 重設回 ALL。
3. **數學複習講義不見** — 可能是 Denias 在 v1.5.11 測試中選了數學的「自修」type 加了 instance/unit, 但原本的「複習講義」type 仍然存在 (不是被刪掉)。Denias 需要檢查 F12 Console 或重新查看教材庫 tab 1 「數學」的教材類型 dropdown 看是不是「複習講義」這項只是未選中。需要 Denias 進 Console 看 log:

```js
// 在教材庫 tab 1 選「會考複習」→「數學」後, F12 輸入:
console.log('數學 materials:', Object.keys(multiData[currentUserId].masters['會考複習']['數學'].materials));
```

### v1.5.11 (2026-07-31) — 修勾選頁顯示名稱 + 加教材類型過濾 + 段考複習直接建 default 科目

**Denias 16:02 回報 v1.5.10 測試:**

1. **default 科目 confirm dialog 沒生效** - 而且 Denias 不要 confirm dialog, 要「直接加」
2. ✅ **儲存跳 modal** - 正常
3. **勾選頁「麻辣甲 — 複習卷麻辣甲」顯示錯** - 我之前的 `vol = '_複習卷|麻辣甲'` 這類 raw key 設計太複雜, 又加在 label 後面變成重複顯示
4. **勾選頁需要 type filter dropdown** - Denias 要求每個 subject 可以過濾「複習講義/複習卷/數字題本/模擬題本/考古題」其中一個, 避免太長

**修復 (v1.5.11):**

1. **勾選頁 vol label 修** - `_collectSubjectUnits` 的 vol key 改成 `typeName + '|' + instanceName`, `renderMissionCheckboxes` 顯示為「📚 複習卷-麻辣甲 (全冊)」
2. **勾選頁加全域 type filter dropdown** - 在「📥 請勾選此任務要涵蓋的單元範圍」標題下加 `<select id="mis-type-filter">`, ALL / 複習講義 / 複習卷 / 數字題本 / 模擬題本 / 考古題。換選後只顯示該 type 的 instance。
3. **段考複習直接建 8 個 default 科目** - `v1.5.11` 在 `_v158Migrate` 內檢測段考複習是空時, 直接寫入 default subjects (國文/數學/英文/歷史/地理/公民/理化/地科)。不用 confirm。`user._v1511_default_added` 標記避免重複加。
4. **移除 v1.5.10 的 confirm dialog 邏輯** (從 `onMasterSetCatChange`)

### v1.5.10 (2026-07-31) — 修儲存按鈕 onclick + 新 cat default 教材 + 勾選頁顯示 instance 名

**Denias 12:52 回報的問題 (測試 v1.5.9):**

1. **「儲存教材庫變更」按下去直接關閉** - 根本原因: HTML 按鈕的 `onclick="saveSettingsAndAlert(true)"` 傳了 `returnHome=true`, 走直接關閉路徑, 完全沒進 modal 流程。我之前在 v1.5.9 改了 function 邏輯但忘了改 HTML onclick。

2. **新分類教材庫是空的** - Denias 13:06 要求: 在新分類 dropdown 旁邊自動建立 default 科目 (國文、數學、英文、歷史、地理、公民、理化、地科)

3. **「教材名 Instance」沒顯示** - Denias 13:06 在 tab 1 加了「數學」subject + 「自修」教材類型 + 「資優...」教材名 Instance, 按確認送出, 但 Instance dropdown 還是空的。 (這邊我懐疑是 addSettingRow 被調用時沒有真正存 unit 名, 但需要 Denias 再測試確認)

4. **「Custom(全冊) U1(P1~P1)」這個顯示 confusing** - 用 vol='custom' 讓 user 看不到是哪個 Instance, Denias 13:06 問這是哪來的

**修復 (v1.5.10):**

1. **修儲存按鈕 onclick** - HTML 按鈕從 `onclick="saveSettingsAndAlert(true)"` 改成 `onclick="saveSettingsAndAlert()"`, 走 modal 流程
2. **新 cat 自動問 default subjects** - `onMasterSetCatChange` 檢測 cat 為空, 詢問 user 要不要自動建 8 個 default subjects (國文、數學、英文、歷史、地理、公民、理化、地科)。一旦詢問過就不重複問 (用 `user['_v1510_default_init_' + cat]` 標記)
3. **`_collectSubjectUnits` 帶 instance name + typeName** - 每個 unit object 多帶 `_instanceName` + `_typeName` 屬性
4. **`renderMissionCheckboxes` 改顯示** - vol label 從 `custom (全冊)` 改成 `📚 資優... (全冊)` 或 `📚 第一冊 (全冊)`, 並顯示 instance 名稱讓 user 知道是哪個教材

### v1.5.9 (2026-07-31) — 緊急修復: v1.5.2 之後消失的教材編輯 function + 儲存確認改 2 鍵版

**Denias 12:22 回報的問題:**
1. 點「新增科目」「删除科目」「編輯科目名稱」按鈕 → 完全沒反應
2. 點「加冊」「刪冊」「編輯冊」按鈕 → 完全沒反應
3. 「儲存教材庫變更」按下沒跳訊息就完成

**根因分析:**
- v1.5.2 改架構時 (Subject → Material Type → Instance → Units), 遺漏了 `addMasterSubject / renameMasterSubject / deleteMasterSubject / addMasterVolume / renameMasterVolume / deleteMasterVolume / scrollMasterVolumes` 這 7 個 function 實作
- HTML 還在 onclick 呼叫這 7 個 function, 所以按了會炸成 `function not defined` 錯誤
- Denias 12:22 才發現這個問題 — 因為他之前的教材都是從備份復原, 從來沒手動新增過 subject/volume

**修復 (v1.5.9):**
1. 補回 7 個 function (全部使用 v1.5.8 的 masters 架構)
   - `addMasterSubject()` - 在 `appMaster` 加 `{ materials: {} }`
   - `renameMasterSubject()` - rename subject + 同步 log subject
   - `deleteMasterSubject()` - 加二次確認 + delete
   - `scrollMasterVolumes(direction)` - 從 v1.4.31 拿回來
   - `addMasterVolume(afterVolName)` - 寫到 `instance.vols` (而非 v1.4 的 `appMaster[sub].vols`)
   - `renameMasterVolume(oldVolName)` - rename vol + 同步 log volume
   - `deleteMasterVolume(volName)` - 加二次確認 + delete vol
2. `saveSettingsAndAlert` 改成自訂 modal + 兩個按鈕 (繼續編輯 / 結束編輯)
   - 結束編輯 = 關 modal + returnToHome()

### v1.5.8 (2026-07-31) — 大改: 進度大分類 (Category) 獨立教材庫 (Denias 02:02 要求)

**Denias 02:02 要求:**
- 會考複習 / 段考複習 教材完全不同 → 各自獨立
- 同一個 Category 底下的 mission (一模/二模/三模/四模) 共用同一份教材
- 原本架構是所有 Category 共用 appMaster, 不符合需求

**資料結構大改:**
- OLD: `user.master = { 國文: {...}, 英文: {...} }`
- NEW: `user.masters = { '會考複習': { 國文: {...} }, '段考複習': { 國文: {...} } }`

**Migrate (v1.5.8):**
- 把現有 `user.master` 8 個 subject 搬到 `user.masters['會考複習']`
- 補上 `user.masters['段考複習'] = {}` (空的, 等 Denias 自己建)
- 從 missions keys 同步創 masters[cat] = {}
- 加 `appCurrentCat` 全域變數追蹤當前 cat

**UI 改動:**
1. 教材庫 `master-set-cat` dropdown 現在會真的影響 subject 範圍 (原本只更新任務)
2. Mission 設定 `set-cat` dropdown 也同步切換 appMaster
3. 首頁「各科整體進度 bar」按 Category 分組 (會考複習一組, 段考複習一組)
4. 樹狀圖加獨立 Category dropdown (不跟 mission filter 連動)
5. 樹狀圖「全部分類」選項可看全部 cat

**Bug fix:**
- buildMissionTree 改成從 `user.masters[cat]` 讀教材 (不依賴 appMaster 全域), 避免切 cat 後 mission bar 找不到 unit
- delCat 加警告「底下有 N 個 subject 教材會被刪掉」
- renCat 同步 rename `masters[cat]`

**v1.5.7 (2026-07-31) — Q2: 改 UI 命名「書本 / 刷本」→「教材名」(Denias 23:01 要求)

**Denias 01:48 反映:**
- 「書本 / 刷本」這個詞不精確
- 改為「教材名」

**改動 (index.html):**
- 「書本 / 刷本 Instance」 → 「教材名 Instance」
- 按鈕「新增書本」/「刪除書本」/「編輯書名」 → 「新增教材」/「刪除教材」/「編輯名稱」
- 「* Instance 是同類型的不同書本」 → 「不同教材」
- Modal 標題「新增書本 Instance」/「編輯書本名稱」 → 「新增教材名 Instance」/「編輯教材名稱」
- Warning 訊息統一改用「教材」一詞

**檔案:** 6280 → 6280 行 (+0,只改字串)

### v1.5.6 (2026-07-30) — 緊急修復: 修復 v1.5.2 migrate 後讀不到 subject units 的 bug

**Denias 22:34 反映:**
- v1.5.5 點首頁跳出錯誤: `undefined is not an object (evaluating 'Object.keys(s.vols)')`
- v1.5.5 加的「各科整體進度 bar」看不到 (空資料)

**根因:**
- v1.5.2 migrate 把 `subj.units` / `subj.vols` / `subj.volOrder` / `subj.type` 全部刪除
- 但 `buildMissionTree` + `renderDashSummary` + `renderTreeView` + `renderMissionCheckboxes` 都還在用舊欄位讀取
- 結果: `Object.keys(undefined)` 炸掉 或 讀不到任何 unit

**v1.5.6 修復:**
1. ✅ 加 helper `_collectSubjectUnits(s)` — 統一處理新舊架構:
   - legacy v1.4 (s.units / s.vols / s.type)
   - v1.5.2+ (s.materials[*].instances[*])
2. ✅ 修 `buildMissionTree` 用 helper
3. ✅ 修 `renderDashSummary` 各科整體 bar 用 helper
4. ✅ 修 `renderTreeView` countUnits + 顯示 tree 結構 用 helper
5. ✅ 修 `renderMissionCheckboxes` mission 設定頁面 用 helper

**檔案:** 6230 → 6280 行 (+50)

### v1.5.5 (2026-07-30) — 加回首頁「各科整體進度 bar」(Denias 19:50 反映)

**需求確認 (Denias 19:50):**
- Denias 反映「首頁的各科進度 bar 之前版本都有, 上一版被你刪掉了」
- 檢查: renderDashSummary() 從 v1.1 開始就只有「總統計 + 7-day bar」, 沒加過整體 subject bar
- 但 Denias 想要的就是這個: 不管 mission filter, 首頁就要看全部 9 個 subject 的整體進度

**v1.5.5 變更:**
1. ✅ 新增「📊 各科整體進度」summary 在 7-day bar 下面
2. ✅ 算所有 subject 的整體 done/total 頁數 (用全部 appLogs 算)
3. ✅ 不依賴 mission filter, 不依賴 appMissions — 直接從 appMaster + appLogs 算
4. ✅ 加 CSS: `.dash-subject-bars` grid + `.dash-subject-bar` 漸層進度條
5. ✅ 9 個 subject 都會顯示 (含地科, 雖然是空的)

**實現細節:**
- 加在 `renderDashSummary()` return 結尾 (subjectBarsHtml variable)
- 跟 4 個總統計 + 7-day bar 同一個區塊
- 風格跟 7-day bar 一致 (斜線漸層進度條)

**檔案:** 6150 → 6230 行 (+80)

### v1.5.4 (2026-07-30) — 補完架構: 加地科 subject + mission rename + 重建 appMissions + 進度 bar

**需求確認 (Denias 19:18~19:38):**
- 教材庫 4 層架構: Subject (9個) → Material Type (5個) → Instance → Units
- 9 個 subject: 國文/英文/數學/歷史/地理/公民/理化/生物/**地科**
- Mission 結構: Category → Mission (一模/二模/三模/四模), 不影響教材, 影響 log/排程
- Mission 名稱純文字 (不喜歡 emoji 預設), 但 emoji picker 已在 modal-input

**v1.5.4 變更:**
1. ✅ Mission rename:
   - 📚 一模 → 一模 (去 emoji)
   - 📦 暑假複習進度 → 二模 (Denias 確認改名)
2. ✅ 加「地科」subject (空的, 9 個 subject 總計)
3. ✅ 從 plans 重建 appMissions:
   - 掃描所有 plan.grid task, 提取 (cat, mis, unitId)
   - 建構完整 missions 結構: 會考複習 (一模/二模) + 段考複習 (空殼)
4. ✅ 進度 bar 復活: renderDashboard() 用新的 appMissions
5. ⏸️ Image upload (留 v1.5.5)

**Emoji 提醒:**
- 編輯 mission modal (modal-input) 已經有 32 個 emoji picker
- Denias 之前不知道這個功能, 現在知道了

**檔案:** 6053 行 → 6150 行 (+97)

### v1.5.3 (2026-07-30) — 緊急修復: 從備份復原 v1.5.2 搞砸的資料

**事件:**
- v1.5.2 上線後 教材庫 + 行事曆 被 migrate 邏輯清空
- Denias 提供 StudyMap_Backup_2026-07-28 備份 (含 8 個 subject + 1 個 plan)

**復原機制:**
- initUsers 內 hardcode backup master + plans
- 新函式 `_v153RestoreFromBackup(uid)` 檢查 master/plans 是否為空, 是則從備份復原
- 只在空資料時才執行, 避免覆蓋後續新增資料
- 復原後讓現有 v1.5.2 migrate transform 成 3 層架構

**復原範圍:**
- 8 個 subject (國文/數學/英文/理化/歷史/地理/公民/生物)
- 147 units 教材
- 1 個 plan 會考複習 - 📦 暑假複習進度
- 159 個 task (7/1~8/3)

**教訓:**
- 結構大改 migrate 必須加防呆 (檢測資料是否被清空才執行)
- Console.log 必須詳細 (復原幾個 subject / 幾個 plan)
- 需要有「匯出備份」按鈕 (現在已經有了, 隨時備份)

### v1.5.2 (2026-07-30) — 教材庫分層 3 層架構: Material Type + Instance + Units

**Denias 10:32 修正架構理解:**
原來 v1.5.1 的 2 層 (subject + reviewMaterials) 不夠
每個 subject 需要 5 個 Material Type (複習講義/複習卷/數字題本/模擬題本/考古題)
每個 Type 底下有獨立 Instance (斅將/3800/114 等)

**4 層架構:**
```
Category (會考複習) → Subject (國文/英文/數學) → Material Type (5 類) → Instance (各書本) → Units (1-1, 1-2...)
```

**Migrate (v1.5.1 → v1.5.2):**
- 每個 subject 預設 5 個 Material Type
- 主教材 units 全部搬到「複習講義」的第一個 instance「(原主教材)」
- v1.5.1 reviewMaterials 搬到「複習卷」類別
- 舊欄位 (units/type/vols/volOrder/reviewMaterials) 刪除

**新函式:**
- populateMasterTypeDropdown / populateMasterInstanceDropdown
- onMasterTypeChange / onMasterInstanceChange
- addMaterialType / renameMaterialType / deleteMaterialType
- addInstance / renameInstance / deleteInstance
- getCurrentInstanceData (取代 getCurrentLayerData)

**改動:**
- handleMasterSubjectChange 加 populateMasterTypeDropdown
- extractCurrentEditorData / renderMasterEditor 改為 instance-aware
- openSettings 改為 populateMasterTypeDropdown
- addMasterSubject / quickAddSubjectFromCatModal / addCatWithSubject 改為 {materials: {}} 架構
- 移除舊的 addReviewMaterial / renameReviewMaterial / deleteReviewMaterial

**範圍:**
- ✅ 教材庫完整支援 3 層架構
- ❌ log / 排程 / mission 不動 (下版 v1.5.3)

檔案: 5810 → 6010 行 (+200)

### v1.5.1 (2026-07-30) — 教材庫分層: 主教材 / 複習講義 / 複習教材

**Denias 02:50 需求:**
為每個科目新增複習教材層, 如數學 → 翰將 / KO 參考書
複習教材跟主教材一樣有 1-1, 1-2... 章節
範圍只動教材庫 (log / 排程不動)

**架構 (Option A):**
```
appMaster[subject] = {
  type: 'custom' | 'volume',
  units: [...],              // 主教材
  vols / volOrder: [...],     // (volume 時)
  reviewMaterials: [          // 🆕 複習教材陣列
    { id, name, type, units/vols }
  ]
}
```

**Migrate:**
- 自動為每個 subject 加 reviewMaterials: [複習講義]
- 「複習講義」是你現有的複習材, 預設就有

**UI 改動:**
- 教材庫增「教材層」dropdown: 📘 主教材 / 📗 複習講義 / 📗 翰將 / 📗 KO
- 「➕ 新增複習教材」按鈕
- 「✏️ 編輯教材名稱」按鈕
- 「🗑️ 刪除教材」按鈕

**實作:**
- 新函式: `populateMasterLayerDropdown` / `onMasterLayerChange` / `addReviewMaterial` / `renameReviewMaterial` / `deleteReviewMaterial` / `getCurrentLayerData`
- `handleMasterSubjectChange` 加 populateMasterLayerDropdown
- `extractCurrentEditorData` / `renderMasterEditor` 改為 layer-aware
- `openSettings` 補 reviewMaterials 預設 + populateMasterLayerDropdown
- `initUsers` migrate 加 reviewMaterials + 「複習講義」預設

**範圍:**
- ✅ 教材庫完整支援
- ❌ log / 排程 / mission 不動 (下版 v1.5.2 弄)

檔案: 5610 → 5810 行 (+200)

### v1.5.0 (2026-07-30) — 新增分類 wizard (含教材科目)

**Denias 02:31 需求:**
按「新增」不是只問分類名稱, 跳出一個 wizard:
- 大分類名稱 (例: 段考複習)
- 教材科目 dropdown (default 為第一個現有科目)
- Modal 內可以快速新增科目
- 確定後:
  - 自動切到新分類
  - master-subject dropdown 切到選的科目
  - 單元範圍保持空白, 加一個空 row 讓使用者填入

**實作:**
- 新增 `addCatWithSubject()` 取代 master pane 的「新增」 onclick
- 新增 modal `modal-add-cat`
- 新增 3 個函式:
  - `addCatWithSubject()` - 開 wizard
  - `quickAddSubjectFromCatModal()` - modal 內快速新增科目
  - `confirmAddCatWithSubject()` - 確認, 建立 + 切換 + 空白單元
- `renderMasterEditor` 加 `skipLoadUnits` flag
- `handleMasterSubjectChange` 加 `opts` 參數 (skipLoadUnits + skipDirtyCheck)
- mission pane 的「新增」保持舊 addCat (不需要 wizard)

**重要:**
v1.5.0 是大版號跳 (1.4 → 1.5), 代表新功能 series
檔案: 5450 → 5610 行 (+160)

### v1.4.31 (2026-07-30) — Debug 加 bar 計入頁數

**Denias 00:09 反映:**
v1.4.30 後 W1 仍顯示 89 (預期 ~108)

**Debug 改進:**
- dump panel 加「bar 計入 X 頁」 (✓ reason 加總)
- 可以直接看到 bar 顯示跟 ✓ 頁數對不對

檔案: 5430 → 5450 行 (+20)

### v1.4.30 (2026-07-30) — Dedup 修正: 只 dedup subject 相似的重複

**Denias 00:03 反映:**
- 168 是月曆算法不準確
- 問為什麼 7/3 DP_5 (理化/歷史/公民/英文U1) 4 個 5 頁 log 被 dedup
- 問為什麼 7/3 DP_4 (國文/地理) 2 個 4 頁 log 被 dedup

**根因:**
v1.4.15 加的第二層 dedup 用 (date+pages), 完全不看 subject
- 同一天同樣頁數 = 視為重複
- 原本是為處理 plan 自動重複 task 造成 subject/unitName 微差
- 但該邏輯太激進, 真的讀多個同頁數也被 dedup

**修復:**
- 第二層 dedup 只在 subject 相似時 (有包含關係) 才 dedup
- subject 不相似 = 真的讀了多個 5 頁 (如 7/3 那 case)
- 保留 v1.4.15 解決 plan 自動重複 task 微差問題

檔案: 5415 → 5430 行 (+15)

### v1.4.29 (2026-07-29) — Mission filter 加 mission string fallback

**Denias 23:55 反映:**
dump 顯示 W1 = 113 頁 (19 筆), 但 chart 顯示 89 頁

**根因 (新發現):**
orphan unitId 不在 appMissions 內, 但 log 的 mission 字串是「暑假複習進度」
v1.4.27 category fallback 沒生效 (因 user 選的是 specific mission, 不是 mis=ALL)

**修復:**
- mission-level filter 加 fallback: unitId match OR mission string match
- log.mission === filterMisM 時也視為 match
- 這樣 orphan unitId 不會被排除

檔案: 5400 → 5415 行 (+15)

### v1.4.28 (2026-07-29) — Migration: 暑期複習進度 → 暑假複習進度

**Denias 23:49 反映:**
圖表 W1 顯示 89 (仍不正確)
回想曾將「暑期複習進度」更名為「暑假複習進度」
資料庫舊 log 沒改到

**Migration:**
- initUsers 內加自動 rename
- 掃描所有 log, 將 mission 字串中「暑期複習進度」改為「暑假複習進度」
- console.log 報告改了多少筆

**重要:**
但這可能只解決 mission string, orphan unitId 問題仍在
filter 仍需要 category fallback (v1.4.27)

檔案: 5380 → 5400 行 (+20)

### v1.4.27 (2026-07-29) — Filter 邏輯改進: category fallback

**Denias 23:39 反映:**
圖表顯示 W1 = 78 頁, 但 dump 算 108 頁 (會考複習)

**根因:**
filter 用 unitId 集合, 但有些 log 的 unitId 不在 appMissions 內 (orphan)
例如 7/3 歷史大航海 id_u3an90l3a, 地理位置 id_72j6nh5zp 等
加上 mission 名稱「暑期」 vs 「暑假」字串差異, 查找可能失敗

**修復:**
- mission-level filter 仍用 unitId match
- category-level filter (filterCat != ALL, filterMis == ALL) 加 category 直接比對 fallback
- 這樣 orphan unitId 的 log 也會被算入 (它們 category 是「會考複習」)

檔案: 5360 → 5380 行 (+20)

### v1.4.26 (2026-07-29) — Dump 改成頁面 textarea

**Denias 15:39 反映:**
點 dump 按鈕沒動作 (22:39 再說一次)

**可能原因:**
- `this.dataset.mkey` 取值失敗
- console.log 看不到 (也許 Denias 沒開 F12)
- onclick 字串拼接 escape 問題

**修復:**
- dump 結果顯示到頁面 textarea (不只 console)
- 加 alert() 確認有觸發
- button onclick 改回 dataset.mkey 但加強錯誤處理

檔案: 5339 → 5360 行 (+21)

### v1.4.25 (2026-07-29) — 緊急 fix: Can't find variable: allMonthLogs

**Denias 15:34 反映:**
程式毀損, 「系統初始化錯誤: Can't find variable: allMonthLogs」

**根因:**
v1.4.23 patch anchor 太寬, 把 `var allMonthLogs = [];` 連同初始化 appLogs.forEach 一起刪掉
新程式碼引用 allMonthLogs 但沒宣告 → 崩潰

(跟 v1.4.10→v1.4.14 byMonth bug 一模一樣)

**修復:**
加回 `var allMonthLogs = [];` + appLogs.forEach 初始化

**教訓:**
patch script anchor 不要貪心, 不要一次覆蓋過大區塊
關鍵變數宣告要 grep 確認還在

### v1.4.24 (2026-07-29) — Dump 到 Console 按鈕

**Denias 15:27 確認:**
6 筆 log 是在「歷史紀錄」頁面 (appLogs) 看到的, 但 v1.4.21 debug 看不到

**實際問題:**
v1.4.21 code 還是有 category filter:
`if (l.category === '🔄 系統重排' || l.category === '🗓️ 計畫管理') return;`
v1.4.22 才移除

但 Denias 說 5 筆是「會考複習」 category, 應該顯示, 但沒顯示
表示還有其他 bug

**v1.4.24 修復:**
- 加 「📋 Dump 到 Console (F12)」 按鈕
- 點擊 dump 當月所有 logs 完整資料到 F12 console
- Denias 可以直接 copy JSON 貼給我

檔案: 5280 → 5330 行 (+50)

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