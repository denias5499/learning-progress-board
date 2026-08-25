const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Go to the page
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(1000);
  
  // Click stats tab
  await page.evaluate(() => {
    document.querySelectorAll('[data-view]').forEach(b => {
      if(b.getAttribute('data-view') === 'wrongnotes') b.click();
    });
  });
  await page.waitForTimeout(500);
  
  // Trigger switchStatsView
  await page.evaluate(() => {
    if(typeof switchStatsView === 'function') switchStatsView('wrongnotes');
  });
  await page.waitForTimeout(500);
  
  // Create mock file and upload
  const canvas = await page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 1600;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0,0,1200,1600);
    ctx.fillStyle = 'black'; ctx.font = '30px sans-serif';
    ctx.fillText('Test Question 1', 100, 100);
    return cv;
  });
  
  // Convert canvas to blob-like and trigger upload
  await page.evaluate(() => {
    const cv = document.createElement('canvas');
    cv.width = 1200; cv.height = 1600;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0,0,1200,1600);
    ctx.fillStyle = 'black'; ctx.font = '30px sans-serif';
    ctx.fillText('Test Question 1', 100, 100);
    
    // Call handleFilesForCrop directly with a mock File-like object
    const dataUrl = cv.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for(let i=0; i<byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], {type: mimeString});
    
    // Create a mock File
    const file = new File([blob], 'test.png', {type: 'image/png'});
    handleFilesForCrop([file]);
  });
  
  await page.waitForTimeout(2000);
  
  // Check crop modal state
  const state = await page.evaluate(() => {
    const modal = document.getElementById('crop-modal');
    const workspace = document.getElementById('wn-crop-workspace');
    const pageContainer = document.querySelector('.page-container');
    const img = pageContainer ? pageContainer.querySelector('img') : null;
    const wnCropArea = document.getElementById('crop-modal');
    
    // Check computed styles
    const modalCS = modal ? window.getComputedStyle(modal) : null;
    const workspaceCS = workspace ? window.getComputedStyle(workspace) : null;
    const pcCS = pageContainer ? window.getComputedStyle(pageContainer) : null;
    const imgCS = img ? window.getComputedStyle(img) : null;
    
    return {
      modal: {
        display: modalCS ? modalCS.display : null,
        position: modalCS ? modalCS.position : null,
        width: modalCS ? modalCS.width : null,
        height: modalCS ? modalCS.height : null,
        background: modalCS ? modalCS.background : null,
        overflow: modalCS ? modalCS.overflow : null,
        zIndex: modalCS ? modalCS.zIndex : null,
        flexDirection: modalCS ? modalCS.flexDirection : null,
      },
      workspace: {
        display: workspaceCS ? workspaceCS.display : null,
        flexDirection: workspaceCS ? workspaceCS.flexDirection : null,
        alignItems: workspaceCS ? workspaceCS.alignItems : null,
        justifyContent: workspaceCS ? workspaceCS.justifyContent : null,
        overflowY: workspaceCS ? workspaceCS.overflowY : null,
        width: workspaceCS ? workspaceCS.width : null,
        padding: workspaceCS ? workspaceCS.padding : null,
      },
      pageContainer: {
        display: pcCS ? pcCS.display : null,
        width: pcCS ? pcCS.width : null,
        maxWidth: pcCS ? pcCS.maxWidth : null,
        margin: pcCS ? pcCS.margin : null,
        position: pcCS ? pcCS.position : null,
        offsetWidth: pageContainer ? pageContainer.offsetWidth : null,
      },
      img: {
        width: imgCS ? imgCS.width : null,
        maxWidth: imgCS ? imgCS.maxWidth : null,
        naturalWidth: img ? img.naturalWidth : null,
        offsetWidth: img ? img.offsetWidth : null,
      },
      wnCropAreaClass: wnCropArea ? wnCropArea.className : null,
      modalClass: modal ? modal.className : null,
      finishCroppingExists: typeof finishCropping === 'function',
    };
  });
  
  console.log('\n=== CROP MODAL ANALYSIS ===');
  console.log('Modal class:', state.wnCropAreaClass);
  console.log('Modal display:', state.modal.display, '| position:', state.modal.position);
  console.log('Modal width:', state.modal.width, '| height:', state.modal.height);
  console.log('Modal background:', state.modal.background);
  console.log('Modal overflow:', state.modal.overflow, '| flexDirection:', state.modal.flexDirection);
  console.log('');
  console.log('Workspace display:', state.workspace.display, '| flexDirection:', state.workspace.flexDirection);
  console.log('Workspace alignItems:', state.workspace.alignItems, '| justifyContent:', state.workspace.justifyContent);
  console.log('Workspace overflowY:', state.workspace.overflowY, '| width:', state.workspace.width);
  console.log('Workspace padding:', state.workspace.padding);
  console.log('');
  console.log('PageContainer width:', state.pageContainer.width, '| maxWidth:', state.pageContainer.maxWidth);
  console.log('PageContainer offsetWidth:', state.pageContainer.offsetWidth, '| margin:', state.pageContainer.margin);
  console.log('PageContainer display:', state.pageContainer.display);
  console.log('');
  console.log('Image width:', state.img.width, '| maxWidth:', state.img.maxWidth);
  console.log('Image naturalWidth:', state.img.naturalWidth, '| offsetWidth:', state.img.offsetWidth);
  console.log('finishCropping exists:', state.finishCroppingExists);
  
  // Check for console errors
  const errors = [];
  page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
  
  await browser.close();
})();
