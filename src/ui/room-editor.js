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
  let editing=null;
  function errorMessage(error){
    let message=error.message;
    const phrases=[['outside parent wall','超出所属墙长度'],['window head exceeds room height','窗顶超过房间净高'],['overlaps or is less than 1 mm from','与下列洞口重叠或间距不足 1 mm：'],['roomEditor.width','房间净宽'],['roomEditor.depth','房间净深'],['roomEditor.height','房间净高'],[' offset',' 距起点'],[' width',' 洞口宽'],[' height',' 洞口高'],[' sill',' 窗台高']];
    for(const [en,zh]of phrases)message=message.replace(en,tr(zh,en));
    const p=store.getProject();for(const o of p.roomEditor?.openings||[])message=message.replace('opening '+o.id,(o.type==='door'?tr('门','Door'):tr('窗','Window'))+' '+o.id);
    return message;
  }
  const walls=()=>[['top',tr('上墙 · 左上 → 右上','Top · top-left → top-right')],['right',tr('右墙 · 右上 → 右下','Right · top-right → bottom-right')],['bottom',tr('下墙 · 左下 → 右下','Bottom · bottom-left → bottom-right')],['left',tr('左墙 · 左上 → 左下','Left · top-left → bottom-left')]];
  const length=mm=>formatLengthMm(mm,store.getProject().units.display);
  let fieldsByName={};
  const number=(key,label,value)=>{editing.original[key]=value;return lengthField(key,label,value,store.getProject().units.display);};
  function unlock(){ $('#projectUnits').disabled=false;$('#unitLock').textContent=''; }
  const choice=(key,label,value,options)=>`<label>${label}<select name="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></label>`;
  function close(){dialog.close();editing=null;unlock();}
  function open(kind,id){
    if(isSwitching())return;
    cancelInteraction();
    const p=store.getProject(),r=p.roomEditor;
    if(kind!=='new'&&!r)return;
    editing={kind,id,projectId:p.id,original:{}};
    let fields='',title='',hint='';
    if(kind==='new'||kind==='room'){
      const v=kind==='new'?{width:4000,depth:3000,height:2800}:r;
      title=kind==='new'?tr('新建矩形房间','New rectangular room'):tr('编辑房间','Edit room');
      const name=kind==='new'?tr('我的房间','My room'):p.rooms[r.roomId].name;
      fields=`<label class="full">${tr('名称','Name')}<input name="name" maxlength="500" required value="${esc(name)}"></label>`+number('width',tr('室内净宽 X','Net width X'),v.width)+number('depth',tr('室内净深 Y','Net depth Y'),v.depth)+number('height',tr('室内净高','Net height'),v.height);
      hint=tr(`宽/深 ${length(100)}–${length(100000)}；高 ${length(100)}–${length(20000)}。固定墙厚 ${length(120)}。`,`Width/depth ${length(100)}–${length(100000)}; height ${length(100)}–${length(20000)}. Fixed walls ${length(120)}.`);
      hint+=' '+(kind==='new'?tr('以上为示例初值，请按实测修改。创建将替换当前方案，可撤销；建议先导出备份。','These are example values; enter your measurements. Creating replaces the current plan and can be undone. Export a backup first.'):tr('家具和测量保留绝对坐标，请复核位置；超出父墙或房高的门窗会阻止提交。','Furniture and measurements keep their coordinates; review their positions. Openings outside the wall or ceiling block this change.'));
    }else{
      const o=id?r.openings.find(o=>o.id===id):{type:kind,wallId:ui.sel?.kind==='wall'?ui.sel.id:'top',offset:500,width:kind==='door'?900:1200,height:kind==='door'?2100:1200,sill:900,hinge:'start',swing:'inward'};
      if(!o)return;
      editing.type=o.type;
      title=(id?tr('编辑','Edit '):tr('添加','Add '))+(o.type==='door'?tr('门','door'):tr('窗','window'));
      fields=choice('wallId',tr('所属墙及方向','Parent wall and direction'),o.wallId,walls())+number('offset',tr('距墙起点到洞口起边','Wall start to opening start'),o.offset)+number('width',tr('洞口宽','Opening width'),o.width)+number('height',tr('洞口高','Opening height'),o.height);
      fields+=o.type==='door'?choice('hinge',tr('铰链端','Hinge end'),o.hinge,[['start',tr('起端','Start')],['end',tr('末端','End')]])+choice('swing',tr('开启方向','Swing'),o.swing,[['inward',tr('向室内','Inward')],['outward',tr('向室外','Outward')]]):number('sill',tr('窗台高','Sill height'),o.sill);
      hint=tr('距起点沿箭头方向计算。洞口距两端及其他洞口至少 1 mm；此为几何限制，不是结构规范。更换墙后沿用当前数值并重新校验。','Offset follows the wall arrow. Keep at least 1 mm from corners and other openings; this is a geometry limit, not a building standard. Changing walls validates the same values.');
    }
    dialog.innerHTML=`<form novalidate><h2>${title}</h2><p class="muted">${hint}</p><div class="form">${fields}</div><p class="room-error" role="alert" aria-live="polite"></p><div class="actions">${kind==='new'?`<button type="button" data-export class="btn">${tr('先导出当前项目','Export current project')}</button>`:''}<button type="button" data-cancel class="btn">${tr('取消','Cancel')}</button><button type="submit" class="btn primary">${kind==='new'?tr('创建并替换','Create and replace'):tr('应用','Apply')}</button></div></form>`;
    dialog.querySelector('[data-cancel]').onclick=close;
    const backup=dialog.querySelector('[data-export]');if(backup)backup.onclick=exportProject;
    dialog.querySelector('form').onsubmit=submit;
    fieldsByName={};
    for(const input of dialog.querySelectorAll('[data-length]')){
      const key=input.name;
      fieldsByName[key]=bindLengthField(input,editing.original[key],p.units.display,()=>{
        if(kind==='new'||kind==='room')return [100,key==='height'?20000:100000];
        const wall=dialog.querySelector('[name=wallId]').value,L=['top','bottom'].includes(wall)?r.width:r.depth;
        return key==='sill'?[0,r.height]:key==='height'?[1,r.height]:[1,L-(key==='width'?2:1)];
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
      if(editing.kind==='new'||editing.kind==='room'){
        const name=form.get('name').trim();if(!name)throw new Error(tr('名称不能为空。','Name is required.'));
        const dimensions={width:value('width'),depth:value('depth'),height:value('height')};
        if(editing.kind==='new'){next=createRectangleProject({name,...dimensions});next.units=clone(p.units);nextSelection=null;}
        else{
          const rooms=clone(p.rooms);rooms[p.roomEditor.roomId].name=name;
          next=updateRectangleProject(p,{...p.roomEditor,...dimensions},rooms);
          next.name=name;
        }
      }else{
        const r=clone(p.roomEditor),o={id:editing.id||'opening-'+uid(),type:editing.type,wallId:form.get('wallId'),offset:value('offset'),width:value('width'),height:value('height')};
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
  function update(){
    const r=store.getProject().roomEditor;
    if(dialog.open&&editing.projectId!==store.getProject().id)close();
    $('#newRoom').textContent=tr('＋ 新建房间','＋ New room');
    $('#editRoom').textContent=tr('房间 / 门窗','Room / Openings');
    host.dataset.context=ui.sel?.kind||'none';
    host.hidden=!['room','wall','opening'].includes(ui.sel?.kind);
    host.innerHTML=r?`<section><h3>${ui.sel?.kind==='opening'?(r.openings.find(o=>o.id===ui.sel.id)?.type==='door'?tr('门属性','Door properties'):tr('窗属性','Window properties')):ui.sel?.kind==='wall'?tr('墙体与门窗','Wall and openings'):tr('房间与门窗','Room and openings')}</h3><button class="btn" data-room-edit>${tr('编辑净尺寸','Edit net dimensions')}</button><p class="muted">${tr(`固定墙厚 ${length(120)}；生成墙体不可拆除。`,`Fixed ${length(120)} walls; generated walls cannot be demolished.`)}</p><label>${tr('选择墙（起点 → 终点）','Choose wall (start → end)')}<select id="parentWall">${walls().map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><div class="actions"><button class="btn" data-add="door">${tr('＋ 门','＋ Door')}</button><button class="btn" data-add="window">${tr('＋ 窗','＋ Window')}</button></div><div class="opening-list">${r.openings.filter(o=>ui.sel?.kind==='opening'?o.id===ui.sel.id:ui.sel?.kind==='wall'?o.wallId===ui.sel.id:true).map(o=>`<div class="opening-row ${ui.sel?.id===o.id?'selected':''}"><button class="btn" data-select="${o.id}">${o.type==='door'?tr('门','Door'):tr('窗','Window')} · ${walls().find(([v])=>v===o.wallId)[1]}<small>${length(o.offset)} → ${length(o.offset+o.width)} · ${length(o.width)} × ${length(o.height)}</small></button><button class="btn" data-edit="${o.id}">${tr('编辑','Edit')}</button><button class="btn danger" data-delete="${o.id}">${tr('删除','Delete')}</button></div>`).join('')||`<p class="muted">${tr('尚无门窗。可点选平面图的墙再添加。','No openings. Select a wall on the plan to add one.')}</p>`}</div></section>`:`<section><h3>${tr('几何快照项目','Geometry snapshot')}</h3><p class="muted">${tr('此方案保留原几何，可继续摆家具和改材料。要输入净尺寸和门窗关系，请新建矩形房间。','This plan retains its geometry. Furniture and materials remain editable. Create a rectangular room to edit dimensions and openings.')}</p></section>`;
    if(!r)return;
    const chosen=ui.sel?.kind==='wall'?ui.sel.id:r.openings.find(o=>o.id===ui.sel?.id)?.wallId||'top';
    host.querySelector('#parentWall').value=chosen;
    host.querySelector('#parentWall').onchange=e=>actions.select({kind:'wall',id:e.target.value});
    host.querySelector('[data-room-edit]').onclick=()=>open('room');
    host.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{actions.select({kind:'wall',id:host.querySelector('#parentWall').value});open(b.dataset.add);});
    host.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>actions.select({kind:'opening',id:b.dataset.select}));
    host.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{actions.select({kind:'opening',id:b.dataset.edit});open('opening',b.dataset.edit);});
    host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
  }
  $('#newRoom').onclick=()=>open('new');
  $('#editRoom').onclick=()=>{actions.showStructure();};
  scope.on(dialog,'cancel',()=>{editing=null;unlock();});
  return {update,open,remove,dispose(){scope.dispose();dialog.remove();host.replaceChildren();$('#newRoom').onclick=$('#editRoom').onclick=null;}};
}
