/* Read-only availability reminders. Scheduled coverage and completed pages are separate. */
(function(root){
'use strict';
function range(a,b){if(a==null||a===''||b==null||b==='')return null;a=Number(a);b=Number(b);return Number.isInteger(a)&&Number.isInteger(b)&&a>0&&b>=a?[a,b]:null;}
function merge(rs){const result=[];rs.sort((a,b)=>a[0]-b[0]).forEach(r=>{const last=result[result.length-1];if(last&&r[0]<=last[1]+1)last[1]=Math.max(last[1],r[1]);else result.push(r.slice());});return result;}
function state(u,plans,catalog){
 u=u||{};const raw=u.uObj||u,bounds=range(raw.start,raw.end),scheduled=[],done=[];
 let occurrences=0;
 function count(node){if(!node||typeof node!=='object')return;if(node.id===u.id)occurrences++;Object.values(node).forEach(value=>{if(value&&typeof value==='object')count(value);});}
 if(catalog)count(catalog);
 const unique=occurrences===1;
 const type=u.typeName||u._typeName||'',book=u.instanceName||u._instanceName||'',sub=u.sub||u.subject||'',cat=u.cat||u.category||'';
 (plans||[]).forEach(p=>Object.values(p.grid||{}).forEach(ts=>{if(!Array.isArray(ts))return;ts.forEach(t=>{
  if(!u.id||t.unitId!==u.id)return;
  if(!unique && ((sub&&t.subject&&sub!==t.subject)||(cat&&t.cat&&cat!==t.cat)||(type&&t.typeName&&type!==t.typeName)||(book&&t.instanceName&&book!==t.instanceName)))return;
  let r=range(t.startPage,t.endPage);if(!r)return;
  if(bounds)r=[Math.max(r[0],bounds[0]),Math.min(r[1],bounds[1])];if(r[1]<r[0])return;
  scheduled.push(r);if(t.isDone===true)done.push(r);
 });}));
 const ranges=merge(scheduled),completed=merge(done),maxEnd=ranges.length?ranges[ranges.length-1][1]:0;
 let nextStart=bounds?bounds[0]:0;
 if(bounds)ranges.forEach(r=>{if(r[0]<=nextStart&&r[1]>=nextStart)nextStart=r[1]+1;});
 let completedNext=bounds?bounds[0]:0;
 if(bounds)completed.forEach(r=>{if(r[0]<=completedNext&&r[1]>=completedNext)completedNext=r[1]+1;});
 const completedFull=bounds ? completedNext>bounds[1] : completed.length>0;
 const full=bounds ? nextStart>bounds[1] : ranges.length>0;
 return {state:!ranges.length?'none':full?'full':'partial',maxEnd,unitEnd:bounds?bounds[1]:0,nextStart:full?null:nextStart,completedEnd:completed.length?completed[completed.length-1][1]:0,completedFull,ranges,completedRanges:completed};
}
const api={state};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.UnitReminders=api;
})(typeof window!=='undefined'?window:globalThis);
