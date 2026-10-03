import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {polygonGap,passageSpace,passageReport,spacingReport,nearestStandingPoint,furnitureDistances} from '../src/core/spatial-clearance.js';
import {rectPolygon,furniturePolygon} from '../src/core/polygons.js';
import {createRectangleProject,updateRectangleProject,validate,read,clone} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {createProjectStore} from '../src/core/project-store.js';
const item=(id,cx,cy,w=200,d=200,rot=0)=>({id,cx,cy,w,d,rot,type:'desk',name:id,color:'#ffffff'});
const project=(width=4000,depth=3000)=>{const p=createRectangleProject({width,depth});p.clearance={targetMm:500,doorState:'open'};return p;};
function split(p,width=1000){
 const bottom=p.geometry.rooms[0];bottom.id='bottom';bottom.poly=rectPolygon([0,1500,width,3000]);bottom.at=[width/2,2500];
 p.geometry.rooms.unshift({id:'top',name:'Top',mat:'wood',poly:rectPolygon([0,0,width,1500]),at:[width/2,500]});p.rooms={top:{name:'Top',mat:'wood'},bottom:{name:'Bottom',mat:'wood'}};p.clearance.fromRoomId='top';p.clearance.toRoomId='bottom';return p;
}
test('Euclidean footprint gaps distinguish contact, 1 mm overlap, and actual 45/90 degree rectangles',()=>{
 assert.equal(polygonGap(rectPolygon([0,0,100,100]),rectPolygon([100,0,200,100])).kind,'contact');
 assert.equal(polygonGap(rectPolygon([0,0,100,100]),rectPolygon([99,0,199,100])).overlapMm2,100);
 assert.equal(polygonGap(rectPolygon([0,0,100,100]),rectPolygon([101,0,201,100])).distanceMm,1);
 const f=item('a',0,0,200,100,45),g=item('b',0,250,200,100,45);assert.ok(polygonGap(furniturePolygon(f),furniturePolygon(g)).distanceMm>30);
 assert.ok(Math.abs(polygonGap(furniturePolygon(item('a',0,0,200,100,90)),furniturePolygon(item('b',200,0))).distanceMm-50)<1e-6);
});
test('target ±1 mm: straight 1000 mm net corridor accepts 999/1000, rejects 1001',()=>{
 const p=split(project(1000,3000));
 for(const w of [999,1000]){p.clearance.targetMm=w;assert.equal(passageReport(p).status,'route-found');}
 p.clearance.targetMm=1001;assert.equal(passageReport(p).status,'no-standing-point');
});
test('a 1 mm thin obstacle between free grid nodes blocks the continuous sweep',()=>{
 const p=split(project(1000,3000));p.geometry.obstacles=[{id:'thin',name:'Thin',roomId:'top',rect:[0,1225,1000,1226]}];
 assert.equal(passageReport(p).status,'no-route');assert.equal(passageSpace(p).swept([500,1200],[500,1250],250),false);
});
test('solid furniture separates spaces; rug is walkable; explicit solid rug blocks',()=>{
 const p=split(project(1000,3000));p.furniture=[item('barrier',500,1500,1000,200)];assert.equal(passageReport(p).status,'no-route');
 assert.equal(passageReport(p,{includeFurniture:false}).status,'route-found');
 p.furniture[0].type='rug';assert.equal(passageReport(p).status,'route-found');p.furniture[0].clearance={mode:'solid'};assert.equal(passageReport(p).status,'no-route');
});
test('floor union admits open boundaries and rejects point contact, gaps and outside slabs',()=>{
 const p=split(project(1000,3000));assert.equal(passageReport(p).status,'route-found');
 p.geometry.rooms[1].poly=rectPolygon([1000,1500,2000,3000]);p.geometry.rooms[1].at=[1500,2500];p.geometry.floorSlabs=[[0,0,2000,3000]];assert.equal(passageReport(p).status,'no-route');
 p.geometry.rooms[1].poly=rectPolygon([0,1501,1000,3000]);p.geometry.rooms[1].at=[500,2500];assert.equal(passageReport(p).status,'no-route');
});
test('rotated narrow diagonal route and translated coordinates retain conservative continuous checks',()=>{
 const p=split(project(1000,3000));const rotate=q=>[(q[0]-q[1])/Math.SQRT2+20000,(q[0]+q[1])/Math.SQRT2-5000];
 for(const r of p.geometry.rooms){r.poly=r.poly.map(rotate);r.at=rotate(r.at);}p.geometry.walls=[];p.clearance.targetMm=800;
 const r=passageReport(p);assert.equal(r.status,'route-found');const space=passageSpace(p);for(let i=1;i<r.path.length;i++)assert.ok(space.swept(r.path[i-1],r.path[i],400));
 p.clearance.targetMm=1001;assert.equal(passageReport(p).status,'no-standing-point');
});
test('wall and diagonal distances use real edges; separated closed partitions suppress gap advisories',()=>{
 const p=project();p.geometry.walls=[[1900,0,2100,3000,'low']];p.furniture=[item('a',1750,1500),item('b',2250,1500)];assert.deepEqual(spacingReport(p).issues,[]);
 p.geometry.walls=[];assert.equal(spacingReport(p).issues[0].distanceMm,300);
 p.geometry.diagonalWalls=[{id:'diagonal',poly:[[0,0],[2000,2000],[2100,2000],[100,0]]}];p.furniture=[item('a',500,1500)];const expected=800/Math.SQRT2;assert.ok(Math.abs(furnitureDistances(p,'a')[0].distanceMm-expected)<1e-6);
});
test('explicit fully contained nesting exempts one pair but never opens the container footprint',()=>{
 const p=split(project(1000,3000));p.furniture=[item('counter',500,1500,1000,400),item('sink',500,1500)];
 assert.equal(spacingReport(p).issues[0].kind,'overlap');p.furniture[1].clearance={mode:'solid',containerId:'counter'};assert.deepEqual(spacingReport(p).issues,[]);assert.equal(passageReport(p).status,'no-route');
 p.furniture[1].cx=950;assert.ok(spacingReport(p).issues.some(i=>i.kind==='invalid-nesting'));p.furniture.shift();assert.equal(spacingReport(p).issues[0].kind,'invalid-nesting');
});
test('swing/open/closed, retracted slider, unknown bifold and passages have different blockers',()=>{
 const p=split(project(1000,3000));const d={id:'d',name:'D',rect:[0,1480,1000,1520],h:[0,1500],c:[1,0],o:[0,-1],len:1000};p.geometry.doors=[d];p.clearance.targetMm=500;
 assert.equal(passageReport(p).status,'route-found');p.clearance.doorState='closed';assert.equal(passageReport(p).status,'no-route');
 p.geometry.doors=[];p.geometry.slides=[{...d,v:false,style:'sliding'}];p.clearance.doorState='open';assert.equal(passageReport(p).status,'route-found');p.geometry.slides[0].style='bifold';assert.equal(passageReport(p).status,'no-route');
 p.geometry.slides=[];p.geometry.lintels=[{...d,passage:true}];p.clearance.doorState='closed';assert.equal(passageReport(p).status,'route-found');
});
test('invalid/missing settings and over-budget grids return unknown; no standing point never passes',()=>{
 const p=project();p.clearance.fromRoomId='deleted';assert.equal(passageReport(p).reason,'missing-space');delete p.clearance.fromRoomId;
 p.furniture=[item('cover',2000,1500,4000,3000)];assert.equal(passageReport(p).status,'no-standing-point');
 assert.equal(nearestStandingPoint(passageSpace(p),p.geometry.rooms[0],220,[2000,1500]),null);
 p.furniture=[];p.clearance.targetMm=NaN;assert.equal(passageReport(p).status,'unknown');p.clearance.targetMm=500;assert.equal(passageReport(p,{stepMm:1}).reason,'sampling-budget');
});
test('settings and footprint assumptions validate, save, reimport and undo/redo without changing geometry',()=>{
 const p=project();p.furniture=[item('counter',2000,1500),item('sink',2000,1500,100,100)];p.furniture[1].clearance={mode:'solid',containerId:'counter'};
 const store=createProjectStore(p),g=clone(p.geometry);store.mutate(x=>x.clearance.targetMm=762);assert.equal(store.getProject().clearance.targetMm,762);store.undo();assert.equal(store.getProject().clearance.targetMm,500);store.redo();assert.equal(read(JSON.stringify(store.getProject()),g,CATALOGS).project.clearance.targetMm,762);assert.deepEqual(store.getProject().geometry,g);
 for(const patch of [{targetMm:0},{targetMm:3001},{doorState:'partial'}])assert.throws(()=>validate({...p,clearance:{...p.clearance,...patch}},CATALOGS));
 p.furniture[1].clearance.containerId=p.furniture[1].id;assert.throws(()=>validate(p,CATALOGS));delete p.furniture[1].clearance;delete p.clearance;assert.ok(validate(p,CATALOGS));p.version=1;p.roomEditor=null;assert.ok(validate(p,CATALOGS));
});
test('same production passage and spacing logic covers Jacobsen, CMU and corrected Plan F without fixture branches',()=>{
 for(const file of ['NA-whole-floor-reuse/jacobsen/complete-project.json','NA-whole-floor-reuse/cmu/complete-project.json','NA-diagonal-cuts/plan-f-correction/project.json']){
  const p=JSON.parse(fs.readFileSync(new URL('../docs/verification/'+file,import.meta.url))),before=JSON.stringify(p),r=passageReport(p);assert.notEqual(r.status,'route-found');assert.ok(spacingReport(p).issues.length>0);assert.equal(JSON.stringify(p),before);
  const space=passageSpace(p),start=p.geometry.walkStart.position,room=p.geometry.rooms.find(r=>r.id===p.geometry.rooms[0].id);const clear=nearestStandingPoint(space,room,220,start);if(clear)assert.ok(space.free(clear,220));
 }
});

test('a real narrow passage opening blocks even when both rooms have ample standing area',()=>{
 const e={kind:'house',height:2800,wallThickness:120,rooms:[{id:'left',x:0,y:0,width:2000,depth:2000},{id:'right',x:2120,y:0,width:2000,depth:2000}],openings:[{id:'narrow',type:'door',roomId:'left',wallId:'left--right',mode:'passage',offset:800,width:400,height:2100}]};
 const p=updateRectangleProject(createRectangleProject(),e,{left:{name:'Left',mat:'wood'},right:{name:'Right',mat:'wood'}});p.clearance={targetMm:500,doorState:'open',fromRoomId:'left',toRoomId:'right'};
 const r=passageReport(p);assert.ok(r.start&&r.end);assert.equal(r.status,'no-route');p.clearance.targetMm=300;assert.equal(passageReport(p).status,'route-found');
});
test('concave notch and overlapping floor unions keep their true exterior and reject invalid outlines',()=>{
 const p=project(2000,2000);p.geometry.walls=[];p.geometry.rooms[0].poly=[[0,0],[2000,0],[2000,1000],[1000,1000],[1000,2000],[0,2000]];const space=passageSpace(p);
 assert.ok(space.free([500,1500],250));assert.equal(space.free([1500,1500],250),false);assert.equal(space.swept([500,1500],[1500,500],250),false);
 p.geometry.rooms.push({id:'overlap',name:'Overlap',mat:'wood',poly:rectPolygon([900,0,2000,1000]),at:[1500,500]});assert.ok(passageSpace(p).free([950,500],250));
 p.geometry.rooms[0].poly=[[0,0],[2000,1500],[0,2000],[1500,0]];assert.equal(passageReport(p).reason,'invalid-floor');
});
