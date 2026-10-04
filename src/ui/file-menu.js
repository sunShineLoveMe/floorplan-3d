import {exportName} from '../services/export-names.js';
import {printDocument,printLayout} from '../services/print-plan.js';
import {$} from '../ui/dom.js';
import {tr} from './i18n.js';
import {ProjectError} from '../data/project-data.js';
import {defaultState} from '../data/default-project.js';
import {prepareImport,serializeProject} from '../services/project-files.js';
import {createScope} from './lifecycle.js';
export function createFileMenu({store,ui,downloads,isSwitching,toast,loaded,protection,cancelInteraction}){
const scope=createScope();const {download,exportPNG}=downloads;
let revision=0,readRequest=0;
const unsubscribe=store.subscribe(()=>{revision++;});
$('#exportPng').onclick=async()=>{
 const button=$('#exportPng');if(button.disabled)return;
 button.disabled=true;button.setAttribute('aria-busy','true');
 try{await exportPNG($('#exportView').value,Number($('#exportResolution').value));if(!scope.disposed)toast(tr('图片已生成，下载已启动','Image generated. Download started.'));}
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
  let result=prepareImport(raw),legacy=false;
  if(result.status==='confirmation-required'){
    if(!confirm(tr('此旧文件没有户型几何。请确认它来自原始“三室两厅两卫”示例。','Confirm this file belongs to the original three-bedroom sample. It has no floor-plan geometry.')))return false;
    result=prepareImport(raw,true);legacy=true;
  }
  if(result.status==='error')throw result.error;
  protection.replace(result.project,{
    label:tr('打开工程并替换','Open project and replace'),
    beforeReplace:()=>{if(legacy)download('floorplan-legacy-backup.json',new Blob([raw],{type:'application/json'}));},
    onReplace:project=>{if(isSwitching())throw Error('Wait for the view transition to finish.');cancelInteraction();ui.sel=null;store.replaceProject(project);},
    afterReplace:()=>toast(tr('项目已导入','Project imported'))
  });
  return true;
}
function exportProject(){
  try {
    const raw=serializeProject(store.getCommittedProject());
    download(exportName(store.getCommittedProject(),'project','json'),new Blob([raw],{type:'application/json'}));toast(tr('JSON 文件已生成，下载已启动','JSON file generated. Download started.'));
  } catch(e){ toast(projectMessage(e)); }
};
$('#exportJson').onclick=exportProject;
$('#fileName').onchange=e=>{const name=e.target.value.trim();if(name)store.mutate(p=>p.name=name);};
$('#layoutName').onchange=e=>{const name=e.target.value.trim();if(name)store.mutate(p=>p.layout.name=name);};
$('#printPlan').onclick=()=>{
 try{const project=store.getProject(),options={paper:$('#printPaper').value,orientation:$('#printOrientation').value,scale:$('#printScale').value};printLayout(project.geometry.bounds,options);
 const win=window.open('','_blank');if(!win)throw Error('Allow popups to open the print preview.');win.document.open();win.document.write(printDocument(project,downloads.planSVG(),options,exportName(project,'print','pdf')));win.document.close();win.opener=null;
 }catch(error){toast(error.message);}
};
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
$('#reset').onclick = () => {if(isSwitching())return;protection.replace(defaultState(),{label:tr('恢复示例工程','Restore sample project'),onReplace:project=>{cancelInteraction();ui.sel=null;store.replaceProject(project);}});};
if(loaded.error || loaded.legacy)scope.timeout(()=>toast(tr('原始本地数据已保留。文件菜单提供恢复与原文导出。','Original device data preserved. Use Recovery in the file menu to review or export it.')),0);

return {exportProject,dispose(){unsubscribe();readRequest++;scope.dispose();for(const id of ['exportPng','exportJson','importJson','reset','printPlan']) $('#'+id).onclick=null;$('#fileIn').onchange=$('#fileName').onchange=$('#layoutName').onchange=null;}};
}
