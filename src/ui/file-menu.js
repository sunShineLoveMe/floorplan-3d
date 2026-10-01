import {$} from '../ui/dom.js';
import {tr} from './i18n.js';
import {ProjectError} from '../data/project-data.js';
import {defaultState} from '../data/default-project.js';
import {importProject,serializeProject} from '../services/project-files.js';
import {createScope} from './lifecycle.js';
export function createFileMenu({store,ui,downloads,isSwitching,toast,loaded,cancelInteraction}){
const scope=createScope();const {download,exportPNG}=downloads;
let revision=0,readRequest=0;
const unsubscribe=store.subscribe(()=>{revision++;});
$('#exportPng').onclick=async()=>{
 const button=$('#exportPng');if(button.disabled)return;
 button.disabled=true;button.setAttribute('aria-busy','true');
 try{await exportPNG();if(!scope.disposed)toast(tr('图片已生成，下载已启动','Image generated. Download started.'));}
 catch{if(!scope.disposed)toast(tr('图片生成失败，请重试或导出项目 JSON','Image export failed. Retry or export the project JSON.'));}
 finally{if(!scope.disposed){button.disabled=false;button.setAttribute('aria-busy','false');}}
};
function projectMessage(err){
  const messages={
    INVALID_JSON:['文件不是有效的 JSON','The file is not valid JSON.'],
    UNKNOWN_FORMAT:['无法识别项目格式','Unrecognized project format.'],
    UNSUPPORTED_VERSION:['不支持此项目版本，请使用匹配版本的应用','Unsupported project version. Use a compatible app version.'],
    INVALID_PROJECT:['项目数据不完整或不合法','Project data is incomplete or invalid.']
  };
  const m=messages[err.code] || ['无法读取或恢复项目','Could not read or restore the project.']; return tr(...m);
}
function importProjectText(raw){
  if(isSwitching()) throw new Error('Wait for the view transition to finish.');
  const result=importProject(raw, {
    confirmLegacy:()=>confirm(tr('此旧文件没有户型几何。请确认它来自原始“三室两厅两卫”示例。确认后先下载原文件备份再迁移。','Confirm this file belongs to the original three-bedroom sample. A backup will be downloaded before migration.')),
    backup:text=>download('floorplan-legacy-backup.json',new Blob([text],{type:'application/json'})),
    replace:project=>{cancelInteraction();ui.sel=null; store.replaceProject(project); }
  });
  if(result.status==='cancelled') return false;
  toast(tr('项目已导入','Project imported')); return true;
}
function exportProject(){
  try {
    const raw=serializeProject(store.getProject());
    download('floorplan-project.json',new Blob([raw],{type:'application/json'}));toast(tr('JSON 文件已生成，下载已启动','JSON file generated. Download started.'));
  } catch(e){ toast(projectMessage(e)); }
};
$('#exportJson').onclick=exportProject;
$('#importJson').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = async e => {
  const file=e.target.files[0]; e.target.value=''; if(!file) return;
  const request=++readRequest,startRevision=revision;$('#importJson').disabled=true;$('#importJson').setAttribute('aria-busy','true');
  try {
    if(file.size>10*1024*1024) throw new ProjectError('INVALID_PROJECT');
    const raw=await file.text();if(scope.disposed || request!==readRequest)return;
    if(startRevision!==revision){toast(tr('项目已变化，已取消迟到的文件读取；请重新导入。','The project changed while reading the file. Import it again.'));return;}
    importProjectText(raw);
  }
  catch(e){ if(!scope.disposed && request===readRequest) alert(projectMessage(e)); }
  finally{if(!scope.disposed&&request===readRequest){$('#importJson').disabled=false;$('#importJson').setAttribute('aria-busy','false');}}
};
$('#reset').onclick = () => { if(isSwitching())return; if (confirm(tr('恢复为默认设计方案？（可撤销）', 'Reset to the default design? (undoable)'))){ cancelInteraction();ui.sel = null; store.replaceProject(defaultState()); } };

if(loaded.error) scope.timeout(()=>alert(tr('已保留无法读取的本地项目，当前显示示例。','The unreadable local project has been preserved. Showing the sample.')+' '+projectMessage(loaded.error)),0);
if(loaded.legacy) scope.timeout(()=>{try{importProjectText(loaded.legacy);}catch(e){alert(projectMessage(e));}},0);
return {exportProject,dispose(){unsubscribe();readRequest++;scope.dispose();for(const id of ['exportPng','exportJson','importJson','reset']) $('#'+id).onclick=null;$('#fileIn').onchange=null;}};
}
