const test=require('node:test'),assert=require('node:assert/strict');
const {page}=require('./helpers/modern-app.cjs');
async function cropPage(t){const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/');w.HTMLElement.prototype.scrollIntoView=function(){};return w;}
function geometry(el,values){for(const[k,v]of Object.entries(values)){Object.defineProperty(el,k,{configurable:true,get:()=>v});const prop={offsetLeft:'left',offsetTop:'top',offsetWidth:'width',offsetHeight:'height'}[k];if(prop)el.style[prop]=v+'px';}}
function newBox(w){const c=w.document.createElement('div');c.className='page-container';c.getBoundingClientRect=()=>({width:1000,height:800});w.document.querySelector('#crop-workspace').appendChild(c);w.createNewManualBox(100,80,c);return c.querySelector('.mock-crop-box');}
test('裁切契約：新增框線按指定位置建立唯一框，座標隨圖片縮放且不是舊版固定像素',async t=>{
 const w=await cropPage(t),box=newBox(w);assert.equal(box.style.left,'10%');assert.equal(box.style.top,'10%');assert.equal(box.style.width,'45%');assert.equal(box.style.height,'15%');assert.ok(box.dataset.cropId);
 assert.equal(box.querySelectorAll('.resize-handle').length,4);assert.equal(w.getComputedStyle(box).position,'absolute');
 const c=box.parentElement;w.createNewManualBox(200,160,c);assert.notEqual(c.children[0].dataset.cropId,c.children[1].dataset.cropId);
});
test('裁切契約：右下角調整尺寸，放開滑鼠停止調整',async t=>{
 const handle='br',expected=[100,80,220,130];
 const w=await cropPage(t),box=newBox(w);geometry(box,{offsetLeft:100,offsetTop:80,offsetWidth:200,offsetHeight:120});box.querySelector('.'+handle).dispatchEvent(new w.MouseEvent('mousedown',{clientX:100,clientY:100,bubbles:true}));w.document.dispatchEvent(new w.MouseEvent('mousemove',{clientX:120,clientY:110}));
 assert.deepEqual([parseFloat(box.style.left),parseFloat(box.style.top),parseFloat(box.style.width),parseFloat(box.style.height)],expected);
 const snapshot=box.getAttribute('style');w.document.dispatchEvent(new w.MouseEvent('mouseup'));w.document.dispatchEvent(new w.MouseEvent('mousemove',{clientX:140,clientY:140}));assert.equal(box.getAttribute('style'),snapshot);
});
test('裁切契約：拖曳框線移動，按鈕不會意外啟動拖曳',async t=>{
 const w=await cropPage(t),box=newBox(w);geometry(box,{offsetLeft:100,offsetTop:80,offsetWidth:200,offsetHeight:120});box.dispatchEvent(new w.MouseEvent('mousedown',{clientX:100,clientY:100,bubbles:true}));w.document.dispatchEvent(new w.MouseEvent('mousemove',{clientX:120,clientY:110}));assert.equal(box.style.left,'120px');assert.equal(box.style.top,'90px');w.document.dispatchEvent(new w.MouseEvent('mouseup'));
 box.querySelector('.add-crop-btn').dispatchEvent(new w.MouseEvent('mousedown',{clientX:100,clientY:100,bubbles:true}));w.document.dispatchEvent(new w.MouseEvent('mousemove',{clientX:300,clientY:300}));assert.equal(box.style.left,'120px');
});
test('裁切契約：顯示座標轉回原圖像素後只擷取選中區域，重點選不增加同框卡片',async t=>{
 const w=await cropPage(t),box=newBox(w),c=box.parentElement,img=w.document.createElement('img');c.prepend(img);geometry(img,{naturalWidth:2000,naturalHeight:1600,offsetWidth:1000,offsetHeight:800});geometry(box,{offsetLeft:100,offsetTop:80,offsetWidth:200,offsetHeight:120});const draws=[];
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage:(...args)=>draws.push(args.slice(1))});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,AQID';
 const button=box.querySelector('.add-crop-btn');w.toggleCroppedQuestion(button,1);assert.deepEqual(draws[0],[200,160,400,240,0,0,400,240]);assert.equal(w.document.querySelectorAll('.file-card').length,1);
 w.toggleCroppedQuestion(button,1);assert.equal(w.document.querySelectorAll('.file-card').length,0);w.toggleCroppedQuestion(button,1);assert.equal(w.document.querySelectorAll('.file-card').length,1);
});
test('裁切契約：Undo與刪除已選框同步移除設定卡，其他框不受影響',async t=>{
 const w=await cropPage(t),first=newBox(w),second=newBox(w);const card=w.document.createElement('div');card.className='file-card';card.dataset.cropId=second.dataset.cropId;card.innerHTML='<button class="delete-card-btn"></button>';w.document.querySelector('#cards-slider').appendChild(card);second.querySelector('.add-crop-btn').classList.add('selected');
 w.undoManualBox();assert.equal(second.isConnected,false);assert.equal(card.isConnected,false);assert.equal(first.isConnected,true);
 w.deleteBox(first.querySelector('.delete-box-btn'));assert.equal(first.isConnected,false);
});
test('裁切契約：完成前要求已選題目，取消後恢復匯入且不寫入筆記',async t=>{
 const w=await cropPage(t),alerts=[];w.alert=m=>alerts.push(m);const modal=w.document.getElementById('crop-modal');modal.style.display='flex';const before=w.localStorage.getItem('myStudyNotes');w.finishCropping();assert.equal(modal.style.display,'flex');assert.ok(alerts.some(m=>m.includes('尚未完成錯題選擇')));
 w.cancelCropping();assert.equal(modal.style.display,'none');assert.equal(w.document.getElementById('import-step1').style.display,'block');assert.equal(w.localStorage.getItem('myStudyNotes'),before);
});
test('裁切版面契約：圖片與框線共用定位容器，取消及完成按鈕可見且有明確文字',async t=>{
 const w=await cropPage(t),box=newBox(w);assert.equal(w.getComputedStyle(box.parentElement).position,'relative');
 const modal=w.document.getElementById('crop-modal');modal.style.display='flex';for(const text of ['取消選取','完成選取']){const button=Array.from(modal.querySelectorAll('button')).find(b=>b.textContent===text);assert.ok(button);assert.notEqual(w.getComputedStyle(button).display,'none');}
 const c=w.document.createElement('div'),img=w.document.createElement('img');w.createPageContainer(img,c);w.startManualBox();const event=new w.MouseEvent('mousedown',{bubbles:true,cancelable:true});img.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(c.querySelectorAll('.mock-crop-box').length,1);
});

test('裁切控制契約：維持只提供右下角，其他三角隱藏不列為可操作功能',async t=>{const w=await cropPage(t),box=newBox(w);for(const c of ['tl','tr','bl'])assert.equal(w.getComputedStyle(box.querySelector('.'+c)).display,'none');assert.notEqual(w.getComputedStyle(box.querySelector('.br')).display,'none');});
