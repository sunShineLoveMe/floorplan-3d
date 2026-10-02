import {doorConflicts} from '../core/door-clearance.js';
import {$,esc} from './dom.js';
import {tr,nm,LANG} from './i18n.js';
export function createDoorClearance({store,locate}){
 let signature;
 return {update(){
  const p=store.getProject(),key=JSON.stringify([p.geometry.doors,p.furniture,LANG]);if(key===signature)return;signature=key;
  const conflicts=doorConflicts(p),status=$('#clearanceStatus'),panel=$('#clearancePanel');status.hidden=panel.hidden=!conflicts.length;
  status.textContent=tr(`⚠ ${conflicts.length} 处家具可能挡门 · 查看属性`, `⚠ ${conflicts.length} potential door conflicts · Properties`);status.onclick=()=>locate(conflicts[0]?.furnitureId);
  panel.innerHTML=conflicts.length?`<section><h3>${tr('开门冲突','Door swing conflicts')}</h3><p class="muted">${tr('家具占地与门扇扫掠区相交。移开或调整后自动复核。','Furniture footprint intersects a door swing. Rechecked after moving or rotating.')}</p>${conflicts.map(c=>`<button class="btn" data-conflict="${esc(c.furnitureId)}">${tr('定位：','Locate: ')}${esc(nm(c.name))} · ${esc(nm(c.door.name))}</button>`).join('')}</section>`:'';
  panel.querySelectorAll('[data-conflict]').forEach(b=>b.onclick=()=>locate(b.dataset.conflict));
 },dispose(){$('#clearanceStatus').onclick=null;$('#clearancePanel').replaceChildren();}};
}
