import {$} from '../ui/dom.js';
import {COARSE} from './dom.js';
import {tr} from './i18n.js';
import {formatAreaM2} from '../core/units.js';
import {area} from '../core/geometry.js';
import {createScope} from './lifecycle.js';
export function createToolbar({store,ui,viewport,drawers,mode,undo,redo,clearLayout,renderMeasure,toast,cancelInteraction}){
const scope=createScope(),svg=$('#plan');
const {zoomCenter,fitView,setRatio}=viewport;
const {drawer,syncPaneBtns}=drawers;
const setView=m=>mode.setView(m);
function updateHeader(){
  $('#projectName').textContent=store.getProject().name==='三室两厅两卫 · 装修设计' ? tr(store.getProject().name,'3BR 2LR 2BA · Interior Design') : store.getProject().name;
  const tot = store.getProject().geometry.rooms.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  $('#subtitle').textContent = tr(`套内使用面积约 ${formatAreaM2(tot,store.getProject().units.display)}`, `Net floor area ≈ ${formatAreaM2(tot,store.getProject().units.display)}`);
  $('#projectUnits').value=store.getProject().units.display;
  $('#undo').disabled = !store.canUndo; $('#redo').disabled = !store.canRedo;
  $('#undo').style.opacity = store.canUndo ? 1 : .4; $('#redo').style.opacity = store.canRedo ? 1 : .4;
}

function setTool(t){
  cancelInteraction(); ui.tool = t; ui.mA = null; ui.mCur = null;
  svg.setAttribute('class', 'tool-' + t);
  document.querySelectorAll('#tools .btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  syncModeHint();
  renderMeasure();
}
function syncModeHint(){
  const hints = {select:'',
    measure:COARSE ? tr('按住拖出测量线，或依次点两点 · 靠近墙面自动吸附 · 点「选择」退出', 'Hold and drag a line, or tap two points · snaps to walls · tap "Select" to exit')
      : tr('点击两点（或按住拖动）测量距离 · 靠近墙面自动吸附 · Shift 锁定水平/垂直 · Esc 取消', 'Click two points (or drag) to measure · snaps to walls · Shift locks horizontal/vertical · Esc cancels'),
    demolish:tr('点击灰色非承重墙标记拆除，再次点击恢复 · 黑色承重墙不可拆', 'Click a grey non-bearing wall to remove it, click again to restore · black bearing walls cannot be removed')};
  const h = $('#modehint'); h.textContent = hints[ui.tool]; h.classList.toggle('show', !!hints[ui.tool]);
}

const TIPS = () => COARSE
  ? {'2d':tr('点或拖动家具库添加 · 单指拖动平移 · 双指缩放 · 选中家具后底部工具条可旋转 / 复制 / 删除', 'Tap or drag from the library · 1 finger pans · pinch zooms · bottom bar rotates / duplicates / deletes'),
     '3d':tr('单指旋转 · 双指缩放 / 平移 · 点家具或地面编辑 · 点门开关', '1 finger orbits · 2 fingers zoom / pan · tap furniture or floor to edit · tap doors to open')}
  : {'2d':tr('拖动左侧家具到平面图 · 滚轮缩放 · 拖动空白处平移 · T 切换 3D', 'Drag furniture onto the plan · scroll to zoom · drag empty space to pan · T for 3D'),
     '3d':tr('3D 场景与平面方案实时同步 · 右侧面板修改会立即生效 · T 返回 2D', '3D stays in sync with the plan · panel edits apply instantly · T for 2D')};
document.querySelectorAll('.menu-pop .btn').forEach(b => scope.on(b, 'click', () => b.closest('details').open = false));
document.querySelectorAll('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view));

document.querySelectorAll('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
document.querySelectorAll('#layers .btn').forEach(b => b.onclick = () => {
  const k = b.dataset.layer; store.setView({layers:{...ui.layers,[k]:!ui.layers[k]}}); b.classList.toggle('on', ui.layers[k]);

});
scope.on($('#projectUnits'),'change',e=>{
  if(document.querySelector('dialog[open]') || $('#projectUnits').disabled)return;
  const display=e.target.value;if(!['metric','imperial'].includes(display))return;
  cancelInteraction();store.mutate(p=>p.units.display=display);
});
$('#zoomIn').onclick = () => zoomCenter(1.25);
$('#zoomOut').onclick = () => zoomCenter(.8);
$('#fit').onclick = fitView;
$('#s60').onclick = () => { setRatio(60); toast(tr('已按 1:60 显示（与原始户型图同比例）', 'Showing at 1:60 (same scale as the original plan)')); };
$('#s100').onclick = () => setRatio(100);
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#clearAll').onclick = clearLayout;

/* 全屏：标准 API + Safari（iPad）的 webkit 前缀版本 */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen(){
  const de = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else {
    const req = de.requestFullscreen || de.webkitRequestFullscreen;
    if (!req) return toast(tr('当前浏览器不支持网页全屏，可在 Safari 中「添加到主屏幕」后以全屏方式打开', 'Fullscreen is not supported here — in Safari, use "Add to Home Screen" to open it fullscreen'));
    Promise.resolve(req.call(de)).catch(() => toast(tr('无法进入全屏', 'Could not enter fullscreen')));
  }
}
function syncFullscreen(){
  const on = !!fsEl(), b = $('#fullscreen');
  b.textContent = '⛶ ' + (on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen'));
  b.title = (on ? tr('退出全屏', 'Exit fullscreen') : tr('全屏', 'Fullscreen')) + ' (Shift+F)';
}
$('#fullscreen').onclick = toggleFullscreen;
['fullscreenchange', 'webkitfullscreenchange'].forEach(t => scope.on(document, t, syncFullscreen));
// 已从主屏幕以独立 App 方式打开时本就是全屏，隐藏按钮
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) $('#fullscreen').hidden = true;
$('#tgLib').onclick = () => drawer('lib');
$('#tgPanel').onclick = () => drawer('panel');
// Menus are UI overlays; outside clicks and Escape never reach the canvas as gestures.
const menus = [...document.querySelectorAll('header details,.view-settings')];
menus.forEach(menu=>{
  scope.on(menu,'toggle',()=>{if(menu.open)menus.forEach(other=>{if(other!==menu)other.open=false;});});
  scope.on(menu,'pointerdown',e=>e.stopPropagation());
});
scope.on(document,'pointerdown',e=>menus.forEach(menu=>{if(menu.open&&!menu.contains(e.target))menu.open=false;}));
scope.on(document,'keydown',e=>{if(e.key==='Escape'){const open=menus.find(menu=>menu.open);if(open){open.open=false;open.querySelector('summary').focus();e.preventDefault();e.stopImmediatePropagation();}}},{capture:true});
for (const query of ['(max-width:1223px)','(max-width:899px)']) scope.on(matchMedia(query), 'change', () => drawer(null));
document.querySelectorAll('[data-close-pane]').forEach(button=>scope.on(button,'click',()=>{drawer(button.dataset.closePane,false);$(button.dataset.closePane==='lib'?'#tgLib':'#tgPanel').focus();}));
drawer(null);                                  // 恢复上次的面板收起状态


function update(){updateHeader();syncModeHint();syncFullscreen();syncPaneBtns();$('#tip').textContent=TIPS()[mode.is3D()?'3d':'2d'];document.querySelectorAll('#layers .btn').forEach(b=>b.classList.toggle('on',ui.layers[b.dataset.layer]));}
return {setTool,toggleFullscreen,update,dispose(){scope.dispose();document.querySelectorAll('header button,.workspace-toolbar button,.toolbar button,#viewSeg button,#tools button,#layers button').forEach(b=>b.onclick=null);}};
}
