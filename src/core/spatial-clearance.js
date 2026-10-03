import {bbox} from './geometry.js';
import {furniturePolygon,rectPolygon,polygonArea,intersectConvex,subtractConvex,signedPolygonArea} from './polygons.js';

export const CLEARANCE_DEFAULTS={targetMm:900,doorState:'open'};
export const clearanceSettings=p=>({...CLEARANCE_DEFAULTS,...p.clearance});
export const blocksPassage=f=>f.clearance?.mode==='solid'||(f.clearance?.mode!=='ground'&&f.type!=='rug');
const EPS=1e-6;
function simplePolygon(poly){return Array.isArray(poly)&&poly.length>=3&&poly.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&polygonArea(poly)>EPS&&edges(poly).every(([a,b],i)=>edges(poly).every(([c,d],j)=>i===j||(i+1)%poly.length===j||(j+1)%poly.length===i||segmentDistance(a,b,c,d)>EPS));}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
export function pointInPolygon(p,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[j],b=poly[i];
  if(pointSegmentDistance(p,a,b)<EPS)return true;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function pointSegmentDistance(p,a,b){
 const d=sub(b,a),q=sub(p,a),t=Math.max(0,Math.min(1,(q[0]*d[0]+q[1]*d[1])/(d[0]*d[0]+d[1]*d[1]||1)));
 return Math.hypot(q[0]-t*d[0],q[1]-t*d[1]);
}
const edges=poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]);
const closest=(p,a,b)=>{const v=sub(b,a),q=sub(p,a),t=Math.max(0,Math.min(1,(q[0]*v[0]+q[1]*v[1])/(v[0]*v[0]+v[1]*v[1]||1)));return [a[0]+t*v[0],a[1]+t*v[1]];};
export function segmentDistance(a,b,c,d){
 const ab=sub(b,a),cd=sub(d,c),ca=sub(c,a),den=cross(ab,cd);
 if(Math.abs(den)>EPS){const t=cross(ca,cd)/den,u=cross(ca,ab)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0;}
 return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
/** Euclidean distance between actual convex footprints; contact and overlap remain distinct. */
export function polygonGap(a,b){
 const overlap=polygonArea(intersectConvex(a,b));
 if(overlap>EPS)return {kind:'overlap',distanceMm:0,overlapMm2:overlap};
 let distanceMm=Infinity,points;
 for(const [p,q]of edges(a))for(const [r,s]of edges(b)){
  if(segmentDistance(p,q,r,s)<EPS){distanceMm=0;points=[p,p];continue;}
  for(const pair of [[p,closest(p,r,s)],[q,closest(q,r,s)],[closest(r,p,q),r],[closest(s,p,q),s]]){const d=Math.hypot(...sub(...pair));if(d<distanceMm){distanceMm=d;points=pair;}}
 }
 return {kind:distanceMm<EPS?'contact':'gap',distanceMm,points};
}
export function spacingReport(p){
 const solids=p.furniture.filter(blocksPassage),targetMm=clearanceSettings(p).targetMm,issues=[],nested=[];
 for(const f of solids.filter(f=>f.clearance?.containerId)){
  const parent=solids.find(g=>g.id===f.clearance.containerId),poly=furniturePolygon(f);
  const valid=!!parent&&parent.id!==f.id&&!parent.clearance?.containerId&&subtractConvex(poly,furniturePolygon(parent)).reduce((s,x)=>s+polygonArea(x),0)<EPS;
  nested.push({furnitureId:f.id,containerId:f.clearance.containerId,valid});
  if(!valid)issues.push({kind:'invalid-nesting',furnitureId:f.id,otherId:parent?.id,targetMm});
 }
 for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++){
  const f=solids[i],g=solids[j];
  if(nested.some(n=>n.valid&&((n.furnitureId===f.id&&n.containerId===g.id)||(n.furnitureId===g.id&&n.containerId===f.id))))continue;
  const gap=polygonGap(furniturePolygon(f),furniturePolygon(g));
  if(gap.kind==='gap'&&[...p.geometry.walls.filter((w,i)=>!p.demolished.includes('w'+i)).map(rectPolygon),...(p.geometry.diagonalWalls||[]).map(w=>w.poly)].some(poly=>pointInPolygon(gap.points[0],poly)||edges(poly).some(e=>segmentDistance(...gap.points,...e)<EPS)))continue;
  if(gap.distanceMm<targetMm-EPS)issues.push({...gap,furnitureId:f.id,otherId:g.id,targetMm});
 }
 const rank={'invalid-nesting':0,overlap:1,contact:2,gap:3};issues.sort((a,b)=>rank[a.kind]-rank[b.kind]||(a.distanceMm||0)-(b.distanceMm||0));
 return {issues,nested};
}
/** Split union edges at crossings and collinear endpoints, then retain only exposed intervals. */
function unionBoundary(polys){
 const all=polys.flatMap(edges),boundary=[];
 for(const poly of polys)for(const [a,b]of edges(poly)){
  const v=sub(b,a),length=Math.hypot(...v);if(length<EPS)continue;
  const cuts=[0,1];
  for(const [c,d]of all){const w=sub(d,c),ca=sub(c,a),den=cross(v,w);
   if(Math.abs(den)>EPS){const t=cross(ca,w)/den,u=cross(ca,v)/den;if(t>0&&t<1&&u>=-EPS&&u<=1+EPS)cuts.push(t);}
   else if(Math.abs(cross(ca,v))<EPS*length)for(const q of [c,d]){const t=((q[0]-a[0])*v[0]+(q[1]-a[1])*v[1])/(length*length);if(t>0&&t<1)cuts.push(t);}
  }
  cuts.sort((x,y)=>x-y);const sign=signedPolygonArea(poly)>0?1:-1;
  for(let i=1;i<cuts.length;i++){
   const lo=cuts[i-1],hi=cuts[i];if((hi-lo)*length<EPS)continue;
   const t=(lo+hi)/2,mid=[a[0]+t*v[0]+sign*v[1]/length*.001,a[1]+t*v[1]-sign*v[0]/length*.001];
   if(!polys.some(poly=>pointInPolygon(mid,poly)))boundary.push([[a[0]+lo*v[0],a[1]+lo*v[1]],[a[0]+hi*v[0],a[1]+hi*v[1]]]);
  }
 }
 return boundary;
}
const boxNear=(a,b,r=0)=>a[0]-r<=b[2]&&a[2]+r>=b[0]&&a[1]-r<=b[3]&&a[3]+r>=b[1];
/** Net floor union, solid walls (including pony walls), fixed objects, furniture and door assumptions. */
export function passageSpace(p,{doorState=clearanceSettings(p).doorState,includeFurniture=true,includeDoors=true}={}){
 const g=p.geometry,removed=p.demolished||[],floors=[...g.rooms.map(r=>r.poly),...[...g.doors,...g.slides,...g.lintels.filter(o=>o.passage),...(g.passages||[])].map(o=>rectPolygon(o.rect)),...removed.map(id=>rectPolygon(g.walls[+id.slice(1)]))];
 const obstacles=[...g.walls.flatMap((w,i)=>removed.includes('w'+i)?[]:[{kind:'wall',id:'wall-'+i,name:'Wall',poly:rectPolygon(w)}]),...(g.diagonalWalls||[]).map(w=>({kind:'wall',id:w.id,name:'Diagonal wall',poly:w.poly})),...(g.obstacles||[]).map(o=>({kind:'fixed',id:o.id,name:o.name,roomId:o.roomId,poly:rectPolygon(o.rect)})),...(includeFurniture?p.furniture.filter(blocksPassage).map(f=>({kind:'furniture',id:f.id,name:f.name,poly:furniturePolygon(f)})):[])];
 for(const d of includeDoors?g.doors:[]){
  if(doorState==='closed')obstacles.push({kind:'door',id:d.id,name:'Swing door'+(d.roomId?' · '+p.rooms[d.roomId].name:''),roomId:d.roomId,poly:rectPolygon(d.rect)});
  else {const half=Math.min(20,d.len*.1),h=d.h,end=[h[0]+d.o[0]*d.len,h[1]+d.o[1]*d.len],n=[d.c[0]*half,d.c[1]*half];obstacles.push({kind:'door',id:d.id,name:'Swing door'+(d.roomId?' · '+p.rooms[d.roomId].name:''),roomId:d.roomId,poly:[[h[0]-n[0],h[1]-n[1]],[end[0]-n[0],end[1]-n[1]],[end[0]+n[0],end[1]+n[1]],[h[0]+n[0],h[1]+n[1]]]});}
 }
 // Folded stack/retraction details are unknown: keep bifold apertures blocked in both states.
 for(const d of includeDoors?g.slides:[])if(doorState==='closed'||d.style==='bifold')obstacles.push({kind:'door',id:d.id,name:d.style==='bifold'?'Bifold opening (stack unknown)':'Sliding door',poly:rectPolygon(d.rect)});
 const boundary=unionBoundary(floors).map(edge=>({edge,box:bbox(edge)})),floorBoxes=floors.map(bbox);
 obstacles.forEach(o=>{o.box=bbox(o.poly);o.edges=edges(o.poly);});
 const inside=point=>floors.some((poly,i)=>boxNear([point[0],point[1],point[0],point[1]],floorBoxes[i])&&pointInPolygon(point,poly));
 function free(point,radius){
  if(!inside(point))return false;const box=[point[0],point[1],point[0],point[1]];
  if(boundary.some(b=>boxNear(box,b.box,radius)&&pointSegmentDistance(point,...b.edge)<radius-EPS))return false;
  return !obstacles.some(o=>boxNear(box,o.box,radius)&&(pointInPolygon(point,o.poly)||o.edges.some(e=>pointSegmentDistance(point,...e)<radius-EPS)));
 }
 function swept(a,b,radius){
  if(!free(a,radius)||!free(b,radius))return false;const box=bbox([a,b]);
  return !boundary.some(e=>boxNear(box,e.box,radius)&&segmentDistance(a,b,...e.edge)<radius-EPS)&&!obstacles.some(o=>boxNear(box,o.box,radius)&&o.edges.some(e=>segmentDistance(a,b,...e)<radius-EPS));
 }
 return {floors,obstacles,boundary,inside,free,swept,bounds:bbox(floors.flat())};
}
export function nearestStandingPoint(space,room,radius,preferred,step=50,accept=()=>true){
 preferred=preferred||room.at||[(bbox(room.poly)[0]+bbox(room.poly)[2])/2,(bbox(room.poly)[1]+bbox(room.poly)[3])/2];
 const b=bbox(room.poly),nx=Math.floor((b[2]-b[0])/step)+1,ny=Math.floor((b[3]-b[1])/step)+1;
 if(nx*ny>120000)return null;
 if(preferred&&pointInPolygon(preferred,room.poly)&&space.free(preferred,radius)&&accept(preferred))return preferred;
 let best=null,distance=Infinity;
 for(let y=b[1];y<=b[3];y+=step)for(let x=b[0];x<=b[2];x+=step){const point=[x,y],d=Math.hypot(x-preferred[0],y-preferred[1]);if(d<distance&&pointInPolygon(point,room.poly)&&space.free(point,radius)&&accept(point)){distance=d;best=point;}}
 return best;
}
/** A found polyline has a continuously checked circular sweep. Absence is a sampling result. */
export function passageReport(p,{stepMm=50,includeFurniture=true}={}){
 const settings=clearanceSettings(p),targetMm=settings.targetMm,rooms=p.geometry.rooms,from=rooms.find(r=>r.id===settings.fromRoomId)||rooms[0],to=rooms.find(r=>r.id===settings.toRoomId)||rooms.at(-1),base={targetMm,stepMm,doorState:settings.doorState,fromRoomId:from.id,toRoomId:to.id};
 if(!Number.isFinite(targetMm)||targetMm<100||targetMm>3000||!Number.isFinite(stepMm)||stepMm<1)return {...base,status:'unknown',reason:'invalid-settings',path:[]};
 if(settings.fromRoomId&&!rooms.some(r=>r.id===settings.fromRoomId)||settings.toRoomId&&!rooms.some(r=>r.id===settings.toRoomId))return {...base,status:'unknown',reason:'missing-space',path:[]};
 if(rooms.reduce((s,r)=>s+r.poly.length,0)>1500)return {...base,status:'unknown',reason:'geometry-budget',path:[]};
 if(!rooms.every(r=>simplePolygon(r.poly)))return {...base,status:'unknown',reason:'invalid-floor',path:[]};
 const bounds=bbox(rooms.flatMap(r=>r.poly));
 if((Math.floor((bounds[2]-bounds[0])/stepMm)+1)*(Math.floor((bounds[3]-bounds[1])/stepMm)+1)>120000)return {...base,status:'unknown',reason:'sampling-budget',path:[]};
 const space=passageSpace(p,{includeFurniture}),radius=targetMm/2,[x0,y0,x1,y1]=space.bounds,nx=Math.floor((x1-x0)/stepMm)+1,ny=Math.floor((y1-y0)/stepMm)+1;
 if(nx*ny>120000)return {...base,status:'unknown',reason:'sampling-budget',path:[]};
 const nodes=new Uint8Array(nx*ny),parents=new Int32Array(nx*ny).fill(-1),xy=i=>[x0+(i%nx)*stepMm,y0+Math.floor(i/nx)*stepMm];
 const preferred=r=>r.at||[(bbox(r.poly)[0]+bbox(r.poly)[2])/2,(bbox(r.poly)[1]+bbox(r.poly)[3])/2];
 let start=-1,end=-1,sd=Infinity,ed=Infinity;const sp=preferred(from),ep=preferred(to);
 for(let i=0;i<nodes.length;i++){const point=xy(i);if(!space.free(point,radius))continue;nodes[i]=1;
  const ds=Math.hypot(point[0]-sp[0],point[1]-sp[1]),de=Math.hypot(point[0]-ep[0],point[1]-ep[1]);
  if(ds<sd&&pointInPolygon(point,from.poly)){start=i;sd=ds;}if(de<ed&&pointInPolygon(point,to.poly)){end=i;ed=de;}
 }
 const anchors={start:start<0?null:xy(start),end:end<0?null:xy(end)};
 if(start<0||end<0){const room=start<0?from:to,point=preferred(room),nearby=space.obstacles.filter(o=>boxNear(o.box,bbox(room.poly),radius)).map(o=>({kind:o.kind,id:o.id,name:o.name,roomId:o.roomId,distanceMm:pointInPolygon(point,o.poly)?0:Math.min(...o.edges.map(e=>pointSegmentDistance(point,...e)))})).sort((a,b)=>a.distanceMm-b.distanceMm).slice(0,4);return {...base,...anchors,status:'no-standing-point',reason:start<0?'start':'end',nearby,frontier:point,path:[]};}
 const queue=[start];parents[start]=start;
 for(let h=0;h<queue.length&&parents[end]<0;h++){
  const i=queue[h],x=i%nx,y=Math.floor(i/nx);
  for(const j of [x>0?i-1:-1,x<nx-1?i+1:-1,y>0?i-nx:-1,y<ny-1?i+nx:-1])if(j>=0&&nodes[j]&&parents[j]<0&&space.swept(xy(i),xy(j),radius)){parents[j]=i;queue.push(j);}
 }
 if(parents[end]<0){
  const target=xy(end),frontier=queue.reduce((best,i)=>Math.hypot(...sub(xy(i),target))<Math.hypot(...sub(xy(best),target))?i:best,start),point=xy(frontier);
  const nearby=space.obstacles.map(o=>({kind:o.kind,id:o.id,name:o.name,roomId:o.roomId,distanceMm:pointInPolygon(point,o.poly)?0:Math.min(...o.edges.map(e=>pointSegmentDistance(point,...e)))})).sort((a,b)=>a.distanceMm-b.distanceMm).slice(0,4);
  return {...base,...anchors,status:'no-route',reason:'sampled-disconnection',frontier:point,nearby,path:[]};
 }
 const path=[];for(let i=end;;i=parents[i]){path.push(xy(i));if(i===start)break;}path.reverse();
 // Remove collinear nodes without changing the swept polyline.
 const compact=path.filter((v,i)=>i===0||i===path.length-1||Math.abs(cross(sub(v,path[i-1]),sub(path[i+1],v)))>EPS);
 return {...base,...anchors,status:'route-found',path:compact};
}
export function furnitureDistances(p,id){
 const f=p.furniture.find(f=>f.id===id);if(!f)return [];
 const poly=furniturePolygon(f),space=passageSpace(p);
 return space.obstacles.filter(o=>['wall','fixed'].includes(o.kind)).map(o=>({...polygonGap(poly,o.poly),kind:o.kind,name:o.name,id:o.id})).sort((a,b)=>a.distanceMm-b.distanceMm).slice(0,3);
}

/** Continuous sweep against a polygon; shared by native walk colliders. */
export function sweptCircleIntersectsPolygon(a,b,r,poly){
 return pointInPolygon(a,poly)||pointInPolygon(b,poly)||edges(poly).some(e=>segmentDistance(a,b,...e)<r-1e-6);
}
