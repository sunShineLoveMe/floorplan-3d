import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrateReference,validateReference} from '../src/data/reference-plan.js';
import {createRectangleProject,validate} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {serializeProject,readProject} from '../src/services/project-files.js';
test('reference calibration anchors the first point and round-trips exact scale',()=>{
 const image={name:'Drawing',pixelWidth:1000,pixelHeight:800,src:'data:image/png;base64,AAAA'},ref=calibrateReference(image,{x:100,y:200},{x:500,y:200},3048);
 assert.equal(ref.mmPerPixel,7.62);assert.equal(ref.x,-762);assert.equal(ref.y,-1524);assert.equal(400*ref.mmPerPixel,3048);
 const p=createRectangleProject();p.referencePlan=ref;assert.deepEqual(readProject(serializeProject(p)).project.referencePlan,ref);
 for(const change of [{src:'https://example.com/a.png'},{src:'data:image/svg+xml;base64,AAAA'},{mmPerPixel:Infinity},{opacity:2},{x:NaN},{pixelWidth:3001}])assert.throws(()=>validateReference({...ref,...change}),{code:'INVALID_PROJECT'});
 assert.throws(()=>calibrateReference(image,{x:1,y:1},{x:1,y:1},3048));assert.throws(()=>calibrateReference(image,{x:1,y:1},{x:10,y:1},-5));assert.doesNotThrow(()=>validate(p,CATALOGS));
});
