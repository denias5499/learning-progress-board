const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const D=require('../accuracy-duplicates');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const start=html.indexOf('        function getUnitAccuracyRate(');
const end=html.indexOf('\n        // v1.5.206:',start);
function rate(records,name='U6~9複習',vol='第二冊'){
 const before=JSON.stringify(records),ctx={loadAccuracyRecords:()=>records,AccuracyDuplicates:D};ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
 const result=ctx.getUnitAccuracyRate(name,'生物','複習卷','大滿貫甲',vol);
 assert.equal(JSON.stringify(records),before);return result;
}
const row=(units,extra={})=>({id:'a',subject:'生物',typeName:'複習卷',instanceName:'大滿貫甲',total:30,correct:30,wrongUnits:units,extraExams:[],...extra});
test('範圍複習單元不能借用單一U6、U7或其他較長名稱的成績',()=>{
 assert.equal(rate([row(['第二冊|U6']),row(['第二冊|U7']),row(['第二冊|U6~9複習延伸'])]),null);
 assert.equal(rate([row(['第二冊|U6~9複習'])],'U6'),null);
});
test('完整名稱與冊別正確時保留答對率，舊版完整名稱亦可讀取',()=>{
 assert.equal(rate([row(['第二冊|U6~9複習'],{correct:27})]),.9);
 assert.equal(rate([row(['U6~9複習'],{correct:27})]),.9);
 assert.equal(rate([row(['第一冊|U6~9複習'])]),null);
 assert.equal(rate([row(['U5'],{total:24,correct:23})],'U5','第一冊'),23/24);
});
test('科目、類型、教材仍隔離，已歸檔成績不計入',()=>{
 assert.equal(rate([row(['第二冊|U6~9複習'],{subject:'數學'}),row(['第二冊|U6~9複習'],{typeName:'複習講義'}),row(['第二冊|U6~9複習'],{instanceName:'其他'}),row(['第二冊|U6~9複習'],{_duplicateOf:'b'})]),null);
});
test('額外考卷也必須完整名稱相符，不藉用部分名稱',()=>{
 const extra=name=>({name,subject:'生物',typeName:'複習卷',instanceName:'大滿貫甲',total:20,correct:18});
 assert.equal(rate([row([],{extraExams:[extra('U6')]})]),null);
 assert.equal(rate([row([],{extraExams:[extra('U6~9複習延伸')]})]),null);
 assert.equal(rate([row([],{extraExams:[extra('U6~9複習')]})]),.9);
});
test('同一單元的既有多筆成績算法不因對應修正而改變',()=>{
 assert.equal(rate([row(['第二冊|U6~9複習'],{total:10,correct:10}),row(['第二冊|U6~9複習'],{total:100,correct:80})]),.9);
});
