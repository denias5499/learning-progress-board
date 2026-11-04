/* Isolated browser QA: synthetic storage in a disposable context; no personal browser profile. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{let name=decodeURIComponent(req.url.split('?')[0]);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'not found':data);});});
let browser;
(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1100,height:850}});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await page.addInitScript(()=>{window.pdfjsLib={GlobalWorkerOptions:{}};window.alert=()=>{};window.confirm=()=>true;if(!localStorage.getItem('StudyMap_Family_Data_V20')){localStorage.setItem('StudyMap_Family_Data_V20',JSON.stringify({A:{name:'隔離測試甲',masters:{會考:{數學:{materials:{複習講義:{instances:[{id:'book',name:'測試講義',vols:{第一冊:[{id:'unit',name:'測試單元',start:1,end:12}]}}]}}}}},missions:{會考:{一模:['unit']}},plans:[],logs:[],_v144Empty:true}}));localStorage.setItem('StudyMap_CurrentUserId_V20','A');}});
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>openWizard());
 const cards=page.locator('#wz-mode-hours-card,#wz-mode-units-card');for(let i=0;i<2;i++){const card=cards.nth(i),radio=card.locator('input'),label=card.locator('span').last();const a=await radio.boundingBox(),b=await label.boundingBox();assert(a&&b);assert(Math.abs(a.y+a.height/2-b.y-b.height/2)<5,'radio and mode label align');}
 await page.locator('#wz-mode-units-card').click();assert.equal(await page.evaluate(()=>loadWizardPrefs().scheduleMode),'units');
 console.log('PASS: actual mode-card layout and saved radio selection');
 await page.evaluate(()=>{closeModal('modal-wizard');openWrongNotes();});const frame=page.frameLocator('#page-wrongnotes iframe');await frame.locator('#nav-import').waitFor();
 for(const [button,id]of [['nav-view','view-page'],['nav-data','data-page'],['nav-practice','practice-page'],['nav-import','import-page']]){await frame.locator('#'+button).click();assert(await frame.locator('#'+id).evaluate(e=>e.classList.contains('active')));}
 console.log('PASS: actual same-origin embedded app and four-tab navigation');
 const embedded=page.frames().find(f=>f.url().includes('/wrong-notes/'));assert(embedded);
 await embedded.evaluate(()=>{const spacer=document.createElement('div');spacer.id='isolated-scroll-fixture';spacer.style.height='2000px';document.body.appendChild(spacer);window.scrollTo(0,500)});await page.waitForTimeout(50);const navRect=await embedded.locator('.top-navbar').boundingBox(),frameRect=await page.locator('#page-wrongnotes iframe').boundingBox();assert(Math.abs(navRect.y-frameRect.y)<3,'navigation remains at frame top while content scrolls');await embedded.evaluate(()=>{document.getElementById('isolated-scroll-fixture').remove();window.scrollTo(0,0)});
 console.log('PASS: actual embedded navigation remains accessible while scrolling');
 // Exercise the deployed uploader with an actual decodable PNG, not a stubbed image loader.
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=800;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1000,800);x.fillStyle='black';x.font='24px sans-serif';x.fillText('isolated crop fixture',80,100);return c.toDataURL('image/png').split(',')[1]});
 await frame.locator('#source-image-photos').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await frame.locator('.page-container img').waitFor();
 const app=page.frames().find(f=>f.url().includes('/wrong-notes/'));assert(app);
 await app.locator('button[onclick="startManualBox()"]').click();const img=app.locator('.page-container img');const imageRect=await img.boundingBox();assert(imageRect.width>0);assert(imageRect.x>=0&&imageRect.x+imageRect.width<=1101,'image fits viewport');await page.mouse.click(imageRect.x+100,imageRect.y+80);const box=app.locator('.mock-crop-box');await box.waitFor();
 assert.equal(await box.count(),1);const original=await box.boundingBox();assert(Math.abs(original.x-imageRect.x-100)<3);assert(Math.abs(original.y-imageRect.y-80)<3);
 for(const corner of ['br']){await box.evaluate(el=>Object.assign(el.style,{left:'100px',top:'80px',width:'300px',height:'180px'}));const initial=await box.boundingBox(),h=await box.locator('.'+corner).boundingBox();await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+20,h.y+h.height/2+10,{steps:4});await page.mouse.up();const after=await box.boundingBox();assert(Math.abs(after.width-(initial.width+(corner.endsWith('r')?20:-20)))<3,corner+' width');assert(Math.abs(after.height-(initial.height+(corner.startsWith('b')?10:-10)))<3,corner+' height');}
 console.log('PASS: real image placement, visible bottom-right resize handle and pointer geometry');
 await box.locator('.add-crop-btn').click();assert.equal(await app.locator('.file-card').count(),1);const data=await app.locator('.file-card img').getAttribute('src');assert(data.startsWith('data:image/jpeg;base64,'));await app.locator('button[onclick="finishCropping()"]').click();assert.equal(await app.locator('#crop-modal').isVisible(),false);
 await app.locator('#nav-view').click();await app.locator('#nav-import').click();assert.equal(await app.locator('.file-card').count(),1);
 console.log('PASS: real canvas crop, one settings card and round-trip import navigation');
 const cropSize=await app.locator('.file-card img').evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight]});
 await app.locator('.file-card .subj-sel').selectOption('數學');await app.locator('.file-card .unit-sel').selectOption({index:1});await app.locator('.file-card .note-task').selectOption({index:1});await app.locator('.generate-btn').click();await app.evaluate(()=>saveNotes());
 const persistedSize=await app.evaluate(async()=>{const note=StudyRecords.list('notes',requireNoteStudent())[0];const url=await _wnGetImage(note.imageId);const img=await createImageBitmap(await (await fetch(url)).blob());return [img.width,img.height]});assert.deepEqual(persistedSize,cropSize,'stored image must be the selected crop, not the original full exam');
 console.log('PASS: selected crop persists and reads back with identical pixel dimensions');

 assert.deepEqual(errors,[],'no uncaught browser errors');
 await context.close();
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();await new Promise(ok=>server.close(ok));});
