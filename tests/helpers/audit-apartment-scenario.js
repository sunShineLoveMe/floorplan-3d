import assert from 'node:assert/strict';
import {FT} from './house-fixture.js';
import {doorConflicts} from '../../src/core/door-clearance.js';
import {obstacleConflicts} from '../../src/core/obstacle-clearance.js';
import {floorConflicts} from '../../src/core/floor-clearance.js';
const eps=1e-5;
const contains=(r,x,y)=>x>r[0]+eps&&x<r[2]-eps&&y>r[1]+eps&&y<r[3]-eps;
function inPoly(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function auditFloorScenario(p,spec){
 const g=p.geometry;assert.equal(g.rooms.length,spec.rooms.length);assert.equal(p.roomEditor.openings.length,spec.openings.length);assert.equal(g.obstacles?.length||0,spec.rooms.reduce((n,r)=>n+(r.obstacles?.length||0),0));assert.deepEqual(p.furniture.map(f=>f.type),spec.furniture.map(f=>f.type));
 for(const source of spec.rooms){
  const r=g.rooms.find(r=>p.rooms[r.id].name===source.name);assert.ok(r,source.name);
  const editor=p.roomEditor.rooms.find(e=>e.id===r.id);for(const key of ['x','y','width','depth'])assert.ok(Math.abs(editor[key]-source[key]*FT)<eps,source.name+' '+key);
  for(const [i,side]of ['top','right','bottom','left'].entries())assert.ok(Math.abs(editor.wallWidths[side]-source.walls[i]*25.4)<eps,source.name+' wall '+side);
  if(source.notch){assert.equal(editor.notch.corner,source.notch.corner);assert.equal(editor.notch.shape,source.notch.shape);assert.ok(Math.abs(editor.notch.width-source.notch.width*FT)<eps&&Math.abs(editor.notch.depth-source.notch.depth*FT)<eps);if(source.notch.shape)assert.ok(Math.abs(editor.notch.wallThickness-source.notch.wallThickness*FT)<eps);}else assert.equal(editor.notch,undefined);
  const actual=r.usableAreaM2??Math.abs(r.poly.reduce((sum,a,i)=>{const b=r.poly[(i+1)%r.poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2e6;
  const expected=(source.width*source.depth-(source.notch?source.notch.width*source.notch.depth*(source.notch.shape==='diagonal'?.5:1):0)-(source.obstacles||[]).reduce((sum,o)=>sum+o.width*o.depth,0))*FT**2/1e6;
  assert.ok(Math.abs(actual-expected)<1e-8,source.name+' usable area');
  const labelled=spec.labelledDimensions?.[source.id];if(labelled)assert.deepEqual([source.width,source.depth],labelled);
 }
 for(const f of p.furniture){
  const source=spec.furniture.find(s=>s.name===f.name),r=g.rooms.find(r=>p.rooms[r.id].name===spec.rooms.find(s=>s.id===source.room).name),a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  for(const [key,value]of Object.entries({w:source.w*FT,d:source.d*FT,cx:source.x*FT,cy:source.y*FT,rot:source.rot||0}))assert.ok(Math.abs(f[key]-value)<eps,f.name+' '+key);
  // Sample just inside footprint corners to avoid ray-crossing ambiguity at exact wall contact.
  for(const [x,y]of [[-1,-1],[1,-1],[1,1],[-1,1]])assert.ok(inPoly(r.poly,f.cx+x*(f.w/2-.001)*c-y*(f.d/2-.001)*s,f.cy+x*(f.w/2-.001)*s+y*(f.d/2-.001)*c),f.name+' outside usable room');
 }
 assert.deepEqual(floorConflicts(p).map(c=>c.name),[]);assert.deepEqual(doorConflicts(p).map(c=>c.name),[]);assert.deepEqual(obstacleConflicts(p).map(c=>c.name),[]);
 for(let i=0;i<p.furniture.length;i++)for(let j=i+1;j<p.furniture.length;j++){
  // Independent SAT for two rotated rectangles; prevents a conflict-free door result from masking furniture overlap.
  const a=p.furniture[i],b=p.furniture[j],axes=[a.rot,b.rot].flatMap(angle=>{const t=angle*Math.PI/180;return [[Math.cos(t),Math.sin(t)],[-Math.sin(t),Math.cos(t)]];});
  const reach=(f,x,y)=>{const t=f.rot*Math.PI/180;return (f.w*Math.abs(x*Math.cos(t)+y*Math.sin(t))+f.d*Math.abs(-x*Math.sin(t)+y*Math.cos(t)))/2;};
  const allowed=spec.allowedOverlaps?.find(pair=>pair.names.includes(a.name)&&pair.names.includes(b.name));
  if(allowed){assert.ok(allowed.reason);const [outer,inner]=a.w*a.d>b.w*b.d?[a,b]:[b,a];assert.equal(outer.rot,0);assert.equal(inner.rot,0);assert.ok(Math.abs(outer.cx-inner.cx)+inner.w/2<=outer.w/2+eps&&Math.abs(outer.cy-inner.cy)+inner.d/2<=outer.d/2+eps,'declared nested footprint must be contained');}
  else assert.ok(axes.some(([x,y])=>Math.abs((a.cx-b.cx)*x+(a.cy-b.cy)*y)>=reach(a,x,y)+reach(b,x,y)-eps),a.name+' overlaps '+b.name);
 }
 const step=FT/4,slabs=g.floorSlabs||[],floorPolys=g.floorPolygons||slabs.map(r=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]),vertices=floorPolys.flat(),minX=Math.min(...vertices.map(p=>p[0])),minY=Math.min(...vertices.map(p=>p[1])),maxX=Math.max(...vertices.map(p=>p[0])),maxY=Math.max(...vertices.map(p=>p[1])),cols=Math.ceil((maxX-minX)/step),rows=Math.ceil((maxY-minY)/step);
 const solids=[...g.walls,...g.windows.map(o=>o.rect),...(g.obstacles||[]).map(o=>o.rect)],free=new Uint8Array(cols*rows),points=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const xx=minX+(x+.5)*step,yy=minY+(y+.5)*step,n=y*cols+x;points[n]=[xx,yy];if(floorPolys.some(poly=>inPoly(poly,xx,yy))&&!solids.some(r=>contains(r,xx,yy))&&!(g.diagonalWalls||[]).some(w=>inPoly(w.poly,xx,yy)))free[n]=1;}
 const living=g.rooms.find(r=>p.rooms[r.id].name===spec.rooms.find(r=>r.id==='living').name),start=Math.floor((living.at[1]-minY)/step)*cols+Math.floor((living.at[0]-minX)/step),queue=[start],seen=new Set(queue);assert.equal(free[start],1);
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%cols,y=Math.floor(n/cols);for(const next of [x?n-1:-1,x+1<cols?n+1:-1,y?n-cols:-1,y+1<rows?n+cols:-1])if(next>=0&&free[next]&&!seen.has(next)){seen.add(next);queue.push(next);}}
 for(const r of g.rooms)assert.ok(queue.some(n=>inPoly(r.poly,...points[n])),p.rooms[r.id].name+' disconnected');
 return {spaces:g.rooms.length,connectedSpaces:g.rooms.length,structuralGridInches:3,furniture:p.furniture.length,fixedObstacles:g.obstacles?.length||0,swingDoors:g.doors.length,bifoldDoors:g.slides.filter(o=>o.style==='bifold').length,slidingDoors:g.slides.filter(o=>o.style==='sliding').length,passages:g.lintels.filter(o=>o.passage).length,windows:g.windows.length,potentialDoorConflicts:0,potentialFixedConflicts:0,usableSqFt:g.rooms.reduce((sum,r)=>sum+(r.usableAreaM2??Math.abs(r.poly.reduce((sum,a,i)=>{const b=r.poly[(i+1)%r.poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2e6),0)/(.3048**2),scenarioFootprintSqFt:floorPolys.reduce((sum,poly)=>sum+Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2,0)/FT**2,potentialFloorConflicts:0,diagonalWallCount:new Set((g.diagonalWalls||[]).map(w=>w.id)).size,sourceWholeApartmentAccepted:false,sourceWholePlanAccepted:false};
}

export const auditApartmentScenario=auditFloorScenario;
