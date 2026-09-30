import {$} from '../ui/dom.js';
import {createScope} from '../ui/lifecycle.js';
import {createViewport} from './viewport.js';
import {createRenderer} from './renderer.js';
import {createSnapping} from './snapping.js';
import {createInteractions} from './interactions.js';
import {buildDefs} from './defs.js';
export function createEditor2D({store,ui,actions,drawers,mode,setTool,toggleFullscreen,undo,redo}){
const scope=createScope(),svg=$('#plan');
let renderer;
const viewport=createViewport({store,svg,onChange:()=>{renderer?.renderSel();renderer?.renderMeasure();}});
renderer=createRenderer({store,ui,view:viewport.view});
const snapping=createSnapping({store,ui,view:viewport.view,snapRects:actions.snapRects});
const interactions=createInteractions({store,ui,svg,viewport,renderer,snapping,actions,drawers,mode,setTool,toggleFullscreen,undo,redo});
const {view,fitView,applyView}=viewport;
buildDefs();
let lastW = 0, lastH = 0;
scope.observe(svg, () => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
});


return {viewport,snapping,renderer,cancel:interactions.cancel,update(){renderer.update();interactions.updateStatus();},dispose(){interactions.dispose();scope.dispose();}};
}
