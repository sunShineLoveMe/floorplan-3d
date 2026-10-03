import {useZoneFields,bindUseZoneFields} from './use-zones.js';
import {furnitureDistances} from '../core/spatial-clearance.js';
import {captureInputs,restoreInputs} from './input-drafts.js';
import {formatLengthMm,formatAreaM2} from '../core/units.js';
import {lengthField,bindLengthField} from './length-field.js';
import {clone,validate,updateRectangleProject} from '../data/project-data.js';
import {$} from '../ui/dom.js';
import {COARSE,esc} from '../ui/dom.js';
import {tr,nm,LANG} from '../ui/i18n.js';
import {footprintArea,roomArea,perim,bbox,norm} from '../core/geometry.js';
import {MATS,CATALOGS} from '../data/catalogs.js';
export function createPropertyPanel({store,ui,actions,drawers,is3D,flyToRoom,toast}){
const {select,rotateSel,deleteSel,duplicateSel,getF}=actions;
const {drawer,closeDrawers}=drawers;
const mutate=fn=>store.mutate(fn);
const length=(mm,style='feet')=>formatLengthMm(mm,store.getProject().units.display,{style});
const surface=m2=>formatAreaM2(m2,store.getProject().units.display);
let signature,context,lastEntity={},draftProjectId;
const heightDrafts=new Map();
function syncUnitLock(){
 if(document.querySelector('dialog[open]'))return;
 const locked=!!document.activeElement?.matches('#panel [data-length], #passagePanel [data-length]')||!!document.querySelector('#panel [data-length][aria-invalid=true], #passagePanel [data-length][aria-invalid=true]');
 $('#projectUnits').disabled=locked;$('#unitLock').textContent=locked?tr('完成或取消尺寸编辑后可切换','Finish or cancel dimension editing to change units'):'';
}
function renderPanel(){
  syncUnitLock();
  renderFab();
  const p = $('#panel'),project=store.getProject();
  const current=(ui.sel?.kind==='furn'?getF(ui.sel.id):ui.sel?.kind==='room'?project.rooms[ui.sel.id]:{})||{};
  const key=project.id+':'+(ui.sel?.kind||'none')+':'+(ui.sel?.id||'')+':'+project.units.display;
  const next=JSON.stringify([LANG,key,project.furniture,project.rooms,project.geometry,project.measures,project.demolished]);
  if(next===signature)return;
  const previousInputs=captureInputs(p),prior=lastEntity;
  const heightDraft=previousInputs.find(d=>d.id==='fH');
  if(context&&heightDraft){
    if(heightDraft.dirty)heightDrafts.set(context,{draft:heightDraft,saved:prior.height});
    else heightDrafts.delete(context);
  }
  if(draftProjectId!==project.id){heightDrafts.clear();draftProjectId=project.id;}
  // Switching to a duplicate never applies the original item's draft. Undoing
  // copy/delete can recover it only for that item and unchanged saved height.
  const drafts=key===context?previousInputs:[],cached=heightDrafts.get(key);
  const retainedHeight=key!==context&&cached&&cached.saved===current.height;
  if(cached&&cached.saved!==current.height)heightDrafts.delete(key);
  else if(key!==context&&cached)drafts.push({...cached.draft,focused:false});
  while(heightDrafts.size>150)heightDrafts.delete(heightDrafts.keys().next().value);
  const detailsOpen=p.querySelector('#projectDetails')?.open||false;
  signature=next;context=key;lastEntity=JSON.parse(JSON.stringify(current));
  const details=`<details id="projectDetails"><summary class="btn">${tr('项目详情 / 高级','Project details / Advanced')}</summary>${overviewPanel()}</details>`;
  if (ui.sel?.kind === 'furn' && getF(ui.sel.id)){p.innerHTML=furnPanel(getF(ui.sel.id))+details;bindFurnPanel(getF(ui.sel.id));}
  else if(ui.sel?.kind==='room'&&project.geometry.rooms.some(r=>r.id===ui.sel.id)){p.innerHTML=roomPanel(store.getProject().geometry.rooms.find(r=>r.id===ui.sel.id))+details;bindRoomPanel();}
  else if(['wall','opening'].includes(ui.sel?.kind)){p.innerHTML=`<section class="muted">${tr('在上方编辑当前墙体或门窗。','Edit the selected wall or opening above.')}</section>`+details;}
  else {p.innerHTML=`<section class="empty-properties"><h3>${tr('属性','Properties')}</h3><p class="muted">${tr('选择房间、家具或门窗，查看并修改属性。','Select a room, furniture item or opening to edit its properties.')}</p><button class="btn" id="openRoomSettings">${tr('房间设置 / 门窗','Room settings / openings')}</button></section>`+details;$('#openRoomSettings').onclick=()=>actions.showStructure();}
  bindOverview();
  p.querySelector('#projectDetails').open=detailsOpen;
  const fields={fName:'name',fW:'w',fD:'d',fH:'height',fX:'cx',fY:'cy',fR:'rot',fC:'color',rName:'name'};
  restoreInputs(p,drafts,id=>{
    if(id==='fH'&&retainedHeight)return true;
    const zoneField=/^zUi(\d+)(Width|Depth|Offset)$/.exec(id);
    if(!zoneField)return prior[fields[id]]===current[fields[id]];
    const before=prior.useZones?.[+zoneField[1]],after=current.useZones?.[+zoneField[1]],field={Width:'widthMm',Depth:'depthMm',Offset:'offsetMm'}[zoneField[2]];
    return !!before&&!!after&&before.id===after.id&&before[field]===after[field];
  });syncUnitLock();
}

function overviewPanel(){
  const rows = store.getProject().geometry.rooms.map(r => {
    const st = store.getProject().rooms[r.id];
    return `<tr class="click" data-room="${r.id}"><td><button type="button" class="btn" data-select-room="${r.id}"><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(nm(st.name))}</button>${r.counted===false?' <span class="muted">*</span>':''}</td>
      <td class="r">${surface(roomArea(r))}</td></tr>`;
  }).join('');
  const tot = store.getProject().geometry.rooms.filter(r => r.counted !== false).reduce((a,r) => a + roomArea(r), 0);
  const byMat = {};
  store.getProject().geometry.rooms.forEach(r => { const m = store.getProject().rooms[r.id].mat; byMat[m] = (byMat[m]||0) + roomArea(r); });
  let cost = 0;
  const matRows = Object.entries(byMat).map(([m,a]) => { const c = a*MATS[m].price*1.05; cost += c;
    return `<tr><td><span class="sw" style="background:${MATS[m].sw}"></span>${nm(MATS[m].name,true)}</td><td class="r">${surface(a)}</td><td class="r">¥${Math.round(c).toLocaleString()}</td></tr>`; }).join('');
  const dem = store.getProject().demolished.map(id => store.getProject().geometry.walls[+id.slice(1)]);
  const demLen = dem.reduce((a,w) => a + Math.max(w[2]-w[0], w[3]-w[1]), 0) / 1000;
  return `
  <section><h3>${tr('房间面积','Room Areas')} <small>${tr('点击查看 / 更换地面','Click to view / change flooring')}</small></h3>
    <table>${rows}</table>
    <div class="total"><span>${tr('套内使用面积','Net floor area')}</span><b>${surface(tot)}</b></div>
    ${footprintArea(store.getProject().geometry)!==undefined?`<div class="total"><span>${tr('外轮廓面积（含墙体）','Footprint area (includes walls)')}</span><b>${surface(footprintArea(store.getProject().geometry))}</b></div>`:''}
    <div class="muted" style="font-size:11px;margin-top:4px">${tr('* 飘窗不计入使用面积；面积按墙体内净尺寸计算','* Bay windows are excluded; areas use net inner wall dimensions')}</div></section>
  ${LANG==='zh'&&store.getProject().units.display==='metric'?`<section><h3>${tr('地面材料估算','Flooring Estimate')} <small>${tr('含 5% 损耗，示例价：人民币/平方米','incl. 5% waste; example prices: CNY/m²')}</small></h3>
    <table>${matRows}</table>
    <div class="total"><span>${tr('地面材料合计','Flooring total')}</span><b>¥${Math.round(cost).toLocaleString()}</b></div></section>`:''}
  <section><h3>${tr('方案统计','Plan Stats')}</h3>
    <div class="stats"><div><small>${tr('家具数量','Furniture')}</small><span class="big">${store.getProject().furniture.length}</span></div>
      <div><small>${tr('拆除墙体','Walls removed')}</small><span class="big">${length(demLen*1000)}</span></div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${tr('清除测量','Clear measures')} (${store.getProject().measures.length})</button>
      </div></section>
  ${COARSE ? tr(`<section><h3>触屏操作</h3><div class="kbd">
    <kbd>单指拖动</kbd><span>空白处平移画面</span><kbd>双指</kbd><span>捏合缩放、拖动平移</span>
    <kbd>家具库</kbd><span>点一下放到画面中央，或按住向右拖到指定位置</span>
    <kbd>点家具</kbd><span>选中后拖动移动；拖顶部圆点旋转、右下方块改尺寸</span>
    <kbd>工具条</kbd><span>选中后底部可旋转 / 复制 / 删除</span>
    <kbd>测量</kbd><span>按住拖出一条线，或依次点两点</span>
    <kbd>3D 漫游</kbd><span>左下摇杆移动，拖动屏幕转向，点门开关</span>
  </div></section>`, `<section><h3>Touch Controls</h3><div class="kbd">
    <kbd>1-finger drag</kbd><span>Pan on empty space</span><kbd>2 fingers</kbd><span>Pinch to zoom, drag to pan</span>
    <kbd>Library</kbd><span>Tap to place at center, or hold and drag right to a spot</span>
    <kbd>Tap item</kbd><span>Drag to move; top dot rotates, bottom-right square resizes</span>
    <kbd>Toolbar</kbd><span>Bottom bar can rotate / duplicate / delete</span>
    <kbd>Measure</kbd><span>Hold and drag a line, or tap two points</span>
    <kbd>3D walk</kbd><span>Joystick moves, drag to look, tap doors to open</span>
  </div></section>`) : ''}
  ${tr(`<section><h3>键盘快捷键</h3><div class="kbd">
    <kbd>拖拽</kbd><span>左侧家具拖入平面图</span><kbd>V</kbd><span>选择 / 移动</span><kbd>M</kbd><span>测量（Shift 水平/垂直）</span>
    <kbd>X</kbd><span>拆改非承重墙（黑色为承重墙）</span><kbd>R</kbd><span>旋转 90°（Shift 反向）</span><kbd>方向键</kbd><span>微调 ${store.getProject().units.display==='imperial'?'1/4 in（Shift 1 in）':'10 mm（Shift 100 mm）'}</span>
    <kbd>⌘/Ctrl D</kbd><span>复制</span><kbd>Delete</kbd><span>删除</span><kbd>⌘/Ctrl Z</kbd><span>撤销</span><kbd>T</kbd><span>切换 2D / 3D</span><kbd>F</kbd><span>适应窗口</span><kbd>Esc</kbd><span>取消选择</span>
  </div></section>`, `<section><h3>Keyboard Shortcuts</h3><div class="kbd">
    <kbd>Drag</kbd><span>Drag furniture onto the plan</span><kbd>V</kbd><span>Select / move</span><kbd>M</kbd><span>Measure (Shift: horizontal/vertical)</span>
    <kbd>X</kbd><span>Demolish non-bearing walls (black = bearing)</span><kbd>R</kbd><span>Rotate 90° (Shift reverses)</span><kbd>Arrows</kbd><span>Nudge ${store.getProject().units.display==='imperial'?'1/4 in (Shift 1 in)':'10 mm (Shift 100 mm)'}</span>
    <kbd>⌘/Ctrl D</kbd><span>Duplicate</span><kbd>Delete</kbd><span>Delete</span><kbd>⌘/Ctrl Z</kbd><span>Undo</span><kbd>T</kbd><span>Toggle 2D / 3D</span><kbd>F</kbd><span>Fit to window</span><kbd>Esc</kbd><span>Deselect</span>
  </div></section>`)}`;
}
function bindOverview(){
  document.querySelectorAll('#projectDetails tr[data-room]').forEach(tr => tr.onclick = () => { select({kind:'room', id:tr.dataset.room}); if (is3D()) flyToRoom(tr.dataset.room); });
  $('#clearMeasure').onclick = () => store.getProject().measures.length && mutate(() => store.getProject().measures = []);

}

function renderFab(){
  const fab = $('#fab'), f = ui.sel?.kind === 'furn' && getF(ui.sel.id), r = ui.sel?.kind === 'room' && store.getProject().geometry.rooms.find(r => r.id === ui.sel.id);
  if (!f && !r){ fab.classList.remove('show'); return; }
  fab.innerHTML = f
    ? `<span class="name">${esc(nm(f.name))}</span><button class="btn" data-a="rotL" aria-label="${tr('逆时针旋转 90°','Rotate counterclockwise 90 degrees')}" title="${tr('逆时针旋转 90°','Rotate counterclockwise 90 degrees')}">↺</button><button class="btn" data-a="rotR">↻ ${tr('旋转','Rotate')}</button>
       <button class="btn" data-a="dup">${tr('复制','Duplicate')}</button><button class="btn danger" data-a="del">${tr('删除家具','Delete item')}</button><span class="sep"></span>
       <button class="btn narrow-only" data-a="prop">${tr('属性','Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(store.getProject().rooms[r.id].name))}</span><button class="btn narrow-only" data-a="prop">${tr('地面 / 属性','Floor / Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`;
  fab.classList.add('show');
  fab.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ({
    rotL:() => rotateSel(-90), rotR:() => rotateSel(90), dup:duplicateSel, del:deleteSel,
    prop:() => drawer('panel', true), done:() => { select(null); closeDrawers(); },
  })[b.dataset.a]());
}

function roomPanel(r){
  const st = store.getProject().rooms[r.id], a = roomArea(r), [x0,y0,x1,y1] = bbox(r.poly), inside = store.getProject().furniture.filter(f => f.cx>x0&&f.cx<x1&&f.cy>y0&&f.cy<y1);
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name,true)}</span></button>`).join('');
  return `<section><h3>${tr('房间','Room')}</h3>
    <button class="btn" id="roomDimensions">${tr('编辑净尺寸 / 门窗','Edit dimensions / openings')}</button><div class="form"><label class="full">${tr('名称','Name')}<input id="rName" maxlength="500" value="${esc(nm(st.name))}"></label></div>
    <label><input type="checkbox" id="hideRoomLabel" ${st.labelHidden?'checked':''}>${tr('隐藏此房间标签（含导出图）','Hide this room label (also in exports)')}</label><div class="stats" style="margin-top:10px">
      <div><small>${tr('使用面积','Floor area')}</small><span class="big">${surface(a)}</span></div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${length(perim(r.poly)*1000)}</span></div>
      <div><small>${tr('开间','Width')}</small><span class="big">${length(x1-x0)}</span></div>
      <div><small>${tr('进深','Depth')}</small><span class="big">${length(y1-y0)}</span></div></div>
    <div class="muted">${tr(`墙面面积（层高 ${length(store.getProject().geometry.height)}，未扣门窗）约 ${surface(perim(r.poly)*store.getProject().geometry.height/1000)}`, `Wall area (${length(store.getProject().geometry.height)} ceiling, openings not deducted) ≈ ${surface(perim(r.poly)*store.getProject().geometry.height/1000)}`)}</div></section>
  <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div>
    </section>
  <section><h3>${tr('房间内家具','Furniture in room')} <small>${tr(`${inside.length} 件`, `${inside.length} items`)}</small></h3>
    <table>${inside.map(f => `<tr class="click" data-fid="${f.id}"><td><button type="button" class="btn" data-select-furniture="${f.id}">${esc(nm(f.name))}</button></td><td class="r muted">${length(f.w,'inches')} × ${length(f.d,'inches')}</td></tr>`).join('') || `<tr><td class="muted">${tr('暂无','None')}</td></tr>`}</table>
    <div class="actions"><button class="btn" id="back">${tr('← 返回总览','← Back to overview')}</button></div></section>`;
}
function bindRoomPanel(){
  const id = ui.sel.id;
  $('#roomDimensions').onclick=()=>actions.showStructure();
  const updateRoom=patch=>{
    try{
      const p=store.getProject();if(p.roomEditor){const rooms=clone(p.rooms);Object.assign(rooms[id],patch);const next=updateRectangleProject(p,p.roomEditor,rooms);store.replaceProject(validate(next,CATALOGS));}
      else mutate(()=>Object.assign(store.getProject().rooms[id],patch));
    }catch(error){toast(tr('无法修改房间：','Cannot update room: ')+error.message);}
  };
  $('#hideRoomLabel').onchange=e=>updateRoom({labelHidden:e.target.checked});
  $('#rName').onchange = e => updateRoom({name:e.target.value.trim() || store.getProject().rooms[id].name});
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => updateRoom({mat:b.dataset.mat}));
  document.querySelectorAll('#panel tr[data-fid]').forEach(tr => tr.onclick = () => select({kind:'furn', id:tr.dataset.fid}));
  $('#back').onclick = () => select(null);
}

function furnPanel(f){
  return `<section><h3>${tr('家具属性','Furniture')}</h3>${f.type==='bed'?`<p class="muted">${tr('床垫示例尺寸不含床架；请按厂商实际外廓修改宽深。','Mattress example dimensions exclude the frame. Enter the manufacturer’s actual outer width and depth.')}</p>`:''}
    <div class="form">
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <h4 class="field-group">${tr('尺寸','Size')}</h4>
      ${lengthField('fW',tr('宽','Width'),f.w,store.getProject().units.display)}
      ${lengthField('fD',tr('深','Depth'),f.d,store.getProject().units.display)}
      ${lengthField('fH',tr('高度（可选）','Height (optional)'),f.height,store.getProject().units.display)}
      <p class="full muted">${tr('预设仅为示例。请填厂商完整外廓宽 / 深 / 高；不会推断来源。高度留空并离开字段恢复未指定，可撤销；未指定高度仅为造型示例。3D 包含装饰，按完整外廓缩放；以地面为底部，不表示实际安装高度。','Presets are examples. Enter the manufacturer’s full outer width, depth and height; dimensions are not verified. Leave height blank and leave the field to restore Unspecified (undoable). Unspecified height is a visual example. 3D includes decorative parts scaled within the outer dimensions, with its base at floor level; mounting elevation is not represented.')}</p>
      <h4 class="field-group">${tr('位置（家具中心）','Position (item center)')}</h4>
      ${lengthField('fX',tr('中心','Center')+' X',f.cx,store.getProject().units.display)}
      ${lengthField('fY',tr('中心','Center')+' Y',f.cy,store.getProject().units.display)}
      <h4 class="field-group">${tr('占地规则','Footprint rules')}</h4>
      <label class="full">${tr('通行阻挡','Passage footprint')}<select id="fPassage"><option value="solid" ${(f.clearance?.mode|| (f.type==='rug'?'ground':'solid'))==='solid'?'selected':''}>${tr('实体阻挡','Solid obstacle')}</option><option value="ground" ${(f.clearance?.mode|| (f.type==='rug'?'ground':'solid'))==='ground'?'selected':''}>${tr('地面覆盖（可跨越）','Floor covering (walkable)')}</option></select></label>
      <label class="full">${tr('显式嵌套于','Explicitly nested in')}<select id="fContainer"><option value="">${tr('无','None')}</option>${store.getProject().furniture.filter(g=>g.id!==f.id).map(g=>`<option value="${esc(g.id)}" ${f.clearance?.containerId===g.id?'selected':''}>${esc(nm(g.name))}</option>`).join('')}</select></label>
      <p class="full muted">${tr('仅完全包含且无嵌套链时豁免这一对重叠；外层仍阻挡通行。地面覆盖是假设，不代表高度避让。','Nesting exempts only this pair when fully contained, with no nesting chain. The container still blocks passage. Walkable covering is an explicit assumption, not a height check.')}</p>
      ${useZoneFields(f,store.getProject().units.display)}
      <h4 class="field-group">${tr('朝向与外观','Orientation and appearance')}</h4>
      <label>${tr('旋转','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15"></label>
      <label>${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="muted" style="margin-top:8px">${tr('占地面积','Footprint')} ${surface(f.w*f.d/1e6)}</div>
    <p data-wall-distances class="muted">${tr('最近墙 / 固定物距离：','Nearest wall / fixed footprint distances: ')}${furnitureDistances(store.getProject(),f.id).map(o=>`${esc(nm(o.name))} ${length(o.distanceMm)}`).join(' · ')}</p>
    <div class="actions">
      <button class="btn" id="aRot">${tr('旋转 90°','Rotate 90°')}</button><button class="btn" id="aDup">${tr('复制','Duplicate')}</button>
      <button class="btn" id="aTop">${tr('置于顶层','Bring to front')}</button><button class="btn" id="aBot">${tr('置于底层','Send to back')}</button>
      <button class="btn danger" id="aDel">${tr('删除家具','Delete item')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted" style="font-size:12px">${tr('拖动家具移动；上方圆点旋转；右下方块改尺寸。墙吸附仅影响拖动贴墙，关闭后仍按单位网格移动（公制 10 mm，英制 1/4 in）。中心 X/Y 输入精确保留，不吸附。', 'Drag to move; the top dot rotates; the bottom-right square resizes. Wall snap aligns dragged items to nearby wall edges. Off keeps the movement grid (Metric 10 mm; Imperial 1/4 in). Center X/Y inputs keep exact values without snapping.')}</section>`;
}
function bindFurnPanel(f){
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  bindUseZoneFields(f,store.getProject().units.display,upd,syncUnitLock);
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  for(const [id,key] of [['fW','w'],['fD','d'],['fH','height'],['fX','cx'],['fY','cy']]){
    const input=$('#'+id),binding=bindLengthField(input,f[key],store.getProject().units.display,()=>key==='height'?[Number.MIN_VALUE,1e7]:['w','d'].includes(key)?[50,1e7]:[-1e7,1e7],{optional:key==='height'});
    input.onfocus=()=>{ $('#projectUnits').disabled=true;$('#unitLock').textContent=tr('结束尺寸编辑后可切换','Finish dimension editing to change units'); };
    input.onblur=syncUnitLock;
    input.onchange=()=>{const result=binding.read();if(result.ok&&result.mm!==f[key])upd(g=>{if(result.mm===undefined)delete g[key];else g[key]=result.mm;});};
    input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();binding.reset();input.blur();}if(e.key==='Enter'){e.preventDefault();input.blur();}};
  }
  $('#fPassage').onchange=e=>upd(g=>g.clearance={...g.clearance,mode:e.target.value});
  $('#fContainer').onchange=e=>upd(g=>{g.clearance={mode:g.type==='rug'?'ground':'solid',...g.clearance};if(e.target.value)g.clearance.containerId=e.target.value;else delete g.clearance.containerId;});
  $('#fR').onchange=e=>{const v=Number(e.target.value);if(e.target.value.trim()&&Number.isFinite(v))upd(g=>g.rot=norm(v));};
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  $('#aRot').onclick = () => rotateSel(90);
  $('#aDup').onclick = duplicateSel;
  $('#aDel').onclick = deleteSel;
  $('#aTop').onclick = () => mutate(() => { const i = store.getProject().furniture.findIndex(g => g.id===f.id); store.getProject().furniture.push(...store.getProject().furniture.splice(i,1)); });
  $('#aBot').onclick = () => mutate(() => { const i = store.getProject().furniture.findIndex(g => g.id===f.id); store.getProject().furniture.unshift(...store.getProject().furniture.splice(i,1)); });
  $('#back').onclick = () => select(null);
}


return {update:renderPanel,resetDrafts(){heightDrafts.clear();context=signature=undefined;renderPanel();},dispose(){heightDrafts.clear(); $("#panel").replaceChildren(); $("#fab").replaceChildren(); }};
}
