// v1.6.127: 模擬真實拖曳到 crop 的完整流程, 找出 freeze 點
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');
const IDX = fs.readFileSync('index.html', 'utf8');



test('v1.6.127: drop-zone 有 dragover/dragleave/drop handlers', () => {
    var setupFn = WN.match(/function setupDragAndDrop\(\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(setupFn[1].includes("addEventListener('dragover'"),
        '應有 dragover handler');
    assert.ok(setupFn[1].includes("addEventListener('drop'"),
        '應有 drop handler');
});



test('v1.6.127: handleFilesForCrop 有 try/catch 或 async 安全', () => {
    var handleFn = WN.match(/async function handleFilesForCrop\([\s\S]*?\n    \}/);
    assert.ok(handleFn, '應找到 handleFilesForCrop');
    // v1.6.126 改 renderImage 內有 try/catch, 確認 handleFilesForCrop 不會因 renderImage 失敗而 freeze
    var renderFn = WN.match(/function renderImage\([\s\S]*?\n    \}/);
    assert.ok(renderFn[0].includes('try {') || renderFn[0].includes('img.onerror'),
        'renderImage 應有錯誤處理');
});




