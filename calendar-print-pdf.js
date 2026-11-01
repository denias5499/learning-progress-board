/* Canvas lays out each complete week; a small image-only PDF writer freezes the same pages. */
(function(root){
'use strict';
const W=841.89,H=595.28;
// 36pt = 12.7mm on every edge. Inset the .55pt border so all printed ink stays inside.
const MARGIN=36,INK_INSET=.5,M=MARGIN+INK_INSET,CW=W-M*2,CH=H-M*2;
const geometry=Object.freeze({width:W,height:H,margin:MARGIN,inkInset:INK_INSET,x:M,y:M,contentWidth:CW,contentHeight:CH});
const FONT='Arial,"PingFang TC","Microsoft JhengHei",sans-serif';
function wrap(ctx,text,width,size){
 ctx.font=size+'px '+FONT;const lines=[];let line='';
 for(const token of String(text||'').match(/[A-Za-z0-9][A-Za-z0-9_.~%\/-]*|\s+|./gu)||[]){
  if(token.includes('\n')){if(line)lines.push(line.trimEnd());line='';continue;}
  if(line&&ctx.measureText(line+token).width>width){lines.push(line.trimEnd());line='';}
  if(ctx.measureText(token).width>width){for(const c of Array.from(token)){if(line&&ctx.measureText(line+c).width>width){lines.push(line);line='';}line+=c;}}else if(line||token.trim())line+=token;
 }
 if(line)lines.push(line);return lines;
}
function layoutWeek(ctx,model,dates,options,density){
 const size=[10,9,8][density],small=Math.max(8,size-.7),lh=size*1.18,pad=3,gap=3,checkWidth=options.status?10:0;
 const matrix=options.layout==='matrix',col=(CW-(matrix?112:0))/7;
 const slots=Array.from({length:7},(_,i)=>dates[i]||null);
 function card(info){const path=matrix?'':[info.subject,info.type,info.book].filter(Boolean).join(' / '),body=[info.unit,info.pages].filter(Boolean).join(' '),width=col-pad*4-checkWidth;
  const p=wrap(ctx,path,width,small),b=wrap(ctx,body,width,size);return {info,p,b,height:(p.length*small*1.15+b.length*lh)+pad*2+gap};}
 const rows=[];
 if(matrix){const groups=new Map();dates.forEach(date=>(model.grid[date]||[]).forEach(info=>{const key=JSON.stringify([info.subject,info.type,info.book]);if(!groups.has(key))groups.set(key,{info,days:{}});const g=groups.get(key);(g.days[date]||(g.days[date]=[])).push(info);}));
  groups.forEach(g=>{const cells=slots.map(d=>d?(g.days[d]||[]).map(card):[]);const labels=[wrap(ctx,g.info.subject,33,size),wrap(ctx,[g.info.book,g.info.type].filter(Boolean).join('\n'),68,size)];rows.push({info:g.info,cells,labels,height:Math.max(24,...cells.map(cs=>cs.reduce((h,c)=>h+c.height,0)+pad*2),...labels.map(ls=>ls.length*lh+pad*2))});});
 }else{const cells=slots.map(d=>d?(model.grid[d]||[]).map(card):[]);rows.push({cells,height:Math.max(60,...cells.map(cs=>cs.reduce((h,c)=>h+c.height,0)+pad*2))});}
 // Events use the same dates and never disappear from the printed projection.
 if(dates.some(d=>(model.events[d]||[]).length)){const cells=slots.map(d=>d?(model.events[d]||[]).map(e=>card({unit:e.name,subject:'事件',done:false})):[]);rows.push({cells,labels:matrix?[['事件'],[]]:null,height:Math.max(24,...cells.map(cs=>cs.reduce((h,c)=>h+c.height,0)+pad*2))});}
 if(!rows.length)rows.push({cells:slots.map(()=>[]),labels:[['無排程'],[]],height:30});
 return {dates,slots,rows,height:18+rows.reduce((h,r)=>h+r.height,0)+6,size,small,lh,col,matrix,pad,checkWidth};
}
function paginate(ctx,model,options){
 const weeks=[];for(let i=0;i<model.dates.length;i+=7){const dates=model.dates.slice(i,i+7);weeks.push([0,1,2].map(d=>layoutWeek(ctx,model,dates,options,d)));}
 const max=options.period==='fortnight'?2:options.period==='three'?3:options.period==='auto'?53:1;
 const heights=weeks.map(w=>w.map(l=>l.height));const pages=root.CalendarPrintView.pack(heights,CH,max,22,options);
 return pages.map((p,i)=>({title:options.title!==false&&(i===0||options.firstOnly===false),weeks:p.items.map(item=>weeks[item.index][item.density])}));
}
function drawPage(ctx,page,options){
 ctx.fillStyle='#fff';ctx.fillRect(0,0,W+1,H+1);let y=M;
 function text(t,x,top,size,bold){ctx.font=(bold?'bold ':'')+size+'px '+FONT;ctx.fillStyle='#203846';ctx.textBaseline='top';ctx.fillText(t,x,top);}
 function centeredHeader(t,x,top,width){ctx.font='bold 9px '+FONT;text(t,x+(width-ctx.measureText(t).width)/2,top,9,true);}
 function rect(x,top,w,h,fill){if(fill){ctx.fillStyle=fill;ctx.fillRect(x,top,w,h);}ctx.strokeStyle='#a9bfcc';ctx.lineWidth=.55;ctx.strokeRect(x,top,w,h);}
 if(page.title){ctx.font='bold 15px '+FONT;const title='學習進度計畫表';text(title,(W-ctx.measureText(title).width)/2,y,15,true);y+=22;}
 for(const week of page.weeks){const {col,matrix,size,small,lh,pad,checkWidth}=week;let x=M;
  if(matrix){rect(x,y,36,18,'#e8f1f6');text('科目',x+3,y+4,9,true);x+=36;rect(x,y,76,18,'#e8f1f6');text('教材',x+3,y+4,9,true);x+=76;}
  week.slots.forEach(d=>{rect(x,y,col,18,d?'#e8f1f6':'#f3f7f9');if(d)centeredHeader(d.slice(5).replace('-','/')+' '+['日','一','二','三','四','五','六'][new Date(d+'T12:00:00').getDay()],x,y+4.5,col);x+=col;});y+=18;
  for(const row of week.rows){x=M;
   if(matrix){for(let c=0;c<2;c++){const width=c===0?36:76;rect(x,y,width,row.height,'#f3f7f9');(row.labels[c]||[]).forEach((line,i)=>text(line,x+3,y+pad+i*lh,size,c===0));x+=width;}}
   row.cells.forEach(cards=>{rect(x,y,col,row.height);let cy=y+pad;
    for(const card of cards){ctx.fillStyle='#f0f6f9';ctx.fillRect(x+2,cy,col-4,card.height-3);let ty=cy+pad;
     if(options.status){const bx=x+4,by=ty+1;rect(bx,by,7,7);if(card.info.done){ctx.beginPath();ctx.strokeStyle='#203846';ctx.lineWidth=1;ctx.moveTo(bx+1,by+3.5);ctx.lineTo(bx+3,by+6);ctx.lineTo(bx+6.5,by+1);ctx.stroke();}}
     const tx=x+pad*2+checkWidth;card.p.forEach(line=>{text(line,tx,ty,small);ty+=small*1.15;});card.b.forEach(line=>{text(line,tx,ty,size);ty+=lh;});cy+=card.height;
    }x+=col;
   });y+=row.height;
  }y+=6;
 }
 if(y>H-M+.01)throw Error('PDF 分頁核對失敗，已停止以避免裁切。');
}
function encodePDF(images){
 const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 function add(value){const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;}
 function object(id,body){offsets[id]=length;add(id+' 0 obj\n');add(body);add('\nendobj\n');}
 add('%PDF-1.4\n%fixed-pages\n');object(1,'<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>');object(2,'<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 images.forEach((image,i)=>{const id=3+i*3;object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /XObject << /Im'+i+' '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  offsets[id+1]=length;add((id+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+image.width+' /Height '+image.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.bytes.length+' >>\nstream\n');add(image.bytes);add('\nendstream\nendobj\n');
  const commands='q\n'+W+' 0 0 '+H+' 0 0 cm\n/Im'+i+' Do\nQ\n';object(id+2,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
 });
 const infoId=3+images.length*3;const title='FEFF'+Array.from('學習進度計畫表').map(c=>c.charCodeAt(0).toString(16).padStart(4,'0')).join('');object(infoId,'<< /Title <'+title+'> /Creator (StudyMap) >>');
 const xref=length;add('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');for(let i=1;i<offsets.length;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add('trailer\n<< /Size '+offsets.length+' /Root 1 0 R /Info '+infoId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 const result=new Uint8Array(length);let at=0;chunks.forEach(c=>{result.set(c,at);at+=c.length;});return result;
}
async function create(model,options,doc){
 if(doc.fonts&&doc.fonts.ready)await root.CalendarPrintView.bounded(doc.fonts.ready,5000,'載入字型');
 const canvas=doc.createElement('canvas'),scale=3;canvas.width=Math.ceil(W*scale);canvas.height=Math.ceil(H*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('此瀏覽器無法建立列印畫面。');ctx.scale(scale,scale);
 const pages=paginate(ctx,model,options),images=[];
 for(const page of pages){drawPage(ctx,page,options);const preview=canvas.toDataURL('image/jpeg',.96),binary=atob(preview.split(',')[1]);images.push({width:canvas.width,height:canvas.height,bytes:Uint8Array.from(binary,c=>c.charCodeAt(0)),preview});}
 return {bytes:encodePDF(images),images:images.map(image=>image.preview),pages:pages.length,weeks:Math.ceil(model.dates.length/7),tasks:model.dates.reduce((n,d)=>n+(model.grid[d]||[]).length,0)};
}
const api={geometry,wrap,layoutWeek,paginate,drawPage,encodePDF,create};root.CalendarPrintPDF=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
