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
  let viewer=null,viewerPromise=null,viewMode='2d',switching=false,toolbar,editor,panel,roomEditor,library;
  const mode={is3D:()=>viewMode==='3d',setView,walking:()=>viewer?.walking() || false};
  const actions=createProjectActions({store,ui,toast,onSelection:()=>{editor?.renderer.renderSel();panel?.update();roomEditor?.update();library?.update();}});
  actions.showStructure=()=>{if(store.getProject().roomEditor){const r=store.getProject().roomEditor;actions.select({kind:'wall',id:r.kind==='house'?(ui.activeRoom||r.rooms[0].id)+'--'+(ui.lastWall||'top'):ui.lastWall||'top'});}drawers.drawer('panel',true);$('#structurePanel').hidden=false;$('aside.right').scrollTop=0;};
  const undo=()=>{if(switching)return;editor.cancel();viewer?.cancel();if(!store.undo()) toast(tr('没有可撤销的操作','Nothing to undo'));};
  const redo=()=>{if(!switching){editor.cancel();viewer?.cancel();store.redo();}};
  editor=createEditor2D({store,ui,actions,drawers,mode,setTool:t=>toolbar.setTool(t),toggleFullscreen:()=>toolbar.toggleFullscreen(),undo,redo});
  panel=createPropertyPanel({store,ui,actions,drawers,toast,is3D:mode.is3D,flyToRoom:id=>viewer?.flyToRoom(id)});
  library=createFurnitureLibrary({store,ui,viewport:editor.viewport,actions,drawers,is3D:mode.is3D,groundAt:(x,y)=>viewer?.groundAt(x,y),flyToRoom:id=>viewer?.flyToRoom(id),toast});
  toolbar=createToolbar({store,ui,viewport:editor.viewport,drawers,mode,undo,redo,clearLayout:actions.clearLayout,renderMeasure:editor.renderer.renderMeasure,toast,cancelInteraction:()=>{editor.cancel();viewer?.cancel();}});
  const downloads=createDownloads({store,ui,svg:$('#plan'),is3D:mode.is3D,shot:name=>viewer?.shot(name),prepare3D:async()=>{await setView('3d');if(!mode.is3D())throw Error('3D unavailable');}});
  let files;
  const protection=createProjectProtection({store,exportProject:()=>files.exportProject(),toast});
  const replace=(project,options)=>{editor.cancel();viewer?.cancel();ui.sel=null;store.replaceProject(project,options);};
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
  async function loadViewer(){
    if(!viewerPromise) viewerPromise=import('./viewer3d/viewer.js').then(({createViewer3D})=>{
      if(scope.disposed) return null;
      viewer=createViewer3D({store,ui,view:editor.viewport.view,actions,snapMove:editor.snapping.snapMove,closeDrawers:drawers.closeDrawers,onChange:update});
      return viewer;
    });
    return viewerPromise;
  }
  async function setView(m){
    if(scope.disposed || switching) return;
    if(m===viewMode){store.setView({mode:m});return;}
    switching=true;editor.cancel();document.body.classList.add('busy');$('#viewSeg').setAttribute('aria-busy','true');$('#viewStatus').textContent=tr('正在切换视图…','Switching view…');
    try{
      const next=await loadViewer();if(!next || scope.disposed)return;
      if(m==='3d'){toolbar.setTool('select');document.body.classList.add('m3d');await next.enter();}
      else{document.body.classList.remove('m3d');await next.exit();editor.viewport.applyView();}
      if(scope.disposed)return;
      viewMode=m;store.setView({mode:m});toolbar.update();
    }catch(error){
      if(scope.disposed)return;
      console.error('3D initialization failed:',error);
      viewer?.dispose();viewer=null;viewerPromise=null;viewMode='2d';
      document.body.classList.remove('m3d');$('#stage').classList.remove('is3d','animating');
      toast(tr('3D 加载失败，仍可使用 2D 和项目文件；请检查网络或 WebGL 支持。','3D could not load. 2D and project files remain available. Check network or WebGL support.'));
    }finally{switching=false;if(!scope.disposed){document.body.classList.remove('busy');$('#viewSeg').setAttribute('aria-busy','false');$('#viewStatus').textContent='';}}
  }
  function relang(){applyStaticLang();recovery.update();library.update();update();viewer?.relang();}
  $('#langBtn').onclick=()=>{setLanguage(LANG==='en'?'zh':'en');relang();};
  relang();editor.viewport.fitView();
  if(loaded.migrationError) toast(tr('旧项目已读取，但 v2 保存失败，请导出备份。','Old project loaded, but v2 could not be saved. Export a backup.'));
  // Load Three only on demand; a CDN failure cannot block the 2D boot path.
  if(store.getProject().view.mode==='3d') setView('3d');
  function dispose(){
    if(scope.disposed)return;
    unsubscribe();scope.dispose();reference.dispose();clearance.dispose();passage.dispose();useZones.dispose();roomEditor.dispose();editor.dispose();viewer?.dispose();library.dispose();panel.dispose();toolbar.dispose();files.dispose();recovery.dispose();protection.dispose();downloads.dispose();notifications.dispose();store.dispose();
    $('#langBtn').onclick=null;document.body.classList.remove('m3d','busy');$('#stage').classList.remove('is3d','animating');
  }
  scope.on(window,'pagehide',dispose);
  return {dispose};
}
export const application=createApplication();
