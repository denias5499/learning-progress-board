const test=require('node:test'),assert=require('node:assert/strict');
const {create,KEY}=require('../note-links'),{create:createRecords}=require('../student-records');
function setup(){
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const user=()=>({masters:{'會考':{'數學':{materials:{'複習講義':{instances:[{id:'book',name:'麻辣',vols:{'第二冊':[{id:'u1',name:'聯立方程式'},{id:'u2',name:'圖形'}]}}]}}}}},missions:{'會考':{'二模':['u1']}}});
 storage.setItem('StudyMap_Family_Data_V20',JSON.stringify({A:user(),B:user()}));
 const links=create(storage),records=createRecords(storage),syllabus=links.catalog('A')[0],task=links.tasks('A',syllabus.categoryId)[0];
 const note={noteLinkVersion:1,syllabus,task,timestamp:1,date:'2026/10/29',content:'正式錯題',imageId:'shared'};
 return {storage,links,records,note};
}
test('新筆記強制完整固定ID關聯，不靠同名、不沿用目前任務',()=>{
 const {records,note}=setup();
 assert.throws(()=>records.appendNotes('A',[{timestamp:2}]),/知識單元/);
 assert.throws(()=>records.appendNotes('A',[{...note,task:null}]),/任務/);
 assert.throws(()=>records.appendNotes('B',[note]),/關聯失效/);
 records.appendNotes('A',[note]);const saved=records.list('notes','A')[0];
 assert.ok(saved.id);assert.equal(saved.syllabus.unitId,'u1');assert.equal(saved.task.missionId,note.task.missionId);assert.equal(saved.unit,'聯立方程式');
 assert.throws(()=>records.updateNote('A',1,{noteLinkVersion:0}));
 assert.throws(()=>records.updateNote('A',1,{syllabus:null}));
});
test('單元同名或改名均以ID辨識；重複ID及已刪除單元不猜測',()=>{
 const {storage,links,note}=setup();let f=JSON.parse(storage.getItem('StudyMap_Family_Data_V20'));
 const units=f.A.masters['會考']['數學'].materials['複習講義'].instances[0].vols['第二冊'];
 units[0].name='改名';units[1].name='改名';storage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));
 assert.equal(links.validate('A',note).syllabus.unitName,'改名');assert.equal(links.validate('A',note).syllabus.unitId,'u1');
 units[1].id='u1';storage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));assert.throws(()=>links.validate('A',note),/ID 重複/);
 units.splice(0,2);storage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));assert.equal(links.resolve('A',note.syllabus,note.task).status,'pending');
});
test('分類任務更名保留ID；刪除後同名重建不誤接回舊筆記',()=>{
 const {storage,links,note}=setup();
 links.rename('A','mission','會考','二模','第三次');let f=JSON.parse(storage.getItem('StudyMap_Family_Data_V20'));
 f.A.missions['會考']['第三次']=f.A.missions['會考']['二模'];delete f.A.missions['會考']['二模'];storage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));
 assert.equal(links.validate('A',note).task.missionName,'第三次');
 links.rename('A','category','會考','會考','會考複習');f.A.masters['會考複習']=f.A.masters['會考'];delete f.A.masters['會考'];f.A.missions['會考複習']=f.A.missions['會考'];delete f.A.missions['會考'];storage.setItem('StudyMap_Family_Data_V20',JSON.stringify(f));
 assert.equal(links.validate('A',note).syllabus.category,'會考複習');
 links.retire('A','mission','會考複習','第三次');
 assert.equal(links.resolve('A',note.syllabus,note.task).status,'pending');
});
test('備份重讀保留所有ID；編輯失敗不覆蓋原筆記及別人資料',()=>{
 const {storage,records,note}=setup();records.appendNotes('A',[note]);
 const keys=Object.fromEntries(['StudyMap_Family_Data_V20',KEY,'myStudyNotes'].map(k=>[k,storage.getItem(k)]));
 const restored={getItem:k=>keys[k]||null,setItem:(k,v)=>keys[k]=v};const r=createRecords(restored);
 assert.equal(create(restored).validate('A',r.list('notes','A')[0]).task.missionId,note.task.missionId);
 const before=storage.getItem('myStudyNotes');assert.throws(()=>records.updateNote('A',1,{task:{missionId:'bad'}}));assert.equal(storage.getItem('myStudyNotes'),before);
});
test('13筆未歸屬測試筆記移至回收區、保留圖片引用並可還原；其他學生不變',()=>{
 const {storage,records}=setup();const old=Array.from({length:13},(_,i)=>({timestamp:i,subject:'國文',imageId:'shared',content:'測試'+i}));const formal={userId:'B',timestamp:1,content:'正式'};
 storage.setItem('myStudyNotes',JSON.stringify([...old,formal]));
 assert.equal(records.trashPendingNotes(records.pending('notes').map(n=>n.token)),13);
 assert.deepEqual(records.list('notes','B'),[formal]);assert.equal(records.pending('notes').length,0);assert.equal(records.noteTrash().length,13);assert.equal(records.hasImageReference('shared'),true);
 records.restoreTrashedNote(records.noteTrash()[0].id);assert.equal(records.pending('notes').length,1);assert.equal(records.noteTrash().length,12);
});
test('回收區儲存失敗時原筆記不消失；過期選取整批拒絕',()=>{
 const {storage,records}=setup();storage.setItem('myStudyNotes',JSON.stringify([{timestamp:1},{timestamp:2}]));
 const tokens=records.pending('notes').map(n=>n.token),before=storage.getItem('myStudyNotes');
 assert.throws(()=>records.trashPendingNotes([...tokens,'不存在']));assert.equal(storage.getItem('myStudyNotes'),before);
 const write=storage.setItem;storage.setItem=(k,v)=>{if(k==='StudyMap_WrongNotesTrash_V1')throw Error('quota');write(k,v);};
 assert.throws(()=>records.trashPendingNotes(tokens),/quota/);assert.equal(storage.getItem('myStudyNotes'),before);
});
