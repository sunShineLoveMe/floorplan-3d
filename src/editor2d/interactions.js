import {$} from '../ui/dom.js';
import {TAP,blocksModelShortcuts} from '../ui/dom.js';
import {formatLengthMm,formatAreaM2,unitStepMm} from '../core/units.js';
import {roomArea,norm} from '../core/geometry.js';
import {createScope} from '../ui/lifecycle.js';
export function createInteractions({store,ui,svg,viewport,renderer,snapping,actions,drawers,mode,setTool,toggleFullscreen,undo,redo}){
const scope=createScope();
const {view,toMM,applyView,zoomAt,fitView,zoomCenter}=viewport;
const {renderFurn,renderSel,renderMeasure}=renderer;
const {snapMove,snapPoint}=snapping;
const {getF,select,rotateSel,deleteSel,duplicateSel,toggleWall}=actions;
const {drawer,closeDrawers}=drawers;
const snap=()=>store.begin(),commit=()=>store.commit(),mutate=fn=>store.mutate(fn);
let drag = null, pinch = null, lastPoint=null, hoverRoom=null;
function updateStatus(){
 if(lastPoint){$('#cx').textContent=formatLengthMm(lastPoint.x,store.getProject().units.display);$('#cy').textContent=formatLengthMm(lastPoint.y,store.getProject().units.display);}
 const room=store.getProject().geometry.rooms.find(r=>r.id===hoverRoom);
 $('#hover').textContent=room?store.getProject().rooms[room.id].name+' '+formatAreaM2(roomArea(room),store.getProject().units.display):'';
}
const touches = new Map();                     // 当前按在平面图上的手指
const svgXY = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function pinchInfo(){
  const [a, b] = [...touches.values()];
  return {d:Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c:svgXY((a.x+b.x)/2, (a.y+b.y)/2)};
}
// 结束当前拖动：移动过的家具记入撤销栈
function endDrag(cancel, keepCapture=false){
  const d = drag; drag = null; svg.classList.remove('panning');
  if (!d) return;
  if(!keepCapture && svg.hasPointerCapture(d.pid)) svg.releasePointerCapture(d.pid);
  if (d.kind === 'measure'){
    if (cancel){ ui.mA = ui.mCur = null; renderMeasure(); return; }
    if (d.moved && ui.mA && ui.mCur && Math.hypot(ui.mCur.x-ui.mA.x, ui.mCur.y-ui.mA.y) > 20){
      const a = ui.mA, b = ui.mCur; ui.mA = ui.mCur = null; mutate(() => store.getProject().measures.push({a, b}));
    }
    renderMeasure(); return;                   // 没拖动：保留起点，等第二次点击
  }
  if (d.kind === 'pan'){
    if (!cancel && !d.moved && ui.tool === 'select') select(d.room ? {kind:'room', id:d.room} : null);
    return;
  }
  if (cancel) store.cancel(); else commit(d.before);
}

scope.on(svg, 'pointerdown', e => {
  if (e.button === 1 || e.button === 2 || document.querySelector('dialog[open]')) return;
  closeDrawers(); $('details.menu').open = false;
  if (e.pointerType !== 'mouse'){
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    svg.setPointerCapture(e.pointerId);
    if (touches.size >= 2){                    // 第二根手指落下：取消单指操作，进入双指缩放 / 平移
      endDrag(true,true); // Both captured fingers now belong to the pinch gesture.
      const {d, c} = pinchInfo();
      pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s};
      return;
    }
  }
  if (pinch) return;
  const p = toMM(e), t = e.target;
  if (ui.tool === 'measure'){
    const q = snapPoint(p, e.shiftKey);
    if (!ui.mA){ ui.mA = q; ui.mCur = q; drag = {kind:'measure', pid:e.pointerId, sx:e.clientX, sy:e.clientY, moved:false}; svg.setPointerCapture(e.pointerId); }
    else { const a = ui.mA; ui.mA = null; ui.mCur = null; if (Math.hypot(q.x-a.x, q.y-a.y) > 20) mutate(() => store.getProject().measures.push({a, b:q})); }
    renderMeasure(); return;
  }
  const h = t.closest('[data-handle]');
  if (h && ui.sel?.kind === 'furn'){
    drag = {kind:h.dataset.handle, id:ui.sel.id, sx:e.clientX, sy:e.clientY, before:snap(), moved:false};
  } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
    toggleWall(t.closest('[data-wall]').dataset.wall); return;
  } else if (ui.tool === 'select' && t.closest('[data-opening]')){
    select({kind:'opening',id:t.closest('[data-opening]').dataset.opening}); return;
  } else if (ui.tool === 'select' && store.getProject().roomEditor && t.closest('[data-wall]')){
    select({kind:'wall',id:t.closest('[data-wall]').dataset.wall}); return;
  } else if (ui.tool === 'select' && t.closest('[data-fid]')){
    const f = getF(t.closest('[data-fid]').dataset.fid);
    if (ui.sel?.id !== f.id) select({kind:'furn', id:f.id});
    drag = {kind:'move', id:f.id, sx:e.clientX, sy:e.clientY, ox:p.x-f.cx, oy:p.y-f.cy, before:snap(), moved:false};
  } else {
    const room = t.closest('[data-room]');
    drag = {kind:'pan', sx:e.clientX, sy:e.clientY, x0:view.x0, y0:view.y0, room:room && room.dataset.room, moved:false};
  }
  if(drag){drag.pid=e.pointerId;drag.start={...getF(drag.id)};drag.point={x:p.x,y:p.y};}
  svg.setPointerCapture(e.pointerId);
});

scope.on(svg, 'pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pinch){
    if (touches.size < 2) return;
    const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
    view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; applyView();
    return;
  }
  const p = toMM(e);
  lastPoint=p;updateStatus();
  if (!drag){
    const room = e.target.closest && e.target.closest('[data-room]');
    hoverRoom=room?.dataset.room;updateStatus();
    if (ui.tool === 'measure' && ui.mA){ ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); }
    return;
  }
  const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
  if(e.pointerId!==drag.pid)return;
  if (drag.kind === 'measure'){
    if (far) drag.moved = true;
    ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); return;
  }
  if (drag.kind === 'pan'){
    if (!drag.moved && !far) return;
    drag.moved = true; svg.classList.add('panning');
    view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; applyView(); return;
  }
  const f = getF(drag.id); if (!f) return;
  if (!drag.moved && !far) return;             // 轻点家具不应让它抖动一下
  drag.moved = true;
  store.preview(()=>{
  if (drag.kind === 'move'){
    [f.cx, f.cy] = snapMove(f, p.x-drag.ox, p.y-drag.oy);
  } else if (drag.kind === 'rot'){
    let a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
    f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
  } else if (drag.kind === 'size'){
    const start=drag.start,a = start.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
    const dx = p.x-drag.point.x, dy = p.y-drag.point.y, lx = dx*c + dy*s, ly = -dx*s + dy*c;
    const step=unitStepMm(store.getProject().units.display);
    // Preserve a stationary axis exactly, including imported sub-minimum sizes.
    const nw = Math.abs(lx)<1e-8?start.w:Math.max(Math.min(50,start.w), Math.round((start.w+lx)/step)*step);
    const nd = Math.abs(ly)<1e-8?start.d:Math.max(Math.min(50,start.d), Math.round((start.d+ly)/step)*step);
    const mx=(nw-start.w)/2,my=(nd-start.d)/2;
    f.cx = start.cx + mx*c - my*s; f.cy = start.cy + mx*s + my*c; f.w = nw; f.d = nd;
  }
  });
  renderFurn(); renderSel();
});

function onPointerEnd(e){
  touches.delete(e.pointerId);
  if (pinch){ if (touches.size < 2) pinch = null; return; }   // 双指结束后，剩下的手指不再触发操作
  if(drag?.pid===e.pointerId)endDrag(e.type !== 'pointerup');
}
scope.on(svg, 'pointerup', onPointerEnd);
scope.on(svg, 'pointercancel', onPointerEnd);
scope.on(svg, 'lostpointercapture', onPointerEnd);
// 阻止 iPad Safari 把双指手势当成整页缩放
['gesturestart','gesturechange','gestureend'].forEach(t => scope.on(document, t, e => e.preventDefault()));

scope.on(svg, 'wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(view.s*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .0015)), e.clientX-r.left, e.clientY-r.top);
}, {passive:false});
scope.on(svg, 'dblclick', e => { if (ui.tool==='select' && e.target.closest('[data-fid]')) rotateSel(90); });
scope.on(svg, 'contextmenu', e => { if (ui.tool==='measure'){ e.preventDefault(); ui.mA = null; renderMeasure(); } });


/* ======================= 键盘 ======================= */
scope.on(document, 'keydown', e => {
  if (blocksModelShortcuts(e) || document.querySelector('dialog[open]')) return;
  if (mode.walking()) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if(mod&&k==='d'||!mod&&(['r','delete','backspace'].includes(k)||k.startsWith('arrow')))mode.cancelInteraction();
  if (mod && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
  if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
  if (mod) return;
  if (k === '[' || k === ']'){ drawer(k === '[' ? 'lib' : 'panel'); return; }
  if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
  if (k === 't') mode.setView(mode.is3D() ? '2d' : '3d');
  else if (mode.is3D() && ['v','m','x','f','+','=','-'].includes(k)) return;
  else if (k === 'v') setTool('select');
  else if (k === 'm') setTool('measure');
  else if (k === 'x') setTool('demolish');
  else if (k === 'f') fitView();
  else if (k === 'r') rotateSel(e.shiftKey ? -90 : 90);
  else if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
  else if (k === 'escape'){ if (drag){ endDrag(true); return; } if (ui.mA){ ui.mA = null; renderMeasure(); } else { if (ui.tool !== 'select') setTool('select'); select(null); } }
  else if (k.startsWith('arrow') && ui.sel?.kind === 'furn'){
    e.preventDefault(); const st = unitStepMm(store.getProject().units.display,e.shiftKey);
    mutate(() => { const f = getF(ui.sel.id); if (k==='arrowleft') f.cx -= st; if (k==='arrowright') f.cx += st; if (k==='arrowup') f.cy -= st; if (k==='arrowdown') f.cy += st; });
  }
  else if (k === '+' || k === '=') zoomCenter(1.25);
  else if (k === '-') zoomCenter(.8);
});


function cancel(){
  endDrag(true); pinch=null;
  for(const id of touches.keys()) if(svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  touches.clear(); ui.mA=ui.mCur=null; renderMeasure();
}
scope.on(window,'blur',cancel);
return {cancel,updateStatus,dispose(){cancel();scope.dispose();}};
}
