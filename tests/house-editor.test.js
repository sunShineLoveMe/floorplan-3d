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

test('partial walls keep only their specified intervals, allow internal openings, and round trip',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor);
 e.rooms[0].wallSegments={top:[{offset:0,length:1500,height:2800},{offset:2500,length:1500,height:2800}],left:[]};
 e.openings.push({id:'door',roomId:'room-1',wallId:'room-1--top',type:'door',offset:300,width:900,height:2100,hinge:'start',swing:'inward'});
 const next=updateRectangleProject(p,e);
 assert.ok(!next.geometry.walls.some((w,i)=>next.geometry.wallIds[i]==='room-1--top'&&w[0]<2500&&w[2]>1500),'passage filled');
 assert.ok(!next.geometry.wallIds.includes('room-1--left'));
 assert.ok(next.geometry.walls.some(w=>w[0]===-120&&w[1]===-120),'corner return missing');
 assert.deepEqual(readProject(serializeProject(next)).project,validate(next,CATALOGS));
 const bad=structuredClone(e);bad.openings[0].offset=1300;
 assert.throws(()=>updateRectangleProject(p,bad),/continuous full-height/);
 for(const segments of [[{offset:-1,length:100,height:2800}],[{offset:3900,length:101,height:2800}],[{offset:0,length:1000,height:2800},{offset:999,length:1000,height:2800}],[{offset:0,length:0,height:2800}],null]){
  const invalid=structuredClone(e);invalid.rooms[0].wallSegments.top=segments;assert.throws(()=>updateRectangleProject(p,invalid),{code:'INVALID_PROJECT'});
 }
 assert.equal(p.roomEditor.kind,'rectangle');
});

test('a shared partial partition needs both sides open and keeps one disjoint wall union',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),rooms={...p.rooms,bed:{name:'Bed',mat:'wood'}},segments=[{offset:0,length:1000,height:2800},{offset:2000,length:1000,height:2800}];
 e.rooms[0].wallSegments={right:segments};e.rooms.push({id:'bed',x:4120,y:0,width:3000,depth:3000});
 const oneSide=updateRectangleProject(p,e,rooms);assert.ok(oneSide.geometry.walls.some(w=>w[0]===4000&&w[2]===4120&&w[1]<2000&&w[3]>1000));
 e.rooms[1].wallSegments={left:structuredClone(segments)};
 const both=updateRectangleProject(p,e,rooms);assert.ok(!both.geometry.walls.some(w=>w[0]<4120&&w[2]>4000&&w[1]<2000&&w[3]>1000));
 assert.deepEqual(both.geometry.passages,[{rect:[4000,1000,4120,2000],roomId:'room-1'}]);
 for(let i=0;i<both.geometry.walls.length;i++)for(let j=i+1;j<both.geometry.walls.length;j++){const a=both.geometry.walls[i],b=both.geometry.walls[j];assert.ok(Math.min(a[2],b[2])<=Math.max(a[0],b[0])+1e-6||Math.min(a[3],b[3])<=Math.max(a[1],b[1])+1e-6);}
});

test('pony wall heights and taller shared overlaps are independent of room order',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor),rooms={...p.rooms,bed:{name:'Bed',mat:'wood'}};
 e.rooms[0].wallSegments={right:[{offset:0,length:1500,height:1219.2},{offset:1500,length:1500,height:915}]};
 e.rooms.push({id:'bed',x:4120,y:0,width:3000,depth:3000,wallSegments:{left:[{offset:0,length:3000,height:1500}]}});
 for(const editor of [e,{...e,rooms:[...e.rooms].reverse()}]){
  const next=updateRectangleProject(p,editor,rooms);
  const shared=next.geometry.walls.flatMap((w,i)=>w[0]===4000&&w[2]===4120&&w[1]>=0&&w[3]<=3000?[next.geometry.wallHeights[i]]:[]);
  assert.ok(shared.length>0);assert.ok(shared.every(h=>h===1500));
  assert.deepEqual(readProject(serializeProject(next)).project,validate(next,CATALOGS));
 }
 e.rooms[1].wallSegments.left=[{offset:0,length:3000,height:1219.2}];
 const low=updateRectangleProject(p,e,rooms);assert.ok(low.geometry.wallHeights.includes(1219.2));assert.ok(low.geometry.walls.some(w=>w[4]==='low'));
 for(const height of [0,99,2801,Infinity]){const bad=structuredClone(e);bad.rooms[0].wallSegments.right[0].height=height;assert.throws(()=>updateRectangleProject(p,bad),{code:'INVALID_PROJECT'});}
 const corrupt=structuredClone(low);corrupt.geometry.wallHeights[0]=2801;assert.throws(()=>validate(corrupt,CATALOGS),/wall heights/);
 e.openings.push({id:'no-low-door',roomId:'room-1',wallId:'room-1--right',type:'door',offset:300,width:900,height:1000,hinge:'start',swing:'inward'});
 assert.throws(()=>updateRectangleProject(p,e,rooms),/continuous full-height/);
});
