import {$} from '../ui/dom.js';
import {paneOverlay} from '../ui/dom.js';
import {tr} from '../ui/i18n.js';
export function createDrawers(){
const PANES = 'huxing-panes';
const panes = (() => { try { return JSON.parse(localStorage.getItem(PANES)) || {}; } catch { return {}; } })();
function drawer(which, open){
  const app = $('.app'), els = {lib:$('aside.lib'), panel:$('aside.right')};
  if (which && paneOverlay(which)) {
    Object.entries(els).forEach(([k, el]) => {
      if (paneOverlay(k)) el.classList.toggle('open', k === which && (open ?? !el.classList.contains('open')));
    });
  } else {
    Object.values(els).forEach(el => el.classList.remove('open'));
    if (which){
      const k = which === 'lib' ? 'hideLib' : 'hidePanel';
      panes[k] = open === undefined ? !panes[k] : !open;
      try { localStorage.setItem(PANES, JSON.stringify(panes)); } catch {}
    }
  }
  app.classList.toggle('hide-lib', !!panes.hideLib); app.classList.toggle('hide-panel', !!panes.hidePanel);
  syncPaneBtns();
}
function syncPaneBtns(){
  const els = {lib:$('aside.lib'), panel:$('aside.right')};
  const vis = k => paneOverlay(k) ? els[k].classList.contains('open') : !panes[k === 'lib' ? 'hideLib' : 'hidePanel'];
  $('#tgLib').classList.toggle('on', vis('lib')); $('#tgPanel').classList.toggle('on', vis('panel'));
  $('#tgLib').title = vis('lib') ? tr('收起家具库 ( [ )', 'Hide library ( [ )') : tr('展开家具库 ( [ )', 'Show library ( [ )');
  $('#tgPanel').title = vis('panel') ? tr('收起属性面板 ( ] )', 'Hide properties ( ] )') : tr('展开属性面板 ( ] )', 'Show properties ( ] )');
  for (const k of ['lib','panel']) {
    const button = $(k==='lib'?'#tgLib':'#tgPanel');
    button.setAttribute('aria-expanded',String(vis(k)));
    button.setAttribute('aria-controls',els[k].id);
    els[k].inert = !vis(k);
  }
  $('#stage').classList.toggle('drawer-panel', paneOverlay('panel') && vis('panel'));   // 属性抽屉盖住画面时让出底部工具条
}
function closeDrawers(){ drawer(null); }
function escapeDrawer(){
 const opened=[['lib',$('aside.lib')],['panel',$('aside.right')]].find(([k,el])=>paneOverlay(k)&&el.classList.contains('open'));
 if(!opened)return false;drawer(opened[0],false);$(opened[0]==='lib'?'#tgLib':'#tgPanel').focus();return true;
}


return {drawer,closeDrawers,syncPaneBtns,escapeDrawer};
}
