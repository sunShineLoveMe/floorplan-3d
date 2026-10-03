import {validateRoomEditor,generateRoomGeometry,WALL_IDS,GEOMETRY_TOLERANCE as EPS} from './room-editor.js';
import {polygonArea,rectPolygon,clipHalfPlane,intersectConvex,subtractConvex} from '../core/polygons.js';
const copy=v=>JSON.parse(JSON.stringify(v));
const check=(ok,message)=>{if(!ok){const e=Error(message);e.code='INVALID_PROJECT';throw e;}};
export function asHouse(e){
 if(e.kind==='house')return copy(e);
 return {kind:'house',floorSlab:true,height:e.height,wallThickness:120,rooms:[{id:e.roomId,x:0,y:0,width:e.width,depth:e.depth}],openings:e.openings.map(o=>({...o,roomId:e.roomId,wallId:e.roomId+'--'+o.wallId}))};
}
export const sideOf=id=>id.split('--').at(-1);
export const wallWidth=(room,side)=>room.wallWidths?.[side]??120;
export const hasDiagonalCut=r=>r.notch?.shape==='diagonal';
export function wallRange(r,side){
 const range=[0,['top','bottom'].includes(side)?r.width:r.depth];
 if(hasDiagonalCut(r)){
  const n=r.notch,left=n.corner.endsWith('left'),top=n.corner.startsWith('top');
  if(side===(top?'top':'bottom'))range[left?0:1]=left?n.width:r.width-n.width;
  if(side===(left?'left':'right'))range[top?0:1]=top?n.depth:r.depth-n.depth;
 }
 return range;
}
export const wallSegments=(room,side,height)=>room.wallSegments?.[side]??[{offset:wallRange(room,side)[0],length:wallRange(room,side)[1]-wallRange(room,side)[0],height}];
export const hasFullWallSegment=(room,side,height)=>wallWidth(room,side)>0&&wallSegments(room,side,height).some(s=>s.height===height&&Math.min(s.offset+s.length,wallRange(room,side)[1])-Math.max(s.offset,wallRange(room,side)[0])>=3);
const occupiedWidth=(room,side,from,to,height)=>wallSegments(room,side,height).some(s=>s.offset<to-EPS&&s.offset+s.length>from+EPS)?wallWidth(room,side):0;
/** A corner notch changes the usable floor; walls still follow explicit side segments. */
export function roomFloorRects(r){
 if(!r.notch)return [[r.x,r.y,r.x+r.width,r.y+r.depth]];
 const {corner,width:w,depth:d}=r.notch,W=r.width,D=r.depth,left=corner.endsWith('left'),top=corner.startsWith('top');
 return (left?[[w,0,W,D],[0,top?d:0,w,top?D:D-d]]:[[0,0,W-w,D],[W-w,top?d:0,W,top?D:D-d]]).map(a=>[a[0]+r.x,a[1]+r.y,a[2]+r.x,a[3]+r.y]);
}
export function roomFloorPoly(r){
 const W=r.width,D=r.depth,n=r.notch;if(!n)return [[0,0],[W,0],[W,D],[0,D]].map(([x,y])=>[x+r.x,y+r.y]);
 const w=n.width,d=n.depth,polys={
 'top-left':[[w,0],[W,0],[W,D],[0,D],[0,d],[w,d]],
 'top-right':[[0,0],[W-w,0],[W-w,d],[W,d],[W,D],[0,D]],
 'bottom-left':[[0,0],[W,0],[W,D],[w,D],[w,D-d],[0,D-d]],
 'bottom-right':[[0,0],[W,0],[W,D-d],[W-w,D-d],[W-w,D],[0,D]]};
 const diagonal={
 'top-left':[[w,0],[W,0],[W,D],[0,D],[0,d]],
 'top-right':[[0,0],[W-w,0],[W,d],[W,D],[0,D]],
 'bottom-left':[[0,0],[W,0],[W,D],[w,D],[0,D-d]],
 'bottom-right':[[0,0],[W,0],[W,D-d],[W-w,D],[0,D]]};
 return (hasDiagonalCut(r)?diagonal:polys)[n.corner].map(([x,y])=>[x+r.x,y+r.y]);
}
export const roomFloorPieces=r=>hasDiagonalCut(r)?[roomFloorPoly(r)]:roomFloorRects(r).map(rectPolygon);
function diagonalEdge(r){const p=roomFloorPoly(r);const i=p.findIndex((a,i)=>{const b=p[(i+1)%p.length];return a[0]!==b[0]&&a[1]!==b[1];});return [p[i],p[(i+1)%p.length]];}
function outerFloor(r){return rectPolygon([r.x-wallWidth(r,'left'),r.y-wallWidth(r,'top'),r.x+r.width+wallWidth(r,'right'),r.y+r.depth+wallWidth(r,'bottom')]);}
export function validateHouseEditor(e){
 check(e?.kind==='house'&&Array.isArray(e.rooms)&&e.rooms.length>0&&e.rooms.length<=50,'House requires 1–50 rooms.');
 check(e.floorSlab===undefined||typeof e.floorSlab==='boolean','Invalid continuous floor setting.');
 check(Array.isArray(e.openings)&&e.openings.length<=200,'Too many openings.');
 const ids=new Set();let segmentCount=0,obstacleCount=0;
 for(const r of e.rooms){
  check(/^[A-Za-z0-9_-]{1,70}$/.test(r.id)&&!r.id.includes('--')&&!['__proto__','constructor','prototype'].includes(r.id)&&!ids.has(r.id),'Invalid room ID.');ids.add(r.id);
  check([r.x,r.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=100000),'Room origin must be within ±100000 mm.');
  if(r.notch!==undefined)check(r.notch&&['top-left','top-right','bottom-left','bottom-right'].includes(r.notch.corner)&&Number.isFinite(r.notch.width)&&Number.isFinite(r.notch.depth)&&r.notch.width>=1&&r.notch.depth>=1&&r.notch.width<=r.width-1&&r.notch.depth<=r.depth-1,'A corner notch must leave a connected floor with at least 1 mm on both axes.');
  if(r.notch!==undefined){
   check(r.notch.shape===undefined||r.notch.shape==='diagonal','Invalid corner cut shape.');
   check(hasDiagonalCut(r)?Number.isFinite(r.notch.wallThickness)&&r.notch.wallThickness>=0&&r.notch.wallThickness<=1000:r.notch.wallThickness===undefined,'Diagonal wall thickness must be 0–1000 mm.');
  }
  if(r.wallWidths!==undefined){check(r.wallWidths&&typeof r.wallWidths==='object'&&!Array.isArray(r.wallWidths)&&Object.keys(r.wallWidths).every(side=>WALL_IDS.includes(side)),'Invalid wall sides.');for(const width of Object.values(r.wallWidths))check(Number.isFinite(width)&&width>=0&&width<=1000,'Wall thickness must be 0–1000 mm.');}
  if(hasDiagonalCut(r)){
   const n=r.notch,horizontal=n.corner.startsWith('top')?'top':'bottom',vertical=n.corner.endsWith('left')?'left':'right';
   const available=(n.width*n.depth+wallWidth(r,vertical)*n.depth+wallWidth(r,horizontal)*n.width)/Math.hypot(n.width,n.depth);
   check(n.wallThickness<available-EPS,'Diagonal wall is too thick for the cut distances and adjoining walls.');
  }
  if(r.wallSegments!==undefined){
   check(r.wallSegments&&typeof r.wallSegments==='object'&&!Array.isArray(r.wallSegments)&&Object.keys(r.wallSegments).every(side=>WALL_IDS.includes(side)),'Invalid wall segment sides.');
   for(const [side,segments]of Object.entries(r.wallSegments)){
    check(Array.isArray(segments)&&segments.length<=20,'Use at most 20 segments per wall.');segmentCount+=segments.length;
    const L=['top','bottom'].includes(side)?r.width:r.depth;
    check(wallWidth(r,side)>0||segments.length===0,'Set a positive wall thickness before adding segments.');
    const sorted=[...segments].sort((a,b)=>a?.offset-b?.offset);
    sorted.forEach((s,i)=>{
     check(s&&[s.offset,s.length,s.height].every(Number.isFinite)&&s.offset>=0&&s.length>=1&&s.offset+s.length<=L+EPS,'Wall segment must fit within its parent wall.');
     check(s.height>=100&&s.height<=e.height,'Wall segment height must be 100 mm to the floor ceiling height.');
     check(!i||s.offset>=sorted[i-1].offset+sorted[i-1].length-EPS,'Wall segments overlap.');
    });
   }
  }
  for(const o of e.openings.filter(o=>o.roomId===r.id)){
   const side=sideOf(o.wallId);
   if(hasDiagonalCut(r)){const [start,end]=wallRange(r,side),margin=o.type==='door'&&['sliding','bifold','passage'].includes(o.mode)?0:1;check(o.offset>=start+margin-EPS&&o.offset+o.width<=end-margin+EPS,'Opening must fit on a remaining straight wall, outside the diagonal cut.');}
   check(wallWidth(r,side)>0,'An open boundary cannot contain a door or window.');
   if(r.wallSegments?.[side]!==undefined){const margin=o.type==='door'&&['sliding','bifold','passage'].includes(o.mode)?0:1;check(wallSegments(r,side,e.height).some(s=>s.height===e.height&&o.offset>=s.offset+margin-EPS&&o.offset+o.width<=s.offset+s.length-margin+EPS),'Doors and windows require a continuous full-height segment, with 1 mm clearance at each end.');}
  }
  validateRoomEditor({kind:'rectangle',roomId:r.id,width:r.width,depth:r.depth,height:e.height,wallThickness:e.wallThickness,openings:e.openings.filter(o=>o.roomId===r.id).map(o=>({...o,wallId:sideOf(o.wallId)}))});
 }
 check(segmentCount<=300,'Use at most 300 wall segments per floor.');
 const roomIds=new Set(ids);
 for(const r of e.rooms){
  if(r.obstacles===undefined)continue;
  check(Array.isArray(r.obstacles)&&r.obstacles.length<=20,'Use at most 20 fixed obstacles per room.');obstacleCount+=r.obstacles.length;
  let occupied=0;
  for(const [i,o]of r.obstacles.entries()){
   check(o&&/^[A-Za-z0-9_-]{1,70}$/.test(o.id)&&!['__proto__','constructor','prototype'].includes(o.id)&&!ids.has(o.id),'Invalid or duplicate fixed obstacle ID.');ids.add(o.id);
   check(typeof o.name==='string'&&o.name.trim().length>0&&o.name.length<=500,'Fixed obstacle name is required.');
   check([o.x,o.y,o.width,o.depth,o.height].every(Number.isFinite)&&o.x>=0&&o.y>=0&&o.width>=1&&o.depth>=1&&o.x+o.width<=r.width+EPS&&o.y+o.depth<=r.depth+EPS,'Fixed obstacle must fit within the room.');
   check(o.height>=100&&o.height<=e.height,'Fixed obstacle height must be 100 mm to the floor ceiling height.');
   const a=[r.x+o.x,r.y+o.y,r.x+o.x+o.width,r.y+o.y+o.depth],size=o.width*o.depth;
   const covered=hasDiagonalCut(r)?polygonArea(intersectConvex(rectPolygon(a),roomFloorPoly(r))):roomFloorRects(r).reduce((sum,b)=>sum+Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1])),0);
   check(Math.abs(covered-size)<=1e-5,'Fixed obstacle must fit within the usable floor, outside the notch.');
   for(const b of r.obstacles.slice(0,i))check(Math.min(o.x+o.width,b.x+b.width)<=Math.max(o.x,b.x)+EPS||Math.min(o.y+o.depth,b.y+b.depth)<=Math.max(o.y,b.y)+EPS,'Fixed obstacles overlap.');
   occupied+=size;
  }
  check(occupied<r.width*r.depth-(r.notch?r.notch.width*r.notch.depth*(hasDiagonalCut(r)?.5:1):0),'Fixed obstacles must leave usable floor area.');
 }
 check(obstacleCount<=300,'Use at most 300 fixed obstacles per floor.');
 for(const o of e.openings)if(o.pairedWith)check(e.openings.some(n=>n.id===o.pairedWith&&n.type==='door'&&(!n.mode||n.mode==='swing')&&n.roomId!==o.roomId),'Paired door must reference a swing door in the opposite room.');
 for(const o of e.openings){check(roomIds.has(o.roomId)&&o.wallId===o.roomId+'--'+sideOf(o.wallId),'Opening parent room/wall.');check(!ids.has(o.id),'Duplicate opening ID.');ids.add(o.id);}
 for(let i=0;i<e.rooms.length;i++)for(let j=i+1;j<e.rooms.length;j++){
  const a=e.rooms[i],b=e.rooms[j],dx=Math.max(b.x-(a.x+a.width),a.x-(b.x+b.width)),dy=Math.max(b.y-(a.y+a.depth),a.y-(b.y+b.depth));
  const overlaps=dx<-EPS&&dy<-EPS;
  if(hasDiagonalCut(a)||hasDiagonalCut(b)){for(const aa of roomFloorPieces(a))for(const bb of roomFloorPieces(b))check(polygonArea(intersectConvex(aa,bb))<=1e-5,'Rooms overlap.');continue;}
  if(overlaps||a.notch||b.notch)for(const aa of roomFloorRects(a))for(const bb of roomFloorRects(b))check(Math.min(aa[2],bb[2])-Math.max(aa[0],bb[0])<=EPS||Math.min(aa[3],bb[3])-Math.max(aa[1],bb[1])<=EPS,'Rooms overlap.');
  if(overlaps||a.notch||b.notch)continue;
  if(dy<-EPS){const aLeft=a.x<b.x,lo=Math.max(a.y,b.y),hi=Math.min(a.y+a.depth,b.y+b.depth),required=Math.max(occupiedWidth(a,aLeft?'right':'left',lo-a.y,hi-a.y,e.height),occupiedWidth(b,aLeft?'left':'right',lo-b.y,hi-b.y,e.height));check(dx>=required-EPS,`Leave ${required} mm for the shared wall between rooms.`);}
  if(dx<-EPS){const aTop=a.y<b.y,lo=Math.max(a.x,b.x),hi=Math.min(a.x+a.width,b.x+b.width),required=Math.max(occupiedWidth(a,aTop?'bottom':'top',lo-a.x,hi-a.x,e.height),occupiedWidth(b,aTop?'top':'bottom',lo-b.x,hi-b.x,e.height));check(dy>=required-EPS,`Leave ${required} mm for the shared wall between rooms.`);}
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
  g.rooms.forEach(room=>{room.poly=roomFloorPoly(r);if(r.obstacles?.length)room.usableAreaM2=(r.width*r.depth-(r.notch?r.notch.width*r.notch.depth*(hasDiagonalCut(r)?.5:1):0)-r.obstacles.reduce((sum,o)=>sum+o.width*o.depth,0))/1e6;
   if(hasDiagonalCut(r)){let floors=roomFloorPieces(r);for(const o of r.obstacles||[])floors=floors.flatMap(p=>subtractConvex(p,rectPolygon([r.x+o.x,r.y+o.y,r.x+o.x+o.width,r.y+o.y+o.depth])));const floor=floors.sort((a,b)=>polygonArea(b)-polygonArea(a))[0];check(floor,'Fixed obstacles must leave usable floor area.');room.at=[0,1].map(axis=>floor.reduce((sum,p)=>sum+p[axis],0)/floor.length);}
   else{let floors=roomFloorRects(r);for(const o of r.obstacles||[])floors=floors.flatMap(a=>subtract(a,[r.x+o.x,r.y+o.y,r.x+o.x+o.width,r.y+o.y+o.depth]));const floor=floors.sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];check(floor,'Fixed obstacles must leave usable floor area.');room.at=[(floor[0]+floor[2])/2,(floor[1]+floor[3])/2];}
  });
  const walls=[],ids=[],heights=[];
  g.walls.forEach((w,i)=>{
   const side=g.wallIds[i],horizontal=['top','bottom'].includes(side),L=horizontal?r.width:r.depth;
   for(const segment of wallSegments(r,side,e.height)){
    // A segment ending at a corner also covers the horizontal corner return.
    const [rangeStart,rangeEnd]=wallRange(r,side);
    const start=Math.max(segment.offset,rangeStart)+(segment.offset===0&&rangeStart===0&&horizontal?-wallWidth(r,'left'):0);
    const end=Math.min(segment.offset+segment.length,rangeEnd)+(Math.abs(segment.offset+segment.length-L)<=EPS&&rangeEnd===L&&horizontal?wallWidth(r,'right'):0);
    const piece=w.slice(0,4),lo=horizontal?0:1,hi=horizontal?2:3;
    piece[lo]=Math.max(piece[lo],start);piece[hi]=Math.min(piece[hi],end);
    if(piece[hi]-piece[lo]<=EPS)continue;
    walls.push([...rect(piece),segment.height<e.height?'low':'n']);ids.push(r.id+'--'+side);heights.push(segment.height);
   }
  });
  g.walls=walls;g.wallIds=ids;g.wallHeights=heights;
  [...g.doors,...g.windows,...g.slides,...g.lintels].forEach(o=>{o.rect=rect(o.rect);o.roomId=r.id;o.wallId=r.id+'--'+o.wallId;if(o.h)o.h=[o.h[0]+r.x,o.h[1]+r.y];});
  g.dimensions.forEach(d=>{d.at+=d.horizontal?r.y:r.x;d.start+=d.horizontal?r.x:r.y;});return g;
 });
 const openings=parts.flatMap(g=>[...g.doors,...g.windows,...g.slides,...g.lintels]);
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
  const overlap=Math.min(a[2],b[2])-Math.max(a[0],b[0])>EPS&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>EPS,aa=openings[i],bb=openings[j],paired=aa.pairedWith===bb.id||bb.pairedWith===aa.id;
  if(paired)check(overlap&&aa.o&&bb.o&&aa.o[0]*bb.o[0]+aa.o[1]*bb.o[1]<-.999&&Math.hypot(aa.h[0]-bb.h[0],aa.h[1]-bb.h[1])<=Math.max(aa.len,bb.len)+EPS,'Paired swing doors must share one opening and face opposite rooms.');
  check(!overlap||paired,'Openings overlap on a shared wall. Edit the existing opening.');
 }
 const custom=e.rooms.some(r=>r.wallSegments!==undefined),walls=[],wallIds=[],wallHeights=[];
 const candidates=parts.flatMap(g=>g.walls.map((w,i)=>({w,id:g.wallIds[i],height:g.wallHeights[i]})));
 // Taller walls own overlaps. This keeps a low partition from hiding a full-height shared wall.
 if(custom)candidates.sort((a,b)=>b.height-a.height);
 for(const {w,id,height}of candidates){
  let pieces=[w.slice(0,4)];for(const other of [...walls,...openings.map(o=>o.rect)])pieces=pieces.flatMap(p=>subtract(p,other));
  for(const p of pieces){walls.push([...p,w[4]]);wallIds.push(id);wallHeights.push(height);}
 }
 const diagonal=e.rooms.some(hasDiagonalCut),diagonalWalls=[];
 if(diagonal){
  for(const r of e.rooms.filter(hasDiagonalCut)){
   const [a,b]=diagonalEdge(r),thickness=r.notch.wallThickness;if(thickness===0)continue;
   const band=clipHalfPlane(clipHalfPlane(outerFloor(r),a,b,-thickness),b,a);
   let pieces=band.length?[band]:[];
   for(const solid of [...walls.map(w=>rectPolygon(w)),...diagonalWalls.map(w=>w.poly)])pieces=pieces.flatMap(p=>subtractConvex(p,solid));
   diagonalWalls.push(...pieces.map(poly=>({id:r.id+'--diagonal',roomId:r.id,poly,inner:[a,b],height:e.height})));
  }
  for(const wall of [...walls.map(w=>rectPolygon(w)),...diagonalWalls.map(w=>w.poly)])for(const room of e.rooms)for(const net of roomFloorPieces(room))check(polygonArea(intersectConvex(wall,net))<=1e-5,'A wall intrudes into '+settings[room.id].name+' room floor. Adjust wall thickness or room position.');
 }else if(e.rooms.some(r=>r.notch))for(const wall of walls)for(const room of e.rooms)for(const net of roomFloorRects(room))check(Math.min(wall[2],net[2])-Math.max(wall[0],net[0])<=EPS||Math.min(wall[3],net[3])-Math.max(wall[1],net[1])<=EPS,'A wall intrudes into '+settings[room.id].name+' room floor. Adjust wall segments around the notch.');
 const passages=[];
 if(custom)for(let i=0;i<e.rooms.length;i++)for(let j=i+1;j<e.rooms.length;j++){
  const a=e.rooms[i],b=e.rooms[j];
  if(hasDiagonalCut(a)||hasDiagonalCut(b))continue;
  for(const horizontal of [true,false]){
   const first=horizontal?(a.x<b.x?a:b):(a.y<b.y?a:b),second=first===a?b:a;
   const start=horizontal?first.x+first.width:first.y+first.depth,end=horizontal?second.x:second.y,gap=end-start;
   const lo=horizontal?Math.max(first.y,second.y):Math.max(first.x,second.x),hi=horizontal?Math.min(first.y+first.depth,second.y+second.depth):Math.min(first.x+first.width,second.x+second.width);
   if(gap<=EPS||gap>Math.max(wallWidth(first,horizontal?'right':'bottom'),wallWidth(second,horizontal?'left':'top'))+EPS||hi-lo<=EPS)continue;
   let pieces=[horizontal?[start,lo,end,hi]:[lo,start,hi,end]];
   for(const obstacle of [...walls,...openings.map(o=>o.rect)])pieces=pieces.flatMap(p=>subtract(p,obstacle));
   for(const rect of pieces)if(Math.abs(rect[horizontal?0:1]-start)<=EPS&&Math.abs(rect[horizontal?2:3]-end)<=EPS)passages.push({rect,roomId:first.id});
  }
 }
 const floorSlabs=[];
 const floorPolygons=[];
 if(e.floorSlab&&diagonal)for(const r of e.rooms){let outer=outerFloor(r);if(hasDiagonalCut(r)){const [a,b]=diagonalEdge(r);outer=clipHalfPlane(outer,a,b,-r.notch.wallThickness);}let pieces=[outer];for(const other of floorPolygons)pieces=pieces.flatMap(p=>subtractConvex(p,other));floorPolygons.push(...pieces);}
 else if(e.floorSlab)for(const r of e.rooms){let pieces=[[r.x-wallWidth(r,'left'),r.y-wallWidth(r,'top'),r.x+r.width+wallWidth(r,'right'),r.y+r.depth+wallWidth(r,'bottom')]];for(const other of floorSlabs)pieces=pieces.flatMap(p=>subtract(p,other));floorSlabs.push(...pieces);}
 const obstacles=e.rooms.flatMap(r=>(r.obstacles||[]).map(o=>({id:o.id,roomId:r.id,name:o.name,rect:[r.x+o.x,r.y+o.y,r.x+o.x+o.width,r.y+o.y+o.depth],height:o.height})));
 const padding=e.floorSlab?1100:600;
 const xs=e.rooms.flatMap(r=>[r.x-Math.max(720,wallWidth(r,'left')+padding),r.x+r.width+Math.max(720,wallWidth(r,'right')+padding)]),ys=e.rooms.flatMap(r=>[r.y-Math.max(720,wallWidth(r,'top')+padding),r.y+r.depth+Math.max(720,wallWidth(r,'bottom')+padding)]);
 parts.flatMap(g=>g.doors).forEach(d=>[d.c,d.o].forEach(v=>{xs.push(d.h[0]+v[0]*d.len-150,d.h[0]+v[0]*d.len+150);ys.push(d.h[1]+v[1]*d.len-150,d.h[1]+v[1]*d.len+150);}));
 const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 return {height:e.height,origin:[x+w/2,y+h/2],bounds:{x,y,w,h},rooms:parts.flatMap(g=>g.rooms),...(obstacles.length?{obstacles}:{}),walls,wallIds,...(custom?{wallHeights,passages}:{}),...(diagonal?{diagonalWalls}:{}),...(e.floorSlab?(diagonal?{floorPolygons}:{floorSlabs}):{}),doors:parts.flatMap(g=>g.doors),windows:parts.flatMap(g=>g.windows),slides:parts.flatMap(g=>g.slides),lintels:parts.flatMap(g=>g.lintels),dimensions:parts.flatMap(g=>g.dimensions),walkStart:e.rooms[0].obstacles?.length||hasDiagonalCut(e.rooms[0])?{position:parts[0].rooms[0].at,target:[parts[0].rooms[0].at[0],parts[0].rooms[0].at[1]-1000]}:{position:[e.rooms[0].x+e.rooms[0].width/2,e.rooms[0].y+e.rooms[0].depth*.7],target:[e.rooms[0].x+e.rooms[0].width/2,e.rooms[0].y+e.rooms[0].depth*.3]},entry:null};
}
