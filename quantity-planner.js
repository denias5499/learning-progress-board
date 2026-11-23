/* Opt-in quantities and quotas. Legacy catalogs are read-only inputs. Ranges are half-open. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function validDate(s){const d=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(d)||d.toISOString().slice(0,10)!==s)throw Error('日期不正確');return d;}
function plus(s,n){const d=validDate(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function week(s){const d=validDate(s);return plus(s,-((d.getUTCDay()+6)%7));}
function merge(rs){const out=[];rs.filter(r=>Number.isFinite(r[0])&&Number.isFinite(r[1])&&r[1]>r[0]).map(r=>r.slice()).sort((a,b)=>a[0]-b[0]).forEach(r=>{const x=out[out.length-1];if(x&&r[0]<=x[1])x[1]=Math.max(x[1],r[1]);else out.push(r);});return out;}
function size(rs){return merge(rs).reduce((s,r)=>s+r[1]-r[0],0);}
function subtract(r,cuts){let rs=[r];merge(cuts).forEach(c=>{rs=rs.flatMap(x=>c[0]>=x[1]||c[1]<=x[0]?[x]:[[x[0],Math.max(x[0],c[0])],[Math.min(x[1],c[1]),x[1]]].filter(y=>y[1]>y[0]));});return rs;}
function time(n){n=Math.round(n);return String(Math.floor(n/3600)).padStart(2,'0')+':'+String(Math.floor(n%3600/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function range(mode,a,b){return mode==='hours'?time(a)+'～'+time(b):mode==='words'?'第'+(a+1)+'～'+b+'字':'P.'+(a+1)+'～'+b;}
function amount(u){return u.mode==='hours'?Math.round(u.total*3600):u.mode==='words'?u.total:Math.max(1,Number(u.end)-Number(u.start)+1);}
function catalog(units){const ids=new Set();for(const u of units){if(!u.id||ids.has(u.id))throw Error('單元 ID 重複');ids.add(u.id);if(!['hours','words'].includes(u.mode)||!Number.isFinite(u.total)||u.total<=0||u.mode==='words'&&!Number.isInteger(u.total)||u.mode==='hours'&&(!Number.isSafeInteger(Math.round(u.total*3600))||Math.round(u.total*3600)<1))throw Error('請輸入有效的小時或單字數');if(!u.cat||!u.subject||!u.bookId||!u.book||!u.name)throw Error('請填寫分類、科目、教材與單元');}return units;}
function tasks(plans){return plans.flatMap(p=>Object.entries(p.grid||{}).flatMap(([date,ts])=>(ts||[]).map(t=>({date,t}))));}
function matches(t,u,cat,mis){return t.unitId===u.id&&t.cat===cat&&t.mis===mis&&(!t.subject||t.subject===u.subject)&&(!t.instanceName||t.instanceName===u.book)&&(!t.typeName||t.typeName===u.type);}
function bounds(t,u){if(u.mode)return t.measure===u.mode&&Number.isFinite(t.quantityStart)&&Number.isFinite(t.quantityEnd)?[t.quantityStart,t.quantityEnd]:null;return Number(t.startPage)>0&&Number(t.endPage)>=Number(t.startPage)?[t.startPage-u.start,t.endPage-u.start+1]:null;}
function coverage(rows,u,cat,mis,doneOnly=false){return merge(rows.filter(x=>matches(x.t,u,cat,mis)&&(!doneOnly||x.t.isDone)).map(x=>bounds(x.t,u)).filter(Boolean).map(r=>[Math.max(0,r[0]),Math.min(amount(u),r[1])]));}
function project({userId,plan,plans,units,rules,start,end,hours,cat,mis,newId}){
 validDate(start);validDate(end);if(end<start||plus(start,365)<end)throw Error('日期範圍須為 1～366 天');if(!cat||!mis)throw Error('請選擇分類及任務');
 const rows=tasks(plans),p=clone(plan),days=[];for(let d=start;d<=end;d=plus(d,1))days.push(d);
 const remain={};days.forEach(d=>{const capacity=Number(hours[validDate(d).getUTCDay()]);if(!Number.isFinite(capacity)||capacity<0)throw Error('每日時數不正確');const used=rows.filter(x=>x.date===d).reduce((s,x)=>s+(Number.isFinite(x.t.estimatedHours)?x.t.estimatedHours:1),0);remain[d]=Math.max(0,capacity-used);});
 const report=[],created=[],claimed=new Set();const usedIds=new Set(rows.map(x=>x.t.id));
 for(const rule of rules){if(!Number.isFinite(rule.target)||rule.target<=0||!Number.isFinite(rule.estimate)||rule.estimate<=0||!['week','day'].includes(rule.period))throw Error('目標數量與預估時數須大於零');
  const us=units.filter(u=>u.group===rule.group);if(!us.length)throw Error('教材已變更，請重新選擇');if(new Set(us.map(u=>u.id)).size!==us.length)throw Error('教材單元 ID 重複，請先核對教材');if(us.some(u=>claimed.has(u.id)))throw Error('同一單元不可設定重疊目標');us.forEach(u=>claimed.add(u.id));
  const mode=us[0].mode||'units';if(mode!=='hours'&&!Number.isInteger(rule.target))throw Error('單元、份數及單字目標須為整數');
  const eligibleDays=rule.period==='day'?days.filter(d=>Number(hours[validDate(d).getUTCDay()])>0):days;
  const blocks=[...new Set(eligibleDays.map(d=>rule.period==='day'?d:week(d)))];
  const consumed=new Map(us.map(u=>[u.id,coverage(rows,u,cat,mis)]));
  for(const block of blocks){const dates=eligibleDays.filter(d=>(rule.period==='day'?d:week(d))===block),allDates=rule.period==='day'?[block]:Array.from({length:7},(_,i)=>plus(block,i));
   const weekRows=rows.filter(x=>allDates.includes(x.date));let existing=0;
   us.forEach(u=>{const n=size(coverage(weekRows,u,cat,mis));existing+=mode==='units'?n/amount(u):mode==='hours'?n/3600:n;});
   let needed=Math.max(0,rule.target-existing),allocated=0;const factor=mode==='hours'?3600:1,rate=rule.estimate/rule.target;
   for(const u of us){if(needed<1e-7)break;const cuts=consumed.get(u.id);const ranges=subtract([0,amount(u)],cuts);
    if(mode==='units'){
     // A weekly quota counts whole units. Previously partial units require explicit editing, not guessed completion.
     if(cuts.length)continue;if(needed<1-1e-7)continue;
     const d=dates.find(d=>remain[d]+1e-9>=rate);if(!d)continue;
     allocate(u,d,0,amount(u),rate);needed-=1;allocated+=1;remain[d]-=rate;consumed.set(u.id,[[0,amount(u)]]);
    }else for(const r of ranges){let pos=r[0];for(const d of dates){const count=Math.min(r[1]-pos,Math.round(needed*factor),Math.floor((remain[d]+1e-9)/rate*factor));if(count<=0)continue;const cost=count/factor*rate;allocate(u,d,pos,pos+count,cost);cuts.push([pos,pos+count]);pos+=count;needed-=count/factor;allocated+=count/factor;remain[d]-=cost;if(pos>=r[1]||needed<1e-7)break;}if(needed<1e-7)break;}
   }
   report.push({group:rule.group,label:rule.label,period:rule.period,block,target:rule.target,existing,allocated,missing:Math.max(0,needed),mode});
  }
 }
 function allocate(u,d,a,b,cost){const id=newId();if(!id||usedIds.has(id))throw Error('任務編號重複');usedIds.add(id);const t={id,userId,cat,mis,unitId:u.id,materialId:u.bookId,subject:u.subject,typeName:u.type,instanceName:u.book,unitName:u.name,vol:u.vol||'',isDone:false,estimatedHours:cost,quotaGenerated:true};if(u.mode){t.measure=u.mode;t.quantityStart=a;t.quantityEnd=b;t.text='['+u.subject+'] '+u.book+' · '+u.name+' '+range(u.mode,a,b);}else{t.startPage=Number(u.start)+a;t.endPage=Number(u.start)+b-1;t.text='['+u.subject+'] '+u.name+' P.'+t.startPage+'～'+t.endPage;}(p.grid[d]||(p.grid[d]=[])).push(t);created.push({date:d,task:t});}
 const failures=report.filter(x=>x.missing>1e-6);const ds=Object.keys(p.grid).filter(d=>p.grid[d].length).sort();if(ds.length){p.start=p.start&&p.start<ds[0]?p.start:ds[0];p.end=p.end&&p.end>ds.at(-1)?p.end:ds.at(-1);}
 return {plan:p,created,report,ok:!failures.length};
}
const api={clone,plus,week,merge,size,subtract,time,range,amount,catalog,tasks,coverage,project};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.QuantityPlanner=api;
})(typeof window!=='undefined'?window:globalThis);
