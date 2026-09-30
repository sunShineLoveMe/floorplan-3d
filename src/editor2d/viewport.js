import {formatLengthMm} from '../core/units.js';
import {$} from '../ui/dom.js';
import {PX_MM} from '../ui/dom.js';
export function createViewport({store,svg,onChange}){
const view={x0:0,y0:0,s:.06};
function applyView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const ratio = 1/(view.s*PX_MM);
  $('#ratio').textContent = '1:' + Math.round(ratio);
  const display=store.getProject().units.display;
  const sizes=display==='imperial'?[1,2,3,6,12,24,60,120,240,600].map(n=>n*25.4):[100,200,500,1000,2000,5000];
  const nice = sizes.find(v => v*view.s >= 60) || sizes.at(-1);
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = display==='imperial'?formatLengthMm(nice,display,{style:nice<304.8?'inches':'feet'}):nice >= 1000 ? `${nice/1000} m` : `${nice} mm`;
  onChange();
}
function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  view.s = Math.min(W/store.getProject().geometry.bounds.w, H/store.getProject().geometry.bounds.h);
  view.x0 = store.getProject().geometry.bounds.x - (W/view.s - store.getProject().geometry.bounds.w)/2; view.y0 = store.getProject().geometry.bounds.y - (H/view.s - store.getProject().geometry.bounds.h)/2;
  applyView();
}
function zoomAt(ns, mx, my){
  ns = Math.max(.012, Math.min(2, ns));
  const px = view.x0 + mx/view.s, py = view.y0 + my/view.s;
  view.s = ns; view.x0 = px - mx/ns; view.y0 = py - my/ns; applyView();
}
const zoomCenter = k => zoomAt(view.s*k, svg.clientWidth/2, svg.clientHeight/2);
const setRatio = r => zoomAt(1/(r*PX_MM), svg.clientWidth/2, svg.clientHeight/2);

function toMM(e){
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}


return {view,applyView,fitView,zoomAt,zoomCenter,setRatio,toMM};
}
