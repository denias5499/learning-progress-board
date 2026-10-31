/* Read-only page coverage. Adjacent units share credit only within one verified physical book. */
(function(root){
'use strict';
function range(a,b){if(a==null||a===''||b==null||b==='')return null;a=Number(a);b=Number(b);return Number.isInteger(a)&&Number.isInteger(b)&&a>0&&b>=a?[a,b]:null;}
function merge(rs){const result=[];rs.sort((a,b)=>a[0]-b[0]).forEach(r=>{const last=result[result.length-1];if(last&&r[0]<=last[1]+1)last[1]=Math.max(last[1],r[1]);else result.push(r.slice());});return result;}
function catalogUnits(catalog){const rows=[];Object.entries(catalog||{}).forEach(([cat,subs])=>Object.entries(subs||{}).forEach(([sub,s])=>Object.entries(s.materials||{}).forEach(([type,m])=>(m.instances||[]).forEach(ins=>{const add=(u,vol)=>rows.push({u,cat,sub,type,book:ins.name,vol,key:JSON.stringify([cat,sub,m.id||type,ins.id||ins.name,vol])});if(Object.keys(ins.vols||{}).length)Object.entries(ins.vols).forEach(([vol,us])=>(us||[]).forEach(u=>add(u,vol)));else (ins.units||[]).forEach(u=>add(u,ins.type==='volume'?u.vol||'':''));}))));return rows;}
function state(u,plans,catalog){
 u=u||{};const raw=u.uObj||u,bounds=range(raw.start,raw.end),scheduled=[],done=[];
 const type=u.typeName||u._typeName||'',book=u.instanceName||u._instanceName||'',sub=u.sub||u.subject||'',cat=u.cat||u.category||'';
 const rows=catalogUnits(catalog),byId=new Map();rows.forEach(r=>{if(!byId.has(r.u.id))byId.set(r.u.id,[]);byId.get(r.u.id).push(r);});
 function candidates(id,t){let a=byId.get(id)||[];if(a.length===1)return a;return a.filter(r=>(!t.subject||r.sub===t.subject)&&(!t.cat||r.cat===t.cat)&&(!t.typeName||r.type===t.typeName)&&(!t.instanceName||r.book===t.instanceName));}
 const targets=candidates(u.id,{subject:sub,cat,typeName:type,instanceName:book}),target=targets.length===1?targets[0]:null;
 const tasks=[];(plans||[]).forEach(p=>Object.values(p.grid||{}).forEach(ts=>{if(Array.isArray(ts))tasks.push(...ts);}));
 const ownExists=tasks.some(t=>t.unitId===u.id&&range(t.startPage,t.endPage));
 tasks.forEach(t=>{
  if(!u.id||!t.unitId)return;
  if(t.unitId!==u.id){
   if(!target||!bounds||!ownExists)return;
   const source=candidates(t.unitId,t);if(source.length!==1||source[0].key!==target.key)return;
   const b=range(source[0].u.start,source[0].u.end);if(!b||(b[0]<=bounds[1]&&bounds[0]<=b[1]))return;
  }else if(!target && ((sub&&t.subject&&sub!==t.subject)||(cat&&t.cat&&cat!==t.cat)||(type&&t.typeName&&type!==t.typeName)||(book&&t.instanceName&&book!==t.instanceName)))return;
  let r=range(t.startPage,t.endPage);if(!r)return;if(bounds)r=[Math.max(r[0],bounds[0]),Math.min(r[1],bounds[1])];if(r[1]<r[0])return;
  scheduled.push(r);if(t.isDone===true)done.push(r);
 });
 const ranges=merge(scheduled),completed=merge(done),maxEnd=ranges.length?ranges[ranges.length-1][1]:0;
 let nextStart=bounds?bounds[0]:0;if(bounds)ranges.forEach(r=>{if(r[0]<=nextStart&&r[1]>=nextStart)nextStart=r[1]+1;});
 let completedNext=bounds?bounds[0]:0;if(bounds)completed.forEach(r=>{if(r[0]<=completedNext&&r[1]>=completedNext)completedNext=r[1]+1;});
 const completedFull=bounds?completedNext>bounds[1]:completed.length>0,full=bounds?nextStart>bounds[1]:ranges.length>0;
 return {state:!ranges.length?'none':full?'full':'partial',maxEnd,unitEnd:bounds?bounds[1]:0,nextStart:full?null:nextStart,completedEnd:completed.length?completed[completed.length-1][1]:0,completedFull,ranges,completedRanges:completed};
}
const api={state};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.UnitReminders=api;
})(typeof window!=='undefined'?window:globalThis);
