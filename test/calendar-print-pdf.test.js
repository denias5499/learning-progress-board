const test=require('node:test'),assert=require('node:assert/strict');
require('../calendar-print-view.js');
const {wrap,layoutWeek,paginate,encodePDF}=require('../calendar-print-pdf.js');
const ctx={font:'',measureText:s=>({width:Array.from(s).length*5})};
const dates=Array.from({length:21},(_,i)=>'2026-08-'+String(i+1).padStart(2,'0'));
const task={subject:'數學',type:'複講',book:'麻辣',unit:'一元一次方程式',pages:'P.49~57',done:true};
const model={dates,grid:Object.fromEntries(dates.map(d=>[d,[task]])),events:Object.fromEntries(dates.map(d=>[d,[]]))};
test('中文長名稱按實際欄寬換行，七天與教材矩陣均完整保留',()=>{
 assert.deepEqual(wrap(ctx,'一二三四五六',15,10),['一二三','四五六']);
 for(const layout of ['calendar','matrix']){const week=layoutWeek(ctx,model,dates.slice(0,7),{layout,status:true},0);assert.equal(week.rows[0].cells.length,7);assert.equal(week.rows[0].cells.reduce((n,c)=>n+c.length,0),7);assert.match(week.rows[0].cells[0][0].b.join(''),/P.49~57/);assert.equal(week.rows[0].cells[0][0].info.done,true);}
});
test('PDF同一模型按最多一二三週分頁，任何頁均不拆週或漏掉進度',()=>{
 for(const [period,count] of [['week',3],['fortnight',2],['three',1]]){const pages=paginate(ctx,model,{layout:'calendar',period,title:true,firstOnly:true,status:true});assert.equal(pages.length,count);assert.equal(pages.flatMap(p=>p.weeks).length,3);assert.equal(pages.filter(p=>p.title).length,1);assert.equal(pages.flatMap(p=>p.weeks).flatMap(w=>w.rows).flatMap(r=>r.cells).flat().length,21);}
});
test('PDF輸出具有正確頁數、A4橫式尺寸與xref實體位移',()=>{
 const bytes=encodePDF([{width:1,height:1,bytes:new Uint8Array([255,216,255,217])},{width:1,height:1,bytes:new Uint8Array([255,216,255,217])}]);const txt=new TextDecoder().decode(bytes);
 assert.match(txt,/\/Count 2/);assert.match(txt,/\/MediaBox \[0 0 841.89 595.28\]/);assert.match(txt,/\/PrintScaling \/None/);
 const start=Number(txt.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(bytes.slice(start,start+4)),'xref');
 const lines=txt.slice(txt.indexOf('xref\n')).split('\n');for(let i=1;i<8;i++){const offset=Number(lines[i+2].slice(0,10));assert.equal(new TextDecoder().decode(bytes.slice(offset,offset+7)),i+' 0 obj');}
});
