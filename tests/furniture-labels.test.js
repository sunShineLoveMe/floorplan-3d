import test from 'node:test';import assert from 'node:assert/strict';
import {furnitureLabel} from '../src/editor2d/furniture-labels.js';
const bed={type:'bed',w:965.2,d:2032,rot:0,cx:0,cy:0};
test('Twin XL mattress label wraps without discarding its canonical name',()=>{
 const name='Twin XL · mattress footprint',label=furnitureLabel(bed,name);assert.equal(label.name,name);assert.equal(label.lines.join(' '),name);assert.equal(label.lines.length,3);
});
test('long English/Chinese names are bounded and retain the full accessible text',()=>{
 for(const name of ['Very long furniture description '.repeat(30),'很长的自定义家具名称'.repeat(30),'W'.repeat(500)])for(const rot of [0,45,90,135]){
  const label=furnitureLabel({...bed,rot},name);assert.equal(label.name,name);assert.ok(label.lines.length<=3);assert.ok(label.lines.at(-1).endsWith('…'));assert.ok(label.lines.every(s=>s.length>0));
 }
});
test('small objects and intentionally unlabelled types keep their existing visibility policy',()=>{
 assert.equal(furnitureLabel({...bed,w:300},'Small'),null);assert.equal(furnitureLabel({...bed,type:'plant'},'Plant'),null);
});
