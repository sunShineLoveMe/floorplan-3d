import {$} from './dom.js';
import {tr} from './i18n.js';
import {calibrateReference} from '../data/reference-plan.js';
import {lengthField,bindLengthField} from './length-field.js';
import {clone,validate} from '../data/project-data.js';
import {CATALOGS} from '../data/catalogs.js';
export function createReferencePlan({store,cancelInteraction,fitView,toast}){
 const dialog=document.createElement('dialog');dialog.className='room-dialog reference-dialog';dialog.id='referenceDialog';document.body.append(dialog);
 let source=null,points=[],pdf=null,pageCount=1,revision=0,busy=false,opener,epoch=0,disposed=false;
 const unsubscribe=store.subscribe(()=>revision++);
 function close(){dialog.close();opener?.focus();}
 function fail(error){dialog.querySelector('[role=alert]').textContent=tr('无法读取或标定图纸：','Cannot load or calibrate drawing: ')+error.message;}
 function draw(){
  const canvas=dialog.querySelector('canvas');canvas.width=source.pixelWidth;canvas.height=source.pixelHeight;
  const img=new Image();img.onload=()=>{if(!dialog.open)return;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);ctx.strokeStyle='#c64c20';ctx.fillStyle='#c64c20';ctx.lineWidth=Math.max(2,canvas.width/400);
   points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,canvas.width/180,0,Math.PI*2);ctx.stroke();ctx.fillText(String(i+1),p.x+12,p.y-12);});
   if(points.length===2){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.stroke();}
  };img.src=source.src;
  dialog.querySelector('[data-points]').textContent=tr(`已选择 ${points.length}/2 点`,`Selected ${points.length}/2 points`);
 }
 async function rasterPage(pageNumber,request=epoch){
  const page=await pdf.getPage(pageNumber),v=page.getViewport({scale:1}),scale=Math.min(2,2400/Math.max(v.width,v.height)),vp=page.getViewport({scale});
  const cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp,background:'white'}).promise;
  if(request!==epoch||disposed||!dialog.open)return;
  source={name:dialog.dataset.filename+' · '+pageNumber,src:cv.toDataURL('image/jpeg',.85),pixelWidth:cv.width,pixelHeight:cv.height};points=[];draw();page.cleanup();
 }
 async function load(file){
  if(busy||disposed)return;busy=true;const request=++epoch,startRevision=revision;opener=document.activeElement;cancelInteraction();
  dialog.innerHTML=`<h2>${tr('导入参考图纸并标定','Import & calibrate reference drawing')}</h2><p>${tr('PDF / PNG / JPG。点击已知距离的两个端点，输入实际距离。第一个点成为项目坐标原点，按图纸方向手工添加房间。','PDF / PNG / JPG. Click the two ends of a known distance, then enter its measured length. The first point becomes the project origin. Add rooms manually along the drawing axes.')}</p><label data-pages hidden>${tr('PDF 页','PDF page')}<select id="referencePage"></select></label><canvas tabindex="0" aria-label="Drawing calibration: click two endpoints"></canvas><p data-points></p>${lengthField('referenceDistance',tr('两点实际距离','Measured distance between points'),3048,store.getProject().units.display)}<p role="alert"></p><div class="actions"><button class="btn" data-cancel>${tr('取消','Cancel')}</button><button class="btn primary" data-apply>${tr('标定并保留底图','Calibrate & keep drawing')}</button></div>`;
  dialog.querySelector('[data-cancel]').onclick=close;dialog.showModal();
  const length=bindLengthField(dialog.querySelector('[data-length]'),3048,store.getProject().units.display,()=>[1,100000]);
  try{
   if(file.size>20*1024*1024)throw Error(tr('文件上限 20 MB。','File limit is 20 MB.'));
   dialog.dataset.filename=file.name;
   if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
    const lib=await import('../../vendor/pdfjs/pdf.min.mjs');const workerURL=new URL('../../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url);workerURL.search=new URL(import.meta.url).search;lib.GlobalWorkerOptions.workerSrc=workerURL.href;
    const loadedPdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;if(request!==epoch||disposed||!dialog.open){loadedPdf.destroy();return;}pdf=loadedPdf;pageCount=pdf.numPages;
    const select=dialog.querySelector('select');select.innerHTML=Array.from({length:pageCount},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');select.parentElement.hidden=false;
    select.onchange=async()=>{try{busy=true;dialog.querySelector('[data-apply]').disabled=true;await rasterPage(+select.value,request);}catch(error){fail(error);}finally{busy=false;dialog.querySelector('[data-apply]').disabled=false;}};
    await rasterPage(1,request);
   }else if(/\.(png|jpe?g)$/i.test(file.name)||['image/png','image/jpeg'].includes(file.type)){
    const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();if(request!==epoch||disposed||!dialog.open)return;const s=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*s);cv.height=Math.round(img.naturalHeight*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);source={name:file.name,src:cv.toDataURL('image/jpeg',.85),pixelWidth:cv.width,pixelHeight:cv.height};points=[];draw();}finally{URL.revokeObjectURL(url);}
   }else throw Error(tr('请使用 PDF、PNG 或 JPG；DWG/DXF 请先导出为 PDF 或图片。','Use PDF, PNG or JPG. Export DWG/DXF as PDF or an image first.'));
   if(request!==epoch||disposed||!dialog.open)return;
   const canvas=dialog.querySelector('canvas');canvas.onclick=e=>{const r=canvas.getBoundingClientRect();if(points.length===2)points=[];points.push({x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height});draw();};
   dialog.querySelector('[data-apply]').onclick=()=>{
    try{if(busy)return;if(revision!==startRevision)throw Error('Project changed. Reopen the drawing.');const result=length.read();if(!result.ok||points.length!==2)throw Error(tr('请选择两点并填写有效距离。','Select two points and enter a valid distance.'));
     const next=clone(store.getProject());next.referencePlan=calibrateReference(source,...points,result.mm);validate(next,CATALOGS);store.replaceProject(next);close();fitView();toast(tr('底图已标定；在 Room 中添加房间。','Drawing calibrated. Add rooms in Room.'));
    }catch(error){fail(error);}
   };
  }catch(error){if(request===epoch&&!disposed&&dialog.open)fail(error);}finally{if(request===epoch)busy=false;}
 }
 $('#importDrawing').onclick=()=>$('#drawingIn').click();$('#drawingIn').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)load(file);};
 $('#toggleReference').onclick=()=>{if(store.getProject().referencePlan)store.mutate(p=>p.referencePlan.visible=!p.referencePlan.visible);};
 $('#removeReference').onclick=()=>{if(store.getProject().referencePlan)store.mutate(p=>delete p.referencePlan);};
 dialog.addEventListener('close',()=>{epoch++;busy=false;pdf?.destroy();pdf=null;source=null;opener?.focus();});
 return {update(){const r=store.getProject().referencePlan;$('#toggleReference').disabled=$('#removeReference').disabled=!r;$('#referenceName').textContent=r?tr('已标定：','Calibrated: ')+r.name:tr('没有参考图纸','No reference drawing');$('#toggleReference').textContent=r?.visible?tr('隐藏底图','Hide drawing'):tr('显示底图','Show drawing');},dispose(){disposed=true;epoch++;unsubscribe();pdf?.destroy();dialog.remove();$('#drawingIn').onchange=null;for(const id of ['importDrawing','toggleReference','removeReference'])$('#'+id).onclick=null;}};
}
