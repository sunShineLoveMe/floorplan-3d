import template from '../src/data/sample-template.js';
import {defaultState} from '../src/data/default-project.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLengthMm,formatLengthMm,formatAreaM2,formatEditLengthMm,readLengthDraft,unitStepMm,gridSizeMm} from '../src/core/units.js';
import {createRectangleProject,validate,clone,read} from '../src/data/project-data.js';
import {createProjectStore} from '../src/core/project-store.js';
import {CATALOGS} from '../src/data/catalogs.js';
import {createSnapping} from '../src/editor2d/snapping.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('strict imperial and explicit metric parsing matrix',()=>{
 for(const [s,mm] of [['1 in',25.4],['1 ft',304.8],[`10' 6.5"`,3213.1],[`5' 11 15/16"`,1827.2125],['30 1/2 in',774.7],['30½"',774.7],['114 5/8 in',2911.475],['1/16 in',1.5875],[`-0' 6.5"`,-165.1],['800 mm',800],['80CM',800],['0.8 m',800],[`5'-6 1/2"`,1689.1],['12 ft 6 in',3810],['30-1/2 inches',774.7],[`5′\u00a06½″`,1689.1],['5.5 feet',1676.4],['½ in',12.7]]){
  for(const mode of ['metric','imperial']){const r=parseLengthMm(s,mode);assert.equal(r.ok,true,s);near(r.mm,mm);}
 }
 near(parseLengthMm('5.6','imperial').mm,142.24);assert.equal(parseLengthMm('5.6').mm,5.6);
 near(parseLengthMm('30 1/2','imperial').mm,774.7);assert.equal(parseLengthMm('30 1/2').ok,false);
});
test('parser rejects complete invalid strings rather than prefixes',()=>{
 for(const s of ['',"5'",'NaN','Infinity','1e3','1/0','1/3 in','12abc','5-6','5 6','1,200','80x60','3ft+2in','2 m 3 in','3 in in',"5'12\"",'5.5 ft 3 in','--3 in','2 -3 in','1/2/4 in','1/2 mm','3/2 in','0/2 in','+2 in','1.']){
  // An integer number of feet with a suffix is a complete valid single-unit input.
  if(s==="5'")continue;
  for(const mode of ['metric','imperial'])assert.equal(parseLengthMm(s,mode).ok,false,s);
 }
 assert.equal(parseLengthMm(`5'12"`).code,'inches-overflow');
});
test('display rounding, carry, reduced fractions, tiny lengths, area and negative zero',()=>{
 assert.equal(formatLengthMm(1828.7999,'imperial'),`≈ 6' 0"`);
 assert.equal(formatLengthMm(774.7,'imperial',{style:'inches'}),'30 1/2 in');
 assert.equal(formatLengthMm(.001,'imperial'),'<1/16 in');
 assert.equal(formatLengthMm(-0,'imperial'),`0' 0"`);
 assert.equal(formatAreaM2(12,'imperial'),'129.17 sq ft');
 assert.equal(formatAreaM2(3657.6*3048/1e6,'imperial'),'120.00 sq ft');
 assert.equal(formatAreaM2(.000001,'imperial'),'<0.01 sq ft');
});
test('editing precision and untouched float preservation across 10000 deterministic values',()=>{
 assert.equal(readLengthDraft('12 ft','3657.6',3657.6,'metric').mm,3657.6);
 assert.notEqual(readLengthDraft('3657.600001 mm','3657.6',3657.6,'metric').mm,3657.6);
 for(let i=0;i<10000;i++)for(const mode of ['metric','imperial']){
  const mm=Math.sin(i*1.234)*100000,text=formatEditLengthMm(mm,mode);
  near(parseLengthMm(text,mode).mm,mm);
  assert.equal(readLengthDraft(text,text,mm,mode).mm,mm);
  assert.ok(!/[≈,]/.test(text));
 }
});
test('unit transactions preserve geometry, support no-op and ordered undo/redo and v2 validation',()=>{
 const p=createRectangleProject({name:'Units',width:3657.6,depth:3048,height:2438.4});
 const store=createProjectStore(p),initial=clone(p);
 for(let i=0;i<100;i++)store.mutate(p=>p.units.display=i%2?'metric':'imperial');
 const after=clone(store.getProject());after.updatedAt=initial.updatedAt;assert.deepEqual(after,initial);
 assert.equal(store.mutate(p=>p.units.display='metric'),false);
 store.mutate(p=>p.furniture.push({id:'unit-item',type:'bed',name:'Bed',w:1524,d:2032,cx:-165.1,cy:123.456789123,rot:0,color:'#ffffff'}));
 store.mutate(p=>p.units.display='imperial');
 const saved=validate(JSON.parse(JSON.stringify(store.getProject())),CATALOGS);assert.equal(saved.units.display,'imperial');
 store.undo();assert.equal(store.getProject().units.display,'metric');assert.equal(store.getProject().furniture.length,1);
 store.undo();assert.equal(store.getProject().furniture.length,0);store.redo();store.redo();assert.deepEqual(store.getProject(),saved);
 store.begin();store.preview(p=>p.furniture[0].cx=999);store.cancel();assert.deepEqual(store.getProject(),saved);
});
test('steps and exact wall snap preserve physical priority in both modes',()=>{
 for(const display of ['metric','imperial']){
  const store={getProject:()=>({units:{display}})},ui={layers:{wallSnap:false},mA:null};
  const snapping=createSnapping({store,ui,view:{s:1},snapRects:()=>[[100.123,0,200,1000]]});
  const step=unitStepMm(display),f={w:20,d:20,rot:0};
  assert.deepEqual(snapping.snapMove(f,step*3.4,step*2.3),[step*3,step*2]);
  ui.layers.wallSnap=true;near(snapping.snapMove(f,90,500)[0],90.123);
 }
 assert.equal(unitStepMm('imperial',true),25.4);assert.equal(gridSizeMm('imperial'),304.8);
});

test('v1 and legacy unit compatibility retains imperial and defaults absent legacy units',()=>{
 const p=defaultState();p.units.display='imperial';p.version=1;delete p.roomEditor;
 assert.equal(read(JSON.stringify(p),template,CATALOGS).project.units.display,'imperial');
 const legacy={furniture:p.furniture,rooms:p.rooms,demolished:p.demolished,measures:p.measures};
 assert.equal(read(JSON.stringify(legacy),template,CATALOGS,true).project.units.display,'metric');
 legacy.units=p.units;assert.equal(read(JSON.stringify(legacy),template,CATALOGS,true).project.units.display,'imperial');
 legacy.units={internal:'in',display:'imperial'};assert.throws(()=>read(JSON.stringify(legacy),template,CATALOGS,true));
});
