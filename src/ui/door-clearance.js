import {obstacleConflicts} from '../core/obstacle-clearance.js';
import {floorConflicts} from '../core/floor-clearance.js';
import {bbox} from '../core/geometry.js';
import {doorConflicts} from '../core/door-clearance.js';
import {$,esc} from './dom.js';
import {tr,nm,LANG} from './i18n.js';
export function createDoorClearance({store,locate,locateObstacle}){
 let signature;
 const locateWall=c=>locateObstacle({roomId:c.wall.roomId,rect:bbox(c.wall.poly)});
 return {update(){
  const p=store.getProject(),key=JSON.stringify([p.geometry,p.furniture,LANG]);if(key===signature)return;signature=key;
  const floor=floorConflicts(p),conflicts=doorConflicts(p),fixed=obstacleConflicts(p),status=$('#clearanceStatus'),panel=$('#clearancePanel');status.hidden=panel.hidden=!(conflicts.length+fixed.length+floor.length);
  status.textContent=tr(`⚠ ${conflicts.length} 处家具可能挡门 · 查看属性`, `⚠ ${conflicts.length} potential door conflicts · Properties`);if(fixed.length||floor.length)status.textContent=tr(`⚠ ${conflicts.length+fixed.length+floor.length} 处潜在冲突 · 查看属性`,`⚠ ${conflicts.length+fixed.length+floor.length} potential conflicts · Properties`);status.onclick=()=>conflicts.length?locate(conflicts[0].furnitureId):fixed.length?locateObstacle(fixed[0].obstacle):floor[0].furnitureId?locate(floor[0].furnitureId):locateWall(floor[0]);
  panel.innerHTML=conflicts.length?`<section><h3>${tr('开门冲突','Door swing conflicts')}</h3><p class="muted">${tr('家具占地与门扇扫掠区相交。移开或调整后自动复核。','Furniture footprint intersects a door swing. Rechecked after moving or rotating.')}</p>${conflicts.map(c=>`<button class="btn" data-conflict="${esc(c.furnitureId)}">${tr('定位：','Locate: ')}${esc(nm(c.name))} · ${esc(nm(c.door.name))}</button>`).join('')}</section>`:'';
  if(fixed.length)panel.innerHTML+=`<section><h3>${tr('固定障碍物冲突','Fixed obstacle conflicts')}</h3><p class="muted">${tr('平面占地与家具或平开门扫掠区相交；未计算高度避让。调整后自动复核。','Plan footprints intersect furniture or swing-door sweeps; height clearance is not calculated. Rechecked after edits.')}</p>${fixed.map(c=>`<button class="btn" data-obstacle-conflict="${esc(c.obstacle.id)}">${esc(c.obstacle.name)} · ${esc(nm(c.name))} · ${c.kind==='door'?tr('门扇','Door swing'):tr('家具','Furniture')}</button>`).join('')}</section>`;
  if(floor.length)panel.innerHTML+=`<section><h3>${tr('地面 / 斜向边界冲突','Floor / diagonal boundary conflicts')}</h3><p class="muted">${tr('家具超出净地面或占地进入斜墙；也复核平开门扫掠。','Furniture leaves the net floor or intersects a diagonal wall. Swing-door sweeps are also checked.')}</p>${floor.map((c,i)=>`<button class="btn" data-floor-conflict="${i}">${esc(nm(c.name))} · ${c.kind==='floor'?tr('超出净地面','Outside net floor'):tr('斜向边界','Diagonal boundary')}</button>`).join('')}</section>`;
  panel.querySelectorAll('[data-floor-conflict]').forEach(b=>b.onclick=()=>{const c=floor[+b.dataset.floorConflict];if(c.furnitureId)locate(c.furnitureId);else locateWall(c);});
  panel.querySelectorAll('[data-obstacle-conflict]').forEach(b=>b.onclick=()=>locateObstacle(fixed.find(c=>c.obstacle.id===b.dataset.obstacleConflict).obstacle));
  panel.querySelectorAll('[data-conflict]').forEach(b=>b.onclick=()=>locate(b.dataset.conflict));
 },dispose(){$('#clearanceStatus').onclick=null;$('#clearancePanel').replaceChildren();}};
}
