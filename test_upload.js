const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Create test PNG using JSDOM-like canvas approach
  const tmpBrowser = await chromium.launch();
  const tmpPage = await tmpBrowser.newPage();
  const pngData = await tmpPage.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 100;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = '#fff';
    ctx.fillRect(50, 25, 100, 50);
    return c.toDataURL('image/png');
  });
  await tmpBrowser.close();
  
  fs.writeFileSync('/tmp/test_wn.png', Buffer.from(pngData.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log('Created PNG:', fs.statSync('/tmp/test_wn.png').size, 'bytes');
  
  // Load the actual page
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGE_ERR: ' + e.message));
  
  await page.goto('file:///mnt/my_book/Denias/projects/learning-progress-board/index.html');
  await page.waitForTimeout(1000);
  
  // Check initial state
  console.log('\n=== INITIAL STATE ===');
  const initial = await page.evaluate(() => ({
    drop_zone: document.getElementById('wn-drop-zone') ? document.getElementById('wn-drop-zone').offsetHeight : 'NOT FOUND',
    crop_modal_display: document.getElementById('crop-modal') ? window.getComputedStyle(document.getElementById('crop-modal')).display : 'NOT FOUND'
  }));
  console.log(initial);
  
  // Upload file via input element directly
  console.log('\n=== UPLOADING FILE ===');
  const input = await page.$('#wn-file-input');
  if (!input) {
    console.log('ERROR: #wn-file-input not found');
    await browser.close();
    return;
  }
  
  await input.setInputFiles('/tmp/test_wn.png');
  await page.waitForTimeout(1500); // wait for FileReader + renderImage
  
  // Check final state
  console.log('\n=== FINAL STATE ===');
  const final = await page.evaluate(() => {
    const modal = document.getElementById('crop-modal');
    const ws = document.getElementById('wn-crop-workspace');
    const style = modal ? window.getComputedStyle(modal) : null;
    return {
      modal_display: style ? style.display : 'N/A',
      modal_position: style ? style.position : 'N/A',
      ws_children: ws ? ws.children.length : 0,
      ws_innerLength: ws ? ws.innerHTML.length : 0,
      ws_firstChild: ws && ws.firstElementChild ? ws.firstElementChild.className : 'none',
      pageContainer: ws ? ws.querySelector('.page-container') ? 'found' : 'missing' : 'ws missing'
    };
  });
  console.log(JSON.stringify(final, null, 2));
  
  console.log('\nErrors:', errs.join('\n') || 'none');
  await browser.close();
})();
