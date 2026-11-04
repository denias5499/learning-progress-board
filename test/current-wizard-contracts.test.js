const test=require('node:test'),assert=require('node:assert/strict');
const {page}=require('./helpers/modern-app.cjs');
async function wizard(t){const w=await page(t,'index.html','http://localhost/');const unit=w.multiData.A.masters['會考']['數學'].materials['複習講義'].instances[0].vols['第一冊'][0];Object.assign(unit,{start:1,end:12});w._collectSubjectUnitsCache=new w.WeakMap();w.openWizard();w.document.getElementById('wz-cat').value='會考';w.wzUpdateMis();w.document.getElementById('wz-mis').value='一模';w.wzUpdateSubjects();return w;}
function inputs(w){for(const[k,v]of Object.entries({'wz-name':'隔離測試計畫','wz-startdate':'2026-11-01','wz-enddate':'2026-11-14'}))w.document.getElementById(k).value=v;for(let d=0;d<7;d++)w.document.getElementById('wz-hrs-'+d).value=2;const ws=w.wizardSubjects[0];ws.selectedUnitIds=['unitA'];ws.hoursPerUnit=3;ws.daysPerUnit=3;return ws;}
test('智慧排程契約：模式切換同步radio、科目設定、說明及重讀偏好',async t=>{
 const w=await wizard(t);inputs(w);
 for(const mode of ['units','hours','units']){w.setWizardScheduleMode(mode);assert.equal(w.document.querySelector('input[name="wz-schedule-mode"]:checked').value,mode);assert.ok(w.wizardSubjects.every(ws=>ws.scheduleMode===mode));assert.equal(w.loadWizardPrefs().scheduleMode,mode);assert.match(w.document.getElementById('wz-schedule-mode-desc').textContent,mode==='units'?/單元模式/:/時數模式/);}
});
test('智慧排程契約：舊偏好補齊模式與天數，不覆蓋已設定值',async t=>{
 const w=await wizard(t);w.localStorage.setItem(w.STORAGE_KEY_WIZARD_PREFS,JSON.stringify({subjects:{數學:{daysPerUnit:5},英文:{scheduleMode:'units',daysPerUnit:4}}}));const result=w.loadWizardPrefs();assert.equal(result.scheduleMode,'hours');assert.equal(result.subjects.數學.scheduleMode,'hours');assert.equal(result.subjects.數學.daysPerUnit,5);assert.equal(result.subjects.英文.scheduleMode,'units');assert.equal(result.subjects.英文.daysPerUnit,4);
});
test('智慧排程契約：單元預設展開、已排未排勾選與空清單警告保留原資料',async t=>{
 const w=await wizard(t),before=w.localStorage.getItem(w.STORAGE_KEY_FAMILY);inputs(w);const ws=w.wizardSubjects[0];assert.ok(ws.availableUnits.length>0);assert.ok(w.document.getElementById('wz-step2-container').textContent.includes('知識單元'));
 ws.availableUnits[0].misMaxEnd=0;w.selectUnscheduledUnits();assert.deepEqual(Array.from(ws.selectedUnitIds),['unitA']);w.selectScheduledUnits();assert.equal(ws.selectedUnitIds.length,0);
 ws.availableUnits=[];w.renderWizardSubjects();assert.match(w.document.getElementById('wz-step2-container').textContent,/找不到任何單元|清單都是空的/);assert.equal(w.localStorage.getItem(w.STORAGE_KEY_FAMILY),before);
});
for(const mode of ['hours','units'])test('智慧排程契約：'+mode+'模式產生完整頁碼與教材關聯，不寫入另一學生',async t=>{
 const w=await wizard(t),other=JSON.stringify(w.multiData.B),ws=inputs(w);w.setWizardScheduleMode(mode);const alerts=[];w.alert=m=>alerts.push(m);w.generatePlan();
 const saved=JSON.parse(w.localStorage.getItem(w.STORAGE_KEY_FAMILY)),plan=saved.A.plans[0];assert.ok(plan,alerts.join('\n'));const tasks=Object.entries(plan.grid).flatMap(([date,ts])=>ts.map(t=>({date,...t})));assert.ok(tasks.length>0);
 const pages=new Set();for(const task of tasks){assert.equal(task.unitId,'unitA');assert.equal(task.subject,'數學');assert.equal(task.cat,'會考');assert.equal(task.mis,'一模');assert.equal(task.typeName,'複習講義');assert.equal(task.instanceName,'講義A');assert.ok(task.startPage<=task.endPage);assert.ok(task.date>='2026-11-01'&&task.date<='2026-11-14');for(let p=task.startPage;p<=task.endPage;p++)pages.add(p);}
 assert.deepEqual([...pages].sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1));assert.equal(JSON.stringify(w.multiData.B),other);assert.equal(JSON.stringify(saved.B),other);assert.ok(!alerts.some(s=>s.includes('發生錯誤')));
 if(mode==='units')assert.equal(new Set(tasks.map(t=>t.date)).size,ws.daysPerUnit);
});
test('教材類型契約：已刪除的預設類型不重生，自建類型仍能選取',async t=>{
 const w=await wizard(t);w.multiData.A._deletedTypes={'會考':{'數學':['複習卷']}};w.aeSubjectType={};const host=w.document.createElement('div');host.innerHTML=w.renderAeSubjectCardHtml('數學',[{sub:'數學',u:{id:'unitA',name:'知識單元',start:1,end:12},id:'unitA',name:'知識單元',start:1,end:12,typeName:'複習講義',instanceName:'講義A',vol:'第一冊'},{sub:'數學',u:{id:'custom',name:'自建',start:1,end:1},id:'custom',name:'自建',start:1,end:1,typeName:'自訂試卷',instanceName:'教材乙',vol:''}],'會考','一模');
 const buttons=Array.from(host.querySelectorAll('[onclick*="setAeSubjectType"]'));assert.ok(buttons.length>0);assert.ok(!buttons.some(b=>b.getAttribute('onclick').includes("'複習卷'")));assert.ok(buttons.some(b=>b.textContent.includes('自訂試卷')));
});

test('智慧排程契約：頁數少於天數不產生空頁或重複頁碼',async t=>{const w=await wizard(t),ws=inputs(w);ws.availableUnits[0].uObj.end=2;w.setWizardScheduleMode('units');w.generatePlan();const plan=JSON.parse(w.localStorage.getItem(w.STORAGE_KEY_FAMILY)).A.plans[0],tasks=Object.values(plan.grid).flat();assert.equal(tasks.length,2);assert.deepEqual(tasks.map(t=>[t.startPage,t.endPage]),[[1,1],[2,2]]);});
test('智慧排程契約：單元模式保留原有其他任務及完成狀態',async t=>{const w=await wizard(t),ws=inputs(w);const old={id:'existing',subject:'數學',cat:'會考',mis:'另一任務',unitId:'old-unit',startPage:20,endPage:21,isDone:true,text:'原有已完成任務'};const plan={id:'old-plan',name:'已有計畫',start:'2026-11-01',end:'2026-11-14',grid:{'2026-11-01':[old]}};w.appPlans=w.multiData.A.plans=[plan];w.document.getElementById('planner-selector').innerHTML='<option value="old-plan">原計畫</option>';w.familyStorageWrite(JSON.stringify(w.multiData));w.setWizardScheduleMode('units');w.generatePlan();const saved=JSON.parse(w.localStorage.getItem(w.STORAGE_KEY_FAMILY));assert.deepEqual(saved.A.plans[0].grid['2026-11-01'].find(t=>t.id==='existing'),old);});
test('智慧排程契約：日期不足時明確拒絕部分排程，不遺失頁碼或改寫原計畫',async t=>{const w=await wizard(t);inputs(w);w.document.getElementById('wz-enddate').value='2026-11-02';w.setWizardScheduleMode('units');const before=w.localStorage.getItem(w.STORAGE_KEY_FAMILY),memory=JSON.stringify(w.multiData);let warnings=[];w.showUnitWarningsModal=rows=>warnings=Array.from(rows);w.generatePlan();assert.equal(w.localStorage.getItem(w.STORAGE_KEY_FAMILY),before);assert.equal(JSON.stringify(w.multiData),memory);assert.ok(warnings.some(v=>v.includes('尚未儲存')));});

test('智慧排程契約：單元模式建立後可直接選取並顯示新計畫，不必重整',async t=>{const w=await wizard(t);inputs(w);w.setWizardScheduleMode('units');let renders=0;const render=w.renderCalendar;w.renderCalendar=()=>{renders++;render();};w.generatePlan();const plan=w.multiData.A.plans[0];assert.ok(Array.from(w.document.getElementById('planner-selector').options).some(o=>o.value===plan.id));assert.ok(renders>0);});
test('智慧排程契約：自動修正不再因每單元時數較少而縮短設定天數',async t=>{const w=await wizard(t),ws=inputs(w);ws.hoursPerUnit=1;w.setWizardScheduleMode('units');let suggested=0;w.showAutoFixConfirmModal=()=>suggested++;w.autoFixAndReplan();assert.equal(suggested,0);assert.equal(ws.daysPerUnit,3);});

test('智慧排程契約：同設定重跑不重複加入同日同教材同頁碼進度',async t=>{const w=await wizard(t);inputs(w);w.setWizardScheduleMode('units');w.generatePlan();const first=w.multiData.A.plans[0],ids=Object.values(first.grid).flat().map(t=>t.id);w.document.getElementById('planner-selector').value=first.id;w.generatePlan();assert.deepEqual(Object.values(w.multiData.A.plans[0].grid).flat().map(t=>t.id),ids);});
