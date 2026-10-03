import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {useZonePolygon,useZoneReport} from '../src/core/use-zones.js';
import {createRectangleProject,validate,read,clone} from '../src/data/project-data.js';
import {createProjectStore} from '../src/core/project-store.js';import {CATALOGS} from '../src/data/catalogs.js';
import {rectPolygon} from '../src/core/polygons.js';import {passageSpace,sweptCircleIntersectsPolygon} from '../src/core/spatial-clearance.js';
const zone=(patch={})=>({id:'zone',kind:'cabinet',side:'bottom',widthMm:600,depthMm:600,offsetMm:0,...patch});
const item=(patch={})=>({id:'owner',name:'Unknown',type:'desk',cx:1500,cy:1500,w:1000,d:500,rot:0,color:'#ffffff',useZones:[zone()],...patch});
const project=()=>{const p=createRectangleProject({width:4000,depth:4000});p.furniture=[item()];return p;};
test('explicit four sides and offset use independent dimensions, following item rotation and resize',()=>{
 const f=item();assert.deepEqual(useZonePolygon(f,zone()),[[1200,1750],[1800,1750],[1800,2350],[1200,2350]]);
 assert.deepEqual(useZonePolygon(f,zone({side:'left',offsetMm:100})),[[400,1300],[1000,1300],[1000,1900],[400,1900]]);
 const z=zone({side:'top'});assert.deepEqual(useZonePolygon(f,z),[[1200,650],[1800,650],[1800,1250],[1200,1250]]);
 const p=useZonePolygon({...f,rot:90},zone());assert.ok(Math.abs(p[0][0]-1250)<1e-8);assert.ok(Math.abs(p[0][1]-1200)<1e-8);
 assert.deepEqual(useZonePolygon({...f,w:2000,d:1000},zone({side:'right'})),[[2500,1200],[3100,1200],[3100,1800],[2500,1800]]);
});
test('contact is clear; 1 mm overlap and fixed/solid footprints need review, regardless of name or height',()=>{
 const p=project();p.furniture.push(item({id:'other',name:'Sliding refrigerator',cx:1500,cy:2450,w:200,d:200,useZones:[]}));assert.equal(useZoneReport(p).zones[0].status,'clear');p.furniture[1].cy-=1;assert.equal(useZoneReport(p).zones[0].conflicts[0].overlapMm2,200);
 p.furniture[1].clearance={mode:'ground'};assert.equal(useZoneReport(p).zones[0].status,'clear');p.furniture[1].type='rug';delete p.furniture[1].clearance;assert.equal(useZoneReport(p).zones[0].status,'clear');p.furniture[1].clearance={mode:'solid'};assert.equal(useZoneReport(p).zones[0].status,'conflict');
 p.furniture.pop();p.geometry.obstacles=[{id:'fixed',name:'Ceiling?',rect:[1450,1800,1550,1850],height:1}];assert.equal(useZoneReport(p).zones[0].conflicts[0].kind,'fixed');
});
test('owner excluded, declared parent still blocks use; zones may overlap without concurrent use claims',()=>{
 const p=project();p.furniture[0].clearance={mode:'solid',containerId:'parent'};p.furniture.push(item({id:'parent',w:2000,d:2000,useZones:[]}));assert.equal(useZoneReport(p).zones[0].conflicts[0].id,'parent');p.furniture.pop();p.furniture[0].useZones.push(zone({id:'second'}));assert.deepEqual(useZoneReport(p).zones.map(z=>z.status),['clear','clear']);
});
test('shared open floor unions, concave notches and actual diagonal edges avoid bounding-box conclusions',()=>{
 const p=project();p.geometry.walls=[];p.geometry.rooms[0].poly=[[0,0],[4000,0],[4000,1800],[1600,1800],[1600,4000],[0,4000]];
 const r=useZoneReport(p).zones[0];assert.equal(r.outsideMm2,110000);assert.ok(r.conflicts.some(c=>c.kind==='floor'));
 p.geometry.rooms.push({id:'open',poly:rectPolygon([1600,1800,4000,4000])});assert.equal(useZoneReport(p).zones[0].outsideMm2,0);
 p.geometry.diagonalWalls=[{id:'diagonal',poly:[[1000,2400],[2000,1400],[2010,1410],[1010,2410]]}];assert.ok(useZoneReport(p).zones[0].conflicts.some(c=>c.id==='diagonal'));
});
test('door planning assumptions update explicit zone conflicts; ground owner never disables its zone',()=>{
 const p=project();p.furniture[0].clearance={mode:'ground'};p.geometry.doors=[{id:'door',h:[1200,1800],c:[1,0],o:[0,1],len:600,rect:[1200,1700,1800,1740]}];assert.ok(useZoneReport(p).zones[0].conflicts.some(c=>c.kind==='door'));p.clearance={targetMm:900,doorState:'closed'};assert.equal(useZoneReport(p).zones[0].status,'clear');
});
test('parameters survive store undo/redo, unrelated unit edits, JSON and v1 without saving derived results',()=>{
 const p=project(),geometry=clone(p.geometry),store=createProjectStore(p);store.mutate(p=>{p.furniture[0].useZones[0].depthMm=617.123456;p.units.display='imperial';});const saved=clone(store.getProject());store.undo();assert.equal(store.getProject().furniture[0].useZones[0].depthMm,600);store.redo();assert.deepEqual(store.getProject().furniture,saved.furniture);assert.deepEqual(read(JSON.stringify(saved),geometry,CATALOGS).project.furniture,saved.furniture);assert.deepEqual(store.getProject().geometry,geometry);p.version=1;p.roomEditor=null;assert.ok(validate(p,CATALOGS));
});
test('invalid zone sizes, sides, kinds, duplicate IDs and budgets reject imports while older files remain valid',()=>{
 for(const patch of [{widthMm:0},{depthMm:10001},{offsetMm:Infinity},{side:'front'},{kind:'guessed'}]){const p=project();Object.assign(p.furniture[0].useZones[0],patch);assert.throws(()=>validate(p,CATALOGS));}
 const p=project();p.furniture[0].useZones.push(zone());assert.throws(()=>validate(p,CATALOGS));p.furniture[0].useZones=Array.from({length:17},(_,i)=>zone({id:'zone'+i}));assert.throws(()=>validate(p,CATALOGS));delete p.furniture[0].useZones;assert.ok(validate(p,CATALOGS));
});
test('continuous native sweep blocks 1 mm obstacles, concave floor excursions and diagonal collision even with free endpoints',()=>{
 assert.equal(sweptCircleIntersectsPolygon([0,0],[1000,0],220,rectPolygon([499,-1000,500,1000])),true);
 assert.equal(sweptCircleIntersectsPolygon([0,0],[1000,0],220,rectPolygon([0,220,1000,300])),false);
 const p=project();p.furniture=[];p.geometry.walls=[];const s=passageSpace(p,{includeDoors:false});assert.equal(s.swept([3800,2000],[4200,2000],220),false);
 p.geometry.rooms[0].poly=[[0,0],[4000,0],[4000,2000],[2000,2000],[2000,4000],[0,4000]];assert.equal(passageSpace(p).swept([1000,3000],[3000,1000],220),false);
});
test('removed walls retain stable original obstacle identifiers',()=>{
 const p=project();p.demolished=['w0'];assert.equal(passageSpace(p).obstacles.find(o=>o.kind==='wall').id,'wall-1');
});
test('same zone logic runs on Jacobsen, CMU, corrected Plan F without changing models',()=>{
 for(const file of ['NA-whole-floor-reuse/jacobsen/complete-project.json','NA-whole-floor-reuse/cmu/complete-project.json','NA-diagonal-cuts/plan-f-correction/project.json']){const p=JSON.parse(fs.readFileSync(new URL('../docs/verification/'+file,import.meta.url)));for(const f of p.furniture)f.useZones=[zone()];const before=JSON.stringify(p),r=useZoneReport(p);assert.equal(r.zones.length,p.furniture.length);assert.ok(r.zones.some(z=>z.status==='conflict'));assert.equal(JSON.stringify(p),before);}
});
