import test from 'node:test';
import assert from 'node:assert/strict';
import {doorIntersectsFurniture} from '../src/core/door-clearance.js';
import {generateRoomGeometry} from '../src/data/room-editor.js';
test('audit Bottom door conflicts, displacement and all hinge/swing axes including rotations',()=>{
 const editor={kind:'rectangle',roomId:'r',width:12192,depth:9144,height:2743.2,wallThickness:120,openings:[{id:'d',type:'door',wallId:'bottom',offset:914.4,width:914.4,height:2032,hinge:'start',swing:'inward'}]},door=generateRoomGeometry(editor,{r:{name:'Room',mat:'wood'}}).doors[0];
 const sofa={type:'sofa',w:2286,d:914.4,cx:1371.6,cy:8686.8,rot:0};assert.ok(doorIntersectsFurniture(door,sofa));assert.ok(doorIntersectsFurniture(door,{...sofa,rot:90}));assert.ok(!doorIntersectsFurniture(door,{...sofa,cx:5000}));
 for(const wallId of ['top','bottom','left','right'])for(const hinge of ['start','end'])for(const swing of ['inward','outward']){
  const d=generateRoomGeometry({...editor,openings:[{...editor.openings[0],wallId,hinge,swing}]},{r:{name:'Room',mat:'wood'}}).doors[0];
  const f={type:'chair',w:100,d:100,cx:d.h[0]+(d.c[0]+d.o[0])*d.len*.3,cy:d.h[1]+(d.c[1]+d.o[1])*d.len*.3,rot:45};assert.ok(doorIntersectsFurniture(d,f));assert.ok(!doorIntersectsFurniture(d,{...f,cx:d.h[0]+(d.c[0]+d.o[0])*d.len*.9,cy:d.h[1]+(d.c[1]+d.o[1])*d.len*.9}),'outside quarter circle');
 }
});
