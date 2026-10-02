import test from 'node:test';
import assert from 'node:assert/strict';
import {asHouse} from '../src/data/house-editor.js';
import {createRectangleProject,updateRectangleProject,validate} from '../src/data/project-data.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {readProject,serializeProject} from '../src/services/project-files.js';
for(const side of ['top','right','bottom','left'])for(const mode of ['sliding','bifold','passage'])test(`${mode} on ${side}: flush wall ends, shared aperture and persistence`,()=>{
 const p=createRectangleProject({width:3000,depth:3000}),e=asHouse(p.roomEditor),horizontal=['top','bottom'].includes(side),negative=['top','left'].includes(side);
 e.rooms.push({id:'neighbor',x:horizontal?0:(negative?-3120:3120),y:horizontal?(negative?-3120:3120):0,width:3000,depth:3000});
 e.openings.push({id:'aperture',roomId:'room-1',wallId:'room-1--'+side,type:'door',mode,offset:0,width:3000,height:2032,...(mode==='bifold'?{swing:'inward'}:{})});
 const n=updateRectangleProject(p,e,{...p.rooms,neighbor:{name:'Neighbor',mat:'wood'}}),g=n.geometry,o=mode==='passage'?g.lintels[0]:g.slides[0];
 assert.equal(g.doors.length,0);assert.equal(o.wallId,'room-1--'+side);
 assert.ok(!g.walls.some(w=>Math.min(w[2],o.rect[2])-Math.max(w[0],o.rect[0])>1e-6&&Math.min(w[3],o.rect[3])-Math.max(w[1],o.rect[1])>1e-6),'neighbor blocks aperture');
 assert.deepEqual(readProject(serializeProject(n)).project,validate(n,CATALOGS));
 const bad=structuredClone(e);bad.openings[0].hinge='start';assert.throws(()=>updateRectangleProject(p,bad),/hinge only/);
 bad.openings[0].hinge=undefined;delete bad.openings[0].hinge;bad.openings[0].offset=1;assert.throws(()=>updateRectangleProject(p,bad),/outside parent/);
});
test('partial wall elsewhere does not demand a gap at an open join; occupied interval still does',()=>{
 const p=createRectangleProject({width:4000,depth:3000}),e=asHouse(p.roomEditor);e.rooms[0].wallSegments={bottom:[{offset:2000,length:2000,height:2800}]};
 e.rooms.push({id:'open',x:0,y:3000,width:2000,depth:2000,wallWidths:{top:0}});
 const rooms={...p.rooms,open:{name:'Open join',mat:'wood'}};updateRectangleProject(p,e,rooms);
 e.rooms[1].width=2001;assert.throws(()=>updateRectangleProject(p,e,rooms),/120 mm/);
});
test('explicit opposite swing leaves may share one opening; accidental duplicates and wrong pairing are rejected',()=>{
 const p=createRectangleProject({width:3000,depth:3000}),e=asHouse(p.roomEditor);e.rooms.push({id:'bed',x:3120,y:0,width:3000,depth:3000});
 const rooms={...p.rooms,bed:{name:'Bed',mat:'wood'}};
 e.openings=[{id:'a',roomId:'room-1',wallId:'room-1--right',type:'door',offset:1000,width:800,height:2032,hinge:'start',swing:'inward'},{id:'b',roomId:'bed',wallId:'bed--left',type:'door',offset:1000,width:900,height:2032,hinge:'start',swing:'inward'}];
 assert.throws(()=>updateRectangleProject(p,e,rooms),/overlap/);e.openings[1].pairedWith='a';const n=updateRectangleProject(p,e,rooms);assert.equal(n.geometry.doors.length,2);assert.deepEqual(readProject(serializeProject(n)).project,validate(n,CATALOGS));
 e.openings[1].pairedWith='missing';assert.throws(()=>updateRectangleProject(p,e,rooms),/opposite room/);e.openings[1].pairedWith='a';e.openings[1].swing='outward';assert.throws(()=>updateRectangleProject(p,e,rooms),/face opposite/);
});
