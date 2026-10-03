import {$,esc} from './dom.js';
import {tr} from './i18n.js';
import {createScope} from './lifecycle.js';
import {STORE,V1_STORE,LEGACY_STORE} from '../services/storage.js';
import {readProject} from '../services/project-files.js';

export function createSaveRecovery({store,storage,loaded,protection,readOriginal,download,exportProject,replace,toast}){
  const scope=createScope();
  let state=loaded.persisted?'saved':loaded.migrationError?'error':storage.recovery?'recovery':loaded.error?'error':'new';
  const initial=JSON.stringify(store.getCommittedProject());
  let lastSaved=loaded.persisted?initial:null;
  let recoveryChoice=false;
  const messages=()=>({saved:tr('已保存到此设备','Saved on this device'),new:tr('新工程，仅在本窗口','New project — in this window'),error:tr('保存失败，改动仅在本窗口','Save failed — changes in this window'),conflict:tr('另一窗口已修改，保存已暂停','Another window changed this project — save paused'),recovery:tr('原始数据已保留，请选择恢复方式','Original data preserved — choose recovery')});
  function update(){
    for(const id of ['saveStatus','fileSaveStatus']){const el=$('#'+id);el.textContent=messages()[state];el.dataset.state=['error','conflict','recovery'].includes(state)?'error':'local';}
    $('#saveRecovery').hidden=false;
    $('#retrySave').hidden=!['error','new'].includes(state);
    $('#resolveStorage').hidden=!['conflict','recovery'].includes(state);
    const sources={
      [STORE]:tr('从此设备恢复','Restored from this device'),
      [V1_STORE]:tr('已读取旧版设备工程','Loaded an older device project'),
      [LEGACY_STORE]:tr('保留旧格式原始示例','Legacy original sample preserved')
    };
    $('#storageSource').textContent=loaded.error?tr('设备数据无法读取，原文仍保留','Device data unreadable; original preserved'):sources[loaded.source]||tr('在本窗口开始的工程','Project started in this window');
    $('#retrySave').textContent=tr('重试设备保存','Retry device save');
    $('#backupMemory').textContent=tr('导出本窗口 (.json)','Export this window (.json)');
    $('#resolveStorage').textContent=tr('查看恢复 / 冲突','Review recovery / conflict');
    $('#recoveryCopies').textContent=tr('本地恢复副本','Device recovery copies');
  }
  function save(options={}){
    const was=state,p=store.getCommittedProject(),result=storage.save(p,{recover:recoveryChoice,...options});
    if(result.ok){lastSaved=JSON.stringify(p);state='saved';recoveryChoice=false;}
    else state=result.code==='conflict'?'conflict':result.code==='recovery-required'?'recovery':'error';
    update();
    if(was!==state&&state!=='saved')toast(messages()[state]);
    if(result.ok&&['error','conflict','recovery'].includes(was))toast(tr('保存已恢复，当前工程已存到此设备','Saving recovered. This project is saved on this device.'));
    return result.ok;
  }
  function rawDownload(key,raw){download(key+'.json',new Blob([raw],{type:'application/json'}));toast(tr('原始数据下载已启动，请确认文件已保存。','Original-data download started. Check that the file was saved.'));}
  function resolve(){
    const external=storage.external();
    if(!external.ok){toast(messages().error);return;}
    if(external.changed)state='conflict';
    const recovery=storage.recovery;
    const actions=[];
    if(recovery)actions.push({label:tr('导出保留原文','Export preserved original'),run:()=>{rawDownload(recovery.key,recovery.raw);return false;}});
    if(state==='conflict'){
      const raw=external.raw;
      if(raw!==null)actions.push({label:tr('导出另一版本','Export other version'),run:()=>{rawDownload(STORE+'-other-window',raw);return false;}});
      let other;try{if(raw!==null)other=readProject(raw).project;}catch{/* Keep invalid bytes available for download. */}
      if(other)actions.push({label:tr('读取另一版本','Load other version'),run:()=>{
        if(storage.external().raw!==raw)throw Error(tr('另一版本又有变化，请重新打开。','The other version changed again. Reopen this dialog.'));
        const current=storage.load();lastSaved=JSON.stringify(current.project);state='saved';recoveryChoice=false;replace(current.project,{touch:false});update();
      }});
      actions.push({label:tr('保留本窗口并覆盖','Keep this window and overwrite'),run:()=>{
        const ok=save({overwriteRaw:raw,recover:true});if(!ok)throw Error(tr('未覆盖：数据再次变化或备份 / 保存失败，请重试。','Not overwritten: data changed again, or backup/save failed. Retry.'));
      }});
    }else if(recovery){
      for(const key of [V1_STORE,LEGACY_STORE]){
        const raw=readOriginal(key);if(raw===null)continue;
        try{
          const project=readProject(raw,key===LEGACY_STORE).project;
          actions.push({label:key===LEGACY_STORE?tr('恢复原始示例旧格式','Restore legacy original sample'):tr('恢复旧版 v1 工程','Restore older v1 project'),run:()=>{
            scope.timeout(()=>protection.replace(project,{onReplace:p=>{recoveryChoice=true;replace(p);}}),0);
          }});
        }catch{/* Invalid older keys never silently replace the project. */}
      }
      actions.push({label:tr('保留原文备份并保存当前工程','Archive original and save current project'),run:()=>{
        recoveryChoice=true;if(!save())throw Error(tr('原文仍保留，备份或保存失败；修复存储后重试。','Original preserved. Backup or save failed; restore storage access and retry.'));
      }});
    }
    update();
    protection.show({title:tr('恢复与窗口冲突','Recovery and window conflict'),message:state==='conflict'?tr('设备上存在另一版本。当前工程仍保留在本窗口。先导出所需版本，再明确选择读取或覆盖；不会自动合并。读取将替换本窗口工程与草稿，可撤销。覆盖前必须成功保留另一版本的本地恢复副本。','Another version exists on this device. This project remains in this window. Export the versions you need, then choose to load or overwrite; versions are not merged. Loading replaces this project and its drafts and can be undone. Overwrite requires a successful local recovery copy of the other version.'):tr('无法读取的原始数据未被覆盖，也未自动回退。可导出原文、打开有效 JSON，或明确选择备份原文后保存当前工程。备份失败会阻止覆盖。','Unreadable original data has not been overwritten or silently replaced with an older version. Export the original, open a valid JSON, or explicitly archive the original and save this project. A failed archive blocks overwrite.'),actions});
  }
  function archives(){
    const result=storage.archives();
    if(!result.ok){toast(tr('无法读取恢复副本','Could not read recovery copies'));return;}
    const entries=result.entries,actions=[];
    for(const entry of entries){
      actions.push({label:tr('导出 ','Export ')+entry.key,run:()=>{rawDownload(entry.key,entry.raw);return false;}});
      try{const p=readProject(entry.raw).project;actions.push({label:tr('打开 ','Open ')+entry.key,run:()=>{scope.timeout(()=>protection.replace(p,{onReplace:replace}),0);}});}catch{/* Corrupt archives are exported as exact bytes. */}
    }
    protection.show({title:tr('本地恢复副本','Device recovery copies'),message:tr('恢复副本只在此浏览器站点内；不是云备份。原文可下载，有效项目可审查后打开。副本不会自动清理。','Recovery copies exist only in this browser site; they are not cloud backups. Download original bytes or review and open a valid project. Copies are never automatically removed.'),extra:entries.length?'':`<p>${esc(tr('没有恢复副本','No recovery copies'))}</p>`,actions});
  }
  const unsubscribe=store.subscribe(({reason})=>{if(reason!=='cancel')save();});
  scope.on(window,'storage',event=>{
    if(event.storageArea!==localStorage||event.key!==STORE&&event.key!==null)return;
    const external=storage.external();if(external.ok&&external.changed){state='conflict';update();toast(messages().conflict);}
  });
  scope.on(window,'beforeunload',event=>{
    if(JSON.stringify(store.getCommittedProject())!==(lastSaved??initial)){event.preventDefault();event.returnValue='';}
  });
  $('#retrySave').onclick=()=>save();$('#backupMemory').onclick=exportProject;$('#resolveStorage').onclick=resolve;$('#recoveryCopies').onclick=archives;
  update();
  return {update,dispose(){unsubscribe();scope.dispose();for(const id of ['retrySave','backupMemory','resolveStorage','recoveryCopies'])$('#'+id).onclick=null;}};
}
