const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
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
    ctx.fillText('Test Question 1', 50, 50);
    ctx.fillText('This is a math problem.', 50, 100);
    return c.toDataURL('image/png');
  });
  await tmpBrowser.close();
  fs.writeFileSync('/tmp/test_wn.png', Buffer.from(pngData.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log('Created PNG:', fs.statSync('/tmp/test_wn.png').size, 'bytes');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGE_ERR: ' + e.message));

  await page.goto('file:///mnt/my_book/Denias/projects/learning-progress-board/index.html');
  await page.waitForTimeout(1000);

  // 1. Upload file
  console.log('\n=== STEP 1: Upload file ===');
  const input = await page.$('#wn-file-input');
  await input.setInputFiles('/tmp/test_wn.png');
  await page.waitForTimeout(1500);

  const afterUpload = await page.evaluate(() => ({
    modal_display: window.getComputedStyle(document.getElementById('crop-modal')).display,
    modal_position: window.getComputedStyle(document.getElementById('crop-modal')).position,
    ws_children: document.getElementById('wn-crop-workspace').children.length,
    stats_wrongnotes_display: window.getComputedStyle(document.getElementById('stats-wrongnotes')).display,
  }));
  console.log('After upload:', JSON.stringify(afterUpload, null, 2));

  // 2. Enable manual crop
  console.log('\n=== STEP 2: Enable manual crop ===');
  await page.evaluate(() => { if (typeof enableManualCrop === 'function') enableManualCrop(); });
  await page.waitForTimeout(300);

  const afterManual = await page.evaluate(() => ({
    manual_edit_pad: window.getComputedStyle(document.getElementById('manual-edit-pad')).display,
    isManualAdding: typeof isManualAdding !== 'undefined' ? isManualAdding : 'undefined',
  }));
  console.log('After manual crop:', JSON.stringify(afterManual, null, 2));

  // 3. Finish cropping
  console.log('\n=== STEP 3: Finish cropping ===');
  await page.evaluate(() => { if (typeof finishCropping === 'function') finishCropping(); });
  await page.waitForTimeout(500);

  const afterFinish = await page.evaluate(() => ({
    modal_display: window.getComputedStyle(document.getElementById('crop-modal')).display,
    settings_container: window.getComputedStyle(document.getElementById('settings-container')).display,
    cards_slider_children: document.getElementById('cards-slider').children.length,
  }));
  console.log('After finish:', JSON.stringify(afterFinish, null, 2));

  // 4. Check functions
  console.log('\n=== STEP 4: Global function availability ===');
  const fnCheck = await page.evaluate(() => ({
    enableManualCrop: typeof enableManualCrop === 'function',
    createNewManualBox: typeof createNewManualBox === 'function',
    makeDraggableAndResizable: typeof makeDraggableAndResizable === 'function',
    toggleCroppedQuestion: typeof toggleCroppedQuestion === 'function',
    createSettingCard: typeof createSettingCard === 'function',
    generateNote: typeof generateNote === 'function',
    goToPage: typeof goToPage === 'function',
    renderViewPage: typeof renderViewPage === 'function',
    isManualAdding: typeof isManualAdding !== 'undefined',
    currentFilesData: typeof currentFilesData !== 'undefined',
  }));
  console.log(JSON.stringify(fnCheck, null, 2));

  console.log('\nErrors:', errs.length ? errs.join('\n') : 'none');
  await browser.close();
})();
