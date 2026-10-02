import test from 'node:test';import assert from 'node:assert/strict';
import {asHouse,roomFloorPoly} from '../src/data/house-editor.js';import {createRectangleProject,updateRectangleProject,validate} from '../src/data/project-data.js';import {CATALOGS} from '../src/data/catalogs.js';import {area} from '../src/core/geometry.js';import {readProject,serializeProject} from '../src/services/project-files.js';
for(const corner of ['top-left','top-right','bottom-left','bottom-right'])test(`${corner} notch removes only closet footprint and round trips`,()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor);e.rooms[0].notch={corner,width:1500,depth:1000};
 const n=updateRectangleProject(p,e);assert.equal(n.geometry.rooms[0].poly.length,6);assert.equal(area(n.geometry.rooms[0].poly),10.5);assert.equal(n.geometry.floorSlabs.reduce((s,r)=>s+(r[2]-r[0])*(r[3]-r[1]),0),4240*3240);
 assert.deepEqual(readProject(serializeProject(n)).project,validate(n,CATALOGS));
 for(const notch of [{corner,width:4000,depth:1000},{corner:'wrong',width:100,depth:100},{corner,width:-1,depth:1},null]){const bad=structuredClone(e);bad.rooms[0].notch=notch;assert.throws(()=>updateRectangleProject(p,bad),/corner notch/);}
});
test('closet in bedroom notch can share walls without overlapping usable floors',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),room=e.rooms[0];room.notch={corner:'bottom-right',width:1620,depth:1120};room.wallSegments={right:[{offset:0,length:1880,height:2800}],bottom:[{offset:0,length:2380,height:2800}]};
 e.rooms.push({id:'closet',x:2500,y:2000,width:1500,depth:1000});const rooms={...p.rooms,closet:{name:'Closet',mat:'wood'}};const n=updateRectangleProject(p,e,rooms);assert.equal(area(n.geometry.rooms[0].poly),10.1856);
 const bad=structuredClone(e);bad.rooms[1].x=2379;assert.throws(()=>updateRectangleProject(p,bad,rooms),/overlap/);
 bad.rooms[1].wallWidths={left:300};bad.rooms[1].x=2500;assert.throws(()=>updateRectangleProject(p,bad,rooms),/intrudes/);
 assert.equal(roomFloorPoly(e.rooms[0]).length,6);
});
