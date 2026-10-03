import {esc} from './dom.js';
import {tr} from './i18n.js';
import {createScope} from './lifecycle.js';

/** One review dialog; cancellation never changes the store or editor selection. */
export function createProjectProtection({store,exportProject,toast,discardDrafts=()=>{}}){
  const scope=createScope(),dialog=document.createElement('dialog');
  dialog.id='protectionDialog';dialog.className='room-dialog';dialog.setAttribute('aria-labelledby','protectionTitle');document.body.append(dialog);
  let opener;
  scope.on(dialog,'close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
  function show({title,message,actions,extra=''}){
    if(dialog.open)return false;
    opener=document.activeElement;
    dialog.innerHTML=`<h2 id="protectionTitle">${esc(title)}</h2><p>${esc(message)}</p>${extra}<p class="room-error" role="alert"></p><div class="actions"><button type="button" class="btn" data-backup>${tr('导出本窗口工程','Export this window')}</button>${actions.map((a,i)=>`<button type="button" class="btn" data-choice="${i}">${esc(a.label)}</button>`).join('')}<button type="button" class="btn" data-cancel>${tr('取消','Cancel')}</button></div>`;
    dialog.querySelector('[data-backup]').onclick=exportProject;
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    actions.forEach((action,i)=>dialog.querySelector(`[data-choice="${i}"]`).onclick=()=>{
      try{if(action.run()!==false)dialog.close();}
      catch(error){dialog.querySelector('[role=alert]').textContent=error.message;toast(error.message);}
    });
    dialog.showModal();return true;
  }
  function replace(next,{label,onReplace,beforeReplace=()=>{},afterReplace=()=>{},message=''}={}){
    const before=JSON.stringify(store.getCommittedProject());
    return show({title:label||tr('替换当前工程','Replace current project'),message:message||tr('将替换全部房间、结构、家具、底图、尺寸和单位偏好。已自动保存的旧工程不是独立备份。有效字段在离开焦点时提交；未提交草稿和拖动预览会在继续后放弃。请先导出备份；取消保留当前工程。','Replaces all rooms, structures, furniture, drawing, dimensions and unit preferences. Autosave is not an independent backup of your old project. Valid fields commit on blur; remaining drafts and drag previews are discarded only if you continue. Export a backup first, or cancel to keep this project.'),extra:`<p>${tr('当前','Current')}: <b>${esc(store.getCommittedProject().name)}</b><br>${tr('替换为','Replace with')}: <b>${esc(next.name)}</b></p>`,actions:[{label:tr('继续替换','Continue replacement'),run:()=>{
      if(before!==JSON.stringify(store.getCommittedProject()))throw Error(tr('工程已变化，请重新开始替换。','The project changed. Start the replacement again.'));
      beforeReplace();onReplace(next);discardDrafts();afterReplace();
    }}]});
  }
  return {show,replace,dispose(){scope.dispose();dialog.remove();}};
}
