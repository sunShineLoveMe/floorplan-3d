import {createScope} from '../ui/lifecycle.js';
import {tr} from '../ui/i18n.js';
export function createDownloads({store,ui,svg,is3D,shot}){
const scope=createScope(),urls=new Set(),images=new Set(),pending=new Set();
function download(name, blob){ if(scope.disposed)return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); urls.add(a.href); a.download = name; a.click(); scope.timeout(() => {URL.revokeObjectURL(a.href);urls.delete(a.href);}, 1000); }
function exportPNG(){
  if (is3D()) return shot();
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
    cv.toBlob(b => {if(!b){finish(new Error('PNG generation failed'));return;}download(tr('户型装修方案', 'floor-plan-design') + '.png', b);finish();});
    }catch(error){finish(error);}
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  return promise;
}


return {download,exportPNG,dispose(){scope.dispose();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();images.forEach(img=>{img.onload=null;img.onerror=null;img.src="";});images.clear();pending.forEach(finish=>finish());pending.clear();}};
}
