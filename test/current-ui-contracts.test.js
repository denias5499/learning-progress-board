const test=require('node:test'),assert=require('node:assert/strict');
const {page,family}=require('./helpers/modern-app.cjs');
test('錯題外框契約：使用同源嵌入頁、填滿容器且重複開啟不重複導覽',async t=>{
 const w=await page(t,'index.html','http://localhost/'),before=w.localStorage.getItem(w.STORAGE_KEY_FAMILY);
 w.openWrongNotes();w.openWrongNotes();const frame=w.document.querySelector('#page-wrongnotes iframe');
 assert.equal(new URL(frame.src).origin,w.location.origin);assert.match(new URL(frame.src).pathname,/\/wrong-notes\/$/);
 assert.equal(frame.style.width,'100%');assert.equal(frame.style.display,'block');assert.equal(w.document.querySelectorAll('#page-wrongnotes iframe').length,1);
 assert.equal(w.localStorage.getItem(w.STORAGE_KEY_FAMILY),before);
});
test('錯題導覽契約：四個頁籤切換只有一頁啟用，未完成的分析與再練保留建置提示',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/');
 for(const [button,id]of [['nav-import','import-page'],['nav-view','view-page'],['nav-data','data-page'],['nav-practice','practice-page']]){
  const btn=w.document.getElementById(button);btn.onclick=w.Function(btn.getAttribute('onclick'));btn.click();
  assert.equal(w.document.querySelectorAll('.page.active').length,1);assert.equal(w.document.querySelector('.page.active').id,id);
 }
 for(const id of ['data-page','practice-page'])assert.match(w.document.getElementById(id).textContent,/建置中/);
});
test('錯題上傳契約：兩個檔案入口與滑放使用同一匯入流程，不重複綁定事件',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/'),seen=[];w.handleFilesForCrop=files=>seen.push(Array.from(files).map(f=>f.name));
 const file=new w.File(['x'],'test.png',{type:'image/png'});
 for(const id of ['source-image-photos','source-image-exam']){const el=w.document.getElementById(id);assert.equal(el.multiple,true);assert.match(el.accept,/image/);if(id==='source-image-exam')assert.match(el.accept,/pdf/);Object.defineProperty(el,'files',{value:[file]});el.onchange=w.Function(el.getAttribute('onchange'));el.dispatchEvent(new w.Event('change'));}
 for(let n=0;n<3;n++){w.goToPage('import-page',w.document.getElementById('nav-import'));w.setupDragAndDrop();}
 const event=new w.Event('drop',{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:{files:[file]}});w.document.getElementById('zone-photos').dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.equal(seen.length,3);for(const names of seen)assert.deepEqual(names,['test.png']);
});
test('錯題原因契約：四個常見原因、其他自填與科目單元選擇可操作',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/'),card=w.createSettingCard('data:image/png;base64,AQID',0,1,'crop');w.document.getElementById('cards-slider').appendChild(card);
 assert.deepEqual(Array.from(card.querySelectorAll('.reasons-group input')).map(i=>i.value),['粗心','觀念不清','計算錯誤','跨科/時事','其他']);
 const other=card.querySelector('input[value="其他"]');other.checked=true;w.toggleCustomReason(other);assert.equal(w.getComputedStyle(card.querySelector('.custom-reason')).display!=='none',true);
 const subject=card.querySelector('.subj-sel');assert.ok(Array.from(subject.options).some(o=>o.value==='數學'));
 subject.value='數學';w.handleCardSubjectChange(subject);assert.equal(card.querySelector('.note-category').selectedOptions[0].textContent,'會考');assert.equal(card.querySelector('.note-book').value,'bookA');assert.ok(Array.from(card.querySelector('.unit-sel').options).some(o=>o.textContent.includes('知識單元')));assert.ok(Array.from(card.querySelector('.note-task').options).some(o=>o.textContent==='一模'));
});
test('儲存介面契約：成功顯示確認視窗且不關閉不相關對話框，extract失敗不存檔',async t=>{
 const w=await page(t,'index.html','http://localhost/');w.extractCurrentEditorData=()=>{};let calls=0;w.saveToLocal=()=>{calls++;return true;};
 const other=w.document.createElement('div');other.className='modal-bg';other.style.display='flex';w.document.body.appendChild(other);
 await w.saveSettingsAndAlert();assert.equal(w.document.querySelector('#modal-save-confirm').style.display,'flex');assert.equal(other.style.display,'flex');assert.equal(calls,1);
 w.document.querySelector('#modal-save-confirm').remove();w.document.getElementById('pane-master').classList.add('active');w.extractCurrentEditorData=()=>{throw Error('extract failed')};const alerts=[];w.alert=m=>alerts.push(m);
 await w.saveSettingsAndAlert();assert.equal(calls,1);assert.equal(w.document.querySelector('#modal-save-confirm'),null);assert.ok(alerts.some(m=>m.includes('extract failed')));
});

test('錯題存檔契約：容量不足不刪舊筆記，保留草稿且不誤報成功',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/'),card=w.createSettingCard('data:image/png;base64,YWJj',0,'new','crop'),alerts=[];w.alert=m=>alerts.push(m);w.document.querySelector('#cards-slider').appendChild(card);card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));card.querySelector('.unit-sel').selectedIndex=1;card.querySelector('.note-task').selectedIndex=1;w.generateNote();w._wnSaveImage=async()=> 'test-image';
 const before=w.localStorage.getItem('myStudyNotes'),proto=Object.getPrototypeOf(w.localStorage),write=proto.setItem;proto.setItem=function(k,v){if(k==='myStudyNotes')throw Error('quota exceeded');return write.call(this,k,v)};
 try{await w.saveNotes();}finally{proto.setItem=write;}
 assert.equal(w.localStorage.getItem('myStudyNotes'),before);assert.equal(w.document.querySelectorAll('.editable-slot').length,1);assert.ok(alerts.some(a=>a.includes('儲存失敗')));assert.ok(!alerts.some(a=>a.includes('成功儲存')));
});
test('錯題存檔契約：寫入成功但頁面重設失敗，筆記仍可讀回並保留ID',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/'),card=w.createSettingCard('data:image/png;base64,YWJj',0,'new','crop');w.document.querySelector('#cards-slider').appendChild(card);card.querySelector('.subj-sel').value='數學';w.handleCardSubjectChange(card.querySelector('.subj-sel'));card.querySelector('.unit-sel').selectedIndex=1;card.querySelector('.note-task').selectedIndex=1;w.generateNote();w._wnSaveImage=async()=> 'test-image';w.syncImportView=()=>{throw Error('UI reset failure')};let asked=0;w.confirm=()=>{asked++;return false;};await w.saveNotes();const saved=w.StudyRecords.list('notes','A').find(n=>n.imageId==='test-image');assert.ok(saved);assert.equal(saved.syllabus.unitId,'unitA');assert.ok(saved.task.missionId);assert.equal(asked,1);
});

test('嵌入頁啟動契約：篩選欄位尚未建立時收到storage事件不拋錯，初始化後仍能更新',async t=>{
 const w=await page(t,'wrong-notes/index.html','http://localhost/wrong-notes/'),source=w.document.getElementById('filter-source'),exam=w.document.getElementById('filter-exam'),parent=source.parentElement,errors=[];w.addEventListener('error',e=>{errors.push(e.message);e.preventDefault()});source.remove();exam.remove();w.dispatchEvent(new w.StorageEvent('storage',{key:'StudyMap_Family_Data_V20'}));assert.deepEqual(errors,[]);parent.append(source,exam);w.updateNoteViewFilters();assert.ok(Array.from(source.options).some(o=>o.textContent==='115模考'));assert.deepEqual(errors,[]);
});
