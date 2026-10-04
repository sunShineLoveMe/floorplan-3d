import {exportName} from './export-names.js';
import {rasterSize,contentBounds} from './output-layout.js';
import {createScope} from '../ui/lifecycle.js';
export function createDownloads({store,ui,svg,is3D,shot,prepare3D}){
const scope=createScope(),urls=new Set(),images=new Set(),pending=new Set();
function download(name, blob){ if(scope.disposed)return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); urls.add(a.href); a.download = name; a.click(); scope.timeout(() => {URL.revokeObjectURL(a.href);urls.delete(a.href);}, 1000); }
async function exportPNG(mode='current',longEdge=3200){
  if(mode==='3d'){await prepare3D();return shot(exportName(store.getProject(),'3D','png'),longEdge);}
  if (mode==='current'&&is3D()) return shot(exportName(store.getProject(),'3D','png'),longEdge);
  return rasterizePlan(longEdge);
}
function snapshot(longEdge=3200,fitContent=false){
  const boxes=[...svg.children].filter(e=>e.tagName.toLowerCase()==='g'&&!['gGrid','gSel'].includes(e.id)&&getComputedStyle(e).display!=='none').map(e=>e.getBBox());
  const base=store.getProject().geometry.bounds,bounds=fitContent?contentBounds(base,boxes):base;
  const clone=svg.cloneNode(true),{width:W,height:H}=rasterSize(bounds,longEdge);
  clone.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
  clone.setAttribute('style','font-family:Arial,sans-serif');
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  clone.querySelector('#gSel').innerHTML = '';
  // Standalone SVG rasterization cannot see the app's theme stylesheet.
  const measureMarks = svg.querySelectorAll('#gMeasure [stroke],#gMeasure [fill]');
  clone.querySelectorAll('#gMeasure [stroke],#gMeasure [fill]').forEach((mark, i) => {
    const style = getComputedStyle(measureMarks[i]);
    if (mark.hasAttribute('stroke')) mark.setAttribute('stroke', style.stroke);
    if (mark.hasAttribute('fill')) mark.setAttribute('fill', style.fill);
  });
  clone.querySelector('#gGrid').innerHTML = `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.w}" height="${bounds.h}" fill="${ui.layers.grid?'url(#grid)':'#f7f4ee'}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  Object.entries({x:bounds.x,y:bounds.y,width:bounds.w,height:bounds.h,fill:'#f7f4ee'}).forEach(([k,v]) => bg.setAttribute(k,v));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  return {markup:new XMLSerializer().serializeToString(clone),width:W,height:H,bounds};
}
function planSVG(){return snapshot().markup;}
function rasterizePlan(longEdge){
  const {width:W,height:H,markup}=snapshot(longEdge,true),filename=exportName(store.getProject(),'2D','png');
  const img = new Image();images.add(img);
  let settle,finished=false;
  const promise=new Promise((resolve,reject)=>{settle=error=>error?reject(error):resolve();});
  function finish(error){if(finished)return;finished=true;pending.delete(finish);images.delete(img);img.onload=img.onerror=null;settle(error);}
  pending.add(finish);
  img.onerror=()=>finish(new Error('Image generation failed'));
  scope.timeout(()=>finish(new Error('Image generation timed out')),15000);
  img.onload = () => {
    images.delete(img);if(scope.disposed)return;
    try {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx=cv.getContext('2d');ctx.fillStyle='#f7f4ee';ctx.fillRect(0,0,W,H);ctx.drawImage(img,0,0,W,H);
    cv.toBlob(b => {if(finished||scope.disposed)return;if(!b){finish(new Error('PNG generation failed'));return;}download(filename,b);finish();});
    }catch(error){finish(error);}
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  return promise;
}


return {download,exportPNG,planSVG,dispose(){scope.dispose();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();images.forEach(img=>{img.onload=null;img.onerror=null;img.src="";});images.clear();pending.forEach(finish=>finish());pending.clear();}};
}
