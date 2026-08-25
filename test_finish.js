const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if(msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(1500);
  
  // Activate stats-wrongnotes view
  await page.evaluate(() => {
    if(typeof switchStatsView === 'function') switchStatsView('wrongnotes');
    else {
      document.querySelectorAll('[data-view]').forEach(b => {
        if(b.getAttribute('data-view') === 'wrongnotes') b.click();
      });
    }
  });
  await page.waitForTimeout(500);
  
  // Upload an image via handleFilesForCrop
  await page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 1600;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0,0,1200,1600);
    ctx.fillStyle = 'black'; ctx.font = '30px sans-serif';
    ctx.fillText('Test Question 1', 100, 100);
    
    const dataUrl = cv.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for(let i=0; i<byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], {type: mimeString});
    const file = new File([blob], 'test.png', {type: 'image/png'});
    handleFilesForCrop([file]);
  });
  
  await page.waitForTimeout(2000);
  
  const beforeClick = await page.evaluate(() => {
    return {
      modalDisplay: document.getElementById('crop-modal').style.display,
      modalClass: document.getElementById('crop-modal').className,
      hasBoxes: document.querySelectorAll('.mock-crop-box').length,
      finishExists: typeof finishCropping === 'function',
      finishSource: typeof finishCropping === 'function' ? finishCropping.toString().substring(0,100) : 'NOT FOUND',
    };
  });
  
  console.log('Before clicking 完成選取:');
  console.log('  modal display:', beforeClick.modalDisplay);
  console.log('  modal class:', beforeClick.modalClass);
  console.log('  mock-crop-boxes:', beforeClick.hasBoxes);
  console.log('  finishCropping exists:', beforeClick.finishExists);
  console.log('  finishCropping source:', beforeClick.finishSource);
  
  // Click the finish button
  await page.evaluate(() => {
    // Find the finish button
    const btns = document.querySelectorAll('button');
    btns.forEach(b => {
      if(b.textContent.includes('完成選取')) {
        console.log('Found button:', b.textContent, 'onclick:', b.getAttribute('onclick'));
        b.click();
      }
    });
  });
  
  await page.waitForTimeout(500);
  
  const afterClick = await page.evaluate(() => {
    return {
      modalDisplay: document.getElementById('crop-modal').style.display,
      settingsDisplay: document.getElementById('settings-container') ? document.getElementById('settings-container').style.display : 'not-found',
      statsWNDisplay: document.getElementById('stats-wrongnotes') ? document.getElementById('stats-wrongnotes').style.display : 'not-found',
    };
  });
  
  console.log('\nAfter clicking 完成選取:');
  console.log('  modal display:', afterClick.modalDisplay);
  console.log('  settings-container display:', afterClick.settingsDisplay);
  console.log('  stats-wrongnotes display:', afterClick.statsWNDisplay);
  console.log('  Console errors:', errors.length > 0 ? errors : 'none');
  
  await browser.close();
})();
