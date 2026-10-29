/* Duplicate classification is explicit and reversible; equal scores alone never merge records. */
(function(root){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function signature(r){return JSON.stringify([r.id,r.date,r.subject,r.typeName,r.instanceId,r.instanceName,r.total,r.correct,r.wrongUnits||[],r.extraExams||[]]);}
 function active(records){return records.filter(r=>!r._duplicateOf);}
 function validateRecords(records){if(!Array.isArray(records))throw Error('作答紀錄格式錯誤');const ids=new Set();records.forEach(r=>{if(!r||!r.id||ids.has(r.id))throw Error('作答 ID 缺漏或重複，停止變更');ids.add(r.id);});}
 function applyPlan(records,plan,userId,now){
  validateRecords(records);if(!plan||plan.app!=='StudyMap'||plan.kind!=='accuracy-dedup-plan'||plan.schema!==1||plan.userId!==userId||!Array.isArray(plan.groups)||!plan.groups.length)throw Error('修正檔格式或學生不符；請先切換到修正檔指定的學生');
  const byId=new Map(records.map(r=>[r.id,r])),archives=new Set(),keeps=new Set();
  plan.groups.forEach(g=>{const keep=byId.get(g.keepId);if(!keep||keep._duplicateOf||!Array.isArray(g.archiveIds)||!g.archiveIds.length)throw Error('保留紀錄不存在或已歸檔');keeps.add(g.keepId);[g.keepId,...g.archiveIds].forEach(id=>{const r=byId.get(id);if(!r||!g.expected||g.expected[id]!==signature(r))throw Error('紀錄與確認時內容不同，未套用任何修正：'+id);});g.archiveIds.forEach(id=>{const r=byId.get(id);if(id===g.keepId||archives.has(id)||r._duplicateOf&&r._duplicateOf!==g.keepId)throw Error('修正檔包含衝突的重複關聯');for(const field of ['date','subject','typeName','instanceName','total','correct'])if(r[field]!==keep[field])throw Error('日期、教材或題數與已確認條件不同，停止修正');archives.add(id);});});
  if([...archives].some(id=>keeps.has(id)))throw Error('不能同時保留與歸檔同一紀錄');
  const result=clone(records);plan.groups.forEach(g=>g.archiveIds.forEach(id=>{const r=result.find(x=>x.id===id);r._duplicateOf=g.keepId;r._duplicateConfirmedAt=now||new Date().toISOString();r._duplicateReason='使用者確認為同一次作答；原始內容保留';}));return result;
 }
 function restore(records,id){validateRecords(records);const result=clone(records),r=result.find(r=>r.id===id);if(!r||!r._duplicateOf)throw Error('找不到已歸檔紀錄');delete r._duplicateOf;delete r._duplicateConfirmedAt;delete r._duplicateReason;return result;}
 function candidates(records){const groups=new Map();active(records).forEach(r=>{const key=JSON.stringify([r.date,r.subject,r.typeName,r.instanceName,r.total,r.correct]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});return [...groups.values()].filter(rs=>rs.length>1&&rs.some((r,i)=>rs.some((other,j)=>{if(i===j)return false;const a=(r.wrongUnits||[]).join('、'),b=(other.wrongUnits||[]).join('、');return a===b||(/^第\d+回$/.test(a)&&!/^第\d+回$/.test(b))||(/^第\d+回$/.test(b)&&!/^第\d+回$/.test(a));})));}
 const api={signature,active,validateRecords,applyPlan,restore,candidates};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AccuracyDuplicates=api;
})(typeof window!=='undefined'?window:globalThis);
