import test from 'node:test';
import assert from 'node:assert/strict';
import {asHouse} from '../src/data/house-editor.js';
import {createRectangleProject,updateRectangleProject,validate} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {readProject,serializeProject} from '../src/services/project-files.js';
test('three adjacent rooms share walls, cut both sides of an opening, and round trip',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),rooms={...p.rooms,bedroom:{name:'Bedroom',mat:'wood'},bath:{name:'Bath',mat:'tile600'}};
 e.rooms.push({id:'bedroom',x:4120,y:0,width:3000,depth:3000},{id:'bath',x:0,y:3120,width:2000,depth:2000});
 e.openings.push({id:'shared-door',roomId:'room-1',wallId:'room-1--right',type:'door',offset:500,width:900,height:2100,hinge:'start',swing:'inward'});
 const next=updateRectangleProject(p,e,rooms);assert.equal(next.geometry.rooms.length,3);
 for(let i=0;i<next.geometry.walls.length;i++)for(let j=i+1;j<next.geometry.walls.length;j++){const a=next.geometry.walls[i],b=next.geometry.walls[j];assert.ok(Math.min(a[2],b[2])<=Math.max(a[0],b[0])+1e-6||Math.min(a[3],b[3])<=Math.max(a[1],b[1])+1e-6,'duplicate shared wall');}
 assert.ok(!next.geometry.walls.some(w=>w[0]<4120&&w[2]>4000&&w[1]<1400&&w[3]>500),'door blocked by neighboring wall');
 assert.deepEqual(readProject(serializeProject(next)).project,validate(next,CATALOGS));
 const bad=structuredClone(e);bad.rooms[1].x=1000;assert.throws(()=>updateRectangleProject(p,bad,rooms),/overlap/);
 bad.rooms[1].x=4050;assert.throws(()=>updateRectangleProject(p,bad,rooms),/120 mm/);
});

test('open adjacent zones form an L without phantom partitions and preserve asymmetric exterior walls',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor);
 e.rooms[0].wallWidths={top:165.1,right:0,bottom:0,left:165.1};
 e.rooms.push({id:'hall',x:4000,y:0,width:3000,depth:3000,wallWidths:{top:165.1,left:0,right:165.1,bottom:165.1}}, {id:'living',x:0,y:3000,width:4000,depth:4000,wallWidths:{top:0,left:165.1,right:165.1,bottom:165.1}});
 const rooms={...p.rooms,hall:{name:'Hall',mat:'wood'},living:{name:'Living',mat:'wood'}};
 const next=updateRectangleProject(p,e,rooms);
 assert.ok(!next.geometry.walls.some(w=>w[0]<4001&&w[2]>3999&&w[1]<2999&&w[3]>1),'hall connection blocked');
 assert.ok(!next.geometry.walls.some(w=>w[0]<3999&&w[2]>1&&w[1]<3001&&w[3]>2999),'living connection blocked');
 assert.ok(next.geometry.walls.some(w=>w[0]===-165.1),'exterior wall thickness lost');
 assert.equal(next.geometry.dimensions[0].at,-465.1);assert.equal(next.geometry.dimensions[1].at,-465.1);
 assert.deepEqual(readProject(serializeProject(next)).project,validate(next,CATALOGS));
 const bad=structuredClone(e);bad.rooms[1].wallWidths.left=114.3;
 assert.throws(()=>updateRectangleProject(p,bad,rooms),/114.3 mm/);
 e.openings.push({id:'no-wall-door',roomId:'room-1',wallId:'room-1--right',type:'door',offset:500,width:900,height:2100,hinge:'start',swing:'inward'});
 assert.throws(()=>updateRectangleProject(p,e,rooms),/open boundary/);
});

test('4.5 inch shared wall cuts both sides, invalid side widths are rejected atomically',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),rooms={...p.rooms,bed:{name:'Bedroom',mat:'wood'}};
 e.rooms[0].wallWidths={right:114.3};e.rooms.push({id:'bed',x:4114.3,y:0,width:3000,depth:3000,wallWidths:{left:114.3}});
 e.openings.push({id:'door',roomId:'room-1',wallId:'room-1--right',type:'door',offset:500,width:900,height:2100,hinge:'start',swing:'inward'});
 const next=updateRectangleProject(p,e,rooms);
 assert.equal(next.geometry.doors[0].rect[2],4114.3);
 assert.ok(!next.geometry.walls.some(w=>w[0]<4114.3&&w[2]>4000&&w[1]<1400&&w[3]>500));
 for(const widths of [{wrong:10},{top:-1},{top:1001},{top:NaN},[]]){const bad=structuredClone(e);bad.rooms[0].wallWidths=widths;assert.throws(()=>updateRectangleProject(p,bad,rooms),{code:'INVALID_PROJECT'});}
 assert.equal(p.roomEditor.kind,'rectangle');
});

test('a shared wall opening cuts the entire thicker neighbor side',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),rooms={...p.rooms,bed:{name:'Bedroom',mat:'wood'}};
 e.rooms[0].wallWidths={right:114.3};e.rooms.push({id:'bed',x:4165.1,y:0,width:3000,depth:3000,wallWidths:{left:165.1}});
 e.openings.push({id:'door',roomId:'room-1',wallId:'room-1--right',type:'door',offset:500,width:900,height:2100,hinge:'start',swing:'inward'});
 const next=updateRectangleProject(p,e,rooms);assert.equal(next.geometry.doors[0].rect[2],4165.1);
 assert.ok(!next.geometry.walls.some(w=>w[0]<4165.1&&w[2]>4000&&w[1]<1400&&w[3]>500),'thicker wall seals opening');
 assert.deepEqual(readProject(serializeProject(next)).project,validate(next,CATALOGS));
});
