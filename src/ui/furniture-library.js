import {formatLengthMm,formatAreaM2} from '../core/units.js';
import {$} from '../ui/dom.js';
import {COARSE,TAP,narrow,esc} from '../ui/dom.js';
import {tr,nm,LANG} from '../ui/i18n.js';
import {bbox,area} from '../core/geometry.js';
import {LIB} from '../data/catalogs.js';
import {furnSVG} from '../editor2d/furniture-symbols.js';
import {createScope} from './lifecycle.js';
export function createFurnitureLibrary({store,ui,viewport,actions,drawers,is3D,groundAt,flyToRoom,toast}){
const scope=createScope(),svg=$('#plan');
const {view,toMM}=viewport;
const {addItem}=actions; const {drawer,closeDrawers}=drawers;
let signature,roomSignature;
let activeTab='furniture';
function setTab(tab){
  activeTab=tab;
  for(const [key,id] of [['rooms','rooms'],['furniture','furniture']]){
    const button=$('#'+id+'Tab'),selected=tab===key;
    button.classList.toggle('on',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    $('#'+id+'Resource').hidden=!selected;
  }
}
for(const key of ['rooms','furniture']){
  scope.on($('#'+key+'Tab'),'click',()=>setTab(key));
  scope.on($('#'+key+'Tab'),'keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setTab(e.key==='Home'?'rooms':e.key==='End'?'furniture':activeTab==='rooms'?'furniture':'rooms');$('#'+activeTab+'Tab').focus();}});
}
setTab(activeTab);
scope.on($('#resourceNewRoom'),'click',()=>$('#newRoom').click());
scope.on($('#resourceOpenings'),'click',()=>$('#editRoom').click());
function buildRooms(){
  const project=store.getProject(),rooms=project.geometry.rooms.filter(r=>r.counted!==false);
  const next=JSON.stringify([LANG,project.units.display,project.rooms,project.geometry.rooms,ui.sel]);
  if(next===roomSignature)return;roomSignature=next;
  $('#roomList').innerHTML=rooms.map(r=>`<button data-room="${esc(r.id)}" class="${ui.sel?.kind==='room'&&ui.sel.id===r.id?'on':''}"><span>${esc(nm(project.rooms[r.id].name))}</span><small>${formatAreaM2(area(r.poly),project.units.display)}</small></button>`).join('')+ (rooms.length?`<button data-room="__all"><span>${tr('全屋','Whole home')}</span><small>${formatAreaM2(rooms.reduce((sum,r)=>sum+area(r.poly),0),project.units.display)}</small></button>`:`<p class="hint">${tr('当前方案没有房间','No rooms in this plan')}</p>`);
}
scope.on($('#roomList'),'click',e=>{
  const button=e.target.closest('[data-room]');if(!button)return;
  const id=button.dataset.room;
  if(id!=='__all')actions.select({kind:'room',id});
  if(is3D())flyToRoom(id);
  else if(id==='__all')viewport.fitView();
  else {
    const room=store.getProject().geometry.rooms.find(r=>r.id===id),b=bbox(room.poly),W=svg.clientWidth,H=svg.clientHeight;
    view.s=Math.min(W/(b[2]-b[0]+800),H/(b[3]-b[1]+800));view.x0=(b[0]+b[2])/2-W/2/view.s;view.y0=(b[1]+b[3])/2-H/2/view.s;viewport.applyView();
  }
  closeDrawers();buildRooms();
});
const summary=value=>store.getProject().units.display==='imperial'?`≈ ${(value/25.4).toFixed(1).replace(/\.0$/,'')} in`:`${Math.round(value)} mm`;

function buildLib(){
  const next=LANG+store.getProject().units.display;if(signature===next)return;signature=next;
  $('#lib').innerHTML = LIB.map((c,ci) => `<h4>${nm(c.cat)}</h4><div class="lib-grid">${c.items.map((it,ii) => {
    const [t,n,w,d,col] = it, pad = Math.max(w,d)*.08;
    return `<div class="item" role="button" tabindex="0" data-key="${ci}:${ii}" title="${esc(nm(n))} · ${esc(formatLengthMm(w,store.getProject().units.display,{style:'inches'}))} × ${esc(formatLengthMm(d,store.getProject().units.display,{style:'inches'}))} · ${tr('点击或拖动添加','Click or drag to add')}">
      <svg viewBox="${-w/2-pad} ${-d/2-pad} ${w+2*pad} ${d+2*pad}">${furnSVG(t,w,d,col)}</svg><b>${esc(nm(n))}</b><small>${tr('宽','W')} ${summary(w)}<br>${tr('深','D')} ${summary(d)}</small></div>`;
  }).join('')}</div>`).join('') + `<div class="hint">${tr(
    `家具按实际尺寸比例绘制。${COARSE ? '点一下放到画面中央，或按住向右拖到平面图 / 3D 地面上的指定位置（上下滑动为滚动列表）。' : '点击添加到画面中央，或直接拖到平面图 / 3D 地面上。'}添加后可在右侧修改宽深与颜色。`,
    `Furniture is drawn to scale. ${COARSE ? 'Tap to place at the center, or hold and drag right onto the plan / 3D floor (swipe up/down to scroll).' : 'Click to add at the center, or drag onto the plan / 3D floor.'} Edit size and color in the right panel afterwards.`)}</div>`;
}
scope.on($('#lib'), 'pointerdown', e=>{
  const el=e.target.closest('.item'); if(!el || e.button)return;
  libDrag={el,id:e.pointerId,sx:e.clientX,sy:e.clientY,it:itemOf(el),ghost:null};
});
const itemOf = el => { const [ci, ii] = el.dataset.key.split(':').map(Number); return LIB[ci].items[ii]; };

// 家具库拖放：用 pointer 事件实现（iPad 上 HTML5 拖放不可靠）。
// 列表设置了 touch-action:pan-y，竖向滑动交给浏览器滚动（会触发 pointercancel），横向拖动才开始拖放。
let libDrag = null;
// 屏幕坐标 → 户型坐标（mm）。2D 取平面图坐标，3D 取射线与地面的交点；s = 该处每 mm 的屏幕像素数
function dropPoint(x, y){
  const r = $('#stage').getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (document.elementFromPoint(x, y)?.closest('aside.open,#fab,#walkOverlay,#joy,#walkExit')) return null;
  if (is3D()) return groundAt(x, y) || null;
  const p = toMM({clientX:x, clientY:y}); return {x:p.x, y:p.y, s:view.s};
}
scope.on(window, 'pointermove', e => {
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const {it} = libDrag;
  if (!libDrag.ghost){
    if (Math.hypot(e.clientX-libDrag.sx, e.clientY-libDrag.sy) < TAP) return;
    const g = libDrag.ghost = document.createElement('div'); g.id = 'ghost';
    g.innerHTML = `<svg viewBox="${-it[2]/2} ${-it[3]/2} ${it[2]} ${it[3]}">${furnSVG(it[0],it[2],it[3],it[4])}</svg>`;
    document.body.appendChild(g); libDrag.el.classList.add('dragging');
  }
  // 幽灵图按落点处的比例显示真实大小（3D 中近大远小）
  const g = libDrag.ghost, s = Math.max(dropPoint(e.clientX, e.clientY)?.s || (is3D() ? .05 : view.s), .02);
  Object.assign(g.style, {width:Math.max(28, it[2]*s)+'px', height:Math.max(20, it[3]*s)+'px', left:e.clientX+'px', top:e.clientY+'px'});
  const lib = $('aside.lib');
  if (narrow() && lib.classList.contains('open') && e.clientX > lib.getBoundingClientRect().right) drawer(null);   // 拖出抽屉后自动收起
});
function endLibDrag(e, ok){
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const d = libDrag; libDrag = null;
  d.el.classList.remove('dragging');
  if (d.ghost){
    d.ghost.remove();
    if (!ok) return;
    const p = dropPoint(e.clientX, e.clientY);
    if (p) addItem(d.it, p.x, p.y);
    else if (is3D() && e.clientX > $('#stage').getBoundingClientRect().left) toast(tr('请拖到地面上', 'Drop it on the floor'));
    return;
  }
  if (!ok) return;
  // 轻点：放到选中房间中心，否则放到画面中心（3D 取屏幕中心对应的地面位置）
  let p = null;
  if (ui.sel?.kind === 'room'){ const b = bbox(store.getProject().geometry.rooms.find(r => r.id===ui.sel.id).poly); p = {x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}; }
  else if (is3D()){ const r = $('#stage').getBoundingClientRect(); p = groundAt(r.left + r.width/2, r.top + r.height/2); }
  if (!p) p = {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
  addItem(d.it, p.x, p.y);
  closeDrawers();
}
scope.on($('#lib'),'keydown',e=>{
  const el=e.target.closest('.item');if(!el||!['Enter',' '].includes(e.key))return;
  e.preventDefault();libDrag={el,id:-1,it:itemOf(el),ghost:null};endLibDrag({pointerId:-1},true);
});
scope.on(window, 'pointerup', e => endLibDrag(e, true));
scope.on(window, 'pointercancel', e => endLibDrag(e, false));


return {update(){buildLib();buildRooms();},dispose(){scope.dispose();libDrag?.ghost?.remove();$("#lib").replaceChildren();}};
}
