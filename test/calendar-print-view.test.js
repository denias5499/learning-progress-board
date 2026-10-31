const test=require('node:test'),assert=require('node:assert/strict');
const {pack,bounded}=require('../calendar-print-view.js');
const opts={title:true,firstOnly:true};
test('整週放不下即換頁，可容納兩週且不新增空白頁',()=>{
 const pages=pack([[30,25,20],[40,35,30],[50,40,30]],100,3,10,opts);
 assert.deepEqual(pages.map(p=>p.items.map(i=>i.index)),[[0,1],[2]]);assert.deepEqual(pages.map(p=>p.height),[80,50]);
});
test('每頁最多一／二／三週，首頁及每頁標題高度均計入',()=>{
 const weeks=Array.from({length:5},()=>[30,25,20]);
 assert.deepEqual(pack(weeks,100,1,10,opts).map(p=>p.items.length),[1,1,1,1,1]);
 assert.deepEqual(pack(weeks,100,2,10,opts).map(p=>p.items.length),[2,2,1]);
 assert.deepEqual(pack(weeks,100,3,20,{title:true,firstOnly:false}).map(p=>p.items.length),[2,2,1]);
 assert.deepEqual(pack(weeks,100,3,20,{title:false}).map(p=>p.items.length),[3,2]);
});
test('密集週僅在單週超高時縮排，仍超過一頁就拒絕，不裁切或拆週',()=>{
 assert.equal(pack([[120,105,90]],100,3,0,opts)[0].items[0].density,2);
 assert.throws(()=>pack([[130,120,110]],100,3,0,opts),/第 1 週.*超過/);
 assert.equal(pack([],100,3,0,opts).length,0);
});
test('等待失敗會逾時，已完成等待不遺留逾時計時器',async()=>{
 await assert.rejects(bounded(new Promise(()=>{}),5,'字型'),/字型逾時/);
 assert.equal(await bounded(Promise.resolve('ready'),5,'字型'),'ready');
});
