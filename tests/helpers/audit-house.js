import assert from 'node:assert/strict';
import {doorConflicts} from '../../src/core/door-clearance.js';
import {FT} from './house-fixture.js';
const eps=1e-6,area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
export function auditHouse(p,spec){
 const g=p.geometry,rectArea=r=>(r[2]-r[0])*(r[3]-r[1]);
 const gross=g.floorSlabs.reduce((s,r)=>s+rectArea(r),0)/FT**2,expected=area(spec.footprint);
 assert.ok(Math.abs(gross-expected)<1e-6,`footprint ${gross} != source outline ${expected}`);
 const inOutline=(x,y)=>{const poly=spec.footprint;let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j],cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);if(Math.abs(cross)<eps&&x>=Math.min(a[0],b[0])-eps&&x<=Math.max(a[0],b[0])+eps&&y>=Math.min(a[1],b[1])-eps&&y<=Math.max(a[1],b[1])+eps)return true;if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 for(const rect of g.floorSlabs){const [x0,y0,x1,y1]=rect.map(v=>v/FT);for(const [x,y]of [[x0,y0],[x1,y0],[x1,y1],[x0,y1],[(x0+x1)/2,(y0+y1)/2]])assert.ok(inOutline(x,y),'floor extends outside source footprint');}
 for(let i=0;i<g.floorSlabs.length;i++)for(let j=i+1;j<g.floorSlabs.length;j++){const a=g.floorSlabs[i],b=g.floorSlabs[j];assert.ok(Math.min(a[2],b[2])-Math.max(a[0],b[0])<=eps||Math.min(a[3],b[3])-Math.max(a[1],b[1])<=eps,'double counted floor');}
 assert.equal(g.rooms.length,spec.rooms.length);assert.equal(p.roomEditor.openings.length,spec.openings.length);
 for(const source of spec.rooms){const r=g.rooms.find(r=>p.rooms[r.id].name===source.name);assert.ok(r,source.name);assert.ok(Math.abs(area(r.poly)/FT**2-(source.width*source.depth-(source.notch?source.notch.width*source.notch.depth:0)))<1e-6,source.name+' net area');}
 for(const source of spec.openings){const room=g.rooms.find(r=>p.rooms[r.id].name===spec.rooms.find(r=>r.id===source.room).name),o=p.roomEditor.openings.find(o=>o.roomId===room.id&&o.wallId.endsWith('--'+source.side)&&Math.abs(o.offset-source.offset*FT)<eps);assert.ok(o,source.id+' missing');assert.ok(Math.abs(o.width-source.width*FT)<eps,source.id+' width');assert.equal(o.mode??'swing',source.mode??'swing',source.id+' style');if(source.type==='door'){assert.equal(o.swing,source.swing,source.id+' direction');assert.equal(o.hinge,source.hinge,source.id+' hinge');}}
 // Independent 3-inch grid: walls/windows block walking, doors are passable.
 const step=FT/4,slabs=g.floorSlabs,inside=(x,y,r)=>x>r[0]+eps&&x<r[2]-eps&&y>r[1]+eps&&y<r[3]-eps;
 const obstacles=[...g.walls,...g.windows.map(w=>w.rect)],minX=Math.min(...slabs.map(r=>r[0])),minY=Math.min(...slabs.map(r=>r[1])),maxX=Math.max(...slabs.map(r=>r[2])),maxY=Math.max(...slabs.map(r=>r[3])),cols=Math.ceil((maxX-minX)/step),rows=Math.ceil((maxY-minY)/step);
 const free=new Uint8Array(cols*rows),cell=(x,y)=>Math.floor((y-minY)/step)*cols+Math.floor((x-minX)/step);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const xx=minX+(x+.5)*step,yy=minY+(y+.5)*step;if(slabs.some(r=>inside(xx,yy,r))&&!obstacles.some(r=>inside(xx,yy,r)))free[y*cols+x]=1;}
 const center=r=>cell(...r.at),queue=[center(g.rooms[0])],seen=new Set(queue);assert.equal(free[queue[0]],1);
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%cols,y=Math.floor(n/cols);for(const m of [x? n-1:-1,x+1<cols?n+1:-1,y?n-cols:-1,y+1<rows?n+cols:-1])if(m>=0&&free[m]&&!seen.has(m)){seen.add(m);queue.push(m);}}
 for(const r of g.rooms)assert.ok(seen.has(center(r)),p.rooms[r.id].name+' disconnected from entry');
 // Open fold packs occupy one quarter of the opening depth at both jambs.
 const foldRects=g.slides.filter(d=>d.style==='bifold').flatMap(d=>{const [x0,y0,x1,y1]=d.rect,side=d.wallId.split('--').at(-1),vertical=['left','right'].includes(side),L=vertical?y1-y0:x1-x0,face=vertical?(side==='left'?x1:x0):(side==='top'?y1:y0),normal=(['top','left'].includes(side)?1:-1)*(d.swing==='outward'?-1:1),a=Math.min(face,face+normal*L/4),b=Math.max(face,face+normal*L/4);return vertical?[[a,y0,b,y0+L/8],[a,y1-L/8,b,y1]]:[[x0,a,x0+L/8,b],[x1-L/8,a,x1,b]];});
 for(const pack of foldRects)for(const f of p.furniture){const box=[f.cx-f.w/2,f.cy-f.d/2,f.cx+f.w/2,f.cy+f.d/2];assert.ok(Math.min(pack[2],box[2])-Math.max(pack[0],box[0])<=eps||Math.min(pack[3],box[3])-Math.max(pack[1],box[1])<=eps,f.name+' blocks the open fold pack');}
 const furnitureConflicts=doorConflicts(p);assert.deepEqual(furnitureConflicts.map(c=>c.name),[],'swing clearance for source fixtures and acceptance furniture');
 for(const source of spec.furniture.filter(f=>f.purpose==='acceptance-furniture')){const f=p.furniture.find(f=>f.name===source.name);assert.ok(f,source.name+' missing');const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[f.cx+x*f.w/2,f.cy+y*f.d/2]);assert.ok(g.rooms.some(r=>{const xs=r.poly.map(v=>v[0]),ys=r.poly.map(v=>v[1]);return points.every(([x,y])=>x>=Math.min(...xs)-eps&&x<=Math.max(...xs)+eps&&y>=Math.min(...ys)-eps&&y<=Math.max(...ys)+eps)&&(!spec.rooms.find(s=>s.name===p.rooms[r.id].name).notch||points.every(([x,y])=>{let inside=false;for(let i=0,j=r.poly.length-1;i<r.poly.length;j=i++){const a=r.poly[i],b=r.poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}));}),source.name+' outside usable floor');}
 return {openFoldPacks:foldRects.length,furniture:p.furniture.length,swingConflicts:furnitureConflicts.length,grossSqFt:gross,sourceOutlineSqFt:expected,netSqFt:g.rooms.reduce((s,r)=>s+area(r.poly),0)/FT**2,spaces:g.rooms.length,doors:g.doors.length,sliding:g.slides.filter(s=>s.style==='sliding').length,bifold:g.slides.filter(s=>s.style==='bifold').length,windows:g.windows.length,connectedSpaces:g.rooms.length};
}
