/* Isolated print document: measure and paginate before invoking Safari's print controller. */
(function(root){
'use strict';
function pack(weeks,capacity,maxWeeks,titleHeight,options){
 const pages=[];maxWeeks=Math.max(1,Math.min(53,Number(maxWeeks)||1));
 const titleFor=i=>options.title!==false&&(i===0||options.firstOnly===false)?titleHeight:0;
 for(let index=0;index<weeks.length;index++){
  const week=weeks[index];let page=pages[pages.length-1];
  if(page && page.items.length<maxWeeks && page.height+week[0]<=capacity){page.items.push({index,density:0});page.height+=week[0];continue;}
  page={items:[],height:titleFor(pages.length)};
  const density=week.findIndex(height=>Number.isFinite(height)&&height>0&&page.height+height<=capacity);
  if(density<0)throw Error('第 '+(index+1)+' 週的內容在最小 8pt 字級下仍超過 A4 橫式一頁。請縮短教材簡稱或縮小篩選範圍；本次不會裁切或拆週列印。');
  page.items.push({index,density});page.height+=week[density];pages.push(page);
 }
 return pages;
}
async function bounded(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+'逾時，請關閉此頁後重新列印。')),ms);})]);}finally{clearTimeout(timer);}}
function start(){
 const doc=root.document,status=doc.getElementById('print-status');if(!status)return;
 const opener=root.opener;let received=false;
 function fail(e){status.textContent='無法準備列印：'+e.message;status.classList.add('cp-error');if(opener)opener.postMessage({kind:'lpb-print-failed',message:e.message},root.location.origin);}
 const timer=setTimeout(()=>{if(!received)fail(Error('未收到列印資料，請回到月曆重新列印。'));},12000);
 root.addEventListener('message',async event=>{
  if(received||event.source!==opener||event.origin!==root.location.origin||!event.data||event.data.kind!=='lpb-print-job')return;
  received=true;clearTimeout(timer);
  try{
   const result=await bounded(root.CalendarPrintPDF.create(event.data.model,event.data.options,doc),10000,'產生 PDF');
   status.textContent='學習進度計畫表 · '+result.tasks+' 筆進度 · '+result.weeks+' 週 · '+result.pages+' 頁';
   const url=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));
   if(opener)opener.postMessage({kind:'lpb-print-pdf',url,pages:result.pages,weeks:result.weeks,tasks:result.tasks},root.location.origin);

  }catch(e){fail(e);}
 });
 if(opener)opener.postMessage({kind:'lpb-print-ready'},root.location.origin);else fail(Error('請從學習進度看板的月曆開啟列印。'));
}
const api={pack,bounded};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CalendarPrintView=api;
if(root.document)start();
})(typeof window!=='undefined'?window:globalThis);
