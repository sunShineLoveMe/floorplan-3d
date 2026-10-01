import {formatLengthMm,formatAreaM2,formatEditLengthMm} from '../../../src/core/units.js';
import {LIB} from '../../../src/data/catalogs.js';
import {furnSVG} from '../../../src/editor2d/furniture-symbols.js';

// Presentation-only draft: no production store, storage, engine or editor imports.
const project=await (await fetch('../../verification/UI-000/baseline-project.json')).json();
const $=s=>document.querySelector(s),editor=$('#editor');
const params=new URLSearchParams(location.search),capture=params.has('capture');
let selection=params.get('state')||'none',tab=params.get('tab')||'room',units='imperial';
let previewWidth=Number(params.get('width')||1440),lastTrigger=null,furnitureId='ui-bed';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const length=mm=>formatLengthMm(mm,units);
const edit=mm=>formatEditLengthMm(mm,units);
const unitLabel=()=>units==='imperial'?'in':'mm';
const field=(label,value,full=false)=>`<label class="field ${full?'full':''}">${esc(label)}<input value="${esc(value)}" readonly></label>`;
function layout(){
 if(capture){document.body.classList.add('capture');previewWidth=innerWidth;}
 const height=previewWidth>=1440?900:previewWidth>=1224?800:768;
 const available=capture?innerWidth:Math.max(320,innerWidth-40),scale=Math.min(1,available/previewWidth);
 editor.style.width=previewWidth+'px';editor.style.height=height+'px';editor.style.transform=`scale(${scale})`;
 $('.preview-wrap').style.width=previewWidth*scale+'px';$('.preview-wrap').style.height=height*scale+'px';
 const compact=previewWidth-280-304<640;editor.classList.toggle('compact',compact);
 $('#showLibrary').hidden=!editor.classList.contains('hide-library');
 $('#layoutNote').textContent=compact?'属性使用可关闭抽屉；画布保留原容器':`双栏：画布 ${previewWidth-584}px；可手动收起`;
}
function setTab(next){tab=next;$('#roomTab').setAttribute('aria-selected',String(tab==='room'));$('#furnitureTab').setAttribute('aria-selected',String(tab==='furniture'));$('#roomResources').hidden=tab!=='room';$('#furnitureResources').hidden=tab!=='furniture';}
function choose(next){selection=next;$('#previewState').value=next;editor.classList.remove('hide-inspector');if(editor.classList.contains('compact'))editor.classList.add('inspector-open');render();}
function render(){
 $('#roomArea').textContent=formatAreaM2(12,units);
 renderCards();
 let content='',title='Properties';
 const unit=`<div class="unit-line"><span>Units: ${units==='imperial'?'Feet & inches':'Metric'}</span><button data-settings>Change</button></div>`;
 if(selection==='none')content=`<div class="empty"><div class="empty-symbol" aria-hidden="true"></div><h3>Make room for your ideas</h3><p>Select a room, furniture item, door or window to see its properties here.</p><button class="block" data-choose="room">View room details</button></div>`;
 if(selection==='room'){
  title='Room properties';content=`<p class="object-type">Rectangular room</p><h3 class="object-name">UI baseline bedroom</h3>${unit}<section><h3>Room dimensions</h3><div class="fields">${field('Net width',length(4000))}${field('Net depth',length(3000))}${field('Ceiling height',length(2800),true)}</div><button class="block" data-edit="room" style="margin-top:16px">Edit room dimensions</button><p class="small">Furniture keeps its current coordinates when dimensions change.</p></section><section><h3>Floor area</h3><p class="metric-value">${formatAreaM2(12,units)}</p></section><section><h3>Flooring</h3><div class="fields">${field('Material','Oak flooring',true)}</div></section>`;
 }
 if(selection==='furniture'){
  const f=project.furniture.find(f=>f.id===furnitureId);title='Furniture properties';content=`<p class="object-type">Furniture</p><h3 class="object-name">${esc(f.name)}</h3>${unit}<section><h3>Size</h3><div class="fields">${field('Width ('+unitLabel()+')',edit(f.w))}${field('Depth ('+unitLabel()+')',edit(f.d))}</div><p class="small">Footprint ${formatAreaM2(f.w*f.d/1e6,units)}</p></section><section><h3>Position & rotation</h3><div class="fields">${field('Center X ('+unitLabel()+')',edit(f.cx))}${field('Center Y ('+unitLabel()+')',edit(f.cy))}${field('Rotation (°)','0')}</div></section><section><h3>Appearance</h3><div class="fields">${field('Name',f.name,true)}<label class="field full">Color<input type="color" value="${f.color}" disabled></label></div></section><section><h3>Object actions</h3><div class="object-actions"><button disabled>Rotate 90°</button><button disabled>Duplicate</button><button disabled>Bring to front</button><button disabled>Send to back</button><button class="danger" disabled>Delete item</button><button data-choose="none">Deselect</button></div></section>`;
 }
 if(selection==='door'||selection==='window'){
  const door=selection==='door',o=project.roomEditor.openings.find(o=>o.type===selection);title=door?'Door properties':'Window properties';content=`<p class="object-type">${door?'Door':'Window'}</p><h3 class="object-name">${door?'Top wall door':'Right wall window'}</h3>${unit}<div class="opening-context">${door?'Top wall · left → right':'Right wall · top → bottom'}<small>Offset is measured from the wall start to the opening start.</small></div><section><h3>Opening</h3><div class="fields">${field('Width',length(o.width))}${field('Height',length(o.height))}${field('Offset from wall start',length(o.offset),true)}${door?field('Hinge','At wall start')+field('Swing','Inward'):field('Sill height',length(o.sill),true)}</div><button class="block" data-edit="${selection}" style="margin-top:16px">Edit ${selection}</button></section><section><h3>Object actions</h3><div class="object-actions"><button class="danger" disabled>Delete ${selection}</button><button data-choose="none">Deselect</button></div></section>`;
 }
 $('#inspectorTitle').textContent=title;$('#inspectorContent').innerHTML=content;
 $('#inspectorContent').querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>choose(b.dataset.choose));
 $('#inspectorContent').querySelectorAll('[data-settings]').forEach(b=>b.onclick=()=>openDialog('settings',b));
 $('#inspectorContent').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openDialog(b.dataset.edit,b));
 drawPlan();
}
function drawPlan(){
 const g=project.geometry,wallColor='#747f77',selColor='#245c4b';
 const furniture=project.furniture.map(f=>`<g data-object="furniture" data-id="${f.id}" tabindex="0" role="button" aria-label="Select ${esc(f.name)}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type,f.w,f.d,f.color)}${selection==='furniture'&&f.id===furnitureId?`<rect x="${-f.w/2-32}" y="${-f.d/2-32}" width="${f.w+64}" height="${f.d+64}" rx="20" fill="none" stroke="${selColor}" stroke-width="14"/>`:''}</g>`).join('');
 const walls=g.walls.map(w=>`<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="${wallColor}"/>`).join('');
 const win=g.windows[0].rect;
 $('#planPreview').innerHTML=`<title>UI baseline bedroom</title><desc>Measured 4 by 3 metre room. Select the bed, room floor, upper door or right window to inspect the proposed property panel.</desc><rect data-object="room" tabindex="0" role="button" aria-label="Select room" width="4000" height="3000" fill="#e1d5bf" rx="4"/>${furniture}${walls}<g data-object="door" role="button" tabindex="0" aria-label="Select door"><rect x="470" y="-150" width="960" height="330" fill="transparent"/><path d="M 500 0 V 900 M 1400 0 A 900 900 0 0 1 500 900" stroke="${selection==='door'?selColor:'#657167'}" stroke-width="${selection==='door'?18:10}" fill="none"/><circle cx="500" cy="0" r="24" fill="${selColor}"/></g><g data-object="window" role="button" tabindex="0" aria-label="Select window"><rect x="${win[0]}" y="${win[1]}" width="${win[2]-win[0]}" height="${win[3]-win[1]}" fill="#d5e6e8" stroke="${selection==='window'?selColor:'#6d8a8e'}" stroke-width="${selection==='window'?18:8}"/></g><g font-family="-apple-system, sans-serif" font-size="80" fill="#59645d" text-anchor="middle"><path d="M 0 -260 H 4000 M 0 -310 V -210 M 4000 -310 V -210 M -260 0 V 3000 M -310 0 H -210 M -310 3000 H -210" stroke="#7c877f" stroke-width="8" fill="none"/><text x="2000" y="-370">${esc(length(4000))}</text><text transform="translate(-370 1500) rotate(-90)">${esc(length(3000))}</text></g><text x="3700" y="2750" text-anchor="end" font-size="70" fill="#59645d">${esc(formatAreaM2(12,units))}</text>`;
 $('#planPreview').querySelectorAll('[data-object]').forEach(el=>{const activate=()=>{if(el.dataset.id)furnitureId=el.dataset.id;choose(el.dataset.object);};el.onclick=activate;el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();activate();}};});
}
function openDialog(kind,trigger){
 lastTrigger=trigger;let content='';const close='<button data-close>Cancel</button>';
 if(kind==='new'||kind==='room')content=`<h2>${kind==='new'?'New room plan':'Edit room dimensions'}</h2><p>${kind==='new'?'Creating a new rectangular room replaces the current project. This can be undone. Export your current project first if you need a separate backup.':'Furniture and measurements keep their coordinates. Review their positions after changing the room.'}</p><div class="fields">${field('Name',kind==='new'?'My room':'UI baseline bedroom',true)}${field('Net width ('+unitLabel()+')',edit(4000))}${field('Net depth ('+unitLabel()+')',edit(3000))}${field('Ceiling height ('+unitLabel()+')',edit(2800),true)}</div>${kind==='new'?'<p class="dialog-note">This replaces the whole project; it does not add another room.</p>':''}<div class="dialog-actions">${kind==='new'?'<button disabled>Export current project</button>':''}${close}<button class="primary" disabled>${kind==='new'?'Create and replace':'Apply'}</button></div>`;
 if(kind==='door'||kind==='window'){
  const o=project.roomEditor.openings.find(o=>o.type===kind);content=`<h2>Edit ${kind}</h2><p>Change the opening within its parent wall.</p><div class="direction">${kind==='door'?'Top wall · top-left → top-right':'Right wall · top-right → bottom-right'}</div><div class="fields">${field('Wall',kind==='door'?'Top':'Right',true)}${field('Offset ('+unitLabel()+')',edit(o.offset))}${field('Width ('+unitLabel()+')',edit(o.width))}${field('Height ('+unitLabel()+')',edit(o.height))}${kind==='window'?field('Sill height ('+unitLabel()+')',edit(o.sill)):field('Hinge','Start')+field('Swing','Inward')}</div><p class="small">Offset follows the wall direction shown above. Keep at least 1 mm from corners and other openings; this is a geometry limit.</p><div class="dialog-actions">${close}<button class="primary" disabled>Apply</button></div>`;
 }
 if(kind==='settings')content=`<h2>Project settings</h2><div class="fields"><label class="field full">Display units<select id="draftUnits"><option value="imperial">Feet &amp; inches</option><option value="metric">Metric</option></select></label>${field('Language','English',true)}</div><p class="small">Display units and language are independent.</p><div class="dialog-actions"><button data-close>Close</button></div>`;
 $('#dialogContent').innerHTML=content;$('#dialogContent').querySelector('[data-close]').onclick=()=>$('#previewDialog').close();
 if(kind==='settings'){$('#draftUnits').value=units;$('#draftUnits').onchange=e=>{units=e.target.value;render();};}
 $('#previewDialog').showModal();
}
const names=['Double bed','Double bed','Single bed','Crib','Nightstand','Wardrobe','Desk','Chair'];
const cards=[...LIB[0].items.slice(0,6),LIB[0].items[8],LIB[0].items[9]];
function renderCards(){
 $('#furnitureCards').innerHTML=cards.map((it,i)=>`<article><div class="thumb"><svg viewBox="${-it[2]*.58} ${-it[3]*.58} ${it[2]*1.16} ${it[3]*1.16}" aria-label="${esc(names[i])} catalog symbol">${furnSVG(it[0],it[2],it[3],it[4])}</svg></div><strong>${names[i]}</strong><small>W ${esc(formatLengthMm(it[2],units,{style:'inches'}))}</small><small>D ${esc(formatLengthMm(it[3],units,{style:'inches'}))}</small></article>`).join('');
}
$('#previewWidth').value=String(previewWidth);$('#previewWidth').onchange=e=>{previewWidth=Number(e.target.value);editor.classList.remove('hide-library','hide-inspector','inspector-open');layout();};
$('#previewState').value=selection;$('#previewState').onchange=e=>choose(e.target.value);
document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setTab(e.key==='Home'?'room':e.key==='End'?'furniture':tab==='room'?'furniture':'room');$(tab==='room'?'#roomTab':'#furnitureTab').focus();});
$('#roomTab').onclick=()=>setTab('room');$('#furnitureTab').onclick=()=>setTab('furniture');$('#selectRoom').onclick=()=>choose('room');
document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>choose(b.dataset.select));
$('#hideLibrary').onclick=()=>{editor.classList.add('hide-library');layout();};$('#showLibrary').onclick=()=>{editor.classList.remove('hide-library');layout();};
$('#hideInspector').onclick=()=>{editor.classList.add('hide-inspector');editor.classList.remove('inspector-open');layout();};$('#showInspector').onclick=()=>{editor.classList.remove('hide-inspector');editor.classList.toggle('inspector-open');layout();};
$('#newPlanButton').onclick=e=>openDialog('new',e.currentTarget);$('#settingsButton').onclick=e=>openDialog('settings',e.currentTarget);
$('#previewDialog').addEventListener('close',()=>{lastTrigger?.focus();lastTrigger=null;});
$('#fileButton').onclick=()=>{const open=$('#fileMenu').hidden;$('#fileMenu').hidden=!open;$('#fileButton').setAttribute('aria-expanded',String(open));};
$('#viewOptions').onclick=()=>$('#viewPopover').hidden=!$('#viewPopover').hidden;
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#fileMenu,#fileButton')){$('#fileMenu').hidden=true;$('#fileButton').setAttribute('aria-expanded','false');}if(!e.target.closest('#viewPopover,#viewOptions'))$('#viewPopover').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||$('#previewDialog').open)return;if(!$('#fileMenu').hidden){$('#fileMenu').hidden=true;$('#fileButton').setAttribute('aria-expanded','false');$('#fileButton').focus();return;}if(!$('#viewPopover').hidden){$('#viewPopover').hidden=true;$('#viewOptions').focus();return;}if(editor.classList.contains('compact')&&editor.classList.contains('inspector-open')){editor.classList.remove('inspector-open');$('#showInspector').focus();}});
window.addEventListener('resize',layout);layout();setTab(tab);render();
