/* v168: one read-only calendar projection shared by screen and both print layouts. */
(function (root) {
'use strict';
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function resolvePlan(plans, id) { return (plans || []).find(p => p.id === id) || (plans || [])[Math.max(0,(plans || []).length-1)] || {grid:{},events:[]}; }
function filterTasks(tasks, cat, mis, ids, subjects, master) {
 return (Array.isArray(tasks) ? tasks : []).filter(t => {
  if (!cat || cat === 'ALL') return true;
  if (t.unitId) return ids.has(t.unitId);
  if (t.cat) return t.cat === cat && (!mis || mis === 'ALL' || t.mis === mis);
  if (!master[t.subject]) return true;
  return subjects.has(t.subject);
 }).sort((a,b)=>{const order=['國文','數學','英文','歷史','地理','公民','理化','生物'];const ai=order.indexOf(a.subject),bi=order.indexOf(b.subject);return (ai<0?999:ai)-(bi<0?999:bi) || String(a.subject || '').localeCompare(String(b.subject || ''));});
}
function project(plan, start, end, cat, mis, ids, subjects, master) {
 const dates=[], grid={}, events={};
 for(let day=new Date(start);day<=end;day.setDate(day.getDate()+1)) {
  const date=ymd(day);dates.push(date);
  grid[date]=filterTasks((plan.grid || {})[date],cat,mis,ids,subjects,master);
  events[date]=(plan.events || []).filter(e=>e.date===date);
 }
 return {dates,grid,events};
}
function scope(cat,mis) {
 const ids=new Set(),subjects=new Set();
 if(cat && cat!=='ALL' && appMissions[cat]) {
  const missions=mis && mis!=='ALL' && appMissions[cat][mis] ? [mis] : Object.keys(appMissions[cat]);
  missions.forEach(m=>{(appMissions[cat][m] || []).forEach(id=>ids.add(id));Object.keys(buildMissionTree(cat,m)).forEach(s=>subjects.add(s));});
 }
 return {ids,subjects};
}
const defaultTypeAliases=Object.freeze({'複習講義':'複講','複習卷':'複卷','模擬題本':'模本','數字題本':'數本','模考歷屆':'歷屆'});
function typeAlias(type,obj){
 // An explicitly saved empty alias means the user chose the full name.
 if(obj && typeof obj.alias==='string')return obj.alias.trim() || type;
 return defaultTypeAliases[type] || type;
}
function taskInfo(t) {
 let ctx=null;
 try {ctx=t.unitId ? findUnitContext(t.unitId) : null;}catch(_){}
 // Only use catalog names when the context agrees with the task's saved path.
 if(ctx && ((t.subject && ctx.sub!==t.subject) || (t.cat && ctx.cat && ctx.cat!==t.cat)))ctx=null;
 const type=t.typeName || (ctx && ctx.typeName) || '';
 const name=t.instanceName || (ctx && ctx.instance && ctx.instance.name) || '';
 let typeObj=ctx && ctx.typeName===type ? ctx.typeObj : null;
 let instance=ctx && ctx.instance && ctx.instance.name===name ? ctx.instance : null;
 const matches=[];
 const masters=multiData[currentUserId] && multiData[currentUserId].masters || {};
 Object.keys(masters).filter(cat=>!t.cat || cat===t.cat).forEach(cat=>{
  const ob=masters[cat] && masters[cat][t.subject] && masters[cat][t.subject].materials && masters[cat][t.subject].materials[type];
  if(ob)(ob.instances || []).filter(i=>i.name===name).forEach(i=>matches.push({ob,i}));
 });
 if(matches.length===1){typeObj=matches[0].ob;instance=matches[0].i;}
 let ranges=Array.isArray(t.crossUnitRanges) ? t.crossUnitRanges : [];
 try {if(!ranges.length && typeof getCrossUnitRanges==='function')ranges=getCrossUnitRanges(t) || [];}catch(_){}
 const unit=ranges.length ? ranges.map(r=>(r.name || '')+' P.'+r.start+(r.end!==r.start?'~'+r.end:'')).join('；') : (t.unitName || (ctx && ctx.unit && ctx.unit.name) || '');
 const a=t.startPage,b=t.endPage;
 const pages=a!=null ? 'P.'+a+(b!=null && b!==a ? '~'+b : '') : '';
 const fallback=String(t.text || '').replace(/^\[[^\]]*\]\s*/, '');
 return {subject:t.subject || '其他',type:typeAlias(type,typeObj),book:instance && instance.alias || name,unit:unit || fallback,pages:ranges.length?'':pages,vol:t.vol || (ctx && ctx.vol) || '',done:!!t.isDone};
}
let draft=null;
function prefs() {
 const u=multiData[currentUserId] || {};
 const saved=u.printPreferences || {};
 const period=saved.paginationPreferenceVersion===1&&['week','fortnight','three','auto'].includes(saved.period)?saved.period:'auto';
 return Object.assign({layout:u.name==='張裕如'?'matrix':'calendar',status:true,title:true,firstOnly:true},saved,{period,unit:true,pages:true});
}
function addControls() {
 if(document.getElementById('print-layout'))return;
 const box=document.createElement('div');box.className='print-options';
 box.innerHTML='<label>列印版型<select id="print-layout"><option value="calendar">月曆表（依日期排列）</option><option value="matrix">科目／教材 × 日期</option></select></label><label>每頁範圍<select id="print-period"><option value="auto">自動適配（完整週，預設）</option><option value="week">一週</option><option value="fortnight">最多兩週</option><option value="three">最多三週</option></select></label><fieldset><legend>列印內容</legend><label><input type="checkbox" id="print-show-title">標題</label><label class="print-title-child"><input type="checkbox" id="print-title-first">僅首頁列印</label><label><input type="checkbox" id="print-show-status">完成核取方塊</label></fieldset><p>設定會依學生分開記住；自動適配會依內容與四邊 1.27 公分安全區域計算，各頁可容納不同週數，放不下就整週換頁。</p>';
 const range=document.getElementById('print-range-display');range.after(box);
 document.getElementById('print-show-title').addEventListener('change',syncTitleControl);
 document.getElementById('print-modal-cat-filter').addEventListener('change',syncRange);
 document.getElementById('print-modal-mis-filter').addEventListener('change',syncRange);
}
function syncTitleControl(){document.getElementById('print-title-first').disabled=!document.getElementById('print-show-title').checked;}
function getSnapshot(cat,mis,start,end) {
 const s=scope(cat,mis);
 return project(draft.plan,start,end,cat,mis,s.ids,s.subjects,appMaster);
}
function open() {
 addControls();
 const plan=resolvePlan(appPlans,document.getElementById('planner-selector').value);
 draft={userId:currentUserId,plan:JSON.parse(JSON.stringify(plan)),name:(multiData[currentUserId] || {}).name || ''};
 printSelMonth=new Date(currentViewDate.getFullYear(),currentViewDate.getMonth(),1);
 printSelStart=new Date(printSelMonth);printSelEnd=new Date(printSelMonth.getFullYear(),printSelMonth.getMonth()+1,0);
 const cat=document.getElementById('planner-cat-filter').value || 'ALL';
 const mis=document.getElementById('planner-mis-filter').value || 'ALL';
 const c=document.getElementById('print-modal-cat-filter');
 c.innerHTML='<option value="ALL">全部</option>'+Object.keys(appMissions).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 c.value=cat;onPrintModalCatChange();document.getElementById('print-modal-mis-filter').value=mis;
 const p=prefs();document.getElementById('print-layout').value=p.layout;document.getElementById('print-period').value=p.period;
 document.getElementById('print-show-status').checked=!!p.status;document.getElementById('print-show-title').checked=p.title!==false;document.getElementById('print-title-first').checked=p.firstOnly!==false;syncTitleControl();
 renderPrintCalendar();syncRange();openModal('modal-print-settings');
}
function syncRange() {
 if(!draft || !printSelStart || !printSelEnd)return;
 const s=getSnapshot(document.getElementById('print-modal-cat-filter').value,document.getElementById('print-modal-mis-filter').value,printSelStart,printSelEnd);
 let count=0;s.dates.forEach(d=>count+=s.grid[d].length);
 const out=document.getElementById('print-range-display');out.textContent=ymd(printSelStart)+' ~ '+ymd(printSelEnd)+' · '+s.dates.length+' 天 · '+count+' 筆進度';
}
function check(info,options) { return options.status ? '<span class="cp-check'+(info.done?' is-checked':'')+'" role="img" aria-label="'+(info.done?'已完成':'未完成')+'">'+(info.done?'✓':'')+'</span>' : ''; }
function content(info,options,calendar) {
 const title=calendar ? '<div class="cp-path">'+[info.subject,info.type,info.book].filter(Boolean).map(esc).join(' / ')+'</div>' : '';
 return '<div class="cp-task">'+check(info,options)+'<div>'+title+('<span>'+esc(info.unit)+'</span>')+(info.pages ? ' <span class="cp-pages">'+esc(info.pages)+'</span>':'')+'</div></div>';
}
function render(snapshot, options, name, cat, mis) {
 const per=options.period==='fortnight'?14:7;let html='';
 for(let offset=0;offset<snapshot.dates.length;offset+=per){
  const period=snapshot.dates.slice(offset,offset+per);
  html+='<section class="cp-page">'+(options.title!==false && (offset===0 || options.firstOnly===false)?'<h1>學習進度計畫表</h1>':'');
  for(let wi=0;wi<period.length;wi+=7){
   const dates=period.slice(wi,wi+7);
   const head=dates.map(d=>'<th scope="col">'+esc(d.slice(5).replace('-','/'))+' '+['日','一','二','三','四','五','六'][new Date(d+'T12:00:00').getDay()]+'</th>').join('');
   html+='<div class="cp-week"><table class="cp-table '+(options.layout==='matrix'?'cp-matrix':'cp-calendar')+'"><thead><tr>'+(options.layout==='matrix'?'<th scope="col" class="cp-subject">科目</th><th scope="col" class="cp-book">教材</th>':'')+head+'</tr></thead><tbody>';
   if(options.layout==='matrix') {
    const subjects=new Map();
    dates.forEach(d=>snapshot.grid[d].forEach(t=>{const i=taskInfo(t);if(!subjects.has(i.subject))subjects.set(i.subject,new Map());const books=subjects.get(i.subject);const k=JSON.stringify([t.typeName || i.type,t.instanceName || i.book]);if(!books.has(k))books.set(k,{info:i,days:{}});const b=books.get(k);(b.days[d] || (b.days[d]=[])).push(i);}));
    subjects.forEach((books,subject)=>{let first=true;books.forEach(b=>{html+='<tr>'+(first?'<th scope="rowgroup" rowspan="'+books.size+'">'+esc(subject)+'</th>':'')+'<th scope="row">'+esc(b.info.book || b.info.type || '未分類')+(b.info.book && b.info.type?'<small>'+esc(b.info.type)+'</small>':'')+'</th>'+dates.map(d=>'<td>'+(b.days[d] || []).map(i=>content(i,options,false)).join('')+'</td>').join('')+'</tr>';first=false;});});
    if(!subjects.size)html+='<tr><td colspan="'+(dates.length+2)+'">此週無排程</td></tr>';
    if(dates.some(d=>snapshot.events[d].length))html+='<tr><th colspan="2">事件</th>'+dates.map(d=>'<td>'+snapshot.events[d].map(e=>esc(e.name)).join('<br>')+'</td>').join('')+'</tr>';
   } else html+='<tr>'+dates.map(d=>'<td>'+snapshot.events[d].map(e=>'<div class="cp-event">'+esc(e.name)+'</div>').join('')+snapshot.grid[d].map(t=>content(taskInfo(t),options,true)).join('')+'</td>').join('')+'</tr>';
   html+='</tbody></table></div>';
  }
  html+='</section>';
 }
 return html;
}
let pendingPrint=null;
function finishPrint(error){
 if(!pendingPrint)return;const pending=pendingPrint;pendingPrint=null;clearTimeout(pending.timer);root.removeEventListener('message',pending.listener);
 if(pending.button){pending.button.disabled=false;pending.button.textContent='開啟列印預覽';}
 if(error)alert('無法準備列印預覽：'+error);
}
async function execute() {
 if(pendingPrint)return;
 if(!draft || draft.userId!==currentUserId)return alert('學生已切換，請重新開啟列印設定。');
 if(!printSelStart || !printSelEnd || printSelEnd<printSelStart)return alert('請選擇正確的開始與結束日期。');
 if((printSelEnd-printSelStart)/86400000>366)return alert('每次列印範圍請勿超過一年。');
 const cat=document.getElementById('print-modal-cat-filter').value,mis=document.getElementById('print-modal-mis-filter').value;
 const snapshot=getSnapshot(cat,mis,printSelStart,printSelEnd);
 const options={paginationPreferenceVersion:1,layout:document.getElementById('print-layout').value,period:document.getElementById('print-period').value,unit:true,pages:true,status:document.getElementById('print-show-status').checked,title:document.getElementById('print-show-title').checked,firstOnly:document.getElementById('print-title-first').checked};
 if(!snapshot.dates.some(d=>snapshot.grid[d].length || snapshot.events[d].length))return alert('選取範圍及篩選條件沒有排程，請先確認日期、分類與任務。');
 const model={dates:snapshot.dates,events:snapshot.events,grid:Object.fromEntries(snapshot.dates.map(date=>[date,snapshot.grid[date].map(taskInfo)]))};
 // DOM-only tests have no physical page geometry; native browser uses the isolated document below.
 if(!document.documentElement.getBoundingClientRect().width){const markup=render(snapshot,{...options,period:'week'},draft.name,cat,mis);const area=document.getElementById('print-area');document.body.appendChild(area);area.innerHTML=markup;multiData[currentUserId].printPreferences=options;saveToLocal();closeModal('modal-print-settings');root.print();return;}
 const button=document.querySelector('#modal-print-settings button[onclick="executePrint()"]');
 const uid=draft.userId,pending={button,uid,name:draft.name,options,child:null,timer:null,listener:null};pendingPrint=pending;
 if(button){button.disabled=true;button.textContent='正在準備預覽…';}
 pending.listener=event=>{
  if(pendingPrint!==pending||event.origin!==root.location.origin||event.source!==pending.child||!event.data)return;
  if(uid!==currentUserId){finishPrint('學生已切換，已取消列印。');if(pending.child&&!pending.child.closed)pending.child.close();return;}
  if(event.data.kind==='lpb-print-ready'){clearTimeout(pending.timer);pending.timer=setTimeout(()=>finishPrint('準備預覽逾時，請在預覽頁重試或返回月曆重新列印。'),38000);pending.child.postMessage({kind:'lpb-print-job',model,options,name:pending.name},root.location.origin);}
  else if(event.data.kind==='lpb-print-preview-ready'){
   multiData[uid].printPreferences=options;saveToLocal();closeModal('modal-print-settings');finishPrint();
  }
  else if(event.data.kind==='lpb-print-failed')finishPrint(event.data.message);
 };
 root.addEventListener('message',pending.listener);
 try{
  pending.child=root.open(new URL('calendar-print-view.html?v=175',document.baseURI).href,'_blank');
  if(!pending.child){finishPrint('瀏覽器未開啟列印視窗，請確認彈出式視窗提示。');return;}
  pending.timer=setTimeout(()=>finishPrint('準備列印逾時，請關閉列印頁後重試。'),20000);pending.child.focus();
 }catch(e){finishPrint(e.message);}
}

function editType() {
 const sub=document.getElementById('master-subject').value,type=document.getElementById('master-type').value;
 const obj=appMaster[sub] && appMaster[sub].materials && appMaster[sub].materials[type];
 if(!obj)return alert('請先選擇教材類型。');
 let modal=document.getElementById('modal-type-alias');
 if(!modal){modal=document.createElement('div');modal.id='modal-type-alias';modal.className='modal-bg';modal.innerHTML='<div class="modal-content" style="max-width:460px"><h2>教材類型簡稱</h2><p id="type-alias-name"></p><label for="type-alias-value">簡稱（用於月曆及列印，留空使用完整名稱）</label><input id="type-alias-value" maxlength="30"><div class="setting-controls"><button type="button" class="btn-outline" id="type-alias-cancel">取消</button><button type="button" class="btn-primary" id="type-alias-save">儲存</button></div></div>';document.body.appendChild(modal);}
 document.getElementById('type-alias-name').textContent='完整名稱：'+type;
 document.getElementById('type-alias-value').value=typeAlias(type,obj);
 const uid=currentUserId;
 document.getElementById('type-alias-cancel').onclick=()=>closeModal('modal-type-alias');
 document.getElementById('type-alias-save').onclick=()=>{if(uid!==currentUserId || !appMaster[sub] || appMaster[sub].materials[type]!==obj)return alert('學生或教材已變更，請重新開啟。');obj.alias=document.getElementById('type-alias-value').value.trim();saveToLocal();closeModal('modal-type-alias');};
 openModal('modal-type-alias');
}
root.CalendarPrint={resolvePlan,filterTasks,project,taskInfo,render,open,execute,syncRange,typeAlias,editType};
})(typeof window!=='undefined'?window:globalThis);
