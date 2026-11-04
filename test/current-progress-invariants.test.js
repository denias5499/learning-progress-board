const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Progress=require('../tree-progress');
test('現行規則：不同教材的同名同頁碼單元各自保留，重跑也不跨教材刪除',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const start=html.indexOf('        function deduplicateMasterUnits('),end=html.indexOf('        function dedupTrace(',start);
 const one=(id,name)=>({id,name,vols:{第一冊:[{id:id+'-a',name:'U1',start:1,end:1},{id:id+'-b',name:'U2',start:1,end:1}]}});
 const user={masters:{會考複習:{生物:{materials:{複習卷:{instances:[one('A','教材甲'),one('B','教材乙')]}}}}}};
 const before=JSON.stringify(user),ctx={multiData:{student:user}};vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
 assert.equal(ctx.deduplicateMasterUnits('student'),0);assert.equal(ctx.deduplicateMasterUnits('student'),0);
 assert.equal(JSON.stringify(user),before);
});
test('現行規則：未排程的相鄰單元不借用完成度，已有排程時才計算同教材跨單元頁碼',()=>{
 const subject={materials:{複習講義:{}}};
 const u=(id,start,end)=>({id,start,end,vol:'第一冊',_typeName:'複習講義',_instanceName:'教材甲'});
 const a=u('a',1,10),b=u('b',11,20),done={unitId:'a',startPage:5,endPage:15,isDone:true,subject:'地理',cat:'會考複習',typeName:'複習講義',instanceName:'教材甲',vol:'第一冊'};
 const context={subject:'地理',category:'會考複習'};
 const plans=[{grid:{'2026-11-01':[done]}}],before=JSON.stringify(plans);
 const m=Progress.create(subject,[a,b],plans,context);
 assert.equal(m.unit(a).done,6);assert.equal(m.unit(b).done,0);assert.equal(m.scheduledDays(b),0);
 const assigned=[{grid:{'2026-11-01':[done],'2026-11-02':[{...done,unitId:'b',startPage:11,endPage:20,isDone:false}]}}];
 const n=Progress.create(subject,[a,b],assigned,context);assert.equal(n.unit(b).done,5);assert.equal(n.scheduledDays(b),1);
 assert.equal(JSON.stringify(plans),before);
});
