const test=require('node:test'),assert=require('node:assert/strict'),D=require('../accuracy-duplicates');
const old={id:'old',date:'2026-07-14',subject:'數學',typeName:'複習卷',instanceId:'book',instanceName:'麻辣甲',total:24,correct:24,wrongUnits:['第3回'],extraExams:[]};
const keep={...old,id:'keep',wrongUnits:['第一冊|一元一次方程式']};
function plan(rs=[old,keep]){return {app:'StudyMap',kind:'accuracy-dedup-plan',schema:1,userId:'A',groups:[{keepId:'keep',archiveIds:['old'],expected:Object.fromEntries(rs.map(r=>[r.id,D.signature(r)]))}]};}
test('已確認同次作答保留兩筆原文與ID，只有一筆納入統計，原始物件不改寫',()=>{
 const rows=[old,keep],before=JSON.stringify(rows),after=D.applyPlan(rows,plan(),'A','fixed');assert.equal(JSON.stringify(rows),before);assert.equal(after.length,2);assert.deepEqual(D.active(after),[keep]);assert.equal(after[0].wrongUnits[0],'第3回');assert.equal(after[0]._duplicateOf,'keep');assert.equal(after[0]._duplicateConfirmedAt,'fixed');assert.equal(D.applyPlan(after,plan(),'A').length,2);
});
test('學生不符、內容已變、保留目標缺漏、循環及不同題數全都拒絕，不能部分套用',()=>{
 assert.throws(()=>D.applyPlan([old,keep],plan(),'B'),/學生不符/);assert.throws(()=>D.applyPlan([{...old,correct:23},keep],plan(),'A'),/內容不同/);assert.throws(()=>D.applyPlan([old],plan(),'A'),/不存在/);
 const bad=plan();bad.groups.push({keepId:'old',archiveIds:['keep'],expected:bad.groups[0].expected});assert.throws(()=>D.applyPlan([old,keep],bad,'A'),/同時保留/);
 const different={...keep,total:25};assert.throws(()=>D.applyPlan([old,different],plan([old,different]),'A'),/題數/);
});
test('還原重新納入統計，新舊格式備份重讀均保留歸檔標記，不刪除原始紀錄',()=>{
 const after=D.applyPlan([old,keep],plan(),'A');const restored=D.restore(JSON.parse(JSON.stringify(after)),'old');assert.deepEqual(restored,[old,keep]);assert.equal(D.active(JSON.parse(JSON.stringify(after))).length,1);assert.throws(()=>D.restore([old,keep],'old'),/找不到/);
});
test('只列出疑似候選，不自動合併不同單元的同日同分作答',()=>{
 assert.equal(D.candidates([old,keep]).length,1);assert.equal(D.candidates([{...keep,id:'u5',wrongUnits:['第三冊|U5']},{...keep,id:'u6',wrongUnits:['第三冊|U6']}]).length,0);assert.equal(D.candidates([{...old,id:'x',wrongUnits:['第1回']},{...old,id:'y',wrongUnits:['第2回']}]).length,0);assert.equal(D.candidates(D.applyPlan([old,keep],plan(),'A')).length,0);
});
