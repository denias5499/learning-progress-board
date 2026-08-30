// v1.6.83 Phase 2: 上傳 + Crop + 中等版筆跡消除
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIndex } = require('./helpers');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function getFunctionBody(name) {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let depth = 0, i = html.indexOf('{', start);
    if (i < 0) return null;
    const bodyStart = i + 1;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') {
            depth--;
            if (depth === 0) return html.substring(bodyStart, i);
        }
        i++;
    }
    return null;
}

test('v1.6.83: WN_PHASE2_STATE 結構正確', () => {
    assert.ok(/var WN_PHASE2_STATE\s*=/.test(html), 'WN_PHASE2_STATE 應宣告');
    assert.ok(/uploadedImg:\s*null/.test(html), 'uploadedImg 應初始化為 null');
    assert.ok(/cropBoxes:\s*\[\]/.test(html), 'cropBoxes 應初始化為 []');
    assert.ok(/cropMode:\s*'add'/.test(html), 'cropMode 應預設 add');
});

test('v1.6.83: WN_handleFileUpload 處理圖片上傳', () => {
    const body = getFunctionBody('WN_handleFileUpload');
    assert.ok(body, 'WN_handleFileUpload 應定義');
    assert.ok(/FileReader/.test(body), '應用 FileReader');
    assert.ok(body.indexOf("file.type.startsWith") >= 0 && body.indexOf("image/") >= 0, "應檢查 image MIME type");
    assert.ok(/alert.*請上傳圖片/.test(body), '應在非圖片時 alert');
});

test('v1.6.83: WN_removeHandwriting 中等版筆跡消除', () => {
    const body = getFunctionBody('WN_removeHandwriting');
    assert.ok(body, 'WN_removeHandwriting 應定義');
    assert.ok(/getImageData/.test(body), '應用 getImageData 讀取像素');
    assert.ok(/putImageData/.test(body), '應用 putImageData 寫回');
    // 螢光筆偵測: 黃色 + 綠色 + 淺粉
    assert.ok(/isYellow/.test(body), '應偵測黃色');
    assert.ok(/isGreen/.test(body), '應偵測綠色');
    assert.ok(/isLightPink/.test(body), '應偵測淺粉色');
    // 變白
    assert.ok(/data\[i\]\s*=\s*255/.test(body), '應把 RGB 變 255 (白)');
});

test('v1.6.83: WN_saveAllCrops 完整儲存流程', () => {
    const body = getFunctionBody('WN_saveAllCrops');
    assert.ok(body, 'WN_saveAllCrops 應定義');
    assert.ok(/StudyMap_WrongNotes/.test(body), '應寫入 StudyMap_WrongNotes');
    assert.ok(/toDataURL/.test(body), '應轉成 dataURL');
    assert.ok(/image\/jpeg/.test(body), '應用 JPEG 壓縮');
    assert.ok(/WN_autoDownload/.test(body), '應自動下載');
});

test('v1.6.83: 自動下載的檔名規範', () => {
    // 檔名格式: Denias__數學__複習講義__一模__2026-08-25__001__原始.jpg
    const saveBody = getFunctionBody('WN_saveAllCrops');
    assert.ok(/baseName/.test(saveBody), '應組裝 baseName');
    assert.ok(/__原始\.jpg/.test(saveBody), '原始檔案後綴 __原始.jpg');
    assert.ok(/__消除筆跡\.jpg/.test(saveBody), '消除檔案後綴 __消除筆跡.jpg');
});

test('v1.6.83: WN_autoDownload 用 <a download>', () => {
    const body = getFunctionBody('WN_autoDownload');
    assert.ok(body, 'WN_autoDownload 應定義');
    assert.ok(/document\.createElement\(.a.\)/.test(body), '應創建 <a>');
    assert.ok(/a\.download/.test(body), '應設 download 屬性');
    assert.ok(/a\.click\(\)/.test(body), '應觸發下載');
});

test('v1.6.83: 4 個 crop 模式函式都存在', () => {
    assert.ok(getFunctionBody('WN_setCropMode'), 'WN_setCropMode 應定義');
    assert.ok(getFunctionBody('WN_clearAllBoxes'), 'WN_clearAllBoxes 應定義');
    assert.ok(getFunctionBody('WN_renderCropBoxes'), 'WN_renderCropBoxes 應定義');
    assert.ok(getFunctionBody('WN_deleteCropBox'), 'WN_deleteCropBox 應定義');
    assert.ok(getFunctionBody('WN_renderCropCards'), 'WN_renderCropCards 應定義');
});

test('v1.6.83: HTML 有上傳 + crop 區域', () => {
    assert.ok(/id="wn-source-zone"/.test(html), 'wn-upload-zone 應存在');
    assert.ok(/id="wn-source-input"/.test(html), 'wn-file-input 應存在');
    assert.ok(/id="wn-crop-area"/.test(html), 'wn-crop-area 應存在');
    assert.ok(/id="wn-crop-img"/.test(html), 'wn-crop-img 應存在');
    assert.ok(/onmousedown="WN_onCropImgMouseDown\(event\)"/.test(html), "wn-crop-img 應有 mousedown handler");
    assert.ok(/id="wn-crop-list"/.test(html), 'wn-crop-list 應存在');
    assert.ok(/id="wn-crop-cards"/.test(html), 'wn-crop-cards 應存在');
});

test('v1.6.83: 5 個錯題原因 dropdown', () => {
    const cardFn = getFunctionBody('WN_renderCropCards');
    assert.ok(cardFn, 'WN_renderCropCards 應定義');
    assert.ok(/計算錯誤/.test(cardFn));
    assert.ok(/概念不清楚/.test(cardFn));
    assert.ok(/公式記錯/.test(cardFn));
    assert.ok(/粗心/.test(cardFn));
    assert.ok(/審題不清/.test(cardFn));
});

test('v1.6.83: 整合測試 - WN_handleFileUpload + WN_saveAllCrops 模擬', () => {
    const win = loadIndex();
    // 確認函式都存在
    assert.equal(typeof win.WN_handleFileUpload, 'function');
    assert.equal(typeof win.WN_saveAllCrops, 'function');
    assert.equal(typeof win.WN_removeHandwriting, 'function');
    assert.equal(typeof win.WN_autoDownload, 'function');

    // 模擬設一些 crop boxes
    win.eval(`
        WN_PHASE2_STATE.uploadedImg = 'data:image/jpeg;base64,fake';
        WN_PHASE2_STATE.uploadedImgWidth = 100;
        WN_PHASE2_STATE.uploadedImgHeight = 100;
        WN_PHASE2_STATE.cropBoxes = [
            { x: 0, y: 0, w: 30, h: 30, subject: '數學', material: '複習講義', instance: '大滿貫', volume: '第一冊', unit: 'u1', reason: '粗心' },
            { x: 30, y: 0, w: 30, h: 30, subject: '數學', material: '複習講義', instance: '大滿貫', volume: '第一冊', unit: 'u2', reason: '計算錯誤' }
        ];
    `);
    assert.equal(win.eval('WN_PHASE2_STATE.cropBoxes.length'), 2, '應有 2 個 crop boxes');
});
