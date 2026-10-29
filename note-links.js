/* Stable syllabus/task associations for new wrong notes. Legacy notes are read-only to this module. */
(function(root){
'use strict';
const KEY='StudyMap_NoteLinkRegistry_V1', FAMILY='StudyMap_Family_Data_V20';
function create(storage){
 const read=(k,f)=>JSON.parse(storage.getItem(k)||JSON.stringify(f));
 const uuid=()=>root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
 function user(uid){const u=read(FAMILY,{})[uid];if(!uid||!u)throw Error('找不到目前學生，請重新開啟錯題頁');return u;}
 function registry(uid){
  const u=user(uid),all=read(KEY,{}),r=all[uid]||{categories:{},missions:{}};
  const cats=new Set(Object.keys(u.masters||{}).concat(Object.keys(u.missions||{})));
  Object.keys(r.categories).forEach(c=>{if(!cats.has(c))delete r.categories[c];});
  Object.keys(r.missions).forEach(k=>{const [c,m]=JSON.parse(k);if(!Object.hasOwn(u.missions?.[c]||{},m))delete r.missions[k];});
  cats.forEach(c=>{if(!r.categories[c])r.categories[c]='nc_'+uuid();Object.keys(u.missions?.[c]||{}).forEach(m=>{const k=JSON.stringify([c,m]);if(!r.missions[k])r.missions[k]='nm_'+uuid();});});
  all[uid]=r;const json=JSON.stringify(all);if(storage.getItem(KEY)!==json)storage.setItem(KEY,json);return r;
 }
 function catalog(uid){
  const u=user(uid),r=registry(uid),rows=[];
  Object.entries(u.masters||{}).forEach(([category,subjects])=>Object.entries(subjects||{}).forEach(([subject,s])=>{
   // Classification uses review-lecture knowledge units, independently of the question's source.
   const typeName='複習講義';(s.materials?.[typeName]?.instances||[]).forEach(ins=>{
    const add=(units,volume)=>(units||[]).forEach(unit=>{if(ins.id&&unit&&unit.id)rows.push({categoryId:r.categories[category],category,subject,typeName,instanceId:ins.id,instanceName:ins.name,unitId:unit.id,unitName:unit.name,volume});});
    if(ins.vols)Object.entries(ins.vols).forEach(([v,units])=>add(units,v));else add(ins.units,'');
   });
  }));return rows;
 }
 const identity=t=>JSON.stringify([t.categoryId,t.instanceId,t.unitId]);
 function tasks(uid,categoryId){const u=user(uid),r=registry(uid);return Object.entries(r.missions).flatMap(([k,missionId])=>{const [category,missionName]=JSON.parse(k);return r.categories[category]===categoryId?[{categoryId,category,missionId,missionName}]:[];});}
 function resolve(uid,syllabus,task){
  const rows=catalog(uid).filter(t=>syllabus&&identity(t)===identity(syllabus));
  if(rows.length!==1)return {status:'pending',reason:'教材或單元已刪除、ID 重複或關聯失效，請重新選擇'};
  const selected=task?tasks(uid,rows[0].categoryId).filter(t=>t.missionId===task.missionId&&t.categoryId===task.categoryId):[];
  if(task&&selected.length!==1)return {status:'pending',reason:'任務已刪除或不屬於此進度分類，請重新選擇'};
  return {status:'linked',syllabus:rows[0],task:selected[0]||null};
 }
 function validate(uid,note){
  if(note.userId&&note.userId!==uid)throw Error('不能寫入其他學生的錯題');
  if(note.noteLinkVersion!==1||!note.syllabus)throw Error('請選擇複習講義的教材與知識單元，再儲存錯題');
  if(!note.task||!note.task.missionId)throw Error('請選擇進度分類與任務，再儲存正式錯題');
  const result=resolve(uid,note.syllabus,note.task);
  if(result.status!=='linked')throw Error(result.reason);
  // Current ID identity is authoritative; never infer an ID from a text label.
  const s=result.syllabus;
  return {...note,userId:uid,noteLinkVersion:1,syllabus:s,task:result.task,subject:s.subject,volume:s.volume,unit:s.unitName};
 }
 function rename(uid,kind,category,oldName,newName){
  registry(uid);const all=read(KEY,{}),r=all[uid];
  if(kind==='category'){
   r.categories[newName]=r.categories[category];delete r.categories[category];
   Object.keys(r.missions).forEach(k=>{const [c,m]=JSON.parse(k);if(c===category){r.missions[JSON.stringify([newName,m])]=r.missions[k];delete r.missions[k];}});
  }else{const k=JSON.stringify([category,oldName]);if(r.missions[k]){r.missions[JSON.stringify([category,newName])]=r.missions[k];delete r.missions[k];}}
  storage.setItem(KEY,JSON.stringify(all));
 }
 function retire(uid,kind,category,mission){
  registry(uid);const all=read(KEY,{}),r=all[uid];
  if(kind==='category'){delete r.categories[category];Object.keys(r.missions).forEach(k=>{if(JSON.parse(k)[0]===category)delete r.missions[k];});}
  else delete r.missions[JSON.stringify([category,mission])];
  storage.setItem(KEY,JSON.stringify(all));
 }
 return {KEY,catalog,tasks,identity,resolve,validate,rename,retire};
}
if(typeof module!=='undefined'&&module.exports)module.exports={create,KEY};else root.NoteLinks=create(root.localStorage);
})(typeof window!=='undefined'?window:globalThis);
