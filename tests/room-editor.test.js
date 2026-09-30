import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRoomEditor,WALL_IDS} from '../src/data/room-editor.js';
import {createRectangleProject,updateRectangleProject,validate} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {area} from '../src/core/geometry.js';
import {createProjectStore} from '../src/core/project-store.js';
import {readProject,serializeProject} from '../src/services/project-files.js';
import {createStorage,STORE,V1_STORE,LEGACY_STORE} from '../src/services/storage.js';
const rectangle=()=>createRectangleProject({name:'Bedroom',width:4000,depth:3000,height:2800});
const door=(wallId='top',hinge='start',swing='inward')=>({id:'door-1',type:'door',wallId,offset:500,width:900,height:2100,hinge,swing});
const windowOpening=()=>({id:'window-1',type:'window',wallId:'right',offset:900,width:1200,height:1200,sill:900});
const withOpenings=(p,openings)=>updateRectangleProject(p,{...p.roomEditor,openings});
const adapter=values=>{const map=new Map(Object.entries(values));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('rectangle geometry keeps net area, decimal dimensions and non-overlapping wall corners',()=>{
 const p=createRectangleProject({name:'Decimal',width:3048,depth:3657.6,height:2800.5}),g=p.geometry;
 assert.equal(area(g.rooms[0].poly),3048*3657.6/1e6);assert.deepEqual(g.origin,[1524,1828.8]);
 assert.deepEqual(g.walls,[[-120,-120,3168,0,'n'],[3048,0,3168,3657.6,'n'],[-120,3657.6,3168,3777.6,'n'],[-120,0,0,3657.6,'n']]);
 assert.deepEqual(g.wallIds,WALL_IDS);assert.equal(g.dimensions[1].segments[0],3657.6);assert.equal(g.entry,null);
 assert.notDeepEqual(g.walkStart.position,g.walkStart.target);assert.deepEqual(validate(p,CATALOGS),p);
});
test('all sixteen door wall/hinge/swing combinations produce matching hinge and perpendicular directions',()=>{
 for(const wall of WALL_IDS)for(const hinge of ['start','end'])for(const swing of ['inward','outward']){
  const p=withOpenings(rectangle(),[door(wall,hinge,swing)]),d=p.geometry.doors[0],horizontal=['top','bottom'].includes(wall),sign=hinge==='start'?1:-1;
  const at=hinge==='start'?500:1400;
  assert.deepEqual(d.h,horizontal?[at,wall==='top'?0:3000]:[wall==='left'?0:4000,at]);
  assert.deepEqual(d.c,horizontal?[sign,0]:[0,sign]);
  const normal={top:[0,1],right:[-1,0],bottom:[0,-1],left:[1,0]}[wall];
  assert.deepEqual(d.o,normal.map(x=>(x*(swing==='inward'?1:-1))||0));
  assert.equal(d.len,900);assert.equal(d.wallId,wall);assert.equal(p.geometry.walls.length,5);assert.equal(p.geometry.lintels.length,0);
  assert.deepEqual(readProject(serializeProject(p)).project,p);
 }
});
test('multiple apertures split stable wall intervals without filling door/window holes',()=>{
 const p=withOpenings(rectangle(),[door(),{...windowOpening(),wallId:'top',offset:1401}]),g=p.geometry;
 assert.deepEqual(g.walls.filter((_,i)=>g.wallIds[i]==='top'),[[-120,-120,500,0,'n'],[1400,-120,1401,0,'n'],[2601,-120,4120,0,'n']]);
 assert.equal(g.windows[0].sill,900);assert.equal(g.windows[0].head,2100);assert.deepEqual(g.lintels,[]);
 const outward=withOpenings(rectangle(),[{...door('left','start','outward'),width:2000}]);assert.ok(outward.geometry.bounds.x<=-2150);
});
test('invalid parameters, unsafe IDs, wrong fields, overlaps, shrink and height changes are rejected atomically',()=>{
 const p=withOpenings(rectangle(),[door(),windowOpening()]),before=JSON.stringify(p);
 const mutations=[e=>e.width=NaN,e=>e.depth=0,e=>e.height=20001,e=>e.wallThickness=100,e=>e.openings[0].id='constructor',e=>e.openings[0].wallId='w0',e=>e.openings[0].hinge='left',e=>e.openings[0].swing='both',e=>e.openings[0].sill=0,e=>e.openings[1].hinge='start',e=>e.openings[1].sill=-1,e=>e.openings[0].offset=0,e=>e.openings[0].width=Infinity,e=>e.width=1000,e=>e.height=2000,e=>e.openings[1].id=e.openings[0].id,e=>{e.openings[1].wallId='top';e.openings[1].offset=1399;},e=>{e.openings[1].wallId='top';e.openings[1].offset=1400.5;}];
 for(const mutate of mutations){const e=structuredClone(p.roomEditor);mutate(e);assert.throws(()=>updateRectangleProject(p,e),{code:'INVALID_PROJECT'});assert.equal(JSON.stringify(p),before);}
 const e={...rectangle().roomEditor,width:100,depth:100,height:100,openings:[{...door(),offset:1,width:98,height:100}]};assert.deepEqual(validateRoomEditor(e),e);
});
test('v2 validates generated snapshots and project-wide opening IDs; decimal tolerance is bounded',()=>{
 const p=withOpenings(rectangle(),[door(),windowOpening()]);
 for(const mutate of [p=>p.geometry.height++,p=>p.geometry.walls.reverse(),p=>p.roomEditor.width++,p=>p.demolished=['w0'],p=>p.geometry.doors[0].wallId='left',p=>p.roomEditor.openings[0].id=p.id]){
  const next=structuredClone(p);mutate(next);assert.throws(()=>validate(next,CATALOGS),{code:'INVALID_PROJECT'});
 }
 const epsilon=structuredClone(p);epsilon.geometry.origin[0]+=0.0000001;assert.doesNotThrow(()=>validate(epsilon,CATALOGS));
 assert.equal(readProject(serializeProject(p)).project.roomEditor.openings[0].id,'door-1');
 const reopened=readProject(serializeProject(p)).project;assert.equal(updateRectangleProject(reopened,{...reopened.roomEditor,width:4500}).geometry.origin[0],2250);
});
test('v1 independent room migration retains IDs, decimals, timestamps, wall references and preferences',()=>{
 const old=JSON.parse(fs.readFileSync(new URL('./fixtures/custom-project.json',import.meta.url)));old.demolished=['w0'];old.furniture[0].height=1234.56;
 const migrated=readProject(JSON.stringify(old)).project;
 assert.deepEqual(migrated,{...old,version:2,roomEditor:null});assert.equal(migrated.geometry.rooms.length,1);
});
test('storage respects strict v2/v1/legacy priority and preserves source keys on migration and failure',()=>{
 const p=rectangle(),v1={...p,version:1};delete v1.roomEditor;const raw=JSON.stringify(v1);
 let a=adapter({[V1_STORE]:raw,[LEGACY_STORE]:'legacy'}),s=createStorage(a,readProject),loaded=s.load();
 assert.equal(loaded.ok,true);assert.equal(loaded.migrated,true);assert.equal(readProject(a.getItem(STORE)).project.version,2);assert.equal(a.getItem(V1_STORE),raw);assert.equal(a.getItem(LEGACY_STORE),'legacy');
 a=adapter({[STORE]:'broken',[V1_STORE]:raw});loaded=createStorage(a,readProject).load();assert.equal(loaded.ok,false);assert.equal(a.getItem(STORE),'broken');
 a=adapter({[V1_STORE]:'broken',[LEGACY_STORE]:'legacy'});loaded=createStorage(a,readProject).load();assert.equal(loaded.ok,false);assert.equal(a.getItem(STORE),null);
 a=adapter({[V1_STORE]:raw});a.setItem=()=>{throw Error('quota')};loaded=createStorage(a,readProject).load();assert.equal(loaded.ok,true);assert.match(loaded.migrationError.message,/quota/);assert.equal(loaded.project.version,2);assert.equal(a.getItem(V1_STORE),raw);
});
test('save rejects mismatched rectangle before writing or recovery backup',()=>{
 const a=adapter({[STORE]:'damaged'}),s=createStorage(a,readProject);s.load();const p=rectangle();p.roomEditor.width=6000;
 assert.equal(s.save(p).ok,false);assert.equal(a.map.size,1);assert.equal(a.getItem(STORE),'damaged');
});
test('room changes and opening transactions preserve furniture, measurements, IDs and complete undo/redo state',()=>{
 const p=rectangle();p.furniture=[{id:'bed-1',type:'bed',name:'Bed',w:1800,d:2000,height:600,cx:2500,cy:2300,rot:33.3,color:'#ffffff'}];p.measures=[{a:{x:0,y:0},b:{x:3048,y:3657.6}}];
 const store=createProjectStore(p),edited=withOpenings(p,[door(),windowOpening()]);
 assert.equal(store.replaceProject(edited),true);const withDoors=structuredClone(store.getProject());
 const larger=updateRectangleProject(withDoors,{...withDoors.roomEditor,width:4500,depth:3200,height:3000});
 assert.equal(store.replaceProject(larger),true);const grown=structuredClone(store.getProject());
 assert.deepEqual(grown.furniture,p.furniture);assert.deepEqual(grown.measures,p.measures);assert.equal(area(grown.geometry.rooms[0].poly),14.4);
 assert.equal(store.undo(),true);assert.deepEqual(store.getProject(),withDoors);assert.equal(store.redo(),true);assert.deepEqual(store.getProject(),grown);
 assert.equal(store.replaceProject(structuredClone(grown)),false);store.begin();store.preview(p=>{p.roomEditor.width=100;});store.cancel();assert.deepEqual(store.getProject(),grown);
 assert.equal(store.undo(),true);assert.equal(store.undo(),true);assert.deepEqual(store.getProject(),p);assert.equal(store.undo(),false);
});
test('checked-in v2 rectangle fixture round-trips and remains structurally editable',()=>{
 const raw=fs.readFileSync(new URL('./fixtures/rectangle-project-v2.json',import.meta.url),'utf8');
 const p=readProject(raw).project;assert.equal(p.roomEditor.kind,'rectangle');assert.deepEqual(readProject(serializeProject(p)).project,p);
 const edited=updateRectangleProject(p,{...p.roomEditor,width:4500});assert.equal(edited.geometry.rooms[0].poly[1][0],4500);assert.equal(edited.roomEditor.openings[1].id,'opening-window-1');
});
test('decimal millimetre arithmetic accepts a mathematically exact 1 mm gap without rounding input',()=>{
 const p=withOpenings(rectangle(),[{...door(),offset:500.1},{...windowOpening(),wallId:'top',offset:1401.1}]);
 assert.equal(p.roomEditor.openings[0].offset,500.1);assert.equal(p.roomEditor.openings[1].offset,1401.1);assert.doesNotThrow(()=>validate(p,CATALOGS));
});
