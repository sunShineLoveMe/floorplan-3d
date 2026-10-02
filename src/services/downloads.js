import {exportName} from './export-names.js';
import {createScope} from '../ui/lifecycle.js';
export function createDownloads({store,ui,svg,is3D,shot,prepare3D}){
const scope=createScope(),urls=new Set(),images=new Set(),pending=new Set();
function download(name, blob){ if(scope.disposed)return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); urls.add(a.href); a.download = name; a.click(); scope.timeout(() => {URL.revokeObjectURL(a.href);urls.delete(a.href);}, 1000); }
async function exportPNG(mode='current'){
  if(mode==='3d'){await prepare3D();return shot(exportName(store.getProject(),'3D','png'));}
  if (mode==='current'&&is3D()) return shot(exportName(store.getProject(),'3D','png'));
  return rasterizePlan();
}
function planSVG(){
  const clone = svg.cloneNode(true), W = 3200, H = Math.round(W*store.getProject().geometry.bounds.h/store.getProject().geometry.bounds.w);
  clone.setAttribute('viewBox', `${store.getProject().geometry.bounds.x} ${store.getProject().geometry.bounds.y} ${store.getProject().geometry.bounds.w} ${store.getProject().geometry.bounds.h}`);
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  clone.querySelector('#gSel').innerHTML = '';
  // Standalone SVG rasterization cannot see the app's theme stylesheet.
  const measureMarks = svg.querySelectorAll('#gMeasure [stroke],#gMeasure [fill]');
  clone.querySelectorAll('#gMeasure [stroke],#gMeasure [fill]').forEach((mark, i) => {
    const style = getComputedStyle(measureMarks[i]);
    if (mark.hasAttribute('stroke')) mark.setAttribute('stroke', style.stroke);
    if (mark.hasAttribute('fill')) mark.setAttribute('fill', style.fill);
  });
  clone.querySelector('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid?'url(#grid)':'#f7f4ee'}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  Object.entries({x:-20000,y:-20000,width:55000,height:55000,fill:'#f7f4ee'}).forEach(([k,v]) => bg.setAttribute(k,v));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  return new XMLSerializer().serializeToString(clone);
}
function rasterizePlan(){
  const W=3200,H=Math.round(W*store.getProject().geometry.bounds.h/store.getProject().geometry.bounds.w),snapshot=planSVG(),filename=exportName(store.getProject(),'2D','png');
  const img = new Image();images.add(img);
  let settle;
  const promise=new Promise((resolve,reject)=>{settle=error=>error?reject(error):resolve();});
  function finish(error){pending.delete(finish);images.delete(img);img.onload=img.onerror=null;settle(error);}
  pending.add(finish);
  img.onerror=()=>finish(new Error('Image generation failed'));
  img.onload = () => {
    images.delete(img);if(scope.disposed)return;
    try {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0, W, H);
    cv.toBlob(b => {if(!b){finish(new Error('PNG generation failed'));return;}download(filename,b);finish();});
    }catch(error){finish(error);}
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(snapshot);
  return promise;
}


return {download,exportPNG,planSVG,dispose(){scope.dispose();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();images.forEach(img=>{img.onload=null;img.onerror=null;img.src="";});images.clear();pending.forEach(finish=>finish());pending.clear();}};
}
