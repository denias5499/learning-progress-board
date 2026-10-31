/* UI stages the complete edit, previews it, then persists one verified family snapshot. */
(function(){
'use strict';
const el=id=>document.getElementById(id);let active=null,view=null,busy=false;
function message(s){el('replan-error').textContent=s||'';el('replan-error').hidden=!s;}
function ensure(){if(el('modal-calendar-replan'))return;const modal=document.createElement('div');modal.id='modal-calendar-replan';modal.className='modal-bg';modal.style.zIndex='2300';modal.innerHTML='<div class="modal-content replan-window"><div class="modal-header"><h2>安排剩餘進度</h2><button type="button" class="close-btn" id="replan-close" aria-label="返回修改">×</button></div><div id="replan-path" class="replan-path"></div><div id="replan-meta" class="replan-meta"></div><div class="replan-summary"><div>本日調整後<strong id="replan-current"></strong></div><div>剩餘進度<strong id="replan-left"></strong></div></div><fieldset id="replan-modes"><legend>剩餘進度如何處理？</legend><label><input type="radio" name="replan-mode" value="schedule" checked>分配到後續日期</label><label><input type="radio" name="replan-mode" value="defer">暫不安排，之後再排</label></fieldset><div id="replan-schedule"><div class="replan-fields"><label>開始日期<input type="date" id="replan-start"></label><label>完成天數<input type="number" id="replan-days" min="1" step="1"></label></div><h3>分配預覽</h3><table class="replan-table"><thead><tr><th>日期</th><th>頁碼</th><th>頁數</th></tr></thead><tbody id="replan-rows"></tbody></table></div><p id="replan-defer" class="replan-notice" hidden></p><details id="replan-changes"><summary id="replan-changes-title"></summary><ul id="replan-change-list"></ul></details><p id="replan-deadline" class="replan-notice" hidden></p><p id="replan-status" class="replan-meta"></p><p id="replan-error" class="replan-error" role="alert" hidden></p><div class="replan-actions"><button type="button" class="btn-outline" id="replan-back">返回修改</button><button type="button" class="btn-primary" id="replan-confirm">確認儲存</button></div></div>';document.body.appendChild(modal);['replan-back','replan-close'].forEach(id=>el(id).onclick=cancel);modal.querySelectorAll('input').forEach(i=>i.addEventListener('input',refresh));el('replan-confirm').onclick=commit;}
function settings(){return {mode:document.querySelector('input[name="replan-mode"]:checked').value,start:el('replan-start').value,days:Number(el('replan-days').value)};}
function refresh(){if(!active)return;message('');const d=active.d,s=settings();el('replan-schedule').hidden=s.mode==='defer'||!d.total;el('replan-defer').hidden=s.mode!=='defer'&&!!d.total;el('replan-defer').textContent=d.total?'剩餘頁數暫不排入月曆，單元將以深黃色提醒尚未排完整。':'剩餘範圍已有其他已完成紀錄，不會重複安排。';
 try{view=CalendarReplan.preview(d,s,active.plan.end);el('replan-confirm').disabled=false;el('replan-rows').replaceChildren();view.days.forEach(day=>{const tr=document.createElement('tr');[day.date.replaceAll('-','/'),day.parts.map(r=>'P.'+r[0]+(r[0]===r[1]?'':'～'+r[1])).join('、'),day.pages+' 頁'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});el('replan-rows').appendChild(tr);});el('replan-deadline').hidden=!(view.mode==='schedule'&&view.end!==active.plan.end);el('replan-deadline').textContent='原計畫截止日 '+(active.plan.end||'未設定')+'；確認後將延長至 '+view.end+'。';}
 catch(e){view=null;message(e.message);el('replan-confirm').disabled=true;el('replan-deadline').hidden=true;el('replan-rows').replaceChildren();}}
function begin(){
 const newEnd=Number(el('pc-end').value),oldEnd=Number(el('pc-old-end').value);
 if(!(oldEnd>0&&newEnd<oldEnd))return false;
 if(window._calendarEditUserId&&window._calendarEditUserId!==currentUserId){alert('學生已切換，請重新開啟任務。');return true;}
 try{
  const pid=window._calendarEditPlanId||el('planner-selector').value,plan=appPlans.find(p=>p.id===pid);if(!plan)throw Error('原計畫已變更，請重新開啟。');
  const input={date:el('pc-date').value,taskId:el('pc-taskid').value,start:Number(el('pc-start').value),end:newEnd,text:el('pc-text').value,subject:el('pc-subject').value};
  const d=CalendarReplan.draft(currentUserId,plan,appLogs,input);
  ensure();active={d,plan,user:multiData[currentUserId],stored:localStorage.getItem(STORAGE_KEY_FAMILY)};
  el('replan-path').textContent=[d.source.subject,d.source.typeName,d.source.instanceName,d.source.unitName].filter(Boolean).join(' › ');
  el('replan-meta').textContent=(active.user.name||'')+' · '+input.date+' · '+[d.source.cat,d.source.mis].filter(Boolean).join('／');
  el('replan-current').textContent='P.'+input.start+(input.start===input.end?'':'～'+input.end);
  el('replan-left').textContent='P.'+d.tail[0]+'～'+d.tail[1]+'，待排 '+d.total+' 頁';
  el('replan-status').textContent='本日任務維持「'+(d.source.isDone?'已完成':'未完成')+'」；其他已完成紀錄不移動、不覆蓋。';
  document.querySelector('input[name="replan-mode"][value="schedule"]').checked=true;
  el('replan-start').value=CalendarReplan.plus(input.date,1);el('replan-start').min=CalendarReplan.plus(input.date,1);el('replan-days').value=d.defaultDays;el('replan-days').max=Math.min(d.total||1,366);
  el('replan-modes').hidden=!d.total;el('replan-changes').hidden=!d.changes.length;el('replan-changes').open=false;el('replan-changes-title').textContent='將調整 '+d.changes.length+' 筆重疊的後續排程';el('replan-change-list').replaceChildren();d.changes.forEach(c=>{const li=document.createElement('li');li.textContent=c.date+' P.'+c.range[0]+'～'+c.range[1]+'：剩餘範圍將重新安排'+(c.keep.length?'，範圍外頁數保留':'');el('replan-change-list').appendChild(li);});
  refresh();openModal('modal-calendar-replan');
 }catch(e){alert(e.message);}
 return true;
}
function cancel(){if(busy)return;closeModal('modal-calendar-replan');active=null;view=null;}
function commit(){
 if(!active||busy)return;message('');const a=active;
 if(currentUserId!==a.d.userId||multiData[currentUserId]!==a.user)return message('學生或資料已切換，請返回後重新開啟。');
 if(localStorage.getItem(STORAGE_KEY_FAMILY)!==a.stored)return message('儲存資料已由其他操作變更，請返回並重新開啟，避免覆蓋。');
 const plan=a.user.plans.find(p=>p.id===a.d.planId);if(!plan)return message('原計畫已被刪除，請重新開啟。');
 busy=true;el('replan-confirm').disabled=true;
 try{
  const next=CalendarReplan.apply(plan,a.user.logs,a.d,settings(),genId),family=JSON.parse(JSON.stringify(multiData)),user=family[currentUserId];user.plans=user.plans.map(p=>p.id===plan.id?next.plan:p);user.logs=next.logs;
  const serialized=JSON.stringify(family);localStorage.setItem(STORAGE_KEY_FAMILY,serialized);
  if(localStorage.getItem(STORAGE_KEY_FAMILY)!==serialized)throw Error('儲存內容已被其他操作更新，請重新載入核對；不會覆寫該次更新。');
  a.user.plans=user.plans;a.user.logs=user.logs;appPlans=a.user.plans;appLogs=a.user.logs;invalidateSchedCache();active=null;view=null;closeModal('modal-calendar-replan');closeModal('modal-planner-cell');renderCalendar();
 }catch(e){message('尚未儲存：'+e.message);}
 finally{busy=false;el('replan-confirm').disabled=false;}
}
CalendarReplan.begin=begin;CalendarReplan.cancel=cancel;
})();
