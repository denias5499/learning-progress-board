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
test('同冊同教材跨單元任務可計入相交範圍，超出頁碼不超計',()=>{
 const a=u('a',1,10),b=u('b',11,20);const m=model([a,b],[task('a',5,30)]);
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
