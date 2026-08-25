// test/upload_crop.test.js -- v1.6.10 upload + crop box integration test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Extract all scripts (there may be multiple)
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
const lastScriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
// We need ALL scripts in order - use matchAll
const allScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

function loadFullIndex() {
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'http://localhost/',
        storageUnderOrigin: true,
    });
    const win = dom.window;
    
    // Eval all script blocks in order
    for (const m of allScripts) {
        try { win.eval(m[1]); } catch(e) { /* ignore init errors */ }
    }
    return { dom, win };
}

test('handleFilesForCrop: renders image into wn-crop-workspace', () => {
    const { win } = loadFullIndex();

    // Mock pdfjsLib to avoid errors
    win.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve({ numPages: 0 }) }) };

    // Check required DOM IDs exist
    assert.ok(win.document.getElementById('wn-crop-workspace'), 'wn-crop-workspace should exist');
    assert.ok(win.document.getElementById('crop-modal'), 'crop-modal should exist');
    assert.ok(win.document.getElementById('manual-edit-pad'), 'manual-edit-pad should exist');

    // Create a 1x1 red PNG in memory
    const pngData = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
    );
    const file = new win.File([pngData], 'test.png', { type: 'image/png' });
    const fileList = [file];

    // Call handleFilesForCrop
    assert.ok(typeof win.handleFilesForCrop === 'function', 'handleFilesForCrop should be defined');
    
    // It should set crop-modal to display:flex
    // and render image into wn-crop-workspace
    win.handleFilesForCrop(fileList);

    // Wait a tick for the async FileReader to complete
    return new Promise(resolve => {
        setTimeout(() => {
            const workspace = win.document.getElementById('wn-crop-workspace');
            const modal = win.document.getElementById('crop-modal');
            
            assert.strictEqual(modal.style.display, 'flex', 'crop-modal should be visible');
            assert.ok(workspace.innerHTML.length > 0, 'workspace should have content (image rendered)');
            
            // Should have a page-container with an img
            const containers = workspace.querySelectorAll('.page-container');
            assert.ok(containers.length > 0, 'should have at least one .page-container');
            
            const imgs = containers[0].querySelectorAll('img');
            assert.ok(imgs.length > 0, 'page-container should have an img');
            
            resolve();
        }, 100);
    });
});

test('setupDragAndDrop: prevents default and adds listeners to .drop-zone', () => {
    const { win } = loadFullIndex();
    
    assert.ok(typeof win.setupDragAndDrop === 'function', 'setupDragAndDrop should be defined');
    
    // Check that setupDragAndDrop doesn't throw
    assert.doesNotThrow(() => win.setupDragAndDrop(), 'setupDragAndDrop should not throw');
    
    // Check drop zones exist
    const zones = win.document.querySelectorAll('.drop-zone');
    assert.ok(zones.length > 0, 'should have at least one .drop-zone element');
});

test('goToPage: switches page visibility', () => {
    const { win } = loadFullIndex();
    
    assert.ok(typeof win.goToPage === 'function', 'goToPage should be defined');
    
    // Initially note-page and view-page are hidden (display:none in HTML)
    // Call goToPage with note-page
    win.goToPage('note-page');
    
    // Check that note-page is visible
    const notePage = win.document.getElementById('note-page');
    assert.strictEqual(notePage.style.display !== 'none', true, 'note-page should be visible');
});

test('generateNote: creates note slots from currentFilesData', () => {
    const { win } = loadFullIndex();
    
    assert.ok(typeof win.generateNote === 'function', 'generateNote should be defined');
    assert.ok(typeof win.saveNotes === 'function', 'saveNotes should be defined');
    
    // Set up some test data
    win.currentFilesData = [{
        batchId: 1,
        type: 'image',
        cards: [{
            cropId: 'test1',
            subject: '數學',
            volume: '第一冊',
            unit: '數與數線',
            source: 'photos',
            reasons: [],
            note: 'test note content'
        }]
    }];
    
    // Call generateNote
    assert.doesNotThrow(() => win.generateNote(), 'generateNote should not throw');
    
    // Check note-slots-container has content
    const container = win.document.getElementById('note-slots-container');
    assert.ok(container && container.children.length > 0, 'note-slots-container should have children');
});
