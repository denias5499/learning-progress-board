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
async function painted(){
 await new Promise(resolve=>{const timer=setTimeout(resolve,200);root.requestAnimationFrame(()=>root.requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));});
}
async function showPages(doc,images){
 const host=doc.getElementById('preview-pages');host.replaceChildren();
 const elements=images.map((src,i)=>{if(typeof src!=='string'||!src.startsWith('data:image/jpeg;base64,'))throw Error('預覽圖片格式不符。');
  const sheet=doc.createElement('figure');sheet.className='preview-sheet';const image=doc.createElement('img');image.alt='學習進度計畫表，第 '+(i+1)+' 頁';image.src=src;
  const label=doc.createElement('figcaption');label.textContent='第 '+(i+1)+' 頁／共 '+images.length+' 頁';sheet.append(image,label);host.appendChild(sheet);return image;});
 if(!elements.length)throw Error('沒有可顯示的預覽內容。');
 for(const image of elements){
  if(typeof image.decode==='function')await bounded(image.decode(),5000,'載入預覽圖片');
  else if(!image.complete)await bounded(new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('預覽圖片載入失敗。'));}),5000,'載入預覽圖片');
  if(!image.naturalWidth)throw Error('預覽圖片未能正常顯示。');
 }
 await painted();return elements;
}
function start(){
 const doc=root.document,status=doc.getElementById('print-status');if(!status)return;
 const opener=root.opener,printButton=doc.getElementById('preview-print'),retry=doc.getElementById('preview-retry'),download=doc.getElementById('preview-download');
 let received=false,job=null,sequence=0,pdfURL=null,printing=false,ready=false,zoom=1,printWindow=null,printTimer=null,summary='';
 const notify=data=>{if(opener&&!opener.closed)opener.postMessage(data,root.location.origin);};
 function controls(enabled){['preview-fit','preview-minus','preview-plus','preview-print'].forEach(id=>doc.getElementById(id).disabled=!enabled);}
 function fit(){zoom=Math.min(1,Math.max(.25,(root.innerWidth-32)/1123));setZoom(zoom);}
 function setZoom(value){zoom=Math.max(.25,Math.min(2,value));doc.getElementById('preview-pages').style.setProperty('--preview-width',Math.round(1123*zoom)+'px');doc.getElementById('preview-zoom').textContent=Math.round(zoom*100)+'%';}
 function fail(e){ready=false;controls(false);status.textContent='無法準備預覽：'+e.message;status.classList.add('cp-error');retry.hidden=false;retry.textContent=job?'重新載入預覽':'返回看板重新列印';notify({kind:'lpb-print-failed',message:e.message});}
 function print(){if(!ready||printing)return;printing=true;printButton.disabled=true;
  if(printWindow&&!printWindow.closed)printWindow.close();clearTimeout(printTimer);
  try{
   printWindow=root.open(pdfURL,'_blank','popup,width=1100,height=800');
   if(!printWindow)throw Error('瀏覽器未開啟列印視窗，請確認彈出式視窗提示後重試。');
   const child=printWindow,started=Date.now();status.textContent='正在開啟系統列印，預覽內容會保留。';
   function waitPDF(){
    if(child!==printWindow)return;
    if(child.closed){status.textContent='列印視窗已關閉，預覽仍保留，可重新列印。';printing=false;printButton.disabled=false;return;}
    try{
     if(child.document.contentType==='application/pdf'&&child.document.readyState==='complete'){
      child.addEventListener('afterprint',()=>{if(!child.closed)child.close();afterPrint();},{once:true});child.focus();child.print();afterPrint();return;
     }
    }catch(_){}
    if(Date.now()-started>15000){status.textContent='PDF 已產生，但系統列印尚未載入。可在開啟的 PDF 視窗列印，或返回這裡重試。';printing=false;printButton.disabled=false;return;}
    printTimer=setTimeout(waitPDF,250);
   }
   printTimer=setTimeout(waitPDF,150);
  }catch(e){status.textContent='無法開啟系統列印：'+e.message;printing=false;printButton.disabled=false;}
 }
 function afterPrint(){printing=false;printButton.disabled=!ready;if(ready)status.textContent=summary+' · 預覽已保留，可放大檢查、儲存 PDF 或重新列印。';}
 root.addEventListener('afterprint',afterPrint);
 root.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='p'){event.preventDefault();print();}});
 printButton.onclick=print;doc.getElementById('preview-fit').onclick=fit;doc.getElementById('preview-minus').onclick=()=>setZoom(zoom-.1);doc.getElementById('preview-plus').onclick=()=>setZoom(zoom+.1);
 doc.getElementById('preview-back').onclick=()=>{if(opener&&!opener.closed)opener.focus();root.close();};
 retry.onclick=()=>{if(job)run();else doc.getElementById('preview-back').click();};
 async function run(){
  const token=++sequence;ready=false;controls(false);retry.hidden=true;download.hidden=true;status.classList.remove('cp-error');status.textContent='正在準備預覽…';
  if(printWindow&&!printWindow.closed)printWindow.close();printWindow=null;clearTimeout(printTimer);
  if(pdfURL){URL.revokeObjectURL(pdfURL);pdfURL=null;}
  try{
   const result=await bounded(root.CalendarPrintPDF.create(job.model,job.options,doc),15000,'產生預覽');if(token!==sequence)return;
   await bounded(showPages(doc,result.images),12000,'載入預覽圖片');if(token!==sequence)return;
   pdfURL=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));download.href=pdfURL;download.hidden=false;

   summary=(job.name?'學生：'+job.name+' · ':'')+result.tasks+' 筆進度 · '+result.weeks+' 週 · '+result.pages+' 頁';status.textContent=summary;
   ready=true;controls(true);fit();await painted();
   notify({kind:'lpb-print-preview-ready',pages:result.pages,weeks:result.weeks,tasks:result.tasks});

  }catch(e){if(token===sequence)fail(e);}
 }
 const timer=setTimeout(()=>{if(!received)fail(Error('未收到列印資料，請回到月曆重新列印。'));},12000);
 root.addEventListener('message',event=>{
  if(received||event.source!==opener||event.origin!==root.location.origin||!event.data||event.data.kind!=='lpb-print-job')return;
  received=true;clearTimeout(timer);job=event.data;run();
 });
 root.addEventListener('pagehide',()=>{sequence++;clearTimeout(timer);clearTimeout(printTimer);if(printWindow&&!printWindow.closed)printWindow.close();if(pdfURL)URL.revokeObjectURL(pdfURL);});
 if(opener)notify({kind:'lpb-print-ready'});else{clearTimeout(timer);fail(Error('請從學習進度看板的月曆開啟列印。'));}
}
const api={pack,bounded,showPages};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CalendarPrintView=api;
if(root.document)start();
})(typeof window!=='undefined'?window:globalThis);
