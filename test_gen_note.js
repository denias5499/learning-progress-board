const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Create test PNG
  const tmpBrowser = await chromium.launch();
  const tmpPage = await tmpBrowser.newPage();
  const pngData = await tmpPage.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c8e6f5';
    ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = '#000';
    ctx.font = '20px serif';
    ctx.fillText('Q1: 1+1=?', 50, 50);
    return c.toDataURL('image/png');
  });
  await tmpBrowser.close();
  fs.writeFileSync('/tmp/test_q.png', Buffer.from(pngData.replace(/^data:image\/png;base64,/, ''), 'base64'));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGE_ERR: ' + e.message));

  await page.goto('file:///mnt/my_book/Denias/projects/learning-progress-board/index.html');
  await page.waitForTimeout(1500);

  // 1. Upload
  console.log('=== STEP 1: Upload file ===');
  await page.$eval('#wn-file-input', (el) => el.value = '');
  const input = await page.$('#wn-file-input');
  await input.setInputFiles('/tmp/test_q.png');
  await page.waitForTimeout(2000);

  const afterUpload = await page.evaluate(() => ({
    modal: window.getComputedStyle(document.getElementById('crop-modal')).display,
    wsChildren: document.getElementById('wn-crop-workspace').children.length,
    batchCounter: typeof batchCounter !== 'undefined' ? batchCounter : 'undefined',
    currentFilesData: typeof currentFilesData !== 'undefined' ? currentFilesData.length : 'undefined',
  }));
  console.log('After upload:', afterUpload);

  // 2. Click 手動框選
  console.log('\n=== STEP 2: Click 手動框選 ===');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('手動框選'));
    if (btn) btn.click();
    else console.log('手動框選 button NOT FOUND');
  });
  await page.waitForTimeout(500);

  const afterManualBtn = await page.evaluate(() => ({
    manualPad: window.getComputedStyle(document.getElementById('manual-edit-pad')).display,
    isManualAdding: typeof isManualAdding !== 'undefined' ? isManualAdding : 'undefined',
  }));
  console.log('After 手動框選:', afterManualBtn);

  // 3. Click 新增框線
  console.log('\n=== STEP 3: Click 新增框線 ===');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('新增框線'));
    if (btn) btn.click();
    else console.log('新增框線 button NOT FOUND');
  });
  await page.waitForTimeout(300);

  const afterAddBox = await page.evaluate(() => ({
    isManualAdding: typeof isManualAdding !== 'undefined' ? isManualAdding : 'undefined',
  }));
  console.log('After 新增框線:', afterAddBox);

  // 4. Simulate clicking on the page container to create a box
  console.log('\n=== STEP 4: Click on image to create box ===');
  const wsChildrenBefore = await page.evaluate(() => document.getElementById('wn-crop-workspace').children.length);
  console.log('ws children before click:', wsChildrenBefore);

  // Click on the image inside page-container
  const clicked = await page.evaluate(() => {
    const container = document.querySelector('.page-container');
    if (!container) return 'NO page-container';
    const img = container.querySelector('img');
    if (!img) return 'NO img in container';
    
    // Simulate mousedown event on container
    const rect = container.getBoundingClientRect();
    const mockEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 4,
      clientY: rect.top + rect.height / 4,
      offsetX: rect.width / 4,
      offsetY: rect.height / 4,
    });
    // Dispatch on container
    container.dispatchEvent(mockEvent);
    return {
      dispatched: true,
      isManualAdding: typeof isManualAdding !== 'undefined' ? isManualAdding : 'undefined',
      manualBoxes: typeof manualBoxes !== 'undefined' ? manualBoxes.length : 'undefined',
      wsChildren: document.getElementById('wn-crop-workspace').children.length,
    };
  });
  console.log('After image click:', clicked);

  // 5. Check if a box was created - look for .mock-crop-box
  await page.waitForTimeout(500);
  const boxCount = await page.evaluate(() => document.querySelectorAll('.mock-crop-box').length);
  console.log('mock-crop-box count:', boxCount);

  // 6. If a box exists, click the + button inside it
  if (boxCount > 0) {
    console.log('\n=== STEP 5: Click + button in box ===');
    const plusResult = await page.evaluate(() => {
      const plusBtn = document.querySelector('.mock-crop-box .add-crop-btn');
      if (!plusBtn) return 'NO + BUTTON';
      plusBtn.click();
      return 'clicked +';
    });
    console.log('Plus button:', plusResult);
    await page.waitForTimeout(500);

    // Check if a file-card was created
    const cardCount = await page.evaluate(() => document.querySelectorAll('.file-card').length);
    console.log('file-card count after +:', cardCount);

    // 7. Now click 生成錯題筆記
    console.log('\n=== STEP 6: Click 生成錯題筆記 ===');
    const genResult = await page.evaluate(() => {
      const genBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('生成錯題筆記'));
      if (!genBtn) return 'GENERATE BTN NOT FOUND';
      console.log('Found generate button:', genBtn.outerHTML.slice(0, 100));
      genBtn.click();
      return 'clicked';
    });
    console.log('Generate result:', genResult);
    await page.waitForTimeout(1000);

    const afterGen = await page.evaluate(() => ({
      noteSlots: document.getElementById('note-slots-container') ? document.getElementById('note-slots-container').children.length : 'NOT FOUND',
      notePageDisplay: document.getElementById('note-page') ? window.getComputedStyle(document.getElementById('note-page')).display : 'NOT FOUND',
      localStorageKeys: Object.keys(localStorage).filter(k => k.includes('Note') || k.includes('Study')),
    }));
    console.log('After generate:', afterGen);
  } else {
    console.log('No box created - skipping + button test');
    // Let's manually test generateNote with currentFilesData
    console.log('\n=== MANUAL TEST: generateNote() ===');
    const manualResult = await page.evaluate(() => {
      // Set up some data
      window.currentFilesData = [{
        batchId: 1,
        type: 'image',
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        cards: [{
          cropId: 'manual1',
          subject: '數學',
          volume: '第一冊',
          unit: '數與數線',
          source: 'photos',
          reasons: ['概念錯誤'],
          note: 'test note'
        }]
      }];
      window.batchCounter = 1;
      
      // Try calling generateNote
      if (typeof window.generateNote === 'function') {
        try {
          window.generateNote();
          return {
            success: true,
            noteSlots: document.getElementById('note-slots-container') ? document.getElementById('note-slots-container').children.length : 'NOT FOUND'
          };
        } catch(e) {
          return { error: e.message, stack: e.stack.split('\n')[0] };
        }
      } else {
        return { error: 'generateNote not found' };
      }
    });
    console.log('Manual generateNote test:', manualResult);
  }

  // Show relevant logs
  const relevant = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('Uncaught') || l.includes('generateNote') || l.includes('file-card') || l.includes('ReferenceError'));
  console.log('\nRelevant logs:', relevant.length ? relevant.join('\n') : 'none');

  await browser.close();
})();
