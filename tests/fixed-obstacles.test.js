import test from 'node:test';
import assert from 'node:assert/strict';
import {asHouse,generateHouseGeometry,validateHouseEditor} from '../src/data/house-editor.js';
import {createRectangleProject,updateRectangleProject,validate,read} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {parseLengthMm} from '../src/core/units.js';
import {roomArea,area} from '../src/core/geometry.js';
import {furnitureIntersectsObstacle,obstacleConflicts} from '../src/core/obstacle-clearance.js';
import {placeRoomLabels} from '../src/editor2d/room-labels.js';
import {printDocument} from '../src/services/print-plan.js';
const base=()=>createRectangleProject({width:4000,depth:3000});
const obstacle=(changes={})=>({id:'column',name:'Measured column',x:0,y:0,width:400,depth:300,height:2800,...changes});
const house=()=>{const e=asHouse(base().roomEditor);e.rooms[0].obstacles=[obstacle(),obstacle({id:'intrusion',x:3800,y:2000,width:200,depth:600,height:1000})];return e;};
test('multiple fixed footprints deduct net area and retain exact local dimensions through JSON',()=>{
 const p=validate(updateRectangleProject(base(),house()),CATALOGS),g=p.geometry;
 assert.equal(roomArea(g.rooms[0]),11.76);assert.equal(area(g.rooms[0].poly),12);assert.equal(g.obstacles.length,2);
 assert.deepEqual(g.obstacles[1].rect,[3800,2000,4000,2600]);assert.equal(g.obstacles[1].height,1000);
 assert.deepEqual(read(JSON.stringify(p),null,CATALOGS).project,p);
 const altered=structuredClone(p);altered.geometry.rooms[0].usableAreaM2=12;assert.throws(()=>validate(altered,CATALOGS),/mismatch/);
});
test('source offsets move with the room and combine with a notch without double subtraction',()=>{
 const e=house(),r=e.rooms[0];r.x=-1000;r.y=750;r.notch={corner:'bottom-left',width:800,depth:600};
 const g=generateHouseGeometry(e,base().rooms);assert.deepEqual(g.obstacles[0].rect,[-1000,750,-600,1050]);assert.equal(roomArea(g.rooms[0]),11.28);
 r.obstacles[0].y=2700;assert.throws(()=>validateHouseEditor(e),/outside the notch/);
});
test('invalid sizes, height, overlaps, duplicate IDs and limits reject the whole source draft',()=>{
 for(const change of [{width:undefined},{width:0},{x:-1},{x:3900},{depth:Infinity},{height:99},{height:2801},{name:''},{id:'room-1'}]){
  const e=house();Object.assign(e.rooms[0].obstacles[0],change);assert.throws(()=>validateHouseEditor(e));
 }
 const e=house();e.rooms[0].obstacles.push(obstacle({id:'another',x:399,y:299}));assert.throws(()=>validateHouseEditor(e),/overlap/);
 e.rooms[0].obstacles=[obstacle({width:4000,depth:3000})];assert.throws(()=>validateHouseEditor(e),/leave usable/);
 e.rooms[0].obstacles=Array.from({length:21},(_,i)=>obstacle({id:'c'+i,width:1,depth:1,x:i}));assert.throws(()=>validateHouseEditor(e),/at most 20/);
 const p=updateRectangleProject(base(),house());p.furniture=[{id:'column',type:'desk',name:'Desk',w:500,d:500,cx:1000,cy:1000,rot:0,color:'#ffffff'}];assert.throws(()=>validate(p,CATALOGS),/project-wide IDs/);
});
test('rotated footprint collision uses separating axes, permits contact and detects contained objects',()=>{
 const o={rect:[0,0,100,100]},f={cx:150,cy:50,w:100,d:100,rot:0};
 assert.equal(furnitureIntersectsObstacle(f,o),false);assert.equal(furnitureIntersectsObstacle({...f,cx:149},o),true);
 assert.equal(furnitureIntersectsObstacle({cx:50,cy:50,w:10,d:10,rot:37},o),true);
 assert.equal(furnitureIntersectsObstacle({cx:151,cy:151,w:150,d:10,rot:-45},o),false,'rotated AABB corner is not occupied');
 assert.equal(furnitureIntersectsObstacle({cx:151,cy:151,w:150,d:10,rot:45},o),true);
});
test('fixed columns block swing doors and furniture independently, and disappear when corrected',()=>{
 const e=house();e.openings=[{id:'d',roomId:'room-1',wallId:'room-1--top',type:'door',offset:500,width:900,height:2000,hinge:'start',swing:'inward'}];e.rooms[0].obstacles[0].x=600;
 const p=updateRectangleProject(base(),e);p.furniture=[{id:'f',name:'Chair',type:'chair',cx:800,cy:150,w:100,d:100,rot:45}];
 assert.deepEqual(obstacleConflicts(p).map(c=>c.kind),['furniture','door']);
 p.furniture[0].cx=2000;e.rooms[0].obstacles[0].x=1500;const corrected=updateRectangleProject(p,e);assert.equal(obstacleConflicts(corrected).length,0);
});
test('labels and print use usable area, labels avoid fixed objects even with furniture hidden',()=>{
 const e=house();e.rooms[0].obstacles=[obstacle({x:1800,y:1300,width:400,depth:400})];
 const p=updateRectangleProject(base(),e);p.view.layers.furn=false;
 const labels=placeRoomLabels(p,n=>n,(poly,r)=>String(roomArea(r)));assert.equal(labels[0].area,'11.84');
 const [x0,y0,x1,y1]=labels[0].rect;assert.ok(x1<=1800||x0>=2200||y1<=1300||y0>=1700);
 const html=printDocument(p,'<svg/>',{},'Test');assert.match(html,/11.84/);assert.match(html,/Fixed obstacles: 1/);assert.match(html,/exclude fixed footprints/);
});
test('removing the final obstacle restores the original legacy-compatible geometry fields',()=>{
 const b=base(),e=asHouse(b.roomEditor),original=updateRectangleProject(b,e);e.rooms[0].obstacles=[obstacle()];
 assert.equal(updateRectangleProject(b,e).geometry.obstacles.length,1);delete e.rooms[0].obstacles;
 assert.deepEqual(updateRectangleProject(b,e).geometry,original.geometry);
});

test('imperial boundary sums tolerate floating-point rounding without rejecting flush columns',()=>{
 const mm=text=>parseLengthMm(text,'imperial').mm,b=createRectangleProject({width:mm('19 ft 9 in'),depth:3556,height:2438.4}),e=asHouse(b.roomEditor);
 e.rooms[0].obstacles=[obstacle({x:mm('18 ft 9 in'),width:mm('12 in'),depth:304.8,height:2438.4})];
 assert.ok(e.rooms[0].obstacles[0].x+e.rooms[0].obstacles[0].width>b.roomEditor.width);assert.doesNotThrow(()=>validate(updateRectangleProject(b,e),CATALOGS));
});

test('room label anchor and initial walking position avoid a central structural column',()=>{
 const e=house();e.rooms[0].obstacles=[obstacle({x:1500,y:1000,width:1000,depth:1500})];const g=generateHouseGeometry(e,base().rooms);
 for(const point of [g.rooms[0].at,g.walkStart.position])assert.ok(point[0]<1500||point[0]>2500||point[1]<1000||point[1]>2500);
});

test('adjacent imperial structural footprints permit contact despite rounding',()=>{
 const mm=text=>parseLengthMm(text,'imperial').mm,e=house();e.rooms[0].width=7000;
 e.rooms[0].obstacles=[obstacle({x:mm('18 ft 9 in'),width:mm('12 in')}),obstacle({id:'next',x:mm('19 ft 9 in'),width:100})];
 assert.doesNotThrow(()=>validateHouseEditor(e));
});
