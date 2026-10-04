import {createProjectProtection} from './ui/project-protection.js';
import {createSaveRecovery} from './ui/save-recovery.js';
import {createUseZones} from './ui/use-zones.js';
import {createPassageClearance} from './ui/passage-clearance.js';
import {createDoorClearance} from './ui/door-clearance.js';
import {createReferencePlan} from './ui/reference-plan.js';
import {$} from './ui/dom.js';
import {createProjectStore} from './core/project-store.js';
import {createEditorState} from './core/editor-state.js';
import {createProjectActions} from './ui/project-actions.js';
import {starterState} from './data/default-project.js';
import {createStorage} from './services/storage.js';
import {readProject} from './services/project-files.js';
import {createDownloads} from './services/downloads.js';
import {createEditor2D} from './editor2d/editor.js';
import {createDrawers} from './ui/drawers.js';
import {createPropertyPanel} from './ui/property-panel.js';
import {createFurnitureLibrary} from './ui/furniture-library.js';
import {createToolbar} from './ui/toolbar.js';
import {createRoomEditor} from './ui/room-editor.js';
import {createFileMenu} from './ui/file-menu.js';
import {createNotifications} from './ui/notifications.js';
import {createScope} from './ui/lifecycle.js';
import {LANG,tr,applyStaticLang,setLanguage} from './ui/i18n.js';

/** The entry point assembles components. The store never imports a view. */
export function createApplication(){
  const scope=createScope();
  const storage=createStorage({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),get length(){return localStorage.length;},key:i=>localStorage.key(i)},readProject);
  const loaded=storage.load(),store=createProjectStore(loaded.project || starterState()),ui=createEditorState(store);
  const notifications=createNotifications(),{toast}=notifications,drawers=createDrawers();
  let reference,clearance,passage,useZones;
  let viewer=null,viewerPromise=null,viewMode='2d',switching=false,viewAttempt=0,last3DError=null,toolbar,editor,panel,roomEditor,library;
  const mode={is3D:()=>viewMode==='3d',setView,walking:()=>viewer?.walking() || false,cancelInteraction:()=>{editor?.cancel();viewer?.cancel();}};
  const actions=createProjectActions({store,ui,toast,onSelection:()=>{editor?.renderer.renderSel();panel?.update();roomEditor?.update();library?.update();}});
  actions.showStructure=()=>{if(store.getProject().roomEditor){const r=store.getProject().roomEditor;actions.select({kind:'wall',id:r.kind==='house'?(ui.activeRoom||r.rooms[0].id)+'--'+(ui.lastWall||'top'):ui.lastWall||'top'});}drawers.drawer('panel',true);$('#structurePanel').hidden=false;$('aside.right').scrollTop=0;};
  const undo=()=>{if(switching)return;editor.cancel();viewer?.cancel();if(!store.undo()) toast(tr('没有可撤销的操作','Nothing to undo'));};
  const redo=()=>{if(!switching){editor.cancel();viewer?.cancel();store.redo();}};
  editor=createEditor2D({store,ui,actions,drawers,mode,setTool:t=>toolbar.setTool(t),toggleFullscreen:()=>toolbar.toggleFullscreen(),undo,redo});
  panel=createPropertyPanel({store,ui,actions,drawers,toast,is3D:mode.is3D,flyToRoom:id=>viewer?.flyToRoom(id)});
  library=createFurnitureLibrary({store,ui,viewport:editor.viewport,actions,drawers,is3D:mode.is3D,groundAt:(x,y)=>viewer?.groundAt(x,y),flyToRoom:id=>viewer?.flyToRoom(id),toast});
  toolbar=createToolbar({store,ui,viewport:editor.viewport,drawers,mode,undo,redo,clearLayout:actions.clearLayout,renderMeasure:editor.renderer.renderMeasure,toast,cancelInteraction:()=>{editor.cancel();viewer?.cancel();}});
  const downloads=createDownloads({store,ui,svg:$('#plan'),is3D:mode.is3D,shot:(name,size)=>viewer?.shot(name,size),prepare3D:async()=>{await setView('3d');if(!mode.is3D())throw Error('3D unavailable');}});
  let files;
  const protection=createProjectProtection({store,exportProject:()=>files.exportProject(),toast,discardDrafts:()=>panel.resetDrafts()});
  const replace=(project,options)=>{editor.cancel();viewer?.cancel();ui.sel=null;store.replaceProject(project,options);panel.resetDrafts();};
  files=createFileMenu({store,ui,downloads,isSwitching:()=>switching,toast,loaded,protection,cancelInteraction:()=>{editor.cancel();viewer?.cancel();}});
  roomEditor=createRoomEditor({store,ui,actions,cancelInteraction:()=>{editor.cancel();viewer?.cancel();},exportProject:files.exportProject,isSwitching:()=>switching,toast});
  actions.deleteOpening=roomEditor.remove;
  const locatePoint=async(point,roomId)=>{if(mode.is3D())await setView('2d');if(roomId)actions.select({kind:'room',id:roomId});drawers.drawer('panel',true);const v=editor.viewport.view,svg=$('#plan');v.x0=point[0]-svg.clientWidth/2/v.s;v.y0=point[1]-svg.clientHeight/2/v.s;editor.viewport.applyView();};
  const locateFurniture=async id=>{if(!id)return;if(mode.is3D())await setView('2d');const f=actions.getF(id);if(!f)return;actions.select({kind:'furn',id});drawers.drawer('panel',true);const v=editor.viewport.view,svg=$('#plan');v.x0=f.cx-svg.clientWidth/2/v.s;v.y0=f.cy-svg.clientHeight/2/v.s;editor.viewport.applyView();};
  clearance=createDoorClearance({store,locate:locateFurniture,locateObstacle:o=>locatePoint([(o.rect[0]+o.rect[2])/2,(o.rect[1]+o.rect[3])/2],o.roomId)});
  passage=createPassageClearance({store,locate:locateFurniture,locatePoint,cancelInteraction:()=>{editor.cancel();viewer?.cancel();}});
  useZones=createUseZones({store,locate:locateFurniture,locatePoint});
  reference=createReferencePlan({store,fitView:editor.viewport.fitView,cancelInteraction:()=>{editor.cancel();viewer?.cancel();},toast});
  function update(){clearance?.update();passage?.update();useZones?.update();reference?.update();library.update();editor.viewport.applyView();editor.update();panel.update();roomEditor?.update();toolbar.update();viewer?.sync();}
  const recovery=createSaveRecovery({store,storage,loaded,protection,readOriginal:key=>localStorage.getItem(key),download:downloads.download,exportProject:files.exportProject,replace,toast});
  let geometry=JSON.stringify(store.getProject().geometry);
  const unsubscribe=store.subscribe(({project,reason})=>{
    if(ui.sel?.kind==='opening' && !project.roomEditor?.openings.some(o=>o.id===ui.sel.id) || ui.sel?.kind==='wall' && !project.roomEditor) ui.sel=null;
    if(ui.sel?.kind==='furn' && !actions.getF(ui.sel.id) || ui.sel?.kind==='room' && !project.rooms[ui.sel.id]) ui.sel=null;
    if(geometry!==JSON.stringify(project.geometry)){geometry=JSON.stringify(project.geometry);ui.mA=ui.mCur=null;editor.viewport.fitView();}
    update();
    if(reason!=='cancel' && !switching && project.view.mode!==viewMode) setView(project.view.mode);
  });
  function show3DError(){
    $('#viewError').hidden=!last3DError;
    if(!last3DError)return;
    const messages={
      module:['3D 文件加载失败。请重试；如仍失败，先导出 JSON 备份，再刷新页面。','3D files could not load. Retry; if it persists, export a JSON backup before reloading.'],
      timeout:['3D 加载超时。2D 和 JSON 仍可使用，请重试。','3D loading timed out. 2D and JSON remain available. Retry.'],
      webgl:['无法启动 WebGL。请重试或检查浏览器的图形支持。2D 和 JSON 仍可使用。','WebGL could not start. Retry or check browser graphics support. 2D and JSON remain available.'],
      context:['3D 图形上下文已丢失。已返回 2D，可重试 3D。','The 3D graphics context was lost. Returned to 2D; retry 3D.'],
      scene:['3D 场景初始化失败。2D 和 JSON 仍可使用，请重试。','The 3D scene could not initialize. 2D and JSON remain available. Retry.']
    };
    $('#viewErrorMessage').textContent=tr(...messages[last3DError]);
  }
  function fail3D(error){
    if(scope.disposed)return;
    viewAttempt++;
    console.error('3D initialization failed:',error);
    last3DError=error.kind||'scene';
    viewer?.dispose();viewer=null;viewerPromise=null;viewMode='2d';switching=false;
    document.body.classList.remove('m3d','busy');$('#stage').classList.remove('is3d','animating');
    $('#viewSeg').setAttribute('aria-busy','false');$('#viewStatus').textContent='';
    store.setView({mode:'2d'});toolbar.update();show3DError();
    toast(tr('3D 不可用，已保留 2D 和项目文件。','3D unavailable. 2D and project files remain available.'));
  }
  async function loadViewer(attempt){
    if(!viewerPromise) viewerPromise=import('./viewer3d/viewer.js').catch(cause=>{throw Object.assign(new Error('3D module load failed',{cause}),{kind:'module'});}).then(({createViewer3D})=>{
      if(scope.disposed||attempt!==viewAttempt)return null;
      viewer=createViewer3D({store,ui,view:editor.viewport.view,actions,snapMove:editor.snapping.snapMove,closeDrawers:drawers.closeDrawers,onChange:update,onFailure:fail3D});
      return viewer;
    });
    return viewerPromise;
  }
  async function setView(m){
    if(scope.disposed || switching) return;
    if(m===viewMode){store.setView({mode:m});return;}
    const attempt=++viewAttempt;
    switching=true;editor.cancel();document.body.classList.add('busy');$('#viewSeg').setAttribute('aria-busy','true');$('#viewStatus').textContent=tr('正在切换视图…','Switching view…');
    let timer;
    try{
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('3D load timed out'),{kind:'timeout'})),15000);});
      const next=await Promise.race([loadViewer(attempt),timeout]);clearTimeout(timer);
      if(!next || scope.disposed||attempt!==viewAttempt)return;
      if(m==='3d'){toolbar.setTool('select');document.body.classList.add('m3d');await next.enter();}
      else{document.body.classList.remove('m3d');await next.exit();editor.viewport.applyView();}
      if(scope.disposed||attempt!==viewAttempt)return;
      viewMode=m;last3DError=null;show3DError();store.setView({mode:m});toolbar.update();
    }catch(error){if(attempt===viewAttempt)fail3D(error);}
    finally{clearTimeout(timer);if(attempt===viewAttempt){switching=false;if(!scope.disposed){document.body.classList.remove('busy');$('#viewSeg').setAttribute('aria-busy','false');$('#viewStatus').textContent='';}}}
  }
  $('#retry3d').onclick=()=>setView('3d');
  function relang(){applyStaticLang();show3DError();recovery.update();library.update();update();viewer?.relang();}
  $('#langBtn').onclick=()=>{setLanguage(LANG==='en'?'zh':'en');relang();};
  relang();editor.viewport.fitView();
  if(loaded.migrationError) toast(tr('旧项目已读取，但 v2 保存失败，请导出备份。','Old project loaded, but v2 could not be saved. Export a backup.'));
  // Load the bundled Three modules only on demand; 2D remains independent.
  if(store.getProject().view.mode==='3d') setView('3d');
  function dispose(){
    if(scope.disposed)return;
    unsubscribe();scope.dispose();reference.dispose();clearance.dispose();passage.dispose();useZones.dispose();roomEditor.dispose();editor.dispose();viewer?.dispose();library.dispose();panel.dispose();toolbar.dispose();files.dispose();recovery.dispose();protection.dispose();downloads.dispose();notifications.dispose();store.dispose();
    viewAttempt++;$('#retry3d').onclick=null;$('#langBtn').onclick=null;document.body.classList.remove('m3d','busy');$('#stage').classList.remove('is3d','animating');
  }
  scope.on(window,'pagehide',dispose);
  return {dispose};
}
export const application=createApplication();
