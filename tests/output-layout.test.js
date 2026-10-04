import test from 'node:test';
import assert from 'node:assert/strict';
import {rasterSize,contentBounds} from '../src/services/output-layout.js';
test('portrait, landscape and extreme valid room ratios stay inside canvas limits',()=>{
 for(const [w,h] of [[4000,3000],[3000,4000],[100000,100],[100,100000],[1e6,1e6]])for(const edge of [3200,4800]){
  const size=rasterSize({w,h},edge);assert.ok(Math.max(size.width,size.height)<=edge);assert.ok(size.width*size.height<=12000000);assert.ok(size.width>=1&&size.height>=1);
  assert.ok(Math.abs(size.width/size.height-w/h)<=w/h/size.height+1/size.height);
 }
 assert.throws(()=>rasterSize({w:0,h:2000}));
});
test('export extends beyond geometry to include measurements and off-plan furniture',()=>{
 const bounds=contentBounds({x:-720,y:-720,w:5500,h:4400},[{x:-2000,y:-1800,width:7000,height:8000}]);
 assert.ok(bounds.x<-2000&&bounds.y<-1800);assert.ok(bounds.x+bounds.w>5000&&bounds.y+bounds.h>6200);
});
