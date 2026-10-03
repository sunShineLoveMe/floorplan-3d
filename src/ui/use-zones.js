import {useZoneReport,USE_ZONE_KINDS,USE_ZONE_SIDES} from '../core/use-zones.js';
import {formatLengthMm,formatAreaM2} from '../core/units.js';
import {lengthField,bindLengthField} from './length-field.js';
import {$,esc} from './dom.js';
import {tr,nm,LANG} from './i18n.js';
const kindNames=()=>[tr('床侧','Bed-side access'),tr('座椅','Seating use'),tr('柜门','Cabinet-door envelope'),tr('电器','Appliance use')];
const sideNames=()=>[tr('上边（局部 −Y）','Top (local −Y)'),tr('右边（局部 +X）','Right (local +X)'),tr('下边（局部 +Y）','Bottom (local +Y)'),tr('左边（局部 −X）','Left (local −X)')];
const options=(values,names,current)=>values.map((v,i)=>`<option value="${v}" ${v===current?'selected':''}>${names[i]}</option>`).join('');
export function useZoneFields(f,units){
 return `<h4 class="field-group">${tr('使用区假设','Use-zone assumptions')}</h4><p class="full muted">${tr('显式矩形规划包络，不推断铰链扫掠或高度。侧边随家具旋转，区尺寸保持独立；偏移沿上/下边 +X 或左/右边 +Y。各区单独复核，不验证同时使用或可达性。','Explicit rectangular planning envelopes; hinges and height are not inferred. Sides rotate with the item; zone sizes stay independent. Offset runs along +X on top/bottom or +Y on left/right. Zones are checked separately, without concurrent-use or access validation.')}</p>${(f.useZones||[]).map((z,i)=>`<div class="full use-zone-fields" data-zone-editor="${z.id}"><strong>${tr('使用区','Use zone')} ${i+1}</strong><div class="form"><label>${tr('用途','Purpose')}<select id="zUi${i}Kind">${options(USE_ZONE_KINDS,kindNames(),z.kind)}</select></label><label>${tr('所在侧边','Item side')}<select id="zUi${i}Side">${options(USE_ZONE_SIDES,sideNames(),z.side)}</select></label>${lengthField('zUi'+i+'Width',tr('沿边宽度','Width along edge'),z.widthMm,units)}${lengthField('zUi'+i+'Depth',tr('外伸深度','Depth outward'),z.depthMm,units)}${lengthField('zUi'+i+'Offset',tr('沿边偏移','Offset along edge'),z.offsetMm,units)}</div><button type="button" class="btn danger" id="zUi${i}Remove">${tr('移除使用区','Remove zone')}</button></div>`).join('')}<label class="full">${tr('添加用途','Add purpose')}<select id="useZoneKind">${options(USE_ZONE_KINDS,kindNames(),'bed-side')}</select></label><button type="button" class="btn full" id="useZoneAdd" ${(f.useZones||[]).length>=16?'disabled':''}>${tr('添加使用区（示例 600 × 600 mm）','Add use zone (example 600 × 600 mm)')}</button>`;
}
export function bindUseZoneFields(f,units,upd,syncUnitLock){
 $('#useZoneAdd').onclick=()=>upd(g=>{g.useZones=[...(g.useZones||[]),{id:'uz-'+window.crypto.randomUUID(),kind:$('#useZoneKind').value,side:'bottom',widthMm:600,depthMm:600,offsetMm:0}];});
 (f.useZones||[]).forEach((z,i)=>{
  const patch=fn=>upd(g=>{const current=g.useZones?.find(v=>v.id===z.id);if(current)fn(current);});
  $('#zUi'+i+'Kind').onchange=e=>patch(v=>v.kind=e.target.value);
  $('#zUi'+i+'Side').onchange=e=>patch(v=>v.side=e.target.value);
  $('#zUi'+i+'Remove').onclick=()=>upd(g=>{g.useZones=g.useZones.filter(v=>v.id!==z.id);if(!g.useZones.length)delete g.useZones;});
  for(const [suffix,key]of [['Width','widthMm'],['Depth','depthMm'],['Offset','offsetMm']]){
   const input=$('#zUi'+i+suffix),binding=bindLengthField(input,z[key],units,()=>key==='offsetMm'?[-10000,10000]:[1,10000]);
   input.onfocus=syncUnitLock;input.onblur=syncUnitLock;
   input.onchange=()=>{const result=binding.read();if(result.ok)patch(v=>v[key]=result.mm);};
   input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();binding.reset();input.blur();}if(e.key==='Enter'){e.preventDefault();input.blur();}};
  }
 });
}
export function createUseZones({store,locate,locatePoint}){
 let signature,report={zones:[]},show=true;
 function overlay(){
  $('#gUseZones').innerHTML=show?report.zones.map(z=>`<polygon data-use-zone="${esc(z.zoneId)}" data-zone-status="${z.status}" points="${z.poly.map(p=>p.join(',')).join(' ')}" fill="${z.status==='clear'?'#168468':'#d34a32'}" fill-opacity="0.13" stroke="${z.status==='clear'?'#168468':'#d34a32'}" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`).join(''):'';
 }
 return {update(){
  const p=store.getProject(),key=JSON.stringify([p.id,p.geometry,p.furniture,p.demolished,p.clearance,p.units.display,LANG]);if(signature===key)return;signature=key;report=useZoneReport(p);overlay();
  const root=$('#useZonePanel'),wasOpen=root.querySelector('details')?.open||false,length=n=>esc(formatLengthMm(n,p.units.display)),area=n=>esc(formatAreaM2(n/1e6,p.units.display));
  const blocked=report.zones.filter(z=>z.status==='conflict').length;
  root.innerHTML=`<section><details id="useZoneDetails" ${wasOpen?'open':''}><summary>${tr('家具使用区','Furniture use zones')} · ${blocked} / ${report.zones.length} ${tr('需复核','to review')}</summary><p class="muted">${tr('在家具属性中显式添加。红色虚线：实体重叠或超出净地面；绿色：本次平面检查无冲突。接触不算重叠。区之间的同时使用、实际开门与高度关系未验证。门叶沿用上方规划门状态。','Add explicitly in Furniture properties. Red dashes: solid overlap or outside net floor. Green: clear in this plan check. Contact is not overlap. Concurrent use, actual door motion and height relationships are unverified. Door leaves use the Passage door assumption above.')}</p><label><input id="showUseZones" type="checkbox" ${show?'checked':''}>${tr('在 2D 显示所有使用区','Show all use zones in 2D')}</label>${report.zones.length?'':`<p class="muted">${tr('尚未声明使用区。未配置不代表可使用。','No use zones declared. An unconfigured item is not verified for use.')}</p>`}${report.zones.map((z,i)=>`<div class="use-zone-result" data-zone-result="${esc(z.zoneId)}" data-state="${z.status}"><button class="btn" data-zone-locate="${i}">${esc(nm(p.furniture.find(f=>f.id===z.furnitureId).name))} · ${kindNames()[USE_ZONE_KINDS.indexOf(z.kind)]} · ${length(z.widthMm)} × ${length(z.depthMm)} · ${z.status==='clear'?tr('平面无冲突','Clear in plan'):tr('需复核','Review')}</button>${z.conflicts.map(c=>`<p class="muted">${esc(nm(c.name))} · ${c.kind==='floor'?tr('净地面外面积','Outside net floor'):tr('重叠面积','Overlap area')}: ${area(c.overlapMm2)}</p>`).join('')}</div>`).join('')}</details></section>`;
  $('#showUseZones').onchange=e=>{show=e.target.checked;overlay();};
  root.querySelectorAll('[data-zone-locate]').forEach(b=>b.onclick=async()=>{const z=report.zones[+b.dataset.zoneLocate];show=true;$('#showUseZones').checked=true;overlay();await locate(z.furnitureId);await locatePoint(z.poly.reduce((v,p)=>[v[0]+p[0]/4,v[1]+p[1]/4],[0,0]));});
 },dispose(){$('#useZonePanel').replaceChildren();$('#gUseZones').replaceChildren();}};
}
