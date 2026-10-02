import {asHouse,sideOf,wallWidth} from '../data/house-editor.js';
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
    const phrases=[['outside parent wall','超出所属墙长度'],['window head exceeds room height','窗顶超过房间净高'],['overlaps or is less than 1 mm from','与下列洞口重叠或间距不足 1 mm：'],['roomEditor.width','房间净宽'],['roomEditor.depth','房间净深'],['roomEditor.height','房间净高'],[' offset',' 距起点'],[' width',' 洞口宽'],[' height',' 洞口高'],[' sill',' 窗台高']];
    for(const [en,zh]of phrases)message=message.replace(en,tr(zh,en));
    const p=store.getProject();for(const o of p.roomEditor?.openings||[])message=message.replaceAll('opening '+o.id,(o.type==='door'?tr('门','Door'):tr('窗','Window')) );
    for(const o of p.roomEditor?.openings||[])message=message.replaceAll(o.id,o.type==='door'?tr('门','door'):tr('窗','window'));
    return message.replace(/opening-[A-Za-z0-9_-]+/g,tr('洞口','opening'));
  }
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
      hint=tr(`宽/深 ${length(100)}–${length(100000)}；高 ${length(100)}–${length(20000)}。每侧墙厚可设为 0–1000 mm，0 为开放边界。`,`Width/depth ${length(100)}–${length(100000)}; height ${length(100)}–${length(20000)}. Each wall can be 0–1000 mm thick; 0 creates an open boundary.`);
      hint+=' '+(kind==='add'?tr('添加到当前项目，不替换已有房间。相邻净空间按对应墙厚留间距；开放相接须双方墙厚均为 0。默认接在当前房间下方。','Adds to this project. Leave the larger facing wall thickness between net spaces. Set both facing sides to 0 to join open spaces. Default position is below the current room.'):kind==='new'?tr('以上为示例初值，请按实测修改。创建将替换当前方案，可撤销；建议先导出备份。','These are example values; enter your measurements. Creating replaces the current plan and can be undone. Export a backup first.'):tr('家具和测量保留绝对坐标，请复核位置；超出父墙或房高的门窗会阻止提交。','Furniture and measurements keep their coordinates; review their positions. Openings outside the wall or ceiling block this change.'));
    }else{
      const o=id?raw.openings.find(o=>o.id===id):{type:kind,wallId:ui.sel?.kind==='wall'?sideOf(ui.sel.id):'top',offset:p.units.display==='imperial'?609.6:500,width:p.units.display==='imperial'?(kind==='door'?914.4:1219.2):(kind==='door'?900:1200),height:p.units.display==='imperial'?(kind==='door'?2032:1219.2):(kind==='door'?2100:1200),sill:p.units.display==='imperial'?914.4:900,hinge:'start',swing:'inward'};
      if(!o)return;
      if(!id){const wall=raw.kind==='house'?ui.activeRoom+'--'+o.wallId:o.wallId,existing=raw.openings.filter(x=>x.wallId===wall);if(existing.length)o.offset=Math.max(...existing.map(x=>x.offset+x.width))+(p.units.display==='imperial'?304.8:100);}
      editing.type=o.type;
      title=(id?tr('编辑','Edit '):tr('添加','Add '))+(o.type==='door'?tr('门','door'):tr('窗','window'));
      fields=choice('wallId',tr('所属墙及方向','Parent wall and direction'),sideOf(o.wallId),walls())+number('offset',tr('距墙起点到洞口起边','Wall start to opening start'),o.offset)+number('width',tr('洞口宽','Opening width'),o.width)+number('height',tr('洞口高','Opening height'),o.height);
      fields+=o.type==='door'?choice('hinge',tr('铰链端','Hinge end'),o.hinge,[['start',tr('起端','Start')],['end',tr('末端','End')]])+choice('swing',tr('开启方向','Swing'),o.swing,[['inward',tr('向室内','Inward')],['outward',tr('向室外','Outward')]]):number('sill',tr('窗台高','Sill height'),o.sill);
      hint=tr('基准：所选墙的起点墙角，沿列表方向到洞口起边。距起点沿箭头方向计算。洞口距两端及其他洞口至少 1 mm；此为几何限制，不是结构规范。更换墙后沿用当前数值并重新校验。','Reference: the selected wall\'s start corner to the opening start, following the listed direction. Offset follows the wall arrow. Keep at least 1 mm from corners and other openings; this is a geometry limit, not a building standard. Changing walls validates the same values.');
    }
    dialog.innerHTML=`<form novalidate><h2 id="roomDialogTitle">${title}</h2><p class="muted">${hint}</p><div class="form" data-form-kind="${kind}">${fields}</div><p class="room-error" role="alert" aria-live="polite"></p><div class="actions">${kind==='new'?`<button type="button" data-export class="btn">${tr('先导出当前项目','Export current project')}</button>`:''}<button type="button" data-cancel class="btn">${tr('取消','Cancel')}</button><button type="submit" class="btn primary">${kind==='new'?tr('创建并替换','Create and replace'):tr('应用','Apply')}</button></div></form>`;
    dialog.querySelector('[data-cancel]').onclick=close;
    const backup=dialog.querySelector('[data-export]');if(backup)backup.onclick=exportProject;
    dialog.querySelector('form').onsubmit=submit;
    fieldsByName={};
    for(const input of dialog.querySelectorAll('[data-length]')){
      const key=input.name;
      fieldsByName[key]=bindLengthField(input,editing.original[key],p.units.display,()=>{
        if(['new','room','add'].includes(kind))return key.startsWith('wall-')?[0,1000]:['x','y'].includes(key)?[-100000,100000]:[100,key==='height'?20000:100000];
        const wall=dialog.querySelector('[name=wallId]').value,L=['top','bottom'].includes(wall)?r.width:r.depth;
        return key==='sill'?[0,p.geometry.height]:key==='height'?[1,p.geometry.height]:[1,L-(key==='width'?2:1)];
      });
    }
    dialog.querySelectorAll('select').forEach(select=>select.onchange=()=>Object.values(fieldsByName).forEach(field=>field.read()));
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
        const dimensions={width:value('width'),depth:value('depth'),height:value('height')},wallWidths=Object.fromEntries(walls().map(([side])=>[side,value('wall-'+side)]));
        if(editing.kind==='new'){next=createRectangleProject({name,...dimensions});next.units=clone(p.units);if(p.referencePlan)next.referencePlan=clone(p.referencePlan);if(Object.values(wallWidths).some(w=>w!==120)){const editor=asHouse(next.roomEditor);editor.rooms[0].wallWidths=wallWidths;next=updateRectangleProject(next,editor);}nextSelection=null;}
        else if(editing.kind==='add'||p.roomEditor.kind==='house'||Object.values(wallWidths).some(w=>w!==120)){
          const editor=asHouse(p.roomEditor),roomId=editing.kind==='add'?'room-'+uid():ui.activeRoom,rooms=clone(p.rooms);rooms[roomId]={...rooms[roomId],name,mat:rooms[roomId]?.mat||'wood'};
          const room={id:roomId,x:fieldsByName.x?value('x'):0,y:fieldsByName.y?value('y'):0,width:dimensions.width,depth:dimensions.depth,wallWidths};editor.height=dimensions.height;
          if(editing.kind==='add')editor.rooms.push(room);else editor.rooms[editor.rooms.findIndex(r=>r.id===roomId)]=room;
          next=updateRectangleProject(p,editor,rooms);nextSelection={kind:'room',id:roomId};ui.activeRoom=roomId;
        }else{
          const rooms=clone(p.rooms);rooms[p.roomEditor.roomId].name=name;
          next=updateRectangleProject(p,{...p.roomEditor,...dimensions},rooms);
        }
      }else{
        const r=clone(p.roomEditor),o={id:editing.id||'opening-'+uid(),type:editing.type,wallId:form.get('wallId'),offset:value('offset'),width:value('width'),height:value('height')};
        if(r.kind==='house'){o.roomId=ui.activeRoom;o.wallId=o.roomId+'--'+o.wallId;}
        if(o.type==='door'){o.hinge=form.get('hinge');o.swing=form.get('swing');}else o.sill=value('sill');
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
    const p=store.getProject(),r=clone(p.roomEditor);r.openings=r.openings.filter(o=>o.id!==id);
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
    const chosen=ui.sel?.kind==='wall'?sideOf(ui.sel.id):selectedOpening?sideOf(selectedOpening.wallId):ui.lastWall||'top';ui.lastWall=chosen;
    const next=JSON.stringify([p.id,raw,p.rooms,p.units.display,ui.sel,ui.activeRoom,chosen,document.documentElement.lang]);if(next===signature)return;signature=next;
    host.dataset.context=ui.sel?.kind||'none';
    host.hidden=!['room','wall','opening'].includes(ui.sel?.kind);
    host.innerHTML=raw?`<section><h3>${tr('房间与门窗','Rooms and openings')}</h3>${selectedOpening?`<button class="btn" data-back-wall>${tr('← 返回当前墙 / 继续添加','← Back to this wall / add another')}</button>`:''}<label>${tr('当前房间','Current room')}<select id="activeRoom">${p.geometry.rooms.map(r=>`<option value="${r.id}" ${r.id===ui.activeRoom?'selected':''}>${esc(p.rooms[r.id].name)}</option>`).join('')}</select></label><div class="actions"><button class="btn" data-room-edit>${tr('编辑尺寸 / 位置','Edit dimensions / position')}</button><button class="btn" data-room-add>${tr('＋ 添加房间','＋ Add room')}</button>${raw.kind==='house'&&raw.rooms.length>1?`<button class="btn danger" data-room-delete>${tr('删除当前房间','Delete current room')}</button>`:''}</div><p class="muted">${tr('单层矩形空间；相邻净空间按墙厚留间距。双方墙厚均为 0 可连接开放空间。','Single floor, rectangular spaces. Leave the facing wall thickness between net spaces. Set both sides to 0 to connect open spaces.')}</p><label>${tr('选择墙（起点 → 终点）','Choose wall (start → end)')}<select id="parentWall">${walls().map(([v,t])=>`<option value="${v}" ${v===chosen?'selected':''}>${t}</option>`).join('')}</select></label><div class="actions"><button class="btn" data-add="door">${tr('＋ 门','＋ Door')}</button><button class="btn" data-add="window">${tr('＋ 窗','＋ Window')}</button></div><div class="opening-list">${raw.openings.filter(o=>raw.kind!=='house'||o.roomId===ui.activeRoom).map(o=>`<div class="opening-row"><button class="btn" data-select="${o.id}">${o.type==='door'?tr('门','Door'):tr('窗','Window')} · ${walls().find(([v])=>v===sideOf(o.wallId))[1]}<small>${length(o.offset)} → ${length(o.offset+o.width)}</small></button><button class="btn" data-edit="${o.id}">${tr('编辑','Edit')}</button><button class="btn danger" data-delete="${o.id}">${tr('删除','Delete')}</button></div>`).join('')}</div></section>`:`<section><p>${tr('示例为几何快照。新建项目后可连续添加房间、门窗。','This sample is a geometry snapshot. Create a project to add rooms and openings.')}</p><button class="btn" data-start>${tr('新建项目','New project')}</button></section>`;
    if(!raw){host.querySelector('[data-start]').onclick=()=>open('new');return;}
    const back=host.querySelector('[data-back-wall]');if(back)back.onclick=()=>actions.select({kind:'wall',id:selectedOpening.wallId});
    const wallId=side=>raw.kind==='house'?ui.activeRoom+'--'+side:side;
    host.querySelector('#activeRoom').onchange=e=>actions.select({kind:'room',id:e.target.value});
    host.querySelector('#parentWall').onchange=e=>{ui.lastWall=e.target.value;actions.select({kind:'wall',id:wallId(e.target.value)});};
    host.querySelector('[data-room-edit]').onclick=()=>open('room');host.querySelector('[data-room-add]').onclick=()=>open('add');
    const del=host.querySelector('[data-room-delete]');if(del)del.onclick=()=>{const editor=asHouse(raw),id=ui.activeRoom,rooms=clone(p.rooms);editor.rooms=editor.rooms.filter(r=>r.id!==id);editor.openings=editor.openings.filter(o=>o.roomId!==id);delete rooms[id];const next=validate(updateRectangleProject(p,editor,rooms),CATALOGS);ui.sel=null;ui.activeRoom=editor.rooms[0].id;store.replaceProject(next);};
    host.querySelectorAll('[data-add]').forEach(b=>{b.disabled=raw.kind==='house'&&wallWidth(room,chosen)===0;b.onclick=()=>{actions.select({kind:'wall',id:wallId(host.querySelector('#parentWall').value)});open(b.dataset.add);};});
    host.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>actions.select({kind:'opening',id:b.dataset.select}));
    host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{actions.select({kind:'opening',id:b.dataset.edit});open('opening',b.dataset.edit);});
    host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
  }
  $('#newRoom').onclick=e=>open('new',undefined,e.currentTarget);
  $('#editRoom').onclick=()=>{actions.showStructure();};
  scope.on(dialog,'cancel',()=>{editing=null;unlock();});
  return {update,open,remove,dispose(){scope.dispose();dialog.remove();host.replaceChildren();$('#newRoom').onclick=$('#editRoom').onclick=null;}};
}
