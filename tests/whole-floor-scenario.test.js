import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {fixture,fixtureProject,FT} from './helpers/house-fixture.js';import {auditFloorScenario} from './helpers/audit-apartment-scenario.js';import {read,updateRectangleProject} from '../src/data/project-data.js';import {CATALOGS} from '../src/data/catalogs.js';
const spec=fixture('jacobsen-whole-floor-scenario');
test('same whole-floor audit handles twelve-space single-wide and eight-space apartment with explicit source uncertainty',()=>{
 assert.match(spec.scope,/not a measured reconstruction/);assert.equal(Object.keys(spec.labelledDimensions).length,4);assert.ok(spec.unknownSourceDimensions.length>=7);assert.equal(spec.nominalSourceDimensions.approximate,true);
 assert.equal(createHash('sha256').update(fs.readFileSync(spec.source)).digest('hex'),spec.sourceSha256);
 for(const id of ['jacobsen-whole-floor-scenario','cmu-two-bedroom-scenario']){const s=fixture(id),p=fixtureProject(s),r=auditFloorScenario(p,s);assert.equal(r.connectedSpaces,s.rooms.length);assert.equal(r.furniture,s.furniture.length);assert.equal(r.sourceWholePlanAccepted,false);assert.equal(r.potentialFloorConflicts,0);assert.equal(r.potentialDoorConflicts,0);assert.equal(r.potentialFixedConflicts,0);}
});
test('single-wide diagonal cuts, mixed openings and declared sink nesting roundtrip without dropping shape or mode',()=>{
 const p=fixtureProject(spec);assert.equal(p.roomEditor.rooms.filter(r=>r.notch?.shape==='diagonal').length,2);assert.equal(p.geometry.slides.filter(o=>o.style==='bifold').length,2);assert.equal(p.geometry.slides.filter(o=>o.style==='sliding').length,1);assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
 const r=auditFloorScenario(p,spec);assert.ok(r.scenarioFootprintSqFt<spec.nominalSourceDimensions.widthFt*spec.nominalSourceDimensions.depthFt);assert.equal(r.diagonalWallCount,1);
});
test('shared whole-floor audit catches unlisted fixture overlap and native geometry rejects a closet expansion atomically',()=>{
 const p=fixtureProject(spec),e=structuredClone(p.roomEditor);e.rooms.find(r=>r.id===spec.invalidRoomEdit.room).width=spec.invalidRoomEdit.width*FT;assert.throws(()=>updateRectangleProject(p,e),/overlap|intrudes/);
 const overlapped=structuredClone(p),f=overlapped.furniture.find(f=>f.name==='Dining table'),desk=overlapped.furniture.find(f=>f.name==='Master desk');Object.assign(desk,{cx:f.cx,cy:f.cy});assert.throws(()=>auditFloorScenario(overlapped,spec));
 const unnested=structuredClone(spec);unnested.allowedOverlaps=[];assert.throws(()=>auditFloorScenario(p,unnested),/overlaps/);
});
