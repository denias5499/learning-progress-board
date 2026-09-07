"""
v1.6.132: 在 v1.6.131-BISECT 基礎上 merge v1.6.130 的 Step 2~6 dropdown 邏輯

修改:
1. 移除 const syllabusDB 硬編碼 (BISECT 是舊架構 科目/冊次/單元)
2. 加入 getSyllabusDB() 從 master data 動態讀 (支援 WN_masterData + localStorage fallback)
3. 改 createSettingCard 從 Step 2~5 變成 Step 2~6 (科目/教材類型/教材名稱/單元/錯誤原因)
4. 改 handleCardSubjectChange / 取代 handleCardVolumeChange / 改 handleCardUnitChange
   → 加 handleCardTypeChange + handleCardInstChange (5 層 dropdown)
5. 保留 BISECT 的 drag-drop (沒 preventDefault, 不會 freeze)
"""

with open('wrong-notes/index.html', 'r') as f:
    c = f.read()

# === 1. 取代 const syllabusDB 硬編碼 → getSyllabusDB() ===
old_syllabus = '''const syllabusDB = {
        "國文": { 
            "type": "custom", 
            "units": ["字音", "字形", "字義", "詞語應用", "成語總匯", "標點符號與工具書檢索", "漢字結構與字體演變", "詞類與句型", "應用文（一）", "應用文（二）", "文化常識", "國學常識", "語法辨析", "文章表現技巧", "文意填空與重組", "白話文閱讀單題", "文言文閱讀單題", "白話文閱讀題組", "文言文閱讀題組", "多文本對讀", "會考寫作攻略"] 
        },
        "數學": {
            "type": "volume", "volOrder": ["第一冊", "第二冊", "第三冊", "第四冊", "第五冊", "第六冊", "模擬試題"],
            "vols": {
                "第一冊": ["數與數線", "標準分解式與分數運算", "一元一次方程式", "二元一次聯立方程式"],
                "第二冊": ["直角坐標與二元一次方程式的圖形", "比例", "一元一次不等式", "線對稱與三視圖", "統計圖表與資料分析"],
                "第三冊": ["乘法公式與多項式", "平方根與畢氏定理", "因式分解與一元二次方程式"],
                "第四冊": ["數列與級數", "線型函數", "三角形的基本性質", "平行與四邊形"],
                "第五冊": ["連比與相似形", "圓形", "推理證明與三角形的心"],
                "第六冊": ["二次函數", "統計與機率", "立體圖形"],
                "模擬試題": ["第1~2冊", "第1~4冊", "第1~6冊"]
            }
        },
        "英文": {
            "type": "volume", "volOrder": ["第一冊", "第二冊", "第1~2冊複習", "第三冊", "第1~3冊複習", "第四冊", "第1~4冊複習", "第五冊", "第1~5冊複習", "第六冊", "第1~6冊複習"],
            "vols": { 
                "第一冊": ["U1", "U2"], "第二冊": ["U3", "U4", "U5"], "第1~2冊複習": ["語法統整與高分策略", "模擬試題"], 
                "第三冊": ["U6", "U7", "U8"], "第1~3冊複習": ["語法統整與高分策略", "模擬試題"],
                "第四冊": ["U9", "U10", "U11"], "第1~4冊複習": ["語法統整與高分策略", "模擬試題"],
                "第五冊": ["U12", "U13", "U14"], "第1~5冊複習": ["語法統整與高分策略", "模擬試題"],
                "第六冊": ["U15", "U16"], "第1~6冊複習": ["語法統整與高分策略", "模擬試題"]
            }
        }
    };'''

new_syllabus = '''// v1.6.132: 從 master data 動態讀 (不再硬編碼)
    // 1. window.WN_masterData (主專案注入) 2. localStorage StudyMap_Family_Data_V20 fallback
    // 結構: { 國文: { 複習講義: { 麻辣: ["U1", "U2"] }, ... }, ... }
    const DEFAULT_SYLLABUS_DB = {
        "國文": { "其他": { "預設": ["字音", "字形", "字義", "詞語應用"] } }
    };
    
    function getSyllabusDB() {
        // 1. 先看 window.WN_masterData (主專案注入)
        if (window.WN_masterData && window.WN_masterData.tree && Object.keys(window.WN_masterData.tree).length > 0) {
            return window.WN_masterData.tree;
        }
        // 2. 自己讀 localStorage (附件與主專案同源)
        try {
            var raw = localStorage.getItem('StudyMap_Family_Data_V20');
            if (raw) {
                var multiData = JSON.parse(raw);
                var uid = localStorage.getItem('StudyMap_CurrentUserId_V20');
                var user = (uid && multiData[uid]) ? multiData[uid] : null;
                if (!user) {
                    Object.keys(multiData).forEach(function(k) {
                        if (!user && multiData[k] && multiData[k].masters) user = multiData[k];
                    });
                }
                if (!user) return DEFAULT_SYLLABUS_DB;
                var masters = user.masters || {};
                // 攤平 cat > subject > instanceId
                var flat = {};
                Object.keys(masters).forEach(function(cat) {
                    Object.keys(masters[cat] || {}).forEach(function(subj) {
                        if (!flat[subj]) flat[subj] = {};
                        Object.keys(masters[cat][subj] || {}).forEach(function(insId) {
                            var inst = masters[cat][subj][insId];
                            var typeName = inst.typeName || '其他';
                            var instName = inst.instanceName || insId;
                            if (!flat[subj][typeName]) flat[subj][typeName] = {};
                            var units = (inst.units || []).map(function(u) {
                                return typeof u === 'string' ? u : (u.name || u.id || '');
                            });
                            flat[subj][typeName][instName] = units;
                        });
                    });
                });
                if (Object.keys(flat).length > 0) return flat;
                // 攤平 subject > instanceId (舊 v20 結構, 沒 cat 分類)
                var tree = {};
                Object.keys(masters).forEach(function(subj) {
                    tree[subj] = {};
                    Object.keys(masters[subj]).forEach(function(insId) {
                        var inst = masters[subj][insId];
                        var typeName = inst.typeName || '其他';
                        var instName = inst.instanceName || insId;
                        if (!tree[subj][typeName]) tree[subj][typeName] = {};
                        var units = (inst.units || []).map(function(u) {
                            return typeof u === 'string' ? u : (u.name || u.id || '');
                        });
                        tree[subj][typeName][instName] = units;
                    });
                });
                if (Object.keys(tree).length > 0) return tree;
            }
        } catch(e) {
            console.error('[v1.6.132 getSyllabusDB] localStorage 解析錯誤:', e);
        }
        // 3. fallback
        console.warn('[v1.6.132 getSyllabusDB] 無 master data, 用 DEFAULT');
        return DEFAULT_SYLLABUS_DB;
    }
    let syllabusDB = getSyllabusDB();'''

assert old_syllabus in c, 'syllabusDB hardcoded not found'
c = c.replace(old_syllabus, new_syllabus)

# === 2. createSettingCard 改成 Step 2~6 ===
old_card = '''<div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 2：科目</div>
            <select class="subj-sel" onchange="handleCardSubjectChange(this, true)">${subjOptions}</select>
            
            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 3：冊次/單元</div>
            <select class="vol-sel" onchange="handleCardVolumeChange(this, true)" style="display:none;"></select>
            <select class="unit-sel" onchange="handleCardUnitChange(this, true)"></select>

            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 4：錯題來源</div>
            <select class="source-sel" onchange="toggleCardSource(this)">
                <option value="複講">複講</option>
                <option value="考卷">考卷</option>
                <option value="其他">其他 (自訂)</option>
            </select>
            <input type="text" class="custom-source" placeholder="請填寫來源..." style="display:none;">

            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 5：錯誤原因</div>
            <div class="checkbox-group reasons-group">
                <label><input type="checkbox" value="觀念模糊"> 觀念模糊</label>
                <label><input type="checkbox" value="題目陷阱"> 題目陷阱</label>
                <label><input type="checkbox" value="粗心"> 粗心</label>
            </div>'''

new_card = '''<div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 2：科目</div>
            <select class="subj-sel" onchange="handleCardSubjectChange(this, true)">${subjOptions}</select>
            
            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 3：教材類型</div>
            <select class="type-sel" onchange="handleCardTypeChange(this, true)" disabled><option value="">請先選擇科目</option></select>
            
            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 4：教材名稱</div>
            <select class="inst-sel" onchange="handleCardInstChange(this, true)" disabled><option value="">請先選擇教材類型</option></select>
            
            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 5：單元</div>
            <select class="unit-sel" onchange="handleCardUnitChange(this, true)" disabled><option value="">請先選擇教材名稱</option></select>

            <div style="font-weight:bold; color:var(--theme-blue); margin-bottom:5px;">Step 6：錯誤原因</div>
            <div class="checkbox-group reasons-group">
                <label><input type="checkbox" value="觀念模糊"> 觀念模糊</label>
                <label><input type="checkbox" value="題目陷阱"> 題目陷阱</label>
                <label><input type="checkbox" value="粗心"> 粗心</label>
            </div>'''

assert old_card in c, 'old card not found'
c = c.replace(old_card, new_card)

# === 3. createSettingCard 開頭 syllabusDB → getSyllabusDB() ===
old_cardhead = '''let subjOptions = '<option value="">請選擇科目</option>';
        Object.keys(syllabusDB).forEach(sub => subjOptions += `<option value="${sub}">${sub}</option>`);'''
new_cardhead = '''let subjOptions = '<option value="">請選擇科目</option>';
        Object.keys(getSyllabusDB()).forEach(sub => subjOptions += `<option value="${sub}">${sub}</option>`);'''
assert old_cardhead in c, 'cardhead not found'
c = c.replace(old_cardhead, new_cardhead)

# === 4. handleCardSubjectChange 改成 Step 2~6 結構 ===
old_handlers = '''function handleCardSubjectChange(selectEl, isSync = false) {
        const card = selectEl.closest('.file-card');
        const subject = selectEl.value;
        const volSelect = card.querySelector('.vol-sel');
        const unitSelect = card.querySelector('.unit-sel');
        const data = syllabusDB[subject];

        volSelect.innerHTML = ''; unitSelect.innerHTML = '';

        if (data) {
            if (data.type === 'custom') {
                volSelect.style.display = 'none';
                data.units.forEach(u => unitSelect.add(new Option(u, u)));
            } else {
                volSelect.style.display = 'block';
                data.volOrder.forEach(v => volSelect.add(new Option(v, v)));
                handleCardVolumeChange(volSelect, false);
            }
        }

        if (isSync) {
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    const otherSubjSel = otherCard.querySelector('.subj-sel');
                    otherSubjSel.value = subject;
                    handleCardSubjectChange(otherSubjSel, false);
                }
            });
        }
    }

    function handleCardVolumeChange(volSelect, isSync = false) {
        const card = volSelect.closest('.file-card');
        const subject = card.querySelector('.subj-sel').value;
        const volume = volSelect.value;
        const unitSelect = card.querySelector('.unit-sel');
        const data = syllabusDB[subject];

        unitSelect.innerHTML = '';
        if (data && data.vols && data.vols[volume]) {
            data.vols[volume].forEach(u => unitSelect.add(new Option(u, u)));
        }

        if (isSync) {
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    const otherVolSel = otherCard.querySelector('.vol-sel');
                    if (otherVolSel.style.display !== 'none') {
                        otherVolSel.value = volume;
                        handleCardVolumeChange(otherVolSel, false);
                    }
                }
            });
        }
    }

    function handleCardUnitChange(unitSelect, isSync = false) {
        if (isSync) {
            const card = unitSelect.closest('.file-card');
            const unitVal = unitSelect.value;
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.querySelector('.unit-sel').value = unitVal;
                }
            });
        }
    }'''

new_handlers = '''function handleCardSubjectChange(selectEl, isSync = false) {
        const card = selectEl.closest('.file-card');
        const subject = selectEl.value;
        const typeSelect = card.querySelector('.type-sel');
        const instSelect = card.querySelector('.inst-sel');
        const unitSelect = card.querySelector('.unit-sel');
        const data = getSyllabusDB()[subject];

        typeSelect.innerHTML = '<option value="">請選擇教材類型</option>';
        instSelect.innerHTML = '<option value="">請先選擇教材類型</option>';
        unitSelect.innerHTML = '<option value="">請先選擇教材名稱</option>';
        typeSelect.disabled = !data;
        instSelect.disabled = true;
        unitSelect.disabled = true;

        if (data) {
            Object.keys(data).forEach(typeName => {
                typeSelect.add(new Option(typeName, typeName));
            });
            typeSelect.disabled = false;
        }

        if (isSync) {
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    const otherSubjSel = otherCard.querySelector('.subj-sel');
                    otherSubjSel.value = subject;
                    handleCardSubjectChange(otherSubjSel, false);
                }
            });
        }
    }

    function handleCardTypeChange(typeSelect, isSync = false) {
        const card = typeSelect.closest('.file-card');
        const subject = card.querySelector('.subj-sel').value;
        const typeName = typeSelect.value;
        const instSelect = card.querySelector('.inst-sel');
        const unitSelect = card.querySelector('.unit-sel');
        const data = getSyllabusDB()[subject];

        instSelect.innerHTML = '<option value="">請選擇教材名稱</option>';
        unitSelect.innerHTML = '<option value="">請先選擇教材名稱</option>';
        instSelect.disabled = !data || !typeName;
        unitSelect.disabled = true;

        if (data && data[typeName]) {
            Object.keys(data[typeName]).forEach(instName => {
                instSelect.add(new Option(instName, instName));
            });
        }

        if (isSync) {
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    const otherTypeSel = otherCard.querySelector('.type-sel');
                    otherTypeSel.value = typeName;
                    handleCardTypeChange(otherTypeSel, false);
                }
            });
        }
    }

    function handleCardInstChange(instSelect, isSync = false) {
        const card = instSelect.closest('.file-card');
        const subject = card.querySelector('.subj-sel').value;
        const typeName = card.querySelector('.type-sel').value;
        const instName = instSelect.value;
        const unitSelect = card.querySelector('.unit-sel');
        const data = getSyllabusDB()[subject];

        unitSelect.innerHTML = '<option value="">請選擇單元</option>';
        unitSelect.disabled = true;

        if (data && data[typeName] && data[typeName][instName]) {
            const units = data[typeName][instName];
            units.forEach(u => {
                const label = typeof u === 'string' ? u : (u.name || u.id);
                unitSelect.add(new Option(label, label));
            });
            unitSelect.disabled = false;
        }

        if (isSync) {
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    const otherInstSel = otherCard.querySelector('.inst-sel');
                    otherInstSel.value = instName;
                    handleCardInstChange(otherInstSel, false);
                }
            });
        }
    }

    function handleCardUnitChange(unitSelect, isSync = false) {
        if (isSync) {
            const card = unitSelect.closest('.file-card');
            const unitVal = unitSelect.value;
            const batchId = card.dataset.batchId;
            document.querySelectorAll(`.file-card[data-batch-id="${batchId}"]`).forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.querySelector('.unit-sel').value = unitVal;
                }
            });
        }
    }'''

assert old_handlers in c, 'old handlers not found'
c = c.replace(old_handlers, new_handlers)

# === 5. 移除 handleFilesForCrop 內可能用到的 vol-sel (雖然不一定要) ===
# 看 v1.6.131-BISECT 有沒有用 vol-sel
vol_uses = c.count('.vol-sel')
print(f'vol-sel uses: {vol_uses}')
if vol_uses > 0:
    print('WARN: vol-sel still in code')

# === 6. title ===
c = c.replace('[v1.6.131-BISECT]', '[v1.6.132]', 1)

with open('wrong-notes/index.html', 'w') as f:
    f.write(c)
print('OK')
