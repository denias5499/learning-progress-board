/* Transactional remainder planning. No production data changes before explicit confirmation. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function bounds(a,b){a=Number(a);b=Number(b);if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a)throw Error('請輸入有效的起訖頁碼。');return[a,b];}
function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))throw Error('日期格式不正確。');const d=new Date(s+'T12:00:00Z');if(isNaN(d)||d.toISOString().slice(0,10)!==s)throw Error('日期格式不正確。');return d;}
function plus(s,n){const d=date(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function subtract(rs,cut){const result=[];rs.forEach(r=>{if(cut[1]<r[0]||cut[0]>r[1])result.push(r);else{if(r[0]<cut[0])result.push([r[0],cut[0]-1]);if(r[1]>cut[1])result.push([cut[1]+1,r[1]]);}});return result;}
const count=rs=>rs.reduce((n,r)=>n+r[1]-r[0]+1,0);
function same(t,s){return s.unitId?t.unitId===s.unitId&&(!s.cat||t.cat===s.cat)&&(!s.mis||t.mis===s.mis):t.replanSourceId===s.id;}
function fingerprint(p,logs){return JSON.stringify({plan:p,logs:logs||[]});}
function draft(userId,plan,logs,input){
 date(input.date);const tasks=(plan.grid||{})[input.date]||[],source=tasks.find(t=>t.id===input.taskId);if(!source)throw Error('原任務已變更，請重新開啟。');
 const old=bounds(source.startPage,source.endPage),now=bounds(input.start,input.end);if(now[0]!==old[0])throw Error('縮短進度時請保留原起頁；若需調整起頁，請先單獨儲存。');if(now[1]>=old[1])throw Error('這個視窗僅處理縮短迄頁後的剩餘進度。');
 if(source.unitId&&input.subject!==source.subject)throw Error('此任務已有單元關聯，請保留原科目後再安排剩餘進度。');
 if(!String(input.text||'').trim())throw Error('請填寫任務詳細顯示文字。');
 const tail=[now[1]+1,old[1]];let remaining=[tail];const changes=[];
 Object.entries(plan.grid||{}).forEach(([day,ts])=>(ts||[]).forEach(t=>{
  if(t.id===source.id||!same(t,source))return;let r;try{r=bounds(t.startPage,t.endPage);}catch(_){return;}
  if(t.isDone){remaining=subtract(remaining,r);return;}
  if(day>=input.date&&r[0]<=tail[1]&&tail[0]<=r[1])changes.push({date:day,id:t.id,range:r,keep:subtract([r],tail)});
 }));
 if(!source.isDone&&(logs||[]).some(l=>l.id==='cal_'+source.id))throw Error('此任務的完成狀態與學習紀錄不一致，請先重新載入核對。');
 if(changes.some(c=>(logs||[]).some(l=>l.id==='cal_'+c.id)))throw Error('後續任務的完成狀態與學習紀錄不一致，請先核對。');
 const dates=[...new Set(changes.filter(c=>c.date>input.date).map(c=>c.date))].sort();
 return {userId,planId:plan.id,date:input.date,source:copy(source),input:copy(input),tail,remaining,total:count(remaining),changes,defaultDays:Math.min(Math.max(1,dates.length||Math.ceil(count(remaining)/3)),Math.max(1,count(remaining))),snapshot:fingerprint(plan,logs)};
}
function preview(d,settings,planEnd){
 if(settings.mode==='defer'||!d.total)return {allocations:[],days:[],end:planEnd,mode:'defer',total:d.total};
 date(settings.start);if(settings.start<plus(d.date,1))throw Error('開始日期須在原任務日期之後。');
 const n=Number(settings.days);if(!Number.isInteger(n)||n<1||n>d.total||n>366)throw Error('完成天數請填 1～'+Math.min(d.total,366)+' 天。');
 const rs=copy(d.remaining),allocations=[],days=[];let pos=rs.length?rs[0][0]:0;
 for(let i=0;i<n;i++){let needed=Math.floor(d.total/n)+(i<d.total%n?1:0);const day=plus(settings.start,i),parts=[];while(needed>0){const r=rs[0],last=Math.min(r[1],pos+needed-1);parts.push([pos,last]);allocations.push({date:day,start:pos,end:last});needed-=last-pos+1;pos=last+1;if(pos>r[1]){rs.shift();if(rs.length)pos=rs[0][0];}}days.push({date:day,parts,pages:count(parts)});}
 const last=days[days.length-1].date;return {mode:'schedule',total:d.total,allocations,days,end:!planEnd||last>planEnd?last:planEnd};
}
function textRange(text,a,b){return String(text).replace(/\s*P\.\d+(?:[~～-]\d+)?\s*$/,'').trim()+' P.'+a+(a===b?'':'~'+b);}
function apply(plan,logs,d,settings,newId){
 if(fingerprint(plan,logs)!==d.snapshot)throw Error('排程或紀錄已變更，請重新開啟後再安排。');
 const p=copy(plan),ls=copy(logs||[]),view=preview(d,settings,p.end),source=p.grid[d.date].find(t=>t.id===d.source.id),used=new Set(Object.values(p.grid).flat().map(t=>t.id));
 const id=()=>{const x=newId();if(!x||used.has(x))throw Error('無法建立不重複的任務編號，請重試。');used.add(x);return x;};
 source.startPage=Number(d.input.start);source.endPage=Number(d.input.end);source.subject=d.input.subject||source.subject;source.text=textRange(d.input.text,source.startPage,source.endPage);
 const log=ls.find(l=>l.id==='cal_'+source.id);if(log){log.subject=source.subject;log.start=source.startPage;log.end=source.endPage;log.pages=source.endPage-source.startPage+1;log.unitName=source.unitName||log.unitName;log.detail=source.unitName||String(source.text).replace(/^\[[^\]]*\]\s*/,'').replace(/\s*P\.\d+(?:~\d+)?$/,'');}
 d.changes.forEach(c=>{const arr=p.grid[c.date],at=arr.findIndex(t=>t.id===c.id),old=arr[at];if(at<0)throw Error('後續任務已變更。');const keep=c.keep.map((r,i)=>Object.assign({},old,{id:i?id():old.id,startPage:r[0],endPage:r[1],text:textRange(old.text,r[0],r[1])}));arr.splice(at,1,...keep);});
 view.allocations.forEach(a=>{const t=Object.assign({},d.source,{id:id(),userId:d.userId,subject:source.subject,startPage:a.start,endPage:a.end,text:textRange(d.input.text,a.start,a.end),isDone:false,replanSourceId:d.source.id});delete t.completedAt;delete t.doneAt;(p.grid[a.date]||(p.grid[a.date]=[])).push(t);});
 if(view.mode==='schedule')p.end=view.end;
 return {plan:p,logs:ls,view};
}
const api={draft,preview,apply,plus};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CalendarReplan=api;
})(typeof window!=='undefined'?window:globalThis);
