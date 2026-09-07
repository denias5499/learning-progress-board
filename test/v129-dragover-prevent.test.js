// v1.6.129: 用 vm + fake DOM 模擬 setupDragAndDrop, 確認 preventDefault 真的有跑
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const WN = fs.readFileSync('wrong-notes/index.html', 'utf8');

function makeFakeZone() {
    const zone = {
        classList: {
            _classes: new Set(),
            add(c) { this._classes.add(c); },
            remove(c) { this._classes.delete(c); }
        },
        _handlers: {},
        addEventListener(ev, h) { this._handlers[ev] = h; }
    };
    zone.dispatchEvent = function(e) {
        if (this._handlers[e.type]) this._handlers[e.type](e);
    };
    return zone;
}

function makeFakeEvent(type) {
    return {
        type,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() {}
    };
}

function runSetupDragAndDrop() {
    const fnMatch = WN.match(/function setupDragAndDrop\(\)[\s\S]*?\n    \}/);
    if (!fnMatch) throw new Error('setupDragAndDrop not found');
    
    const fakeZone = makeFakeZone();
    const sandbox = {
        document: { querySelectorAll: () => [fakeZone] },
        window: { addEventListener: () => {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(fnMatch[0] + '\nsetupDragAndDrop();', sandbox);
    return fakeZone;
}

test('v129: zone handler 內 dragover 必須 preventDefault', () => {
    const zone = runSetupDragAndDrop();
    const e = makeFakeEvent('dragover');
    zone.dispatchEvent(e);
    assert.ok(e.defaultPrevented, 'dragover 必須被 preventDefault');
});

test('v129: zone handler 內 drop 必須 preventDefault', () => {
    const zone = runSetupDragAndDrop();
    const e = makeFakeEvent('drop');
    e.dataTransfer = { files: [] };
    zone.dispatchEvent(e);
    assert.ok(e.defaultPrevented, 'drop 必須被 preventDefault');
});

test('v129: zone handler 內 dragleave 必須 preventDefault', () => {
    const zone = runSetupDragAndDrop();
    const e = makeFakeEvent('dragleave');
    zone.dispatchEvent(e);
    assert.ok(e.defaultPrevented, 'dragleave 必須被 preventDefault');
});

test('v129: 架構 - setupDragAndDrop 內 zone handler 包含 preventDefault', () => {
    var setupFn = WN.match(/function setupDragAndDrop\(\)\s*\{([\s\S]*?)\n    \}/);
    assert.ok(setupFn, '應找到 setupDragAndDrop');
    var zoneBlock = setupFn[1].substring(setupFn[1].indexOf('dropZones.forEach'));
    assert.ok(zoneBlock.includes('e.preventDefault()'),
        'zone handler 內應有 preventDefault');
});

test('v129: title [v1.6.129]', () => {
    const IDX = fs.readFileSync('index.html', 'utf8');
    assert.ok(/<title>.*\[v1\.6\.129\]<\/title>/.test(IDX));
});
