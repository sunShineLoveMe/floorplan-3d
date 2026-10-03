import {asHouse,sideOf,wallWidth,wallSegments,hasFullWallSegment} from '../data/house-editor.js';
import {formatLengthMm} from '../core/units.js';
import {lengthField,bindLengthField} from './length-field.js';
import {$,esc} from './dom.js';
import {tr} from './i18n.js';
import {createScope} from './lifecycle.js';
import {clone,createRectangleProject,updateRectangleProject,validate} from '../data/project-data.js';
import {CATALOGS} from '../data/catalogs.js';
import {uid} from '../data/default-project.js';

/** Forms own drafts only. Validation completes before any selection or store change. */
export function createRoomEditor({store,ui,actions,cancelInteraction,exportProject,isSwitching,toast}) {
  const scope=createScope(),host=$('#structurePanel');
  const dialog=document.createElement('dialog');dialog.id='roomDialog';dialog.className='room-dialog';document.body.append(dialog);
  let editing=null,opener;
  dialog.setAttribute('aria-labelledby','roomDialogTitle');
  scope.on(dialog,'close',()=>{const target=opener?.isConnected&&opener.getClientRects().length?opener:opener?.closest('details')?.querySelector('summary')||($('#editRoom').getClientRects().length?$('#editRoom'):$('#tgPanel'));target.focus({preventScroll:true});});
  function errorMessage(error){
    let message=error.message;
    const phrases=[['Diagonal wall is too thick for the cut distances and adjoining walls.','斜墙过厚，请增大切入距离或核对相接墙厚。'],['Diagonal wall thickness must be 0–1000 mm.','斜墙厚须为 0–1000 mm。'],['Invalid corner cut shape.','切角形状无效。'],['Opening must fit on a remaining straight wall, outside the diagonal cut.','门窗须位于剩余直墙上，不能进入斜切角。'],['Fixed obstacle must fit within the room.', '固定障碍物必须位于房间内。'],['Fixed obstacle must fit within the usable floor, outside the notch.', '固定障碍物必须位于净地面内，不能进入角部缺口。'],['Fixed obstacles overlap.', '固定障碍物重叠。'],['Fixed obstacle height must be 100 mm to the floor ceiling height.', '固定障碍物高度须为 100 mm 至本层净高。'],['Fixed obstacles must leave usable floor area.', '固定障碍物须留下可用地面。'],['Use at most 20 fixed obstacles per room.', '每个房间最多 20 个固定障碍物。'],['Use at most 300 fixed obstacles per floor.', '每层最多 300 个固定障碍物。'],['Wall segment must fit within its parent wall.','墙段必须位于所属墙范围内。'],['Wall segment height must be 100 mm to the floor ceiling height.','墙段高度须为 100 mm 至本层净高。'],['Wall segments overlap.','墙段重叠。'],['Doors and windows require a continuous full-height segment, with 1 mm clearance at each end.','门窗须位于连续的全高墙段内，距墙段两端至少 1 mm。'],['Set a positive wall thickness before adding segments.','添加墙段前请设置大于 0 的墙厚。'],['Use at most 20 segments per wall.','每侧墙最多 20 段。'],['Use at most 300 wall segments per floor.','每层最多 300 个墙段。'],['outside parent wall','超出所属墙长度'],['window head exceeds room height','窗顶超过房间净高'],['overlaps or is less than 1 mm from','与下列洞口重叠或间距不足 1 mm：'],['roomEditor.width','房间净宽'],['roomEditor.depth','房间净深'],['roomEditor.height','房间净高'],[' offset',' 距起点'],[' width',' 洞口宽'],[' height',' 洞口高'],[' sill',' 窗台高']];
    for(const [en,zh]of phrases)message=message.replace(en,tr(zh,en));
    const p=store.getProject();for(const o of p.roomEditor?.openings||[])message=message.replaceAll('opening '+o.id,(o.type==='door'?tr('门','Door'):tr('窗','Window')) );
    for(const o of p.roomEditor?.openings||[])message=message.replaceAll(o.id,o.type==='door'?tr('门','door'):tr('窗','window'));
    return message.replace(/opening-[A-Za-z0-9_-]+/g,tr('洞口','opening'));
  }
  const doorModes=()=>[['swing',tr('平开门','Swing door')],['sliding',tr('推拉门','Sliding door')],['bifold',tr('折叠门','Bi-fold door')],['passage',tr('开放洞口','Open passage')]];
  const openingName=o=>o.type==='window'?tr('窗','Window'):doorModes().find(([v])=>v===(o.mode??'swing'))[1];
  const walls=()=>[['top',tr('上墙 · 左上 → 右上','Top · top-left → top-right')],['right',tr('右墙 · 右上 → 右下','Right · top-right → bottom-right')],['bottom',tr('下墙 · 左下 → 右下','Bottom · bottom-left → bottom-right')],['left',tr('左墙 · 左上 → 左下','Left · top-left → bottom-left')]];
  const length=mm=>formatLengthMm(mm,store.getProject().units.display);
  let fieldsByName={};
  const number=(key,label,value)=>{editing.original[key]=value;return lengthField(key,label,value,store.getProject().units.display);};
  function unlock(){ $('#projectUnits').disabled=false;$('#unitLock').textContent=''; }
  const choice=(key,label,value,options)=>`<label>${label}<select name="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></label>`;
  function close(){dialog.close();editing=null;unlock();}
  function open(kind,id,trigger){
    if(isSwitching())return;
    opener=document.activeElement===document.body?trigger:document.activeElement;
    cancelInteraction();
    const p=store.getProject(),raw=p.roomEditor,r=raw?.kind==='house'?raw.rooms.find(r=>r.id===(ui.sel?.kind==='room'?ui.sel.id:ui.activeRoom))||raw.rooms[0]:raw;
    if(r)ui.activeRoom=r.id||r.roomId;
    if(kind!=='new'&&!r)return;
    editing={kind,id,projectId:p.id,original:{}};
    let fields='',title='',hint='';
    if(['new','room','add'].includes(kind)){
      const v=kind!=='room'?{...(p.units.display==='imperial'?{width:3657.6,depth:3048,height:2438.4}:{width:4000,depth:3000,height:2800}),height:kind==='add'?p.geometry.height:p.units.display==='imperial'?2438.4:2800,x:r?r.x??0:0,y:r?(r.y??0)+r.depth+Math.max(120,wallWidth(r,'bottom')):0}:{...r,height:p.geometry.height};
      title=kind==='add'?tr('添加房间','Add room'):kind==='new'?tr('新建矩形房间','New rectangular room'):tr('编辑房间','Edit room');
      const name=kind!=='room'?tr('我的房间','My room'):p.rooms[r.id||r.roomId].name;
      fields=`<label class="full">${tr('名称','Name')}<input name="name" maxlength="500" required value="${esc(name)}"></label>`+number('width',tr('室内净宽 X','Net width X'),v.width)+number('depth',tr('室内净深 Y','Net depth Y'),v.depth)+number('height',raw?.kind==='house'||kind==='add'?tr('本层净高（所有房间）','Floor ceiling height (all rooms)'):tr('室内净高','Net height'),v.height);
      if(kind==='add'||kind==='room'&&raw?.kind==='house')fields+=number('x',tr('左上角 X','Top-left X'),v.x)+number('y',tr('左上角 Y','Top-left Y'),v.y);
      fields+=`<fieldset class="full"><legend>${tr('每侧墙厚（0 表示开放边界）','Wall thickness by side (0 = open boundary)')}</legend><div class="form">${walls().map(([side,label])=>number('wall-'+side,label,kind==='room'?wallWidth(r,side):120)).join('')}</div></fieldset>`;
      fields+=`<fieldset class="full"><legend>${tr('角部缺口 / 斜切角','Corner notch / diagonal cut')}</legend>${choice('notch-corner',tr('缺口位置','Notch corner'),kind==='room'?r.notch?.corner??'none':'none',[['none',tr('无','None')],['top-left',tr('左上','Top left')],['top-right',tr('右上','Top right')],['bottom-left',tr('左下','Bottom left')],['bottom-right',tr('右下','Bottom right')]])}<div class="form">${choice('notch-shape',tr('切角形状','Corner shape'),r?.notch?.shape==='diagonal'&&kind==='room'?'diagonal':'rectangle',[['rectangle',tr('矩形缺口','Rectangular notch')],['diagonal',tr('斜切角','Diagonal cut')]])+number('notch-wall',tr('斜墙厚（0 为开放）','Diagonal wall thickness (0 = open)'),kind==='room'?r.notch?.wallThickness??120:120)+number('notch-width',tr('缺口宽','Notch width'),kind==='room'?r.notch?.width??304.8:304.8)}${number('notch-depth',tr('缺口深','Notch depth'),kind==='room'?r.notch?.depth??304.8:304.8)}</div><p>${tr('矩形缺口用于衣柜等空间，需编辑外框墙段；斜切角扣除三角形并生成斜向边界。按实测输入 X/Y 切入距离，直墙门窗不能进入切角。','Rectangle removes a corner for a closet or laundry space; edit its bounding wall segments. Diagonal removes a triangle and builds its angled boundary. Enter measured cut distances along X/Y. Straight-side openings must stay outside the cut.')}</p></fieldset>`;
      hint=tr(`宽/深 ${length(100)}–${length(100000)}；高 ${length(100)}–${length(20000)}。每侧墙厚可设为 0–1000 mm，0 为开放边界。`,`Width/depth ${length(100)}–${length(100000)}; height ${length(100)}–${length(20000)}. Each wall can be 0–1000 mm thick; 0 creates an open boundary.`);
      hint+=' '+(kind==='add'?tr('添加到当前项目，不替换已有房间。相邻净空间按对应墙厚留间距；开放相接须双方墙厚均为 0。默认接在当前房间下方。','Adds to this project. Leave the larger facing wall thickness between net spaces. Set both facing sides to 0 to join open spaces. Default position is below the current room.'):kind==='new'?tr('以上为示例初值，请按实测修改。创建将替换当前方案，可撤销；建议先导出备份。','These are example values; enter your measurements. Creating replaces the current plan and can be undone. Export a backup first.'):tr('家具和测量保留绝对坐标，请复核位置；超出父墙或房高的门窗会阻止提交。','Furniture and measurements keep their coordinates; review their positions. Openings outside the wall or ceiling block this change.'));
    }else if(kind==='obstacle'){
      const o=id?r.obstacles?.find(o=>o.id===id):{name:tr('固定柱 / 凸入','Fixed column / intrusion'),x:0,y:0,height:p.geometry.height};if(!o)return;
      title=id?tr('编辑固定障碍物','Edit fixed obstacle'):tr('添加固定障碍物','Add fixed obstacle');
      hint=tr('填写实测宽、深；X/Y 从房间室内左上角到障碍物左上角。固定占地扣除净面积，并检查家具和门扇冲突。原图未标注时请保留未知；不要用图示家具估计尺寸。','Enter measured width/depth; X/Y run from the room interior top-left to the obstacle top-left. Fixed footprints reduce usable area and are checked against furniture and door swings. Keep unlabelled dimensions unknown; pictured furniture does not establish measurements.');
      fields=`<label class="full">${tr('名称','Name')}<input name="name" maxlength="500" required value="${esc(o.name)}"></label>`+number('width',tr('固定占地宽 X','Fixed footprint width X'),o.width)+number('depth',tr('固定占地深 Y','Fixed footprint depth Y'),o.depth)+number('x',tr('距室内左边 X','From interior left X'),o.x)+number('y',tr('距室内上边 Y','From interior top Y'),o.y)+number('height',tr('障碍物高度','Obstacle height'),o.height);
    }else if(kind==='wall'){
      const side=ui.lastWall||'top',L=['top','bottom'].includes(side)?r.width:r.depth;
      editing.side=side;editing.segmentSerial=0;
      title=tr('编辑墙段 / 半高墙','Edit wall segments / pony wall');
      hint=tr('沿所选墙的起点方向填写墙段。墙段之间的空隙为通道；高度低于层高为半高墙。共享边界合并两侧墙体，要开放通道或降低墙高请同时调整两侧。门窗仅可位于完整层高墙段内，距墙段两端至少 1 mm。','Measure segments from the selected wall start. Gaps are passages; heights below the ceiling create pony walls. Shared boundaries combine both sides: edit both sides to create a passage or lower a wall. Doors/windows require full-height segments and 1 mm clearance from segment ends.');
      fields=`<p class="full">${walls().find(([v])=>v===side)[1]} · ${tr('边长','Side length')}: ${length(L)} · ${tr('层高','Ceiling')}: ${length(p.geometry.height)}</p>`+number('thickness',tr('本侧墙厚','Side thickness'),wallWidth(r,side))+`<div class="full" data-segments></div><div class="actions full"><button type="button" class="btn" data-segment-add>${tr('＋ 墙段','＋ Segment')}</button><button type="button" class="btn" data-segment-full>${tr('恢复整面全高墙','Restore full-height wall')}</button><button type="button" class="btn" data-segment-clear>${tr('整面开放','Open entire side')}</button></div>`;
    }else{
      const o=id?raw.openings.find(o=>o.id===id):{type:kind,wallId:ui.sel?.kind==='wall'?sideOf(ui.sel.id):'top',offset:p.units.display==='imperial'?609.6:500,width:p.units.display==='imperial'?(kind==='door'?914.4:1219.2):(kind==='door'?900:1200),height:p.units.display==='imperial'?(kind==='door'?2032:1219.2):(kind==='door'?2100:1200),sill:p.units.display==='imperial'?914.4:900,hinge:'start',swing:'inward'};
      if(!o)return;
      if(!id){const wall=raw.kind==='house'?ui.activeRoom+'--'+o.wallId:o.wallId,existing=raw.openings.filter(x=>x.wallId===wall);if(existing.length)o.offset=Math.max(...existing.map(x=>x.offset+x.width))+(p.units.display==='imperial'?304.8:100);}
      editing.type=o.type;
      title=(id?tr('编辑','Edit '):tr('添加','Add '))+(o.type==='door'?tr('门','door'):tr('窗','window'));
      fields=choice('wallId',tr('所属墙及方向','Parent wall and direction'),sideOf(o.wallId),walls())+number('offset',tr('距墙起点到洞口起边','Wall start to opening start'),o.offset)+number('width',tr('洞口宽','Opening width'),o.width)+number('height',tr('洞口高','Opening height'),o.height);
      fields+=o.type==='door'?choice('mode',tr('门 / 洞口类型','Door / opening type'),o.mode??'swing',doorModes())+choice('hinge',tr('铰链端','Hinge end'),o.hinge,[['start',tr('起端','Start')],['end',tr('末端','End')]])+choice('swing',tr('开启方向','Swing'),o.swing,[['inward',tr('向室内','Inward')],['outward',tr('向室外','Outward')]]):number('sill',tr('窗台高','Sill height'),o.sill);
      if(o.type==='door'&&raw.kind==='house')fields+=choice('pairedWith',tr('同一洞口的对向门扇（可选）','Opposite swing leaf in the same opening (optional)'),o.pairedWith??'', [['',tr('无','None')],...raw.openings.filter(n=>n.id!==id&&n.roomId!==ui.activeRoom&&n.type==='door'&&(!n.mode||n.mode==='swing')).map(n=>[n.id,p.rooms[n.roomId].name+' · '+length(n.offset)+' · '+length(n.width)])]);
      hint=tr('基准：所选墙的起点墙角，沿列表方向到洞口起边。距起点沿箭头方向计算。平开门、窗距两端及其他洞口至少 1 mm；推拉、折叠与开放洞口可贴合墙端；此为几何限制，不是结构规范。更换墙后沿用当前数值并重新校验。','Reference: the selected wall\'s start corner to the opening start, following the listed direction. Offset follows the wall arrow. Swing doors/windows keep 1 mm from corners and other openings; sliding, folding and open passages may meet the wall end; this is a geometry limit, not a building standard. Changing walls validates the same values.');
    }
    dialog.innerHTML=`<form novalidate><h2 id="roomDialogTitle">${title}</h2><p class="muted">${hint}</p><div class="form" data-form-kind="${kind}">${fields}</div><p class="room-error" role="alert" aria-live="polite"></p><div class="actions">${kind==='new'?`<button type="button" data-export class="btn">${tr('先导出当前项目','Export current project')}</button>`:''}<button type="button" data-cancel class="btn">${tr('取消','Cancel')}</button><button type="submit" class="btn primary">${kind==='new'?tr('创建并替换','Create and replace'):tr('应用','Apply')}</button></div></form>`;
    dialog.querySelector('[data-cancel]').onclick=close;
    const backup=dialog.querySelector('[data-export]');if(backup)backup.onclick=exportProject;
    dialog.querySelector('form').onsubmit=submit;
    fieldsByName={};
    const bind=input=>{
      const key=input.name;
      fieldsByName[key]=bindLengthField(input,editing.original[key],p.units.display,()=>{
        if(kind==='obstacle')return key==='height'?[100,p.geometry.height]:['x','y'].includes(key)?[0,key==='x'?r.width:r.depth]:[1,key==='width'?r.width:r.depth];
        if(kind==='wall'){const L=['top','bottom'].includes(editing.side)?r.width:r.depth;return key==='thickness'?[0,1000]:key.endsWith('-offset')?[0,L-1]:key.endsWith('-length')?[1,L]:[100,p.geometry.height];}
        if(['new','room','add'].includes(kind))return key==='notch-wall'?[0,1000]:key.startsWith('notch-')?[1,100000]:key.startsWith('wall-')?[0,1000]:['x','y'].includes(key)?[-100000,100000]:[100,key==='height'?20000:100000];
        const wall=dialog.querySelector('[name=wallId]').value,L=['top','bottom'].includes(wall)?r.width:r.depth;
        const margin=['sliding','bifold','passage'].includes(dialog.querySelector('[name=mode]')?.value)?0:1;return key==='sill'?[0,p.geometry.height]:key==='height'?[1,p.geometry.height]:key==='offset'?[margin,L-margin]:[1,L-2*margin];
      });
    };
    dialog.querySelectorAll('[data-length]').forEach(bind);
    if(kind==='wall'){
      const container=dialog.querySelector('[data-segments]'),L=['top','bottom'].includes(editing.side)?r.width:r.depth;
      const remove=row=>{row.querySelectorAll('[data-length]').forEach(input=>{delete fieldsByName[input.name];delete editing.original[input.name];});row.remove();};
      const add=segment=>{
        if(fieldsByName.thickness.read().mm===0){const input=dialog.querySelector('[name=thickness]');input.value='120 mm';fieldsByName.thickness.read();}
        const key='segment-'+editing.segmentSerial++,row=document.createElement('fieldset');row.dataset.segment=key;
        row.innerHTML=`<legend>${tr('墙段','Segment')}</legend><div class="form">${number(key+'-offset',tr('距墙起点','Wall start to segment'),segment.offset)}${number(key+'-length',tr('墙段长度','Segment length'),segment.length)}${number(key+'-height',tr('墙段高度','Segment height'),segment.height)}</div><button class="btn danger" type="button" data-segment-remove>${tr('移除本段','Remove segment')}</button>`;
        container.append(row);row.querySelectorAll('[data-length]').forEach(bind);row.querySelector('[data-segment-remove]').onclick=()=>remove(row);
      };
      const clear=()=>[...container.children].forEach(remove);
      (wallWidth(r,editing.side)===0?[]:wallSegments(r,editing.side,p.geometry.height)).forEach(add);
      dialog.querySelector('[data-segment-add]').onclick=()=>{const rows=[...container.children],last=rows.at(-1),prefix=last?.dataset.segment,offset=prefix?fieldsByName[prefix+'-offset'].read():null,size=prefix?fieldsByName[prefix+'-length'].read():null;const start=offset?.ok&&size?.ok?Math.min(L-1,offset.mm+size.mm):0;add({offset:start,length:L-start,height:p.geometry.height});container.lastElementChild.querySelector('input').focus();};
      dialog.querySelector('[data-segment-clear]').onclick=clear;
      dialog.querySelector('[data-segment-full]').onclick=()=>{clear();add({offset:0,length:L,height:p.geometry.height});};
    }
    dialog.querySelectorAll('select').forEach(select=>select.onchange=()=>Object.values(fieldsByName).forEach(field=>field.read()));
    const notch=dialog.querySelector('[name="notch-corner"]');if(notch){const shape=dialog.querySelector('[name="notch-shape"]'),update=()=>{for(const name of ['notch-width','notch-depth','notch-shape'])dialog.querySelector(`[name="${name}"]`).closest('label').hidden=notch.value==='none';dialog.querySelector('[name="notch-wall"]').closest('label').hidden=notch.value==='none'||shape.value!=='diagonal';};notch.onchange=shape.onchange=update;update();}
    const mode=dialog.querySelector('[name=mode]');if(mode){const updateMode=()=>{dialog.querySelector('[name=hinge]').closest('label').hidden=mode.value!=='swing';dialog.querySelector('[name=swing]').closest('label').hidden=!['swing','bifold'].includes(mode.value);const paired=dialog.querySelector('[name=pairedWith]');if(paired)paired.closest('label').hidden=mode.value!=='swing';Object.values(fieldsByName).forEach(field=>field.read());};mode.onchange=updateMode;updateMode();}
    $('#projectUnits').disabled=true;
    $('#unitLock').textContent=tr('关闭表单后可切换','Close form to change units');
    dialog.showModal();
  }
  function submit(e){
    e.preventDefault();
    try{
      const p=store.getProject();if(p.id!==editing.projectId)throw new Error(tr('项目已更换，请重新打开表单。','Project changed. Reopen the form.'));
      const form=new FormData(e.target),value=k=>{const result=fieldsByName[k].read();if(!result.ok){dialog.querySelector(`[name="${k}"]`).focus();throw new Error(tr('请修正标记的长度字段。','Correct the marked length field.'));}return result.mm;};
      let next,nextSelection=ui.sel;
      if(['new','room','add'].includes(editing.kind)){
        const name=form.get('name').trim();if(!name)throw new Error(tr('名称不能为空。','Name is required.'));
        const notch=form.get('notch-corner')==='none'?undefined:{corner:form.get('notch-corner'),width:value('notch-width'),depth:value('notch-depth'),...(form.get('notch-shape')==='diagonal'?{shape:'diagonal',wallThickness:value('notch-wall')}: {})};
        const dimensions={width:value('width'),depth:value('depth'),height:value('height')},wallWidths=Object.fromEntries(walls().map(([side])=>[side,value('wall-'+side)]));
        if(editing.kind==='new'){next=createRectangleProject({name,...dimensions});next.units=clone(p.units);if(p.referencePlan)next.referencePlan=clone(p.referencePlan);if(notch||Object.values(wallWidths).some(w=>w!==120)){const editor=asHouse(next.roomEditor);editor.rooms[0].wallWidths=wallWidths;if(notch)editor.rooms[0].notch=notch;next=updateRectangleProject(next,editor);}nextSelection=null;}
        else if(notch||editing.kind==='add'||p.roomEditor.kind==='house'||Object.values(wallWidths).some(w=>w!==120)){
          const editor=asHouse(p.roomEditor),roomId=editing.kind==='add'?'room-'+uid():ui.activeRoom,rooms=clone(p.rooms);rooms[roomId]={...rooms[roomId],name,mat:rooms[roomId]?.mat||'wood'};
          const room={...editor.rooms.find(r=>r.id===roomId),id:roomId,x:fieldsByName.x?value('x'):0,y:fieldsByName.y?value('y'):0,width:dimensions.width,depth:dimensions.depth,wallWidths};
          if(notch)room.notch=notch;else delete room.notch;
          for(const [side,width]of Object.entries(wallWidths))if(width===0&&room.wallSegments)delete room.wallSegments[side];
          if(editing.kind!=='add')editor.rooms[editor.rooms.findIndex(r=>r.id===roomId)]=room;
          for(const existing of editor.rooms)for(const segments of Object.values(existing.wallSegments||{}))for(const segment of segments)if(segment.height===editor.height)segment.height=dimensions.height;
          for(const existing of editor.rooms)for(const obstacle of existing.obstacles||[])if(obstacle.height===editor.height)obstacle.height=dimensions.height;
          editor.height=dimensions.height;
          if(editing.kind==='add')editor.rooms.push(room);
          next=updateRectangleProject(p,editor,rooms);nextSelection={kind:'room',id:roomId};ui.activeRoom=roomId;
        }else{
          const rooms=clone(p.rooms);rooms[p.roomEditor.roomId].name=name;
          next=updateRectangleProject(p,{...p.roomEditor,...dimensions},rooms);
        }
      }else if(editing.kind==='obstacle'){
        const editor=asHouse(p.roomEditor),room=editor.rooms.find(r=>r.id===ui.activeRoom),name=form.get('name').trim();
        if(!name)throw new Error(tr('名称不能为空。','Name is required.'));
        const obstacle={id:editing.id||'obstacle-'+uid(),name,width:value('width'),depth:value('depth'),x:value('x'),y:value('y'),height:value('height')};
        room.obstacles=room.obstacles||[];
        if(editing.id)room.obstacles[room.obstacles.findIndex(o=>o.id===editing.id)]=obstacle;else room.obstacles.push(obstacle);
        next=updateRectangleProject(p,editor);nextSelection={kind:'room',id:room.id};
      }else if(editing.kind==='wall'){
        const editor=asHouse(p.roomEditor),room=editor.rooms.find(r=>r.id===ui.activeRoom),side=editing.side;
        room.wallWidths={...room.wallWidths,[side]:value('thickness')};
        const segments=[...dialog.querySelectorAll('[data-segment]')].map(row=>{const k=row.dataset.segment;return {offset:value(k+'-offset'),length:value(k+'-length'),height:value(k+'-height')};});
        room.wallSegments={...room.wallSegments,[side]:segments};
        const L=['top','bottom'].includes(side)?room.width:room.depth;
        if(segments.length===1&&segments[0].offset===0&&segments[0].length===L&&segments[0].height===editor.height)delete room.wallSegments[side];
        if(!Object.keys(room.wallSegments).length)delete room.wallSegments;
        next=updateRectangleProject(p,editor);nextSelection={kind:'wall',id:ui.activeRoom+'--'+side};
      }else{
        const r=clone(p.roomEditor),o={id:editing.id||'opening-'+uid(),type:editing.type,wallId:form.get('wallId'),offset:value('offset'),width:value('width'),height:value('height')};
        if(r.kind==='house'){o.roomId=ui.activeRoom;o.wallId=o.roomId+'--'+o.wallId;}
        if(o.type==='door'){const mode=form.get('mode');if(mode!=='swing')o.mode=mode;if(mode==='swing'){o.hinge=form.get('hinge');if(form.get('pairedWith'))o.pairedWith=form.get('pairedWith');}if(['swing','bifold'].includes(mode))o.swing=form.get('swing');}else o.sill=value('sill');
        if(editing.id)r.openings[r.openings.findIndex(x=>x.id===editing.id)]=o;else r.openings.push(o);
        next=updateRectangleProject(p,r);nextSelection={kind:'opening',id:o.id};
      }
      next=validate(next,CATALOGS);
      const selection=nextSelection;
      close();cancelInteraction();ui.sel=selection;store.replaceProject(next);
      toast(tr('已应用，可撤销','Applied. Undo is available.'));
    }catch(error){
      const message=errorMessage(error);
      dialog.querySelector('.room-error').textContent=tr('无法应用：','Cannot apply: ')+message;
      const key=/window head|height/.test(error.message)?'height':/outside parent|overlap|offset/.test(error.message)?'offset':/width/.test(error.message)?'width':/depth/.test(error.message)?'depth':null;
      const input=key&&dialog.querySelector(`[name="${key}"]`);
      if(input){fieldsByName[key].reject(message);input.focus();}
    }
  }
  function remove(id){
    const p=store.getProject(),r=clone(p.roomEditor);r.openings=r.openings.filter(o=>o.id!==id);for(const o of r.openings)if(o.pairedWith===id)delete o.pairedWith;
    const next=validate(updateRectangleProject(p,r),CATALOGS);
    cancelInteraction();ui.sel=null;store.replaceProject(next);
  }
  let signature;
  function update(){
    const p=store.getProject(),raw=p.roomEditor;
    if(dialog.open&&editing.projectId!==p.id)close();
    $('#newRoom').textContent=tr('＋ 新建项目','＋ New project');
    $('#editRoom').textContent=tr('房间 / 门窗','Room / Openings');
    const selectedOpening=raw?.openings.find(o=>ui.sel?.kind==='opening'&&o.id===ui.sel.id);
    if(raw){if(ui.sel?.kind==='room')ui.activeRoom=ui.sel.id;if(selectedOpening)ui.activeRoom=selectedOpening.roomId||raw.roomId;if(ui.sel?.kind==='wall'&&raw.kind==='house')ui.activeRoom=ui.sel.id.split('--')[0];}
    const room=raw?.kind==='house'?raw.rooms.find(r=>r.id===ui.activeRoom)||raw.rooms[0]:raw;
    if(room)ui.activeRoom=room.id||room.roomId;
    const obstacles=(room?.obstacles||[]).map(o=>`<div class="opening-row"><span>${esc(o.name)}<small>${length(o.width)} × ${length(o.depth)} · X ${length(o.x)}, Y ${length(o.y)} · ${tr('高','height')} ${length(o.height)}</small></span><button class="btn" data-obstacle-edit="${o.id}">${tr('编辑','Edit')}</button><button class="btn danger" data-obstacle-delete="${o.id}">${tr('删除','Delete')}</button></div>`).join('');
    const chosen=ui.sel?.kind==='wall'?sideOf(ui.sel.id):selectedOpening?sideOf(selectedOpening.wallId):ui.lastWall||'top';ui.lastWall=chosen;
    const next=JSON.stringify([p.id,raw,p.rooms,p.units.display,ui.sel,ui.activeRoom,chosen,document.documentElement.lang]);if(next===signature)return;signature=next;
    host.dataset.context=ui.sel?.kind||'none';
    host.hidden=!['room','wall','opening'].includes(ui.sel?.kind);
    host.innerHTML=raw?`<section><h3>${tr('房间与门窗','Rooms and openings')}</h3>${selectedOpening?`<button class="btn" data-back-wall>${tr('← 返回当前墙 / 继续添加','← Back to this wall / add another')}</button>`:''}<label>${tr('当前房间','Current room')}<select id="activeRoom">${p.geometry.rooms.map(r=>`<option value="${r.id}" ${r.id===ui.activeRoom?'selected':''}>${esc(p.rooms[r.id].name)}</option>`).join('')}</select></label><div class="actions"><button class="btn" data-room-edit>${tr('编辑尺寸 / 位置','Edit dimensions / position')}</button><button class="btn" data-room-add>${tr('＋ 添加房间','＋ Add room')}</button>${raw.kind==='house'&&raw.rooms.length>1?`<button class="btn danger" data-room-delete>${tr('删除当前房间','Delete current room')}</button>`:''}</div><p class="muted">${tr('单层矩形、角部缺口与斜切角；净空间之间须留墙厚，墙厚 0 表示开放边界。','Single floor: rectangles, corner notches and diagonal cuts. Leave room for walls between net spaces; 0 thickness creates an open boundary.')}</p><label>${tr('选择墙（起点 → 终点）','Choose wall (start → end)')}<select id="parentWall">${walls().map(([v,t])=>`<option value="${v}" ${v===chosen?'selected':''}>${t}</option>`).join('')}</select></label><button class="btn" data-wall-edit>${tr('编辑墙段 / 半高墙','Edit segments / pony wall')}</button><p class="muted" data-wall-summary>${wallWidth(room,chosen)===0?tr('整面开放','Entire side open'):wallSegments(room,chosen,p.geometry.height).map(s=>`${length(s.offset)} → ${length(s.offset+s.length)} · ${tr('高','height')} ${length(s.height)}`).join('; ')||tr('整面开放','Entire side open')}</p><div class="actions"><button class="btn" data-add="door">${tr('＋ 门','＋ Door')}</button><button class="btn" data-add="window">${tr('＋ 窗','＋ Window')}</button></div><div class="opening-list">${raw.openings.filter(o=>raw.kind!=='house'||o.roomId===ui.activeRoom).map(o=>`<div class="opening-row"><button class="btn" data-select="${o.id}">${openingName(o)} · ${walls().find(([v])=>v===sideOf(o.wallId))[1]}<small>${length(o.offset)} → ${length(o.offset+o.width)}</small></button><button class="btn" data-edit="${o.id}">${tr('编辑','Edit')}</button><button class="btn danger" data-delete="${o.id}">${tr('删除','Delete')}</button></div>`).join('')}</div><h3>${tr('固定障碍物','Fixed obstacles')}</h3><p class="muted">${tr('柱 / 墙体凸入；尺寸须实测，面积扣除占地。','Columns / wall intrusions; enter measurements. Footprints reduce usable area.')}</p><button class="btn" data-obstacle-add>${tr('＋ 固定障碍物','＋ Fixed obstacle')}</button><div class="obstacle-list">${obstacles}</div></section>`:`<section><p>${tr('示例为几何快照。新建项目后可连续添加房间、门窗。','This sample is a geometry snapshot. Create a project to add rooms and openings.')}</p><button class="btn" data-start>${tr('新建项目','New project')}</button></section>`;
    if(!raw){host.querySelector('[data-start]').onclick=()=>open('new');return;}
    const back=host.querySelector('[data-back-wall]');if(back)back.onclick=()=>actions.select({kind:'wall',id:selectedOpening.wallId});
    const wallId=side=>raw.kind==='house'?ui.activeRoom+'--'+side:side;
    host.querySelector('#activeRoom').onchange=e=>actions.select({kind:'room',id:e.target.value});
    host.querySelector('#parentWall').onchange=e=>{ui.lastWall=e.target.value;actions.select({kind:'wall',id:wallId(e.target.value)});};
    host.querySelector('[data-room-edit]').onclick=()=>open('room');host.querySelector('[data-room-add]').onclick=()=>open('add');
    const del=host.querySelector('[data-room-delete]');if(del)del.onclick=()=>{const editor=asHouse(raw),id=ui.activeRoom,rooms=clone(p.rooms);editor.rooms=editor.rooms.filter(r=>r.id!==id);editor.openings=editor.openings.filter(o=>o.roomId!==id);for(const o of editor.openings)if(o.pairedWith&&!editor.openings.some(n=>n.id===o.pairedWith))delete o.pairedWith;delete rooms[id];const next=validate(updateRectangleProject(p,editor,rooms),CATALOGS);ui.sel=null;ui.activeRoom=editor.rooms[0].id;store.replaceProject(next);};
    host.querySelector('[data-obstacle-add]').onclick=()=>open('obstacle');
    host.querySelectorAll('[data-obstacle-edit]').forEach(b=>b.onclick=()=>open('obstacle',b.dataset.obstacleEdit));
    host.querySelectorAll('[data-obstacle-delete]').forEach(b=>b.onclick=()=>{const editor=asHouse(raw),r=editor.rooms.find(r=>r.id===ui.activeRoom);r.obstacles=r.obstacles.filter(o=>o.id!==b.dataset.obstacleDelete);if(!r.obstacles.length)delete r.obstacles;const next=validate(updateRectangleProject(p,editor),CATALOGS);cancelInteraction();ui.sel={kind:'room',id:r.id};store.replaceProject(next);});
    host.querySelector('[data-wall-edit]').onclick=()=>open('wall');
    host.querySelectorAll('[data-add]').forEach(b=>{b.disabled=!hasFullWallSegment(room,chosen,p.geometry.height);b.onclick=()=>{actions.select({kind:'wall',id:wallId(host.querySelector('#parentWall').value)});open(b.dataset.add);};});
    host.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>actions.select({kind:'opening',id:b.dataset.select}));
    host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{actions.select({kind:'opening',id:b.dataset.edit});open('opening',b.dataset.edit);});
    host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
  }
  $('#newRoom').onclick=e=>open('new',undefined,e.currentTarget);
  $('#editRoom').onclick=()=>{actions.showStructure();};
  scope.on(dialog,'cancel',()=>{editing=null;unlock();});
  return {update,open,remove,dispose(){scope.dispose();dialog.remove();host.replaceChildren();$('#newRoom').onclick=$('#editRoom').onclick=null;}};
}
