import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRectangleProject,updateRectangleProject,validate,read} from '../src/data/project-data.js';
import {asHouse,roomFloorPoly,roomFloorPieces,wallRange} from '../src/data/house-editor.js';
import {roomArea,footprintArea} from '../src/core/geometry.js';
import {polygonArea,rectPolygon,intersectConvex,subtractConvex,convexPieces,circleIntersectsPolygon} from '../src/core/polygons.js';
import {floorConflicts} from '../src/core/floor-clearance.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {diagonalCases,diagonalFixture} from './helpers/diagonal-fixture.js';
import {createHash} from 'node:crypto';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} differs from ${b}`);
const corners=['top-left','top-right','bottom-left','bottom-right'];
function cutProject(corner='top-left',width=1000,depth=800,thickness=120,x=0,y=0){
 const base=createRectangleProject(),e=asHouse(base.roomEditor);Object.assign(e.rooms[0],{x,y,notch:{corner,width,depth,shape:'diagonal',wallThickness:thickness}});
 return validate(updateRectangleProject(base,e),CATALOGS);
}
test('one generic cut model covers four corners, unequal angles and translated layouts with exact areas and no wall-floor intrusion',()=>{
 let cases=0;
 for(const corner of corners)for(const [width,depth]of [[600,900],[1300,400],[2900,2200]])for(const [x,y]of [[0,0],[-7312.4,985.9]]){
  const p=cutProject(corner,width,depth,120,x,y),g=p.geometry,r=p.roomEditor.rooms[0],net=4000*3000-width*depth/2;
  close(roomArea(g.rooms[0])*1e6,net);assert.equal(g.rooms[0].poly.length,5);assert.equal(g.floorSlabs,undefined);assert.ok(g.floorPolygons.length);
  assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
  for(const wall of [...g.walls.map(rectPolygon),...g.diagonalWalls.map(w=>w.poly)])close(polygonArea(intersectConvex(wall,roomFloorPoly(r))),0);
  for(let i=0;i<g.diagonalWalls.length;i++)for(let j=i+1;j<g.diagonalWalls.length;j++)close(polygonArea(intersectConvex(g.diagonalWalls[i].poly,g.diagonalWalls[j].poly)),0);
  assert.ok(footprintArea(g)>net/1e6);cases++;
 }
 assert.equal(cases,24);
});
test('polygon clipping conserves area through disjoint floor union and concave notch decomposition',()=>{
 const rectangle=rectPolygon([0,0,4000,3000]),triangle=[[0,0],[1000,0],[0,800]],parts=subtractConvex(rectangle,triangle);
 close(parts.reduce((sum,p)=>sum+polygonArea(p),0),11600000);
 const notch=roomFloorPoly({x:100,y:200,width:4000,depth:3000,notch:{corner:'bottom-left',width:500,depth:700}});
 close(convexPieces(notch).reduce((sum,p)=>sum+polygonArea(p),0),11650000);
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)close(polygonArea(intersectConvex(parts[i],parts[j])),0);
});
test('diagonal neighbours may overlap bounding boxes, require real wall clearance and never double count the footprint',()=>{
 const base=createRectangleProject({width:2700,depth:3000}),e=asHouse(base.roomEditor);
 e.rooms[0].x=2400;e.rooms[0].notch={corner:'bottom-left',width:900,depth:900,shape:'diagonal',wallThickness:120};
 e.rooms.push({id:'bath',x:0,y:2100+120*Math.SQRT2,width:3300,depth:1800,notch:{corner:'top-right',width:900,depth:900,shape:'diagonal',wallThickness:120}});
 const rooms={...base.rooms,bath:{name:'Bath',mat:'tile600'}},p=validate(updateRectangleProject(base,e,rooms),CATALOGS),g=p.geometry;
 close(polygonArea(intersectConvex(g.rooms[0].poly,g.rooms[1].poly)),0);
 for(let i=0;i<g.floorPolygons.length;i++)for(let j=i+1;j<g.floorPolygons.length;j++)close(polygonArea(intersectConvex(g.floorPolygons[i],g.floorPolygons[j])),0);
 const touch=structuredClone(e);touch.rooms[1].y=2100;assert.throws(()=>updateRectangleProject(base,touch,rooms),/wall intrudes/);
 const overlap=structuredClone(e);overlap.rooms[1].y=2000;assert.throws(()=>updateRectangleProject(base,overlap,rooms),/Rooms overlap/);
 const open=structuredClone(touch);for(const r of open.rooms)r.notch.wallThickness=0;assert.doesNotThrow(()=>validate(updateRectangleProject(base,open,rooms),CATALOGS));
});
test('cut removal, invalid dimensions, clipped openings and fixed columns validate atomically',()=>{
 const p=cutProject(),e=structuredClone(p.roomEditor),r=e.rooms[0];assert.deepEqual(wallRange(r,'top'),[1000,4000]);
 for(const change of [{width:4000},{depth:0},{wallThickness:-1},{wallThickness:1000},{shape:'unknown'}]){const invalid=structuredClone(e);Object.assign(invalid.rooms[0].notch,change);assert.throws(()=>updateRectangleProject(p,invalid));}
 const opening={id:'window',roomId:r.id,type:'window',wallId:r.id+'--top',offset:200,width:500,height:1200,sill:900};e.openings=[opening];assert.throws(()=>updateRectangleProject(p,e),/remaining straight wall/);
 opening.offset=1200;assert.doesNotThrow(()=>validate(updateRectangleProject(p,e),CATALOGS));
 e.openings=[];r.obstacles=[{id:'bad-column',name:'Column',x:0,y:0,width:100,depth:100,height:2000}];assert.throws(()=>updateRectangleProject(p,e),/usable floor/);
 r.obstacles[0].x=2000;const valid=validate(updateRectangleProject(p,e),CATALOGS);close(roomArea(valid.geometry.rooms[0])*1e6,11590000);
 delete r.notch;delete r.obstacles;const restored=updateRectangleProject(p,e);assert.equal(restored.geometry.diagonalWalls,undefined);assert.equal(restored.geometry.floorPolygons,undefined);assert.ok(restored.geometry.floorSlabs);assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
 const tampered=structuredClone(p);tampered.geometry.diagonalWalls[0].poly[0][0]+=1;assert.throws(()=>validate(tampered,CATALOGS),/geometry mismatch/);
});
test('true sloping footprints warn, clear after correction and do not use their rectangular bounding box for walk collision',()=>{
 const p=cutProject(),f={id:'desk',type:'desk',name:'Desk',w:200,d:200,cx:100,cy:100,rot:0,color:'#ddd6c8'};p.furniture=[f];
 assert.equal(floorConflicts(p)[0].kind,'floor');f.cx=300;f.cy=560;assert.equal(floorConflicts(p)[0].kind,'wall');
 f.cx=2000;f.cy=1500;f.rot=45;assert.deepEqual(floorConflicts(p),[]);
 const wall=p.geometry.diagonalWalls.find(w=>w.poly.length===5).poly;
 assert.equal(circleIntersectsPolygon(900,700,20,wall),false);assert.ok(p.geometry.diagonalWalls.some(w=>circleIntersectsPolygon(450,400,30,w.poly)));
});
test('floor clearance handles a rotated item across connected rooms and detects a swing hitting a cut',()=>{
 const base=createRectangleProject({width:3000,depth:3000}),e=asHouse(base.roomEditor);e.rooms[0].wallWidths={right:0};e.rooms.push({id:'next',x:3000,y:0,width:3000,depth:3000,wallWidths:{left:0}});
 const p=updateRectangleProject(base,e,{...base.rooms,next:{name:'Next',mat:'wood'}});p.furniture=[{id:'sofa',name:'Sofa',type:'sofa',w:1200,d:500,cx:3000,cy:1500,rot:45,color:'#ddd6c8'}];assert.deepEqual(floorConflicts(p),[]);
 const cut=cutProject('top-left',1500,1800),editor=structuredClone(cut.roomEditor);editor.openings=[{id:'wide-door',roomId:'room-1',type:'door',wallId:'room-1--bottom',offset:100,width:2000,height:2000,hinge:'start',swing:'inward'}];
 assert.ok(floorConflicts(updateRectangleProject(cut,editor)).some(c=>c.kind==='door'));
});
test('all four accepted manual houses and CMU composition still read with their exact prior geometry',()=>{
 for(const file of ['plan-a','plan-b','plan-c','plan-f'].map(id=>'docs/verification/NA-complete-houses/'+id+'/complete-project.json').concat('docs/verification/NA-apartment-composition/complete-project.json')){
  const p=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(validate(p,CATALOGS).geometry,p.geometry);
 }
});
test('four different engineering layouts reuse one model, retain provenance and have no floor, diagonal-wall or swing conflicts',()=>{
 const directions=new Set();
 for(const spec of diagonalCases){
  const p=diagonalFixture(spec);assert.deepEqual(floorConflicts(p),[]);
  if(spec.source)assert.equal(createHash('sha256').update(fs.readFileSync(spec.source)).digest('hex'),spec.sourceSha256);
  for(const r of spec.rooms){if(r.notch)directions.add(r.notch.corner);const expected=(r.width*r.depth-(r.notch?r.notch.width*r.notch.depth/2:0)-(r.obstacles||[]).reduce((sum,o)=>sum+o.width*o.depth,0))/1e6;close(roomArea(p.geometry.rooms.find(room=>room.id===r.id)),expected);}
  assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
 }
 assert.equal(directions.size,4);
});
test('generic floor checks catch the prior Plan F cabinet crossing a pony wall; a 3 in correction clears it without changing structural geometry',()=>{
 const p=JSON.parse(fs.readFileSync('docs/verification/NA-complete-houses/plan-f/complete-project.json','utf8')),before=structuredClone(p.geometry),counter=p.furniture.find(f=>f.name==='Kitchen south counter');
 assert.equal(floorConflicts(p).find(c=>c.furnitureId===counter.id).kind,'floor');counter.cy-=76.2;
 assert.deepEqual(floorConflicts(p),[]);assert.deepEqual(p.geometry,before);assert.doesNotThrow(()=>validate(p,CATALOGS));
});
