import {validateRoomEditor,generateRoomGeometry,WALL_IDS,GEOMETRY_TOLERANCE as EPS} from './room-editor.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const check=(ok,message)=>{if(!ok){const e=Error(message);e.code='INVALID_PROJECT';throw e;}};
export function asHouse(e){
 if(e.kind==='house')return copy(e);
 return {kind:'house',height:e.height,wallThickness:120,rooms:[{id:e.roomId,x:0,y:0,width:e.width,depth:e.depth}],openings:e.openings.map(o=>({...o,roomId:e.roomId,wallId:e.roomId+'--'+o.wallId}))};
}
export const sideOf=id=>id.split('--').at(-1);
export const wallWidth=(room,side)=>room.wallWidths?.[side]??120;
export function validateHouseEditor(e){
 check(e?.kind==='house'&&Array.isArray(e.rooms)&&e.rooms.length>0&&e.rooms.length<=50,'House requires 1–50 rooms.');
 check(Array.isArray(e.openings)&&e.openings.length<=200,'Too many openings.');
 const ids=new Set();
 for(const r of e.rooms){
  check(/^[A-Za-z0-9_-]{1,70}$/.test(r.id)&&!r.id.includes('--')&&!['__proto__','constructor','prototype'].includes(r.id)&&!ids.has(r.id),'Invalid room ID.');ids.add(r.id);
  check([r.x,r.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=100000),'Room origin must be within ±100000 mm.');
  if(r.wallWidths!==undefined){check(r.wallWidths&&typeof r.wallWidths==='object'&&!Array.isArray(r.wallWidths)&&Object.keys(r.wallWidths).every(side=>WALL_IDS.includes(side)),'Invalid wall sides.');for(const width of Object.values(r.wallWidths))check(Number.isFinite(width)&&width>=0&&width<=1000,'Wall thickness must be 0–1000 mm.');}
  for(const o of e.openings.filter(o=>o.roomId===r.id))check(wallWidth(r,sideOf(o.wallId))>0,'An open boundary cannot contain a door or window.');
  validateRoomEditor({kind:'rectangle',roomId:r.id,width:r.width,depth:r.depth,height:e.height,wallThickness:e.wallThickness,openings:e.openings.filter(o=>o.roomId===r.id).map(o=>({...o,wallId:sideOf(o.wallId)}))});
 }
 const roomIds=new Set(ids);
 for(const o of e.openings){check(roomIds.has(o.roomId)&&o.wallId===o.roomId+'--'+sideOf(o.wallId),'Opening parent room/wall.');check(!ids.has(o.id),'Duplicate opening ID.');ids.add(o.id);}
 for(let i=0;i<e.rooms.length;i++)for(let j=i+1;j<e.rooms.length;j++){
  const a=e.rooms[i],b=e.rooms[j],dx=Math.max(b.x-(a.x+a.width),a.x-(b.x+b.width)),dy=Math.max(b.y-(a.y+a.depth),a.y-(b.y+b.depth));
  check(dx>=-EPS||dy>=-EPS,'Rooms overlap.');
  if(dy<-EPS){const aLeft=a.x<b.x,required=Math.max(wallWidth(a,aLeft?'right':'left'),wallWidth(b,aLeft?'left':'right'));check(dx>=required-EPS,`Leave ${required} mm for the shared wall between rooms.`);}
  if(dx<-EPS){const aTop=a.y<b.y,required=Math.max(wallWidth(a,aTop?'bottom':'top'),wallWidth(b,aTop?'top':'bottom'));check(dy>=required-EPS,`Leave ${required} mm for the shared wall between rooms.`);}
 }
 return copy(e);
}
/** Subtract a rectangle into non-overlapping pieces; shared walls are a union. */
function subtract(a,b){
 const x0=Math.max(a[0],b[0]),y0=Math.max(a[1],b[1]),x1=Math.min(a[2],b[2]),y1=Math.min(a[3],b[3]);
 if(x1-x0<=EPS||y1-y0<=EPS)return [a];
 return [[a[0],a[1],x0,a[3]],[x1,a[1],a[2],a[3]],[x0,a[1],x1,y0],[x0,y1,x1,a[3]]].filter(r=>r[2]-r[0]>EPS&&r[3]-r[1]>EPS);
}
export function generateHouseGeometry(input,settings){
 const e=validateHouseEditor(input),parts=e.rooms.map(r=>{
  check(settings[r.id]?.name?.trim(),'Room name is required.');
  const local={kind:'rectangle',roomId:r.id,width:r.width,depth:r.depth,height:e.height,wallThickness:120,openings:e.openings.filter(o=>o.roomId===r.id).map(o=>({...o,wallId:sideOf(o.wallId)}))};
  const g=generateRoomGeometry(local,settings,r.wallWidths),rect=a=>[a[0]+r.x,a[1]+r.y,a[2]+r.x,a[3]+r.y];
  g.rooms.forEach(room=>{room.poly=room.poly.map(([x,y])=>[x+r.x,y+r.y]);room.at=[r.x+r.width/2,r.y+r.depth/2];});
  g.walls=g.walls.map(w=>[...rect(w),'n']);g.wallIds=g.wallIds.map(id=>r.id+'--'+id);
  [...g.doors,...g.windows].forEach(o=>{o.rect=rect(o.rect);o.roomId=r.id;o.wallId=r.id+'--'+o.wallId;if(o.h)o.h=[o.h[0]+r.x,o.h[1]+r.y];});
  g.dimensions.forEach(d=>{d.at+=d.horizontal?r.y:r.x;d.start+=d.horizontal?r.x:r.y;});return g;
 });
 const openings=parts.flatMap(g=>[...g.doors,...g.windows]);
 // Cut the full shared wall even when its two owners use different thicknesses.
 for(const o of openings){
  const r=e.rooms.find(r=>r.id===o.roomId),side=sideOf(o.wallId),horizontal=['top','bottom'].includes(side),forward=['right','bottom'].includes(side);
  const own=side==='right'?r.x+r.width:side==='left'?r.x:side==='bottom'?r.y+r.depth:r.y;
  const opposite={top:'bottom',bottom:'top',left:'right',right:'left'}[side];
  for(const n of e.rooms){
   if(n===r)continue;
   const overlap=horizontal?Math.min(o.rect[2],n.x+n.width)-Math.max(o.rect[0],n.x):Math.min(o.rect[3],n.y+n.depth)-Math.max(o.rect[1],n.y);
   if(overlap<=EPS)continue;
   const face=side==='right'?n.x:side==='left'?n.x+n.width:side==='bottom'?n.y:n.y+n.depth,gap=(face-own)*(forward?1:-1);
   if(gap>=-EPS&&gap<=Math.max(wallWidth(r,side),wallWidth(n,opposite))+EPS){
    const index=horizontal?(forward?3:1):(forward?2:0);
    o.rect[index]=forward?Math.max(o.rect[index],face):Math.min(o.rect[index],face);
   }
  }
 }
 for(let i=0;i<openings.length;i++)for(let j=i+1;j<openings.length;j++){
  const a=openings[i].rect,b=openings[j].rect;
  check(Math.min(a[2],b[2])-Math.max(a[0],b[0])<=EPS||Math.min(a[3],b[3])-Math.max(a[1],b[1])<=EPS,'Openings overlap on a shared wall. Edit the existing opening.');
 }
 const walls=[],wallIds=[];
 for(const g of parts)g.walls.forEach((w,i)=>{
  let pieces=[w.slice(0,4)];for(const other of [...walls,...openings.map(o=>o.rect)])pieces=pieces.flatMap(p=>subtract(p,other));
  for(const p of pieces){walls.push([...p,'n']);wallIds.push(g.wallIds[i]);}
 });
 const xs=e.rooms.flatMap(r=>[r.x-Math.max(720,wallWidth(r,'left')+600),r.x+r.width+Math.max(720,wallWidth(r,'right')+600)]),ys=e.rooms.flatMap(r=>[r.y-Math.max(720,wallWidth(r,'top')+600),r.y+r.depth+Math.max(720,wallWidth(r,'bottom')+600)]);
 parts.flatMap(g=>g.doors).forEach(d=>[d.c,d.o].forEach(v=>{xs.push(d.h[0]+v[0]*d.len-150,d.h[0]+v[0]*d.len+150);ys.push(d.h[1]+v[1]*d.len-150,d.h[1]+v[1]*d.len+150);}));
 const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 return {height:e.height,origin:[x+w/2,y+h/2],bounds:{x,y,w,h},rooms:parts.flatMap(g=>g.rooms),walls,wallIds,doors:parts.flatMap(g=>g.doors),windows:parts.flatMap(g=>g.windows),slides:[],lintels:[],dimensions:parts.flatMap(g=>g.dimensions),walkStart:{position:[e.rooms[0].x+e.rooms[0].width/2,e.rooms[0].y+e.rooms[0].depth*.7],target:[e.rooms[0].x+e.rooms[0].width/2,e.rooms[0].y+e.rooms[0].depth*.3]},entry:null};
}
