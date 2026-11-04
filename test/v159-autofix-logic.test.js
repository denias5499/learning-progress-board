// v178: confirmed rule replaces hour-derived auto-shortening; execute the actual scheduler.
const test=require('node:test'),assert=require('node:assert/strict');
const {makeWizard}=require('./helpers/wizard-fixture.cjs');
for(const [name,hours,pages,days,quick]of [
 ['低時數仍依三天排程',0.5,12,3,false],
 ['較高時數不增加設定天數',3,12,3,false],
 ['零時數使用既有預設但不縮短天數',0,12,3,false],
 ['快讀折扣不改變讀書天數',3,12,3,true],
 ['頁數少於天數時每頁只排一次',3,2,3,false]
])test('單元天數新規則：'+name,async t=>{
 const {w,ws}=await makeWizard(t);ws.hoursPerUnit=hours;ws.daysPerUnit=days;ws.availableUnits[0].uObj.end=pages;ws.availableUnits[0].quickRead=quick;w.setWizardScheduleMode('units');w.generatePlan();const saved=JSON.parse(w.localStorage.getItem(w.STORAGE_KEY_FAMILY)),tasks=Object.values(saved.A.plans[0].grid).flat();assert.equal(new Set(Object.keys(saved.A.plans[0].grid)).size,Math.min(pages,days));assert.equal(tasks.length,Math.min(pages,days));const read=[];for(const task of tasks)for(let p=task.startPage;p<=task.endPage;p++)read.push(p);assert.deepEqual(read,Array.from({length:pages},(_,i)=>i+1));assert.equal(ws.daysPerUnit,days);
});
test('自動修正新規則：回到精靈關閉警告而保留科目與天數',async t=>{const{w,ws}=await makeWizard(t),before=JSON.stringify(ws);w.openModal('modal-unit-warnings');w.backToWizardFromWarnings();assert.equal(w.document.getElementById('modal-unit-warnings').style.display,'none');assert.equal(w.document.getElementById('modal-wizard').style.display,'flex');assert.equal(JSON.stringify(ws),before);});
test('自動修正新規則：時數模式的天數欄位不被建議按鈕改寫',async t=>{const{w,ws}=await makeWizard(t);ws.daysPerUnit=9;w.setWizardScheduleMode('hours');const before=JSON.stringify(w.multiData);w.autoFixAndReplan();assert.equal(ws.daysPerUnit,9);assert.equal(JSON.stringify(w.multiData),before);});
test('自動修正新規則：建議只提示調整日期，不擅自存檔或產生排程',async t=>{const{w,ws}=await makeWizard(t),before=w.localStorage.getItem(w.STORAGE_KEY_FAMILY),alerts=[];w.alert=m=>alerts.push(m);w.autoFixAndReplan();assert.equal(w.localStorage.getItem(w.STORAGE_KEY_FAMILY),before);assert.equal(w.appPlans.length,0);assert.equal(ws.daysPerUnit,3);assert.ok(alerts.some(a=>a.includes('延長日期範圍')));});
test('自動修正新規則：讀回偏好保留天數與已選單元',async t=>{const{w,ws}=await makeWizard(t);w.setWizardScheduleMode('units');w.autoFixAndReplan();const prefs=w.loadWizardPrefs();assert.equal(prefs.subjects.數學.daysPerUnit,3);assert.deepEqual(Array.from(prefs.subjects.數學.selectedUnitIds),['unitA']);assert.equal(prefs.scheduleMode,'units');});
test('自動修正新規則：精靈尚未初始化時提示重新開啟而不拋錯',async t=>{const{w}=await makeWizard(t),alerts=[];w.alert=m=>alerts.push(m);w.wizardSubjects=undefined;assert.doesNotThrow(()=>w.autoFixAndReplan());assert.ok(alerts.some(a=>a.includes('重新開啟')));});
