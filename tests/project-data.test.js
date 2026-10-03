import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Data from '../src/data/project-data.js';
import template from '../src/data/sample-template.js';
import {defaultState} from '../src/data/default-project.js';
import {CATALOGS as catalogs} from '../src/data/catalogs.js';
const project=defaultState();
const read=p=>Data.read(JSON.stringify(p),template,catalogs).project;
test('complete sample round trip retains all geometry, settings and furniture',()=>{
 assert.deepEqual(read(project),project);
 assert.equal(project.geometry.rooms.length,13);
 assert.equal(project.furniture.length,46);
});
test('edited geometry, decimal units and furniture are independent of template',()=>{
 const p=structuredClone(project);
 p.geometry.rooms[0].poly[0][0]+=25.4;
 p.geometry.doors[0].h[0]+=12.7;
 p.geometry.windows[0].sill=1300.5;
 p.furniture[0].height=1234.5; p.furniture[0].rot=33.3;
 p.units.display='imperial'; p.view.mode='3d';
 assert.deepEqual(read(p),p);
 assert.notDeepEqual(p.geometry,template);
 assert.deepEqual(read(project).geometry,template);
});
test('legacy import requires explicit template confirmation',()=>{
 const old={furniture:project.furniture,rooms:project.rooms,demolished:[],measures:[]};
 const raw=JSON.stringify(old);
 assert.throws(()=>Data.read(raw,template,catalogs),{code:'LEGACY_CONFIRM_REQUIRED'});
 const result=Data.read(raw,template,catalogs,true);
 assert.equal(result.legacy,true); assert.deepEqual(result.project.geometry,template);
 assert.equal(JSON.stringify(old),raw);
});
test('legacy foreign rooms cannot silently acquire the sample geometry',()=>{
 const old={furniture:[],rooms:{foreign:{name:'Other',mat:'wood'}},demolished:[],measures:[]};
 assert.throws(()=>Data.read(JSON.stringify(old),template,catalogs,true),{code:'INVALID_PROJECT'});
});
test('bad JSON, future versions and unknown formats are distinguished',()=>{
 assert.throws(()=>Data.read('{',template,catalogs),{code:'INVALID_JSON'});
 assert.throws(()=>read({...project,version:999}),{code:'UNSUPPORTED_VERSION'});
 assert.throws(()=>read({...project,format:'other'}),{code:'UNKNOWN_FORMAT'});
});
test('reject broken references, invalid dimensions and unsafe render attributes',()=>{
 const mutations=[
 p=>p.geometry.rooms[0].id='bad" onload="alert(1)',
 p=>p.geometry.rooms[0].poly=[[0,0],[0,0],[0,0]],
 p=>p.geometry.walls[0][2]=p.geometry.walls[0][0],
 p=>p.geometry.doors[0].c=[0,0],
 p=>p.rooms.master.mat='unknown',
 p=>p.furniture[0].color='red" onload="alert(1)',
 p=>p.furniture[0].w=0,
 p=>p.furniture[0].cx=null,
 p=>p.furniture[1].id=p.furniture[0].id,
 p=>p.demolished=['w999'],
 p=>p.measures=[{a:{x:0,y:0},b:{x:1,y:null}}],
 ];
 for(const mutate of mutations){const p=structuredClone(project); mutate(p);assert.throws(()=>read(p),{code:'INVALID_PROJECT'});}
 assert.deepEqual(read(project),project);
});
test('standalone custom project fixture validates and does not depend on sample rooms',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('./fixtures/custom-project.json',import.meta.url)));
 assert.deepEqual(read(p),{...p,version:2,roomEditor:null});
 assert.equal(p.geometry.rooms.length,1);
 assert.equal(p.geometry.doors[0].len,812.8);
});
test('legacy edits to removable external/low walls remain importable',()=>{
 const old={furniture:project.furniture,rooms:project.rooms,demolished:['w2'],measures:[]};
 assert.deepEqual(Data.read(JSON.stringify(old),template,catalogs,true).project.demolished,['w2']);
});
test('optional furniture height retains absence and exact thin/tall values across v2, v1 and legacy',()=>{
 const p=structuredClone(project);delete p.furniture[0].height;p.furniture[1].height=.125678912345;p.furniture[2].height=9999999.98765;
 for(const input of [p,{...p,version:1},{furniture:p.furniture,rooms:p.rooms,demolished:p.demolished,measures:p.measures}]){
  const restored=Data.read(JSON.stringify(input),template,catalogs,true).project;
  assert.equal(Object.hasOwn(restored.furniture[0],'height'),false);assert.equal(restored.furniture[1].height,p.furniture[1].height);assert.equal(restored.furniture[2].height,p.furniture[2].height);
 }
});
test('optional furniture height rejects null, zero, negatives, nonfinite and out of existing range',()=>{
 for(const height of [null,0,-.01,NaN,Infinity,1e7+.1,'800']){
  const p=structuredClone(project);p.furniture[0].height=height;assert.throws(()=>Data.validate(p,catalogs),{code:'INVALID_PROJECT'});
 }
});
