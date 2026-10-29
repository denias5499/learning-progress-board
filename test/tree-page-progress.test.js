const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../tree-progress');
const subject = { materials: { '複習講義': {}, '題本': { unitBased: true } } };
function u(id,start=1,end=10,vol='第四冊',instance='麻辣',type='複習講義') { return { id,start,end,vol,_typeName:type,_instanceName:instance }; }
function task(unitId,startPage,endPage,more={}) { return { unitId,startPage,endPage,isDone:true,...more }; }
function model(units,tasks) { return create(subject,units,[{grid:{'2026-10-28':tasks}}],{subject:'英文',category:'會考'}); }
test('完成頁碼合併重疊與重複任務，不把部分完成當成一個完成單元',()=>{
 const a=u('a',6,24), b=u('b',25,40); const m=model([a,b],[task('a',6,10),task('a',9,15),task('a',6,10),task('b',25,28)]);
 assert.deepEqual(m.unit(a),{basis:'page',total:19,done:10});
 assert.deepEqual(m.summary([a,b]),{pages:35,donePages:14,units:0,doneUnits:0,missing:0});
});
test('同冊同教材跨單元任務僅可計入已排程的相鄰單元，超出頁碼不超計',()=>{
 const a=u('a',1,10),b=u('b',11,20);const m=model([a,b],[task('a',5,30),task('b',11,20,{isDone:false})]);
 assert.equal(m.unit(a).done,6);assert.equal(m.unit(b).done,10);assert.equal(m.summary([b]).donePages,10);
});
test('不同冊次、教材、科目及未完成任務不污染進度',()=>{
 const a=u('a'),b=u('b',1,10,'第五冊'),c=u('c',1,10,'第四冊','其他');
 const m=model([a,b,c],[task('b',1,10),task('c',1,10),task('a',1,10,{subject:'數學'}),task('a',1,10,{cat:'其他'}),task('a',1,10,{isDone:false})]);
 assert.equal(m.unit(a).done,0);
});
test('沒有頁碼的完成任務與不合法頁碼不虛構完成頁數',()=>{
 const a=u('a'), m=model([a],[task('a',null,null),task('a',10,1),task('a','bad',10)]);
 assert.equal(m.unit(a).done,0);
 const missing={id:'missing',_typeName:'複習講義',_instanceName:'麻辣',vol:'第四冊'};
 assert.equal(m.unit(missing).basis,'missing');assert.equal(m.summary([missing]).missing,1);
});
test('單元型教材與頁數分別統計，重複資料不重複加總',()=>{
 const a=u('a'),b=u('b',1,100,'第四冊','3800','題本');const m=model([a,b],[task('a',1,4),task('b',null,null)]);
 assert.deepEqual(m.summary([a,a,b]),{pages:10,donePages:4,units:1,doneUnits:1,missing:0});
});
test('舊任務以唯一單元ID判定，同ID跨教材且未指明來源時不猜測',()=>{
 const a=u('same'),b=u('same',1,10,'第四冊','其他');const m=model([a,b],[task('same',1,10)]);assert.equal(m.unit(a).done,0);
 const explicit=model([a,b],[task('same',1,4,{instanceName:'麻辣'})]);assert.equal(explicit.unit(a).done,4);assert.equal(explicit.unit(b).done,0);
});

test('國文不分冊教材的舊 vol 欄位保留相容，仍計算已完成頁數',()=>{
 const a=u('ch',6,24,'複習講義|勝經','勝經');
 const m=model([a],[task('ch',6,24,{vol:'複習講義|勝經'})]);assert.equal(m.unit(a).done,19);
});

test('同冊多回次皆P.1，缺少或為false的unitBased不會讓未排程回次連帶完成',()=>{
 for(const flag of [undefined,false,true]) {
  const a=u('a',1,1,'第一冊','麻辣甲','複習卷'),b=u('b',1,1,'第一冊','麻辣甲','複習卷');
  const source={materials:{'複習卷':{unitBased:flag}}};
  const plans=[{grid:{day:[task('a',1,1)]}}];const before=JSON.stringify({source,plans});
  const m=create(source,[a,b],plans,{});
  assert.equal(m.unit(a).done,1);assert.equal(m.unit(b).done,0);
  assert.equal(m.scheduledDays(a),1);assert.equal(m.scheduledDays(b),0);
  assert.equal(JSON.stringify({source,plans}),before);
 }
});
test('已排但未完成的相同頁碼回次也不借用其他單元的完成紀錄',()=>{
 const a=u('a',1,1),b=u('b',1,1);const m=model([a,b],[task('a',1,1),task('b',1,1,{isDone:false})]);
 assert.equal(m.unit(b).done,0);assert.equal(m.scheduledDays(b),1);
});
test('未排程的相鄰單元不接受跨單元頁碼完成，重疊範圍也不推測共用',()=>{
 const a=u('a',1,10),b=u('b',11,20),c=u('c',5,15);
 const m=model([a,b,c],[task('a',1,30),task('c',5,15,{isDone:false})]);
 assert.equal(m.unit(b).done,0);assert.equal(m.unit(c).done,0);
});
test('排程天數共用完整來源判定，去重日期且不計其他教材、冊別或任務',()=>{
 const a=u('same'),b=u('same',1,10,'第五冊');
 const plans=[{grid:{one:[task('same',1,10),task('same',1,10,{vol:'第四冊',cat:'會考',mis:'一模'}),task('same',1,10,{vol:'第四冊',cat:'會考',mis:'一模',isDone:false})],two:[task('same',1,10,{vol:'第五冊',cat:'會考',mis:'一模'}),task('same',1,10,{vol:'第四冊',cat:'會考',mis:'二模'})]}}];
 const m=create(subject,[a,b],plans,{category:'會考',mission:'一模'});
 assert.equal(m.scheduledDays(a),1);assert.equal(m.scheduledDays(b),1);assert.equal(m.unit(a).done,10);
});
