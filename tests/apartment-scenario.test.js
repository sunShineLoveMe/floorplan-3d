import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture,fixtureProject} from './helpers/house-fixture.js';
import {auditApartmentScenario} from './helpers/audit-apartment-scenario.js';
import {updateRectangleProject,validate,read} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
const spec=fixture('cmu-two-bedroom-scenario');
test('CMU composition scenario preserves labelled sizes, separates unknown dimensions and connects all eight spaces',()=>{
 assert.match(spec.scope,/not a measured reconstruction/);assert.equal(Object.keys(spec.labelledDimensions).length,4);assert.ok(spec.unknownSourceDimensions.length>=7);
 assert.equal(createHash('sha256').update(fs.readFileSync(spec.source)).digest('hex'),spec.sourceSha256);
 const p=fixtureProject(spec),result=auditApartmentScenario(p,spec);assert.equal(result.sourceWholeApartmentAccepted,false);assert.equal(result.connectedSpaces,8);assert.equal(result.furniture,14);
 assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
});
test('composite kitchen notch/closet and shared openings survive room and column edits atomically',()=>{
 const p=fixtureProject(spec),e=structuredClone(p.roomEditor);e.rooms.find(r=>r.id==='closet').width=3;
 assert.throws(()=>updateRectangleProject(p,e));assert.doesNotThrow(()=>validate(p,CATALOGS));
 const exact=structuredClone(p.roomEditor);exact.rooms.find(r=>r.id==='living').obstacles[0].height=1219.2;const changed=validate(updateRectangleProject(p,exact),CATALOGS);assert.equal(changed.geometry.obstacles.find(o=>o.id==='living-column-top').height,1219.2);assert.equal(changed.geometry.rooms.length,8);
});
