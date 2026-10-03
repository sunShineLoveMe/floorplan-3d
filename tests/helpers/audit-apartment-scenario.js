import assert from 'node:assert/strict';
import {FT} from './house-fixture.js';
import {doorConflicts} from '../../src/core/door-clearance.js';
import {obstacleConflicts} from '../../src/core/obstacle-clearance.js';
const eps=1e-5,rectArea=r=>(r[2]-r[0])*(r[3]-r[1]);
const contains=(r,x,y)=>x>r[0]+eps&&x<r[2]-eps&&y>r[1]+eps&&y<r[3]-eps;
function inPoly(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function auditApartmentScenario(p,spec){
 const g=p.geometry;assert.equal(g.rooms.length,8);assert.equal(p.roomEditor.openings.length,12);assert.equal(g.obstacles.length,7);
 for(const source of spec.rooms){
  const r=g.rooms.find(r=>p.rooms[r.id].name===source.name);assert.ok(r,source.name);
  const actual=r.usableAreaM2??Math.abs(r.poly.reduce((sum,a,i)=>{const b=r.poly[(i+1)%r.poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2e6;
  const expected=(source.width*source.depth-(source.notch?source.notch.width*source.notch.depth:0)-(source.obstacles||[]).reduce((sum,o)=>sum+o.width*o.depth,0))*FT**2/1e6;
  assert.ok(Math.abs(actual-expected)<1e-8,source.name+' usable area');
  const labelled=spec.labelledDimensions[source.id];if(labelled)assert.deepEqual([source.width,source.depth],labelled);
 }
 for(const f of p.furniture){
  const source=spec.furniture.find(s=>s.name===f.name),r=g.rooms.find(r=>p.rooms[r.id].name===spec.rooms.find(s=>s.id===source.room).name),a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  // Sample just inside footprint corners to avoid ray-crossing ambiguity at exact wall contact.
  for(const [x,y]of [[-1,-1],[1,-1],[1,1],[-1,1]])assert.ok(inPoly(r.poly,f.cx+x*(f.w/2-.001)*c-y*(f.d/2-.001)*s,f.cy+x*(f.w/2-.001)*s+y*(f.d/2-.001)*c),f.name+' outside usable room');
 }
 assert.deepEqual(doorConflicts(p).map(c=>c.name),[]);assert.deepEqual(obstacleConflicts(p).map(c=>c.name),[]);
 for(let i=0;i<p.furniture.length;i++)for(let j=i+1;j<p.furniture.length;j++){
  // Independent SAT for two rotated rectangles; prevents a conflict-free door result from masking furniture overlap.
  const a=p.furniture[i],b=p.furniture[j],axes=[a.rot,b.rot].flatMap(angle=>{const t=angle*Math.PI/180;return [[Math.cos(t),Math.sin(t)],[-Math.sin(t),Math.cos(t)]];});
  const reach=(f,x,y)=>{const t=f.rot*Math.PI/180;return (f.w*Math.abs(x*Math.cos(t)+y*Math.sin(t))+f.d*Math.abs(-x*Math.sin(t)+y*Math.cos(t)))/2;};
  assert.ok(axes.some(([x,y])=>Math.abs((a.cx-b.cx)*x+(a.cy-b.cy)*y)>=reach(a,x,y)+reach(b,x,y)-eps),a.name+' overlaps '+b.name);
 }
 const step=FT/4,slabs=g.floorSlabs,minX=Math.min(...slabs.map(r=>r[0])),minY=Math.min(...slabs.map(r=>r[1])),maxX=Math.max(...slabs.map(r=>r[2])),maxY=Math.max(...slabs.map(r=>r[3])),cols=Math.ceil((maxX-minX)/step),rows=Math.ceil((maxY-minY)/step);
 const solids=[...g.walls,...g.windows.map(o=>o.rect),...g.obstacles.map(o=>o.rect)],free=new Uint8Array(cols*rows),points=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const xx=minX+(x+.5)*step,yy=minY+(y+.5)*step,n=y*cols+x;points[n]=[xx,yy];if(slabs.some(r=>contains(r,xx,yy))&&!solids.some(r=>contains(r,xx,yy)))free[n]=1;}
 const living=g.rooms.find(r=>p.rooms[r.id].name===spec.rooms.find(r=>r.id==='living').name),start=Math.floor((living.at[1]-minY)/step)*cols+Math.floor((living.at[0]-minX)/step),queue=[start],seen=new Set(queue);assert.equal(free[start],1);
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%cols,y=Math.floor(n/cols);for(const next of [x?n-1:-1,x+1<cols?n+1:-1,y?n-cols:-1,y+1<rows?n+cols:-1])if(next>=0&&free[next]&&!seen.has(next)){seen.add(next);queue.push(next);}}
 for(const r of g.rooms)assert.ok(queue.some(n=>inPoly(r.poly,...points[n])),p.rooms[r.id].name+' disconnected');
 return {spaces:g.rooms.length,connectedSpaces:g.rooms.length,structuralGridInches:3,furniture:p.furniture.length,fixedObstacles:g.obstacles.length,swingDoors:g.doors.length,bifoldDoors:g.slides.length,passages:g.lintels.filter(o=>o.passage).length,windows:g.windows.length,potentialDoorConflicts:0,potentialFixedConflicts:0,usableSqFt:g.rooms.reduce((sum,r)=>sum+(r.usableAreaM2??Math.abs(r.poly.reduce((sum,a,i)=>{const b=r.poly[(i+1)%r.poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2e6),0)/(.3048**2),scenarioFootprintSqFt:slabs.reduce((sum,r)=>sum+rectArea(r),0)/FT**2,sourceWholeApartmentAccepted:false};
}
